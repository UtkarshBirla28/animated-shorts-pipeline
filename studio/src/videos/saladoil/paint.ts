// Hand-painted Canvas2D textures (cached by key). The template's generic set (grass, cobbles, stone, planks, water, roof
// tiles, bricks, facades, chains, clouds, FX sprites, boards) + the saladoil EXTERIOR set at the end (tank shells, roofs, oil, signs).
import * as THREE from "three";

export const rng = (seed: number) => {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};
const cache = new Map<string, THREE.CanvasTexture>();
export const ctex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) => {
  let t = cache.get(key);
  if (!t) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d")!, rng(key.length * 131 + key.charCodeAt(0)));
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    cache.set(key, t);
  }
  return t;
};
/** clone with its own repeat */
export const rep = (t: THREE.Texture, x: number, y: number) => {
  const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c;
};
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];
const INKL = "rgba(40,30,40,0.85)";
const _jc = new THREE.Color(), _hsl = { h: 0, s: 0, l: 0 };
/** per-tile colour jitter in sRGB HSL: lightness x(1 +- dv), hue +- dh degrees, saturation x(1 +- ds) -> css hex.
 *  (MAT pass: reviewer saw tiled brick / cobbles / blocks; about +-10 % per tile breaks the repetition) */
export const jit = (r: () => number, hex: string, dv = 0.1, dh = 5, ds = 0.15) => {
  _jc.set(hex).getHSL(_hsl);
  const k = (a: number) => 1 + (r() * 2 - 1) * a;
  _jc.setHSL((_hsl.h + ((r() * 2 - 1) * dh) / 360 + 1) % 1, Math.min(1, _hsl.s * k(ds)), Math.min(0.97, _hsl.l * k(dv)));
  return "#" + _jc.getHexString();
};

export const grass = () => ctex("grass", 512, 512, (g, r) => {
  g.fillStyle = "#79b950"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = pick(r, ["rgba(96,160,60,.35)", "rgba(140,205,95,.3)"]); g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 60, 18 + r() * 30, r() * 3, 0, 7); g.fill(); }
  g.lineCap = "round";
  for (let i = 0; i < 2600; i++) {
    const x = r() * 512, y = r() * 512, l = 5 + r() * 8;
    g.strokeStyle = pick(r, ["#5f9c3d", "#8fcc5f", "#6aa844", "#9ad46a"]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - l); g.stroke();
  }
  for (let i = 0; i < 30; i++) { g.fillStyle = pick(r, ["#fff7d0", "#ffe066", "#ffb3c8"]); g.beginPath(); g.arc(r() * 512, r() * 512, 3, 0, 7); g.fill(); }
});

export const cobble = () => ctex("cobble", 512, 512, (g, r) => {
  g.fillStyle = "#8f7b5c"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const cx = x * 32 + 16 + (y % 2) * 16 + (r() - 0.5) * 6, cy = y * 32 + 16 + (r() - 0.5) * 6;
    g.fillStyle = pick(r, ["#cbb68f", "#bfa982", "#d6c39c", "#b49f79"]);
    g.strokeStyle = "rgba(70,55,40,.8)"; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(cx % 512, cy, 13 + r() * 2, 12 + r() * 2, r(), 0, 7); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.ellipse((cx % 512) - 4, cy - 4, 5, 3, 0, 0, 7); g.fill();
  }
});

export const stone = (key = "stone", cols = ["#cbbfa6", "#bdb197", "#d4c8ae", "#b3a88f"]) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#5d5446"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) {
    let x = row % 2 ? -60 : 0;
    while (x < 512) {
      const w = 90 + r() * 70;
      g.fillStyle = pick(r, cols);
      g.fillRect(x + 3, row * 64 + 3, w - 6, 58);
      g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 3, row * 64 + 3, w - 6, 8);
      g.fillStyle = "rgba(0,0,0,.08)"; for (let k = 0; k < 6; k++) g.fillRect(x + 6 + r() * (w - 16), row * 64 + 10 + r() * 44, 4, 3);
      x += w;
    }
  }
});

export const planks = () => ctex("planks", 512, 512, (g, r) => {
  for (let i = 0; i < 16; i++) {
    g.fillStyle = pick(r, ["#c68a52", "#b97c46", "#d39a5f", "#bf8550"]);
    g.fillRect(0, i * 32, 512, 32);
    g.strokeStyle = "rgba(120,70,35,.35)"; g.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const y = i * 32 + 6 + r() * 20; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + 4, 340, y - 4, 512, y + (r() - 0.5) * 4); g.stroke(); }
    g.fillStyle = "#4a2f1c"; g.fillRect(0, i * 32, 512, 3);
    const cut = r() * 512; g.fillRect(cut, i * 32, 3, 32);
    g.fillStyle = "#3b2618"; for (const x of [20, 492]) { g.beginPath(); g.arc(x, i * 32 + 16, 2.5, 0, 7); g.fill(); }
  }
});

export const beam = () => ctex("beam", 256, 256, (g, r) => {
  g.fillStyle = "#a8743f"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(85,48,20,.16)"; g.lineWidth = 2.5;
  for (let i = 0; i < 22; i++) { const y = r() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(90, y + 5, 170, y - 5, 256, y); g.stroke(); }
});

export const water = () => ctex("water", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#3d92da"); gr.addColorStop(0.5, "#3487d0"); gr.addColorStop(1, "#3d92da");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.lineCap = "round";
  for (let i = 0; i < 90; i++) {
    const x = r() * 512, y = r() * 512, l = 30 + r() * 70;
    g.strokeStyle = pick(r, ["rgba(140,205,245,.55)", "rgba(110,185,240,.5)", "rgba(220,245,255,.55)"]); g.lineWidth = 3 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 6, x + l, y); g.stroke();
  }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(r() * 512, r() * 512, 6 + r() * 8, 2); }
});

export const bed = () => ctex("bed", 512, 512, (g, r) => {
  g.fillStyle = "#a88f62"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = pick(r, ["#8f7a52", "#bca37a", "#9c8a66", "#7d6c4c"]); g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 9, 3 + r() * 6, r() * 3, 0, 7); g.fill(); }
});

export const roof = (col: string) => ctex("roof" + col, 512, 512, (g, r) => {
  g.fillStyle = "#3b2a2a"; g.fillRect(0, 0, 512, 512);
  const base = new THREE.Color(col);
  for (let row = 0; row < 16; row++) for (let i = -1; i < 9; i++) {
    const x = i * 64 + (row % 2) * 32, y = row * 32, c = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.08);
    g.fillStyle = `#${c.getHexString()}`; g.strokeStyle = INKL; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + 62, y); g.lineTo(x + 62, y + 22); g.quadraticCurveTo(x + 32, y + 36, x + 2, y + 22); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 6, y + 3, 50, 5);
  }
});

/** MAT round 3: brick colour with strong per-brick value variation (lightness +-24 %), plus ~1 in 8 dark clinker
 *  and ~1 in 10 pale, sun-bleached bricks, so a wall reads as hand-laid bricks rather than a flat red print */
const brickCol = (r: () => number) => {
  const c = jit(r, pick(r, ["#c0583a", "#b44f35", "#c8643f", "#a94a33", "#cf6e45", "#b9603f"]), 0.24, 6, 0.15), u = r();
  return u < 0.12 ? dim(c, 0.68) : u > 0.9 ? dim(c, 1.22) : c;
};
/** scale the HSL lightness of a hex colour */
const dim = (hex: string, k: number) => {
  _jc.set(hex).getHSL(_hsl);
  _jc.setHSL(_hsl.h, _hsl.s, Math.min(0.92, _hsl.l * k));
  return "#" + _jc.getHexString();
};
export const brick = () => ctex("brick", 512, 512, (g, r) => {
  g.fillStyle = "#e6d3b3"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) for (let i = 0; i < 8; i++) {
    const c = brickCol(r);
    const x = i * 64 + (row % 2) * 32 + 2, y = row * 32 + 2;
    for (const ox of [0, -512]) { // seamless in x
      g.fillStyle = c; g.fillRect(x + ox, y, 60, 28);
      g.fillStyle = "rgba(255,235,210,0.16)"; g.fillRect(x + ox + 2, y, 56, 3); // light top lip
      g.fillStyle = "rgba(70,30,20,0.14)"; g.fillRect(x + ox + 2, y + 25, 56, 3);
    }
  }
  for (let i = 0; i < 9; i++) { // sparse soot / weathering blotches
    const x = r() * 512, y = r() * 512, rad = 30 + r() * 70;
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
      g.save(); g.translate(x + ox, y + oy); g.scale(1.3, 1);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
      gr.addColorStop(0, "rgba(70,45,35,0.13)"); gr.addColorStop(1, "rgba(70,45,35,0)");
      g.fillStyle = gr; g.fillRect(-rad, -rad, 2 * rad, 2 * rad); g.restore();
    }
  }
});

export const chainTex = () => ctex("chain", 128, 512, (g) => {
  g.fillStyle = "#2c2f36"; g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 8; i++) {
    g.strokeStyle = "#565c66"; g.lineWidth = 14;
    g.beginPath(); g.ellipse(64, i * 64 + 32, 34, 26, 0, 0, 7); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 4;
    g.beginPath(); g.ellipse(64, i * 64 + 32, 34, 26, 0, 3.6, 5.4); g.stroke();
  }
});

/** plaster/brick facade, w x h metres at 48 px/m: floors of shuttered windows, optional door + timber frame */
export const facade = (key: string, wm: number, hm: number, o: { wall: string; shutter: string; door?: boolean; timber?: boolean; brick?: boolean }) =>
  ctex("fac" + key, Math.round(wm * 48), Math.round(hm * 48), (g, r) => {
    const W = Math.round(wm * 48), H = Math.round(hm * 48);
    if (o.brick) { g.fillStyle = g.createPattern(brick().image as HTMLCanvasElement, "repeat")!; g.fillRect(0, 0, W, H); }
    else {
      g.fillStyle = o.wall; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},.05)`; g.beginPath(); g.ellipse(r() * W, r() * H, 20 + r() * 40, 10 + r() * 20, 0, 0, 7); g.fill(); }
    }
    const floors = Math.max(1, Math.floor(hm / 2.8));
    if (o.timber) {
      g.fillStyle = "#5b3a24";
      g.fillRect(0, 0, 10, H); g.fillRect(W - 10, 0, 10, H); g.fillRect(0, 0, W, 10);
      for (let fl = 1; fl < floors; fl++) g.fillRect(0, H - fl * 2.8 * 48 - 5, W, 10);
    }
    g.fillStyle = "rgba(60,45,40,.35)"; g.fillRect(0, H - 22, W, 22);
    const nWin = Math.max(1, Math.floor(wm / 2.2));
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
      const cx = ((i + 0.5) * W) / nWin, by = H - fl * 2.8 * 48 - 0.9 * 48;
      if (o.door && fl === 0 && i === Math.floor(nWin / 2)) {
        const dw = 1.1 * 48, dh = 2.1 * 48;
        g.fillStyle = "#7a4a2c"; g.strokeStyle = INKL; g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx - dw / 2, H); g.lineTo(cx - dw / 2, H - dh + dw / 2); g.arc(cx, H - dh + dw / 2, dw / 2, Math.PI, 0); g.lineTo(cx + dw / 2, H); g.fill(); g.stroke();
        g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(cx + dw / 3, H - dh / 2, 3.5, 0, 7); g.fill();
        continue;
      }
      const ww = 0.9 * 48, wh = 1.3 * 48, x0 = cx - ww / 2, y0 = by - wh;
      g.fillStyle = o.shutter; g.strokeStyle = INKL; g.lineWidth = 2.5;
      for (const sx of [x0 - ww / 2 - 2, x0 + ww + 2]) { g.fillRect(sx, y0, ww / 2, wh); g.strokeRect(sx, y0, ww / 2, wh); }
      g.fillStyle = "#f4efe2"; g.fillRect(x0 - 4, y0 - 4, ww + 8, wh + 8);
      const gg = g.createLinearGradient(x0, y0, x0 + ww, y0 + wh); gg.addColorStop(0, "#8fd0f5"); gg.addColorStop(1, "#3f7fc0");
      g.fillStyle = gg; g.fillRect(x0, y0, ww, wh);
      g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.moveTo(x0 + 6, y0 + wh * 0.55); g.lineTo(x0 + ww * 0.55, y0 + 6); g.lineTo(x0 + ww * 0.75, y0 + 6); g.lineTo(x0 + 6, y0 + wh * 0.8); g.fill();
      g.fillStyle = "#f4efe2"; g.fillRect(cx - 2, y0, 4, wh); g.fillRect(x0, y0 + wh / 2 - 2, ww, 4);
      g.strokeRect(x0 - 4, y0 - 4, ww + 8, wh + 8);
      g.fillStyle = "#e6dccb"; g.fillRect(x0 - 8, by, ww + 16, 7); g.strokeRect(x0 - 8, by, ww + 16, 7);
    }
  });

// ---------------- HD painters (textures.md 5.1, from compare/textures/proto/paint_recipe.ts) ----------------
type R = () => number;
type G = CanvasRenderingContext2D;
const U = (r: R, a: number, b: number) => a + (b - a) * r();
const TAU = Math.PI * 2;

/** run fn at x and again one tile over when [x, x + w] crosses the left / right edge (seamless repeat in x) */
const wrapX = (W: number, x: number, w: number, fn: (x: number) => void) => {
  fn(x);
  if (x + w > W) fn(x - W);
  if (x < 0) fn(x + W);
};
/** same for a scattered mark of radius rad, in x and y */
const wrap2 = (W: number, H: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  for (const ox of [0, -W, W]) for (const oy of [0, -H, H]) {
    const X = x + ox, Y = y + oy;
    if (X + rad > 0 && X - rad < W && Y + rad > 0 && Y - rad < H) fn(X, Y);
  }
};
/** rounded-rectangle path */
const rr = (g: G, x: number, y: number, w: number, h: number, k: number) => {
  k = Math.max(0, Math.min(k, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k); g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k); g.arcTo(x, y, x + w, y, k);
  g.closePath();
};
/** soft elliptical blotch (radial gradient) stretched sx along x */
const blotch = (g: G, x: number, y: number, rad: number, sx: number, rgb: string, a: number) => {
  g.save(); g.translate(x, y); g.scale(sx, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2);
  g.restore();
};
/** long, soft wood-grain stroke along +x; random offsets drawn once so the wrapped copy matches */
const grain = (g: G, r: R, W: number, x: number, y: number, len: number, amp: number, lw: number, col: string) => {
  const n = Math.max(2, Math.round(len / 180));
  const dy = Array.from({ length: n + 1 }, () => (r() - 0.5) * 2 * amp);
  wrapX(W, x, len, (xx) => {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round";
    g.beginPath(); g.moveTo(xx, y + dy[0]);
    for (let i = 1; i <= n; i++) {
      const x1 = xx + (len * i) / n;
      g.quadraticCurveTo(x1 - len / n / 2, y + (dy[i - 1] + dy[i]) / 2 + (i % 2 ? 0.3 : -0.3) * amp, x1, y + dy[i]);
    }
    g.stroke();
  });
};
/** nail / bolt head with a small painted glint (ref: dark dots with a white catch-light) */
const nail = (g: G, x: number, y: number, rad: number, col = "#3a2212") => {
  g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,240,215,0.55)"; g.beginPath(); g.arc(x - rad * 0.32, y - rad * 0.32, rad * 0.36, 0, TAU); g.fill();
};

// ---------------------------------------------------------------------------------------------------------------
/** Deck top, transverse boards. 2048 px = 2 m x 2 m (1024 texels/m: the 0.5 m lens then magnifies ~5.8 px per
 *  texel, the same as the reference's closest deck shot, 10-90 % edge ramp ~4.8 px at 1080p).
 *  Canvas y runs along the bridge (z): 8 boards of 0.25 m = 256 px. world.ts deckTop uv -> [0, z / 2, 2.5, z / 2].
 *  Ref: board-to-board L* std 1.2-4.2 (ours 5-6), within-board 1.3-2.6, gaps ~4 % of the pitch (FWHM) dark brown
 *  #571e00-#6b2903 (dL* 40-48), sunlit lip +4..7 L*, shaded lip -3..-6 L*, nails + rare knots. */
export const planksHD = () => ctex("planksHD", 2048, 2048, (g, r) => {
  const S = 2048, B = 256, GAP = 12;
  // albedo: under the current day light sunlit boards must then measure L* 72-80 on screen (ref #f8bb60, #dea04b,
  // #e28c29, #ffab49). MAT round 3: the merged grade lifts deck chroma ~x1.4 and hue ~+10 deg (the #eaa45a set landed
  // as lemon #f1b333, C* 70, h 80), so these are ochre / tan albedos (Lab L 61-69, C* 31-35, h 64-70): on screen
  // ochre wood about C* 45, h 72-78
  const fills = ["#c99669", "#c18e64", "#d19f6e", "#bb8961", "#c69466", "#c79b6f"];
  for (let i = 0; i < 8; i++) {
    const y = i * B;
    g.save(); g.beginPath(); g.rect(0, y, S, B); g.clip();
    g.fillStyle = jit(r, pick(r, fills), 0.05, 3, 0.08); g.fillRect(0, y, S, B);
    for (let k = 0; k < 5; k++) { // broad tone drift along the board, +-2 L*
      const x = U(r, 0, S), rad = U(r, 120, 260), light = r() > 0.5;
      wrapX(S, x - rad * 3, rad * 6, (xx) => blotch(g, xx + rad * 3, y + B / 2, rad, 3, light ? "255,236,200" : "110,60,25", light ? 0.12 : 0.1));
    }
    for (let k = 0; k < 18; k++) { // grain: long, thin, clearly visible; never as dark or as wide as a seam
      const light = r() < 0.25;
      grain(g, r, S, U(r, 0, S), y + U(r, 16, B - 16), U(r, 500, 1600), U(r, 2, 8), U(r, 2, 4),
        light ? "rgba(255,232,195,0.2)" : "rgba(95,48,18,0.3)");
    }
    for (let k = 0; k < 4; k++) // a few longer figure lines (darker, still thinner than a seam)
      grain(g, r, S, U(r, 0, S), y + U(r, 30, B - 30), U(r, 900, 1900), U(r, 4, 10), 3.5, "rgba(70,32,10,0.4)");
    if (r() < 0.35) { // knot, about one board in three
      const kx = U(r, 120, S - 120), ky = y + U(r, 70, B - 70), rx = U(r, 14, 24), ry = rx * U(r, 0.45, 0.6);
      g.strokeStyle = "rgba(140,82,36,0.20)"; g.lineWidth = 2;
      g.beginPath(); g.ellipse(kx, ky, rx * 2.3, ry * 1.9, 0, 0, TAU); g.stroke();
      g.fillStyle = "rgba(150,88,38,0.30)"; g.beginPath(); g.ellipse(kx, ky, rx, ry, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(105,55,22,0.55)"; g.lineWidth = 2.5; g.stroke();
    }
    for (let k = 0; k < 3; k++) blotch(g, U(r, 100, S - 100), y + U(r, 40, B - 40), U(r, 40, 110), 1.6, "120,70,30", 0.06); // wear
    // board edges: sunlit lip on one side, soft darkening on the other
    g.fillStyle = "rgba(255,238,200,0.35)"; g.fillRect(0, y + GAP / 2 + 1, S, 3);
    const sh = g.createLinearGradient(0, y + B - GAP / 2 - 18, 0, y + B - GAP / 2);
    sh.addColorStop(0, "rgba(80,35,10,0)"); sh.addColorStop(1, "rgba(80,35,10,0.24)");
    g.fillStyle = sh; g.fillRect(0, y + B - GAP / 2 - 18, S, 18);
    // one butt joint per board per tile (staggered), nailed both sides; joist nails every 1 m
    const jx = U(r, 90, S - 90);
    g.fillStyle = "#24110a"; g.fillRect(jx - 3, y, 7, B);
    g.fillStyle = "rgba(255,238,200,0.30)"; g.fillRect(jx + 4, y, 2, B);
    for (const nx of [jx - 24, jx + 24]) for (const f of [0.28, 0.72]) nail(g, nx, y + B * f, 5, "#22140c");
    for (const nx of [512, 1536]) for (const f of [0.3, 0.7]) nail(g, nx + U(r, -3, 3), y + B * f, 5, "#22140c");
    g.restore();
  }
  for (let i = 0; i <= 8; i++) { // seams last: 12 px near-black core + 3 px soft rim (~5 % of the pitch: survives mips)
    g.fillStyle = "rgba(40,18,8,0.6)"; g.fillRect(0, i * B - GAP / 2 - 3, S, GAP + 6);
    g.fillStyle = "#1c0c05"; g.fillRect(0, i * B - GAP / 2, S, GAP);
  }
});

/** Deck side beams / stringers: 1024 x 512 = 3 m along the beam x 1 m (matches the side uv: z / 3, height in m).
 *  Ours rendered #231001 (L* 7, reads as a black hole); ref timber in shade stays at L* 27-34 (#77331b, #632918). */
export const beamHD = () => ctex("beamHD", 1024, 512, (g, r) => {
  const W = 1024, H = 512, T = H / 7; // 0.143 m timbers
  for (let k = 0; k < 7; k++) {
    const y = k * T;
    g.save(); g.beginPath(); g.rect(0, y, W, T); g.clip();
    g.fillStyle = pick(r, ["#a8743f", "#9e6b39", "#b07a44"]); g.fillRect(0, y, W, T);
    for (let i = 0; i < 6; i++) {
      const light = r() < 0.3;
      grain(g, r, W, U(r, 0, W), y + U(r, 8, T - 8), U(r, 250, 700), U(r, 1.5, 4), U(r, 1.5, 3), light ? "rgba(255,232,190,0.12)" : "rgba(85,48,20,0.16)");
    }
    g.fillStyle = "rgba(255,235,195,0.30)"; g.fillRect(0, y + 3, W, 3);
    const sh = g.createLinearGradient(0, y + T - 12, 0, y + T);
    sh.addColorStop(0, "rgba(60,28,8,0)"); sh.addColorStop(1, "rgba(60,28,8,0.26)");
    g.fillStyle = sh; g.fillRect(0, y + T - 12, W, 12);
    const jx = U(r, 120, W - 120);
    g.fillStyle = "#4a2510"; g.fillRect(jx - 2, y, 4, T);
    for (const bx of [jx - 30, jx + 30]) nail(g, bx, y + T / 2, 7, "#2f2a2a");
    g.restore();
    g.fillStyle = "#4a2510"; g.fillRect(0, y - 1.5, W, 3); // seam between timbers
  }
});

/** Ashlar courses, 1024 px per tile: with boxGeo tile 2 (towers) courses are 0.25 m at 512 texels/m; with the 4 m
 *  quad tile (quay walls) 0.5 m blocks. Ref: blocks #c2b2a5 / #cdbdb0 (C* 5-12), mortar dL* -14..-20 and only
 *  2.8-3.6 px wide at 1080p (ours #503f26, 5.4 px, yellow C* 18), top bevel +5 L*, bottom -3 L*, 2-4 px speckles,
 *  hairline cracks. Joint = 7 px = 5.5 % of a course. */
/** MAT pass: warm palettes per key. The two-tone shade multiplies by a blue-violet (shade.ts), so the old neutral
 *  greys rendered lavender on every shaded tower / quay face; warm sandstone / cream albedos stay warm in shade. */
// MAT round 3: saturation -35 % (HSL) on every stone palette -> neutral warm grey / beige, not cream-pink
const STONE_PAL: Record<string, { cols: string[]; mortar: string }> = {
  stoneHD: { cols: ["#d6c4a8", "#cbb89c", "#decfb5", "#c2ae91", "#d0bea2"], mortar: "#a08e76" },
  towerHD: { cols: ["#d6c4a8", "#cbb89c", "#decfb5", "#c2ae91", "#d0bea2"], mortar: "#a08e76" },
  tstoneHD: { cols: ["#e2d5bc", "#d7c8ac", "#e9dec9", "#ccbca1"], mortar: "#a69881" },
  wallHD: { cols: ["#c3b198", "#b8a68b", "#cdbda3", "#af9c83", "#beac94"], mortar: "#887762" },
  copeHD: { cols: ["#e5d9c1", "#dbcdb5", "#ebe1ce", "#d3c4ac"], mortar: "#a99982" },
};
/** keys painted on a 2048 canvas shown at repeat 0.5: same block size and texel density, half as many repeats */
const STONE_BIG = new Set(["towerHD", "tstoneHD", "wallHD", "stoneHD"]);
export const stoneHD = (key = "stoneHD", cols = ["#ddd0bf", "#d3c5b3", "#e5d9c9", "#cabba8"], mortar = "#a39584") => {
  const pal = STONE_PAL[key];
  if (pal) { cols = pal.cols; mortar = pal.mortar; }
  const S = STONE_BIG.has(key) ? 2048 : 1024;
  const t = ctex(key, S, S, (g, r) => {
    const RH = 128, J = 7;
    g.fillStyle = mortar; g.fillRect(0, 0, S, S);
    for (let row = 0; row < S / RH; row++) {
      const y = row * RH, ws: number[] = [];
      let sum = 0;
      while (sum < S) { const w = U(r, 200, 360); ws.push(w); sum += w; }
      const k = S / sum; // stretch so every course closes exactly on the tile width
      let x = (row % 2) * 140 + U(r, 0, 60);
      for (const w0 of ws) {
        const w = w0 * k, col = jit(r, pick(r, cols), 0.1, 5, 0.18), dl = U(r, -1, 1);
        const sp = Array.from({ length: 16 }, () => [r(), r(), U(r, 1, 2.2), r() < 0.6 ? 1 : 0]);
        const crack = r() < 0.15 ? Array.from({ length: 4 }, () => [r(), r()]) : null;
        wrapX(S, x % S, w, (xx) => {
          const X = xx + J / 2, Y = y + J / 2, BW = w - J, BH = RH - J;
          rr(g, X, Y, BW, BH, 5); g.fillStyle = col; g.fill();
          g.fillStyle = dl > 0 ? `rgba(255,252,245,${0.07 * dl})` : `rgba(70,55,45,${-0.06 * dl})`; g.fill();
          g.fillStyle = "rgba(255,252,245,0.22)"; g.fillRect(X + 3, Y, BW - 6, 6);        // top bevel
          g.fillStyle = "rgba(255,252,245,0.10)"; g.fillRect(X, Y + 4, 4, BH - 8);        // left bevel
          g.fillStyle = "rgba(70,55,45,0.14)"; g.fillRect(X + 3, Y + BH - 5, BW - 6, 5); // bottom shade
          for (const [u, v, s, dark] of sp) {
            g.fillStyle = dark ? "rgba(95,82,72,0.38)" : "rgba(255,255,255,0.35)";
            g.beginPath(); g.arc(X + 6 + u * (BW - 12), Y + 8 + v * (BH - 16), s, 0, TAU); g.fill();
          }
          if (crack) {
            g.strokeStyle = "rgba(110,90,70,0.45)"; g.lineWidth = 1.2; g.beginPath();
            crack.forEach(([u, v], i) => { const px = X + 10 + u * (BW - 20), py = Y + 10 + v * (BH - 20); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
            g.stroke();
          }
        });
        x += w;
      }
    }
    // sparse grime: soft dirt patches across several blocks and a few rain streaks (break the tile repetition)
    const n = (S / 1024) ** 2;
    for (let i = 0; i < 14 * n; i++) {
      const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 50, 170), dark = r() < 0.75;
      wrap2(S, S, x, y, rad * 1.4, (xx, yy) => blotch(g, xx, yy, rad, 1.4, dark ? "105,82,55" : "255,246,225", dark ? U(r, 0.07, 0.13) : 0.09));
    }
    for (let i = 0; i < 8 * n; i++) {
      const x = U(r, 0, S), y = U(r, 0, S * 0.8), w = U(r, 8, 26), h = U(r, 90, 300);
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, "rgba(95,75,52,0.14)"); gr.addColorStop(1, "rgba(95,75,52,0)");
      wrapX(S, x, w, (xx) => { g.fillStyle = gr; g.fillRect(xx, y, w, h); });
    }
    for (let i = 0; i < 160 * n; i++) { // pebble-size dark / light pits
      const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 1.2, 3), d = r() < 0.65;
      g.fillStyle = d ? "rgba(90,70,50,0.32)" : "rgba(255,248,230,0.35)";
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
  });
  t.repeat.set(1024 / S, 1024 / S);
  return t;
};

/** Cobbled quay: granite setts in staggered courses, 1024 px = 4 m (256 texels/m; setts 0.19-0.28 x 0.167 m).
 *  Replaces the polka-dot ellipses (ours: regular grid, dark rims, L* std 20): low tone spread, sand-coloured
 *  joints, a soft top-left light and bottom-right shade per sett, no outline ring. */
export const cobbleHD = () => { const t = ctex("cobbleHD", 2048, 2048, (g, r) => {
  // MAT pass: 2048 px = 8 m shown at repeat 0.5 (same sett size, half the repeats), warm granite (neutral greys went
  // lavender in shade), +-10 % per-sett value / hue jitter, sparse dirt, pebbles in the joints
  const S = 2048, N = 48, CH = S / N, J = 5;
  g.fillStyle = "#867967"; g.fillRect(0, 0, S, S);
  const cols = ["#c4b6a0", "#b8aa93", "#cdc1ab", "#af9f88", "#c7baa3", "#bdb19b", "#b8ad9c"]; // round 3: sat -35 %
  for (let row = 0; row < N; row++) {
    const y = row * CH, ws: number[] = [];
    let sum = 0;
    while (sum < S) { const w = U(r, 48, 72); ws.push(w); sum += w; }
    const k = S / sum;
    let x = U(r, 0, 60);
    for (const w0 of ws) {
      const w = w0 * k, col = jit(r, pick(r, cols), 0.1, 6, 0.2), dy = U(r, -1.5, 1.5), rad = U(r, 7, 12);
      const sp = Array.from({ length: 3 }, () => [r(), r(), r() < 0.5 ? 1 : 0]);
      wrapX(S, x % S, w, (xx) => {
        const X = xx + J / 2, Y = y + J / 2 + dy, W = w - J, H = CH - J;
        rr(g, X, Y, W, H, rad); g.fillStyle = col; g.fill();
        g.save(); rr(g, X, Y, W, H, rad); g.clip();
        const gr = g.createLinearGradient(X, Y, X + W * 0.6, Y + H);
        gr.addColorStop(0, "rgba(255,250,240,0.20)"); gr.addColorStop(0.5, "rgba(255,250,240,0)"); gr.addColorStop(1, "rgba(70,58,45,0.16)");
        g.fillStyle = gr; g.fillRect(X, Y, W, H);
        g.restore();
        for (const [u, v, d] of sp) {
          g.fillStyle = d ? "rgba(90,80,68,0.35)" : "rgba(255,255,255,0.3)";
          g.beginPath(); g.arc(X + 5 + u * (W - 10), Y + 5 + v * (H - 10), 1.4, 0, TAU); g.fill();
        }
      });
      x += w;
    }
  }
  for (let i = 0; i < 40; i++) { // damp / worn / sun-bleached patches
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 60, 220), d = r() < 0.7;
    wrap2(S, S, x, y, rad * 1.3, (xx, yy) => blotch(g, xx, yy, rad, 1.3, d ? "90,70,48" : "255,244,220", d ? U(r, 0.06, 0.12) : 0.1));
  }
  for (let i = 0; i < 260; i++) { // pebbles and grit dabs (ref: sparse cream pebble dabs), some dark
    const x = U(r, 0, S), y = U(r, 0, S), rx = U(r, 2, 5), d = r() < 0.4;
    wrap2(S, S, x, y, 8, (xx, yy) => {
      g.fillStyle = d ? "rgba(95,78,58,0.55)" : pick(r, ["rgba(245,232,205,0.8)", "rgba(230,214,185,0.8)"]);
      g.beginPath(); g.ellipse(xx, yy, rx, rx * 0.75, 0, 0, TAU); g.fill();
    });
  }
});
t.repeat.set(0.5, 0.5);
return t; };

/** Roof tiles (or slates with slate = true), 1024 px = 4 m (256 texels/m; keep the 4 m roof uv), courses 0.25 m.
 *  No per-tile ink outline: ref tile joints are 3.3 px at 1080p and only dL* 10 (ours 9.4 px, dL* 15, INKL stroke);
 *  the course shadow carries the pattern. Canvas y runs down the slope (flip the course if v runs the other way). */
export const roofHD = (col: string, slate = false) => ctex("roofHD" + col, 1024, 1024, (g, r) => {
  const S = 1024, C = 64, TW = slate ? 52 : 77;
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  for (let row = 0; row < S / C; row++) {
    const y = row * C, off = (row % 2) * TW / 2 + U(r, -6, 6);
    const n = Math.ceil(S / TW) + 1;
    for (let i = 0; i < n; i++) {
      const x = i * TW - off, tone = U(r, -1, 1);
      const fill = tone > 0 ? `rgba(255,240,225,${0.10 * tone})` : `rgba(60,25,20,${-0.10 * tone})`;
      wrapX(S, x, TW, (xx) => {
        g.fillStyle = fill; g.fillRect(xx, y, TW, C);
        const gr = g.createLinearGradient(xx, 0, xx + TW, 0); // rounded pan: light left, darker right
        gr.addColorStop(0, "rgba(255,240,225,0.12)"); gr.addColorStop(0.55, "rgba(255,240,225,0)"); gr.addColorStop(1, slate ? "rgba(20,25,35,0.10)" : "rgba(60,25,20,0.12)");
        g.fillStyle = gr; g.fillRect(xx, y, TW, C);
        g.fillStyle = slate ? "rgba(20,25,35,0.25)" : "rgba(60,25,20,0.22)"; g.fillRect(xx, y, 2, C); // thin soft joint
      });
    }
    g.fillStyle = slate ? "rgba(220,230,245,0.18)" : "rgba(255,235,220,0.22)"; g.fillRect(0, y + C - 9, S, 3); // lower-lip light
    g.fillStyle = slate ? "rgba(15,20,30,0.32)" : "rgba(55,22,18,0.32)"; g.fillRect(0, y + C - 5, S, 5);        // course shadow
  }
  for (let i = 0; i < 18; i++) { // weathering
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 40, 120);
    wrap2(S, S, x, y, rad * 1.5, (xx, yy) => blotch(g, xx, yy, rad, 1.5, "70,60,40", 0.08));
  }
});

/** Grass bank: 1024 px = 4 m (256 texels/m). Ref lawns: flat, saturated (#71b038 / #7dbf3f, L* 62-66, C* 55-64),
 *  broad soft variation (autocorrelation ~40 px at 1080p, +-4 L*), sparse tufts and flowers, low fine noise.
 *  Ours had the right hue (#6dad37) but only fine uniform noise (autocorrelation 6 px). */
export const grassHD = () => ctex("grassHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#73b23d"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 120, 320), light = r() > 0.5;
    wrap2(S, S, x, y, rad * 1.4, (xx, yy) => blotch(g, xx, yy, rad, 1.4, light ? "140,198,80" : "92,154,48", 0.35));
  }
  g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < 1400; i++) { // tufts ~90 per m2
    const x = U(r, 0, S), y = U(r, 0, S), h = U(r, 7, 16), lean = U(r, -3, 3), light = r() < 0.4;
    wrap2(S, S, x, y, 20, (xx, yy) => {
      g.strokeStyle = light ? "rgba(165,218,98,0.35)" : "rgba(78,138,38,0.45)";
      g.beginPath(); g.moveTo(xx - 3 + lean, yy - h); g.lineTo(xx, yy); g.lineTo(xx + 3 + lean, yy - h * 0.8); g.stroke();
    });
  }
  for (let i = 0; i < 12; i++) { // flowers ~0.75 per m2
    const x = U(r, 0, S), y = U(r, 0, S), c = pick(r, ["#f7f3e8", "#f4d24a", "#f3a9bb", "#f7f3e8"]);
    wrap2(S, S, x, y, 8, (xx, yy) => {
      g.fillStyle = c; g.beginPath(); g.arc(xx, yy, 3.5, 0, TAU); g.fill();
      g.fillStyle = "rgba(240,190,60,0.9)"; g.beginPath(); g.arc(xx, yy, 1.3, 0, TAU); g.fill();
    });
  }
});

/** Plaster / timber / brick facade at 96 px/m (2x the old 48, capped at 2048 px a side). Windows as in the ref:
 *  white trim with a thin dark line (no heavy ink), mid-tone blue-violet glass (never near-black), two diagonal
 *  glints, curtains in about a third, louvred shutters. Same options object as facade(). */
export const facadeHD = (key: string, wm: number, hm: number, o: { wall: string; shutter: string; door?: boolean; timber?: boolean; brick?: boolean }) => {
  const PX = Math.min(72, 2048 / Math.max(wm, hm)); // 72 px/m: half the GPU memory of 96 (textures.md 4)
  const W = Math.round(wm * PX), H = Math.round(hm * PX), m = (v: number) => v * PX;
  return ctex("facHD" + key, W, H, (g, r) => {
    if (o.brick) { // real-size bricks 0.25 x 0.085 m with light mortar (ref brick #cf5e30 / mortar #f6d9b1)
      g.fillStyle = "#e9d3b4"; g.fillRect(0, 0, W, H);
      const bw = m(0.25), bh = m(0.085);
      for (let y = 0, row = 0; y < H; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < W; x += bw) {
        g.fillStyle = brickCol(r);
        g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      }
      const n = Math.round((wm * hm) / 12) + 3;
      for (let i = 0; i < n; i++) blotch(g, U(r, 0, W), U(r, 0, H), m(U(r, 0.4, 1.4)), 1.4, "70,40,30", U(r, 0.06, 0.12)); // soot
    } else {
      g.fillStyle = o.wall; g.fillRect(0, 0, W, H);
      const n = Math.round((wm * hm) / 3) + 6;
      for (let i = 0; i < n; i++) {
        const light = r() > 0.5;
        blotch(g, U(r, 0, W), U(r, 0, H), m(U(r, 0.4, 1.5)), 1.5, light ? "255,255,255" : "120,90,60", light ? 0.07 : 0.05);
      }
      for (let i = 0; i < 4; i++) { // hairline cracks
        let x = U(r, 0, W), y = U(r, 0, H * 0.8);
        g.strokeStyle = "rgba(120,100,80,0.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += m(U(r, -0.08, 0.08)); y += m(U(r, 0.04, 0.12)); g.lineTo(x, y); }
        g.stroke();
      }
    }
    const floors = Math.max(1, Math.floor(hm / 2.8));
    const nWin = Math.max(1, Math.floor(wm / 2.2));
    g.fillStyle = "rgba(70,55,45,0.28)"; g.fillRect(0, H - m(0.45), W, m(0.45)); // plinth
    g.fillStyle = "rgba(70,55,45,0.35)"; g.fillRect(0, H - m(0.45), W, 2);
    const timberBeam = (x: number, y: number, w: number, h: number) => {
      g.fillStyle = "#6e4a30"; g.fillRect(x, y, w, h);
      g.strokeStyle = "rgba(40,25,15,0.5)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = "rgba(255,230,200,0.22)"; g.fillRect(x + 2, y + 2, w - 4, 2);
    };
    if (o.timber) {
      const t = m(0.18);
      timberBeam(0, 0, t, H); timberBeam(W - t, 0, t, H); timberBeam(0, 0, W, t);
      for (let fl = 1; fl < floors; fl++) timberBeam(0, H - m(fl * 2.8) - t / 2, W, t);
      for (let i = 1; i < nWin; i++) timberBeam((i * W) / nWin - t / 2, 0, t, H - m(2.8)); // posts, upper floors
    }
    const door = (cx: number) => {
      const dw = m(1.1), dh = m(2.1);
      const path = (k: number) => {
        g.beginPath(); g.moveTo(cx - dw / 2 - k, H); g.lineTo(cx - dw / 2 - k, H - dh + dw / 2);
        g.arc(cx, H - dh + dw / 2, dw / 2 + k, Math.PI, 0); g.lineTo(cx + dw / 2 + k, H); g.closePath();
      };
      path(m(0.1)); g.fillStyle = "#e9e2d4"; g.fill(); g.strokeStyle = "rgba(60,45,40,0.6)"; g.lineWidth = 1.5; g.stroke();
      path(0); g.fillStyle = "#7a4a2c"; g.fill();
      g.save(); path(0); g.clip();
      for (let x = cx - dw / 2 + m(0.14); x < cx + dw / 2; x += m(0.14)) {
        g.fillStyle = "rgba(40,20,10,0.45)"; g.fillRect(x - 1, H - dh, 2, dh);
        g.fillStyle = "rgba(255,225,190,0.15)"; g.fillRect(x + 1, H - dh, 2, dh);
      }
      g.restore();
      path(0); g.strokeStyle = "rgba(40,25,15,0.7)"; g.lineWidth = 2; g.stroke();
      nail(g, cx + dw / 3, H - dh / 2, m(0.035), "#d9b04a");
    };
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
      const cx = ((i + 0.5) * W) / nWin, by = H - m(fl * 2.8 + 0.9);
      if (o.door && fl === 0 && i === Math.floor(nWin / 2)) { door(cx); continue; }
      const ww = m(0.85), wh = m(1.25), x0 = cx - ww / 2, y0 = by - wh, tr = m(0.08), sw = m(0.45);
      for (const sx of [x0 - tr - sw - m(0.02), x0 + ww + tr + m(0.02)]) { // louvred shutters
        g.fillStyle = o.shutter; g.fillRect(sx, y0, sw, wh);
        const lw = Math.max(1.5, m(0.012));
        for (let ly = y0 + m(0.06); ly < y0 + wh - m(0.04); ly += m(0.06)) {
          g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(sx + m(0.04), ly, sw - m(0.08), lw);
          g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(sx + m(0.04), ly + lw, sw - m(0.08), 1);
        }
        g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = m(0.03); g.strokeRect(sx + m(0.015), y0 + m(0.015), sw - m(0.03), wh - m(0.03));
        g.strokeStyle = "rgba(40,30,40,0.55)"; g.lineWidth = 1.5; g.strokeRect(sx, y0, sw, wh);
      }
      g.fillStyle = "#f7f2e8"; g.fillRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr); // trim
      const gl = g.createLinearGradient(0, y0, 0, y0 + wh);
      gl.addColorStop(0, "#8d9cdb"); gl.addColorStop(1, "#5761a8"); // ref glass #6670b0
      g.fillStyle = gl; g.fillRect(x0, y0, ww, wh);
      if (r() < 0.35) { // curtains from the top corners
        g.fillStyle = pick(r, ["#f5c4c8", "#f3e3c6", "#d7e6cf"]);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + ww * 0.42, y0); g.lineTo(x0, y0 + wh * 0.75); g.fill();
        g.beginPath(); g.moveTo(x0 + ww, y0); g.lineTo(x0 + ww * 0.58, y0); g.lineTo(x0 + ww, y0 + wh * 0.75); g.fill();
      }
      g.save(); g.beginPath(); g.rect(x0, y0, ww, wh); g.clip(); // two diagonal glints
      g.fillStyle = "rgba(255,255,255,0.5)";
      for (const [a, b] of [[0.3, m(0.07)], [0.58, m(0.035)]]) {
        g.save(); g.translate(x0 + ww * a, y0 + wh * 0.5); g.rotate(Math.PI / 4); g.fillRect(-b / 2, -wh, b, wh * 2); g.restore();
      }
      g.restore();
      g.fillStyle = "#f7f2e8"; g.fillRect(cx - m(0.02), y0, m(0.04), wh); g.fillRect(x0, y0 + wh * 0.45 - m(0.02), ww, m(0.04)); // mullions
      g.strokeStyle = "rgba(60,45,40,0.6)"; g.lineWidth = 1.5; g.strokeRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr);
      g.strokeStyle = "rgba(60,45,40,0.45)"; g.strokeRect(x0, y0, ww, wh);
      g.fillStyle = "#ebe3d4"; g.fillRect(x0 - tr - m(0.06), by + tr, ww + 2 * tr + m(0.12), m(0.07)); // sill
      g.fillStyle = "rgba(60,45,40,0.35)"; g.fillRect(x0 - tr - m(0.06), by + tr + m(0.07), ww + 2 * tr + m(0.12), m(0.03));
    }
  });
};

/** River marks as a DATA texture for the water shader (world.ts): R = crest, G = trough, B = glint; 1024 px = 8 m.
 *  Two instances: a sparse one for the near band and a dense one sampled at 40 m tiles for the far band, because the
 *  ref thins the marks out towards the camera (area far 1.5-5 %, mid 0-1.6 %, near 0-0.9 %; ours 4-12 % everywhere).
 *  Ref marks: 12-30 px wide at 1080p (p90 36-97), 3-6 px tall, aspect 3-6, crest +8..+13 L* with a trough
 *  -8..-9 L* right under it, thin glint lines 1-3 x 30-100 px. The marks are short, deep, randomly turned arcs
 *  (isotropic on average): foreshortening alone then makes horizontal dashes on screen from ANY heading (aspect
 *  1 / sin(grazing) = 3.4 at 17 deg, 5.8 at 10 deg); ours drew 30-100 px strokes along u, which turn into dots /
 *  vertical streaks when the camera looks along the river. In reel-kit set colorSpace = THREE.NoColorSpace. */
export const waterMarks = (key: string, nCrest: number, nGlint: number) => ctex("waterMarks" + key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "lighter"; // channels add independently
  g.lineCap = "round";
  for (let i = 0; i < nCrest; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), w = U(r, 18, 44), sag = w * U(r, 0.3, 0.45), lw = U(r, 3, 5), a = U(r, 0, Math.PI);
    wrap2(S, S, x, y, w, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a);
      const arc = (dy: number, col: string, k: number) => {
        g.strokeStyle = col; g.lineWidth = lw * k;
        g.beginPath(); g.moveTo(-w / 2, dy); g.quadraticCurveTo(0, dy - sag * 2, w / 2, dy); g.stroke();
      };
      arc(0, "rgb(255,0,0)", 1);          // crest
      arc(lw * 1.5, "rgb(0,255,0)", 0.9); // trough right under it
      g.restore();
    });
  }
  for (let i = 0; i < nGlint; i++) { // glints: long thin straight lines
    const x = U(r, 0, S), y = U(r, 0, S), len = U(r, 40, 140), lw = U(r, 1.2, 2.4), a = U(r, 0, Math.PI);
    wrap2(S, S, x, y, len, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a); g.strokeStyle = "rgb(0,0,255)"; g.lineWidth = lw;
      g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0); g.stroke(); g.restore();
    });
  }
  g.globalCompositeOperation = "source-over";
});
export const waterNear = () => waterMarks("near", 28, 5);  // ~0.3 % crest area
export const waterFar = () => waterMarks("far", 220, 30);  // ~2.5 % crest + glints, at 40 m tiles

/** Cloud sprite, 1024 x 512, three painted tones and a flat soft bottom, no outline.
 *  Ref cumulus: lit crown #f1f6fc-#fbfafd (L* 96-98, warm in haze #faedd7), mid #dadae9-#e5edf9, lavender-blue
 *  underside #b6c1f2 / #c7cedf / #d1d4e1 (L* 79-86) mostly in the bottom third, edge ramp 8-20 px at 1080p
 *  (median ~10), no dark rim in 9 of 11 clouds. Ours: one flat tone (#f0f0f0 = 83 % of the cloud), 4-5 px edge.
 *  Golden: use CLOUD_GOLD instead of multiplying the white sprite by #ffd6b8 (a tint cannot make the cool belly). */
export const CLOUD_DAY = { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" };
export const CLOUD_GOLD = { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" };
/** round A3 (WORLD-EXT local sky clouds only): no lavender halo ring - the underside tone sits low and inside, so the
 *  top and side edges are the mid / lit tones and only the flat belly shows the shade colour */
export const cloudSoft = (seed: number, pal = CLOUD_DAY) => ctex(`cloudSoft_${pal.lit}_${pal.shade}_${seed}`, 1024, 512, (g) => {
  const r = rng(seed * 7919 + 23);
  const W = 1024, H = 512, base = 400;
  const n = 6 + Math.floor(r() * 4), lobes: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, rad = (60 + 110 * Math.sin(Math.PI * t) ** 0.8) * U(r, 0.75, 1.15);
    lobes.push({ x: 150 + t * 724 + U(r, -30, 30), y: base - rad * U(r, 0.35, 0.65), r: rad }); }
  for (let i = 0; i < Math.floor(n / 2); i++) { const t = U(r, 0.25, 0.75), rad = U(r, 60, 110); lobes.push({ x: 150 + t * 724, y: base - 150 - rad * U(r, 0.3, 0.7), r: rad }); }
  const layer = (dx: number, dy: number, k: number, col: string, blur: number) => {
    g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col; g.beginPath();
    for (const l of lobes) { const x = l.x + dx * l.r, y = l.y + dy * l.r; g.moveTo(x + l.r * k, y); g.arc(x, y, l.r * k, 0, TAU); }
    g.fill(); g.restore();
  };
  layer(0, 0, 1.0, pal.mid, 7);            // silhouette in the mid tone (no shade-coloured rim)
  layer(0.02, 0.2, 0.86, pal.shade, 14);   // the cool belly, low and inside
  layer(-0.06, -0.16, 0.86, pal.mid, 9);
  layer(-0.1, -0.28, 0.7, pal.lit, 11);    // sunlit crown, offset up-left
  g.globalCompositeOperation = "destination-in";
  const m = g.createLinearGradient(0, base - 18, 0, base + 6); m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
});
export const cloudHD = (seed: number, pal = CLOUD_DAY) => ctex(`cloudHD_${pal.lit}_${seed}`, 1024, 512, (g) => {
  const r = rng(seed * 7919 + 17); // own seed: ctex keys of equal length would otherwise share shapes
  const W = 1024, H = 512, base = 400;
  const n = 6 + Math.floor(r() * 4), lobes: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) { // main row, biggest in the middle
    const t = (i + 0.5) / n, rad = (60 + 110 * Math.sin(Math.PI * t) ** 0.8) * U(r, 0.75, 1.15);
    lobes.push({ x: 150 + t * 724 + U(r, -30, 30), y: base - rad * U(r, 0.35, 0.65), r: rad });
  }
  for (let i = 0; i < Math.floor(n / 2); i++) { // crown
    const t = U(r, 0.25, 0.75), rad = U(r, 60, 110);
    lobes.push({ x: 150 + t * 724, y: base - 150 - rad * U(r, 0.3, 0.7), r: rad });
  }
  const layer = (dx: number, dy: number, k: number, col: string, blur: number) => {
    g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col; g.beginPath();
    for (const l of lobes) { const x = l.x + dx * l.r, y = l.y + dy * l.r; g.moveTo(x + l.r * k, y); g.arc(x, y, l.r * k, 0, TAU); }
    g.fill(); g.restore();
  };
  layer(0, 0, 1.0, pal.shade, 6);         // silhouette in the underside tone
  layer(-0.04, -0.12, 0.9, pal.mid, 8);   // mid band
  layer(-0.1, -0.26, 0.72, pal.lit, 10);  // sunlit crown, offset up-left
  g.globalCompositeOperation = "destination-in"; // flat, soft bottom
  const m = g.createLinearGradient(0, base - 18, 0, base + 6);
  m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
});

/** Chain strand: 4 faces side by side (Strand uv: u = k / 4 around the tube), 1024 px = 2 m along (512 texels/m).
 *  Ref iron: blue-grey with a painted matcap-like bright band (#e3d5c6-#e8e7df, ~25-30 % of the area), mids
 *  #586076 / #8790a6, darks #282f41 (L* 19). Ours renders #040d16 / #050b1b (L* 3-5). */
export const chainHD = () => ctex("chainHD", 256, 1024, (g) => {
  // MAT pass: slate blue-grey (was saturated navy #262c3e / #5f6880). Only a fallback now: build.ts Strand builds
  // real link geometry for the chain material (lam("chainHD")), this map is used if anything else asks for it.
  const F = 64, P = 128; // face width, link pitch 0.25 m
  g.fillStyle = "#4a5160"; g.fillRect(0, 0, 256, 1024);
  for (let f = 0; f < 4; f++) {
    const cx = f * F + F / 2;
    for (let i = 0; i < 1024 / P; i++) {
      const cy = i * P + P / 2;
      if (i % 2 === 0) { // face-on link
        g.lineWidth = 15; g.strokeStyle = "#8a93a3"; g.beginPath(); g.ellipse(cx, cy, 22, 58, 0, 0, TAU); g.stroke();
        g.lineWidth = 2.5; g.strokeStyle = "#3a404d";
        for (const d of [-7.5, 7.5]) { g.beginPath(); g.ellipse(cx, cy, 22 + d, 58 + d, 0, 0, TAU); g.stroke(); }
        g.lineWidth = 5; g.strokeStyle = "#e4e6ea"; g.beginPath(); g.ellipse(cx, cy, 22, 58, 0, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
        g.fillStyle = "#fbfaf4"; g.beginPath(); g.arc(cx - 15, cy - 40, 2.5, 0, TAU); g.fill();
      } else { // edge-on link
        rr(g, cx - 8, cy - 62, 16, 124, 8); g.fillStyle = "#7d8696"; g.fill();
        g.strokeStyle = "#3a404d"; g.lineWidth = 2.5; g.stroke();
        g.fillStyle = "#d9dce3"; g.fillRect(cx - 5, cy - 52, 3, 104);
      }
    }
  }
});


// =====================================================================================================================
// ANTITHEFT EXTERIOR (owner WORLD-EXT): painted Petrified Forest textures. Seams are painted in as dark tints (never
// black ink lines), colours follow BUILD_PLAN "Exterior details". Every random value used inside a wrap2 / wrapX
// callback is drawn BEFORE the callback, so wrapped copies match and the tiles stay seamless.
// =====================================================================================================================
const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 199999) + 1; };
/** ctex seeded by the WHOLE key (ctex seeds by key length + first letter, so same-length keys share layouts) */
export const ptex = (key: string, w: number, h: number, draw: (g: G, r: R) => void) => ctex(key, w, h, (g) => draw(g, rng(fnv(key))));
const shadeHex = (hex: string, dl: number) => { _jc.set(hex).getHSL(_hsl); _jc.setHSL(_hsl.h, _hsl.s, Math.max(0, Math.min(1, _hsl.l + dl))); return "#" + _jc.getHexString(); };
/** a pebble with a soft blue-violet contact shadow, lit top-left (ref: pale stones with a dark under-rim) */
const pebbleDab = (g: G, x: number, y: number, rx: number, ry: number, rot: number, col: string) => {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = "rgba(92,70,110,0.30)"; g.beginPath(); g.ellipse(rx * 0.35, ry * 0.55, rx * 1.1, ry * 0.9, 0, 0, TAU); g.fill();
  g.fillStyle = shadeHex(col, -0.16); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(-rx * 0.12, -ry * 0.14, rx * 0.86, ry * 0.8, 0, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,250,240,0.55)"; g.beginPath(); g.ellipse(-rx * 0.35, -ry * 0.4, rx * 0.32, ry * 0.22, 0, 0, TAU); g.fill();
  g.restore();
};
const poly = (g: G, pts: number[][], ox = 0, oy = 0) => { g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy))); g.closePath(); };

/** Paved trail: 1024 px = 2.2 m across (u) x 2.2 m along (v, seamless). Pale grey-tan asphalt #B7AEA2 with aggregate,
 *  cracks, a patch, and red sand drifting in from both edges. */
export const asphaltHD = () => ptex("atAsphaltHD", 1024, 1024, (g, r) => {
  const S = 1024;
  // audit A2: warmer (#BFA88E family, red dust ground in) so noon paving never reads chalky / overexposed
  g.fillStyle = "#b8a289"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 22; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 80, 260), d = r() < 0.55, a = U(r, 0.07, 0.14);
    wrap2(S, S, x, y, rad * 1.4, (xx, yy) => blotch(g, xx, yy, rad, 1.4, d ? "120,100,84" : "214,176,136", a)); }
  for (let i = 0; i < 26000; i++) { const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 1, 3.2), k = r();
    g.fillStyle = k < 0.4 ? "rgba(112,98,88,0.55)" : k < 0.75 ? "rgba(222,206,186,0.55)" : "rgba(176,116,84,0.5)"; g.fillRect(x, y, s, s); }
  for (const jy of [0, S / 2]) { // expansion joints across the trail every 1.1 m (seamless: one at the tile edge)
    for (const oy of jy === 0 ? [0, S] : [jy]) {
      g.fillStyle = "rgba(78,64,56,0.55)"; g.fillRect(0, oy - 3, S, 5);
      g.fillStyle = "rgba(236,222,204,0.35)"; g.fillRect(0, oy + 2, S, 2);
    }
  }
  for (let i = 0; i < 26; i++) { // scuffs: short dark rubbed arcs + pale dusty smears
    const x = U(r, 80, S - 80), y = U(r, 0, S), len = U(r, 30, 90), a = U(r, -0.5, 0.5), dark = r() < 0.6;
    wrap2(S, S, x, y, len, (xx, yy) => { g.strokeStyle = dark ? "rgba(90,72,62,0.22)" : "rgba(214,170,128,0.3)"; g.lineWidth = U(r, 6, 14); g.lineCap = "round";
      g.beginPath(); g.moveTo(xx - Math.cos(a) * len / 2, yy - Math.sin(a) * len / 2); g.quadraticCurveTo(xx + 6, yy - 8, xx + Math.cos(a) * len / 2, yy + Math.sin(a) * len / 2); g.stroke(); });
  }
  for (let i = 0; i < 6; i++) { // cracks (seamless in y)
    let x = U(r, 120, S - 120), y = U(r, 0, S); const pts: [number, number][] = [[x, y]];
    for (let k = 0; k < 9; k++) { x += U(r, -40, 40); y += U(r, 20, 60); pts.push([x, y]); }
    for (const oy of [0, -S, S]) {
      g.strokeStyle = "rgba(70,62,58,0.55)"; g.lineWidth = 2.2; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py + oy) : g.moveTo(px, py + oy))); g.stroke();
      g.strokeStyle = "rgba(240,234,226,0.35)"; g.lineWidth = 1.2; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px + 1.5, py + oy + 1.5) : g.moveTo(px + 1.5, py + oy + 1.5))); g.stroke();
    }
  }
  for (let i = 0; i < 8; i++) { // hairline cracks off the joints
    let x = U(r, 100, S - 100), y = r() < 0.5 ? 2 : S / 2 + 2; const pts: [number, number][] = [[x, y]];
    for (let k = 0; k < 5; k++) { x += U(r, -26, 26); y += U(r, 12, 36); pts.push([x, y]); }
    g.strokeStyle = "rgba(70,58,52,0.45)"; g.lineWidth = 1.4; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
  }
  for (const side of [0, 1]) { // sand drifting in from the edges (tongues)
    for (let y = 0; y < S; y += 4) {
      const t = y / S, h = 40 + 34 * Math.sin(TAU * (2 * t + side * 0.37)) + 22 * Math.sin(TAU * (5 * t + 0.2 + side * 0.11));
      const gr = side ? g.createLinearGradient(S, 0, S - h * 2.2, 0) : g.createLinearGradient(0, 0, h * 2.2, 0);
      gr.addColorStop(0, "rgba(206,150,104,0.95)"); gr.addColorStop(0.45, "rgba(206,150,104,0.45)"); gr.addColorStop(1, "rgba(206,150,104,0)");
      g.fillStyle = gr; if (side) g.fillRect(S - h * 2.2, y, h * 2.2, 4); else g.fillRect(0, y, h * 2.2, 4);
    }
  }
  for (let i = 0; i < 260; i++) { const x = r() < 0.5 ? U(r, 0, 160) : U(r, S - 160, S), y = U(r, 0, S), s = U(r, 2, 5), c = pick(r, ["#e7d6bc", "#c9b49a", "#b9735a"]);
    wrap2(S, S, x, y, 10, (xx, yy) => pebbleDab(g, xx, yy, s, s * 0.7, 0, c)); }
});

/** Petrified bark: u around the log (1024 px), v along it (512 px = 1 m). Grey-brown plates (#7A5A44 / #5E4636),
 *  deep fissures along the log, cross cracks, iron-red stains, pale crusts, quartz glints. */
export const barkHD = () => ptex("atBarkHD", 1024, 512, (g, r) => {
  // chunky cracked plates (an irregular crack network, cells a little longer along the log), a few broken fissures,
  // rust / ochre / grey-lavender patches, pale crusts and quartz glints. Canvas y runs along the log.
  const W = 1024, H = 512;
  g.fillStyle = "#8a6450"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i++) { const x = U(r, 0, W), y = U(r, 0, H), rad = U(r, 30, 130), k = r(), a = U(r, 0.22, 0.4);
    const rgb = k < 0.3 ? "176,100,64" : k < 0.52 ? "104,78,70" : k < 0.72 ? "184,140,98" : k < 0.88 ? "132,112,130" : "150,70,52";
    wrap2(W, H, x, y, rad * 1.6, (xx, yy) => blotch(g, xx, yy, rad, 0.7, rgb, a)); }
  const pts: [number, number][] = [];
  for (let i = 0; i < 150; i++) pts.push([U(r, 0, W), U(r, 0, H)]);
  const segs: number[][] = [];
  for (const p of pts) {
    const nb = pts.filter((q) => q !== p).map((q) => { let dx = q[0] - p[0], dy = q[1] - p[1]; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W; if (dy > H / 2) dy -= H; if (dy < -H / 2) dy += H; return [dx, dy, Math.hypot(dx, dy * 0.65)]; })
      .sort((a, b) => a[2] - b[2]).slice(0, 3);
    for (const [dx, dy] of nb) segs.push([p[0], p[1], dx, dy, U(r, -5, 5), U(r, -5, 5), U(r, 2.5, 5.5)]);
  }
  for (const [x, y, dx, dy, jx, jy, lw] of segs) {
    wrap2(W, H, x + dx / 2, y + dy / 2, Math.hypot(dx, dy), (xx, yy) => {
      const ox = xx - (x + dx / 2), oy = yy - (y + dy / 2), mx = x + dx / 2 + jx + ox, my = y + dy / 2 + jy + oy;
      g.strokeStyle = "rgba(40,24,22,0.62)"; g.lineWidth = lw; g.lineCap = "round";
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(mx, my); g.lineTo(x + dx + ox, y + dy + oy); g.stroke();
      g.strokeStyle = "rgba(232,200,170,0.28)"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x + ox + lw * 0.6, y + oy + lw * 0.7); g.lineTo(mx + lw * 0.6, my + lw * 0.7); g.lineTo(x + dx + ox + lw * 0.6, y + dy + oy + lw * 0.7); g.stroke();
    });
  }
  for (let i = 0; i < 9; i++) { // a few long broken fissures along the log
    const x0 = U(r, 0, W), wob = Array.from({ length: 7 }, () => U(r, -16, 16)), lw = U(r, 5, 9), gap = Math.floor(r() * 6);
    for (const ox of [0, -W, W]) {
      g.strokeStyle = "rgba(36,22,20,0.7)"; g.lineWidth = lw; g.lineCap = "round";
      for (let k = 1; k < 7; k++) { if (k === gap) continue; const ya = ((k - 1) / 6) * (H + 40) - 20, yb = (k / 6) * (H + 40) - 20;
        g.beginPath(); g.moveTo(x0 + wob[k - 1] + ox, ya); g.lineTo(x0 + wob[k] + ox, yb); g.stroke(); }
    }
  }
  for (let i = 0; i < 70; i++) { const x = U(r, 0, W), y = U(r, 0, H), rad = U(r, 5, 20), c = r() < 0.55 ? "214,198,172" : r() < 0.5 ? "196,96,58" : "150,130,170", a = U(r, 0.35, 0.6);
    wrap2(W, H, x, y, rad, (xx, yy) => blotch(g, xx, yy, rad, 1.3, c, a)); }
  for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? "rgba(40,24,22,0.22)" : "rgba(240,220,200,0.22)"; g.fillRect(U(r, 0, W), U(r, 0, H), 2, 2); }
  for (let i = 0; i < 260; i++) { const x = U(r, 0, W), y = U(r, 0, H); g.fillStyle = pick(r, ["rgba(255,240,220,0.75)", "rgba(240,150,90,0.6)", "rgba(210,180,240,0.6)"]); g.fillRect(x, y, 2.5, 2.5); }
});

/** round 7 (ADD shot 1): the rainbow caustic the glinting quartz throws on the ground (a soft spectral fan, alpha) */
export const causticTex = () => ptex("atCaustic", 256, 128, (g) => {
  g.clearRect(0, 0, 256, 128);
  const cols = ["255,70,70", "255,160,60", "255,236,90", "110,230,120", "90,170,255", "170,110,255"];
  cols.forEach((c, i) => { const gr = g.createRadialGradient(128, 118, 18 + i * 13, 128, 118, 30 + i * 13); gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(0.5, `rgba(${c},0.85)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128); });
  g.globalCompositeOperation = "destination-in"; const m = g.createLinearGradient(0, 0, 256, 0); m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(0.3, "rgba(0,0,0,1)"); m.addColorStop(0.7, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m; g.fillRect(0, 0, 256, 128); g.globalCompositeOperation = "source-over";
});
/** brown park wood with grain: vertical (posts) or horizontal (beams, boards) */
export const parkWood = (col: string, vertical: boolean) => ptex("atWood" + col + (vertical ? "V" : "H"), 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  if (vertical) { g.translate(S, 0); g.rotate(Math.PI / 2); }
  for (let i = 0; i < 30; i++) { const light = r() < 0.3;
    grain(g, r, S, U(r, 0, S), U(r, 6, S - 6), U(r, 200, 520), U(r, 2, 6), U(r, 1.5, 3), light ? "rgba(255,226,190,0.16)" : "rgba(40,20,10,0.3)"); }
  for (let i = 0; i < 3; i++) { const x = U(r, 60, S - 60), y = U(r, 60, S - 60);
    g.fillStyle = "rgba(40,20,10,0.35)"; g.beginPath(); g.ellipse(x, y, 10, 5, 0, 0, TAU); g.fill(); }
});

/** speckled sandstone for boulders (tinted per instance) */
export const rockHD = () => ptex("atRockHD", 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = "#e2d4c6"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 30, 120), d = r() < 0.55, a = U(r, 0.12, 0.26);
    wrap2(S, S, x, y, rad * 1.4, (xx, yy) => blotch(g, xx, yy, rad, 1.4, d ? "120,96,96" : "255,248,236", a)); }
  for (let i = 0; i < 9000; i++) { const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 1, 3); g.fillStyle = r() < 0.5 ? "rgba(90,70,80,0.3)" : "rgba(255,250,240,0.35)"; g.fillRect(x, y, s, s); }
  for (let i = 0; i < 10; i++) { let x = U(r, 0, S), y = U(r, 0, S); g.strokeStyle = "rgba(80,60,70,0.4)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += U(r, -30, 30); y += U(r, 10, 40); g.lineTo(x, y); } g.stroke(); }
});

/** dry bunch grass tuft (alpha cut-out): straw blades with darker bases */
/** audit A3 (round-1 blades read as french fries): every blade a filled curved sliver that TAPERS TO A POINT (3-4 px
 *  tip), ~60 % of the old width, two-tone #C9A85A base -> #E8D08A tips, 2-3 darker #7A6A3A inner blades behind, a thin
 *  lit edge on one side; 512 px so the near-lens framers stay crisp */
export const tuftTex = (i: number) => ptex("atTuftB" + i, 512, 512, (g, r) => {
  const S = 512; g.clearRect(0, 0, S, S);
  const blade = (bx: number, lean: number, h: number, w: number, c0: string, c1: string, lip: boolean) => {
    const tx = bx + lean * U(r, 50, 170), ty = S - h, mx = bx + lean * 18, my = S - h * 0.55;
    const P = (t: number) => [(1 - t) * (1 - t) * bx + 2 * t * (1 - t) * mx + t * t * tx, (1 - t) * (1 - t) * (S - 2) + 2 * t * (1 - t) * my + t * t * ty];
    const L: number[][] = [], R2: number[][] = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14, [x, y] = P(t), [x2, y2] = P(Math.min(1, t + 0.02)), [x1, y1] = P(Math.max(0, t - 0.02));
      const dx = x2 - x1, dy = y2 - y1, n = Math.hypot(dx, dy) || 1, hw = (w / 2) * Math.pow(1 - t, 0.85) + 0.6;
      L.push([x - (dy / n) * hw, y + (dx / n) * hw]); R2.push([x + (dy / n) * hw, y - (dx / n) * hw]);
    }
    const gr = g.createLinearGradient(0, S, 0, ty); gr.addColorStop(0, shadeHex(c0, -0.12)); gr.addColorStop(0.3, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; poly(g, [...L, ...R2.reverse()]); g.fill();
    if (lip) { g.strokeStyle = "rgba(255,246,214,0.55)"; g.lineWidth = 1.2; g.beginPath(); L.slice(3, 12).forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
  };
  for (let k = 0; k < 3; k++) blade(S / 2 + U(r, -40, 40), U(r, -0.8, 0.8), U(r, 200, 380), U(r, 6, 8), "#7a6a3a", "#9a8650", false);
  const n = 22 + Math.floor(r() * 10);
  for (let k = 0; k < n; k++) {
    const lean = U(r, -1, 1), h = U(r, 220, 470), w = U(r, 4.5, 8);
    blade(S / 2 + U(r, -56, 56), lean, h, w, pick(r, ["#c9a85a", "#bf9e52", "#d0ae62"]), pick(r, ["#e8d08a", "#f0dc9c", "#e2c67e"]), r() < 0.6);
  }
});
// ---------------- signs (MeshBasic faces: readable under any light) ----------------
/** fit a bold font so the widest line fills maxW (canvas px) at horizontal condensation k, capped at maxPx */
const fitPx = (g: G, lines: string[], family: string, maxW: number, maxPx: number, k = 1) => {
  let px = maxPx;
  for (const l of lines) { g.font = `bold ${px}px ${family}`; const w = g.measureText(l).width * k; if (w > maxW) px = Math.floor((px * maxW) / w); }
  return px;
};
/** centred text line, horizontally condensed by k; routed look: dark groove shadow up-left, light lip down-right */
const textLine = (g: G, s: string, cx: number, y: number, px: number, family: string, fill: string, k = 1, routed = true) => {
  g.save(); g.translate(cx, y); g.scale(k, 1); g.font = `bold ${px}px ${family}`; g.textAlign = "center"; g.textBaseline = "middle";
  if (routed) {
    const o = Math.max(1.5, px * 0.035);
    g.fillStyle = "rgba(28,14,6,0.85)"; g.fillText(s, -o, -o);
    g.fillStyle = "rgba(255,232,200,0.28)"; g.fillText(s, o * 0.8, o * 0.9);
  }
  g.fillStyle = fill; g.fillText(s, 0, 0);
  g.restore();
};
/** brown planked board: horizontal planks with grain, painted seams, weathering */
const plankBoard = (g: G, r: R, W: number, H: number, base: string, planks: number) => {
  const ph = H / planks;
  for (let i = 0; i < planks; i++) {
    g.fillStyle = jit(r, base, 0.06, 3, 0.08); g.fillRect(0, i * ph, W, ph);
    g.save(); g.beginPath(); g.rect(0, i * ph, W, ph); g.clip();
    for (let k = 0; k < 14; k++) { const light = r() < 0.3;
      grain(g, r, W, U(r, 0, W), i * ph + U(r, 6, ph - 6), U(r, W * 0.2, W * 0.7), U(r, 2, 6), U(r, 1.5, 3.5), light ? "rgba(255,226,190,0.14)" : "rgba(30,14,6,0.28)"); }
    g.restore();
    g.fillStyle = "rgba(255,226,190,0.12)"; g.fillRect(0, i * ph + 2, W, 3);
    if (i) { g.fillStyle = "rgba(30,14,6,0.55)"; g.fillRect(0, i * ph - 3, W, 6); }
  }
  for (let k = 0; k < 10; k++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 40, 160), 2, r() < 0.6 ? "30,15,8" : "255,225,190", 0.08);
};
/** small brown post signs (optionally with an arrow, dir = 1 right / -1 left) */
export const smallSignTex = (key: string, lines: string[], w: number, h: number, arrow = 0) => ptex("atSmall" + key, Math.round(w * 1200), Math.round(h * 1200), (g, r) => {
  const W = Math.round(w * 1200), H = Math.round(h * 1200);
  plankBoard(g, r, W, H, "#6b4426", Math.max(1, Math.round(h / 0.18)));
  g.strokeStyle = "#e8d6b0"; g.lineWidth = 8; rr(g, 18, 18, W - 36, H - 36, 18); g.stroke();
  const fam = "Georgia, 'Times New Roman', serif", n = lines.length + (arrow ? 0.9 : 0), pitch = (H - 70) / n;
  const px = fitPx(g, lines, fam, W - 90, Math.round(pitch * 0.72), 0.88);
  lines.forEach((l, i) => textLine(g, l, W / 2, 35 + pitch * (i + 0.5), px, fam, "#f1e2c0", 0.88));
  if (arrow) { const y = H - 35 - pitch * 0.42; g.save(); g.translate(W / 2, y); g.scale(arrow, 1);
    g.fillStyle = "#f1e2c0"; g.fillRect(-W * 0.26, -px * 0.13, W * 0.38, px * 0.26); g.beginPath(); g.moveTo(W * 0.11, -px * 0.36); g.lineTo(W * 0.28, 0); g.lineTo(W * 0.11, px * 0.36); g.fill(); g.restore(); }
});
// ---------------- FX cards (NOINK) ----------------
/** 4-point sparkle star with a soft core (additive) */
export const sparkleTex = () => ptex("atSparkle", 256, 256, (g) => {
  const c = 128;
  const gr = g.createRadialGradient(c, c, 0, c, c, 60); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,250,220,0.7)"); gr.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#ffffff";
  for (const [a, l, w] of [[0, 124, 11], [Math.PI / 2, 124, 11], [Math.PI / 4, 56, 6], [-Math.PI / 4, 56, 6]] as const) {
    g.save(); g.translate(c, c); g.rotate(a); g.beginPath(); g.moveTo(-l, 0); g.quadraticCurveTo(0, -w, l, 0); g.quadraticCurveTo(0, w, -l, 0); g.fill(); g.restore();
  }
});
/** blowing sand wisps: soft horizontal streaks, seamless in x (alpha) */
export const wispTex = () => ptex("atWisp2", 1024, 256, (g, r) => {
  // broken, dashed hair-thin streaks with trailing grains (never a smeared band): 1-4 px lines in a 256 px sheet
  g.clearRect(0, 0, 1024, 256); g.lineCap = "round";
  for (let i = 0; i < 34; i++) {
    const y = U(r, 40, 236), a = U(r, 0.28, 0.6), lw = U(r, 1.2, 3.6), sag = U(r, -4, 4);
    let x = U(r, 0, 1024);
    const end = x + U(r, 260, 700);
    while (x < end) {
      const len = U(r, 14, 70), gap = U(r, 6, 34);
      wrapX(1024, x, len, (xx) => {
        const gr = g.createLinearGradient(xx, 0, xx + len, 0);
        gr.addColorStop(0, "rgba(250,230,202,0)"); gr.addColorStop(0.35, `rgba(250,230,202,${a})`); gr.addColorStop(1, "rgba(250,230,202,0)");
        g.strokeStyle = gr; g.lineWidth = lw; g.beginPath(); g.moveTo(xx, y); g.quadraticCurveTo(xx + len / 2, y + sag, xx + len, y + sag * 0.5); g.stroke();
      });
      x += len + gap;
    }
    for (let k = 0; k < 18; k++) { const gx = U(r, x - 500, x), gy = y + U(r, -6, 6), s = U(r, 1, 2.4);
      wrapX(1024, gx, 3, (xx) => { g.fillStyle = `rgba(236,206,170,${a * 0.9})`; g.fillRect(xx, gy, s, s); }); }
  }
});
/** soft round dot (glows, motes, stars, lamp pools, puffs): white, alpha falls off smoothly */
export const softDotTex = () => ptex("atSoftDot", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 63); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.clearRect(0, 0, 128, 128); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** a lumpy dust puff (white, tinted by the material) */
export const puffTex = () => ptex("atPuff", 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 9; i++) { const a = r() * TAU, d = U(r, 0, 50), x = 128 + Math.cos(a) * d, y = 140 + Math.sin(a) * d * 0.6, rad = U(r, 40, 80);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
});
/** round 7 (audit A7 P3: the heap's dust puffs were soft beige blobs): a cartoon puff - 3-4 round lobes, cream fill with
 *  a lit top, one plum ink outline round the union (~2-3 px on screen at its size) */
export const cartoonPuffTex = (seed: number) => ptex("atCPuff" + seed, 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256);
  const n = 3 + (seed % 2), L: number[][] = [];
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; L.push([56 + t * 144 + U(r, -10, 10), 150 - 40 * Math.sin(Math.PI * t) + U(r, -8, 8), U(r, 40, 56) * (0.8 + 0.35 * Math.sin(Math.PI * t))]); }
  L.push([128 + U(r, -16, 16), 112 + U(r, -6, 6), U(r, 44, 54)]);
  const all = (fn: (x: number, y: number, rad: number) => void) => L.forEach(([x, y, rad]) => fn(x, y, rad));
  g.fillStyle = "#4a2a40"; all((x, y, rad) => { g.beginPath(); g.arc(x, y, rad + 7, 0, TAU); g.fill(); });   // the ink outline
  g.fillStyle = "#e9d6b8"; all((x, y, rad) => { g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); });       // dusty cream
  g.fillStyle = "#f8ecd8"; all((x, y, rad) => { g.beginPath(); g.arc(x - rad * 0.2, y - rad * 0.25, rad * 0.62, 0, TAU); g.fill(); }); // lit tops
  g.fillStyle = "rgba(150,120,150,0.35)"; all((x, y, rad) => { g.beginPath(); g.ellipse(x + rad * 0.15, y + rad * 0.55, rad * 0.7, rad * 0.3, 0, 0, TAU); g.fill(); }); // lavender bellies
});
/** dust + ink impact ring (white, tinted): a lumpy annulus of puffs */
/** the stamp impact: a puffy dust ring (46 soft dabs) + audit A4 P3: 18 thin radial streaks flying out past it */
export const ringTex = () => ptex("atRing2", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  for (let i = 0; i < 46; i++) { const a = (i / 46) * TAU + U(r, -0.05, 0.05), d = U(r, 150, 190), x = 256 + Math.cos(a) * d, y = 256 + Math.sin(a) * d, rad = U(r, 18, 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.lineCap = "round";
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU + U(r, -0.12, 0.12), d0 = U(r, 196, 214), d1 = d0 + U(r, 26, 44), w = U(r, 3, 6);
    const gr = g.createLinearGradient(256 + Math.cos(a) * d0, 256 + Math.sin(a) * d0, 256 + Math.cos(a) * d1, 256 + Math.sin(a) * d1);
    gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.strokeStyle = gr; g.lineWidth = w; g.beginPath(); g.moveTo(256 + Math.cos(a) * d0, 256 + Math.sin(a) * d0); g.lineTo(256 + Math.cos(a) * d1, 256 + Math.sin(a) * d1); g.stroke(); }
});
/** a speed line (white, tapered at both ends) */
export const speedTex = () => ptex("atSpeed", 256, 32, (g) => {
  g.clearRect(0, 0, 256, 32);
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.7, "rgba(255,255,255,0.95)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.beginPath(); g.ellipse(128, 16, 126, 6, 0, 0, TAU); g.fill();
});
/** dried-mud crack decal (alpha): polygon crack network, faded round edge */
export const crackTex = () => ptex("atCrack", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  const pts: [number, number][] = []; for (let i = 0; i < 46; i++) pts.push([U(r, 20, 492), U(r, 20, 492)]);
  g.lineCap = "round";
  for (const p of pts) {
    const nb = pts.filter((q) => q !== p).sort((a, b) => Math.hypot(a[0] - p[0], a[1] - p[1]) - Math.hypot(b[0] - p[0], b[1] - p[1])).slice(0, 3);
    for (const q of nb) { const mx = (p[0] + q[0]) / 2 + U(r, -6, 6), my = (p[1] + q[1]) / 2 + U(r, -6, 6);
      g.strokeStyle = "rgba(110,64,44,0.75)"; g.lineWidth = U(r, 1.6, 3.4); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(mx, my); g.lineTo(q[0], q[1]); g.stroke();
      g.strokeStyle = "rgba(250,222,190,0.45)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(p[0] + 2, p[1] + 2); g.lineTo(mx + 2, my + 2); g.lineTo(q[0] + 2, q[1] + 2); g.stroke(); }
  }
  for (let i = 0; i < 30; i++) { const x = U(r, 30, 482), y = U(r, 30, 482), rad = U(r, 20, 50); blotch(g, x, y, rad, 1, r() < 0.5 ? "238,206,170" : "150,96,66", 0.16); }
  const gr = g.createRadialGradient(256, 256, 120, 256, 256, 256); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = gr; g.fillRect(0, 0, 512, 512); g.globalCompositeOperation = "source-over";
});
/** raven silhouette for the sky (blue-black, glossy edge): flap 0 = glide (wings level), 1 = wings up, 2 = wings down */
export const birdTex = (flap: number) => ptex("atBird" + flap, 256, 128, (g) => {
  g.clearRect(0, 0, 256, 128);
  const wy = [0, -34, 26][flap], tip = [6, -40, 34][flap];
  g.fillStyle = "#1e2233"; g.strokeStyle = "#1e2233"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(128, 70);
  g.quadraticCurveTo(92, 58 + wy * 0.6, 50, 64 + wy); g.quadraticCurveTo(26, 66 + tip, 10, 62 + tip); g.quadraticCurveTo(52, 78 + wy * 0.5, 120, 80);
  g.lineTo(136, 80); g.quadraticCurveTo(204, 78 + wy * 0.5, 246, 62 + tip); g.quadraticCurveTo(230, 66 + tip, 206, 64 + wy); g.quadraticCurveTo(164, 58 + wy * 0.6, 128, 70);
  g.fill();
  g.beginPath(); g.ellipse(128, 76, 13, 9, 0, 0, TAU); g.fill();       // body
  g.beginPath(); g.moveTo(120, 82); g.lineTo(128, 104); g.lineTo(136, 82); g.fill(); // wedge tail
  g.beginPath(); g.arc(128, 64, 7, 0, TAU); g.fill();                   // head
});
/** a clear rising (near-full) moon, #F4EEDC with faint maria / crater tones and a soft glow (audit A2: the plain peach
 *  disc read as an unclear sun) */
export const moonTex = () => ptex("atMoon3", 256, 256, (g, r) => { // audit A5 P3: a cool white moon (#E8E6F2), cool halo
  g.clearRect(0, 0, 256, 256);
  const gl = g.createRadialGradient(128, 128, 44, 128, 128, 126); gl.addColorStop(0, "rgba(214,222,255,0.26)"); gl.addColorStop(1, "rgba(214,222,255,0)");
  g.fillStyle = gl; g.fillRect(0, 0, 256, 256);
  g.save(); g.beginPath(); g.arc(128, 128, 50, 0, TAU); g.clip();
  g.fillStyle = "#e8e6f2"; g.fillRect(0, 0, 256, 256);
  for (const [x, y, rad, a] of [[112, 112, 18, 0.16], [140, 104, 12, 0.13], [132, 140, 16, 0.12], [104, 142, 9, 0.1], [150, 128, 8, 0.1]] as const) {
    g.fillStyle = `rgba(150,140,150,${a})`; g.beginPath(); g.ellipse(x, y, rad, rad * 0.8, 0.4, 0, TAU); g.fill(); }
  for (let i = 0; i < 14; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 44, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, s = U(r, 1.5, 4);
    g.strokeStyle = "rgba(140,130,140,0.18)"; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, s, 0, TAU); g.stroke(); }
  const sh = g.createLinearGradient(80, 0, 178, 0); sh.addColorStop(0, "rgba(120,120,170,0)"); sh.addColorStop(0.75, "rgba(120,120,170,0)"); sh.addColorStop(1, "rgba(120,120,170,0.35)");
  g.fillStyle = sh; g.fillRect(0, 0, 256, 256); // a sliver of the terminator on the right limb (waxing gibbous)
  g.restore();
});
/** a dusty corner spider web (alpha, white): radial threads + a sagging spiral, anchored at the lower-left corner */
export const webTex = () => ptex("atWeb", 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256); g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 1.4;
  const ox = 6, oy = 250, rays = Array.from({ length: 7 }, (_, i) => -Math.PI / 2 + (i / 6) * (Math.PI / 2) + U(r, -0.06, 0.06));
  for (const a of rays) { g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a) * 240, oy + Math.sin(a) * 240); g.stroke(); }
  for (let k = 1; k < 9; k++) { const R = k * 26 + U(r, -4, 4); g.beginPath();
    rays.forEach((a, i) => { const x = ox + Math.cos(a) * R, y = oy + Math.sin(a) * R; if (!i) g.moveTo(x, y); else { const pa = rays[i - 1], mx = ox + Math.cos((a + pa) / 2) * R * 0.92, my = oy + Math.sin((a + pa) / 2) * R * 0.92; g.quadraticCurveTo(mx, my, x, y); } });
    g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(220,200,170,0.5)"; g.beginPath(); g.arc(U(r, 0, 120), U(r, 140, 256), U(r, 1, 3), 0, TAU); g.fill(); } // caught dust
});
/** a soft lavender contact-shadow blob (alpha) */
export const blobTex = () => ptex("atBlob", 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 62); gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.55, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** a faint diagonal glass reflection (alpha) for a switched-off LED screen */
export const glassTex = () => ptex("atGlass", 256, 128, (g) => {
  g.clearRect(0, 0, 256, 128);
  for (const [x, w, a] of [[40, 46, 0.35], [104, 14, 0.25], [170, 30, 0.18]] as const) {
    g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w - 60, 128); g.lineTo(x - 60, 128); g.closePath(); g.fill(); }
});
/** small engraved brass plate under the split-flap counter */
export const brassTex = () => ptex("atBrass", 768, 160, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, "#e2c27a"); gr.addColorStop(0.45, "#c9a256"); gr.addColorStop(1, "#9a7a3c");
  g.fillStyle = gr; g.fillRect(0, 0, 768, 160);
  for (let i = 0; i < 600; i++) { g.fillStyle = r() < 0.5 ? "rgba(90,60,20,0.12)" : "rgba(255,240,200,0.12)"; g.fillRect(U(r, 0, 768), U(r, 0, 160), 3, 1.5); }
  g.strokeStyle = "rgba(80,56,20,0.7)"; g.lineWidth = 6; rr(g, 8, 8, 752, 144, 14); g.stroke();
  for (const x of [28, 740]) nail(g, x, 80, 9, "#6a5020");
  const fam = "Georgia, 'Times New Roman', serif", px = fitPx(g, ["THEFT LOSSES"], fam, 620, 96, 0.9);
  textLine(g, "THEFT LOSSES", 384, 84, px, fam, "#3a2a10", 0.9, false);
});
/** label sticker (bucket / box) */
export const labelTex = (key: string, text: string, bg: string, fg: string) => ptex("atLabel" + key, 512, 192, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 512, 192); g.strokeStyle = fg; g.lineWidth = 8; rr(g, 10, 10, 492, 172, 14); g.stroke();
  const px = fitPx(g, [text], "Impact, 'Arial Black', Arial", 440, 130, 0.95);
  textLine(g, text, 256, 100, px, "Impact, 'Arial Black', Arial", fg, 0.95, false);
});
/** weathered fence-post wood: long checks, grey sun-bleach, nail rust, staple marks */
export const weatheredWood = (col: string) => ptex("atWeathered" + col, 512, 512, (g, r) => {
  const S = 512; g.fillStyle = col; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) { const x = U(r, 0, S); g.strokeStyle = r() < 0.3 ? "rgba(255,226,190,0.16)" : "rgba(40,20,10,0.3)"; g.lineWidth = U(r, 1.5, 3);
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + U(r, -8, 8), S * 0.33, x + U(r, -8, 8), S * 0.66, x + U(r, -6, 6), S); g.stroke(); }
  for (let i = 0; i < 5; i++) { const x = U(r, 40, S - 40), y0 = U(r, 0, S * 0.6), len = U(r, 80, 260); g.strokeStyle = "rgba(26,12,6,0.65)"; g.lineWidth = U(r, 2.5, 5);
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x + U(r, -5, 5), y0 + len * 0.5); g.lineTo(x + U(r, -4, 4), y0 + len); g.stroke(); }
  for (let i = 0; i < 8; i++) blotch(g, U(r, 0, S), U(r, 0, S), U(r, 40, 120), 0.5, "196,184,172", 0.14);
  for (let i = 0; i < 12; i++) { const x = U(r, 30, S - 30), y = U(r, 30, S - 30); g.fillStyle = "rgba(150,70,40,0.5)"; g.fillRect(x, y, 4, 9); g.fillStyle = "rgba(60,40,30,0.6)"; g.fillRect(x + 1, y + 2, 2, 5); }
});
/** a yellow survey tape measure ribbon with black tick marks + numbers (along u: 1 m per 256 px) */
export const tapeTex = () => ptex("atTape", 1024, 64, (g) => {
  g.fillStyle = "#f2c230"; g.fillRect(0, 0, 1024, 64); g.fillStyle = "#2a2018";
  for (let i = 0; i < 1024; i += 8) { const h = i % 256 === 0 ? 30 : i % 128 === 0 ? 22 : i % 32 === 0 ? 14 : 8; g.fillRect(i, 0, 2, h); }
  g.font = "bold 22px Arial"; for (let i = 0; i < 4; i++) g.fillText(String(i + 1), i * 256 + 10, 54);
});
/** round 6 (audit A6 ADD shot 15: "replace the plain white dot"): a thin waxing crescent with earthshine + a cool halo */
export const crescentTex = () => ptex("atCrescent", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  const gl = g.createRadialGradient(128, 128, 40, 128, 128, 126); gl.addColorStop(0, "rgba(214,222,255,0.22)"); gl.addColorStop(1, "rgba(214,222,255,0)"); g.fillStyle = gl; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(150,160,200,0.16)"; g.beginPath(); g.arc(128, 128, 48, 0, TAU); g.fill(); // earthshine on the dark disc
  g.save(); g.beginPath(); g.arc(128, 128, 48, 0, TAU); g.clip();
  g.fillStyle = "#f2f0fa"; g.beginPath(); g.arc(128, 128, 48, 0, TAU); g.fill();
  g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(108, 120, 46, 0, TAU); g.fill(); g.globalCompositeOperation = "source-over";
  g.restore();
});
/** a red ink run (drip) under the stamp mark: alpha streak with a round bead at the bottom */
export const dripTex = () => ptex("atDrip", 64, 256, (g) => {
  g.clearRect(0, 0, 64, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(200,30,40,0.95)"); gr.addColorStop(1, "rgba(170,20,30,0.95)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(22, 0); g.lineTo(42, 0); g.quadraticCurveTo(38, 120, 40, 214); g.arc(32, 222, 14, 0, Math.PI); g.quadraticCurveTo(26, 120, 22, 0); g.fill();
  g.fillStyle = "rgba(255,200,200,0.6)"; g.fillRect(27, 10, 3, 180);
});
// =====================================================================================================================
// SALADOIL CONTRACT STUBS (LEAD, 2026-11-13): placeholder board / sign faces and two plain surface textures for the stub
// sets (sets_ext.ts / sets_int.ts). The build round's WORLD owners restyle or replace them; keep the exported names or
// update every caller. All text uses fonts that exist in headless Chrome on Windows.
// =====================================================================================================================
/** one centred text line of a board: t = text, s = font px on the canvas, col / font optional */
export type BoardLine = { t: string; s: number; col?: string; font?: string };
/** a flat board / sign face: background, optional border, centred lines (stacked with 1.25 x line height), optional
 *  chalk dust (chalk boards) and paper grain; cached by key */
export const boardTex = (key: string, w: number, h: number, bg: string, lines: BoardLine[],
  o: { fg?: string; border?: string; bw?: number; chalk?: boolean; grain?: boolean } = {}) => ptex("slBoard_" + key, w, h, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (o.grain) for (let i = 0; i < (w * h) / 900; i++) { g.fillStyle = `rgba(60,40,30,${0.03 + 0.04 * r()})`; g.fillRect(r() * w, r() * h, 1 + 3 * r(), 1 + 2 * r()); }
  if (o.chalk) for (let i = 0; i < (w * h) / 700; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + 0.05 * r()})`; g.fillRect(r() * w, r() * h, 2 + 7 * r(), 1 + 2 * r()); }
  if (o.border) { const bw = o.bw ?? Math.round(Math.min(w, h) * 0.05); g.strokeStyle = o.border; g.lineWidth = bw; g.strokeRect(bw / 2, bw / 2, w - bw, h - bw); }
  const tot = lines.reduce((a, l) => a + l.s * 1.25, 0);
  let y = (h - tot) / 2;
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  for (const l of lines) {
    y += l.s * 1.25;
    g.font = `${l.s}px ${l.font ?? '"Arial Black", Arial, sans-serif'}`; g.fillStyle = l.col ?? o.fg ?? "#222222";
    g.fillText(l.t, w / 2, y - l.s * 0.22, w * 0.94);
  }
});
/** cream-white tank steel: vertical plate seams, rivet rows, soft rust streaks running down from the seams (tiles in u) */
export const tankSteelTex = () => ptex("slTankSteel", 1024, 1024, (g, r) => {
  g.fillStyle = "#e9e1cf"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(150,130,100,${0.02 + 0.03 * r()})`; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
  for (let k = 0; k < 4; k++) { const x = 128 + k * 256; g.fillStyle = "rgba(120,104,86,0.35)"; g.fillRect(x - 2, 0, 4, 1024); }
  for (let k = 0; k < 5; k++) { const y = 100 + k * 205; g.fillStyle = "rgba(120,104,86,0.3)"; g.fillRect(0, y - 2, 1024, 4);
    for (let x = 8; x < 1024; x += 22) { g.fillStyle = "rgba(110,94,78,0.45)"; g.beginPath(); g.arc(x, y + 9, 3, 0, Math.PI * 2); g.fill(); } }
  for (let i = 0; i < 26; i++) {
    const x = r() * 1024, y0 = r() * 900, L = 60 + 260 * r(), wd = 4 + 10 * r();
    const gr = g.createLinearGradient(0, y0, 0, y0 + L); gr.addColorStop(0, "rgba(168,92,48,0.55)"); gr.addColorStop(1, "rgba(168,92,48,0)");
    g.fillStyle = gr; g.fillRect(x, y0, wd, L);
  }
});
/** warm wood wall panelling (bank / office): vertical planks with grain */
export const woodPanelTex = (col = "#8a5a36") => ptex("slWoodPanel" + col, 1024, 1024, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 8; k++) { const x = k * 128; g.fillStyle = `rgba(40,22,10,${0.12 + 0.1 * r()})`; g.fillRect(x, 0, 128, 1024); g.fillStyle = "rgba(30,16,8,0.5)"; g.fillRect(x, 0, 3, 1024); }
  for (let i = 0; i < 260; i++) { const x = r() * 1024; g.strokeStyle = `rgba(50,28,14,${0.08 + 0.12 * r()})`; g.lineWidth = 1 + 2 * r(); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 20 * (r() - 0.5), 340, x + 20 * (r() - 0.5), 680, x + 10 * (r() - 0.5), 1024); g.stroke(); }
});

// =====================================================================================================================
// SALADOIL EXTERIORS (WORLD-EXT, 2026-11-14): a 1960s New Jersey waterfront tank farm, the tank top, the grey street.
// Every texture is painted (no photo look): seams painted as DARK TINTS with a pale lip, coloured grime, rust streaks.
// Keys start with "sx" (cached by key; seeded by the whole key).
// =====================================================================================================================
const sxRand = (r: R, n: number) => Array.from({ length: n }, () => r());
/** riveted storage-tank shell. Canvas = 1/4 of the circumference (u repeats 4x round a tank) x the whole wall (canvas top =
 *  the top course). Cream paint, 5 courses with painted lap seams (dark tint + pale lip), staggered vertical seams, rivet
 *  rows, long rust streaks bleeding from the seams, rain streaks, a grimy foot, a weathered top. rust 0..1. */
export const tankShellTex = (seed: number, rust = 0.6, base = "#ece3cf") => ptex(`sxShell_${seed}_${rust}_${base}`, 1024, 1024, (g, r) => {
  const W = 1024, H = 1024, NC = 5, ch = H / NC;
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // paint mottling (warm grime / chalky paint), wrapped so the tile repeats round the tank
  for (let i = 0; i < 220; i++) { const [a, b, c, d, e] = sxRand(r, 5), x = a * W, y = b * H, rad = 24 + 80 * c;
    wrap2(W, H, x, y, rad * 2, (X, Y) => blotch(g, X, Y, rad, 1 + d * 1.6, e < 0.55 ? "128,104,82" : "255,251,240", 0.035 + 0.05 * e)); }
  // vertical rain streaks
  for (let i = 0; i < 520; i++) { const [a, b, c, d] = sxRand(r, 4), x = a * W, y0 = b * H * 0.9, L = 40 + 260 * c;
    const gr = g.createLinearGradient(0, y0, 0, y0 + L); gr.addColorStop(0, `rgba(118,104,88,${0.05 + 0.06 * d})`); gr.addColorStop(1, "rgba(118,104,88,0)");
    g.fillStyle = gr; wrapX(W, x, 3, (X) => g.fillRect(X, y0, 1.5 + 2 * d, L)); }
  // the foot: warm grime + splash speckle; the top: a weathered band under the top angle
  { const gr = g.createLinearGradient(0, H * 0.8, 0, H); gr.addColorStop(0, "rgba(112,92,74,0)"); gr.addColorStop(1, "rgba(112,92,74,0.42)"); g.fillStyle = gr; g.fillRect(0, H * 0.8, W, H * 0.2); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(96,78,62,${0.08 + 0.14 * r()})`; g.fillRect(r() * W, H - Math.pow(r(), 2.2) * 150, 1 + 2.5 * r(), 1 + 2.5 * r()); }
  { const gr = g.createLinearGradient(0, 0, 0, 40); gr.addColorStop(0, "rgba(96,80,64,0.45)"); gr.addColorStop(1, "rgba(96,80,64,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, 40); }
  const seamH = (y: number) => { g.fillStyle = "rgba(92,78,64,0.62)"; g.fillRect(0, y - 2, W, 4); g.fillStyle = "rgba(255,252,242,0.55)"; g.fillRect(0, y + 2, W, 2); };
  const seamV = (x: number, y0: number, y1: number) => wrapX(W, x - 2, 6, (X) => { g.fillStyle = "rgba(92,78,64,0.55)"; g.fillRect(X, y0, 3.5, y1 - y0); g.fillStyle = "rgba(255,252,242,0.45)"; g.fillRect(X + 3.5, y0, 2, y1 - y0); });
  const rivet = (x: number, y: number) => wrapX(W, x - 3, 6, (X) => { const xx = X + 3; g.fillStyle = "rgba(96,80,64,0.55)"; g.beginPath(); g.arc(xx + 0.8, y + 0.8, 2.6, 0, TAU); g.fill();
    g.fillStyle = "rgba(250,244,230,0.85)"; g.beginPath(); g.arc(xx - 0.6, y - 0.6, 1.4, 0, TAU); g.fill(); });
  const rustAt: [number, number][] = [];
  for (let k = 0; k <= NC; k++) {
    const y = Math.min(H - 3, Math.max(3, k * ch));
    if (k > 0 && k < NC) { seamH(y); for (let x = 6; x < W; x += 15) { rivet(x, y + 10); rivet(x + 7, y + 19); if (r() < 0.09) rustAt.push([x, y + 12]); } }
    if (k < NC) { const off = (k % 2) * (W / 6), y0 = k * ch, y1 = (k + 1) * ch;
      for (let j = 0; j < 3; j++) { const x = (off + (j * W) / 3) % W; seamV(x, y0, y1); for (let yy = y0 + 14; yy < y1 - 8; yy += 15) { rivet(x + 10, yy); if (r() < 0.05) rustAt.push([x + 10, yy]); } } }
  }
  g.fillStyle = "rgba(80,66,54,0.7)"; g.fillRect(0, 0, W, 6); // the top angle
  // rust: streaks bleeding down from rivets / seams, small blooms, a few big runs
  const nR = Math.round(14 + 60 * rust);
  for (let i = 0; i < nR; i++) {
    const [a, b, c, d, e] = sxRand(r, 5); const src = rustAt.length && a < 0.75 ? rustAt[Math.floor(b * rustAt.length) % rustAt.length] : [b * W, c * H * 0.85];
    const x = src[0], y0 = src[1], L = 40 + 330 * d * (0.5 + rust), wd = 2.5 + 9 * e;
    wrapX(W, x - wd, wd * 2, (X0) => {
      const X = X0 + wd;
      const gr = g.createLinearGradient(0, y0, 0, y0 + L); gr.addColorStop(0, `rgba(166,84,40,${0.45 + 0.3 * rust})`); gr.addColorStop(0.35, `rgba(150,82,44,${0.25 + 0.2 * rust})`); gr.addColorStop(1, "rgba(150,82,44,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(X - wd / 2, y0); g.lineTo(X + wd / 2, y0); g.lineTo(X + wd * 0.2, y0 + L); g.lineTo(X - wd * 0.2, y0 + L); g.closePath(); g.fill();
      g.fillStyle = `rgba(122,58,30,${0.5 + 0.3 * rust})`; g.beginPath(); g.ellipse(X, y0, wd * 0.6, wd * 0.45, 0, 0, TAU); g.fill();
    });
  }
  for (let i = 0; i < 30 * rust; i++) { const [a, b, c] = sxRand(r, 3), x = a * W, y = H * (0.55 + 0.45 * b), rad = 10 + 30 * c;
    wrap2(W, H, x, y, rad * 2, (X, Y) => blotch(g, X, Y, rad, 1.3, "150,78,40", 0.25 + 0.2 * rust)); }
});
/** a far / mid storage tank's cone roof (tiles round the cone: u = round, v = up the slant) */
export const coneRoofTex = () => ptex("sxConeRoof", 512, 256, (g, r) => {
  g.fillStyle = "#d6ccb7"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 60; i++) { const [a, b, c] = sxRand(r, 3); wrap2(512, 256, a * 512, b * 256, 40, (X, Y) => blotch(g, X, Y, 14 + 26 * c, 1.4, a < 0.5 ? "120,100,80" : "255,250,240", 0.07)); }
  for (let k = 0; k < 8; k++) { const x = k * 64; g.fillStyle = "rgba(96,82,66,0.5)"; g.fillRect(x, 0, 3, 256); g.fillStyle = "rgba(255,250,240,0.4)"; g.fillRect(x + 3, 0, 2, 256); }
  for (let i = 0; i < 18; i++) { const [a, b, c] = sxRand(r, 3); blotch(g, a * 512, 256 - b * 120, 8 + 16 * c, 1.2, "152,80,42", 0.35); }
  { const gr = g.createLinearGradient(0, 200, 0, 256); gr.addColorStop(0, "rgba(100,84,68,0)"); gr.addColorStop(1, "rgba(100,84,68,0.4)"); g.fillStyle = gr; g.fillRect(0, 200, 512, 56); }
});
/** the hero tank's FLAT roof as one disc (canvas = the 2R x 2R square: canvas x = world x, canvas y = world z, the camera
 *  side +z at the bottom): lap-welded plate rows, the rim angle ring, rust blooms, oil drips and a soaked ring round the
 *  hatch (hx, hz), a scuffed walking path from the ladder top (lx, lz) to the hatch, old puddle rings, gull feathers. */
export const roofDiscTex = (R: number, hx: number, hz: number, lx: number, lz: number) => ptex(`sxRoof_${R}_${hx}_${hz}_${lx}`, 2048, 2048, (g, r) => {
  const S = 2048, k = S / (2 * R), X = (x: number) => (x + R) * k, Z = (z: number) => (z + R) * k;
  g.fillStyle = "#ddd3bd"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 380; i++) { const [a, b, c, d] = sxRand(r, 4); blotch(g, a * S, b * S, 30 + 90 * c, 1 + d, d < 0.5 ? "128,108,84" : "255,250,238", 0.05 + 0.04 * d); }
  for (let i = 0; i < 40000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "100,86,70" : "255,250,236"},${0.05 + 0.08 * r()})`; g.fillRect(r() * S, r() * S, 1.5 + 2 * r(), 1.5 + 2 * r()); }
  // plate rows (1.5 m) with staggered butt seams (3 m), painted as dark tints + pale lips, with tack-weld dots
  for (let row = -R, n = 0; row < R; row += 1.5, n++) {
    const y = Z(row); g.fillStyle = "rgba(94,80,64,0.55)"; g.fillRect(0, y - 2.5, S, 5); g.fillStyle = "rgba(255,252,240,0.5)"; g.fillRect(0, y + 2.5, S, 3);
    const off = (n % 2) * 1.5;
    for (let x = -R - off; x < R; x += 3) { const xx = X(x); g.fillStyle = "rgba(94,80,64,0.5)"; g.fillRect(xx - 2, y, 4, 1.5 * k); g.fillStyle = "rgba(255,252,240,0.45)"; g.fillRect(xx + 2, y, 2.5, 1.5 * k); }
    for (let x = 0; x < S; x += 26) { g.fillStyle = "rgba(110,94,76,0.35)"; g.beginPath(); g.arc(x + r() * 6, y + 7, 2.2, 0, TAU); g.fill(); }
  }
  // rust blooms (more toward the rim, where water stands)
  for (let i = 0; i < 70; i++) { const [a, b, c] = sxRand(r, 3), ang = a * TAU, d = R * (0.35 + 0.63 * Math.sqrt(b)), x = X(Math.cos(ang) * d), y = Z(Math.sin(ang) * d);
    blotch(g, x, y, 14 + 46 * c, 1.3, "160,84,42", 0.28); blotch(g, x, y, 6 + 14 * c, 1.1, "120,58,30", 0.35); }
  // old puddle rings + soot
  for (let i = 0; i < 9; i++) { const [a, b, c] = sxRand(r, 3), x = X((a - 0.5) * R * 1.2), y = Z((b - 0.5) * R * 1.2), rad = (0.5 + 0.9 * c) * k;
    g.strokeStyle = "rgba(120,104,86,0.35)"; g.lineWidth = 5; g.beginPath(); g.ellipse(x, y, rad, rad * 0.7, a * 3, 0, TAU); g.stroke();
    blotch(g, x, y, rad, 1.4, "150,136,118", 0.18); }
  // the walking path ladder top -> hatch: scuffed paler paint + boot smudges
  { const x0 = X(lx * 0.93), y0 = Z(lz * 0.93), x1 = X(hx), y1 = Z(hz);
    for (let i = 0; i < 70; i++) { const t = i / 70, x = x0 + (x1 - x0) * t + (r() - 0.5) * 50, y = y0 + (y1 - y0) * t + (r() - 0.5) * 50; blotch(g, x, y, 30 + 20 * r(), 1.2, "246,240,224", 0.18); }
    for (let i = 0; i < 40; i++) { const t = r(), x = x0 + (x1 - x0) * t + (r() - 0.5) * 60, y = y0 + (y1 - y0) * t + (r() - 0.5) * 60;
      g.save(); g.translate(x, y); g.rotate(Math.atan2(y1 - y0, x1 - x0) + (r() - 0.5) * 0.6); g.fillStyle = "rgba(96,80,66,0.16)"; g.beginPath(); g.ellipse(0, 0, 22, 9, 0, 0, TAU); g.fill(); g.restore(); } }
  // the soaked ring round the hatch: golden-brown oil stains + drips radiating out
  { const x = X(hx), y = Z(hz), rh = 0.42 * k;
    blotch(g, x, y, rh * 2.6, 1.15, "170,112,30", 0.38); blotch(g, x, y, rh * 1.7, 1.1, "128,78,22", 0.4);
    for (let i = 0; i < 26; i++) { const a = r() * TAU, d0 = rh * 1.05, d1 = rh * (1.5 + 1.6 * r()), w = 4 + 8 * r();
      const gr = g.createLinearGradient(x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a) * d1, y + Math.sin(a) * d1);
      gr.addColorStop(0, "rgba(150,92,20,0.55)"); gr.addColorStop(1, "rgba(150,92,20,0)"); g.strokeStyle = gr; g.lineWidth = w; g.lineCap = "round";
      g.beginPath(); g.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); g.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); g.stroke();
      if (r() < 0.6) { g.fillStyle = "rgba(196,140,40,0.5)"; g.beginPath(); g.arc(x + Math.cos(a) * d1, y + Math.sin(a) * d1, w * 0.7, 0, TAU); g.fill(); } }
    for (let i = 0; i < 12; i++) { const a = r() * TAU, d = rh * (1.2 + 1.8 * r()); g.fillStyle = "rgba(240,190,70,0.45)"; g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 5 + 9 * r(), 3 + 5 * r(), r() * 3, 0, TAU); g.fill(); } }
  // gull feathers
  for (let i = 0; i < 7; i++) { const x = X((r() - 0.5) * R * 1.4), y = Z((r() - 0.5) * R * 1.4); g.save(); g.translate(x, y); g.rotate(r() * TAU);
    g.fillStyle = "rgba(250,250,248,0.9)"; g.beginPath(); g.ellipse(0, 0, 16, 4, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(120,120,130,0.6)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-18, 0); g.lineTo(16, 0); g.stroke(); g.restore(); }
  // the rim angle ring (dark painted band) at the roof edge
  g.strokeStyle = "rgba(92,78,62,0.75)"; g.lineWidth = 0.16 * k; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 0.1 * k, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(255,250,236,0.5)"; g.lineWidth = 4; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 0.2 * k, 0, TAU); g.stroke();
});
/** the inside of the hatch neck (u round, canvas top = the lip): warm dark steel with golden oil runs, a worn bright lip */
export const collarTex = () => ptex("sxCollar2", 1024, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#a88a66"); gr.addColorStop(0.12, "#6e5644"); gr.addColorStop(0.6, "#3e2c26"); gr.addColorStop(1, "#2a1c1c");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
  // fix r2 (audit A2 P2 shot 1: in the wide the hatch read as a dark brown hole): the oil's warm GOLD bounce on the upper
  // 40 % of the FAR inner wall (the canvas is mapped once round the neck, u 0 = +z; the shot-1 wide sees u ~0.575 = the
  // -x/-z wall), #F2B62E fading to #8A5A1C, soft in u; a fainter bounce all round so the P0 ring keeps its depth
  { const cx = 0.575 * 1024, hw = 200;
    for (let x = 0; x < 1024; x += 2) { const du = Math.min(Math.abs(x - cx), 1024 - Math.abs(x - cx)), k = Math.max(0, 1 - (du / hw) ** 2);
      const a = 0.12 + 0.72 * k; if (a <= 0.01) continue;
      const gg = g.createLinearGradient(0, 12, 0, 104); gg.addColorStop(0, `rgba(242,182,46,${a})`); gg.addColorStop(0.55, `rgba(196,134,40,${a * 0.8})`); gg.addColorStop(1, "rgba(138,90,28,0)");
      g.fillStyle = gg; g.fillRect(x, 12, 2, 92); } }
  for (let i = 0; i < 22; i++) { const [a, b, c, d] = sxRand(r, 4), x = a * 1024, L = 50 + 150 * b, w = 4 + 8 * c;
    const gg = g.createLinearGradient(0, 20, 0, 20 + L); gg.addColorStop(0, `rgba(226,166,50,${0.35 + 0.4 * d})`); gg.addColorStop(1, "rgba(226,166,50,0.05)");
    wrapX(1024, x - w, w * 2, (X0) => { const X = X0 + w; g.fillStyle = gg; g.beginPath(); g.moveTo(X - w / 2, 20); g.lineTo(X + w / 2, 20); g.lineTo(X + w * 0.3, 20 + L); g.lineTo(X - w * 0.3, 20 + L); g.closePath(); g.fill();
      g.fillStyle = `rgba(255,214,110,${0.4 + 0.3 * d})`; g.beginPath(); g.arc(X, 20 + L, w * 0.42, 0, TAU); g.fill(); }); }
  g.fillStyle = "#cdb490"; g.fillRect(0, 0, 1024, 10); g.fillStyle = "rgba(60,44,34,0.8)"; g.fillRect(0, 10, 1024, 4);
});
/** the weighted measuring tape: bright yellow steel tape with black graduations (v along the tape) */
export const measureTapeTex = () => ptex("sxTape2", 64, 1024, (g) => {
  g.fillStyle = "#f2c230"; g.fillRect(0, 0, 64, 1024); g.fillStyle = "#1e1a16";  // fix r1: CHAR's card tape yellow (one continuous tape)
  for (let y = 0; y < 1024; y += 16) { const w = y % 128 === 0 ? 40 : y % 64 === 0 ? 28 : 16; g.fillRect(0, y, w, 4); }
  g.fillStyle = "#c8261e"; for (let y = 0; y < 1024; y += 128) g.fillRect(44, y + 40, 12, 40);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(56, 0, 4, 1024);
});
/** gravel yard (2048 px = 10 m): warm grey-tan grit, thousands of pebbles with violet contact shade, oil stains */
export const yardTex = (key = "sxYard", base = "#bcae94") => ptex(key, 2048, 2048, (g, r) => {
  const S = 2048;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 420; i++) { const [a, b, c, d] = sxRand(r, 4), rad = 40 + 140 * c; wrap2(S, S, a * S, b * S, rad * 2, (X, Y) => blotch(g, X, Y, rad, 1 + d, d < 0.5 ? "118,100,84" : "236,226,204", 0.06 + 0.05 * d)); }
  for (let i = 0; i < 90000; i++) { const v = r(); g.fillStyle = v < 0.45 ? `rgba(98,86,76,${0.12 + 0.18 * r()})` : v < 0.8 ? `rgba(240,232,214,${0.12 + 0.2 * r()})` : `rgba(140,112,96,${0.15 + 0.2 * r()})`; g.fillRect(r() * S, r() * S, 1.5 + 2.5 * r(), 1.5 + 2.5 * r()); }
  const cols = ["#cbc1ae", "#a99e8a", "#8f8778", "#d9d0c0", "#b5a68c", "#9c8f86", "#c4b49a"];
  for (let i = 0; i < 5200; i++) { const [a, b, c, d, e] = sxRand(r, 5), rx = 3 + 7 * c, col = cols[Math.floor(d * cols.length) % cols.length];
    wrap2(S, S, a * S, b * S, rx * 2, (X, Y) => pebbleDab(g, X, Y, rx, rx * (0.6 + 0.35 * e), e * 3, col)); }
  for (let i = 0; i < 7; i++) { const [a, b, c] = sxRand(r, 3), x = a * S, y = b * S, rad = 50 + 120 * c, n = 4 + Math.floor(r() * 4), lobes = Array.from({ length: n }, () => [(r() - 0.5) * rad, (r() - 0.5) * rad * 0.7, rad * (0.4 + 0.5 * r())]);
    wrap2(S, S, x, y, rad * 2.5, (X, Y) => lobes.forEach(([ox, oy, rr0]) => { blotch(g, X + ox, Y + oy, rr0, 1.3, "54,42,46", 0.32); blotch(g, X + ox, Y + oy, rr0 * 0.55, 1.2, "40,30,36", 0.3); })); }
});
/** cast concrete (foundation rings, pads, the quay): pale grey with form lines, stains, hairline cracks */
export const concreteTex = (key = "sxConcrete", base = "#c3bdb2") => ptex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { const [a, b, c, d] = sxRand(r, 4); wrap2(1024, 1024, a * 1024, b * 1024, 120, (X, Y) => blotch(g, X, Y, 20 + 60 * c, 1 + d, d < 0.6 ? "110,100,92" : "250,246,238", 0.07)); }
  for (let i = 0; i < 30000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "90,84,80" : "250,248,240"},${0.08 + 0.1 * r()})`; g.fillRect(r() * 1024, r() * 1024, 1.5, 1.5); }
  for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(100,92,86,0.3)"; g.fillRect(0, k * 256 + 128, 1024, 3); }
  g.strokeStyle = "rgba(70,62,60,0.45)"; g.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) { let x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 8; s++) { x += (r() - 0.5) * 60; y += 10 + r() * 30; g.lineTo(x, y); } g.stroke(); }
  if (key !== "sxConcrete") { // fix r1 (the farm drive): tyre-worn dark lanes, oil drips, gravel grit kicked onto it
    for (const x of [300, 724]) { const gr = g.createLinearGradient(x - 70, 0, x + 70, 0); gr.addColorStop(0, "rgba(60,50,46,0)"); gr.addColorStop(0.5, "rgba(60,50,46,0.22)"); gr.addColorStop(1, "rgba(60,50,46,0)"); g.fillStyle = gr; g.fillRect(x - 70, 0, 140, 1024); }
    for (let i = 0; i < 26; i++) blotch(g, 280 + 444 * Math.round(r()) + (r() - 0.5) * 160, r() * 1024, 8 + 22 * r(), 1.3, "40,30,30", 0.3 + 0.25 * r());
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "90,76,62" : "236,226,206"},${0.2 + 0.3 * r()})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 1.5 + 2.5 * r(), 1 + 2 * r(), r() * 3, 0, TAU); g.fill(); }
  }
});
/** worn asphalt (1024 px = 6 m): aggregate speckle, tar crack-seal snakes, a repair patch, oil drips */
export const roadTex = (key = "sxRoad", base = "#5c5b60") => ptex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 200; i++) { const [a, b, c, d] = sxRand(r, 4); wrap2(1024, 1024, a * 1024, b * 1024, 140, (X, Y) => blotch(g, X, Y, 30 + 70 * c, 1 + d, d < 0.5 ? "40,40,48" : "150,148,150", 0.08)); }
  for (let i = 0; i < 60000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(30,30,36,${0.2 * r()})` : `rgba(190,186,180,${0.06 + 0.16 * r()})`; g.fillRect(r() * 1024, r() * 1024, 1.5 + r() * 2, 1.5 + r() * 2); }
  g.fillStyle = "rgba(76,74,78,0.6)"; g.fillRect(560, 120, 300, 220); g.strokeStyle = "rgba(30,30,34,0.5)"; g.lineWidth = 3; g.strokeRect(560, 120, 300, 220);
  // fix r1 (audit A1: the fat black zigzags read as odd strokes): hairline cracks, ~50 % contrast, a pale lip beside each
  g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < 9; i++) { let x = r() * 1024, y = r() * 1024; const pts: [number, number][] = [[x, y]];
    for (let s = 0; s < 10; s++) { x += (r() - 0.5) * 70; y += (r() - 0.3) * 50; pts.push([x, y]); }
    for (const [col, w, o] of [["rgba(210,206,200,0.22)", 1.6, 1.4], ["rgba(28,26,30,0.5)", 1.3, 0]] as const) {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([a, b], k) => (k ? g.lineTo(a + o, b + o) : g.moveTo(a + o, b + o))); g.stroke(); } }
  for (let i = 0; i < 14; i++) blotch(g, r() * 1024, r() * 1024, 12 + 30 * r(), 1.5, "20,18,24", 0.35);
});
/** city sidewalk (1024 px = 3 m: 2 x 2 slabs): concrete slabs, joints, gum spots, a crack, stains */
export const sidewalkTex = () => ptex("sxSidewalk", 1024, 1024, (g, r) => {
  g.fillStyle = "#b4b0a8"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 4; i++) { const x = (i % 2) * 512, y = Math.floor(i / 2) * 512; g.fillStyle = jit(r, "#b4b0a8", 0.05, 4, 0.2); g.fillRect(x, y, 512, 512); }
  for (let i = 0; i < 160; i++) { const [a, b, c, d] = sxRand(r, 4); wrap2(1024, 1024, a * 1024, b * 1024, 100, (X, Y) => blotch(g, X, Y, 20 + 50 * c, 1 + d, d < 0.6 ? "100,96,92" : "240,238,232", 0.08)); }
  for (let i = 0; i < 40000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "80,78,76" : "244,242,236"},${0.08 + 0.1 * r()})`; g.fillRect(r() * 1024, r() * 1024, 1.5, 1.5); }
  for (const p of [0, 512]) { g.fillStyle = "rgba(70,66,64,0.6)"; g.fillRect(p, 0, 4, 1024); g.fillRect(0, p, 1024, 4); g.fillStyle = "rgba(240,236,228,0.5)"; g.fillRect(p + 4, 0, 2, 1024); g.fillRect(0, p + 4, 1024, 2); }
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(70,66,70,${0.35 + 0.3 * r()})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 4 + 6 * r(), 3 + 5 * r(), r() * 3, 0, TAU); g.fill(); }
  g.strokeStyle = "rgba(60,56,56,0.55)"; g.lineWidth = 2; { let x = 700, y = 560; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 9; s++) { x += 14 + r() * 20; y += (r() - 0.4) * 40; g.lineTo(x, y); } g.stroke(); }
});
/** harbour water tile (a 1024 px tile ~ 30 m): flat painted teal-blue with crescent wave dashes. The material tints it
 *  per light (dawn peach-violet, noon blue, storm grey). */
export const harbourTex = () => ptex("sxHarbour", 1024, 1024, (g, r) => {
  g.fillStyle = "#6f9fbe"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 80; i++) { const [a, b, c] = sxRand(r, 3); wrap2(1024, 1024, a * 1024, b * 1024, 200, (X, Y) => blotch(g, X, Y, 60 + 90 * c, 2.4, c < 0.5 ? "70,110,150" : "140,180,200", 0.12)); }
  g.lineCap = "round";
  for (let i = 0; i < 420; i++) { const [a, b, c, d] = sxRand(r, 4), x = a * 1024, y = b * 1024, w = 14 + 34 * c, dark = d < 0.45;
    wrap2(1024, 1024, x, y, w, (X, Y) => { g.strokeStyle = dark ? "rgba(50,86,124,0.45)" : `rgba(236,246,250,${0.35 + 0.35 * d})`; g.lineWidth = dark ? 3 : 2.5;
      g.beginPath(); g.moveTo(X - w, Y); g.quadraticCurveTo(X, Y - w * 0.32, X + w, Y); g.stroke(); }); }
});
/** a hazy far city skyline (transparent): three layers of 1960s blocks, setback towers, roof water tanks, chimneys,
 *  faint window grids (no landmarks). Neutral grey-blue, tinted per light by the material. */
export const skylineTex = (seed: number) => ptex("sxSkyline" + seed, 4096, 768, (g, r) => {
  g.clearRect(0, 0, 4096, 768);
  const layer = (col: string, win: string, hMin: number, hMax: number, wMin: number, wMax: number, towers: number) => {
    let x = -20;
    while (x < 4096) {
      const w = wMin + (wMax - wMin) * r(), tall = r() < towers, h = tall ? hMax * (0.75 + 0.25 * r()) : hMin + (hMax * 0.55 - hMin) * r(), y = 768 - h;
      g.fillStyle = col; g.fillRect(x, y, w, h);
      if (tall && r() < 0.7) { const s1 = w * 0.18, s2 = w * 0.34; g.fillRect(x + s1, y - h * 0.12, w - 2 * s1, h * 0.12); g.fillRect(x + s2, y - h * 0.2, w - 2 * s2, h * 0.08);
        if (r() < 0.5) g.fillRect(x + w / 2 - 2, y - h * 0.32, 4, h * 0.12); }
      if (!tall && r() < 0.45) { const tx = x + w * (0.2 + 0.5 * r()); g.fillRect(tx, y - 26, 18, 18); g.fillRect(tx + 2, y - 8, 2, 8); g.fillRect(tx + 14, y - 8, 2, 8); g.beginPath(); g.moveTo(tx - 2, y - 26); g.lineTo(tx + 9, y - 36); g.lineTo(tx + 20, y - 26); g.fill(); }
      if (r() < 0.15) g.fillRect(x + w * 0.7, y - 40, 7, 40);
      g.fillStyle = win; for (let wy = y + 10; wy < 760; wy += 14) for (let wx = x + 6; wx < x + w - 6; wx += 11) if (r() < 0.55) g.fillRect(wx, wy, 5, 6);
      x += w + (r() < 0.3 ? 4 + 20 * r() : 0);
    }
  };
  layer("#c9cdd9", "rgba(255,255,255,0.18)", 120, 600, 40, 120, 0.12);
  layer("#aab1c4", "rgba(240,244,255,0.16)", 90, 420, 50, 140, 0.1);
  layer("#8f97ad", "rgba(230,236,250,0.14)", 50, 260, 60, 170, 0.06);
  g.fillStyle = "#7b8399"; g.fillRect(0, 748, 4096, 20);
});
/** a herring gull (white body, pale grey wings with black tips, yellow bill), 3 flap frames */
export const gullTex = (flap: number) => ptex("sxGull" + flap, 256, 128, (g) => {
  g.clearRect(0, 0, 256, 128);
  const wy = [0, -30, 24][flap], tip = [4, -40, 34][flap];
  const wing = (s: number) => { g.beginPath(); g.moveTo(128, 66); g.quadraticCurveTo(128 + s * 36, 54 + wy * 0.6, 128 + s * 78, 60 + wy); g.quadraticCurveTo(128 + s * 102, 62 + tip, 128 + s * 120, 58 + tip);
    g.quadraticCurveTo(128 + s * 80, 76 + wy * 0.5, 128 + s * 10, 78); g.closePath(); };
  for (const s of [-1, 1]) { g.fillStyle = "#aeb4c0"; wing(s); g.fill(); g.strokeStyle = "#3a3a48"; g.lineWidth = 3; wing(s); g.stroke();
    g.fillStyle = "#1e1e26"; g.beginPath(); g.moveTo(128 + s * 98, 61 + tip * 0.9); g.lineTo(128 + s * 121, 57 + tip); g.lineTo(128 + s * 100, 68 + tip * 0.7); g.closePath(); g.fill(); }
  g.fillStyle = "#fbfbf8"; g.strokeStyle = "#3a3a48"; g.lineWidth = 3; g.beginPath(); g.ellipse(128, 72, 17, 9, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(128, 60, 8, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#f2c230"; g.fillRect(126, 66, 4, 8);
});
/** galvanised chain-link (alpha; tiles 2.4 m tall): diamond mesh with a lit edge, the top tension wire */
export const chainLinkTex = () => ptex("sxChainLink", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512); g.lineCap = "round";
  for (const [col, w, o] of [["rgba(70,74,82,0.95)", 4.5, 1.2], ["rgba(196,202,206,0.95)", 2.2, 0]] as const) {
    g.strokeStyle = col; g.lineWidth = w;
    for (let x = -512; x < 1024; x += 32) { g.beginPath(); g.moveTo(x + o, 0); g.lineTo(x + 512 + o, 512); g.stroke(); g.beginPath(); g.moveTo(x + 512 + o, 0); g.lineTo(x + o, 512); g.stroke(); }
  }
  g.fillStyle = "rgba(160,166,170,1)"; g.fillRect(0, 0, 512, 7); g.fillStyle = "rgba(70,74,82,1)"; g.fillRect(0, 7, 512, 2);
});
/** a strand of barbed wire (alpha; u along the wire, 512 px = 1 m): twisted wires + barbs */
export const barbTex = () => ptex("sxBarb", 512, 64, (g) => {
  g.clearRect(0, 0, 512, 64); g.strokeStyle = "rgba(60,62,70,1)"; g.lineWidth = 3;
  for (const ph of [0, Math.PI]) { g.beginPath(); for (let x = 0; x <= 512; x += 4) { const y = 32 + 4 * Math.sin((x / 512) * TAU * 16 + ph); if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  for (let x = 32; x < 512; x += 64) { g.beginPath(); g.moveTo(x - 9, 20); g.lineTo(x + 9, 44); g.moveTo(x + 9, 20); g.lineTo(x - 9, 44); g.stroke(); }
});
/** the gate sign: cream enamel steel, a navy double border, "ALLIED" / "VEGETABLE OIL", bolts with rust tears, weathering */
export const gateSignTex = () => ptex("sxGateSign", 1600, 520, (g, r) => {
  const W = 1600, H = 520;
  g.fillStyle = "#f3ecd8"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) blotch(g, r() * W, r() * H, 20 + 60 * r(), 1.6, r() < 0.6 ? "160,140,110" : "255,255,248", 0.06);
  g.strokeStyle = "#1f3a6a"; g.lineWidth = 26; g.strokeRect(13, 13, W - 26, H - 26); g.lineWidth = 6; g.strokeRect(44, 44, W - 88, H - 88);
  const fam = '"Arial Black", Arial, sans-serif';
  const p1 = fitPx(g, ["ALLIED"], fam, W * 0.8, 250, 1.12), p2 = fitPx(g, ["VEGETABLE OIL"], fam, W * 0.86, 150, 1);
  g.save(); g.translate(W / 2, 200); g.scale(1.12, 1); g.font = `bold ${p1}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "rgba(20,30,60,0.25)"; g.fillText("ALLIED", 5, 6); g.fillStyle = "#1f3a6a"; g.fillText("ALLIED", 0, 0); g.restore();
  g.fillStyle = "#b5341f"; g.fillRect(170, 318, W - 340, 7);
  g.save(); g.translate(W / 2, 402); g.font = `bold ${p2}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#b5341f"; g.fillText("VEGETABLE OIL", 0, 0); g.restore();
  for (const [x, y] of [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30], [W / 2, 30], [W / 2, H - 30]]) {
    const gr = g.createLinearGradient(0, y, 0, y + 90); gr.addColorStop(0, "rgba(150,78,36,0.6)"); gr.addColorStop(1, "rgba(150,78,36,0)"); g.fillStyle = gr; g.fillRect(x - 4, y, 8, 90);
    nail(g, x, y, 9, "#5a4a3a"); }
  { const gr = g.createLinearGradient(0, H - 70, 0, H); gr.addColorStop(0, "rgba(120,90,60,0)"); gr.addColorStop(1, "rgba(120,90,60,0.3)"); g.fillStyle = gr; g.fillRect(0, H - 70, W, 70); }
});
/** the BANKRUPT notice: a wet paper bill with a red border, fold lines, tape corners, a few illegible lines */
export const bankruptTex = () => ptex("sxBankrupt2", 1032, 400, (g, r) => {
  // fix r1 (audit A1: letters ~30-37 px, small print ~35 % of the bill): BANKRUPT fills ~57 % of the height (condensed
  // Impact), one faint small-print line, wet paper (rain spots, a darker soaked bottom edge), tape corners
  const W = 1032, H = 400;
  g.fillStyle = "#f6f1e3"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) blotch(g, r() * W, r() * H, 20 + 50 * r(), 1.3, "150,140,130", 0.08);
  { const gr = g.createLinearGradient(0, H * 0.7, 0, H); gr.addColorStop(0, "rgba(120,130,150,0)"); gr.addColorStop(1, "rgba(120,130,150,0.3)"); g.fillStyle = gr; g.fillRect(0, H * 0.7, W, H * 0.3); }
  g.fillStyle = "rgba(120,110,100,0.18)"; g.fillRect(W / 2 - 1, 0, 2, H); g.fillRect(0, H / 2 - 1, W, 2);
  g.strokeStyle = "#c0241c"; g.lineWidth = 18; g.strokeRect(14, 14, W - 28, H - 28);
  const fam = 'Impact, "Arial Black", sans-serif', k = 0.92;
  let px = 300; g.font = `${px}px ${fam}`; const w0 = g.measureText("BANKRUPT").width * k; if (w0 > W * 0.88) px = Math.floor((px * W * 0.88) / w0);
  g.save(); g.translate(W / 2, 172); g.scale(k, 1); g.font = `${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "rgba(90,20,16,0.25)"; g.fillText("BANKRUPT", 5, 6); g.fillStyle = "#c8221a"; g.fillText("BANKRUPT", 0, 0); g.restore();
  g.fillStyle = "rgba(40,36,34,0.28)"; for (let x = 120; x < W - 120; x += 30 + r() * 30) g.fillRect(x, 334, 14 + r() * 26, 7);
  for (const [x, y, a] of [[44, 32, -0.6], [W - 44, 32, 0.6], [44, H - 32, 0.6], [W - 44, H - 32, -0.6]]) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = "rgba(236,222,170,0.75)"; g.fillRect(-50, -15, 100, 30); g.restore(); }
  for (let i = 0; i < 26; i++) blotch(g, r() * W, r() * H, 6 + 16 * r(), 1, "110,120,150", 0.16);
});
/** the newsstand headline bill: "EXTRA" + "OIL TANKS" / "FULL OF" / "WATER" in condensed Impact, a halftone tank photo */
export const headlineTex = () => ptex("sxHeadline", 900, 1100, (g, r) => {
  const W = 900;
  g.fillStyle = "#f1ebda"; g.fillRect(0, 0, W, 1100);
  for (let i = 0; i < 60; i++) blotch(g, r() * W, r() * 1100, 30 + 70 * r(), 1.4, "190,170,130", 0.07);
  g.fillStyle = "#1a1a1a"; g.fillRect(36, 34, W - 72, 8); g.fillRect(36, 48, W - 72, 3);
  const fam = 'Impact, "Arial Black", sans-serif';
  const line = (s: string, cy: number, maxPx: number, col: string) => { const px = fitPx(g, [s], fam, W - 70, maxPx, 1); g.font = `${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = col; g.fillText(s, W / 2, cy); };
  g.fillStyle = "#c0241c"; g.fillRect(W / 2 - 130, 64, 260, 74); g.font = `64px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff6e8"; g.fillText("EXTRA", W / 2, 103);
  line("OIL TANKS", 255, 250, "#161616"); line("FULL OF", 455, 240, "#161616"); line("WATER", 670, 300, "#b51d1d");
  g.fillStyle = "#1a1a1a"; g.fillRect(36, 800, W - 72, 4);
  // a halftone photo of a tank (left) + column scribbles (right)
  g.fillStyle = "#d9d2c0"; g.fillRect(50, 822, 360, 240);
  for (let y = 828; y < 1058; y += 9) for (let x = 56; x < 406; x += 9) { const u = (x - 230) / 120, inTank = Math.abs(u) < 1 && y > 870, sky = y < 870;
    const d = inTank ? 0.35 + 0.25 * Math.abs(u) : sky ? 0.15 : 0.5; g.fillStyle = "#222"; g.beginPath(); g.arc(x, y, 4.2 * d + 0.3, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(30,30,30,0.6)"; for (let k = 0; k < 11; k++) for (let x = 440; x < W - 50; x += 20 + r() * 30) g.fillRect(x, 830 + k * 21, 10 + r() * 30, 7);
});
/** the stock board above the firm's door: dark green-black slate in a brass frame, "SHARES" + three arrow windows */
export const sharesBoardTex = () => ptex("sxShares", 1500, 700, (g, r) => {
  const W = 1500, H = 700;
  g.fillStyle = "#b08a3e"; g.fillRect(0, 0, W, H); g.fillStyle = "#e0c27a"; g.fillRect(8, 8, W - 16, 10); g.fillStyle = "#6e5422"; g.fillRect(8, H - 18, W - 16, 10);
  g.fillStyle = "#1b2622"; g.fillRect(34, 34, W - 68, H - 68);
  for (let i = 0; i < 50; i++) blotch(g, r() * W, r() * H, 30 + 60 * r(), 1.5, "120,140,130", 0.05);
  const fam = '"Arial Black", Arial, sans-serif', px = fitPx(g, ["SHARES"], fam, W * 0.7, 230, 1);
  g.font = `bold ${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#f2efe4"; g.fillText("SHARES", W / 2, 175);
  g.fillStyle = "#e0c27a"; g.fillRect(120, 300, W - 240, 6);
  for (let k = 0; k < 3; k++) { const cx = W / 2 + (k - 1) * 420; g.fillStyle = "#0c1210"; g.fillRect(cx - 170, 345, 340, 300); g.strokeStyle = "#5a6a62"; g.lineWidth = 6; g.strokeRect(cx - 170, 345, 340, 300); }
});
/** one arrow plate for the SHARES board: a fat red DOWN arrow, or a neutral grey dash (before the crash) */
export const arrowPlateTex = (down: boolean) => ptex("sxArrow" + (down ? "D" : "N"), 340, 300, (g) => {
  g.fillStyle = "#0c1210"; g.fillRect(0, 0, 340, 300);
  if (down) { g.fillStyle = "#e8352a"; poly(g, [[115, 30], [225, 30], [225, 150], [300, 150], [170, 280], [40, 150], [115, 150]]); g.fill();
    g.fillStyle = "rgba(255,220,200,0.35)"; poly(g, [[115, 30], [140, 30], [140, 160], [80, 160]]); g.fill(); }
  else { g.fillStyle = "#8a948e"; g.fillRect(70, 135, 200, 32); }
});
/** the CLOSED card hung on the firm's door (alpha: the string loop above the card) */
export const closedTex = () => ptex("sxClosed2", 640, 420, (g, r) => {
  g.clearRect(0, 0, 640, 420);
  g.strokeStyle = "#3a2a20"; g.lineWidth = 5; g.beginPath(); g.moveTo(130, 140); g.lineTo(320, 20); g.lineTo(510, 140); g.stroke();
  g.fillStyle = "#5a4a3a"; g.beginPath(); g.arc(320, 20, 12, 0, TAU); g.fill();
  g.save(); g.translate(320, 270); g.rotate(-0.025);
  g.fillStyle = "rgba(40,30,30,0.35)"; g.fillRect(-296, -124, 600, 262);
  g.fillStyle = "#f6f0e0"; g.fillRect(-300, -130, 600, 260);
  for (let i = 0; i < 20; i++) blotch(g, (r() - 0.5) * 560, (r() - 0.5) * 220, 20 + 30 * r(), 1.3, "170,150,120", 0.06);
  g.strokeStyle = "#c0241c"; g.lineWidth = 12; g.strokeRect(-286, -116, 572, 232);
  // fix r1 (audit A1: letters ~35 px): condensed Impact fills the card (letters ~70 % of its height)
  const fam = 'Impact, "Arial Black", sans-serif'; let px = 230; g.font = `${px}px ${fam}`; const w0 = g.measureText("CLOSED").width; if (w0 > 530) px = Math.floor((px * 530) / w0);
  g.font = `${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#c0241c"; g.fillText("CLOSED", 0, 10);
  for (const x of [-190, 190]) { g.fillStyle = "#3a2a20"; g.beginPath(); g.arc(x, -112, 8, 0, TAU); g.fill(); }
  g.restore();
});
/** 1960s city facade (canvas = 7 m wide x 14 m tall): brick / limestone / cream terracotta courses, sash windows with
 *  blinds, lintels + sills, a cornice band; up to 4.6 m a dark stone base (the shopfront there is 3D). */
export const facade60Tex = (style: number) => ptex("sxFacade60_" + style, 512, 1024, (g, r) => {
  const W = 512, H = 1024, px = W / 7, Y = (m: number) => H - m * px;
  const wall = ["#8f4a38", "#b7b0a2", "#d2c5a8", "#7c5a4a"][style % 4];
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  if (style % 4 === 0 || style % 4 === 3) { for (let y = 0; y < H; y += 6) { g.fillStyle = "rgba(60,30,24,0.22)"; g.fillRect(0, y, W, 1.5); const off = (y / 6) % 2 ? 0 : 9;
      for (let x = off; x < W; x += 18) { g.fillStyle = "rgba(60,30,24,0.18)"; g.fillRect(x, y, 1.5, 6); g.fillStyle = jit(r, wall, 0.08, 4, 0.15); g.globalAlpha = 0.35; g.fillRect(x + 1.5, y + 1.5, 16, 4.5); g.globalAlpha = 1; } } }
  else for (let y = 0; y < H; y += 26) { g.fillStyle = "rgba(80,72,64,0.25)"; g.fillRect(0, y, W, 2); for (let x = (y / 26) % 2 ? 0 : 40; x < W; x += 80) g.fillRect(x, y, 2, 26); }
  for (let i = 0; i < 80; i++) blotch(g, r() * W, r() * H, 20 + 50 * r(), 1, "60,50,50", 0.06);
  g.fillStyle = "#6f6a66"; g.fillRect(0, Y(4.6), W, 4.6 * px);
  g.fillStyle = "#d9d2c2"; g.fillRect(0, Y(4.9), W, 0.3 * px); g.fillStyle = "rgba(60,50,46,0.45)"; g.fillRect(0, Y(4.6) - 3, W, 3);
  for (let fl = 0; fl < 4; fl++) { const y0 = 5.4 + fl * 2.6;
    for (let c = 0; c < 3; c++) { const x = (0.5 + c * 2.2) * px, w = 1.25 * px, h = 1.7 * px, y = Y(y0 + 1.7);
      g.fillStyle = "#e3dccb"; g.fillRect(x - 6, y - 10, w + 12, 10); g.fillRect(x - 8, y + h, w + 16, 8);
      g.fillStyle = "#2c3240"; g.fillRect(x, y, w, h);
      const blind = 0.2 + 0.6 * r(); g.fillStyle = "#e8e0c8"; g.fillRect(x + 3, y + 3, w - 6, h * blind); g.fillStyle = "rgba(120,110,90,0.35)"; for (let k = y + 6; k < y + h * blind; k += 5) g.fillRect(x + 3, k, w - 6, 1.2);
      g.fillStyle = "#cfc8b8"; g.fillRect(x, y + h / 2 - 2, w, 4); g.fillRect(x + w / 2 - 2, y, 4, h);
      g.fillStyle = "rgba(200,220,240,0.25)"; g.beginPath(); g.moveTo(x + w * 0.6, y + 4); g.lineTo(x + w - 4, y + 4); g.lineTo(x + w * 0.2, y + h - 4); g.lineTo(x + 4, y + h - 4); g.closePath(); g.fill(); } }
  g.fillStyle = "#cfc6b4"; g.fillRect(0, 0, W, 26); g.fillStyle = "rgba(50,44,44,0.5)"; g.fillRect(0, 26, W, 6);
});
/** the newsstand's racks: folded papers (headline bars, photos) and bright magazines, all illegible (no names) */
export const newsRackTex = () => ptex("sxNewsRack", 1024, 512, (g, r) => {
  g.fillStyle = "#2f4a36"; g.fillRect(0, 0, 1024, 512);
  for (let row = 0; row < 3; row++) { const y = 14 + row * 166; g.fillStyle = "#1c2c22"; g.fillRect(0, y + 150, 1024, 10);
    for (let x = 10; x < 1000; x += 92 + r() * 20) { const mag = r() < 0.45, w = 80, h = 140, tilt = (r() - 0.5) * 0.06;
      g.save(); g.translate(x + w / 2, y + h / 2 + 8); g.rotate(tilt);
      if (mag) { const col = pick(r, ["#d8432e", "#f2c230", "#3b6fb0", "#e86a9a", "#4aa36a", "#f08a2a"]); g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
        g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(-w / 2 + 6, -h / 2 + 8, w - 12, 18); g.fillStyle = "rgba(40,30,30,0.35)"; g.beginPath(); g.ellipse(0, 18, 24, 34, 0, 0, TAU); g.fill(); }
      else { g.fillStyle = "#ece6d4"; g.fillRect(-w / 2, -h / 2, w, h); g.fillStyle = "#1a1a1a"; g.fillRect(-w / 2 + 6, -h / 2 + 8, w - 12, 14);
        g.fillStyle = "rgba(20,20,20,0.75)"; g.fillRect(-w / 2 + 6, -h / 2 + 28, w - 12, 10); g.fillStyle = "rgba(60,60,60,0.5)"; g.fillRect(-w / 2 + 6, -h / 2 + 46, w * 0.45, 40);
        for (let k = 0; k < 6; k++) g.fillRect(-w / 2 + 6 + w * 0.5, -h / 2 + 48 + k * 8, w * 0.35, 3); }
      g.restore(); } }
});
/** painted plank boards (kiosk walls, pallets): vertical boards with grain and dark seams */
export const boardsTex = (col: string) => ptex("sxBoards" + col, 512, 512, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 6; k++) { const x = k * (512 / 6); g.fillStyle = jit(r, col, 0.06, 3, 0.1); g.fillRect(x, 0, 512 / 6, 512); g.fillStyle = "rgba(20,24,20,0.45)"; g.fillRect(x, 0, 3, 512); g.fillStyle = "rgba(255,255,240,0.2)"; g.fillRect(x + 3, 0, 2, 512); }
  for (let i = 0; i < 120; i++) { const x = r() * 512; g.strokeStyle = `rgba(30,30,24,${0.05 + 0.08 * r()})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 10 * (r() - 0.5), 170, x + 10 * (r() - 0.5), 340, x, 512); g.stroke(); }
  for (let i = 0; i < 20; i++) blotch(g, r() * 512, r() * 512, 10 + 30 * r(), 1, "255,250,230", 0.08);
});
/** an oil drum's painted wrap (u round): body colour, two rolling hoops, rust, drips down from the lid */
export const drumTex = (col: string) => ptex("sxDrum" + col, 512, 256, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 40; i++) blotch(g, r() * 512, r() * 256, 10 + 30 * r(), 1.3, r() < 0.5 ? "40,30,30" : "255,250,240", 0.08);
  for (const y of [86, 170]) { g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(0, y - 6, 512, 4); g.fillStyle = "rgba(20,16,16,0.45)"; g.fillRect(0, y - 2, 512, 5); }
  g.fillStyle = "rgba(30,24,24,0.5)"; g.fillRect(0, 0, 512, 8); g.fillRect(0, 248, 512, 8);
  for (let i = 0; i < 16; i++) { const x = r() * 512, L = 30 + 120 * r(); const gr = g.createLinearGradient(0, 6, 0, 6 + L); gr.addColorStop(0, "rgba(140,70,34,0.6)"); gr.addColorStop(1, "rgba(140,70,34,0)"); g.fillStyle = gr; g.fillRect(x, 6, 3 + 5 * r(), L); }
  for (let i = 0; i < 10; i++) blotch(g, r() * 512, 200 + 50 * r(), 8 + 20 * r(), 1.3, "150,76,38", 0.4);
});
/** white clapboard (the guard hut): horizontal boards with shadow lines, weathering */
export const clapboardTex = () => ptex("sxClap", 512, 512, (g, r) => {
  g.fillStyle = "#ece8de"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) { const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, "rgba(120,110,100,0.32)"); gr.addColorStop(0.15, "rgba(120,110,100,0.06)"); gr.addColorStop(1, "rgba(255,255,255,0.05)"); g.fillStyle = gr; g.fillRect(0, y, 512, 32); }
  for (let i = 0; i < 60; i++) blotch(g, r() * 512, r() * 512, 10 + 40 * r(), 1.5, "130,120,104", 0.06);
});
/** a clump of waterfront weeds (alpha): olive / green blades, a few yellow flower heads */
export const weedTex = (i: number) => ptex("sxWeed" + i, 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256); g.lineCap = "round";
  const n = 18 + Math.floor(r() * 12);
  for (let k = 0; k < n; k++) { const x0 = 128 + (r() - 0.5) * 70, h = 70 + 170 * r(), lean = (r() - 0.5) * 90, w = 3 + 4 * r();
    g.strokeStyle = pick(r, ["#5f7a32", "#728a3a", "#4f6a2c", "#8a9a48", "#9a8a4a"]); g.lineWidth = w;
    g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0 + lean * 0.3, 256 - h * 0.6, x0 + lean, 256 - h); g.stroke();
    g.strokeStyle = "rgba(30,40,20,0.5)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0 + w * 0.4, 256); g.quadraticCurveTo(x0 + lean * 0.3 + w * 0.4, 256 - h * 0.6, x0 + lean, 256 - h); g.stroke(); }
  for (let k = 0; k < 2 + (i % 3); k++) { const x = 90 + r() * 80, y = 90 + r() * 70; g.fillStyle = "#f2c230"; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.fillStyle = "#c8861e"; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
});
/** a rain puddle (alpha): a soft-edged dark-water shape with a pale sky sheen and a lip; oil = a rainbow sheen ring */
export const puddleTex = (oil: boolean, seed = 0) => ptex(`sxPuddle${oil ? "Oil" : ""}${seed}`, 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  const lobes = Array.from({ length: 6 }, () => [256 + (r() - 0.5) * 200, 256 + (r() - 0.5) * 140, 70 + 70 * r()]);
  const shape = (grow: number) => { g.beginPath(); lobes.forEach(([x, y, rad]) => { g.moveTo(x + rad + grow, y); g.ellipse(x, y, rad + grow, (rad + grow) * 0.62, 0, 0, TAU); }); };
  // fix r1 (audit A1: a pale pastel ring read like a UI bubble): a dark wet lip, deep slate-blue water, a soft sky
  // window only on the far half, an oil puddle's rainbow film, a thin dark contact line round the edge
  g.fillStyle = "rgba(58,46,52,0.42)"; shape(16); g.fill();
  g.strokeStyle = "rgba(34,26,34,0.6)"; g.lineWidth = 7; shape(2); g.stroke();   // the contact line (inner overlaps get covered by the fill)
  g.fillStyle = "rgba(52,62,88,0.95)"; shape(0); g.fill();
  g.save(); shape(0); g.clip();
  const gr = g.createLinearGradient(0, 110, 0, 330); gr.addColorStop(0, "rgba(176,198,226,0.62)"); gr.addColorStop(1, "rgba(120,140,176,0)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  if (oil) { g.save(); g.filter = "blur(6px)"; for (const [c, w, rr0] of [["rgba(220,80,170,0.3)", 18, 0.9], ["rgba(90,200,140,0.3)", 15, 0.76], ["rgba(250,200,60,0.34)", 14, 0.62], ["rgba(90,120,230,0.28)", 13, 0.48]] as const) {
    g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.ellipse(250, 260, 150 * rr0, 90 * rr0, 0.3, 0, TAU); g.stroke(); } g.restore(); }
  g.strokeStyle = "rgba(235,242,252,0.55)"; g.lineWidth = 4; g.lineCap = "round"; for (let k = 0; k < 3; k++) { const y = 196 + k * 26; g.beginPath(); g.moveTo(180 + k * 22, y); g.lineTo(250 + k * 24, y - 3); g.stroke(); }
  g.restore();
});
/** a falling rain streak (alpha, white; tinted by the material) and a splash crown ring */
export const rainTex = () => ptex("sxRain", 16, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.7, "rgba(255,255,255,0.75)"); gr.addColorStop(1, "rgba(255,255,255,0.95)");
  g.clearRect(0, 0, 16, 256); g.fillStyle = gr; g.fillRect(5, 0, 6, 256);
});
export const splashTex = () => ptex("sxSplash", 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128); g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 7; g.beginPath(); g.ellipse(64, 64, 52, 52, 0, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 4; g.beginPath(); g.ellipse(64, 64, 34, 34, 0, 0, TAU); g.stroke();
});
/** catwalk / platform grating: dark steel bars over a darker void (opaque) */
export const gratingTex = () => ptex("sxGrating", 256, 256, (g) => {
  g.fillStyle = "#3c3a40"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) { g.fillStyle = "#8c8a86"; g.fillRect(x, 0, 5, 256); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x, 0, 1.5, 256); }
  for (let y = 0; y < 256; y += 64) { g.fillStyle = "#77746e"; g.fillRect(0, y, 256, 4); }
});
/** stencilled tank number (alpha): dark slate stencil letters with bridges and wear */
export const stencilTex = (text: string) => ptex("sxStencil" + text, 768, 256, (g, r) => {
  g.clearRect(0, 0, 768, 256);
  const fam = '"Arial Black", Arial, sans-serif', px = fitPx(g, [text], fam, 720, 200, 1);
  g.font = `bold ${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(52,56,66,0.92)"; g.fillText(text, 384, 132);
  g.globalCompositeOperation = "destination-out";
  for (let x = 40; x < 768; x += 56) g.fillRect(x, 0, 6, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + 0.6 * r()})`; g.fillRect(r() * 768, r() * 256, 1 + 4 * r(), 1 + 3 * r()); }
  g.globalCompositeOperation = "source-over";
});
/** a small enamel plate with one or two words (NO SMOKING, ...): fg on bg, a border, four bolts */
export const plateTex = (key: string, lines: string[], bg: string, fg: string, w = 512, h = 256) => ptex(`sxPlate_${key}_${w}_${h}`, w, h, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); for (let i = 0; i < 20; i++) blotch(g, r() * w, r() * h, 10 + 30 * r(), 1.3, "120,100,80", 0.08);
  g.strokeStyle = fg; g.lineWidth = Math.round(h * 0.05); g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
  const fam = '"Arial Black", Arial, sans-serif', px = fitPx(g, lines, fam, w * 0.84, Math.round((h * 0.66) / lines.length), 1);
  g.font = `bold ${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = fg;
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * px * 1.12));
  for (const [x, y] of [[h * 0.14, h * 0.14], [w - h * 0.14, h * 0.14], [h * 0.14, h - h * 0.14], [w - h * 0.14, h - h * 0.14]]) nail(g, x, y, h * 0.035, "#4a3a2a");
});
/** the tank level gauge board (128 x 1024 = 0.3 x 2.4 m): white enamel, black ticks, FULL / EMPTY */
export const gaugeTex = () => ptex("sxGauge2", 128, 1024, (g) => {
  g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, 128, 1024); g.strokeStyle = "#1e1e24"; g.lineWidth = 6; g.strokeRect(3, 3, 122, 1018);
  g.fillStyle = "#1e1e24"; for (let y = 120; y < 920; y += 20) g.fillRect(10, y, y % 100 === 20 ? 60 : 34, 4);
  // fix r2 (audit A2 P2 shot 4: the vertical word 'EMPTY' read as an extra gag over the '90% FULL' board): ticks only, a
  // few numbered-less heavy marks and a grime run (no words at all)
  for (let y = 120; y < 920; y += 100) g.fillRect(70, y, 30, 4);
  g.fillStyle = "rgba(120,96,70,0.35)"; g.fillRect(100, 140, 8, 760);
  g.fillStyle = "#c0241c"; g.fillRect(10, 90, 108, 10);
});
/** an orange / white windsock (u round, v along) */
export const windsockTex = () => ptex("sxWindsock", 256, 256, (g) => {
  for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? "#f6f2ea" : "#e8582a"; g.fillRect(0, (k * 256) / 5, 256, 256 / 5); }
  g.fillStyle = "rgba(60,30,20,0.25)"; for (let k = 1; k < 5; k++) g.fillRect(0, (k * 256) / 5 - 2, 256, 3);
});
/** split-flap digits for the LOANS counter: 0-9 + blank (index 10), each cell a dark card with a cream digit, hinge line */
export const SX_FLAP = "0123456789 ";
export const loansFlapAtlas = () => ptex("sxFlapAtlas", 160 * 11, 320, (g) => {
  for (let i = 0; i < 11; i++) {
    const x = i * 160;
    g.fillStyle = "#151816"; g.fillRect(x, 0, 160, 320);
    rr(g, x + 6, 6, 148, 308, 14); g.fillStyle = "#242a26"; g.fill();
    const gr = g.createLinearGradient(0, 6, 0, 314); gr.addColorStop(0, "rgba(255,255,255,0.08)"); gr.addColorStop(0.5, "rgba(0,0,0,0.14)"); gr.addColorStop(1, "rgba(255,255,255,0.05)"); g.fillStyle = gr; g.fillRect(x + 6, 6, 148, 308);
    g.save(); g.translate(x + 80, 166); g.scale(0.82, 1); g.font = 'bold 270px "Arial Black", Arial, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#f4ecd6"; g.fillText(SX_FLAP[i], 0, 6); g.restore();
    g.fillStyle = "#080a09"; g.fillRect(x + 6, 157, 148, 6); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x + 6, 163, 148, 2);
  }
});
/** the LOANS counter layout (metres from the face centre, y up): 9 flap cells ($ ddd,ddd,ddd) under the "LOANS:" label */
export const LOANS_LAYOUT = (w: number, h: number) => {
  const cw = 0.088, ch = 0.19, gap = 0.008, cg = 0.042, dollar = 0.085, total = dollar + 0.018 + 9 * cw + 6 * gap + 2 * cg, cy = -h / 2 + 0.045 + ch / 2;
  const cells: { x: number; y: number }[] = []; let x = -total / 2 + dollar + 0.018;
  for (let i = 0; i < 9; i++) { cells.push({ x: x + cw / 2, y: cy }); x += cw + (i % 3 === 2 ? cg : gap); }
  return { cw, ch, cells, dollarX: -total / 2 + dollar / 2, commas: [cells[2].x + cw / 2 + cg / 2, cells[5].x + cw / 2 + cg / 2], labelY: h / 2 - 0.03 - 0.075, w, h };
};
/** the LOANS counter face: dark green enamel, "LOANS:" in cream, recessed flap windows, the "$" and commas painted */
export const loansFaceTex = (w: number, h: number) => ptex(`sxLoansFace_${w}_${h}`, Math.round(w * 1200), Math.round(h * 1200), (g, r) => {
  const PX = 1200, W = Math.round(w * PX), H = Math.round(h * PX), L = LOANS_LAYOUT(w, h), cx = (x: number) => (x + w / 2) * PX, cy = (y: number) => (h / 2 - y) * PX;
  g.fillStyle = "#1e3a2e"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1200; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)"; g.fillRect(r() * W, r() * H, 2, 2); }
  g.strokeStyle = "#c9a85a"; g.lineWidth = 10; g.strokeRect(12, 12, W - 24, H - 24);
  const fam = '"Arial Black", Arial, sans-serif';
  g.font = `bold ${Math.round(0.135 * PX)}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#f4ecd6"; g.fillText("LOANS:", W / 2, cy(L.labelY));
  for (const c of L.cells) { g.fillStyle = "#070908"; rr(g, cx(c.x - L.cw / 2) - 6, cy(c.y + L.ch / 2) - 6, L.cw * PX + 12, L.ch * PX + 12, 8); g.fill(); }
  g.font = `bold ${Math.round(0.2 * PX)}px ${fam}`; g.fillStyle = "#f4ecd6"; g.fillText("$", cx(L.dollarX), cy(L.cells[0].y) + 6);
  // fix r1 (audit A1: the commas were dots under the baseline, read "$150 000 000"): real commas ~40 % of the digit
  // height, the dot ON the digits' baseline, the tail curling down-left, each in its own gap
  for (const x of L.commas) { const base = cy(L.cells[0].y - 0.057), X = cx(x), rd = 15;
    g.fillStyle = "#f4ecd6"; g.beginPath(); g.arc(X, base - rd, rd, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(X + rd * 0.95, base - rd * 0.7); g.quadraticCurveTo(X + rd * 0.9, base + rd * 1.6, X - rd * 0.9, base + rd * 2.6);
    g.quadraticCurveTo(X + rd * 0.1, base + rd * 1.2, X - rd * 0.3, base - rd * 0.2); g.closePath(); g.fill(); }
  for (const [bx, by] of [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]]) nail(g, bx, by, 7, "#0e1410");
});
/** a city pigeon side view (alpha): slate grey body, iridescent neck, pink feet; frame 0 standing, 1 pecking, 2 wings up */
export const pigeonTex = (fr: number) => ptex("sxPigeon" + fr, 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.lineJoin = "round"; g.strokeStyle = "#2a2632"; g.lineWidth = 5;
  // fix r2: frame 3 = wings DOWN (the flap pair 2 / 3 for the take-off), tucked feet in flight
  const peck = fr === 1, fly = fr === 2 || fr === 3;
  g.strokeStyle = "#d86a7a"; g.lineWidth = 4; if (!fly) { g.beginPath(); g.moveTo(118, 196); g.lineTo(114, 226); g.moveTo(140, 196); g.lineTo(142, 226); g.stroke(); }
  else { g.beginPath(); g.moveTo(150, 194); g.lineTo(176, 204); g.stroke(); }
  g.strokeStyle = "#2a2632"; g.lineWidth = 5;
  g.fillStyle = "#8a8f9e"; g.beginPath(); g.ellipse(132, 168, 50, 32, -0.15, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#5e6372"; g.beginPath(); g.moveTo(178, 160); g.lineTo(226, 150); g.lineTo(222, 178); g.closePath(); g.fill(); g.stroke();
  if (fr === 2) { g.fillStyle = "#a3a8b6"; g.beginPath(); g.moveTo(110, 150); g.quadraticCurveTo(140, 40, 230, 14); g.quadraticCurveTo(200, 100, 168, 160); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#3a3e4a"; g.beginPath(); g.moveTo(206, 26); g.lineTo(230, 14); g.lineTo(214, 46); g.closePath(); g.fill(); }
  else if (fr === 3) { g.fillStyle = "#a3a8b6"; g.beginPath(); g.moveTo(112, 168); g.quadraticCurveTo(150, 236, 236, 246); g.quadraticCurveTo(196, 200, 168, 172); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#3a3e4a"; g.beginPath(); g.moveTo(208, 238); g.lineTo(236, 246); g.lineTo(214, 222); g.closePath(); g.fill(); }
  else { g.fillStyle = "#a3a8b6"; g.beginPath(); g.ellipse(146, 162, 34, 18, -0.1, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#3a3e4a"; g.fillRect(140, 168, 26, 4); g.fillRect(146, 176, 22, 4); }
  const hx = peck ? 74 : 92, hy = peck ? 186 : 118;
  g.fillStyle = "#6a8a8a"; g.beginPath(); g.moveTo(100, 160); g.quadraticCurveTo(hx + 6, hy + 20, hx + 10, hy + 6); g.lineTo(hx + 30, hy + 14); g.quadraticCurveTo(122, 150, 120, 166); g.closePath(); g.fill();
  g.fillStyle = "#7d8292"; g.beginPath(); g.arc(hx, hy, 17, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#e8a23a"; g.beginPath(); g.arc(hx - 5, hy - 3, 4.5, 0, TAU); g.fill(); g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(hx - 5, hy - 3, 2, 0, TAU); g.fill();
  g.fillStyle = "#3a3434"; g.beginPath(); g.moveTo(hx - 15, hy + 2); g.lineTo(hx - 28, hy + 6); g.lineTo(hx - 15, hy + 8); g.closePath(); g.fill();
});
/** a loose newspaper sheet (both sides): newsprint columns, a headline bar, a photo block (illegible) */
export const newsSheetTex = () => ptex("sxNewsSheet", 512, 384, (g, r) => {
  g.fillStyle = "#ece6d4"; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "#1a1a1a"; g.fillRect(20, 18, 472, 26); g.fillStyle = "rgba(50,50,50,0.5)"; g.fillRect(20, 60, 200, 130);
  g.fillStyle = "rgba(30,30,30,0.55)"; for (let c = 0; c < 4; c++) for (let k = 0; k < 22; k++) { const x = 20 + c * 120, y = (c === 0 ? 200 : 60) + k * 13; if (y < 370) g.fillRect(x, y, 100 * (0.6 + 0.4 * r()), 5); }
  g.fillStyle = "rgba(120,110,90,0.15)"; g.fillRect(254, 0, 4, 384);
});

// =====================================================================================================================
// WORLD-EXT fix round 1 (audit A1, 2026-11-14): the drip clue, the storm (crowns, ripples, curtains, scudding clouds,
// lightning, rivulets, wet puddles with the tank's reflection), the hatch-zone roof plates, sky life, the street dressing.
// =====================================================================================================================
/** the shot-2 drip: a FAT teardrop, pale blue #8FD0F0, a plum outline, a white glint (sprite, alpha, point at the top) */
export const dripDropTex = () => ptex("sxDropFat2", 128, 192, (g) => {
  // fix r2 (audit A2 P1: a ~12 px blue speck lost on blue overalls): a CLEAR-WHITE cartoon drop (a cool white body, a
  // pale blue lower rim, a thick plum outline that reads on any background, a big white specular + a small one)
  g.clearRect(0, 0, 128, 192); g.lineJoin = "round";
  const path = () => { g.beginPath(); g.moveTo(64, 14); g.bezierCurveTo(76, 58, 112, 96, 112, 130); g.arc(64, 130, 48, 0, Math.PI, false); g.bezierCurveTo(16, 96, 52, 58, 64, 14); g.closePath(); };
  path(); g.fillStyle = "#f2f9ff"; g.fill();
  g.save(); path(); g.clip(); const gr = g.createRadialGradient(50, 112, 6, 70, 140, 64); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.7, "rgba(150,206,240,0.35)"); gr.addColorStop(1, "rgba(74,150,214,0.75)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 192); g.restore();
  g.strokeStyle = "#2c1e2a"; g.lineWidth = 13; path(); g.stroke();
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(47, 116, 12, 20, -0.45, 0, TAU); g.fill(); g.beginPath(); g.arc(84, 152, 6.5, 0, TAU); g.fill();
});
/** fix r2: a crisp 4-point glint star (white, alpha) for the spout's release flash, the hubcap and the oil sparkle */
export const glintStarTex = () => ptex("sxGlintStar", 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#ffffff";
  for (const [w, h] of [[5, 62], [62, 5]] as const) { g.beginPath(); g.moveTo(64 - w, 64); g.quadraticCurveTo(64, 64, 64, 64 - h); g.quadraticCurveTo(64, 64, 64 + w, 64); g.quadraticCurveTo(64, 64, 64, 64 + h); g.quadraticCurveTo(64, 64, 64 - w, 64); g.fill(); }
});
/** fix r2 (audit A2 P3 shot 9: the rain rings were fat perfect circles): ONE hairline ring (white, alpha), soft */
export const rippleThinTex = () => ptex("sxRippleThin", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.save(); g.filter = "blur(0.8px)"; g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 3.2; g.beginPath(); g.ellipse(128, 128, 118, 118, 0, 0, TAU); g.stroke(); g.restore();
});
/** fix r2: a broken vertical light streak on wet ground (white, alpha; tinted warm by the material): narrow, ripple gaps */
export const wetStreakTex = () => ptex("sxWetStreak", 64, 512, (g, r) => {
  g.clearRect(0, 0, 64, 512);
  for (let y = 0; y < 512; y += 6) { const a = Math.pow(1 - y / 512, 0.7) * (0.45 + 0.55 * r()), w = 10 + 18 * r() * (1 - y / 700), x0 = 32 - w / 2 + (r() - 0.5) * 6;
    if (r() < 0.22) continue; const gr = g.createLinearGradient(x0, 0, x0 + w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x0, y, w, 4); }
});
/** a side-view splash crown (white, alpha): a flat ring with 5 rising spikes and flying droplets */
export const crownTex = () => ptex("sxCrown2", 128, 128, (g, r) => {
  // fix r1: a soft splash burst (no crown icon): a flat soft ring, a misty puff, flying droplets of mixed sizes
  g.clearRect(0, 0, 128, 128);
  blotch(g, 64, 108, 34, 1.9, "255,255,255", 0.55);
  g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 3; g.beginPath(); g.ellipse(64, 110, 40, 7, 0, 0, TAU); g.stroke();
  for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.2, d = 18 + 40 * r(), x = 64 + Math.cos(a) * d * 0.9, y = 104 + Math.sin(a) * d, rad = 1.6 + 3.2 * r();
    g.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * r()})`; g.beginPath(); g.ellipse(x, y, rad, rad * 1.4, 0, 0, TAU); g.fill(); }
});
/** a thin ripple ring (white, alpha) for puddle rain rings */
export const rippleTex = () => ptex("sxRipple", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 112, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 5; g.beginPath(); g.arc(128, 128, 84, 0, TAU); g.stroke();
});
/** scudding storm deck (alpha, tiles in u): dark slate-blue billows, cool lit tops, darker bellies, a ragged soft bottom */
export const stormCloudTex = (seed: number) => ptex("sxStormCloud" + seed, 2048, 512, (g, r) => {
  const W = 2048, H = 512; g.clearRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(44,58,98,1)"); gr.addColorStop(0.5, "rgba(62,80,124,0.96)"); gr.addColorStop(0.8, "rgba(84,100,142,0.6)"); gr.addColorStop(1, "rgba(96,112,152,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 170; i++) { const x = r() * W, y = 70 + r() * 330, rad = 36 + 80 * r(), lit = r();
    wrapX(W, x - rad * 1.6, rad * 3.2, (X0) => { const X = X0 + rad * 1.6;
      blotch(g, X, y + rad * 0.35, rad * 1.05, 1.5, "28,36,66", 0.42);
      blotch(g, X, y, rad, 1.4, "74,92,138", 0.6);
      blotch(g, X - rad * 0.2, y - rad * 0.45, rad * 0.65, 1.3, lit < 0.5 ? "128,146,190" : "150,166,206", 0.42); }); }
  g.globalCompositeOperation = "destination-in";
  for (let x = 0; x < W; x += 8) { const b = H * (0.8 + 0.12 * Math.sin(x * 0.011) + 0.06 * Math.sin(x * 0.037 + 1.3)); const m = g.createLinearGradient(0, b - 90, 0, b); m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = m; g.fillRect(x, 0, 8, H); }
  g.globalCompositeOperation = "source-over";
});
/** a forked lightning bolt (alpha): a soft violet-white glow round a white core, one branch */
export const boltTex = () => ptex("sxBolt", 256, 1024, (g, r) => {
  g.clearRect(0, 0, 256, 1024);
  const main: [number, number][] = [[128, 0]]; let x = 128, y = 0;
  while (y < 990) { y += 38 + 46 * r(); x = Math.max(36, Math.min(220, x + (r() - 0.5) * 92)); main.push([x, Math.min(1010, y)]); }
  const k0 = Math.floor(main.length * 0.35), br: [number, number][] = [main[k0]]; { let bx = main[k0][0], by = main[k0][1]; for (let i = 0; i < 6; i++) { by += 34 + 30 * r(); bx += 18 + 24 * r(); br.push([Math.min(240, bx), by]); } }
  const line = (pts: [number, number][], w: number, col: string, blur: number) => { g.save(); if (blur) g.filter = `blur(${blur}px)`; g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke(); g.restore(); };
  for (const [p, s] of [[main, 1], [br, 0.6]] as const) { line(p, 34 * s, "rgba(170,186,255,0.45)", 14); line(p, 12 * s, "rgba(222,232,255,0.9)", 3); line(p, 5 * s, "#ffffff", 0); }
});
/** a far rain curtain (alpha, tiles both ways): hundreds of thin streaks */
export const rainSheetTex = () => ptex("sxRainSheet", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512); g.lineCap = "round";
  for (let i = 0; i < 520; i++) { const x = r() * 512, y = r() * 512, L = 30 + 90 * r(), a = 0.25 + 0.6 * r(), w = 1 + 1.2 * r();
    wrap2(512, 512, x, y + L / 2, L, (X, Y) => { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(X + L * 0.06, Y - L / 2); g.lineTo(X - L * 0.06, Y + L / 2); g.stroke(); }); }
});
/** wet rivulets running down a tank wall (alpha, tiles both ways): darker soaked streaks + thin cool highlights */
export const rivuletTex = () => ptex("sxRivulet", 1024, 512, (g, r) => {
  g.clearRect(0, 0, 1024, 512);
  for (let i = 0; i < 70; i++) { const x = r() * 1024, w = 3 + 9 * r(), a = 0.18 + 0.25 * r(), wob = r() * 6;
    wrapX(1024, x - 12, 24, (X) => { g.strokeStyle = `rgba(26,36,62,${a})`; g.lineWidth = w; g.beginPath(); for (let y = 0; y <= 512; y += 32) { const xx = X + Math.sin(y * 0.0123 * TAU + wob) * 3; if (y) g.lineTo(xx, y); else g.moveTo(xx, y); } g.stroke();
      g.strokeStyle = `rgba(226,236,252,${a * 1.3})`; g.lineWidth = 1.4; g.beginPath(); for (let y = 0; y <= 512; y += 32) { const xx = X + w * 0.45 + Math.sin(y * 0.0123 * TAU + wob) * 3; if (y) g.lineTo(xx, y); else g.moveTo(xx, y); } g.stroke(); }); }
  for (let i = 0; i < 90; i++) { const x = r() * 1024, y = r() * 512; g.fillStyle = "rgba(232,240,252,0.55)"; g.beginPath(); g.ellipse(x, y, 2.2, 3.6, 0, 0, TAU); g.fill(); }
});
/** a rain puddle on the dark wet apron (opaque centre, soft lobed edge): deep navy water, the hero tank's pale wall
 *  reflected on the far half (vertical smears, rust runs, broken by ripple lines), a cool rim */
export const stormPuddleTex = (seed: number) => ptex("sxStormPuddleB" + seed, 1024, 512, (g, r) => {
  const W = 1024, H = 512; g.clearRect(0, 0, W, H);
  const lobes = Array.from({ length: 8 }, (_, i) => [W * (0.14 + 0.72 * (i / 7)) + (r() - 0.5) * 60, H * 0.5 + (r() - 0.5) * 90, 90 + 70 * r()]);
  const shape = (grow: number) => { g.beginPath(); lobes.forEach(([x, y, rad]) => { g.moveTo(x + rad + grow, y); g.ellipse(x, y, rad + grow, (rad + grow) * 0.92, 0, 0, TAU); }); };
  g.save(); g.filter = "blur(6px)"; g.fillStyle = "rgba(14,18,32,0.55)"; shape(22); g.fill(); g.restore();
  // fix r2 (audit A2 P3: every lobe's outline read as a ring of overlapping perfect circles): the cool rim is stroked
  // UNDER the water fill, so only the union's outer edge shows
  g.strokeStyle = "rgba(170,186,214,0.45)"; g.lineWidth = 6; shape(1); g.stroke();
  g.fillStyle = "rgba(22,30,54,0.97)"; shape(0); g.fill();
  g.save(); shape(0); g.clip();
  // the reflection: canvas top = the far side (toward the tank): a pale cream-blue band with vertical smears
  const band = g.createLinearGradient(0, 40, 0, H * 0.7); band.addColorStop(0, "rgba(196,204,222,0.7)"); band.addColorStop(0.6, "rgba(150,164,196,0.45)"); band.addColorStop(1, "rgba(80,96,140,0)");
  g.fillStyle = band; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) { const x = r() * W, w = 6 + 24 * r(); const gr = g.createLinearGradient(0, 30, 0, 30 + 260 * r()); gr.addColorStop(0, `rgba(${r() < 0.4 ? "150,84,52" : "226,230,242"},${0.25 + 0.3 * r()})`); gr.addColorStop(1, "rgba(200,210,230,0)"); g.fillStyle = gr; g.fillRect(x, 0, w, H * 0.7); }
  g.fillStyle = "rgba(14,20,40,0.8)"; g.fillRect(W * 0.43, 0, W * 0.14, H * 0.28);   // the dark gate gap
  for (let k = 0; k < 18; k++) { const y = 30 + k * 22 + r() * 8; g.fillStyle = `rgba(20,28,52,${0.35 + 0.25 * r()})`; g.fillRect(0, y, W, 2 + 3 * r()); }
  g.restore();
});
/** the hatch zone of the hero roof (canvas = HZ_SIZE m square centred on the hatch; canvas x = world x, canvas y = world
 *  z, the camera side +z at the bottom): a riveted doubler pad round the collar, a weld bead, radial plate seams with
 *  rivet rows, rust runs and golden oil drips from the collar, a rainbow oil-sheen ring, an oil-can ring stain, boot
 *  scuffs; the outer edge fades into the roof disc */
export const HZ_SIZE = 3.4;
export const hatchZoneTex = () => ptex("sxHatchZone4", 2048, 2048, (g, r) => {
  const S = 2048, k = S / HZ_SIZE, C = S / 2, Rh = 0.445 * k;
  g.clearRect(0, 0, S, S);
  g.fillStyle = "#ddd3bd"; g.beginPath(); g.arc(C, C, 1.7 * k, 0, TAU); g.fill();
  for (let i = 0; i < 160; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 1.6 * k; blotch(g, C + Math.cos(a) * d, C + Math.sin(a) * d, 30 + 70 * r(), 1 + r(), r() < 0.5 ? "128,108,84" : "255,250,238", 0.06); }
  for (let i = 0; i < 26000; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 1.68 * k; g.fillStyle = `rgba(${r() < 0.5 ? "100,86,70" : "255,250,236"},${0.05 + 0.08 * r()})`; g.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.5 + 2 * r(), 1.5 + 2 * r()); }
  const rivet = (x: number, y: number) => { g.fillStyle = "rgba(84,70,58,0.7)"; g.beginPath(); g.arc(x + 1.3, y + 1.3, 4.6, 0, TAU); g.fill();
    g.fillStyle = "#e6dcc6"; g.beginPath(); g.arc(x, y, 3.8, 0, TAU); g.fill(); g.fillStyle = "rgba(255,252,240,0.9)"; g.beginPath(); g.arc(x - 1.2, y - 1.2, 1.6, 0, TAU); g.fill(); };
  const seamTo = (a: number, d0: number, d1: number) => { const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    g.strokeStyle = "rgba(94,80,64,0.6)"; g.lineWidth = 5; g.beginPath(); g.moveTo(C + ca * d0, C + sa * d0); g.lineTo(C + ca * d1, C + sa * d1); g.stroke();
    g.strokeStyle = "rgba(255,252,240,0.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(C + ca * d0 + nx * 4, C + sa * d0 + ny * 4); g.lineTo(C + ca * d1 + nx * 4, C + sa * d1 + ny * 4); g.stroke();
    for (let d = d0 + 14; d < d1; d += 25) rivet(C + ca * d - nx * 11, C + sa * d - ny * 11); };
  // radial plate seams out from the pad, every 45 deg
  for (let i = 0; i < 8; i++) seamTo((i + 0.5) * (TAU / 8) + 0.12, 0.9 * k, 1.66 * k);
  // the doubler pad (a ring plate round the collar): its edge seam + two rivet rings
  g.strokeStyle = "rgba(94,80,64,0.62)"; g.lineWidth = 6; g.beginPath(); g.arc(C, C, 0.9 * k, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(255,252,240,0.55)"; g.lineWidth = 3; g.beginPath(); g.arc(C, C, 0.9 * k + 5, 0, TAU); g.stroke();
  for (const [rr0, n] of [[0.84, 64], [0.6, 46]] as const) for (let i = 0; i < n; i++) { const a = (i / n) * TAU; rivet(C + Math.cos(a) * rr0 * k, C + Math.sin(a) * rr0 * k); }
  // fix r2 (audit A2 P2 shot 7 + P3 shot 16: orange radial 'rays' and a perfect concentric rainbow halo read as lens
  // artefacts): ONE irregular dark oil-stain ring (#4A2E14, 35-45 %, ragged, ~0.6-0.9 m wide), three fat golden-brown
  // drip runs out from the collar, and the iridescence only as 3-4 broken thin arcs on the stain's outer edge (<= 20 %)
  const ragR = (a: number, base: number, ph: number) => base * (1 + 0.13 * Math.sin(a * 3 + ph) + 0.07 * Math.sin(a * 7 + ph * 2.3) + 0.04 * Math.sin(a * 13 + ph * 0.7));
  const ragPath = (base: number, ph: number) => { g.beginPath(); for (let a = 0; a <= TAU + 0.001; a += 0.03) { const rr0 = ragR(a, base, ph) * k, x = C + Math.cos(a) * rr0, y = C + Math.sin(a) * rr0; if (a) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
  g.save(); g.filter = "blur(3px)";
  g.fillStyle = "rgba(74,46,20,0.24)"; ragPath(1.02, 0.6); g.fill();
  g.fillStyle = "rgba(74,46,20,0.1)"; ragPath(1.2, 2.2); g.fill();
  g.fillStyle = "rgba(96,58,18,0.18)"; ragPath(0.7, 4.1); g.fill();
  g.restore();
  // a few fresh darker spatters on the stain (oil splashed from the tape)
  for (let i = 0; i < 16; i++) { const a = r() * TAU, d = (0.55 + 0.5 * r()) * k; g.fillStyle = `rgba(70,40,14,${0.25 + 0.2 * r()})`; g.beginPath(); g.ellipse(C + Math.cos(a) * d, C + Math.sin(a) * d, 6 + 12 * r(), 4 + 8 * r(), r() * 3, 0, TAU); g.fill(); }
  // the iridescent film: broken thin arcs ON the stain edge only, <= 20 %, 6-8 px
  g.save(); g.filter = "blur(1.5px)"; g.lineCap = "round";
  for (const [a0, a1, c] of [[0.3, 1.25, "rgba(220,90,170,0.18)"], [2.0, 2.7, "rgba(90,200,150,0.18)"], [3.6, 4.5, "rgba(250,206,80,0.2)"], [5.1, 5.7, "rgba(100,130,230,0.16)"]] as const) {
    g.strokeStyle = c; g.lineWidth = 7; g.beginPath(); for (let a = a0; a <= a1; a += 0.03) { const rr0 = ragR(a, 1.02, 0.6) * k - 6, x = C + Math.cos(a) * rr0, y = C + Math.sin(a) * rr0; if (a > a0) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  g.restore();
  // three drip runs from the collar lip (wide, darker golden-brown, wobbly, a bead at the end)
  // (r2 check: long wobbly runs read as worms): short fat tapering runs, soft, the bead just a little wider than the tip
  for (const [a, Ld, w] of [[0.95, 0.3, 42], [2.55, 0.22, 34], [4.25, 0.34, 40]] as const) {
    const d0 = Rh + 8, d1 = d0 + Ld * k, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    const gr = g.createLinearGradient(C + ca * d0, C + sa * d0, C + ca * d1, C + sa * d1); gr.addColorStop(0, "rgba(118,72,18,0.55)"); gr.addColorStop(1, "rgba(150,96,24,0.3)");
    g.save(); g.filter = "blur(2px)"; g.fillStyle = gr; g.beginPath(); g.moveTo(C + ca * d0 + nx * w / 2, C + sa * d0 + ny * w / 2);
    g.quadraticCurveTo(C + ca * (d0 + d1) / 2 + nx * w * 0.3, C + sa * (d0 + d1) / 2 + ny * w * 0.3, C + ca * d1 + nx * w * 0.22, C + sa * d1 + ny * w * 0.22);
    g.arc(C + ca * d1, C + sa * d1, w * 0.26, a + Math.PI / 2, a - Math.PI / 2, true);
    g.quadraticCurveTo(C + ca * (d0 + d1) / 2 - nx * w * 0.3, C + sa * (d0 + d1) / 2 - ny * w * 0.3, C + ca * d0 - nx * w / 2, C + sa * d0 - ny * w / 2); g.closePath(); g.fill(); g.restore();
    g.fillStyle = "rgba(255,226,150,0.35)"; g.beginPath(); g.arc(C + ca * d1 - 3, C + sa * d1 - 3, w * 0.08, 0, TAU); g.fill(); }
  // rust runs from the collar base
  for (const a of [1.2, 1.9, 0.35]) { const d0 = Rh + 18, L = (0.45 + 0.35 * r()) * k, w = 16 + 10 * r();
    const gr = g.createLinearGradient(C + Math.cos(a) * d0, C + Math.sin(a) * d0, C + Math.cos(a) * (d0 + L), C + Math.sin(a) * (d0 + L)); gr.addColorStop(0, "rgba(150,70,30,0.75)"); gr.addColorStop(0.4, "rgba(166,84,40,0.45)"); gr.addColorStop(1, "rgba(166,84,40,0)");
    g.strokeStyle = gr; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(C + Math.cos(a) * d0, C + Math.sin(a) * d0); g.quadraticCurveTo(C + Math.cos(a + 0.08) * (d0 + L / 2), C + Math.sin(a + 0.08) * (d0 + L / 2), C + Math.cos(a) * (d0 + L), C + Math.sin(a) * (d0 + L)); g.stroke(); }
  // the weld bead round the collar base (a lumpy bright-dark ring)
  for (let i = 0; i < 180; i++) { const a = (i / 180) * TAU, x = C + Math.cos(a) * (Rh + 9), y = C + Math.sin(a) * (Rh + 9);
    g.fillStyle = "rgba(70,58,48,0.7)"; g.beginPath(); g.ellipse(x + 1.5, y + 1.5, 9, 6, a, 0, TAU); g.fill(); g.fillStyle = "rgba(214,204,184,0.95)"; g.beginPath(); g.ellipse(x, y, 7.5, 5, a, 0, TAU); g.fill(); }
  // an oil-can ring stain + boot scuffs on the walking side (-x, +z)
  g.strokeStyle = "rgba(96,62,22,0.45)"; g.lineWidth = 9; g.beginPath(); g.arc(C - 0.95 * k, C + 0.55 * k, 0.09 * k, 0, TAU); g.stroke();
  for (let i = 0; i < 14; i++) { const x = C - (0.6 + 0.6 * r()) * k, y = C + (r() - 0.3) * 1.0 * k; g.save(); g.translate(x, y); g.rotate(r() * TAU); g.fillStyle = "rgba(90,74,60,0.2)"; g.beginPath(); g.ellipse(0, 0, 34, 14, 0, 0, TAU); g.fill(); g.restore(); }
  // fade the outer edge into the roof disc
  g.globalCompositeOperation = "destination-in";
  const m = g.createRadialGradient(C, C, 1.35 * k, C, C, 1.69 * k); m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = m; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "source-over";
});
/** a gliding gull's shadow seen from above (soft, white on alpha: tinted violet by the material) */
export const gullShadowTex = () => ptex("sxGullShadow2", 256, 128, (g) => {
  g.clearRect(0, 0, 256, 128); g.save(); g.filter = "blur(2.5px)"; g.fillStyle = "rgba(255,255,255,1)";
  g.beginPath(); g.moveTo(128, 50); g.quadraticCurveTo(80, 30, 14, 52); g.quadraticCurveTo(70, 56, 116, 70); g.lineTo(122, 100); g.lineTo(134, 100); g.lineTo(140, 70); g.quadraticCurveTo(186, 56, 242, 52); g.quadraticCurveTo(176, 30, 128, 50); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(128, 64, 9, 26, 0, 0, TAU); g.fill(); g.restore();
});
/** a tiny worker silhouette (a far tank top): cap, overalls, 2 walk frames (alpha, dark) */
export const tinyWorkerTex = (fr: number) => ptex("sxTinyWorker" + fr, 64, 128, (g) => {
  g.clearRect(0, 0, 64, 128); g.fillStyle = "#2a2a3a"; g.strokeStyle = "#2a2a3a"; g.lineCap = "round";
  g.beginPath(); g.arc(32, 22, 9, 0, TAU); g.fill(); g.fillRect(22, 13, 22, 5);
  g.beginPath(); g.ellipse(32, 54, 12, 22, 0, 0, TAU); g.fill();
  g.lineWidth = 7; const s = fr ? 9 : -9;
  g.beginPath(); g.moveTo(28, 72); g.lineTo(32 + s, 118); g.moveTo(36, 72); g.lineTo(32 - s, 118); g.stroke();
  g.beginPath(); g.moveTo(22, 40); g.lineTo(16 - s * 0.4, 70); g.moveTo(42, 40); g.lineTo(48 + s * 0.4, 70); g.stroke();
});
/** a plain company pennant (no marks): red-orange with a cream hoist band and a navy stripe */
export const pennantTex = () => ptex("sxPennant2", 256, 128, (g) => {
  // fix r1: a plain company burgee (one red-orange swallowtail, a cream hoist and edging): never a national tricolour
  g.clearRect(0, 0, 256, 128);
  const shape = () => { g.beginPath(); g.moveTo(0, 4); g.lineTo(250, 30); g.lineTo(196, 64); g.lineTo(250, 98); g.lineTo(0, 124); g.closePath(); };
  g.fillStyle = "#f2e8d2"; shape(); g.fill(); g.save(); shape(); g.clip(); g.fillStyle = "#c8452c"; g.fillRect(26, 0, 230, 128);
  g.fillStyle = "rgba(60,20,10,0.22)"; for (let x = 60; x < 256; x += 48) g.fillRect(x, 0, 3, 128); g.restore();
  g.strokeStyle = "#f2e8d2"; g.lineWidth = 6; shape(); g.stroke();
});
/** a soft sun glow (white, alpha): a crisp disc + a wide falloff */
export const sunGlowTex = () => ptex("sxSunGlow", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.1, "rgba(255,255,255,1)"); gr.addColorStop(0.13, "rgba(255,255,255,0.5)");
  gr.addColorStop(0.35, "rgba(255,255,255,0.16)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a god-ray beam (alpha): bright near u = 0 (the sun end), soft across v, fading out along u */
export const godRayTex = () => ptex("sxGodRay", 512, 128, (g) => {
  g.clearRect(0, 0, 512, 128);
  for (let x = 0; x < 512; x += 2) { const u = x / 512, a = Math.pow(1 - u, 1.6) * Math.min(1, u * 12);
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x, 0, 2, 128); }
});
/** a warm-lit 1960s shop window (opaque): a honey interior, shelves of tins and boxes, a counter, a pendant lamp, cool
 *  glass glare stripes; no lettering */
export const shopWindowTex = () => ptex("sxShopWindow", 1024, 576, (g, r) => {
  const W = 1024, H = 576;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#f6c88a"); gr.addColorStop(0.55, "#ffd9a2"); gr.addColorStop(1, "#c88a50"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  blotch(g, 520, 120, 260, 1.6, "255,240,200", 0.7);
  for (const y of [150, 270, 390]) { g.fillStyle = "#8a5a34"; g.fillRect(40, y, W - 80, 12); g.fillStyle = "rgba(60,36,20,0.4)"; g.fillRect(40, y + 12, W - 80, 10);
    for (let x = 60; x < W - 80; x += 30 + 26 * r()) { const h = 40 + 50 * r(), w = 20 + 26 * r(); g.fillStyle = pick(r, ["#c8452c", "#3f6a8a", "#e8c25a", "#5a8a4a", "#efe6d2", "#b86a3a"]); g.fillRect(x, y - h, w, h); g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(x + 3, y - h + 4, 4, h - 8); } }
  g.fillStyle = "#6a4024"; g.fillRect(0, 450, W, 126); g.fillStyle = "#8a5a34"; g.fillRect(0, 440, W, 16);
  g.strokeStyle = "#3a2a20"; g.lineWidth = 4; g.beginPath(); g.moveTo(520, 0); g.lineTo(520, 60); g.stroke(); g.fillStyle = "#2f5a4a"; g.beginPath(); g.moveTo(480, 92); g.lineTo(560, 92); g.lineTo(538, 60); g.lineTo(502, 60); g.closePath(); g.fill();
  g.fillStyle = "#fff6d8"; g.beginPath(); g.ellipse(520, 96, 18, 8, 0, 0, TAU); g.fill();
  g.fillStyle = "rgba(230,240,255,0.22)"; for (const x of [140, 600]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 90, 0); g.lineTo(x - 60, H); g.lineTo(x - 150, H); g.closePath(); g.fill(); }
});
/** generic gold-leaf door lettering "OFFICES" (alpha): gold letters with a dark keyline (no name, no mark) */
export const officesTex = (word = "OFFICES") => ptex("sxOffices_" + word, 768, 160, (g) => {
  // fix r2 (audit A2 P3 shot 14): the firm's transom reads "ALLIED" (the name on the shot-2 gate; plain gold leaf, no mark)
  g.clearRect(0, 0, 768, 160);
  const fam = 'Georgia, "Times New Roman", serif', px = fitPx(g, [word], fam, 700, 130, 1);
  g.font = `bold ${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 9; g.strokeStyle = "rgba(40,24,10,0.95)"; g.strokeText(word, 384, 84);
  const gr = g.createLinearGradient(0, 30, 0, 130); gr.addColorStop(0, "#fff0b0"); gr.addColorStop(0.5, "#e2b448"); gr.addColorStop(1, "#a8761e"); g.fillStyle = gr; g.fillText(word, 384, 84);
});
/** a black-and-white ONE WAY street sign (arrow plate) */
export const oneWayTex = () => ptex("sxOneWay", 512, 170, (g) => {
  g.fillStyle = "#16161a"; g.fillRect(0, 0, 512, 170); g.fillStyle = "#f4f2ea";
  poly(g, [[30, 58], [372, 58], [372, 22], [486, 85], [372, 148], [372, 112], [30, 112]]); g.fill();
  const fam = '"Arial Black", Arial, sans-serif', px = fitPx(g, ["ONE WAY"], fam, 300, 46, 1); g.font = `bold ${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#16161a"; g.fillText("ONE WAY", 200, 86);
});
/** dressed slate stone (tiles): blue-grey ashlar courses with joints, colour per block, weather streaks */
export const slateStoneTex = () => ptex("sxSlateStone", 512, 512, (g, r) => {
  g.fillStyle = "#5c6476"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) { const y = row * 64, off = (row % 2) * 64;
    for (let x = -off; x < 512; x += 128) { const c = jit(r, "#7d8698", 0.09, 4, 0.12); wrapX(512, x + 3, 122, (X) => { g.fillStyle = c; g.fillRect(X, y + 3, 122, 58); }); }
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(0, y + 3, 512, 2); }
  for (let i = 0; i < 60; i++) blotch(g, r() * 512, r() * 512, 20 + 40 * r(), 1, r() < 0.5 ? "40,46,60" : "200,206,220", 0.08);
  for (let i = 0; i < 30; i++) { const x = r() * 512, y = r() * 300, L = 80 + 200 * r(); const gr = g.createLinearGradient(0, y, 0, y + L); gr.addColorStop(0, "rgba(40,44,56,0.2)"); gr.addColorStop(1, "rgba(40,44,56,0)"); g.fillStyle = gr; g.fillRect(x, y, 3 + 5 * r(), L); }
});
/** painted road marking "SLOW" (alpha), stretched along the driving direction, worn */
export const slowTex = () => ptex("sxSlow", 512, 1024, (g, r) => {
  g.clearRect(0, 0, 512, 1024);
  g.save(); g.translate(256, 512); g.scale(1, 2.6); g.font = 'bold 150px "Arial Black", Arial, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(244,236,206,0.92)"; g.fillText("SLOW", 0, 0); g.restore();
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + 0.6 * r()})`; g.beginPath(); g.ellipse(r() * 512, r() * 1024, 2 + 6 * r(), 1.5 + 4 * r(), r() * 3, 0, TAU); g.fill(); }
  for (const y of [400, 610]) { g.fillStyle = "rgba(0,0,0,0.8)"; g.fillRect(0, y, 512, 5); }
  g.globalCompositeOperation = "source-over";
});
/** a pair of tyre tracks (alpha): two dark tread bands (u across, v along) */
export const tyreTrackTex = () => ptex("sxTyre", 256, 512, (g, r) => {
  g.clearRect(0, 0, 256, 512);
  for (const x of [40, 184]) { g.fillStyle = "rgba(40,32,30,0.32)"; g.fillRect(x, 0, 34, 512); g.fillStyle = "rgba(30,24,22,0.35)"; for (let y = 0; y < 512; y += 12) g.fillRect(x + 4, y, 26, 4);
    for (let i = 0; i < 40; i++) blotch(g, x + 17, r() * 512, 10 + 12 * r(), 1, "40,32,30", 0.12); }
});
/** a cast-iron drain grate (opaque): slots, a rim, rust */
export const drainTex = () => ptex("sxDrain", 256, 256, (g, r) => {
  g.fillStyle = "#4a4646"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#2a2626"; g.fillRect(14, 14, 228, 228);
  for (let x = 30; x < 226; x += 24) { g.fillStyle = "#121012"; g.fillRect(x, 30, 12, 196); g.fillStyle = "#5e5856"; g.fillRect(x + 12, 30, 12, 196); }
  for (let i = 0; i < 14; i++) blotch(g, r() * 256, r() * 256, 10 + 20 * r(), 1, "140,70,36", 0.3);
});
/** a wet sidewalk patch (alpha): dark water with vertical streak reflections of the board above (red = the dropped arrows) */
export const wetPatchTex = (rgb: string) => ptex("sxWetPatch" + rgb, 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  const lobes = Array.from({ length: 5 }, () => [256 + (r() - 0.5) * 200, 256 + (r() - 0.5) * 180, 90 + 60 * r()]);
  const shape = () => { g.beginPath(); lobes.forEach(([x, y, rad]) => { g.moveTo(x + rad, y); g.ellipse(x, y, rad, rad * 0.8, 0, 0, TAU); }); };
  g.save(); g.filter = "blur(10px)"; g.fillStyle = "rgba(40,44,60,0.6)"; shape(); g.fill(); g.restore();
  g.save(); shape(); g.clip();
  for (const x of [150, 256, 362]) { const gr = g.createLinearGradient(0, 40, 0, 470); const c = rgb; gr.addColorStop(0, `rgba(${c},0.0)`); gr.addColorStop(0.25, `rgba(${c},0.75)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(x - 26, 40, 52, 430); for (let y = 60; y < 470; y += 18) { g.fillStyle = "rgba(40,44,60,0.35)"; g.fillRect(x - 30, y, 60, 3); } }
  g.fillStyle = "rgba(220,228,240,0.25)"; g.fillRect(0, 200, 512, 6);
  g.restore();
});
/** a 1960s sedan side silhouette for a shop-window reflection (alpha, dark with chrome glints) */
export const carSilTex = () => ptex("sxCarSil", 512, 192, (g) => {
  g.clearRect(0, 0, 512, 192); g.fillStyle = "rgba(24,30,44,1)";
  g.beginPath(); g.moveTo(20, 140); g.lineTo(30, 100); g.lineTo(130, 92); g.lineTo(178, 50); g.lineTo(330, 48); g.lineTo(380, 92); g.lineTo(480, 98); g.lineTo(500, 112); g.lineTo(496, 140); g.closePath(); g.fill();
  for (const x of [120, 400]) { g.beginPath(); g.arc(x, 142, 30, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(220,228,240,0.9)"; g.fillRect(30, 118, 466, 5); g.fillStyle = "rgba(120,140,170,0.7)"; poly(g, [[190, 58], [320, 56], [360, 90], [160, 90]]); g.fill();
});
/** a soft contact-shadow ellipse (white on alpha: tinted by the material) */
export const aoTex = () => ptex("sxAO", 256, 128, (g) => {
  g.clearRect(0, 0, 256, 128); g.save(); g.translate(128, 64); g.scale(1, 0.5);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 126); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(255,255,255,0.65)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(-128, -128, 256, 256); g.restore();
});
/** a soaked, crumpled newspaper sheet (darkened newsprint, illegible) */
export const wetPaperTex = () => ptex("sxWetPaper", 512, 384, (g, r) => {
  g.fillStyle = "#a8a498"; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "#2a2a2a"; g.fillRect(20, 18, 472, 22); g.fillStyle = "rgba(40,40,40,0.4)"; g.fillRect(20, 56, 200, 120);
  g.fillStyle = "rgba(30,30,30,0.4)"; for (let c = 0; c < 4; c++) for (let k = 0; k < 20; k++) { const x = 20 + c * 120, y = (c === 0 ? 190 : 56) + k * 14; if (y < 370) g.fillRect(x, y, 100 * (0.6 + 0.4 * r()), 5); }
  for (let i = 0; i < 30; i++) blotch(g, r() * 512, r() * 384, 20 + 50 * r(), 1.2, "60,66,84", 0.22);
});
/** a herring gull standing on a rail (side view, alpha): white head and body, grey back, black tail tip, yellow bill */
export const gullPerchTex = () => ptex("sxGullPerch", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.lineJoin = "round"; g.strokeStyle = "#3a3a48"; g.lineWidth = 5;
  g.strokeStyle = "#e08a7a"; g.lineWidth = 5; g.beginPath(); g.moveTo(120, 190); g.lineTo(116, 236); g.moveTo(140, 190); g.lineTo(142, 236); g.stroke();
  g.strokeStyle = "#3a3a48"; g.lineWidth = 5;
  g.fillStyle = "#fbfbf8"; g.beginPath(); g.ellipse(132, 160, 56, 34, -0.12, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#aeb4c0"; g.beginPath(); g.moveTo(96, 146); g.quadraticCurveTo(150, 128, 214, 150); g.lineTo(226, 170); g.quadraticCurveTo(160, 186, 104, 170); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#1e1e26"; g.beginPath(); g.moveTo(206, 152); g.lineTo(236, 162); g.lineTo(222, 176); g.closePath(); g.fill();
  g.fillStyle = "#fbfbf8"; g.beginPath(); g.arc(84, 112, 24, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#f2c230"; g.beginPath(); g.moveTo(62, 110); g.lineTo(30, 116); g.lineTo(62, 122); g.closePath(); g.fill(); g.fillStyle = "#c8261e"; g.beginPath(); g.arc(40, 118, 3, 0, TAU); g.fill();
  g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(78, 106, 4, 0, TAU); g.fill();
});

// =====================================================================================================================
// WORLD-EXT fix round 2 (audit A2, 2026-11-14): the '90' on the tape, legible roof props for the loop frame (a logbook, a
// spare reel), oily boot prints, street gutter dressing (manhole, leaves, butts), a shop clerk, lace curtains, geraniums,
// a falling feather, a VEG OIL drum stencil.
// =====================================================================================================================
/** the tape's '90' graduation (opaque yellow tape patch, a bold red 90 across it, black ticks): the 'Ninety percent full!'
 *  callback right above the oil line in the loop frame */
export const tape90Tex = () => ptex("sxTape90b", 128, 256, (g) => {
  g.fillStyle = "#f2c230"; g.fillRect(0, 0, 128, 256);
  g.fillStyle = "#1e1a16"; for (let y = 4; y < 256; y += 32) g.fillRect(0, y, y % 64 === 4 ? 70 : 40, 7);
  g.save(); g.translate(70, 128); g.rotate(Math.PI / 2); g.font = 'bold 118px "Arial Black", Arial, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#c8261e"; g.fillText("90", 0, 6); g.restore();
  g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(116, 0, 6, 256);
});
/** an open logbook seen from above (opaque): two cream pages, a spine shadow, ruled lines, pencil tallies + squiggles */
export const logbookTex = () => ptex("sxLogbook", 512, 352, (g, r) => {
  g.fillStyle = "#3a5a7a"; g.fillRect(0, 0, 512, 352);
  for (const x0 of [14, 262]) { g.fillStyle = "#f4ecd8"; g.fillRect(x0, 12, 236, 328);
    g.fillStyle = "rgba(90,120,170,0.45)"; for (let y = 52; y < 330; y += 22) g.fillRect(x0 + 10, y, 216, 2);
    g.fillStyle = "rgba(200,60,60,0.45)"; g.fillRect(x0 + 34, 20, 2, 312);
    g.strokeStyle = "rgba(50,46,52,0.75)"; g.lineWidth = 3; g.lineCap = "round";
    for (let y = 48; y < 320; y += 22) { if (r() < 0.25) continue; let x = x0 + 42; g.beginPath(); g.moveTo(x, y);
      const end = x0 + 60 + 150 * r(); while (x < end) { x += 6 + 6 * r(); g.lineTo(x, y - 5 * r()); } g.stroke();
      if (r() < 0.5) for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(end + 14 + k * 9, y - 12); g.lineTo(end + 12 + k * 9, y + 1); g.stroke(); } } }
  const gr = g.createLinearGradient(236, 0, 276, 0); gr.addColorStop(0, "rgba(60,40,30,0)"); gr.addColorStop(0.5, "rgba(60,40,30,0.45)"); gr.addColorStop(1, "rgba(60,40,30,0)"); g.fillStyle = gr; g.fillRect(236, 12, 40, 328);
});
/** a spare tape reel lying flat, seen from above (alpha disc): red flange, 4 dark spokes, the yellow coil, a hub */
export const reelTopTex = () => ptex("sxReelTop", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = "#b8472e"; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill();
  g.fillStyle = "#f2c230"; g.beginPath(); g.arc(128, 128, 92, 0, TAU); g.fill();
  g.strokeStyle = "rgba(120,80,20,0.6)"; g.lineWidth = 2; for (let rr0 = 50; rr0 < 92; rr0 += 6) { g.beginPath(); g.arc(128, 128, rr0, 0, TAU); g.stroke(); }
  g.fillStyle = "#b8472e"; g.beginPath(); g.arc(128, 128, 48, 0, TAU); g.fill();
  g.fillStyle = "#5a1e14"; for (let k = 0; k < 4; k++) { g.save(); g.translate(128, 128); g.rotate((k * Math.PI) / 2 + 0.4); g.fillRect(-9, -118, 18, 70); g.restore(); }
  g.strokeStyle = "#2c1e2a"; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 123, 0, TAU); g.stroke();
  g.fillStyle = "#3a3030"; g.beginPath(); g.arc(128, 128, 20, 0, TAU); g.fill();
  g.fillStyle = "#e8d8b0"; g.beginPath(); g.arc(128, 128, 8, 0, TAU); g.fill();
});
/** oily boot prints (alpha, dark brown): a walking trail along v (left / right staggered), fading */
export const footprintTex = () => ptex("sxBootPrints", 256, 1024, (g, r) => {
  g.clearRect(0, 0, 256, 1024);
  for (let k = 0; k < 7; k++) { const left = k % 2 === 0, x = left ? 88 : 168, y = 70 + k * 140, a = 0.5 * (1 - k / 9);
    g.save(); g.translate(x, y); g.rotate((left ? -0.08 : 0.08) + (r() - 0.5) * 0.1);
    g.fillStyle = `rgba(62,38,16,${a})`; g.beginPath(); g.ellipse(0, -18, 22, 34, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, 36, 18, 20, 0, 0, TAU); g.fill();
    g.fillStyle = `rgba(30,18,8,${a * 0.6})`; for (let i = -2; i <= 2; i++) g.fillRect(-18, -40 + i * 12, 36, 4);
    g.restore(); }
});
/** a cast-iron manhole cover (opaque round): a waffle grid, a rim, rust, a wet sheen */
export const manholeTex = () => ptex("sxManhole", 256, 256, (g, r) => {
  g.fillStyle = "#3e3c3e"; g.fillRect(0, 0, 256, 256);
  g.save(); g.beginPath(); g.arc(128, 128, 118, 0, TAU); g.clip();
  g.fillStyle = "#4c4a4c"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#2a282a"; g.lineWidth = 5; for (let k = 20; k < 256; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); }
  for (let i = 0; i < 12; i++) blotch(g, r() * 256, r() * 256, 10 + 24 * r(), 1.2, "130,70,36", 0.28);
  g.fillStyle = "rgba(200,210,226,0.18)"; g.beginPath(); g.ellipse(100, 90, 60, 26, -0.5, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = "#232123"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 118, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(170,166,160,0.5)"; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 124, 0, TAU); g.stroke();
});
/** gutter litter (alpha): fallen leaves (ochre / rust / olive), cigarette butts, a bottle cap, grit */
export const gutterLitterTex = () => ptex("sxGutterLitter", 1024, 256, (g, r) => {
  g.clearRect(0, 0, 1024, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "70,64,58" : "150,140,128"},${0.25 + 0.3 * r()})`; g.fillRect(r() * 1024, 150 + r() * 100, 2 + 3 * r(), 2 + 2 * r()); }
  for (let i = 0; i < 34; i++) { const x = r() * 1000 + 12, y = 60 + r() * 180, s = 9 + 12 * r();
    g.save(); g.translate(x, y); g.rotate(r() * TAU); g.fillStyle = pick(r, ["#c88a2e", "#a8502a", "#8a7a32", "#d8a040", "#7a4a26"]);
    g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.8, 0, 0, s); g.quadraticCurveTo(-s * 0.8, 0, 0, -s); g.fill();
    g.strokeStyle = "rgba(60,30,14,0.6)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -s); g.lineTo(0, s); g.stroke(); g.restore(); }
  for (let i = 0; i < 9; i++) { const x = 40 + r() * 950, y = 120 + r() * 110, a = r() * TAU; g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = "#efe8da"; g.fillRect(-11, -3, 16, 6); g.fillStyle = "#d89a52"; g.fillRect(5, -3, 7, 6); g.restore(); }
  g.fillStyle = "#c8a24a"; g.beginPath(); g.arc(610, 200, 7, 0, TAU); g.fill(); g.strokeStyle = "#6a5020"; g.lineWidth = 2; g.stroke();
});
/** a warm-backlit shop clerk silhouette (alpha): a rounded head, a body, one arm reaching up to a shelf, an apron */
export const clerkTex = () => ptex("sxClerk", 256, 512, (g) => {
  g.clearRect(0, 0, 256, 512); g.fillStyle = "rgba(92,52,30,0.85)";
  g.beginPath(); g.arc(128, 96, 54, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(128, 300, 82, 150, 0, 0, TAU); g.fill();
  g.lineCap = "round"; g.strokeStyle = "rgba(92,52,30,0.85)"; g.lineWidth = 22; g.beginPath(); g.moveTo(70, 230); g.lineTo(40, 140); g.stroke();
  g.fillStyle = "rgba(240,226,200,0.35)"; g.fillRect(84, 220, 88, 220);
});
/** a lace half-curtain for an upper window (alpha): cream lace with a scalloped hem and a little pattern */
export const curtainTex = () => ptex("sxCurtain", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = "rgba(244,236,218,0.92)"; g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 0); g.lineTo(256, 210);
  for (let x = 256; x > 0; x -= 32) g.quadraticCurveTo(x - 16, 240, x - 32, 210);
  g.closePath(); g.fill();
  g.strokeStyle = "rgba(190,176,150,0.6)"; g.lineWidth = 2; for (let x = 16; x < 256; x += 32) for (let y = 20; y < 200; y += 32) { g.beginPath(); g.arc(x, y, 8, 0, TAU); g.stroke(); }
  g.fillStyle = "rgba(170,150,120,0.35)"; for (let x = 0; x < 256; x += 21) g.fillRect(x, 0, 3, 210);
});
/** red geraniums in a window box (alpha): green leaf blobs + red flower clusters */
export const geraniumTex = () => ptex("sxGeranium", 512, 192, (g, r) => {
  g.clearRect(0, 0, 512, 192);
  for (let i = 0; i < 46; i++) { const x = 20 + r() * 472, y = 100 + r() * 80, s = 18 + 16 * r(); g.fillStyle = pick(r, ["#3f6e32", "#4f8a3a", "#36602c"]); g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
  for (let i = 0; i < 16; i++) { const x = 30 + r() * 452, y = 30 + r() * 70; for (let k = 0; k < 7; k++) { g.fillStyle = pick(r, ["#d8322a", "#e8483a", "#b82420"]); g.beginPath(); g.arc(x + (r() - 0.5) * 34, y + (r() - 0.5) * 28, 9 + 6 * r(), 0, TAU); g.fill(); } }
});
/** a small white feather (alpha) */
export const featherTex = () => ptex("sxFeather", 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128); g.save(); g.translate(64, 64); g.rotate(-0.6);
  g.fillStyle = "#f6f4f0"; g.beginPath(); g.ellipse(0, 0, 14, 44, 0, 0, TAU); g.fill();
  g.strokeStyle = "#8a8a96"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -46); g.lineTo(0, 54); g.stroke();
  g.strokeStyle = "rgba(140,140,150,0.6)"; g.lineWidth = 1.2; for (let y = -36; y < 40; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(-12, y - 6); g.moveTo(0, y); g.lineTo(12, y - 6); g.stroke(); }
  g.restore();
});
/** a stencilled "VEG OIL" band for drums (alpha, cream): plain stencil letters, no mark */
export const vegOilStencilTex = () => ptex("sxVegOil", 512, 128, (g, r) => {
  g.clearRect(0, 0, 512, 128);
  g.font = 'bold 84px "Arial Black", Arial, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(240,234,214,0.92)"; g.fillText("VEG OIL", 256, 68);
  g.globalCompositeOperation = "destination-out"; for (let x = 30; x < 512; x += 44) g.fillRect(x, 0, 4, 128);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + 0.6 * r()})`; g.fillRect(r() * 512, r() * 128, 1 + 3 * r(), 1 + 3 * r()); }
  g.globalCompositeOperation = "source-over";
});
/** a soft-edged honey sun patch (white, alpha; tinted by the material): an irregular warm splash of light */
export const sunPatchTex = () => ptex("sxSunPatch", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.save(); g.filter = "blur(10px)"; g.fillStyle = "rgba(255,255,255,1)";
  g.beginPath(); g.moveTo(40, 120); g.quadraticCurveTo(60, 40, 150, 50); g.quadraticCurveTo(230, 60, 214, 140); g.quadraticCurveTo(200, 214, 120, 206); g.quadraticCurveTo(30, 200, 40, 120); g.fill(); g.restore();
});
/** the firm's transom lettering "ALLIED" (alpha): big gold-leaf serif capitals with a dark keyline, filling the canvas */
export const alliedTransomTex = () => ptex("sxAlliedTransom", 768, 230, (g) => {
  g.clearRect(0, 0, 768, 230);
  const fam = '"Times New Roman", Georgia, serif', px = fitPx(g, ["ALLIED"], fam, 744, 230, 1);
  g.font = `bold ${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 10; g.strokeStyle = "rgba(40,24,10,0.95)"; g.strokeText("ALLIED", 384, 122);
  const gr = g.createLinearGradient(0, 40, 0, 200); gr.addColorStop(0, "#fff2b8"); gr.addColorStop(0.5, "#e6b84a"); gr.addColorStop(1, "#a8761e"); g.fillStyle = gr; g.fillText("ALLIED", 384, 122);
});

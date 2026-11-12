// Hand-painted look textures drawn on canvases (cached): grass, cobbles, stone courses, deck planks, water,
// river bed, roof tiles, bricks, plaster facades with windows/doors/timber frames, iron chain links.
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
const hexA = (hex: string, a: number) => { const c = new THREE.Color(hex); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`; };
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

/** Desert floor: 2048 px = 4 m (512 texels / m). Red-tan sand #C98E62 / #D7A57A, darker grit, pale gravel, pebbles,
 *  wind ripples, a few dried-mud crack patches and tiny rainbow chips. */
export const sandHD = () => ptex("atSandHD", 2048, 2048, (g, r) => {
  const S = 2048;
  g.fillStyle = "#d09c6e"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) { // broad soft tone patches
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 150, 520), k = r(), a = U(r, 0.16, 0.3);
    const rgb = k < 0.4 ? "226,182,136" : k < 0.78 ? "180,118,78" : "196,140,118";
    wrap2(S, S, x, y, rad * 1.5, (xx, yy) => blotch(g, xx, yy, rad, 1.5, rgb, a));
  }
  g.lineCap = "round";
  for (let i = 0; i < 90; i++) { // wind ripples: long faint light / dark arcs
    const x = U(r, 0, S), y = U(r, 0, S), len = U(r, 120, 380), sag = U(r, -14, 14), lw = U(r, 2, 4.5);
    wrap2(S, S, x, y, len, (xx, yy) => {
      g.strokeStyle = "rgba(238,204,162,0.28)"; g.lineWidth = lw;
      g.beginPath(); g.moveTo(xx - len / 2, yy); g.quadraticCurveTo(xx, yy + sag, xx + len / 2, yy); g.stroke();
      g.strokeStyle = "rgba(150,96,62,0.16)"; g.lineWidth = lw * 0.8;
      g.beginPath(); g.moveTo(xx - len / 2, yy + lw * 1.6); g.quadraticCurveTo(xx, yy + sag + lw * 1.6, xx + len / 2, yy + lw * 1.6); g.stroke();
    });
  }
  for (let i = 0; i < 7; i++) { // dried-mud crack patches
    const cx = U(r, 0, S), cy = U(r, 0, S), R0 = U(r, 120, 230), pts: [number, number][] = [];
    for (let k = 0; k < 34; k++) { const a = r() * TAU, d = Math.sqrt(r()) * R0; pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
    const segs: [number, number, number, number, number, number, number][] = [];
    for (const p of pts) {
      const nb = pts.filter((q) => q !== p).sort((a, b) => Math.hypot(a[0] - p[0], a[1] - p[1]) - Math.hypot(b[0] - p[0], b[1] - p[1])).slice(0, 3);
      for (const q of nb) segs.push([p[0], p[1], q[0], q[1], 1 - Math.min(1, Math.hypot(p[0] - cx, p[1] - cy) / R0), U(r, -6, 6), U(r, -6, 6)]);
    }
    for (const [x0, y0, x1, y1, w, jx, jy] of segs) {
      const mx = (x0 + x1) / 2 + jx, my = (y0 + y1) / 2 + jy;
      wrap2(S, S, mx, my, 120, (xx, yy) => {
        const ox = xx - mx, oy = yy - my;
        g.strokeStyle = `rgba(118,70,44,${0.5 * w})`; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(x0 + ox, y0 + oy); g.lineTo(mx + ox, my + oy); g.lineTo(x1 + ox, y1 + oy); g.stroke();
        g.strokeStyle = `rgba(246,214,176,${0.35 * w})`; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x0 + ox + 1.5, y0 + oy + 1.8); g.lineTo(mx + ox + 1.5, my + oy + 1.8); g.lineTo(x1 + ox + 1.5, y1 + oy + 1.8); g.stroke();
      });
    }
  }
  for (let i = 0; i < 16000; i++) { // grit
    const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 0.8, 2.6), k = r();
    g.fillStyle = k < 0.45 ? "rgba(140,88,56,0.45)" : k < 0.8 ? "rgba(240,206,166,0.5)" : "rgba(110,80,92,0.35)";
    g.fillRect(x, y, s, s * U(r, 0.6, 1));
  }
  const PEB = ["#e7d6bc", "#d8c3a6", "#c9b49a", "#b9a08a", "#e9dccb", "#c98a6a", "#a88a7a"];
  for (let i = 0; i < 900; i++) { // gravel + pebbles
    const x = U(r, 0, S), y = U(r, 0, S), big = r() < 0.12, rx = big ? U(r, 7, 15) : U(r, 2.2, 5.5), ry = rx * U(r, 0.55, 0.85), rot = U(r, -0.6, 0.6), c = pick(r, PEB);
    wrap2(S, S, x, y, rx * 2, (xx, yy) => pebbleDab(g, xx, yy, rx, ry, rot, c));
  }
  const CH = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8", "#b85a6a"];
  for (let i = 0; i < 70; i++) { // tiny angular rainbow chips
    const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 3, 7), c = pick(r, CH), a0 = r() * TAU;
    const pts = Array.from({ length: 5 }, (_, k) => [Math.cos(a0 + (k * TAU) / 5) * s * U(r, 0.6, 1.2), Math.sin(a0 + (k * TAU) / 5) * s * U(r, 0.5, 1)]);
    wrap2(S, S, x, y, 12, (xx, yy) => {
      g.fillStyle = "rgba(92,70,110,0.3)"; poly(g, pts, xx + 1.5, yy + 2); g.fill();
      g.fillStyle = c; poly(g, pts, xx, yy); g.fill();
      g.fillStyle = "rgba(255,245,230,0.5)"; g.fillRect(xx - s * 0.3, yy - s * 0.3, s * 0.35, s * 0.25);
    });
  }
  for (let i = 0; i < 80; i++) { // dry twigs
    const x = U(r, 0, S), y = U(r, 0, S), len = U(r, 10, 26), a = r() * TAU, b = a + U(r, -0.5, 0.5);
    wrap2(S, S, x, y, 30, (xx, yy) => {
      g.strokeStyle = "rgba(108,74,48,0.6)"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + Math.cos(a) * len, yy + Math.sin(a) * len); g.lineTo(xx + Math.cos(a) * len + Math.cos(b) * len * 0.4, yy + Math.sin(a) * len + Math.sin(b) * len * 0.4); g.stroke();
    });
  }
});

export type Band = [string, number]; // colour, thickness in metres
/** Badlands / mesa strata: 1024 px around (u) x 2048 px tall (v: H metres, ground at the bottom). Wavy, seamless band
 *  edges, fine strata, popcorn-clay speckle, erosion rills (vertical streaks) and a sandy talus foot. */
export const strataHD = (key: string, bands: Band[], H: number, foot = "#c99a73") => ptex("atStrata" + key, 1024, 2048, (g, r) => {
  const W = 1024, HP = 2048, pm = HP / H;
  type Edge = { y: number; a1: number; k1: number; p1: number; a2: number; k2: number; p2: number };
  const edges: Edge[] = [];
  let acc = 0;
  for (const [, t] of bands) { acc += t; edges.push({ y: acc * pm, a1: U(r, 4, 16), k1: 1 + Math.floor(r() * 3), p1: r(), a2: U(r, 2, 7), k2: 4 + Math.floor(r() * 5), p2: r() }); }
  const off = (e: Edge, x: number) => e.a1 * Math.sin(TAU * (e.k1 * x / W + e.p1)) + e.a2 * Math.sin(TAU * (e.k2 * x / W + e.p2));
  for (let x = 0; x < W; x += 2) {
    let prev = 0;
    for (let i = 0; i < bands.length; i++) {
      const top = edges[i].y + off(edges[i], x);
      g.fillStyle = bands[i][0];
      g.fillRect(x, HP - top, 2, top - prev + 1);
      prev = top;
    }
    g.fillStyle = bands[bands.length - 1][0]; g.fillRect(x, 0, 2, HP - prev + 1);
  }
  for (let i = 0; i < bands.length; i++) { // fine strata inside every band
    const lo = i ? edges[i - 1] : null, hiY = edges[i].y, loY = lo ? lo.y : 0, n = Math.max(1, Math.floor((hiY - loY) / 14));
    for (let k = 1; k < n; k++) {
      const f = k / n, light = r() < 0.5, a = U(r, 0.05, 0.12);
      g.strokeStyle = light ? `rgba(255,248,240,${a})` : `rgba(60,40,70,${a})`; g.lineWidth = U(r, 1.5, 3);
      g.beginPath();
      for (let x = 0; x <= W; x += 16) { const y = HP - (loY + (hiY - loY) * f + (lo ? off(lo, x) : 0) * (1 - f) + off(edges[i], x) * f); if (x) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
  }
  const footTop = 1.2 * pm; // sandy talus foot washing up in tongues
  for (let x = 0; x < W; x += 2) {
    const h = footTop * (0.55 + 0.45 * Math.sin(TAU * (3 * x / W)) * Math.sin(TAU * (7 * x / W + 0.3)) ** 2);
    const gr = g.createLinearGradient(0, HP, 0, HP - h * 1.6);
    gr.addColorStop(0, foot); gr.addColorStop(0.6, hexA(foot, 0.75)); gr.addColorStop(1, hexA(foot, 0));
    g.fillStyle = gr; g.fillRect(x, HP - h * 1.6, 2, h * 1.6);
  }
  for (let i = 0; i < 260; i++) { // erosion rills: dark groove + light lip, fading downwards
    const x = U(r, 0, W), y0 = U(r, 0, HP * 0.95), len = U(r, 60, 420), w = U(r, 2, 7), dark = r() < 0.62, a = U(r, 0.1, 0.22);
    wrapX(W, x - w, w * 3, (xx) => {
      const gr = g.createLinearGradient(0, y0, 0, y0 + len);
      gr.addColorStop(0, dark ? `rgba(70,48,80,${a})` : `rgba(255,246,236,${a})`); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(xx + w, y0, w, len);
      if (dark) { g.fillStyle = `rgba(255,246,236,${a * 0.6})`; g.fillRect(xx + w * 2, y0, Math.max(1, w * 0.4), len * 0.8); }
    });
  }
  for (let i = 0; i < 18000; i++) { // popcorn-clay speckle (fine, so it never reads as crinkled paper)
    const x = U(r, 0, W), y = U(r, 0, HP), s = U(r, 1, 2.2), d = r() < 0.5;
    g.fillStyle = d ? "rgba(70,50,80,0.1)" : "rgba(255,250,244,0.12)"; g.fillRect(x, y, s, s);
  }
  for (let i = 0; i < 12; i++) {
    const x = U(r, 0, W), y = U(r, 0, HP), rad = U(r, 60, 180), d = r() < 0.5, a = U(r, 0.03, 0.06);
    wrap2(W, HP, x, y, rad * 1.6, (xx, yy) => blotch(g, xx, yy, rad, 1.6, d ? "70,50,80" : "255,246,236", a));
  }
});
/** Blue Mesa style badlands, 36 m of strata (lavender / grey-blue / slate / cream / rust) */
export const BADLAND_BANDS: Band[] = [ // Blue Mesa: grey-blue / slate / lavender clays with cream ash beds, thin rust
  ["#b9907a", 0.8], ["#8fa3c4", 1.6], ["#e6d6c0", 0.5], ["#9c8ab8", 1.8], ["#6f7fa6", 1.9], ["#ddcbb4", 0.4], ["#8fa3c4", 2.0],
  ["#a493bd", 1.3], ["#b06a56", 0.45], ["#7d8fb5", 2.3], ["#e6d6c0", 0.55], ["#9888b4", 1.7], ["#6f7fa6", 1.8], ["#c08070", 0.5],
  ["#a6b4cf", 2.1], ["#e2d0bb", 0.6], ["#8e7fb0", 2.0], ["#7383a8", 2.0], ["#b9735a", 0.5], ["#9fb0cc", 2.4], ["#e6d6c0", 0.7],
  ["#9a8ab6", 2.2], ["#6f7fa6", 2.0], ["#8fa3c4", 1.8],
];
/** Blue Mesa dome clays (audit A2): wide wavy band edges (2-3 harmonics), fine inner strata, mottled popcorn clay;
 *  NO painted vertical rills (the rills are carved in the geometry, painted ones crossed the bands into plaid).
 *  1024 px around (u) x 2048 px tall (v = H units). */
export const domeStrataHD = (key: string, bands: Band[], H: number) => ptex("atDome" + key, 1024, 2048, (g, r) => {
  const W = 1024, HP = 2048, pm = HP / H;
  type Edge = { y: number; a: number[]; k: number[]; p: number[] };
  const edges: Edge[] = [];
  let acc = 0;
  for (const [, t] of bands) { acc += t; edges.push({ y: acc * pm, a: [U(r, 6, 22), U(r, 3, 9), U(r, 1, 4)], k: [1 + Math.floor(r() * 2), 3 + Math.floor(r() * 3), 9 + Math.floor(r() * 6)], p: [r(), r(), r()] }); }
  const off = (e: Edge, x: number) => e.a[0] * Math.sin(TAU * (e.k[0] * x / W + e.p[0])) + e.a[1] * Math.sin(TAU * (e.k[1] * x / W + e.p[1])) + e.a[2] * Math.sin(TAU * (e.k[2] * x / W + e.p[2]));
  for (let x = 0; x < W; x += 2) {
    let prev = 0;
    for (let i = 0; i < bands.length; i++) { const top = edges[i].y + off(edges[i], x); g.fillStyle = bands[i][0]; g.fillRect(x, HP - top, 2, top - prev + 1); prev = top; }
    g.fillStyle = bands[bands.length - 1][0]; g.fillRect(x, 0, 2, HP - prev + 1);
  }
  for (let i = 0; i < bands.length; i++) { // soft blended edges: a 50 % mix strip along each boundary, then fine strata
    const lo = i ? edges[i - 1] : null, hiY = edges[i].y, loY = lo ? lo.y : 0, n = Math.max(1, Math.floor((hiY - loY) / 16));
    for (let k = 1; k < n; k++) {
      const f = k / n, light = r() < 0.5, a = U(r, 0.04, 0.1);
      g.strokeStyle = light ? `rgba(255,248,240,${a})` : `rgba(60,40,70,${a})`; g.lineWidth = U(r, 1.5, 3.5);
      g.beginPath();
      for (let x = 0; x <= W; x += 16) { const y = HP - (loY + (hiY - loY) * f + (lo ? off(lo, x) : 0) * (1 - f) + off(edges[i], x) * f); if (x) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
    if (i < bands.length - 1) { g.strokeStyle = hexA(bands[i + 1][0], 0.45); g.lineWidth = 5; g.beginPath();
      for (let x = 0; x <= W; x += 8) { const y = HP - (hiY + off(edges[i], x)) + 2; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  }
  for (let i = 0; i < 26; i++) { const x = U(r, 0, W), y = U(r, 0, HP), rad = U(r, 50, 160), d = r() < 0.5, a = U(r, 0.04, 0.08); // mottling
    wrap2(W, HP, x, y, rad * 1.6, (xx, yy) => blotch(g, xx, yy, rad, 2.2, d ? "70,50,80" : "255,246,236", a)); }
  for (let i = 0; i < 26000; i++) { // popcorn-clay speckle (fine)
    const x = U(r, 0, W), y = U(r, 0, HP), s = U(r, 1, 2.4), d = r() < 0.5;
    g.fillStyle = d ? "rgba(70,50,80,0.11)" : "rgba(255,250,244,0.13)"; g.fillRect(x, y, s, s);
  }
});
/** audit A3 P1 (domes read as circus tents / beach umbrellas / tartan): the band colour is a function of HEIGHT ONLY.
 *  Every band edge is a straight horizontal line across the whole u range (no azimuth term at all), soft 6 px blends at
 *  the boundaries, straight fine strata inside the bands, mottling + popcorn speckle (noise, never stripes).
 *  1024 px around (u) x 2048 px tall (v = H metres). */
export const BADLAND_BANDS2: Band[] = [ // Blue Mesa: bold lavender / grey-blue / slate clays, cream ash beds, rust; 0.6-2.5 m thick
  ["#b9907a", 0.9], ["#8fa3c4", 1.7], ["#e6d6c0", 0.7], ["#9c8ab8", 1.9], ["#6f7fa6", 2.0], ["#e2d0bb", 0.6], ["#8fa3c4", 2.1],
  ["#a493bd", 1.4], ["#b9735a", 0.7], ["#7d8fb5", 2.3], ["#e6d6c0", 0.8], ["#9888b4", 1.8], ["#6f7fa6", 1.9], ["#c08070", 0.6],
  ["#a6b4cf", 2.2], ["#e2d0bb", 0.7], ["#8e7fb0", 2.1], ["#7383a8", 2.0], ["#b9735a", 0.6], ["#9fb0cc", 2.5], ["#e6d6c0", 0.8],
  ["#9c8ab8", 2.2], ["#6f7fa6", 2.0],
];
/** audit A4 P2 (domes read as striped candy / beach balls): Blue Mesa strata at ~35 % less contrast (cream -> #D9CCD6,
 *  rust -> #A9788A, slate lifted toward the mean), thicknesses 0.4-3 m, three thin dark-slate marker beds, a pinkish
 *  tan base and pale grey-blue ash beds. Bottom up, metres (the 36 m texture repeats). */
export const BADLAND_BANDS3: Band[] = [
  ["#ae9290", 0.9], ["#93a2c2", 1.6], ["#c8bccb", 0.45], ["#9e8fba", 2.6], ["#68718e", 0.4], ["#7c88ab", 1.8], ["#c6b9c6", 0.4],
  ["#93a2c2", 2.9], ["#a492bf", 1.1], ["#a57c8c", 0.7], ["#8290b2", 2.2], ["#cabdca", 0.5], ["#9888b4", 1.5], ["#6a7390", 0.5],
  ["#9eaac6", 3.0], ["#ab8792", 0.45], ["#8e80b0", 2.0], ["#7c88ab", 1.3], ["#c6b9c6", 0.4], ["#9aaac8", 2.4], ["#a57c8c", 0.6],
  ["#9c8ab8", 1.9], ["#69718d", 0.4], ["#7e8aac", 2.2], ["#b29ca6", 1.3], ["#93a2c2", 2.3],
];
/** audit A5 P1 (shot 2 mounds read as indigo night tents, mean luma 0.25-0.40): the planned Blue Mesa palette at full
 *  value - lavender #9C8AB8, grey-blue #8FA3C4, cream #E6D6C0 and rust #B9735A beds (cream ~19 %, rust ~20 % of the
 *  height), slate #6F7FA6 only as three thin marker beds (~4 %), nothing darker than slate. Bottom up, metres (36 m). */
export const BADLAND_BANDS4: Band[] = [
  ["#c9a08a", 0.9], ["#8fa3c4", 1.6], ["#e6d6c0", 1.2], ["#9c8ab8", 1.8], ["#b9735a", 1.1], ["#6f7fa6", 0.4], ["#8fa3c4", 1.9],
  ["#e6d6c0", 0.9], ["#a493bd", 1.5], ["#c07a60", 1.3], ["#9fb0cc", 1.7], ["#e9dcc8", 1.4], ["#9c8ab8", 1.6], ["#6f7fa6", 0.5],
  ["#b9735a", 1.2], ["#8fa3c4", 1.8], ["#e6d6c0", 1.0], ["#9888b4", 1.7], ["#b37060", 0.9], ["#93a6c6", 1.6], ["#ddcbb8", 1.3],
  ["#a08ebc", 1.5], ["#6f7fa6", 0.45], ["#c58066", 1.1], ["#8fa3c4", 1.9], ["#e6d6c0", 0.9], ["#9c8ab8", 1.5], ["#b9735a", 0.6], ["#8fa3c4", 0.75],
];
/** round 6 (audit A6 P2 shot 2: "uniform high-frequency candy stripes, a saturated orange band: circus tents"): Blue
 *  Mesa beds as 3-4 BROAD bands per dome height (3.5-5.5 m: 15-25 % of a 22 m dome) led by grey-blue, lavender and
 *  slate, cream ash beds + thin accents (0.5-1.4 m), rust only as two thin beds (~6 % of the height). Bottom up, 36 m. */
export const BADLAND_BANDS5: Band[] = [
  ["#c49a86", 0.8], ["#8fa3c4", 4.5], ["#d9ccbe", 0.7], ["#9c8ab8", 5.5], ["#a87a6c", 0.9], ["#6f7fa6", 3.5], ["#e0d2c0", 1.2],
  ["#8fa3c4", 3.0], ["#a493bd", 0.9], ["#6f7fa6", 1.0], ["#9c8ab8", 4.0], ["#b08070", 1.0], ["#e0d2c0", 1.6], ["#8fa3c4", 3.5], ["#9c8ab8", 3.5],
];
/** audit A4 P2: banded strata with life. The band EDGES wobble +-wob of the thinner neighbour along u (periodic
 *  low-frequency sines, never an azimuth stripe pattern), every edge blends over ~blend of the band, thick beds carry
 *  2-3 thin sub-beds, and dark lavender (#6F6390, 25-40 %) erosion rills run DOWN the slope: irregular spacing,
 *  thick at the foot and tapering upward, meandering, some forked, plus faint micro-rills. 1024 x 2048 (v = H metres). */
export const strataBandsHD = (key: string, bands: Band[], H: number, o: { wob?: number; blend?: number; rills?: number; rillTop?: [number, number]; sat?: number; fine?: number; srgb?: boolean } = {}) => ptex("atStrata5" + key, 1024, 2048, (g, r) => {
  const W = 1024, HP = 2048, pm = HP / H, nB = bands.length, wob = o.wob ?? 0.12, blendK = o.blend ?? 0.16, nR = o.rills ?? 16;
  const tops: number[] = []; let acc = 0; for (const [, t] of bands) { acc += t; tops.push(acc * pm); }
  const sat = o.sat ?? 1, thick = bands.map(([, t]) => t * pm), cols = bands.map(([c]) => { const q = o.srgb ? hexS(c) : hexRGB(c), l = 0.3 * q[0] + 0.59 * q[1] + 0.11 * q[2]; return q.map((v) => l + (v - l) * sat); });
  const wobP = tops.map(() => [1 + Math.floor(r() * 2), 2 + Math.floor(r() * 3), 5 + Math.floor(r() * 3)].map((k) => [k, r() * TAU, U(r, 0.35, 1)]));
  // thin sub-beds inside the thick beds (straight, in the middle 20-80 % of the bed): +-6-10 % value, a hue nudge
  const mod = new Float32Array(HP).fill(1);
  bands.forEach(([, t], i) => { if (t < 1.1) return; const lo = i ? tops[i - 1] : 0;
    for (let k = 0, n = 2 + Math.floor(r() * 2); k < n; k++) { const c = lo + thick[i] * U(r, 0.2, 0.8), w = U(r, 0.07, 0.17) * pm, v = (r() < 0.5 ? -1 : 1) * U(r, 0.06, 0.1);
      for (let h = Math.max(0, Math.floor(c - w)); h < Math.min(HP, Math.ceil(c + w)); h++) mod[h] *= 1 + v * Math.exp(-(((h - c) / (w * 0.6)) ** 2)); } });
  for (let h = 0; h < HP; h++) mod[h] *= 1 + 0.022 * Math.sin(h * 0.41) * Math.sin(h * 0.067); // fine laminae
  const im = g.createImageData(W, HP), D = im.data, bnd = new Float32Array(nB);
  for (let x = 0; x < W; x++) {
    for (let i = 0; i < nB; i++) {
      let s = 0, sa = 0; for (const [k, ph, a] of wobP[i]) { s += a * Math.sin((TAU * k * x) / W + ph); sa += a; }
      bnd[i] = tops[i] + (s / sa) * wob * Math.min(thick[i], thick[i + 1] ?? thick[i]);
    }
    let j = 0;
    for (let h = 0; h < HP; h++) {
      while (j < nB - 1 && h >= bnd[j]) j++;
      let c = cols[j];
      const wbU = blendK * Math.min(thick[j], thick[j + 1] ?? thick[j]), du = bnd[j] - h;
      if (j < nB - 1 && du < wbU) { const t = 0.5 * (1 - du / wbU); c = mixRGB(c, cols[j + 1], t * t * (3 - 2 * t)); }
      if (j > 0) { const wbL = blendK * Math.min(thick[j], thick[j - 1]), dl = h - bnd[j - 1]; if (dl < wbL) { const t = 0.5 * (1 - dl / wbL); c = mixRGB(c, cols[j - 1], t * t * (3 - 2 * t)); } }
      const m = mod[h], k = ((HP - 1 - h) * W + x) * 4;
      D[k] = Math.min(255, c[0] * m); D[k + 1] = Math.min(255, c[1] * m); D[k + 2] = Math.min(255, c[2] * m); D[k + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  for (let i = 0; i < 26; i++) { const x = U(r, 0, W), y = U(r, 0, HP), rad = U(r, 50, 150), d = r() < 0.5, a = U(r, 0.025, 0.05); // mottling
    wrap2(W, HP, x, y, rad * 2.2, (xx, yy) => blotch(g, xx, yy, rad, 2.6, d ? "70,50,80" : "255,246,236", a)); }
  // erosion rills (round 2 of A4: the thin first pass read as rain streaks at 150 m): BROAD tapered flutes from the foot
  // up the slope, darkest at the foot and fading upward (vertical gradient), each with a pale lit rib beside it;
  // medium and micro rills between, all irregularly spaced, meandering, some forked
  const [t0, t1] = o.rillTop ?? [0.16, 0.48];
  const rill = (x0: number, w0: number, top: number, a: number, mA: number, side: boolean) => {
    const N = 18, ph = r() * TAU, fr = U(r, 2, 5), L: number[][] = [], R2: number[][] = [];
    for (let q = 0; q <= N; q++) { const s = q / N, yy = HP - s * top, hw = w0 * (1 - s) ** 1.1 + 0.5, cx = x0 + mA * Math.sin(s * fr + ph) * s;
      L.push([cx - hw, yy]); R2.push([cx + hw, yy]); }
    const pts = [...L, ...R2.reverse()], ext = w0 * 2 + mA + 4;
    const grad = (rgb: string, k: number) => { const gr = g.createLinearGradient(0, HP, 0, HP - top); gr.addColorStop(0, `rgba(${rgb},${k})`); gr.addColorStop(0.55, `rgba(${rgb},${k * 0.7})`); gr.addColorStop(1, `rgba(${rgb},0)`); return gr; };
    wrapX(W, x0 - ext, 2 * ext, (ox) => {
      const dx = ox - (x0 - ext);
      g.fillStyle = grad("88,76,118", a); poly(g, pts, dx); g.fill();
      if (side) { g.fillStyle = grad("255,244,236", a * 0.07); poly(g, pts.map(([px, py]) => [px + w0 * 1.3 + 1.5, py]), dx); g.fill(); } // a faint lit rib beside it
    });
  };
  for (let i = 0; i < nR; i++) {
    const x0 = ((i + U(r, 0.15, 0.85)) / nR) * W, w0 = U(r, 12, 26), top = U(r, t0, t1) * HP, a = U(r, 0.4, 0.55), mA = U(r, 6, 18);
    rill(x0, w0, top, a, mA, true);
    if (r() < 0.4) rill(x0 + U(r, -1, 1) * w0 * 2.5, w0 * 0.5, top * U(r, 0.35, 0.6), a * 0.8, mA * 0.6, false); // a fork joining low down
  }
  for (let i = 0; i < nR * 2; i++) rill(U(r, 0, W), U(r, 4, 9), U(r, 0.1, 0.35) * HP, U(r, 0.22, 0.34), U(r, 3, 9), false); // medium rills
  for (let i = 0; i < nR * 3; i++) rill(U(r, 0, W), U(r, 1, 2.5), U(r, 0.06, 0.22) * HP, U(r, 0.12, 0.2), U(r, 2, 5), false); // micro-rills
  // audit A5 P2 (shot 2: smooth striped domes, no rills): fine darker-lavender rills cutting DOWN through the bands,
  // evenly irregular (spacing ~1.5-2x their width apart on screen: 12-20 px at 1080 on the hero domes), 2-4 texels
  // wide at the foot, reaching 30-75 % up the texture, each with a faint lit lip
  const nF = o.fine ?? 0;
  for (let i = 0; i < nF; i++) { const x0 = ((i + U(r, 0.2, 0.8)) / nF) * W, top = U(r, 0.18, 0.72) * HP;
    rill(x0, U(r, 1.6, 3.2), top, U(r, 0.24, 0.42), U(r, 3, 10), r() < 0.5); }
  for (let i = 0; i < 24000; i++) { const x = U(r, 0, W), y = U(r, 0, HP), s = U(r, 1, 2.4), d = r() < 0.5; // popcorn-clay speckle
    g.fillStyle = d ? "rgba(70,50,80,0.09)" : "rgba(255,250,244,0.11)"; g.fillRect(x, y, s, s); }
});
/** audit A4 P2 (shot 1 frame 0 + the trail-heads background: the mesas were a faint pink strip / a pale cream slab):
 *  bold Blue Mesa strata on the talus in THICK beds (they must still read through the frame-0 lens blur): pinkish grey
 *  scree foot, lavender, rust, slate-blue, grey-blue, thin cream ash and dark-slate marker beds, a dark lavender cliff
 *  foot and the brown caprock (top 22 %). Fractions of the mesa height. */
export const MESA3_BANDS: Band[] = [ // round 2: alternating VALUES (pale ash / dark slate / rust) so the beds survive haze + blur
  ["#b49c98", 0.09], ["#e0d2c8", 0.035], ["#6c789e", 0.085], ["#b0a0c8", 0.06], ["#a8644c", 0.075], ["#e2d4c8", 0.03], ["#8a9cc0", 0.075],
  ["#555e7c", 0.03], ["#c49478", 0.06], ["#a593bf", 0.065], ["#dccbbf", 0.03], ["#946c80", 0.06], ["#6e6684", 0.05], ["#6a5550", 0.24],
];
export const domeBandsHD = (key: string, bands: Band[], H: number) => ptex("atBands" + key, 1024, 2048, (g, r) => {
  const W = 1024, HP = 2048, pm = HP / H;
  let acc = 0; const tops: number[] = [];
  for (const [, t] of bands) { acc += t; tops.push(acc * pm); }
  let prev = 0;
  bands.forEach(([c], i) => { g.fillStyle = c; g.fillRect(0, HP - tops[i], W, tops[i] - prev + 1); prev = tops[i]; });
  g.fillStyle = bands[bands.length - 1][0]; g.fillRect(0, 0, W, HP - prev + 1);
  for (let i = 0; i < bands.length - 1; i++) { // a soft blend strip at every boundary (straight)
    const y = HP - tops[i], gr = g.createLinearGradient(0, y - 7, 0, y + 7);
    gr.addColorStop(0, hexA(bands[i + 1][0], 0)); gr.addColorStop(0.5, hexA(bands[i + 1][0], 0.45)); gr.addColorStop(1, hexA(bands[i][0], 0));
    g.fillStyle = gr; g.fillRect(0, y - 7, W, 14);
  }
  for (let i = 0; i < bands.length; i++) { // straight fine strata
    const lo = i ? tops[i - 1] : 0, hi = tops[i], n = Math.max(1, Math.floor((hi - lo) / 15));
    for (let k = 1; k < n; k++) { const y = HP - (lo + ((hi - lo) * k) / n), a = U(r, 0.03, 0.08), light = r() < 0.5;
      g.fillStyle = light ? `rgba(255,248,240,${a})` : `rgba(60,40,70,${a})`; g.fillRect(0, y, W, U(r, 1.5, 3)); }
  }
  for (let i = 0; i < 30; i++) { const x = U(r, 0, W), y = U(r, 0, HP), rad = U(r, 50, 150), d = r() < 0.5, a = U(r, 0.03, 0.06); // mottling
    wrap2(W, HP, x, y, rad * 2.2, (xx, yy) => blotch(g, xx, yy, rad, 2.6, d ? "70,50,80" : "255,246,236", a)); }
  for (let i = 0; i < 26000; i++) { const x = U(r, 0, W), y = U(r, 0, HP), s = U(r, 1, 2.4), d = r() < 0.5; // popcorn-clay speckle
    g.fillStyle = d ? "rgba(70,50,80,0.1)" : "rgba(255,250,244,0.12)"; g.fillRect(x, y, s, s); }
});
/** shot 13 (audit A3 P2): the sunset horizon behind Sign B - plum badland domes and one flat-topped mesa in three hazy
 *  rows (#8a5a7a far, #764369 mid, #5F4757 near), faint height bands inside each silhouette, a 1-2 px gold rim on every
 *  top edge, the bottom fading out so the floor meets it softly. 2048 x 512 (alpha). */
export const sunsetRidgeTex = () => ptex("atSunsetRidge", 2048, 512, (g, r) => {
  const W = 2048, H = 512; g.clearRect(0, 0, W, H);
  type Hill = { x: number; w: number; h: number; mesa: boolean };
  const rows: { col: string; band: string; base: number; hills: Hill[] }[] = [
    { col: "#a06a86", band: "rgba(255,210,200,0.10)", base: 470, hills: [{ x: 160, w: 520, h: 150, mesa: false }, { x: 760, w: 760, h: 175, mesa: true }, { x: 1480, w: 560, h: 140, mesa: false }, { x: 1950, w: 420, h: 120, mesa: false }] },
    { col: "#764369", band: "rgba(255,190,170,0.10)", base: 490, hills: [{ x: 420, w: 430, h: 150, mesa: false }, { x: 1140, w: 380, h: 128, mesa: false }, { x: 1720, w: 470, h: 160, mesa: false }] },
    { col: "#5f4757", band: "rgba(255,180,150,0.09)", base: 512, hills: [{ x: 40, w: 360, h: 110, mesa: false }, { x: 880, w: 330, h: 96, mesa: false }, { x: 1360, w: 300, h: 86, mesa: false }, { x: 2010, w: 300, h: 100, mesa: false }] },
  ];
  for (const row of rows) {
    // silhouette height profile across the canvas: union of rounded domes (cos^0.8 caps) and a flat-topped mesa
    const prof = new Float32Array(W);
    for (const h of row.hills) for (let x = 0; x < W; x++) {
      const u = (x - h.x) / (h.w / 2); if (Math.abs(u) >= 1) continue;
      const y = h.mesa ? h.h * Math.min(1, 1.6 * (1 - Math.abs(u) ** 6) ** 0.6) : h.h * Math.cos((u * Math.PI) / 2) ** 0.8;
      prof[x] = Math.max(prof[x], y * (1 + 0.025 * Math.sin(x * 0.05 + h.x)));
    }
    g.fillStyle = row.col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x < W; x += 2) g.lineTo(x, row.base - prof[x]);
    g.lineTo(W, H); g.closePath(); g.fill();
    g.save(); g.clip(); // faint height bands inside the silhouettes
    for (let k = 0; k < 9; k++) { const y = row.base - 18 - k * 17 - U(r, -4, 4); g.fillStyle = row.band; g.fillRect(0, y, W, U(r, 4, 9)); }
    g.restore();
    g.strokeStyle = "rgba(255,206,120,0.95)"; g.lineWidth = 2.2; g.beginPath(); // the gold rim along every top edge
    let pen = false;
    for (let x = 0; x < W; x += 2) { const y = row.base - prof[x]; if (prof[x] > 2) { if (pen) g.lineTo(x, y + 1); else { g.moveTo(x, y + 1); pen = true; } } else pen = false; }
    g.stroke();
  }
  g.globalCompositeOperation = "destination-out";
  const fb = g.createLinearGradient(0, H - 70, 0, H); fb.addColorStop(0, "rgba(0,0,0,0)"); fb.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = fb; g.fillRect(0, H - 70, W, 70);
  g.globalCompositeOperation = "source-over";
});
/** mesa strata as FRACTIONS of the mesa height (v 0..1): sandy talus foot, red / lavender / cream clays, and the dark
 *  caprock (#6F5A55) on the top 22 % (the cliff + rim) */
export const MESA2_BANDS: Band[] = [
  ["#c99a76", 0.07], ["#b98a76", 0.05], ["#a8889f", 0.08], ["#d9c2a6", 0.03], ["#b9735a", 0.08], ["#9e7f9e", 0.08], ["#e0ccb2", 0.03],
  ["#b07a62", 0.08], ["#a68aa4", 0.07], ["#c98a6c", 0.07], ["#d8c2a8", 0.03], ["#a06a5a", 0.05], ["#7d6560", 0.06], ["#6f5a55", 0.22],
];
/** mesas: rust caprock over cream / rust / lavender strata, 60 m */
export const MESA_BANDS: Band[] = [
  ["#c7997a", 4], ["#b37a62", 5], ["#d9c2a6", 3], ["#a8889f", 6], ["#c58a6c", 4], ["#e0ccb2", 3], ["#9e7f9e", 6], ["#b9735a", 5],
  ["#dcc6aa", 3], ["#a68aa4", 6], ["#a8624a", 5], ["#8f5a46", 10],
];

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

/** audit A3 P2 (shot 10 paving pale and chalky): the trail-head plaza in warm red-dust concrete (#C9A07A / #D7A57A family),
 *  seamless world-tiled (1024 px = 2.2 m both ways, no edge drift so it can repeat), dense pebbles + grit, joints,
 *  hairline cracks with weed sprigs, dusty scuffs and shoe-print smudges */
export const plazaWarmHD = () => ptex("atPlazaWarm", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#c9a07a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 90, 280), k = r(), a = U(r, 0.08, 0.16);
    wrap2(S, S, x, y, rad * 1.4, (xx, yy) => blotch(g, xx, yy, rad, 1.4, k < 0.4 ? "215,165,122" : k < 0.75 ? "176,128,94" : "196,150,130", a)); }
  for (let i = 0; i < 30000; i++) { const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 1, 3), k = r();
    g.fillStyle = k < 0.4 ? "rgba(120,84,62,0.5)" : k < 0.75 ? "rgba(236,206,170,0.5)" : "rgba(170,104,72,0.45)"; g.fillRect(x, y, s, s); }
  for (const o of [0, S / 2]) for (const oo of o === 0 ? [0, S] : [o]) { // expansion joints both ways (seamless)
    g.fillStyle = "rgba(96,64,46,0.5)"; g.fillRect(0, oo - 3, S, 5); g.fillRect(oo - 3, 0, 5, S);
    g.fillStyle = "rgba(240,214,182,0.3)"; g.fillRect(0, oo + 2, S, 2); g.fillRect(oo + 2, 0, 2, S); }
  const PEB = ["#e7d6bc", "#d8c3a6", "#c9b49a", "#b9a08a", "#9c6e4e", "#e9dccb", "#b9735a", "#a88a7a"];
  for (let i = 0; i < 1300; i++) { const x = U(r, 0, S), y = U(r, 0, S), big = r() < 0.1, rx = big ? U(r, 6, 11) : U(r, 2, 5), c = pick(r, PEB), rot = U(r, -0.6, 0.6), ry = rx * U(r, 0.55, 0.85);
    wrap2(S, S, x, y, rx * 2, (xx, yy) => pebbleDab(g, xx, yy, rx, ry, rot, c)); }
  for (let i = 0; i < 30; i++) { const x = U(r, 0, S), y = U(r, 0, S), len = U(r, 30, 90), a = U(r, -0.6, 0.6), dark = r() < 0.55, lw = U(r, 6, 14); // scuffs
    wrap2(S, S, x, y, len, (xx, yy) => { g.strokeStyle = dark ? "rgba(100,66,48,0.2)" : "rgba(226,180,136,0.3)"; g.lineWidth = lw; g.lineCap = "round";
      g.beginPath(); g.moveTo(xx - Math.cos(a) * len / 2, yy - Math.sin(a) * len / 2); g.quadraticCurveTo(xx + 6, yy - 8, xx + Math.cos(a) * len / 2, yy + Math.sin(a) * len / 2); g.stroke(); }); }
  for (let i = 0; i < 7; i++) { // hairline cracks with a weed sprig where they meet a joint
    let x = U(r, 60, S - 60), y = U(r, 60, S - 60); const pts: [number, number][] = [[x, y]];
    for (let k = 0; k < 8; k++) { x += U(r, -34, 34); y += U(r, 16, 46); pts.push([x, y]); }
    for (const [col, lw, o] of [["rgba(246,226,200,0.32)", 2.6, 1.4], ["rgba(84,58,44,0.6)", 1.8, 0]] as const) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px + o, py + o) : g.moveTo(px + o, py + o))); g.stroke(); }
    const [wx, wy] = pts[Math.floor(r() * pts.length)];
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + U(r, -0.9, 0.9), l = U(r, 8, 18); g.strokeStyle = pick(r, ["#8a9a5a", "#a8a860", "#b89a58"]); g.lineWidth = 2;
      g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + Math.cos(a) * l, wy + Math.sin(a) * l); g.stroke(); }
  }
});
/** round 7 (audit A7 P2 shot 1: the plaza round the glint rock read one warm orange): the trailhead plaza = the warm
 *  plaza + extra dark grit and pale grey gravel (the material colour pulls it toward dusty red-tan #CF9670) */
export const plazaTH = () => ptex("atPlazaTH7", 1024, 1024, (g, r) => {
  const S = 1024;
  g.drawImage(plazaWarmHD().image as HTMLCanvasElement, 0, 0);
  for (let i = 0; i < 14000; i++) { const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 1, 2.6); g.fillStyle = r() < 0.7 ? "rgba(92,62,50,0.55)" : "rgba(70,52,58,0.5)"; g.fillRect(x, y, s, s); }
  const PG = ["#e8e2d8", "#d8d2ca", "#cfc6bc", "#f0ebe2", "#bfb4aa"];
  for (let i = 0; i < 700; i++) { const x = U(r, 0, S), y = U(r, 0, S), big = r() < 0.12, rx = big ? U(r, 5, 9) : U(r, 2, 4.5), c = pick(r, PG), rot = U(r, -0.6, 0.6), ry = rx * U(r, 0.55, 0.85);
    wrap2(S, S, x, y, rx * 2, (xx, yy) => pebbleDab(g, xx, yy, rx, ry, rot, c)); }
});
/** a gravel border strip (#9C6E4E family) for plaza / trail edges: u across (256 px), v along (1024 px = 2.2 m) */
export const gravelEdgeHD = () => ptex("atGravelEdge", 256, 1024, (g, r) => {
  g.fillStyle = "#a87a58"; g.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? "rgba(90,58,40,0.4)" : "rgba(230,196,160,0.35)"; g.fillRect(U(r, 0, 256), U(r, 0, 1024), 2, 2); }
  const PEB = ["#e7d6bc", "#c9b49a", "#9c6e4e", "#b9735a", "#d8c3a6", "#8a6a54"];
  for (let i = 0; i < 700; i++) { const x = U(r, 8, 248), y = U(r, 0, 1024), rx = U(r, 3, 8), c = pick(r, PEB), rot = U(r, -0.6, 0.6), ry = rx * U(r, 0.55, 0.85);
    wrap2(1e6, 1024, x, y, rx * 2, (xx, yy) => pebbleDab(g, xx, yy, rx, ry, rot, c)); }
  for (const x of [0, 256]) { const gr = g.createLinearGradient(x, 0, x === 0 ? 40 : 216, 0); gr.addColorStop(0, "rgba(120,80,56,0.55)"); gr.addColorStop(1, "rgba(120,80,56,0)"); g.fillStyle = gr; g.fillRect(x === 0 ? 0 : 216, 0, 40, 1024); }
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

const pH = (i: number, j: number, s: number) => { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
const pN = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = pH(xi, yi, s), b = pH(xi + 1, yi, s), c = pH(xi, yi + 1, s), d = pH(xi + 1, yi + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
const pF = (x: number, y: number, s: number) => pN(x, y, s) * 0.5 + pN(x * 2.1, y * 2.1, s + 1) * 0.27 + pN(x * 4.3, y * 4.3, s + 2) * 0.15 + pN(x * 8.7, y * 8.7, s + 3) * 0.08;
const hexRGB = (h: string) => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };
/** round 5 (audit A5 P1, root cause of the "indigo night tents"): THREE.Color(hex) is the LINEAR working colour, so
 *  hexRGB() painted every band into the sRGB canvas already linearised (decoded twice on the GPU: #8FA3C4 grey-blue
 *  rendered #435B87, slate #6F7FA6 -> #26376B, rust #B9735A -> #561415). hexS() is the hex's own sRGB 0..255 value. */
const hexS = (h: string) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** Cut face of a petrified log slice (audit A4 P2/P3: the blob / camouflage faces read as lava or pizza). Now a real
 *  petrified-wood section: colour ZONES that follow the growth rings (a warm yellow-orange heart, an orange-red body,
 *  a red outer zone, a purple rim zone of ~15 % of the face), 9-13 thin darker growth rings (25-35 %, slightly wobbly,
 *  unevenly spaced: wide near the pith, tight at the rim) round an off-centre pith, 5-8 radial checks from the pith
 *  (dark, pale-lipped, two of them open V checks), a 6-10 px pale quartz band inside a chipped bark rind of 7-9 % of the
 *  radius (#5E4636 -> #7A5A44), white crystal flecks in 2-3 pockets + a few milky veins. Same saturation and family in
 *  every variant (the shot 1 -> 2 rock-to-log match reads as the same stone); i = 4 is the shot-1 glint rock. */
const faceTex = (i: number, jas: boolean) => ptex((jas ? "atJasper7_" : "atJasper5_") + i, 768, 768, (g, r) => {
  // round 5b (audit A5 P3: "a near-uniform saturated red ring, an emissive lollipop"): the jasper faces paint the
  // hexes' own sRGB values (hexRGB() linearised them, so every zone came out darker and over-saturated)
  const hx = jas ? hexS : hexRGB, JAS = JAS_HEX.map(hx);
  const S = 768, C = S / 2, RD = 0.47 * S, s0 = 40 + i * 13;
  const Z = [ // [core, body, outer, rim] zone colour pairs (mottled inside each zone)
    [["#f6d060", "#f3e2c8"], ["#ee9444", "#e8703c"], ["#d4503c", "#c84a3a"], ["#9a68b8", "#b070c0"]],
    [["#f3e2c8", "#f6d060"], ["#ee9444", "#f6d060"], ["#d4503c", "#e8703c"], ["#9a68b8", "#d8708a"]],
    [["#f6d060", "#ee9444"], ["#d4503c", "#ee9444"], ["#d8708a", "#d4503c"], ["#b070c0", "#9a68b8"]],
    [["#ee9444", "#f6d060"], ["#f6d060", "#f3e2c8"], ["#d4503c", "#ee9444"], ["#9a68b8", "#d4503c"]],
    [["#f09a40", "#f6d060"], ["#ee9444", "#d4503c"], ["#d4503c", "#f6d060"], ["#9a68b8", "#b070c0"]],
  ][i % 5].map((p) => p.map(hx));
  const ZB = [0.2 + U(r, -0.03, 0.03), 0.5 + U(r, -0.04, 0.04), 0.8 + U(r, -0.02, 0.02)]; // zone boundaries (ring coordinate)
  const RIND = hx("#7a5a44"), RIND2 = hx("#5e4636"), MILK = hx("#f6ecdc"), QZ = hx("#efe4d8");
  const ox = U(r, -0.11, 0.11) * RD, oy = U(r, -0.11, 0.11) * RD; // pith offset (fades out toward the rim)
  const nRings = 9 + Math.floor(r() * 5), ringQ = Array.from({ length: nRings }, (_, k) => 0.06 + 0.8 * ((k + 0.6) / nRings) ** 0.82 * U(r, 0.97, 1.03));
  const ringA = ringQ.map(() => U(r, 0.25, 0.35));
  const im = g.createImageData(S, S), D = im.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - C, dy = y - C, d = Math.hypot(dx, dy) / RD, a = Math.atan2(dy, dx), k = (y * S + x) * 4, ca = Math.cos(a), sa = Math.sin(a);
    const rin = 0.918 - 0.018 * pN(ca * 3 + 5, sa * 3 + 5, s0 + 9) - 0.035 * Math.max(0, pN(ca * 5 + 1, sa * 5 + 1, s0 + 11) - 0.74) / 0.26;
    let c: number[];
    if (d > 1.02) c = RIND2;
    else if (d > rin) { // chipped bark rind with radial crack ticks and a pale cambium line
      const t = pN(x / 9, y / 3, s0 + 13), tick = Math.pow(0.5 + 0.5 * Math.cos(a * 46 + 3 * pN(ca * 4, sa * 4, s0 + 15)), 14);
      c = mixRGB(mixRGB(RIND2, RIND, ((d - rin) / Math.max(0.02, 1 - rin)) * 0.6 + 0.4 * t), [52, 34, 26], 0.75 * tick);
      if (d < rin + 0.012) c = mixRGB(c, [226, 204, 172], 0.55);
    } else {
      const fade = 1 - Math.min(1, d) ** 1.5, px = x - C - ox * fade, py = y - C - oy * fade;
      const wq = 0.035 * (pF(x / 160, y / 160, s0) - 0.5) + 0.012 * (pN(x / 22, y / 22, s0 + 3) - 0.5); // ring wobble
      const q = Math.hypot(px, py) / RD + wq;
      const zq = q + 0.05 * (pF(x / 90 + 7, y / 90 + 3, s0 + 4) - 0.5), z = zq < ZB[0] ? 0 : zq < ZB[1] ? 1 : zq < ZB[2] ? 2 : 3;
      const mot = pF(x / 70, y / 70, s0 + 20), pair = Z[z];
      c = mixRGB(pair[0], pair[1], THREE.MathUtils.clamp((mot - 0.3) / 0.4, 0, 1));
      for (let b = 0; b < 3; b++) { const e = zq - ZB[b]; if (Math.abs(e) < 0.03) { const n2 = mixRGB(Z[b][0], Z[b + 1][0], 0.5); c = mixRGB(c, n2, 0.35 * (1 - Math.abs(e) / 0.03)); } } // soft zone edges
      if (z === 0) c = mixRGB(c, [250, 228, 170], (jas ? 0.1 : 0.25) * (1 - zq / ZB[0])); // the glowing heart
      if (jas) { // audit A5 P3 (the hero face read as an emissive lollipop): mottled jasper patches with soft blotch edges
        // (rust ~30 %, ochre ~15 %, brown ~10 %, lavender-grey ~10 %), the outer zones ~15 % less saturated
        const n1 = pF(x / 70 + 11, y / 70 + 5, s0 + 70), n2 = pF(x / 52 + 3, y / 52 + 9, s0 + 71), bl = (lo: number, hi: number, v: number) => THREE.MathUtils.clamp((v - lo) / (hi - lo), 0, 1);
        c = mixRGB(c, JAS[0], 0.88 * bl(0.36, 0.43, n1) * (1 - bl(0.58, 0.65, n1)));
        c = mixRGB(c, JAS[1], 0.55 * bl(0.6, 0.68, n2));
        c = mixRGB(c, JAS[2], 0.6 * (1 - bl(0.33, 0.41, n2)));
        c = mixRGB(c, JAS[3], 0.7 * bl(0.65, 0.7, n1));
        if (z >= 2) { const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; c = c.map((v) => l + (v - l) * 0.85); } }
      let ring = 0; for (let n = 0; n < nRings; n++) { const e = (q - ringQ[n]) * RD; if (Math.abs(e) < 4) ring = Math.max(ring, ringA[n] * (jas ? 0.3 : 1) * Math.exp(-((e / 1.35) ** 2))); }
      c = [c[0] * (1 - ring), c[1] * (1 - ring * 1.05), c[2] * (1 - ring * 0.85)];
      const lv = 0.96 + 0.08 * pN(x / 30, y / 30, s0 + 30);
      c = [c[0] * lv, c[1] * lv, c[2] * lv];
      const vein = Math.abs(pF(x / 90, y / 90, s0 + 40) - 0.5); if (vein < 0.012) c = mixRGB(c, MILK, 0.6 * (1 - vein / 0.012)); // milky quartz veins
      const qb = rin - d; if (qb < 0.03) c = mixRGB(c, QZ, 0.85 * (1 - qb / 0.03) ** 0.6);  // pale quartz band inside the rind
    }
    const n = (pH(x, y, s0 + 50) - 0.5) * 8;
    D[k] = THREE.MathUtils.clamp(c[0] + n, 0, 255); D[k + 1] = THREE.MathUtils.clamp(c[1] + n, 0, 255); D[k + 2] = THREE.MathUtils.clamp(c[2] + n, 0, 255); D[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const PX = C + ox, PY = C + oy;
  g.fillStyle = "rgba(246,226,196,0.6)"; g.beginPath(); g.arc(PX, PY, 13, 0, TAU); g.fill(); // pith: pale halo + dark core
  g.fillStyle = "#5e2a1e"; g.beginPath(); g.arc(PX, PY, 6, 0, TAU); g.fill();
  g.lineCap = "round"; g.lineJoin = "round";
  const nk = 5 + Math.floor(r() * 4), a0 = r() * TAU;
  for (let k = 0; k < nk; k++) { // radial checks from the pith: jagged, dark, pale-lipped; two open V checks
    const a = a0 + (k / nk) * TAU + U(r, -0.3, 0.3), l0 = U(r, 0.02, 0.1) * RD, l1 = U(r, 0.55, 0.93) * RD, wedge = k < 2;
    const pts: number[][] = []; for (let q = 0; q <= 6; q++) { const l = l0 + ((l1 - l0) * q) / 6, da = q && q < 6 ? U(r, -0.05, 0.05) : 0; pts.push([PX + Math.cos(a + da) * l, PY + Math.sin(a + da) * l]); }
    if (wedge) {
      const w = U(r, 0.025, 0.045), side = (sg: number) => pts.map(([xx, yy], q) => { const s = (q / 6) * w * RD * sg; return [xx - Math.sin(a) * s, yy + Math.cos(a) * s]; });
      const shape = [...side(1), ...side(-1).reverse()];
      g.fillStyle = "rgba(255,236,214,0.4)"; poly(g, shape, 1.6, 1.6); g.fill();
      g.fillStyle = "rgba(48,26,24,0.78)"; poly(g, shape); g.fill();
    }
    for (const [col, lw, o] of [["rgba(255,236,214,0.38)", 3.6, 1.6], ["rgba(46,26,24,0.72)", U(r, 1.8, 3.0), 0]] as const) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach(([xx, yy], q) => (q ? g.lineTo(xx + o, yy + o) : g.moveTo(xx + o, yy + o))); g.stroke(); }
  }
  for (let q = 0, nq = 2 + Math.floor(r() * 2); q < nq; q++) { // crystal pockets: a pale druse patch + white flecks + one sparkle
    const ap = r() * TAU, dp = U(r, 0.3, 0.72) * RD, cx = C + Math.cos(ap) * dp, cy = C + Math.sin(ap) * dp, R0 = U(r, 16, 30);
    g.fillStyle = "rgba(236,226,246,0.45)"; g.beginPath(); g.ellipse(cx, cy, R0 * 0.7, R0 * 0.45, ap, 0, TAU); g.fill();
    for (let k = 0, n = 18 + Math.floor(r() * 10); k < n; k++) { const aa = r() * TAU, dd = Math.sqrt(r()) * R0, s = U(r, 1.2, 3.2);
      g.fillStyle = pick(r, ["rgba(255,255,255,0.92)", "rgba(230,240,255,0.82)", "rgba(255,240,214,0.86)"]); g.beginPath(); g.arc(cx + Math.cos(aa) * dd, cy + Math.sin(aa) * dd * 0.7, s, 0, TAU); g.fill(); }
    const L = U(r, 11, 17); g.fillStyle = "rgba(255,255,255,0.95)";
    for (const [ax, ay] of [[1, 0], [0, 1]]) { g.beginPath(); g.moveTo(cx - ax * L, cy - ay * L); g.quadraticCurveTo(cx + ay * 1.8, cy + ax * 1.8, cx + ax * L, cy + ay * L); g.quadraticCurveTo(cx - ay * 1.8, cy - ax * 1.8, cx - ax * L, cy - ay * L); g.fill(); }
  }
  for (let k = 0; k < 40; k++) { const aa = r() * TAU, dd = Math.sqrt(r()) * 0.85 * RD; g.fillStyle = "rgba(255,252,244,0.7)"; g.beginPath(); g.arc(C + Math.cos(aa) * dd, C + Math.sin(aa) * dd, U(r, 0.8, 1.8), 0, TAU); g.fill(); } // scattered flecks
  if (jas) { // a painted lit-to-shade gradient across the face: key side +8 %, far side -15 % toward violet #5A3F6E
    g.save(); g.beginPath(); g.arc(C, C, RD * 1.0, 0, TAU); g.clip();
    const lg = g.createLinearGradient(C - RD * 0.8, C - RD * 0.8, C + RD * 0.8, C + RD * 0.8);
    lg.addColorStop(0, "rgba(255,238,214,0.1)"); lg.addColorStop(0.45, "rgba(255,238,214,0)"); g.fillStyle = lg; g.fillRect(0, 0, S, S);
    const sg = g.createLinearGradient(C - RD * 0.8, C - RD * 0.8, C + RD * 0.8, C + RD * 0.8);
    sg.addColorStop(0.5, "rgba(90,63,110,0)"); sg.addColorStop(1, "rgba(90,63,110,0.24)"); g.fillStyle = sg; g.fillRect(0, 0, S, S);
    g.restore(); }
});
/** the petrified-log cut face as rainbow quartz (sets_int keeps this one) */
export const quartzFace = (i: number) => faceTex(i, false);
/** round 6 (audit A6 P2 shot 2: "mottled magenta / purple discs, no rings, no orange / yellow zones, read as salami"):
 *  a petrified-wood section painted in the hexes' own sRGB values. 4-6 BROAD colour zones that follow the growth
 *  rings (yellow / orange heart, orange-red body, red outer zone, a THIN purple band only near the rim), 5 clear dark
 *  growth rings (35-45 %) + faint fine rings, 3-5 radial checks, 2-3 white crystal pockets + scattered 1-2 px flecks,
 *  a milky quartz band and a chipped bark rind of ~7 % of the radius; mottling stays within +-8 % value (no muddy
 *  rust / lavender patches). i = 4 is the most orange / yellow (the shot-1 rock and the shot-2 match slice). */
const JZ: [number, string][][] = [ // [ring coordinate, colour] stops, pith (0) -> quartz band (1)
  [[0, "#f2cf6a"], [0.2, "#ecc04e"], [0.32, "#e8a04a"], [0.5, "#de863e"], [0.64, "#d2683c"], [0.8, "#c04c3c"], [0.9, "#b05a5a"], [0.96, "#8a5aa8"], [1, "#8a5aa8"]],
  [[0, "#eedcb0"], [0.16, "#ecc04e"], [0.34, "#de863e"], [0.52, "#c84a3a"], [0.62, "#d2603a"], [0.7, "#c84a3a"], [0.84, "#d87440"], [0.95, "#8a5aa8"], [1, "#8a5aa8"]],
  [[0, "#c04c3c"], [0.18, "#d2603a"], [0.34, "#de863e"], [0.5, "#ecc04e"], [0.64, "#e09c44"], [0.82, "#cc5a3a"], [0.94, "#9a5a9a"], [1, "#8a5aa8"]],
  [[0, "#e8924a"], [0.22, "#f0cc62"], [0.4, "#ecc04e"], [0.56, "#de863e"], [0.74, "#c84a3a"], [0.88, "#bc5a50"], [0.95, "#8a5aa8"], [1, "#8a5aa8"]],
  [[0, "#f4d878"], [0.26, "#f0cc62"], [0.44, "#ecac4a"], [0.6, "#e89a44"], [0.77, "#de863e"], [0.9, "#cc6040"], [0.97, "#9a6ab4"], [1, "#8a5aa8"]],
];
const jasFace8 = (i: number) => ptex("atJasper8_" + i, 768, 768, (g, r) => {
  const S = 768, C = S / 2, RD = 0.47 * S, s0 = 140 + i * 17, stops = JZ[i % 5].map(([q, h]) => [q, ...hexS(h)] as number[]);
  const zc = (q: number) => { let k = 1; while (k < stops.length - 1 && q > stops[k][0]) k++; const a = stops[k - 1], b = stops[k], t = THREE.MathUtils.clamp((q - a[0]) / Math.max(1e-3, b[0] - a[0]), 0, 1), s = t * t * (3 - 2 * t);
    return [a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s, a[3] + (b[3] - a[3]) * s]; };
  const RIND = hexS("#7a5a44"), RIND2 = hexS("#5e4636"), MILK = hexS("#f6ecdc"), QZ = hexS("#efe4d8");
  const ox = U(r, -0.1, 0.1) * RD, oy = U(r, -0.1, 0.1) * RD;
  const ringQ = Array.from({ length: 5 }, (_, k) => 0.14 + 0.78 * ((k + 0.5) / 5) ** 0.85 * U(r, 0.95, 1.05)), ringA = ringQ.map(() => U(r, 0.35, 0.45));
  const im = g.createImageData(S, S), D = im.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - C, dy = y - C, d = Math.hypot(dx, dy) / RD, a = Math.atan2(dy, dx), k = (y * S + x) * 4, ca = Math.cos(a), sa = Math.sin(a);
    const rin = 0.93 - 0.012 * pN(ca * 3 + 5, sa * 3 + 5, s0 + 9) - 0.03 * Math.max(0, pN(ca * 5 + 1, sa * 5 + 1, s0 + 11) - 0.74) / 0.26;
    let c: number[];
    if (d > 1.02) c = RIND2;
    else if (d > rin) { // chipped bark rind with radial crack ticks and a pale cambium line
      const t = pN(x / 9, y / 3, s0 + 13), tick = Math.pow(0.5 + 0.5 * Math.cos(a * 46 + 3 * pN(ca * 4, sa * 4, s0 + 15)), 14);
      c = mixRGB(mixRGB(RIND2, RIND, ((d - rin) / Math.max(0.02, 1 - rin)) * 0.6 + 0.4 * t), [52, 34, 26], 0.75 * tick);
      if (d < rin + 0.012) c = mixRGB(c, [226, 204, 172], 0.55);
    } else {
      const fade = 1 - Math.min(1, d) ** 1.5, px = x - C - ox * fade, py = y - C - oy * fade;
      const wq = 0.06 * (pF(x / 120, y / 120, s0) - 0.5) + 0.018 * (pN(x / 26, y / 26, s0 + 3) - 0.5); // ring wobble (stone, not a target)
      const q = Math.hypot(px, py) / RD / rin + wq;
      c = zc(q + 0.06 * (pF(x / 80 + 7, y / 80 + 3, s0 + 4) - 0.5));
      const mot = pF(x / 55, y / 55, s0 + 20); c = c.map((v) => v * (0.88 + 0.24 * mot)); // +-12 % value mottling
      const jp = pF(x / 70 + 11, y / 70 + 5, s0 + 70), lp = pF(x / 64 + 3, y / 64 + 9, s0 + 71);
      if (jp > 0.58) c = mixRGB(c, hexS("#a8452e"), 0.38 * Math.min(1, (jp - 0.58) / 0.08)); // jasper patches
      if (lp > 0.66 && q < 0.85) c = mixRGB(c, hexS("#b0948a"), 0.3 * Math.min(1, (lp - 0.66) / 0.06)); // dull chert patches
      { const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; c = c.map((v) => l + (v - l) * 0.86); } // -14 % saturation
      let ring = 0; for (let n = 0; n < ringQ.length; n++) { const e = (q - ringQ[n]) * RD; if (Math.abs(e) < 6) ring = Math.max(ring, ringA[n] * Math.exp(-((e / 1.7) ** 2))); }
      ring = Math.max(ring, 0.07 * Math.pow(0.5 + 0.5 * Math.cos(q * 150 + 2 * pN(x / 40, y / 40, s0 + 5)), 6)); // faint fine rings
      c = [c[0] * (1 - ring), c[1] * (1 - ring * 1.08), c[2] * (1 - ring * 0.9)];
      const vein = Math.abs(pF(x / 90, y / 90, s0 + 40) - 0.5); if (vein < 0.01) c = mixRGB(c, MILK, 0.55 * (1 - vein / 0.01)); // milky quartz veins
      const qb = rin - d; if (qb < 0.028) c = mixRGB(c, QZ, 0.8 * (1 - qb / 0.028) ** 0.6); // pale quartz band inside the rind
    }
    const n = (pH(x, y, s0 + 50) - 0.5) * 6;
    D[k] = THREE.MathUtils.clamp(c[0] + n, 0, 255); D[k + 1] = THREE.MathUtils.clamp(c[1] + n, 0, 255); D[k + 2] = THREE.MathUtils.clamp(c[2] + n, 0, 255); D[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const PX = C + ox, PY = C + oy;
  g.fillStyle = "rgba(246,226,196,0.6)"; g.beginPath(); g.arc(PX, PY, 12, 0, TAU); g.fill();
  g.fillStyle = "#6a3020"; g.beginPath(); g.arc(PX, PY, 5.5, 0, TAU); g.fill();
  g.lineCap = "round"; g.lineJoin = "round";
  const nk = 3 + Math.floor(r() * 3), a0 = r() * TAU;
  for (let k = 0; k < nk; k++) { // radial checks from the pith (dark, pale-lipped); the first one an open V check
    const a = a0 + (k / nk) * TAU + U(r, -0.35, 0.35), l0 = U(r, 0.02, 0.08) * RD, l1 = U(r, 0.5, 0.9) * RD;
    const pts: number[][] = []; for (let q = 0; q <= 6; q++) { const l = l0 + ((l1 - l0) * q) / 6, da = q && q < 6 ? U(r, -0.05, 0.05) : 0; pts.push([PX + Math.cos(a + da) * l, PY + Math.sin(a + da) * l]); }
    if (k === 0) { const w = U(r, 0.025, 0.04), side = (sg: number) => pts.map(([xx, yy], q) => { const s = (q / 6) * w * RD * sg; return [xx - Math.sin(a) * s, yy + Math.cos(a) * s]; });
      const shape = [...side(1), ...side(-1).reverse()]; g.fillStyle = "rgba(255,236,214,0.4)"; poly(g, shape, 1.6, 1.6); g.fill(); g.fillStyle = "rgba(48,26,24,0.8)"; poly(g, shape); g.fill(); }
    for (const [col, lw, o] of [["rgba(255,236,214,0.4)", 3.4, 1.6], ["rgba(46,26,24,0.75)", U(r, 1.8, 2.8), 0]] as const) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach(([xx, yy], q) => (q ? g.lineTo(xx + o, yy + o) : g.moveTo(xx + o, yy + o))); g.stroke(); }
  }
  for (let q = 0, nq = 2 + Math.floor(r() * 2); q < nq; q++) { // crystal pockets: a pale druse patch + white flecks + one sparkle
    const ap = r() * TAU, dp = U(r, 0.3, 0.7) * RD, cx = C + Math.cos(ap) * dp, cy = C + Math.sin(ap) * dp, R0 = U(r, 14, 26);
    g.fillStyle = "rgba(236,226,246,0.5)"; g.beginPath(); g.ellipse(cx, cy, R0 * 0.7, R0 * 0.45, ap, 0, TAU); g.fill();
    for (let k = 0, n = 16 + Math.floor(r() * 10); k < n; k++) { const aa = r() * TAU, dd = Math.sqrt(r()) * R0, s = U(r, 1.2, 3.0);
      g.fillStyle = pick(r, ["rgba(255,255,255,0.95)", "rgba(230,240,255,0.85)", "rgba(255,240,214,0.9)"]); g.beginPath(); g.arc(cx + Math.cos(aa) * dd, cy + Math.sin(aa) * dd * 0.7, s, 0, TAU); g.fill(); }
    const L = U(r, 10, 16); g.fillStyle = "rgba(255,255,255,0.95)";
    for (const [ax, ay] of [[1, 0], [0, 1]]) { g.beginPath(); g.moveTo(cx - ax * L, cy - ay * L); g.quadraticCurveTo(cx + ay * 1.8, cy + ax * 1.8, cx + ax * L, cy + ay * L); g.quadraticCurveTo(cx - ay * 1.8, cy - ax * 1.8, cx - ax * L, cy - ay * L); g.fill(); }
  }
  for (let k = 0; k < 70; k++) { const aa = r() * TAU, dd = Math.sqrt(r()) * 0.86 * RD; g.fillStyle = k % 3 ? "rgba(255,252,244,0.8)" : "rgba(255,255,255,0.95)"; g.beginPath(); g.arc(C + Math.cos(aa) * dd, C + Math.sin(aa) * dd, U(r, 0.9, 2.0), 0, TAU); g.fill(); } // scattered flecks
  g.save(); g.beginPath(); g.arc(C, C, RD, 0, TAU); g.clip(); // a painted lit-to-shade gradient: key side +6 %, far side -12 % toward violet
  const lg = g.createLinearGradient(C - RD * 0.8, C - RD * 0.8, C + RD * 0.8, C + RD * 0.8);
  lg.addColorStop(0, "rgba(255,240,218,0.08)"); lg.addColorStop(0.45, "rgba(255,240,218,0)"); lg.addColorStop(0.55, "rgba(90,63,110,0)"); lg.addColorStop(1, "rgba(90,63,110,0.16)"); g.fillStyle = lg; g.fillRect(0, 0, S, S);
  g.restore();
});
/** the exterior log faces (round 6: jasFace8, rings + zones that read) */
export const jasperFace = (i: number) => jasFace8(i);
/** round 6 (audit A6 P2 chips read as jelly beans / red glass): the cut face of a broken chip = a piece of a slice face,
 *  ~18 % less saturated, so the rings show as arcs and part of the bark rind shows on one edge */
export const chipFace = (i: number) => ptex("atChipFace" + i, 512, 512, (g) => {
  g.filter = "saturate(0.82)"; g.drawImage(jasFace8(i % 5).image as HTMLCanvasElement, 0, 0, 512, 512); g.filter = "none";
});
const JAS_HEX = ["#a8452e", "#c98a3a", "#6e4a36", "#9a8aa8"];
const mixRGB = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** round 7 (audit A7 P2: the rainbow rock sat on the same orange as the floor): the glint rock's face = jasper face 1
 *  plus two COOL rings - a purple amethyst band (#8A5AA8) and a pale blue-white crystal band - so it pops off the sand */
export const glintFaceTex = () => ptex("atGlintFace7", 768, 768, (g, r) => {
  const S = 768, C = S / 2, RD = 0.47 * S;
  g.drawImage(jasFace8(1).image as HTMLCanvasElement, 0, 0);
  g.save(); g.beginPath(); g.arc(C, C, RD * 0.9, 0, TAU); g.clip();
  const ring = (q: number, w: number, col: string, a: number) => {
    g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = w * RD; g.beginPath();
    for (let k = 0; k <= 90; k++) { const t = (k / 90) * TAU, rr2 = q * RD * (1 + 0.035 * Math.sin(t * 3 + 0.7) + 0.02 * Math.sin(t * 7 + 2.1)); k ? g.lineTo(C + Math.cos(t) * rr2, C + Math.sin(t) * rr2) : g.moveTo(C + Math.cos(t) * rr2, C + Math.sin(t) * rr2); }
    g.closePath(); g.stroke(); g.globalAlpha = 1;
  };
  ring(0.5, 0.13, "#8a5aa8", 0.92); ring(0.5, 0.05, "#a77cc4", 0.7); ring(0.44, 0.018, "rgba(46,26,40,0.6)", 1); // amethyst band with a dark seam
  ring(0.72, 0.075, "#dfe8fb", 0.9); ring(0.72, 0.025, "#ffffff", 0.75); ring(0.665, 0.012, "rgba(60,70,110,0.45)", 1); // blue-white crystal band
  for (let k = 0; k < 60; k++) { const a = r() * TAU, d = (0.68 + 0.08 * r()) * RD; g.fillStyle = k % 2 ? "rgba(255,255,255,0.95)" : "rgba(200,220,255,0.9)"; g.beginPath(); g.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, U(r, 1, 2.6), 0, TAU); g.fill(); }
  g.restore();
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
/** round 7 (shot 6 mystery): a '?' someone scratched into the board's stain, pale raw wood in the grooves with a dark
 *  lower lip and stray scratch ticks (transparent; revealed by the raking late light) */
export const scratchQTex = () => ptex("atScratchQ", 256, 320, (g, r) => {
  g.clearRect(0, 0, 256, 320);
  const path: number[][] = []; // the '?' hook as a polyline, then the dot
  for (let k = 0; k <= 26; k++) { const t = -0.95 * Math.PI + (k / 26) * 1.55 * Math.PI; path.push([128 + Math.cos(t) * 70, 102 + Math.sin(t) * 64]); }
  path.push([150, 168], [134, 190], [128, 218]);
  const stroke = (ox: number, oy: number, col: string, lw: number, jit: number) => {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath();
    path.forEach(([x, y], k) => { const jx = (r() - 0.5) * jit, jy = (r() - 0.5) * jit; k ? g.lineTo(x + ox + jx, y + oy + jy) : g.moveTo(x + ox + jx, y + oy + jy); }); g.stroke();
  };
  stroke(4, 5, "rgba(30,14,8,0.7)", 22, 3);              // the groove's shadowed lower lip
  for (let n = 0; n < 4; n++) stroke((r() - 0.5) * 7, (r() - 0.5) * 7, n ? "rgba(236,206,160,0.6)" : "rgba(246,222,182,0.95)", n ? 6 : 15, 5); // raw pale wood, re-scratched 3x
  g.fillStyle = "rgba(30,14,8,0.7)"; g.beginPath(); g.arc(132, 270, 17, 0, TAU); g.fill();
  g.fillStyle = "rgba(246,222,182,0.95)"; g.beginPath(); g.arc(128, 265, 14, 0, TAU); g.fill();
  for (let k = 0; k < 9; k++) { const x = U(r, 30, 226), y = U(r, 20, 300), a = U(r, -0.6, 0.6), L = U(r, 10, 26); // stray knife ticks
    g.strokeStyle = "rgba(236,206,160,0.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
});
/** the shot-3 loose slice: a big bright quartz face (variant 1 rings) with a pale fresh notch scar on its rim where
 *  the tourist's chip came off (#F4E3C8) and a few extra crystal sparkles */
export const quartzNotch = () => ptex("atQuartzNotch", 512, 512, (g, r) => {
  g.drawImage(jasperFace(1).image as HTMLCanvasElement, 0, 0, 512, 512);
  const a = -0.75, cx = 256 + Math.cos(a) * 214, cy = 256 + Math.sin(a) * 214;
  // audit A3: a RECESSED fracture (not a pale sticker): dark lavender broken quartz inside (#6E5A86), a pale crystal lip
  // (#D9CCE6) along the break, stepped conchoidal ridges and a few crystal points catching the light
  g.save(); g.translate(cx, cy); g.rotate(a + Math.PI / 2);
  const notch = [[-48, -10], [-30, 18], [-12, 38], [16, 42], [36, 18], [46, -8], [30, -28], [-32, -28]];
  g.fillStyle = "#d9cce6"; poly(g, notch.map(([x, y]) => [x * 1.08, y * 1.08])); g.fill();
  g.fillStyle = "#6e5a86"; poly(g, notch); g.fill();
  g.fillStyle = "#54446c"; poly(g, [[-34, -6], [-14, 26], [12, 30], [28, 8], [20, -18], [-20, -20]]); g.fill();
  // angular broken facets (straight edges, never arcs or paired dots: the round-3 ridges read as a smiley face)
  g.strokeStyle = "rgba(217,204,230,0.65)"; g.lineWidth = 2.2; g.lineJoin = "miter";
  for (const L of [[[-40, -6], [-16, 4], [-4, 30]], [[-16, 4], [18, -6], [34, 14]], [[18, -6], [14, -24]], [[-24, -22], [-16, 4]]]) { g.beginPath(); L.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
  g.fillStyle = "rgba(120,100,150,0.55)"; poly(g, [[-16, 4], [18, -6], [-4, 30]]); g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)"; for (const [x, y, l] of [[-44, -6, 4], [-30, 16, 3], [40, 4, 3.5], [24, 34, 3], [-6, -26, 3]]) { g.beginPath(); g.moveTo(x - l, y); g.lineTo(x, y - l * 0.6); g.lineTo(x + l, y); g.lineTo(x, y + l * 0.6); g.closePath(); g.fill(); }
  g.strokeStyle = "rgba(60,40,50,0.75)"; g.lineWidth = 3; poly(g, notch); g.stroke();
  g.restore();
  // audit A5 P3: no painted '+' stickers (the face twinkles with 5 scene glints in sets_ext instead)
  for (let k = 0; k < 18; k++) { const aa = r() * TAU, d = Math.sqrt(r()) * 190; g.fillStyle = "rgba(255,250,240,0.55)"; g.beginPath(); g.arc(256 + Math.cos(aa) * d, 256 + Math.sin(aa) * d, U(r, 0.8, 1.6), 0, TAU); g.fill(); }
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

/** sagebrush canopy (grey-green #8FA08A, silver leaf dabs) and juniper (dark olive #4F6A3C, scale clusters, berries) */
export const sageTex = () => ptex("atSageTex", 256, 128, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#aebda4"); gr.addColorStop(0.45, "#8fa08a"); gr.addColorStop(1, "#6c7d6c");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 900; k++) { const x = r() * 256, y = r() * 128, l = r() < 0.5;
    g.fillStyle = l ? "rgba(228,238,218,0.38)" : "rgba(60,75,62,0.35)"; g.fillRect(x, y, 2.5, 1.6); g.fillRect(x - 256, y, 2.5, 1.6); }
});
export const juniperTex = () => ptex("atJuniperTex", 256, 128, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#667a48"); gr.addColorStop(0.45, "#495c38"); gr.addColorStop(1, "#34452c");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 70; k++) { const x = r() * 256, y = 8 + r() * 112, rad = 4 + r() * 8, l = y < 60 ? r() < 0.7 : r() < 0.25;
    for (const ox of [-256, 0, 256]) { g.strokeStyle = l ? "rgba(200,225,150,0.3)" : "rgba(20,40,20,0.3)"; g.lineWidth = 2.2; g.beginPath(); g.arc(x + ox, y, rad, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
  for (let k = 0; k < 26; k++) { const x = r() * 256, y = 20 + r() * 100; g.fillStyle = "#8aa0c8"; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); }
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
/** audit A3 (sage read as cauliflower / cotton balls / mint spheres): a sagebrush card - twisted grey-brown woody
 *  stems from one base, crowned by 40-60 small silver-green leaf tufts (#8FA08A / #6F8268, silvery #B8C2A8 tips, darker
 *  #4F5F52 hollows) with a ragged, uneven silhouette and a 2-3 px dark plum ink edge baked in. 512 px, alpha cut-out. */
export const sageCardTex = (i: number) => ptex("atSageCard" + i, 512, 512, (g, r) => {
  const S = 512; g.clearRect(0, 0, S, S); g.lineCap = "round"; g.lineJoin = "round";
  const bx = S / 2 + U(r, -12, 12), by = S - 6, tips: [number, number, number][] = [];
  const nb = 7 + Math.floor(r() * 4);
  const stems: number[][][] = [];
  for (let k = 0; k < nb; k++) {
    const a = -Math.PI / 2 + ((k / (nb - 1)) - 0.5) * 2.1 + U(r, -0.15, 0.15), L = U(r, 210, 330) * (1 - 0.35 * Math.abs((k / (nb - 1)) - 0.5));
    const pts: number[][] = [[bx + U(r, -8, 8), by]];
    for (let j = 1; j <= 4; j++) { const t = j / 4, aa = a + U(r, -0.25, 0.25) * t; const [px, py] = pts[j - 1]; pts.push([px + Math.cos(aa) * L / 4, py + Math.sin(aa) * L / 4 * 0.92]); }
    stems.push(pts);
    for (let j = 2; j <= 4; j++) tips.push([pts[j][0], pts[j][1], j === 4 ? U(r, 46, 70) : U(r, 30, 48)]);
  }
  const stemDraw = (col: string, extra: number) => { g.strokeStyle = col; for (const pts of stems) for (let j = 1; j < pts.length; j++) { g.lineWidth = (7 - j * 1.2) + extra; g.beginPath(); g.moveTo(pts[j - 1][0], pts[j - 1][1]); g.lineTo(pts[j][0], pts[j][1]); g.stroke(); } };
  type Leaf = { x: number; y: number; rx: number; ry: number; rot: number; c: string; hi: boolean };
  const leaves: Leaf[] = [];
  for (const [tx, ty, R] of tips) {
    const n = 14 + Math.floor(r() * 10);
    for (let k = 0; k < n; k++) { const a = r() * TAU, d = Math.sqrt(r()) * R, x = tx + Math.cos(a) * d, y = ty + Math.sin(a) * d * 0.8 - R * 0.15;
      const up = 1 - (y - ty + R) / (2 * R);
      leaves.push({ x, y, rx: U(r, 7, 13), ry: U(r, 4, 7), rot: U(r, -1.2, 1.2), c: up > 0.62 ? pick(r, ["#b8c2a8", "#a9b59a"]) : up > 0.3 ? pick(r, ["#8fa08a", "#97a690"]) : pick(r, ["#6f8268", "#61735d"]), hi: up > 0.75 && r() < 0.5 }); }
  }
  leaves.sort((a, b) => a.y - b.y);
  stemDraw("#2a1a26", 4);
  g.fillStyle = "#2a1a26"; for (const l of leaves) { g.beginPath(); g.ellipse(l.x, l.y, l.rx + 3, l.ry + 3, l.rot, 0, TAU); g.fill(); }
  g.fillStyle = "#4f5f52"; for (const [tx, ty, R] of tips) { g.beginPath(); g.ellipse(tx, ty + R * 0.1, R * 0.7, R * 0.5, 0, 0, TAU); g.fill(); }
  stemDraw("#6e5a4a", 0);
  for (const l of leaves) { g.fillStyle = l.c; g.beginPath(); g.ellipse(l.x, l.y, l.rx, l.ry, l.rot, 0, TAU); g.fill();
    if (l.hi) { g.fillStyle = "rgba(236,242,226,0.6)"; g.beginPath(); g.ellipse(l.x - l.rx * 0.2, l.y - l.ry * 0.3, l.rx * 0.45, l.ry * 0.35, l.rot, 0, TAU); g.fill(); } }
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
const triangleWarn = (g: G, cx: number, cy: number, s: number) => {
  g.save(); g.translate(cx, cy);
  g.fillStyle = "rgba(28,14,6,0.6)"; g.beginPath(); g.moveTo(-s * 0.58 + 4, s * 0.5 + 5); g.lineTo(4, -s * 0.5 + 5); g.lineTo(s * 0.58 + 4, s * 0.5 + 5); g.closePath(); g.fill();
  g.fillStyle = "#f2c230"; g.strokeStyle = "#2b1a12"; g.lineWidth = s * 0.07; g.lineJoin = "round";
  g.beginPath(); g.moveTo(-s * 0.58, s * 0.5); g.lineTo(0, -s * 0.5); g.lineTo(s * 0.58, s * 0.5); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#2b1a12"; g.fillRect(-s * 0.055, -s * 0.22, s * 0.11, s * 0.42); g.beginPath(); g.arc(0, s * 0.33, s * 0.07, 0, TAU); g.fill();
  g.restore();
};

/** round 7 (script v2, the user asked for SHORT boards): the title + three short lines; the last item breaks in two
 *  slightly smaller lines so every row reads big at frame 0 (caps ~49-80 px at 1080) */
export const WARN_TITLE = "WARNING!";
export const WARN_LINES = ["14 TONS STOLEN", "EVERY YEAR", "ONE SMALL PIECE", "AT A TIME."];
/** the board's text rows (metres from the board's TOP edge; font = em size in m; caps ~0.69 em): CHAR / CAM can aim at
 *  a row with y = TH.board.cy + TH.board.h / 2 - row.y. The bottom 0.17 m stays clear (her hat at frame 0). */
export const warnLayout = (h: number) => {
  const top = 0.075, bottom = h - 0.17, sep = 0.05, rel = [1.25, 1.0, 1.0, 0.78, 0.78], lead = 1.18;
  const F = (bottom - top - 2 * sep) / (lead * rel.reduce((a, b) => a + b, 0));
  const rows: { text: string; y: number; font: number; title: boolean }[] = [];
  const seps: number[] = [];
  let y = top;
  [WARN_TITLE, ...WARN_LINES].forEach((text, i) => {
    if (i === 1 || i === 3) { seps.push(y + sep * 0.45); y += sep; }
    const p = lead * rel[i] * F; rows.push({ text, y: y + p * 0.53, font: rel[i] * F, title: i === 0 }); y += p;
  });
  return { rows, seps };
};
/** a routed groove line (dark cut, pale lower lip) from x0 to x1 at y (canvas px) */
const routedRule = (g: G, x0: number, x1: number, y: number, lw: number) => {
  g.lineCap = "round";
  g.strokeStyle = "rgba(28,14,6,0.85)"; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  g.strokeStyle = "rgba(241,226,192,0.55)"; g.lineWidth = lw * 0.45; g.beginPath(); g.moveTo(x0 + lw, y + lw * 0.55); g.lineTo(x1 - lw, y + lw * 0.55); g.stroke();
};
/** the main warning board, w x h metres; text column limited to colW metres (so the frame-0 lens reads all of it) */
export const warnBoardTex = (w: number, h: number, colW: number) => {
  const PX = 640, W = Math.round(w * PX), H = Math.round(h * PX);
  return ptex(`atWarn7_${w}_${h}_${colW}`, W, H, (g, r) => {
    plankBoard(g, r, W, H, "#6b4426", 4);
    const inset = 0.045 * PX; // routed border groove
    g.strokeStyle = "rgba(28,14,6,0.8)"; g.lineWidth = 0.022 * PX; rr(g, inset, inset, W - 2 * inset, H - 2 * inset, 0.03 * PX); g.stroke();
    g.strokeStyle = "#e8d6b0"; g.lineWidth = 0.012 * PX; rr(g, inset + 2, inset + 2, W - 2 * inset, H - 2 * inset, 0.03 * PX); g.stroke();
    for (const [bx, by] of [[0.1, 0.1], [w - 0.1, 0.1], [0.1, h - 0.1], [w - 0.1, h - 0.1]]) nail(g, bx * PX, by * PX, 0.016 * PX, "#2a1a10");
    const fam = "Georgia, 'Times New Roman', serif", k = 0.82, Lw = warnLayout(h);
    // body lines share one size per group (the two fact lines, the two qualifier lines), each capped by the column width
    const body = Lw.rows.filter((q) => !q.title);
    const pxA = Math.min(Math.round(body[0].font * PX), fitPx(g, [body[0].text, body[1].text], fam, colW * PX, 999, k));
    const pxB = Math.min(Math.round(body[2].font * PX), fitPx(g, [body[2].text, body[3].text], fam, colW * PX * 0.92, 999, k));
    for (const q of Lw.rows) {
      if (q.title) {
        // WARNING! in warning-yellow routed letters, flanked by two yellow warning triangles
        const tri = q.font * PX * 0.92;
        const px = Math.min(Math.round(q.font * PX), fitPx(g, [q.text], fam, colW * PX - 2 * (tri * 1.25 + 0.05 * PX), 999, k));
        g.font = `bold ${px}px ${fam}`; const tw = g.measureText(q.text).width * k;
        engraveLine(g, q.text, W / 2, q.y * PX + px * 0.03, px, fam, "#f4cf5e", k);
        for (const sx of [-1, 1]) triangleWarn(g, W / 2 + sx * (tw / 2 + 0.06 * PX + tri * 0.55), q.y * PX - tri * 0.02, tri);
      } else {
        const px = q === body[0] || q === body[1] ? pxA : pxB;
        engraveLine(g, q.text, W / 2, q.y * PX + px * 0.03, px, fam, "#f1e2c0", k);
      }
    }
    Lw.seps.forEach((sy, i) => { const half = (i ? 0.34 : 0.42) * colW * PX; routedRule(g, W / 2 - half, W / 2 + half, sy * PX, 0.011 * PX); });
    // the drip cap shades the top of the face, the sun bleaches the very top edge, weather streaks run down
    const tb = g.createLinearGradient(0, 0, 0, H * 0.13); tb.addColorStop(0, "rgba(34,18,10,0.3)"); tb.addColorStop(1, "rgba(34,18,10,0)");
    g.fillStyle = tb; g.fillRect(0, 0, W, H * 0.13);
    g.fillStyle = "rgba(255,226,186,0.22)"; g.fillRect(0, 0, W, Math.max(3, 0.008 * PX));
    for (let i = 0; i < 14; i++) { const x = U(r, 0, W), len = U(r, 0.08, 0.4) * H, a = U(r, 0.04, 0.09), lw = U(r, 3, 9);
      const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, `rgba(30,16,8,${a})`); gr.addColorStop(1, "rgba(30,16,8,0)");
      g.fillStyle = gr; g.fillRect(x, 0, lw, len); }
    // gag: bird droppings under the raven's spot on the top-right edge (TH.ravenPerch x 0.78 of the 1.05 half width)
    // audit A3 P3: read as raven droppings, not a glitch: 3 irregular white splats on the top rail with grey shading,
    // tiny spatter dots and ONE short drip (~12 px on screen)
    const dx = W * (0.5 + 0.78 / w), dy = inset * 0.55;
    for (const [ox, oy, rad, drip] of [[-26, 2, 13, 0], [4, 6, 16, 0.042], [30, 1, 10, 0]] as const) {
      const x = dx + ox, y = dy + oy, rr0 = r() * TAU;
      g.fillStyle = "rgba(120,112,116,0.45)"; for (let k = 0; k < 6; k++) { const a = rr0 + k * 1.05; g.beginPath(); g.ellipse(x + Math.cos(a) * rad * 0.5 + 2, y + Math.sin(a) * rad * 0.35 + 3, rad * 0.55, rad * 0.4, a, 0, TAU); g.fill(); }
      g.fillStyle = "rgba(246,243,234,0.95)"; for (let k = 0; k < 6; k++) { const a = rr0 + k * 1.05; g.beginPath(); g.ellipse(x + Math.cos(a) * rad * 0.5, y + Math.sin(a) * rad * 0.35, rad * 0.52, rad * 0.38, a, 0, TAU); g.fill(); }
      g.fillStyle = "rgba(150,146,150,0.7)"; g.beginPath(); g.arc(x + rad * 0.15, y - rad * 0.05, rad * 0.28, 0, TAU); g.fill();
      for (let k = 0; k < 5; k++) { const a = r() * TAU, d = rad * U(r, 1.1, 1.8); g.fillStyle = "rgba(246,243,234,0.9)"; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, U(r, 1.5, 3), 0, TAU); g.fill(); }
      if (drip) { const L2 = drip * PX; g.fillStyle = "rgba(244,240,230,0.92)"; rr(g, x - 3.5, y, 7, L2, 3.5); g.fill(); g.beginPath(); g.arc(x, y + L2, 5.5, 0, TAU); g.fill();
        g.fillStyle = "rgba(130,126,130,0.5)"; g.fillRect(x + 1.5, y + 4, 2, L2 - 4); }
    }
  });
};
/** routed letters with depth: the groove outline (textLine routed) plus an inner shadow on the lower-right rim of each
 *  glyph and a thin highlight on the upper-left rim */
const engraveLine = (g: G, s: string, cx: number, y: number, px: number, family: string, fill: string, k = 1) => {
  textLine(g, s, cx, y, px, family, fill, k, true);
  const font = `bold ${px}px ${family}`;
  g.font = font; const w = Math.ceil(g.measureText(s).width * k) + px, h = Math.ceil(px * 1.6);
  const mk = () => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d")!;
    x.translate(w / 2, h / 2); x.scale(k, 1); x.font = font; x.textAlign = "center"; x.textBaseline = "middle"; return [c, x] as const; };
  const [cg, xg] = mk(); xg.fillStyle = "#fff"; xg.fillText(s, 0, 0); // glyph mask
  const rim = (ox: number, oy: number, col: string) => {
    const [c2, x2] = mk(); x2.setTransform(1, 0, 0, 1, 0, 0);
    x2.drawImage(cg, 0, 0); x2.globalCompositeOperation = "destination-out"; x2.drawImage(cg, ox, oy); // the rim strip
    x2.globalCompositeOperation = "source-in"; x2.fillStyle = col; x2.fillRect(0, 0, w, h);
    g.drawImage(c2, cx - w / 2, y - h / 2);
  };
  const o = Math.max(1.5, px * 0.045);
  rim(-o, -o, "rgba(58,36,20,0.85)");          // lower-right inner shadow (#3A2414)
  rim(o * 0.55, o * 0.55, "rgba(255,248,226,0.7)"); // upper-left highlight
};

/** split-flap atlas: 11 cards "-0123456789", 256 x 384 each (dark card, white glyph, split line painted in) */
export const FLAP_CHARS = "-0123456789";
export const flapAtlas = () => ptex("atFlapAtlas", 256 * 11, 384, (g) => {
  for (let i = 0; i < 11; i++) {
    const x = i * 256;
    g.fillStyle = "#1d1f23"; g.fillRect(x, 0, 256, 384);
    rr(g, x + 8, 8, 240, 368, 22); g.fillStyle = "#2c2f35"; g.fill();
    const gr = g.createLinearGradient(0, 8, 0, 376); gr.addColorStop(0, "rgba(255,255,255,0.06)"); gr.addColorStop(0.5, "rgba(0,0,0,0.12)"); gr.addColorStop(1, "rgba(255,255,255,0.04)");
    g.fillStyle = gr; g.fillRect(x + 8, 8, 240, 368);
    g.save(); g.translate(x + 128, 196); g.scale(0.86, 1); g.font = "bold 330px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#f4f1ea"; g.fillText(FLAP_CHARS[i], 0, 6); g.restore();
    g.fillStyle = "#0e0f12"; g.fillRect(x + 8, 189, 240, 6);
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x + 8, 195, 240, 2);
  }
});
/** audit A5 P2 (the loop frame read 'TON' / '/YEA' behind her bob): a narrow STACKED counter - the two flap cells on
 *  top, "TONS / YEAR" in one condensed line underneath - in a box ~40 % narrower than round 4's (left edge unchanged) */
export const FLIP_STACK = (w: number, h: number) => {
  const ch = h * 0.58, cw = ch * 0.6, gap = 0.012, y = h / 2 - 0.035 - ch / 2;
  return { cw, ch, cells: [{ x: -(cw + gap) / 2, y }, { x: (cw + gap) / 2, y }], labelY: -h / 2 + 0.06, labelW: w - 0.05, labelH: 0.07 };
};
export const flipStackTex = (w: number, h: number) => ptex(`atFlipStack_${w}_${h}`, Math.round(w * 1600), Math.round(h * 1600), (g, r) => {
  const PX = 1600, W = Math.round(w * PX), H = Math.round(h * PX);
  g.fillStyle = "#4b4844"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"; g.fillRect(U(r, 0, W), U(r, 0, H), 2, 2); }
  rr(g, 10, 10, W - 20, H - 20, 18); g.strokeStyle = "rgba(255,255,255,0.16)"; g.lineWidth = 4; g.stroke();
  for (const [bx, by] of [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]]) nail(g, bx, by, 7, "#1a1c20");
  const L = FLIP_STACK(w, h);
  for (const c of L.cells) { g.fillStyle = "#0c0d10"; rr(g, (c.x - L.cw / 2 - 0.008 + w / 2) * PX, (h / 2 - c.y - L.ch / 2 - 0.008) * PX, (L.cw + 0.016) * PX, (L.ch + 0.016) * PX, 10); g.fill(); }
  const fam = "Arial, Helvetica, sans-serif", ly = (h / 2 - L.labelY) * PX;
  g.fillStyle = "rgba(0,0,0,0.25)"; rr(g, 0.02 * PX, ly - L.labelH * 0.62 * PX, W - 0.04 * PX, L.labelH * 1.24 * PX, 8); g.fill(); // a darker label strip
  g.fillStyle = "#f4f1ea"; g.textAlign = "center"; g.textBaseline = "middle";
  const px = fitPx(g, ["TONS / YEAR"], fam, L.labelW * PX, Math.round(L.labelH * PX * 1.3), 0.8);
  g.save(); g.translate(W / 2, ly + px * 0.04); g.scale(0.8, 1); g.font = `bold ${px}px ${fam}`; g.fillText("TONS / YEAR", 0, 0); g.restore();
});
/** cell centres (metres from the face centre, y up) for the flip counter of size w x h */
export const FLIP_LAYOUT = (w: number, h: number) => {
  // everything inside the central 0.44 m, so a close lens (TH.flip close-up ~0.5 m wide) reads "14 TONS / YEAR" whole
  const CW = Math.min(w - 0.07, 0.44), ch = h * 0.64, cw = ch * 0.6, x0 = -CW / 2 + cw / 2, l0 = x0 + cw * 1.5 + 0.022, l1 = CW / 2;
  return { cw, ch, cells: [{ x: x0, y: 0 }, { x: x0 + cw + 0.01, y: 0 }], labelX: (l0 + l1) / 2, labelW: l1 - l0 };
};
/** flip-counter housing face: w x h m; two flap windows on the left, "TONS" / "/ YEAR" on the right */
export const flipFaceTex = (w: number, h: number) => ptex(`atFlipFace_${w}_${h}`, Math.round(w * 1600), Math.round(h * 1600), (g, r) => {
  const PX = 1600, W = Math.round(w * PX), H = Math.round(h * PX);
  g.fillStyle = "#4b4844"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"; g.fillRect(U(r, 0, W), U(r, 0, H), 2, 2); }
  rr(g, 10, 10, W - 20, H - 20, 18); g.strokeStyle = "rgba(255,255,255,0.16)"; g.lineWidth = 4; g.stroke();
  for (const [bx, by] of [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]]) nail(g, bx, by, 7, "#1a1c20");
  const L = FLIP_LAYOUT(w, h);
  for (const c of L.cells) { g.fillStyle = "#0c0d10"; rr(g, (c.x - L.cw / 2 - 0.008 + w / 2) * PX, (h / 2 - c.y - L.ch / 2 - 0.008) * PX, (L.cw + 0.016) * PX, (L.ch + 0.016) * PX, 10); g.fill(); }
  const fam = "Arial, Helvetica, sans-serif", lx = (L.labelX + w / 2) * PX, lw = L.labelW * PX;
  g.fillStyle = "#f4f1ea"; g.textAlign = "center"; g.textBaseline = "middle";
  const p1 = fitPx(g, ["TONS"], fam, lw, Math.round(0.11 * PX), 0.92), p2 = fitPx(g, ["/ YEAR"], fam, lw, Math.round(0.085 * PX), 0.92);
  g.save(); g.translate(lx, H * 0.33); g.scale(0.92, 1); g.font = `bold ${p1}px ${fam}`; g.fillText("TONS", 0, 0); g.restore();
  g.save(); g.translate(lx, H * 0.72); g.scale(0.92, 1); g.font = `bold ${p2}px ${fam}`; g.fillText("/ YEAR", 0, 0); g.restore();
});

/** 5 x 7 dot-matrix glyphs for the LED counters */
const DOT57: Record<string, string> = {
  "0": "01110100011001110101110011000101110", "1": "00100011000010000100001000010001110", "2": "01110100010000100010001000100011111",
  "3": "11111000100010000010000011000101110", "4": "00010001100101010010111110001000010", "5": "11111100001111000001000011000101110",
  "6": "00110010001000011110100011000101110", "7": "11111000010001000100010000100001000", "8": "01110100011000101110100011000101110",
  "9": "01110100011000101111000010001001100", ".": "00000000000000000000000000110001100", "%": "11000110010001000100010001001100011",
  P: "11110100011000111110100001000010000", I: "01110001000010000100001000010001110", E: "11111100001000011110100001000011111",
  C: "01110100011000010000100001000101110", S: "01111100001000001110000010000111110", M: "10001110111010110101100011000110001",
  N: "10001100011100110101100111000110001", G: "01110100011000010111100011000101111", " ": "00000000000000000000000000000000000",
};
/** draw a string as LED dots: (x, y) top-left, p = dot pitch px; lit = colour of "on" dots, dim = colour of "off" dots */
/** round 6 (audit A6 P3: "7. 92%" - the point sat in a full digit cell): the decimal point advances only DOT_ADV
 *  dot pitches (a half cell), so the value reads 7.92% with even spacing */
const DOT_ADV = 2.6;
/** the width (in dot pitches) of a string drawn by ledText */
export const ledWidth = (s: string) => { let w = 0; for (const ch of s) w += ch === "." ? DOT_ADV : 6; return w - 1; };
export const ledText = (g: G, s: string, x: number, y: number, p: number, lit: string | null, dim: string | null) => {
  let cx0 = x;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ".") { // the decimal point is one solid 2 x 2 block (round dots read as "," or ":" at preview size), centred in its half cell
      const col = lit ?? dim; if (col) { g.fillStyle = col; rr(g, cx0 + p * (DOT_ADV - 1 - 1.36) / 2, y + 5 * p + p * 0.32, p * 1.36, p * 1.36, p * 0.4); g.fill(); }
      cx0 += DOT_ADV * p; continue;
    }
    const bits = DOT57[s[i]] ?? DOT57[" "];
    for (let k = 0; k < 35; k++) {
      const on = bits[k] === "1", cx = cx0 + (k % 5) * p + p / 2, cy = y + Math.floor(k / 5) * p + p / 2;
      const col = on ? lit : dim;
      if (!col) continue;
      g.fillStyle = col; g.beginPath(); g.arc(cx, cy, p * 0.4, 0, TAU); g.fill();
    }
    cx0 += 6 * p;
  }
};
/** LED box layout (canvas px for a W x H canvas): label row and value row (the value "X.XX%" with a half-cell point) */
export const LED_LAYOUT = (W: number, H: number) => {
  const vw = ledWidth("8.88%"), lp = (W * 0.84) / (14 * 6 - 1), vp = Math.min((W * 0.84) / vw, (H * 0.5) / 7);
  return { lp, lx: (W - (14 * 6 - 1) * lp) / 2, ly: H * 0.1, vp, vx: (W - vw * vp) / 2, vy: H * 0.1 + 7 * lp + H * 0.08 };
};
/** static LED face: black box, bezel, every dot faintly visible (unlit LEDs) */
export const ledFaceTex = () => ptex("atLedFace", 1024, 333, (g) => {
  const W = 1024, H = 333, L = LED_LAYOUT(W, H);
  g.fillStyle = "#2a2c31"; g.fillRect(0, 0, W, H);
  rr(g, 12, 12, W - 24, H - 24, 16); g.fillStyle = "#09090b"; g.fill();
  // unlit dots at ~12-15 % of the lit brightness (they were ~35 %, so "0.00%" read as "0:00%")
  ledText(g, "PIECES MISSING", L.lx, L.ly, L.lp, null, "rgba(110,62,26,0.22)");
  ledText(g, "8.88%", L.vx, L.vy, L.vp, null, "rgba(100,26,22,0.26)");
  for (const [bx, by] of [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]]) nail(g, bx, by, 6, "#111");
});

/** Sign A / Sign B panels (cream face, brown border + text, park-sign pictograms), 1024 px square */
const parkFigure = (g: G, x: number, y: number, s: number, col: string, reach: number, carry: boolean) => {
  g.save(); g.translate(x, y); g.fillStyle = col; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round";
  const hipX = s * 0.06 * reach, hipY = -s * 0.36, shX = s * 0.22 * reach, shY = -s * (0.74 - 0.16 * reach);
  g.beginPath(); g.arc(shX + s * 0.08 * reach, shY - s * 0.16, s * 0.11, 0, TAU); g.fill();              // head
  g.lineWidth = s * 0.15; g.beginPath(); g.moveTo(shX, shY); g.lineTo(hipX, hipY); g.stroke();          // torso (bends to reach)
  g.lineWidth = s * 0.11; g.beginPath(); g.moveTo(hipX, hipY); g.lineTo(-s * 0.14, 0); g.moveTo(hipX, hipY); g.lineTo(s * 0.16, 0); g.stroke(); // legs
  const hx = shX + s * (0.18 + 0.12 * reach), hy = shY + s * (0.12 + 0.34 * reach);
  g.lineWidth = s * 0.085; g.beginPath(); g.moveTo(shX, shY); g.lineTo(hx, hy); g.stroke();           // reaching arm
  g.beginPath(); g.moveTo(shX, shY); g.lineTo(shX - s * 0.14, shY + s * 0.22); g.lineTo(shX - s * 0.1, shY + s * 0.38); g.stroke();
  if (carry) { g.fillStyle = "#a0603a"; rr(g, hx - s * 0.04, hy - s * 0.05, s * 0.24, s * 0.12, s * 0.03); g.fill(); }
  g.restore();
  return [x + hx, y + hy];
};
const woodPiece = (g: G, x: number, y: number, s: number) => {
  g.fillStyle = "#a0603a"; rr(g, x - s * 0.5, y - s * 0.28, s, s * 0.28, s * 0.06); g.fill();
  g.fillStyle = "#d8843e"; g.beginPath(); g.ellipse(x + s * 0.5, y - s * 0.14, s * 0.07, s * 0.14, 0, 0, TAU); g.fill();
};
/** round 7 (script v2, short on purpose): both signs end on the same line, so only the first line differs */
export const SIGN_A_LINES = ["PLEASE DON'T", "TAKE THE WOOD."];
export const SIGN_B_LINES = ["MANY VISITORS", "TAKE THE WOOD."];
export const testSignTex = (which: "A" | "B") => ptex("atTestSign7" + which, 1024, 1024, (g, r) => {
  const S = 1024, ink = "#3a2414";
  // the face belongs to the scene light: warm top -> cooler bottom, a soft shadow band under the LED housing,
  // a faint warm glow along the top edge (the face is unlit MeshBasic for legibility; world tint multiplies it)
  const vg = g.createLinearGradient(0, 0, 0, S); vg.addColorStop(0, "#f6ebd8"); vg.addColorStop(0.55, "#efe3d0"); vg.addColorStop(1, "#e3d6cc");
  g.fillStyle = vg; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 14; i++) blotch(g, U(r, 0, S), U(r, 0, S), U(r, 80, 240), 1.4, r() < 0.6 ? "150,120,80" : "255,255,245", 0.06);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,90,60,0.07)" : "rgba(255,255,250,0.1)"; g.fillRect(U(r, 0, S), U(r, 0, S), 2, 2); } // paint grain
  const sb = g.createLinearGradient(0, 0, 0, S * 0.09); sb.addColorStop(0, "rgba(70,52,70,0.2)"); sb.addColorStop(1, "rgba(70,52,70,0)");
  g.fillStyle = sb; g.fillRect(0, 0, S, S * 0.09);
  g.fillStyle = "rgba(255,214,160,0.55)"; g.fillRect(0, 0, S, 5);
  g.strokeStyle = "#5a3a22"; g.lineWidth = 34; rr(g, 17, 17, S - 34, S - 34, 40); g.stroke();
  g.strokeStyle = "rgba(255,240,215,0.5)"; g.lineWidth = 4; rr(g, 40, 40, S - 80, S - 80, 26); g.stroke();
  const lines = which === "A" ? SIGN_A_LINES : SIGN_B_LINES, fam = "Tahoma, Verdana, Arial, sans-serif";
  // round 7: two short lines, the SAME letter size on both signs (fitted to the widest of the four lines), ~1.5x the
  // round-6 caps; the first (different) line sits on a pale band so the eye compares PLEASE DON'T vs MANY VISITORS
  const top = 70, bot = 572, kk = 0.7, pitch = (bot - top) / 2; // condensed 0.7: the lines are width-limited, so narrower letters = taller caps (~46 px at 1080 in the shot-9 MS)
  const px = fitPx(g, [...SIGN_A_LINES, ...SIGN_B_LINES], fam, S - 92, Math.round(pitch * 0.74), kk);
  const y1 = top + pitch * 0.5 + 6, y2 = top + pitch * 1.5 - 4;
  g.fillStyle = which === "A" ? "rgba(216,52,44,0.1)" : "rgba(240,122,42,0.12)"; rr(g, 56, y1 - px * 0.62, S - 112, px * 1.24, 18); g.fill();
  textLine(g, lines[0], S / 2, y1, px, fam, which === "A" ? "#8a1f1a" : ink, kk, false);
  textLine(g, lines[1], S / 2, y2, px, fam, ink, kk, false);
  g.fillStyle = "rgba(90,58,34,0.35)"; g.fillRect(110, bot + 12, S - 220, 5);
  const gy = S - 100;
  g.fillStyle = "#ddcfb3"; g.fillRect(90, gy, S - 180, 8); // ground line
  if (which === "A") {
    woodPiece(g, 640, gy, 170);
    const [hx, hy] = parkFigure(g, 400, gy, 360, ink, 1, false);
    g.strokeStyle = "#d8342c"; g.lineWidth = 30; g.beginPath(); g.arc(hx, hy, 100, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(hx - 70, hy - 70); g.lineTo(hx + 70, hy + 70); g.stroke();
  } else {
    for (const [x, sc] of [[250, 0.82], [500, 0.95], [760, 0.82]] as const) parkFigure(g, x - 50, gy, 330 * sc, ink, 0.55, true);
    woodPiece(g, 395, gy, 80); woodPiece(g, 650, gy, 80); woodPiece(g, 880, gy, 70);
  }
});
/** the old panel that Sign A's posts carried before the swap */
export const oldPanelTex = () => ptex("atOldPanel", 1024, 1024, (g, r) => {
  const S = 1024;
  plankBoard(g, r, S, S, "#6b4426", 4);
  g.strokeStyle = "#e8d6b0"; g.lineWidth = 10; rr(g, 40, 40, S - 80, S - 80, 30); g.stroke();
  const fam = "Georgia, 'Times New Roman', serif", L = ["PLEASE", "STAY ON", "TRAIL"];
  const px = fitPx(g, L, fam, S - 220, 190, 0.86);
  L.forEach((l, i) => textLine(g, l, S / 2, 250 + i * 250, px, fam, "#f1e2c0", 0.86));
});
/** audit A3 name plate (JASPER / LONG LOGS on the sign posts, CRYSTAL on its own post): w x h m, condensed routed caps */
export const namePlateTex = (name: string, w: number, h: number, lines: string[] = [name]) => ptex(`atPlate${name}_${w}_${h}_${lines.length}`, 1024, Math.round((1024 * h) / w), (g, r) => {
  const W = 1024, H = Math.round((1024 * h) / w), n = lines.length;
  plankBoard(g, r, W, H, "#6e4628", n);
  g.strokeStyle = "rgba(28,14,6,0.75)"; g.lineWidth = 9; rr(g, 12, 12, W - 24, H - 24, 18); g.stroke();
  g.strokeStyle = "rgba(232,214,176,0.55)"; g.lineWidth = 4; rr(g, 22, 22, W - 44, H - 44, 12); g.stroke();
  for (const [bx, by] of [[34, H / 2], [W - 34, H / 2]]) nail(g, bx, by, 9, "#2a1a10");
  // audit A5 P2 (LONG LOGS ~28 px, CRYSTAL ~20 px at the "trails" beat): two stacked lines fill a taller plate
  const fam = "Georgia, 'Times New Roman', serif", k = n > 1 ? 0.8 : 0.64, pitch = (H - 40) / n, px = fitPx(g, lines, fam, W - 120, Math.round(pitch * (n > 1 ? 0.86 : 0.8)), k);
  lines.forEach((l, i) => engraveLine(g, l, W / 2, 20 + pitch * (i + 0.5) + px * 0.04, px, fam, "#f1e2c0", k));
});
/** routed name board for the trail-head marker posts */
export const markerTex = (name: string) => ptex("atMarker" + name, 1024, 256, (g, r) => {
  plankBoard(g, r, 1024, 256, "#6e4628", 1);
  g.strokeStyle = "rgba(28,14,6,0.7)"; g.lineWidth = 8; rr(g, 14, 14, 996, 228, 20); g.stroke();
  const fam = "Georgia, 'Times New Roman', serif", px = fitPx(g, [name], fam, 920, 175, 0.86);
  textLine(g, name, 512, 134, px, fam, "#f1e2c0", 0.86);
});
/** interpretive plaque on the rail */
export const plaqueTex = () => ptex("atPlaque", 1024, 726, (g, r) => {
  const W = 1024, H = 726;
  g.fillStyle = "#4e3420"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 80, 220), 1.4, r() < 0.5 ? "20,10,5" : "255,220,180", 0.07);
  g.strokeStyle = "#c9a96a"; g.lineWidth = 10; rr(g, 26, 26, W - 52, H - 52, 24); g.stroke();
  const fam = "Georgia, 'Times New Roman', serif";
  textLine(g, "LATE TRIASSIC", W / 2, 92, 60, fam, "#e3c27a", 1, false);
  g.fillStyle = "#c9a96a"; g.fillRect(200, 134, W - 400, 5);
  // round 6 (audit A6 P2): condensed (0.8) so the caps can be taller for the same plaque width
  const L = ["TREES OVER", "200 MILLION", "YEARS OLD"], px = fitPx(g, L, fam, W - 90, 182, 0.8);
  L.forEach((l, i) => textLine(g, l, W / 2, 252 + i * 172, px, fam, "#f5ead2", 0.8, false));
});
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
/** park entrance sign "PETRIFIED FOREST" (generic, no logo) */
export const entranceTex = () => ptex("atEntrance2", 2048, 812, (g, r) => {
  // audit A3 P1: 5.3 x 2.1 m face, PETRIFIED / FOREST on two routed lines (~0.5 m caps: >= 40 px from the shot-2 crane at
  // ~22 m), a thin cream rule and a little painted petrified-log motif under the words
  const W = 2048, H = 812;
  plankBoard(g, r, W, H, "#6a4224", 4);
  g.strokeStyle = "rgba(28,14,6,0.8)"; g.lineWidth = 22; rr(g, 30, 30, W - 60, H - 60, 34); g.stroke();
  g.strokeStyle = "#e8d6b0"; g.lineWidth = 12; rr(g, 40, 40, W - 80, H - 80, 28); g.stroke();
  const fam = "Georgia, 'Times New Roman', serif", usable = Math.round(W * (4.5 * 0.9) / 5.3);
  const px = fitPx(g, ["PETRIFIED", "FOREST"], fam, usable, 330, 0.9);
  engraveLine(g, "PETRIFIED", W / 2, 236, px, fam, "#f1e2c0", 0.9);
  engraveLine(g, "FOREST", W / 2, 548, px, fam, "#f1e2c0", 0.9);
  g.fillStyle = "rgba(241,226,192,0.85)"; g.fillRect(W * 0.3, 690, W * 0.4, 7);
  for (const [x, c] of [[W * 0.3 - 70, "#c84a3a"], [W * 0.7 + 70, "#e8893a"]] as const) { // two tiny log-slice rounds at the rule ends
    g.fillStyle = "#5e4636"; g.beginPath(); g.ellipse(x, 694, 40, 34, 0, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.ellipse(x, 694, 30, 25, 0, 0, TAU); g.fill();
    g.fillStyle = "#f2c64a"; g.beginPath(); g.ellipse(x - 4, 690, 12, 10, 0, 0, TAU); g.fill(); }
});
/** kiosk map board: painted trail map with YOU ARE HERE */
export const kioskMapTex = () => ptex("atKioskMap", 1024, 768, (g, r) => {
  const W = 1024, H = 768;
  g.fillStyle = "#efe4cc"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#4e3420"; g.fillRect(0, 0, W, 120);
  textLine(g, "TRAIL MAP", W / 2, 62, 78, "Georgia, serif", "#f5ead2", 1, false);
  for (let i = 0; i < 9; i++) { g.fillStyle = pick(r, ["#b9a6cf", "#a9b9d6", "#e6c3a6"]); g.beginPath(); g.ellipse(U(r, 80, W - 80), U(r, 200, H - 80), U(r, 50, 120), U(r, 30, 70), U(r, 0, 3), 0, TAU); g.fill(); }
  g.setLineDash([18, 12]); g.strokeStyle = "#8a3a2a"; g.lineWidth = 9; g.lineCap = "round";
  g.beginPath(); g.moveTo(520, 700); g.bezierCurveTo(420, 560, 640, 430, 520, 300); g.bezierCurveTo(460, 220, 300, 230, 220, 180); g.stroke();
  g.beginPath(); g.moveTo(520, 560); g.bezierCurveTo(700, 520, 800, 420, 880, 320); g.stroke(); g.setLineDash([]);
  for (let i = 0; i < 12; i++) { g.fillStyle = "#c84a3a"; g.fillRect(U(r, 200, 900), U(r, 200, 650), 26, 8); }
  g.fillStyle = "#d8342c"; g.beginPath(); g.arc(520, 690, 20, 0, TAU); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 5; g.stroke();
  textLine(g, "YOU ARE HERE", 720, 700, 40, "Tahoma, sans-serif", "#3a2414", 1, false);
});
/** bin label (TRASH / RECYCLE) */
export const binTex = (label: string, col: string) => ptex("atBin" + label, 512, 512, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(r() * 512, r() * 512, 3, 3); }
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x, 0, 6, 512); g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x + 6, 0, 3, 512); }
  g.fillStyle = "#f4f1ea"; rr(g, 50, 170, 412, 130, 14); g.fill();
  const px = fitPx(g, [label], "Tahoma, Verdana, sans-serif", 360, 96);
  textLine(g, label, 256, 236, px, "Tahoma, Verdana, sans-serif", "#2a2a2a", 1, false);
});
/** "PERMISSION GRANTED" rubber-stamp mark: red ink with rough, broken edges (transparent background) */
export const stampMarkTex = () => ptex("atStampMark", 1024, 600, (g, r) => {
  const W = 1024, H = 600, red = "#cf1f2a";
  g.clearRect(0, 0, W, H);
  const fam = "'Arial Black', Impact, Arial, sans-serif";
  // cream knock-out halo first (so the red letters separate from the black sign text under them)
  g.save(); g.lineJoin = "round"; g.strokeStyle = "rgba(246,236,214,0.92)";
  g.lineWidth = 46; rr(g, 30, 30, W - 60, H - 60, 40); g.stroke();
  for (const [s, y] of [["PERMISSION", 222], ["GRANTED", 398]] as const) {
    const px = fitPx(g, [s], fam, W - 200, 170, 0.92);
    g.save(); g.translate(W / 2, y); g.scale(0.92, 1); g.font = `bold ${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 22; g.strokeText(s, 0, 0); g.fillStyle = "rgba(246,236,214,0.92)"; g.fillText(s, 0, 0); g.restore();
  }
  g.restore();
  g.strokeStyle = red; g.lineWidth = 26; rr(g, 30, 30, W - 60, H - 60, 40); g.stroke();
  g.lineWidth = 8; rr(g, 66, 66, W - 132, H - 132, 24); g.stroke();
  for (const [s, y] of [["PERMISSION", 222], ["GRANTED", 398]] as const) {
    const px = fitPx(g, [s], fam, W - 200, 170, 0.92);
    textLine(g, s, W / 2, y, px, fam, red, 0.92, false);
  }
  g.globalCompositeOperation = "destination-out"; // uneven ink: specks, worn streaks, ragged edges
  for (let i = 0; i < 2600; i++) { const x = U(r, 0, W), y = U(r, 0, H), s = U(r, 1, 4.5); g.fillStyle = `rgba(0,0,0,${U(r, 0.4, 1)})`; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
  for (let i = 0; i < 26; i++) { const x = U(r, 0, W), y = U(r, 0, H), l = U(r, 40, 160); g.strokeStyle = `rgba(0,0,0,${U(r, 0.3, 0.7)})`; g.lineWidth = U(r, 2, 6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + U(r, -8, 8)); g.stroke(); }
  for (let i = 0; i < 6; i++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 60, 160), 1.6, "0,0,0", U(r, 0.15, 0.35));
  g.globalCompositeOperation = "source-over";
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
/** dust devil funnel: tan dust with 3-4 darker spiral bands and many fine light streaks, seamless in x; alpha fades
 *  out toward the top (v = 1) and is thickest near the base */
export const dustDevilTex = () => ptex("atDustDevil4", 512, 1024, (g, r) => { // audit A5 P2: ~2x denser (the vista devil was invisible)
  const W = 512, H = 1024;
  g.clearRect(0, 0, W, H);
  // audit A3: a soft noisy dust body with 3-4 broad blurred helix streaks (1.5 turns over the height) - the round-2 lattice
  // of 120 hair-thin spirals read as a wicker lampshade
  for (let i = 0; i < 80; i++) { const x = U(r, 0, W), y = H * (1 - Math.sqrt(r())), rad = U(r, 30, 90), a = U(r, 0.16, 0.28);
    wrap2(W, H, x, y, rad, (xx, yy) => blotch(g, xx, yy, rad, 1.6, "226,194,152", a)); }
  g.save(); g.filter = "blur(10px)"; g.lineCap = "round";
  for (let i = 0; i < 4; i++) { const x0 = (i / 4) * W + U(r, -30, 30), lw = U(r, 26, 44), dark = i % 2 === 0;
    for (const ox of [-W, 0, W]) { g.strokeStyle = dark ? "rgba(168,124,86,0.45)" : "rgba(246,224,190,0.42)"; g.lineWidth = lw; g.beginPath();
      for (let k = 0; k <= 48; k++) { const t = k / 48, x = x0 + ox - t * 1.5 * W, y = H - t * H; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); } }
  g.restore();
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(176,136,100,0.35)" : "rgba(250,232,206,0.35)"; const y = H * (1 - Math.sqrt(r())); g.fillRect(U(r, 0, W), y, 2, 2); }
  { const m = g.createLinearGradient(0, 0, 0, H); m.addColorStop(0, "rgba(0,0,0,0.6)"); m.addColorStop(0.35, "rgba(0,0,0,0.3)"); m.addColorStop(0.8, "rgba(0,0,0,0.05)"); m.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = m; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over"; }
});
/** dust devil ground skirt: a swirling ring of dust (alpha), radial */
export const devilSkirtTex = () => ptex("atDevilSkirt", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  const c = 256;
  for (let i = 0; i < 70; i++) { const a0 = r() * TAU, rad = U(r, 60, 230), span = U(r, 0.6, 2.2), a = U(r, 0.08, 0.22);
    g.strokeStyle = r() < 0.7 ? `rgba(226,192,150,${a})` : `rgba(160,118,84,${a})`; g.lineWidth = U(r, 6, 26); g.lineCap = "round";
    g.beginPath(); g.arc(c, c, rad, a0, a0 + span); g.stroke(); }
  const gr = g.createRadialGradient(c, c, 0, c, c, 250); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.7, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = gr; g.fillRect(0, 0, 512, 512); g.globalCompositeOperation = "source-over";
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
/** a small hand-lettered plank (cream paint on weathered wood) */
export const plankNoteTex = (key: string, text: string) => ptex("atPlankNote" + key, 512, 144, (g, r) => {
  g.fillStyle = "#9a7450"; g.fillRect(0, 0, 512, 144);
  for (let i = 0; i < 12; i++) grain(g, r, 512, U(r, 0, 512), U(r, 8, 136), U(r, 120, 400), U(r, 2, 5), U(r, 1.5, 3), "rgba(40,20,10,0.3)");
  g.strokeStyle = "#3a2414"; g.lineWidth = 6; g.strokeRect(3, 3, 506, 138);
  g.save(); g.translate(256, 76); g.rotate(-0.03); g.font = "bold 92px 'Trebuchet MS', Verdana, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  const w = g.measureText(text).width, k = Math.min(1, 470 / w); g.scale(k, 1);
  g.fillStyle = "rgba(30,14,6,0.6)"; g.fillText(text, 3, 4); g.fillStyle = "#f4ead2"; g.fillText(text, 0, 0); g.restore();
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
/** a heap of loose rainbow chips seen from above (bucket / crate fill): small angular pieces with dark edges, a few
 *  white paint dots (the marked chips), pale crystal flecks */
export const chipPileTex = () => ptex("atChipPile", 512, 512, (g, r) => {
  g.fillStyle = "#6a4a3a"; g.fillRect(0, 0, 512, 512);
  const CC = ["#d4503c", "#ee9444", "#f6d060", "#9a68b8", "#e8703c", "#f3e2c8", "#c84a3a", "#b070c0"];
  for (let i = 0; i < 260; i++) { const x = U(r, 0, 512), y = U(r, 0, 512), s = U(r, 12, 30), a = r() * TAU, n = 5 + Math.floor(r() * 3), col = pick(r, CC);
    const pts = Array.from({ length: n }, (_, k) => { const t = a + (k / n) * TAU + U(r, -0.3, 0.3), rr2 = s * U(r, 0.6, 1); return [x + Math.cos(t) * rr2, y + Math.sin(t) * rr2 * 0.8]; });
    wrap2(512, 512, x, y, s, (xx, yy) => { const o = [xx - x, yy - y]; g.fillStyle = "rgba(40,24,20,0.55)"; poly(g, pts, o[0] + 2, o[1] + 3); g.fill(); g.fillStyle = col; poly(g, pts, o[0], o[1]); g.fill();
      g.strokeStyle = "rgba(255,244,230,0.35)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(pts[0][0] + o[0], pts[0][1] + o[1]); g.lineTo(pts[1][0] + o[0], pts[1][1] + o[1]); g.stroke();
      if (i % 9 === 0) { g.fillStyle = "#fbf8f0"; g.beginPath(); g.arc(xx, yy, 3.2, 0, TAU); g.fill(); } }); }
  for (let i = 0; i < 400; i++) { g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(U(r, 0, 512), U(r, 0, 512), 1.5, 1.5); }
});
/** a speed line (white, tapered at both ends) */
export const speedTex = () => ptex("atSpeed", 256, 32, (g) => {
  g.clearRect(0, 0, 256, 32);
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.7, "rgba(255,255,255,0.95)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.beginPath(); g.ellipse(128, 16, 126, 6, 0, 0, TAU); g.fill();
});
/** drifting cloud shadows: soft lavender blobs (alpha), seamless, tiled over the floor */
export const cloudShadowTex = () => ptex("atCloudShadow", 1024, 1024, (g, r) => {
  g.clearRect(0, 0, 1024, 1024);
  for (let i = 0; i < 8; i++) { const cx = ((i % 4) + 0.5) * 256 + U(r, -60, 60), cy = (Math.floor(i / 4) + 0.5) * 512 + U(r, -120, 120);
    for (let k = 0; k < 14; k++) { const x = cx + U(r, -130, 130), y = cy + U(r, -80, 80), rad = U(r, 80, 170);
      wrap2(1024, 1024, x, y, rad, (xx, yy) => { const gr = g.createRadialGradient(xx, yy, 0, xx, yy, rad);
        gr.addColorStop(0, "rgba(255,255,255,0.8)"); gr.addColorStop(0.55, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(xx - rad, yy - rad, rad * 2, rad * 2); }); } }
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
/** a walking line of shoe prints along v (alpha decal, 256 x 1024 = 0.4 m x 1.6 m) */
export const footprintTex = () => ptex("atFeet", 256, 1024, (g, r) => {
  g.clearRect(0, 0, 256, 1024);
  for (let i = 0; i < 5; i++) {
    const x = 128 + (i % 2 ? 40 : -40) + U(r, -6, 6), y = 1024 - 110 - i * 200, rot = U(r, -0.12, 0.12);
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = "rgba(128,80,54,0.42)"; g.beginPath(); g.ellipse(0, -30, 26, 42, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, 44, 21, 26, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(250,224,196,0.35)"; g.beginPath(); g.ellipse(-3, -34, 18, 30, 0, 0, TAU); g.fill();
    g.strokeStyle = "rgba(110,66,44,0.35)"; g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-18, -54 + k * 14); g.lineTo(18, -54 + k * 14); g.stroke(); }
    g.restore();
  }
});
/** the pale dust "outline" a lifted chip leaves (alpha decal) */
export const divotTex = () => ptex("atDivot", 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = "rgba(246,222,192,0.75)"; g.beginPath(); g.ellipse(64, 64, 42, 30, 0.3, 0, TAU); g.fill();
  g.strokeStyle = "rgba(120,76,52,0.5)"; g.lineWidth = 5; g.beginPath(); g.ellipse(64, 64, 46, 34, 0.3, 0, TAU); g.stroke();
});
/** a dropped tri-fold trail brochure */
export const brochureTex = () => ptex("atBrochure", 512, 256, (g, r) => {
  g.fillStyle = "#f4efe2"; g.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 3; k++) { const x = k * 171; g.fillStyle = ["#8a3a2a", "#3e6aa0", "#6e7a3a"][k]; g.fillRect(x + 10, 12, 150, 40);
    g.fillStyle = "rgba(255,255,255,0.85)"; g.font = "bold 24px Tahoma, Arial"; g.textAlign = "center"; g.fillText(["TRAIL", "GUIDE", "MAP"][k], x + 85, 41);
    for (let l = 0; l < 6; l++) { g.fillStyle = "rgba(60,50,50,0.4)"; g.fillRect(x + 18, 70 + l * 26, U(r, 90, 140), 6); } }
  g.fillStyle = "rgba(120,100,80,0.35)"; g.fillRect(170, 0, 3, 256); g.fillRect(341, 0, 3, 256);
  g.fillStyle = "#c84a3a"; g.beginPath(); g.ellipse(430, 200, 40, 26, 0.4, 0, TAU); g.fill();
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
/** the stamp's rubber sole: dark red rubber #8E1E22, a raised border and MIRRORED raised type "PERMISSION GRANTED"
 *  wet with red ink (glossy streaks) - seen for 3 f before it whips over onto Sign B */
export const stampSoleTex = () => ptex("atStampSole", 1024, 576, (g, r) => {
  const W = 1024, H = 576;
  g.fillStyle = "#8e1e22"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? "rgba(40,6,8,0.18)" : "rgba(255,180,170,0.08)"; g.fillRect(U(r, 0, W), U(r, 0, H), 2, 2); }
  g.save(); g.translate(W, 0); g.scale(-1, 1); // mirrored, like real stamp type
  const raised = (draw: () => void) => { g.save(); g.translate(5, 6); g.fillStyle = "rgba(30,4,6,0.6)"; g.strokeStyle = "rgba(30,4,6,0.6)"; draw(); g.restore(); g.fillStyle = "#d0242c"; g.strokeStyle = "#d0242c"; draw(); };
  raised(() => { g.lineWidth = 22; rr(g, 40, 40, W - 80, H - 80, 30); g.stroke(); });
  const fam = "Impact, 'Arial Black', Arial";
  raised(() => { g.font = `bold 170px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("PERMISSION", W / 2, 205); g.fillText("GRANTED", W / 2, 380); });
  g.restore();
  g.strokeStyle = "rgba(255,220,214,0.45)"; g.lineWidth = 7; g.lineCap = "round"; // wet-ink gloss streaks
  for (const [x, y, l] of [[180, 140, 220], [620, 300, 260], [300, 430, 160], [760, 120, 140]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 14, x + l, y + 4); g.stroke(); }
});
/** small cream label with red caps on the stamp block's side */
export const stampLabelTex = () => ptex("atStampLabel", 1024, 160, (g) => {
  g.fillStyle = "#efe2c6"; g.fillRect(0, 0, 1024, 160); g.strokeStyle = "#b8282e"; g.lineWidth = 8; rr(g, 8, 8, 1008, 144, 16); g.stroke();
  const fam = "Impact, 'Arial Black', Arial", px = fitPx(g, ["PERMISSION GRANTED"], fam, 940, 110, 0.95);
  textLine(g, "PERMISSION GRANTED", 512, 86, px, fam, "#b8282e", 0.95, false);
});
/** stacked sandstone blocks with recessed mortar (entrance-sign piers): 512 px = 0.8 m, seamless */
export const sandstoneTex = () => ptex("atSandstone", 512, 512, (g, r) => {
  const S = 512, rows = 4, rh = S / rows;
  g.fillStyle = "#8c6a52"; g.fillRect(0, 0, S, S); // mortar
  for (let j = 0; j < rows; j++) {
    const n = 2, off = j % 2 ? S / 4 : 0;
    for (let i = -1; i < n + 1; i++) {
      const x = off + (i * S) / n, w = S / n, c = pick(r, ["#b98a63", "#c49470", "#a87a58", "#9c6e4e", "#c8a07a"]), k = r();
      const draw = (ox: number) => {
        g.fillStyle = c; rr(g, x + 6 + ox, j * rh + 6, w - 12, rh - 12, 10); g.fill();
        const gr = g.createLinearGradient(0, j * rh, 0, (j + 1) * rh); gr.addColorStop(0, "rgba(255,236,206,0.22)"); gr.addColorStop(0.5, "rgba(255,236,206,0)"); gr.addColorStop(1, "rgba(70,40,30,0.25)");
        g.fillStyle = gr; rr(g, x + 6 + ox, j * rh + 6, w - 12, rh - 12, 10); g.fill();
        if (k < 0.5) { g.strokeStyle = "rgba(90,56,40,0.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x + w * 0.3 + ox, j * rh + 14); g.lineTo(x + w * 0.36 + ox, j * rh + rh * 0.5); g.lineTo(x + w * 0.31 + ox, j * rh + rh - 16); g.stroke(); }
      };
      for (const ox of [-S, 0, S]) draw(ox);
    }
  }
  for (let i = 0; i < 6000; i++) { g.fillStyle = r() < 0.5 ? "rgba(80,50,36,0.2)" : "rgba(255,240,214,0.22)"; g.fillRect(U(r, 0, S), U(r, 0, S), 2, 2); }
  for (let j = 0; j < 8; j++) { const y = U(r, 0, S); g.strokeStyle = "rgba(255,236,206,0.12)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + U(r, -6, 6)); g.stroke(); } // bedding lines
});
/** small cast-bronze plaque (no logo): "PETRIFIED FOREST / EST. 1962" in raised letters */
export const bronzeTex = () => ptex("atBronze", 512, 320, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 512, 320); gr.addColorStop(0, "#9a7438"); gr.addColorStop(0.5, "#7a5a2a"); gr.addColorStop(1, "#5e4420");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
  for (let i = 0; i < 1200; i++) { g.fillStyle = r() < 0.5 ? "rgba(40,60,50,0.14)" : "rgba(255,230,170,0.12)"; g.fillRect(U(r, 0, 512), U(r, 0, 320), 2, 2); }
  g.strokeStyle = "#d8b26a"; g.lineWidth = 10; rr(g, 16, 16, 480, 288, 18); g.stroke();
  const fam = "Georgia, 'Times New Roman', serif";
  textLine(g, "PETRIFIED", 256, 128, 78, fam, "#f0d08a", 0.95, false); textLine(g, "FOREST", 256, 210, 78, fam, "#f0d08a", 0.95, false);
  textLine(g, "EST. 1962", 256, 272, 36, fam, "#e0c07a", 1, false);
});
/** a yellow numbered evidence-style tent marker face */
export const tentTex = (n: string) => ptex("atTent" + n, 256, 256, (g) => {
  g.fillStyle = "#f2c230"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#2a2030"; g.lineWidth = 10; g.strokeRect(10, 10, 236, 236);
  g.fillStyle = "#2a2030"; g.font = "bold 200px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n, 128, 140);
});
/** a hairline branching crack decal for paving (alpha) */
export const crackLineTex = () => ptex("atCrackLine", 512, 128, (g, r) => {
  g.clearRect(0, 0, 512, 128); g.lineCap = "round";
  let x = 10, y = 64; const pts: [number, number][] = [[x, y]];
  for (let k = 0; k < 14; k++) { x += U(r, 28, 40); y += U(r, -12, 12); pts.push([x, Math.max(14, Math.min(114, y))]); }
  for (const [col, lw, o] of [["rgba(240,228,210,0.45)", 3, 1.5], ["rgba(60,46,40,0.8)", 2.2, 0]] as const) {
    g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px + o, py + o) : g.moveTo(px + o, py + o))); g.stroke();
    for (const k of [4, 9]) { const [bx, by] = pts[k]; g.beginPath(); g.moveTo(bx + o, by + o); g.lineTo(bx + 30 + o, by + (k % 2 ? 26 : -26) + o); g.lineTo(bx + 52 + o, by + (k % 2 ? 34 : -38) + o); g.stroke(); }
  }
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
/** carved heart + initials on a post (alpha: groove lines only) */
export const carveTex = () => ptex("atCarve", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.lineCap = "round"; g.lineJoin = "round";
  const heart = (col: string, lw: number, o: number) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
    g.moveTo(128 + o, 196 + o); g.bezierCurveTo(40 + o, 140 + o, 40 + o, 60 + o, 96 + o, 64 + o); g.bezierCurveTo(116 + o, 66 + o, 124 + o, 80 + o, 128 + o, 92 + o);
    g.bezierCurveTo(132 + o, 80 + o, 140 + o, 66 + o, 160 + o, 64 + o); g.bezierCurveTo(216 + o, 60 + o, 216 + o, 140 + o, 128 + o, 196 + o); g.stroke(); };
  heart("rgba(255,226,190,0.4)", 7, 3); heart("rgba(36,18,8,0.8)", 7, 0);
  g.font = "bold 56px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "rgba(255,226,190,0.4)"; g.fillText("J+K", 131, 133); g.fillStyle = "rgba(36,18,8,0.8)"; g.fillText("J+K", 128, 130);
});
/** the US flag on the park flagpole (simplified: 13 stripes, a blue canton with a 6 x 5 grid of white stars; no NPS
 *  emblem). Round 1's banded rust / cream / brown park flag read as a foreign national tricolour once graded. */
export const flagTex = () => ptex("atFlagUS", 256, 160, (g) => {
  const sh = 160 / 13;
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f4efe6" : "#b8282e"; g.fillRect(0, Math.floor(i * sh), 256, Math.ceil(sh) + 1); }
  const cw = 115, ch = Math.round(sh * 7); // canton 45 % of the fly, 54 % of the hoist (reads blue at phone size)
  g.fillStyle = "#2b3a78"; g.fillRect(0, 0, cw, ch);
  g.fillStyle = "#f4efe6";
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
    const x = 9 + c * 17 + (r % 2 ? 8 : 0), y = 9 + r * 16.5;
    if (x > cw - 6) continue;
    star(g, x, y, 4.2);
  }
});
const star = (g: CanvasRenderingContext2D, x: number, y: number, R: number) => {
  g.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? R * 0.42 : R; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
  g.closePath(); g.fill();
};
/** label sticker (bucket / box) */
export const labelTex = (key: string, text: string, bg: string, fg: string) => ptex("atLabel" + key, 512, 192, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 512, 192); g.strokeStyle = fg; g.lineWidth = 8; rr(g, 10, 10, 492, 172, 14); g.stroke();
  const px = fitPx(g, [text], "Impact, 'Arial Black', Arial", 440, 130, 0.95);
  textLine(g, text, 256, 100, px, "Impact, 'Arial Black', Arial", fg, 0.95, false);
});
/** tan canvas tarp with folds, grommets and dust */
export const tarpTex = () => ptex("atTarpTex2", 512, 512, (g, r) => {
  // audit A2: tan canvas #C9B28A (was a flat lavender-grey board): 5 big painted fold shadows with lit ridges, weave
  g.fillStyle = "#c9b28a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { const y = U(r, 0, 512); g.fillStyle = r() < 0.5 ? "rgba(120,96,60,0.10)" : "rgba(255,246,226,0.10)"; g.fillRect(0, y, 512, 1); }
  for (let i = 0; i < 5; i++) { // folds: a soft dark wedge with a lit lip on its upper side, hanging from the rope line
    const x0 = 50 + i * 100 + U(r, -24, 24), x1 = x0 + U(r, -70, 70), w = U(r, 16, 30);
    const gr = g.createLinearGradient(x0 - w, 0, x0 + w, 0); gr.addColorStop(0, "rgba(96,70,40,0)"); gr.addColorStop(0.55, "rgba(96,70,40,0.42)"); gr.addColorStop(1, "rgba(96,70,40,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w, 40); g.lineTo(x0 + w, 40); g.lineTo(x1 + w * 1.4, 512); g.lineTo(x1 - w * 1.4, 512); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,244,220,0.4)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - w * 0.9, 40); g.lineTo(x1 - w * 1.3, 512); g.stroke();
  }
  for (let i = 0; i < 10; i++) { const x = U(r, 0, 512), a = U(r, -0.3, 0.3); g.strokeStyle = r() < 0.5 ? "rgba(90,66,40,0.18)" : "rgba(255,240,210,0.16)"; g.lineWidth = U(r, 2, 6);
    g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + U(r, -40, 40), 256, x + Math.tan(a) * 512, 512); g.stroke(); }
  for (let i = 0; i < 6; i++) blotch(g, U(r, 0, 512), U(r, 300, 512), U(r, 40, 110), 1.8, "150,104,70", 0.12); // red dust low down
  for (let i = 0; i < 2500; i++) { g.fillStyle = r() < 0.5 ? "rgba(90,66,40,0.12)" : "rgba(255,245,225,0.14)"; g.fillRect(U(r, 0, 512), U(r, 0, 512), 2, 2); }
  g.strokeStyle = "rgba(110,80,46,0.6)"; g.lineWidth = 5; g.setLineDash([12, 9]); g.strokeRect(14, 14, 484, 484); g.setLineDash([]);
  for (const [x, y] of [[26, 26], [486, 26], [26, 486], [486, 486], [256, 22], [256, 490]]) { g.fillStyle = "#8a8a86"; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.fillStyle = "#5a4a36"; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(255,240,215,0.12)"); gr.addColorStop(1, "rgba(120,80,50,0.18)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
});
/** the manila "TIMES STOLEN: 1" tag (frame-0 rewatch clue) */
export const tinyTagTex = () => ptex("atTinyTag", 256, 128, (g) => {
  g.fillStyle = "#e9d39a"; rr(g, 4, 4, 248, 120, 14); g.fill(); g.strokeStyle = "#8a6a3a"; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#6a4a2a"; g.beginPath(); g.arc(28, 64, 10, 0, TAU); g.fill();
  g.fillStyle = "#3a2414"; g.font = "bold 34px Arial"; g.textAlign = "center"; g.fillText("TIMES", 150, 52); g.fillText("STOLEN: 1", 140, 94);
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
/** tumbleweed tangle (alpha cut-out), seamless around a sphere */
/** audit A4 P2 (the weed read as a near-black ball of wire): straw #C9A66B strands with darker #8A6A3E inner strands
 *  and pale sun-bleached tips at ~60 % of the old density (sky shows through), alpha cut-out */
export const tumbleTex = () => ptex("atTumble2", 512, 256, (g, r) => {
  g.clearRect(0, 0, 512, 256); g.lineCap = "round";
  for (let i = 0; i < 104; i++) {
    const inner = i < 34, x = U(r, 0, 512), y = U(r, 10, 246), rad = U(r, 10, 40), a0 = r() * TAU, a1 = a0 + U(r, 1, 2.6);
    const c = inner ? pick(r, ["#8a6a3e", "#9a7a4a", "#7e603a"]) : pick(r, ["#c9a66b", "#d6b67c", "#bf9c62", "#e2c894", "#cfae72"]), lw = U(r, 2.2, inner ? 3.4 : 4.2);
    wrap2(512, 256, x, y, rad, (xx, yy) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.arc(xx, yy, rad, a0, a1); g.stroke(); });
  }
});

/** drifted sand on paving (alpha decal): soft tongues of red sand with ripple lines and grit */
export const driftTex = (i: number) => ptex("atDrift" + i, 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  for (let k = 0; k < 9; k++) { const x = U(r, 120, 392), y = U(r, 120, 392), rad = U(r, 50, 150);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(202,150,120,0.85)"); gr.addColorStop(0.6, "rgba(202,150,120,0.45)"); gr.addColorStop(1, "rgba(202,150,120,0)"); // round 7: cooler dusty red-tan (it rendered C ~42 under the warm noon key)
    g.save(); g.translate(x, y); g.scale(1.6, 0.7); g.translate(-x, -y); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
  g.globalCompositeOperation = "source-atop";
  for (let k = 0; k < 30; k++) { const y = U(r, 60, 452), x = U(r, 60, 300), len = U(r, 60, 200); g.strokeStyle = "rgba(236,210,184,0.5)"; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y + U(r, -8, 8), x + len, y); g.stroke(); }
  for (let k = 0; k < 1200; k++) { g.fillStyle = r() < 0.5 ? "rgba(140,88,56,0.6)" : "rgba(246,214,176,0.6)"; g.fillRect(U(r, 0, 512), U(r, 0, 512), 2, 2); }
  g.globalCompositeOperation = "source-over";
});
/** audit A5 P2 shot 10: Sign A's red circle-and-bar alone (transparent), for the "no!" pulse overlay. 256 px = 0.26 m,
 *  drawn at testSignTex's scale (circle r 100 / stroke 30 / bar +-70 of 1024 px on the 0.92 m face) */
export const circleBarTex = () => ptex("atCircleBar", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); const k = 256 / ((0.26 * 1024) / 0.92);
  g.strokeStyle = "#d8342c"; g.lineWidth = 30 * k; g.lineCap = "butt";
  g.beginPath(); g.arc(128, 128, 100 * k, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(128 - 70 * k, 128 - 70 * k); g.lineTo(128 + 70 * k, 128 + 70 * k); g.stroke();
});
/** audit A5 P2 heat shimmer: a pale, wavering mirage band (horizontal streaks of reflected sky, soft top and bottom),
 *  scrolled and wobbled per frame along the far floor in front of the badlands. 1024 x 64, alpha */
export const mirageTex = () => ptex("atMirage", 1024, 64, (g, r) => {
  g.clearRect(0, 0, 1024, 64);
  for (let i = 0; i < 70; i++) { const y = U(r, 8, 56), x = U(r, -100, 1024), w = U(r, 60, 320), h = U(r, 1.2, 3.4), a = U(r, 0.18, 0.5);
    wrapX(1024, x, w, (xx) => { const gr = g.createLinearGradient(xx, 0, xx + w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(xx, y, w, h); }); }
  g.globalCompositeOperation = "destination-in";
  const v = g.createLinearGradient(0, 0, 0, 64); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(0.35, "rgba(0,0,0,1)"); v.addColorStop(0.75, "rgba(0,0,0,1)"); v.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = v; g.fillRect(0, 0, 1024, 64); g.globalCompositeOperation = "source-over";
});
/** a dropped TALLY sheet on a clipboard-less page: header, grid of tick marks (shot 8 foreground) */
export const tallyTex = () => ptex("atTally", 384, 512, (g, r) => {
  g.fillStyle = "#f6f1e4"; g.fillRect(0, 0, 384, 512);
  g.fillStyle = "#3a2c22"; g.font = "bold 46px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.fillText("TALLY", 192, 62);
  g.strokeStyle = "rgba(60,90,150,0.45)"; g.lineWidth = 2; for (let y = 96; y < 500; y += 34) { g.beginPath(); g.moveTo(24, y); g.lineTo(360, y); g.stroke(); }
  g.strokeStyle = "rgba(40,30,30,0.85)"; g.lineWidth = 3.5;
  for (let row = 0; row < 11; row++) { const n = 2 + Math.floor(r() * 9), y = 96 + row * 34 + 6;
    for (let k = 0; k < n; k++) { const x = 40 + k * 14 + Math.floor(k / 5) * 12; if (k % 5 === 4) { g.beginPath(); g.moveTo(x - 58, y + 22); g.lineTo(x + 2, y + 2); g.stroke(); } else { g.beginPath(); g.moveTo(x, y); g.lineTo(x + U(r, -2, 2), y + 24); g.stroke(); } } }
  for (let i = 0; i < 9; i++) blotch(g, U(r, 0, 384), U(r, 0, 512), U(r, 20, 70), 1.4, "150,110,70", 0.06);
});
/** prickly-pear pad: a flat oval, sage-green with areoles (spine dots) and a faint rim */
export const pearPadTex = () => ptex("atPearPad", 256, 256, (g, r) => {
  g.fillStyle = "#6f8a4e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12; i++) blotch(g, U(r, 0, 256), U(r, 0, 256), U(r, 30, 90), 1.4, r() < 0.5 ? "60,80,40" : "200,220,160", 0.12);
  for (let y = 20; y < 256; y += 30) for (let x = 14 + ((y / 30) % 2) * 15; x < 256; x += 30) { g.fillStyle = "#e8dcb0"; g.beginPath(); g.arc(x + U(r, -3, 3), y + U(r, -3, 3), 2.6, 0, TAU); g.fill(); g.fillStyle = "#5a4a2a"; g.beginPath(); g.arc(x + 1, y + 1, 1.2, 0, TAU); g.fill(); }
});
/** audit A5 ADD (shot 9: the midground between the signs was only chips): rabbitbrush - a rounded clump of slender
 *  grey-green stems topped by golden-yellow flower tufts (#E8C23A / #F2D45A), ink-outlined like the sage cards */
export const rabbitTex = () => ptex("atRabbit", 512, 512, (g, r) => {
  const S = 512; g.clearRect(0, 0, S, S); g.lineCap = "round";
  const bx = S / 2, by = S - 6, stems: number[][] = [];
  for (let k = 0; k < 26; k++) { const a = -Math.PI / 2 + ((k / 25) - 0.5) * 1.9 + U(r, -0.08, 0.08), L = U(r, 260, 380) * (1 - 0.3 * Math.abs((k / 25) - 0.5));
    stems.push([bx + U(r, -14, 14), by, bx + Math.cos(a) * L, by + Math.sin(a) * L * 0.95]); }
  for (const [lw, col] of [[7, "#2a1a26"], [3, "#7f8f6a"]] as const) { g.strokeStyle = col; g.lineWidth = lw;
    for (const [x0, y0, x1, y1] of stems) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + U(r, -10, 10), (y0 + y1) / 2, x1, y1); g.stroke(); } }
  // narrow leaves along the stems
  for (const [x0, y0, x1, y1] of stems) for (let j = 0; j < 5; j++) { const t = U(r, 0.25, 0.85), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    g.fillStyle = "#2a1a26"; g.beginPath(); g.ellipse(x, y, 9, 3.4, U(r, -1, 1), 0, TAU); g.fill();
    g.fillStyle = pick(r, ["#8fa07a", "#9aab84", "#7e9070"]); g.beginPath(); g.ellipse(x, y, 7, 2.2, U(r, -1, 1), 0, TAU); g.fill(); }
  // flower tufts: overlapping golden puffs at the stem tips, a darker ochre underside and pale highlights
  for (const [, , x1, y1] of stems) { const R = U(r, 16, 26);
    g.fillStyle = "#2a1a26"; g.beginPath(); g.ellipse(x1, y1, R + 3, R * 0.75 + 3, 0, 0, TAU); g.fill();
    for (let k = 0; k < 9; k++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.8, up = Math.sin(a) < 0;
      g.fillStyle = up ? pick(r, ["#f2d45a", "#f6de74"]) : pick(r, ["#e8c23a", "#c9a02e"]); g.beginPath(); g.arc(x1 + Math.cos(a) * d, y1 + Math.sin(a) * d * 0.7, U(r, 5, 9), 0, TAU); g.fill(); }
    g.fillStyle = "rgba(255,250,214,0.7)"; g.beginPath(); g.arc(x1 - R * 0.25, y1 - R * 0.3, R * 0.22, 0, TAU); g.fill(); }
});
/** a yucca rosette's leaf: a long dagger blade, dark green at the base to a paler olive tip, a cream edge thread */
export const yuccaLeafTex = () => ptex("atYuccaLeaf", 64, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, "#41593a"); gr.addColorStop(0.6, "#5f7d4a"); gr.addColorStop(1, "#9aa86a");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  g.fillStyle = "rgba(236,228,190,0.55)"; g.fillRect(0, 0, 4, 256); g.fillRect(60, 0, 4, 256);
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(30,40,24,0.18)"; g.fillRect(U(r, 14, 50), 0, 2, 256); }
});

// ======================================== round 5b (audit A5 ADD / P3) ========================================
/** a park wayside exhibit panel: cream face, dark brown border + text, a small rainbow log-slice icon on the left
 *  (the shot-2 "PLEASE DO NOT REMOVE PETRIFIED WOOD" panel that sets up the irony) */
export const waysideTex = (key: string, lines: string[], w: number, h: number, icon: "log" | "trail" = "log") => ptex("atWayside" + key, Math.round(w * 1100), Math.round(h * 1100), (g, r) => {
  const W = Math.round(w * 1100), H = Math.round(h * 1100);
  g.fillStyle = "#4a2e1c"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#efe2c4"; rr(g, 16, 16, W - 32, H - 32, 14); g.fill();
  for (let i = 0; i < 30; i++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 30, 90), 1.6, r() < 0.5 ? "150,110,70" : "255,250,236", 0.06);
  g.strokeStyle = "#7a4e2c"; g.lineWidth = 6; rr(g, 34, 34, W - 68, H - 68, 10); g.stroke();
  const ic = H * 0.22, cx = 44 + ic * 1.05, cy = H / 2;
  if (icon === "log") { // icon: a sliced log end (bark rim, red / orange / yellow / purple rings, white flecks)
    for (const [rad, col] of [[1, "#6e4a36"], [0.86, "#8a5aa8"], [0.72, "#c84a3a"], [0.52, "#e8893a"], [0.3, "#f2c64a"]] as const) {
      g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, ic * rad, ic * rad * 0.94, 0, 0, TAU); g.fill(); }
    for (let i = 0; i < 9; i++) { const a = U(r, 0, TAU), d = U(r, 0.2, 0.8) * ic; g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4, 4); }
  } else { // round 6 (audit A6 P3: the log disc read as Sign A's no-symbol): a hiker on a trail + a direction arrow, brown on cream
    g.fillStyle = "#4a2e1c"; g.strokeStyle = "#4a2e1c"; g.lineCap = "round"; g.lineJoin = "round";
    const s = ic * 1.7, bx = cx - ic * 0.25, by = cy + ic * 0.85;
    g.beginPath(); g.arc(bx + s * 0.06, by - s * 0.92, s * 0.1, 0, TAU); g.fill();                                   // head
    g.lineWidth = s * 0.12; g.beginPath(); g.moveTo(bx + s * 0.04, by - s * 0.78); g.lineTo(bx - s * 0.04, by - s * 0.4); g.stroke(); // torso
    g.lineWidth = s * 0.09; g.beginPath(); g.moveTo(bx - s * 0.04, by - s * 0.4); g.lineTo(bx - s * 0.22, by); g.moveTo(bx - s * 0.04, by - s * 0.4); g.lineTo(bx + s * 0.16, by - s * 0.02); g.stroke();
    g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(bx + s * 0.03, by - s * 0.7); g.lineTo(bx + s * 0.24, by - s * 0.5); g.lineTo(bx + s * 0.3, by - s * 0.02); g.stroke(); // arm + walking stick
    g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(bx - s * 0.5, by + s * 0.06); g.quadraticCurveTo(bx + s * 0.1, by - s * 0.02, bx + s * 0.6, by + s * 0.1); g.stroke(); // the trail
  }
  const fam = "Georgia, 'Times New Roman', serif", tx0 = cx + ic * 1.15, tw = W - tx0 - 44, pitch = (H - 80) / lines.length;
  const px = fitPx(g, lines, fam, tw, Math.round(pitch * 0.8), 0.86);
  lines.forEach((l, i) => textLine(g, l, tx0 + tw / 2, 40 + pitch * (i + 0.5), px, fam, "#4a2e1c", 0.86, false));
});
/** cholla joints: pale yellow-green with dense straw spines (they glow in the backlight) */
export const chollaTex = () => ptex("atCholla", 128, 256, (g, r) => {
  g.fillStyle = "#8f9a5c"; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 10; i++) blotch(g, U(r, 0, 128), U(r, 0, 256), U(r, 20, 50), 1.2, r() < 0.5 ? "90,100,50" : "220,220,150", 0.18);
  for (let i = 0; i < 520; i++) { const x = U(r, 0, 128), y = U(r, 0, 256); g.strokeStyle = r() < 0.7 ? "rgba(244,236,190,0.75)" : "rgba(120,100,60,0.5)"; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + U(r, -5, 5), y + U(r, -6, 2)); g.stroke(); }
});
/** a pale two-rut dirt track (alpha-feathered edges), u along the road */
export const dirtRoadTex = () => ptex("atDirtRoad", 512, 128, (g, r) => {
  g.clearRect(0, 0, 512, 128);
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(240,222,196,0)"); gr.addColorStop(0.22, "rgba(240,222,196,0.9)"); gr.addColorStop(0.78, "rgba(240,222,196,0.9)"); gr.addColorStop(1, "rgba(240,222,196,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 128);
  for (const y of [40, 88]) { g.fillStyle = "rgba(150,104,74,0.6)"; g.fillRect(0, y - 6, 512, 12); g.fillStyle = "rgba(250,232,206,0.35)"; g.fillRect(0, y + 5, 512, 3); }
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,100,70,0.25)" : "rgba(255,244,226,0.3)"; g.fillRect(U(r, 0, 512), U(r, 26, 102), U(r, 1, 4), U(r, 1, 3)); }
});
/** a soft horizontal haze band: dense at the bottom, fading up, feathered at both ends (morning ground mist) */
export const mistBandTex = () => ptex("atMistBand", 512, 128, (g, r) => {
  g.clearRect(0, 0, 512, 128);
  for (let x = 0; x < 512; x += 2) { const e = Math.min(1, x / 90, (512 - x) / 90), k = 0.75 + 0.25 * Math.sin(x * 0.031 + 1.3) * Math.sin(x * 0.011);
    const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, `rgba(255,255,255,${0.95 * e * k})`); gr.addColorStop(0.45, `rgba(255,255,255,${0.5 * e * k})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x, 0, 2, 128); }
  for (let i = 0; i < 40; i++) blotch(g, U(r, 0, 512), U(r, 60, 128), U(r, 10, 40), 3, "255,255,255", 0.12);
});
/** a thin contrail: bright at the head (u = 1), widening and fading toward the tail */
export const contrailTex = () => ptex("atContrail", 1024, 32, (g) => {
  g.clearRect(0, 0, 1024, 32);
  for (let x = 0; x < 1024; x += 2) { const u = x / 1024, a = Math.pow(u, 0.7) * (u > 0.985 ? (1 - u) / 0.015 : 1), w = 3 + 9 * (1 - u);
    const gr = g.createLinearGradient(0, 16 - w, 0, 16 + w); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${0.9 * a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x, 16 - w, 2, 2 * w); }
});
/** a crushed paper coffee cup (white with a brown sleeve band), flattened oval seen from above */
export const cupTex = () => ptex("atCrushedCup", 256, 128, (g, r) => {
  g.fillStyle = "#f2eee6"; g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#9a6a44"; g.fillRect(90, 0, 70, 128);
  for (let i = 0; i < 26; i++) { g.strokeStyle = r() < 0.5 ? "rgba(120,100,90,0.35)" : "rgba(255,255,255,0.5)"; g.lineWidth = U(r, 1, 3); g.beginPath(); const x = U(r, 0, 256), y = U(r, 0, 128); g.moveTo(x, y); g.lineTo(x + U(r, -40, 40), y + U(r, -30, 30)); g.stroke(); }
});

// ===================================== round 6 (WORLD-EXT, audit A6) =====================================
/** shot 4 "14 tons" heap: a dense cartoon pile of broken rainbow chips (angular, ringed, white flecks, dark seams) on a
 *  dusty brown ground, seamless, 1024 px = ~1.4 m */
export const heapTex = () => ptex("atHeap14b", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#5c5048"; g.fillRect(0, 0, S, S); // round 7 (audit A7 P3 "rubble / granola"): a darker bark-grey under-fill, ~40 % less of it shows
  // (round 6 look pass: fewer yellows, more reds / purples and bark-brown pieces, so the pile reads as broken logs)
  // round 7: + bark-grey inked chunks (#8A8078 / #6E6660 / #9A8E84) so it reads as broken petrified logs
  const CC = ["#c84a3a", "#de863e", "#ecc04e", "#8a5aa8", "#d2603a", "#b04a40", "#a8508a", "#8a8078", "#6e6660", "#9a8e84", "#e09c44", "#7a5a44"];
  for (let i = 0; i < 760; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 14, 40), a = r() * TAU, n = 5 + Math.floor(r() * 3), col = pick(r, CC), col2 = pick(r, CC), rim = r() < 0.55;
    const pts = Array.from({ length: n }, (_, k) => { const t = a + (k / n) * TAU + U(r, -0.3, 0.3), rr2 = s * U(r, 0.6, 1); return [x + Math.cos(t) * rr2, y + Math.sin(t) * rr2 * 0.85]; });
    const ra = r() * TAU, fl = Math.floor(r() * 4);
    wrap2(S, S, x, y, s * 1.2, (xx, yy) => {
      const ox = xx - x, oy = yy - y;
      g.fillStyle = "rgba(40,22,26,0.6)"; poly(g, pts, ox + 2.5, oy + 3.5); g.fill();            // contact shadow
      g.fillStyle = col; poly(g, pts, ox, oy); g.fill();
      g.save(); poly(g, pts, ox, oy); g.clip();                                                    // a ring band across the face
      g.strokeStyle = col2; g.lineWidth = s * 0.35; g.beginPath(); g.arc(xx + Math.cos(ra) * s * 1.2, yy + Math.sin(ra) * s * 1.2, s * 1.05, 0, TAU); g.stroke();
      g.strokeStyle = "rgba(60,30,30,0.3)"; g.lineWidth = 2; g.beginPath(); g.arc(xx + Math.cos(ra) * s * 1.2, yy + Math.sin(ra) * s * 1.2, s * 0.85, 0, TAU); g.stroke();
      if (rim) { g.strokeStyle = "#5e4636"; g.lineWidth = s * 0.3; poly(g, pts, ox, oy); g.stroke(); }  // a bark edge
      g.restore();
      g.strokeStyle = "rgba(42,26,24,0.8)"; g.lineWidth = 2.2; poly(g, pts, ox, oy); g.stroke();      // ink seam
      g.strokeStyle = "rgba(255,244,230,0.45)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(pts[0][0] + ox, pts[0][1] + oy); g.lineTo(pts[1][0] + ox, pts[1][1] + oy); g.stroke(); // lit edge
      for (let k = 0; k < fl; k++) { g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(xx + (k - 1.5) * s * 0.22, yy - s * 0.1 + k * 2, 1.6, 0, TAU); g.fill(); }
    });
  }
  for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.55)" : "rgba(40,22,26,0.3)"; g.fillRect(U(r, 0, S), U(r, 0, S), 1.6, 1.6); }
});
/** the heap's summit pennant: cream cloth, red "14 TONS" */
export const heapFlagTex = () => ptex("atHeapFlag", 512, 256, (g) => {
  g.fillStyle = "#f2e6cc"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#c8342c"; g.lineWidth = 14; g.strokeRect(10, 10, 492, 236);
  const fam = "Impact, 'Arial Black', Arial", px = fitPx(g, ["14 TONS"], fam, 440, 150, 0.95);
  textLine(g, "14 TONS", 256, 136, px, fam, "#c8342c", 0.95, false);
});
/** round 6 (audit A6 P2 shot 7: the tarp read as a wooden crate): heavy tan canvas with deep fold shadows (lavender in
 *  the creases, lit ridges), a stitched hem, weave, red dust at the bottom. 512 x 1024 (taller than wide) */
export const tarpTex3 = () => ptex("atTarpTex4", 512, 1024, (g, r) => {
  const W = 512, H = 1024;
  const vg = g.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, "#d4bd94"); vg.addColorStop(1, "#bea47c"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 4000; i++) { const y = U(r, 0, H); g.fillStyle = r() < 0.5 ? "rgba(120,96,60,0.09)" : "rgba(255,246,226,0.09)"; g.fillRect(0, y, W, 1); }
  for (let i = 0; i < 2600; i++) { const x = U(r, 0, W); g.fillStyle = r() < 0.5 ? "rgba(120,96,60,0.05)" : "rgba(255,246,226,0.05)"; g.fillRect(x, 0, 1, H); }
  for (let i = 0; i < 7; i++) { // hanging folds from the rope line: a violet crease + a lit ridge, fanning toward the hem
    const x0 = 36 + i * 74 + U(r, -14, 14), x1 = x0 + (x0 - W / 2) * 0.25 + U(r, -20, 20), w = U(r, 12, 22);
    const gr = g.createLinearGradient(x0 - w, 0, x0 + w, 0); gr.addColorStop(0, "rgba(92,70,110,0)"); gr.addColorStop(0.5, "rgba(92,70,110,0.42)"); gr.addColorStop(1, "rgba(92,70,110,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w * 0.5, 150); g.lineTo(x0 + w * 0.5, 150); g.lineTo(x1 + w * 1.4, H); g.lineTo(x1 - w * 1.4, H); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,246,226,0.38)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - w * 0.7, 150); g.lineTo(x1 - w * 1.6, H); g.stroke();
  }
  for (const yy of [142, 784]) { const gr = g.createLinearGradient(0, yy - 40, 0, yy + 40); gr.addColorStop(0, "rgba(92,70,110,0)"); gr.addColorStop(0.5, "rgba(92,70,110,0.3)"); gr.addColorStop(1, "rgba(92,70,110,0)"); g.fillStyle = gr; g.fillRect(0, yy - 40, W, 80); } // gathers under the ropes
  for (let i = 0; i < 8; i++) blotch(g, U(r, 0, W), U(r, 700, H), U(r, 40, 120), 1.8, "150,104,70", 0.14); // red dust low down
  for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? "rgba(90,66,40,0.1)" : "rgba(255,245,225,0.12)"; g.fillRect(U(r, 0, W), U(r, 0, H), 2, 2); }
  g.strokeStyle = "rgba(110,80,46,0.65)"; g.lineWidth = 5; g.setLineDash([12, 9]); g.beginPath(); g.moveTo(0, H - 26); g.lineTo(W, H - 26); g.stroke(); g.setLineDash([]); // stitched hem
  for (const x of [40, 256, 472]) { g.fillStyle = "#8a8a86"; g.beginPath(); g.arc(x, H - 44, 9, 0, TAU); g.fill(); g.fillStyle = "#5a4a36"; g.beginPath(); g.arc(x, H - 44, 4, 0, TAU); g.fill(); }
});
/** a two-line card tag (cream, dark ink caps) */
export const tagTex2 = (key: string, lines: string[]) => ptex("atTag2" + key, 512, 256, (g) => {
  g.fillStyle = "#f4efe2"; g.fillRect(0, 0, 512, 256); g.strokeStyle = "#3a2414"; g.lineWidth = 8; rr(g, 10, 10, 492, 236, 16); g.stroke();
  g.fillStyle = "#8a6a3a"; g.beginPath(); g.arc(40, 128, 13, 0, TAU); g.fill();
  const fam = "Impact, 'Arial Black', Arial", px = fitPx(g, lines, fam, 400, 96, 0.92);
  lines.forEach((l, i) => textLine(g, l, 276, 128 + (i - (lines.length - 1) / 2) * px * 1.08, px, fam, "#3a2414", 0.92, false));
});
/** round 6 stamp sole (audit A6 P2): bright red rubber #B8262E, a raised border, MIRRORED raised PERMISSION GRANTED
 *  shining with wet ink (glossy streaks), seen as the stamp flips up off Sign B */
export const stampSoleTex2 = () => ptex("atStampSole2", 1024, 600, (g, r) => {
  const W = 1024, H = 600;
  g.fillStyle = "#b8262e"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? "rgba(60,8,12,0.16)" : "rgba(255,190,180,0.08)"; g.fillRect(U(r, 0, W), U(r, 0, H), 2, 2); }
  g.save(); g.translate(W, 0); g.scale(-1, 1);
  const raised = (draw: () => void) => { g.save(); g.translate(5, 7); g.fillStyle = "rgba(50,4,8,0.6)"; g.strokeStyle = "rgba(50,4,8,0.6)"; draw(); g.restore(); g.fillStyle = "#e2303a"; g.strokeStyle = "#e2303a"; draw(); };
  raised(() => { g.lineWidth = 24; rr(g, 40, 40, W - 80, H - 80, 30); g.stroke(); });
  const fam = "Impact, 'Arial Black', Arial";
  raised(() => { g.font = `bold 176px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("PERMISSION", W / 2, 215); g.fillText("GRANTED", W / 2, 400); });
  g.restore();
  g.strokeStyle = "rgba(255,226,220,0.55)"; g.lineWidth = 8; g.lineCap = "round";
  for (const [x, y, l] of [[170, 140, 240], [610, 310, 280], [290, 450, 170], [760, 120, 150], [120, 330, 90]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 14, x + l, y + 4); g.stroke(); }
});
/** a yellow survey tape measure ribbon with black tick marks + numbers (along u: 1 m per 256 px) */
export const tapeTex = () => ptex("atTape", 1024, 64, (g) => {
  g.fillStyle = "#f2c230"; g.fillRect(0, 0, 1024, 64); g.fillStyle = "#2a2018";
  for (let i = 0; i < 1024; i += 8) { const h = i % 256 === 0 ? 30 : i % 128 === 0 ? 22 : i % 32 === 0 ? 14 : 8; g.fillRect(i, 0, 2, h); }
  g.font = "bold 22px Arial"; for (let i = 0; i < 4; i++) g.fillText(String(i + 1), i * 256 + 10, 54);
});
/** orange / white striped barrier board with a label (RESEARCH AREA / TEST IN PROGRESS) */
export const barrierTex = (lines: string[]) => ptex("atBarrier" + lines.join("_"), 1024, 256, (g) => {
  for (let i = -4; i < 20; i++) { g.fillStyle = i % 2 ? "#f4f0e6" : "#e8662a"; g.beginPath(); g.moveTo(i * 80, 0); g.lineTo(i * 80 + 80, 0); g.lineTo(i * 80 + 80 - 120, 256); g.lineTo(i * 80 - 120, 256); g.closePath(); g.fill(); }
  g.fillStyle = "#f4f0e6"; rr(g, 150, 58, 724, 140, 14); g.fill(); g.strokeStyle = "#2a2018"; g.lineWidth = 6; g.stroke();
  const fam = "Impact, 'Arial Black', Arial", px = fitPx(g, lines, fam, 680, 110, 0.95);
  textLine(g, lines[0], 512, 136, px, fam, "#2a2018", 0.95, false);
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
/** round 6 (audit A6 P3 shot 3: "a long white box with one row of blue windows: a train carriage"): the visitor centre's
 *  adobe front - warm stucco #D9B48A with plaster mottling, a darker stone wainscot, THREE window groups (3 deep-set
 *  windows each, dark frames, warm-grey glass with a sky sheen), the entry doors in the middle, a viga shadow line.
 *  W x H metres (1 m = 80 px) */
export const vcFrontTex = (W: number, H: number) => ptex(`atVCfront_${W}_${H}`, Math.round(W * 80), Math.round(H * 80), (g, r) => {
  const PW = Math.round(W * 80), PH = Math.round(H * 80), m = 80;
  g.fillStyle = "#d9b48a"; g.fillRect(0, 0, PW, PH);
  for (let i = 0; i < 60; i++) blotch(g, U(r, 0, PW), U(r, 0, PH), U(r, 30, 120), 1.6, r() < 0.5 ? "190,150,110" : "236,206,170", 0.12);
  for (let i = 0; i < 6000; i++) { g.fillStyle = r() < 0.5 ? "rgba(150,110,80,0.12)" : "rgba(250,230,200,0.12)"; g.fillRect(U(r, 0, PW), U(r, 0, PH), 2, 2); }
  g.fillStyle = "#a8825e"; g.fillRect(0, PH - 0.7 * m, PW, 0.7 * m);                                   // stone wainscot
  for (let x = 0; x < PW; x += 0.5 * m) { g.fillStyle = "rgba(80,56,40,0.35)"; g.fillRect(x, PH - 0.7 * m, 2, 0.7 * m); }
  g.fillStyle = "rgba(80,56,40,0.45)"; g.fillRect(0, PH - 0.72 * m, PW, 4);
  g.fillStyle = "rgba(70,46,30,0.3)"; g.fillRect(0, 0, PW, 0.35 * m);                                   // viga shadow under the eave
  const win = (cx: number, top: number, w: number, h: number) => {
    g.fillStyle = "#5a3a26"; g.fillRect(cx - w / 2 - 6, top - 6, w + 12, h + 12);                     // deep-set frame
    const gr = g.createLinearGradient(0, top, 0, top + h); gr.addColorStop(0, "#9aa6b8"); gr.addColorStop(0.5, "#6e7486"); gr.addColorStop(1, "#4e5262"); g.fillStyle = gr; g.fillRect(cx - w / 2, top, w, h);
    g.fillStyle = "rgba(255,240,220,0.3)"; g.beginPath(); g.moveTo(cx - w / 2, top + h * 0.7); g.lineTo(cx - w / 2 + w * 0.5, top); g.lineTo(cx - w / 2 + w * 0.75, top); g.lineTo(cx - w / 2, top + h); g.fill(); // sky sheen
    g.fillStyle = "#5a3a26"; g.fillRect(cx - 3, top, 6, h); g.fillRect(cx - w / 2, top + h * 0.45, w, 5);  // mullions
    g.fillStyle = "#b89068"; g.fillRect(cx - w / 2 - 10, top + h + 6, w + 20, 10);                     // sill
  };
  const groups = [0.17, 0.5, 0.83];
  groups.forEach((gx, gi) => { const cx = gx * PW;
    if (gi === 1) { // the entry: double doors under a lintel
      g.fillStyle = "#4a2e1c"; g.fillRect(cx - 1.0 * m, PH - 2.4 * m, 2.0 * m, 2.4 * m - 0.02 * m);
      g.fillStyle = "#6e7486"; g.fillRect(cx - 0.9 * m, PH - 2.25 * m, 0.85 * m, 1.6 * m); g.fillRect(cx + 0.05 * m, PH - 2.25 * m, 0.85 * m, 1.6 * m);
      g.fillStyle = "#8a6a44"; g.fillRect(cx - 1.15 * m, PH - 2.6 * m, 2.3 * m, 0.2 * m);
      for (const dx of [-2.2, 2.2]) win(cx + dx * m, PH - 2.7 * m, 0.9 * m, 1.3 * m);
    } else for (const dx of [-1.25, 0, 1.25]) win(cx + dx * m, PH - 2.9 * m, 0.85 * m, 1.55 * m);
  });
});
/** a few distinct dry grass blades for a near-lens clump (straw, darker base, pale tips), alpha */
export const bladeTex = () => ptex("atBlades", 128, 512, (g) => {
  g.clearRect(0, 0, 128, 512);
  const gr = g.createLinearGradient(0, 512, 0, 0); gr.addColorStop(0, "#8a6a40"); gr.addColorStop(0.45, "#c9a466"); gr.addColorStop(1, "#f0dcae");
  g.fillStyle = gr; g.beginPath(); g.moveTo(44, 512); g.quadraticCurveTo(52, 260, 66, 0); g.quadraticCurveTo(70, 260, 84, 512); g.closePath(); g.fill();
  g.strokeStyle = "rgba(90,64,36,0.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 512); g.quadraticCurveTo(63, 260, 66, 6); g.stroke();
});

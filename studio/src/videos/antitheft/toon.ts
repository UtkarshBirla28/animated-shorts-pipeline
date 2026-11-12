// The cast of "The Anti-Theft Sign That Made People Steal": flat 2D cartoon cards drawn on a canvas, plus the 2D
// effect cards (thought bubbles, glint, sweat drop, the chip tag, chalk figures, flying ravens).
// Channel spec (study/CHANNEL_STYLE_BIBLE.md 4 + 13 D): bean heads ~30 % of the height, no neck / nose / ears, face fill
// #F8F3EE, dot eyes #2A2030 with a half-lid default, thick acting brows, a thick-thin plum outline (#2C1E2A) drawn
// into the art (thin lit side ~2.2 %, thick shadow side ~5.8 % of the head width), stick limbs ~5 % of the head width,
// ball hands, one saturated body colour + one signature item per character, soft painted crescent away from the key.
// Design space 600 x 1000 units, soles at y = 975 (1000 units = 2.16 m, cast.ts SU).
export const INK = "#2c1e2a";
export const SKIN = "#f8f3ee";
const EYE = "#2a2030";
const WHITE = "#ffffff";
const MOUTH = "#40101c";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.95, 0.92, 0.97]; // lavender far side on the pale face
const SH_CLOTH: C3 = [0.7, 0.68, 0.8];  // torsos: lit side -> far side ~0.7, lavender
const SH_FELT: C3 = [0.7, 0.68, 0.8];
export type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 10;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number, col = INK) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = col; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0, col = INK) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol, col);
  }
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM) */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.25) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
  text(s: string, x: number, y: number, size: number, col: string, font = "Arial Black", align: CanvasTextAlign = "center", ang = 0) {
    const g = this.g, [px, py] = this.P(x, y);
    g.save(); g.translate(px, py); if (ang || (this.rot && this.rot[0])) g.rotate(ang + (this.rot ? this.rot[0] : 0));
    g.font = `${Math.round(size)}px ${font}`; g.textAlign = align; g.textBaseline = "middle"; g.fillStyle = col; g.fillText(s, 0, 0);
    g.restore();
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

export const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };
/** superellipse "bean"; points run right -> down -> left -> up (clockwise on screen) */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};
/** the run of a closed contour that satisfies keep(), starting right after a dropped point (so it is contiguous) */
const keepRun = (pts: P2[], keep: (q: P2) => boolean) => {
  const n = pts.length, s = Math.max(0, pts.findIndex((q, i) => keep(q) && !keep(pts[(i + n - 1) % n])));
  return [...pts.slice(s), ...pts.slice(0, s)].filter(keep);
};

/** head: big round bean, W:H ~1.03, fuller jaw, slight egg toward the chin */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.95 + 0.06 * (rnd(seed, 1) - 0.5)),
  nTop: 2.0 + 0.25 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.25 * (rnd(seed, 3) - 0.5),
  egg: -0.08 + 0.05 * (rnd(seed, 4) - 0.5),
  asym: (0.04 + 0.03 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(5 * (rnd(seed, 7) - 0.5)), noise: 0.006, seed,
});
/** thickest outline direction: away from the light, pulled toward the ground */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);
/** outline base width in u (1 % of the head width): thin side 4 (1 - .45) = 2.2 %, thick side 5.8 % */
const OW = 4;

// ---------------- faces ----------------
export type Expr = "neutral" | "read" | "calm" | "proud" | "browsUp" | "wide" | "scheme" | "goggle" | "listen" | "guilty"
  | "whistle" | "nod" | "stern" | "grin" | "focus" | "aww" | "think" | "smile" | "shock" | "worry" | "smug"
  | "shifty" | "grimace" | "skeptic" | "effort" | "wince" | "smirk" | "uneasy" | "fair"
  | "gasp" | "knowing" | "content" | "ponder" | "hush" | "sheepish" | "dotSmirk" | "blow" | "plot" | "laugh" | "alert";
type EyeK = "dot" | "big" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "side" | "goggle" | "goggleHalf";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "o" | "O" | "wave" | "teeth" | "t0" | "t1" | "t2" | "pout" | "purse" | "smirk1";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), optional other brow, mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; brow2?: [number, number]; mouth: MouthK }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  read: { eye: ["dot", "dot"], brow: [-3, -3], mouth: "dash" },
  calm: { eye: ["lid", "lid"], brow: [0, -2], mouth: "smile" },
  proud: { eye: ["happy", "happy"], brow: [-2, -3], mouth: "smile" },
  browsUp: { eye: ["dot", "dot"], brow: [-7, -5], mouth: "o" },
  wide: { eye: ["big", "big"], brow: [-8, -7], mouth: "O" },
  scheme: { eye: ["lid", "lid"], brow: [4, -3], brow2: [-3, -6], mouth: "smirk" },
  // goggle-shock (A2): 1.4x white rings with tiny pupils, brows jumped high and arched, the grid-teeth grimace
  goggle: { eye: ["goggle", "goggle"], brow: [-11, -10], mouth: "teeth" },
  // quiet unease (the fiance BEFORE the shock): half-lids, knitted brows, wavy mouth, so the goggle swap reads as a jump
  uneasy: { eye: ["lid", "lid"], brow: [-4, 3], mouth: "wave" },
  // "fair enough": brows down and level, small closed smile
  fair: { eye: ["lid", "lid"], brow: [3, 2], mouth: "smirk" },
  listen: { eye: ["lid", "lid"], brow: [-1, -2], mouth: "dash" },
  guilty: { eye: ["small", "small"], brow: [-4, 2], mouth: "wave" },
  whistle: { eye: ["lid", "lid"], brow: [-3, -4], mouth: "purse" },
  nod: { eye: ["happy", "happy"], brow: [-1, -2], mouth: "smile" },
  stern: { eye: ["lid", "lid"], brow: [4, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  focus: { eye: ["lid", "lid"], brow: [2, -1], mouth: "pout" },
  aww: { eye: ["happy", "happy"], brow: [-4, 1], mouth: "smileWide" },
  think: { eye: ["lid", "lid"], brow: [1, -1], brow2: [-5, -6], mouth: "pout" },
  smile: { eye: ["dot", "dot"], brow: [-1, -2], mouth: "smile" },
  shock: { eye: ["shock", "shock"], brow: [-8, -7], mouth: "O" },
  worry: { eye: ["dot", "dot"], brow: [-5, 3], mouth: "wave" },
  smug: { eye: ["lid", "lid"], brow: [2, -3], mouth: "smirk" },
  // side-eye with eye whites (pupils pushed by `look`): the guilty glance / scheming dart (hook, student, tourists)
  shifty: { eye: ["side", "side"], brow: [4, -3], brow2: [-2, -6], mouth: "smirk1" },
  grimace: { eye: ["dot", "dot"], brow: [-5, 3], mouth: "teeth" },
  skeptic: { eye: ["lid", "lid"], brow: [3, -1], brow2: [-7, -9], mouth: "dash" },
  effort: { eye: ["squeeze", "squeeze"], brow: [5, -1], mouth: "o" },
  wince: { eye: ["squeeze", "squeeze"], brow: [-3, 2], mouth: "teeth" },
  // one-sided smirk, half-lid, left brow raised (the professor's knowing look)
  smirk: { eye: ["lid", "lid"], brow: [1, -2], brow2: [-6, -8], mouth: "smirk1" },
  // A3: a gasp (wide dot eyes, brows up, small "o"): the fiance's shot-4 reaction (the goggles stay exclusive to "now")
  gasp: { eye: ["big", "big"], brow: [-8, -7], mouth: "o" },
  // A5: alert (eyes widened, brows up, mouth still closed): the beat BEFORE the "o" (shot 4 "vandalized")
  alert: { eye: ["big", "big"], brow: [-7, -6], mouth: "dash" },
  // A3 professor: calm and respectful, never a V. knowing = screen-left brow arched ~10 deg, the other flat, half-lids,
  // small closed smile; content = ^^ eyes + flat relaxed brows; ponder = flat brows lifted 2 u, pursed thinking mouth
  knowing: { eye: ["lid", "lid"], brow: [-5, -8], brow2: [-1, -1], mouth: "smile" },
  content: { eye: ["happy", "happy"], brow: [-1, -1], mouth: "smile" },
  ponder: { eye: ["lid", "lid"], brow: [-2, -2], mouth: "pout" },
  // the whisper: half-lid side-eye toward the listener, one brow up, a sly closed smirk under the lip flaps
  hush: { eye: ["side", "side"], brow: [1, -2], brow2: [-4, -7], mouth: "smirk1" },
  // A4: the twice-thief's guilty grin (small worried eyes + the toothy D grin), the calm closed smirk with dot eyes that
  // dissolves into her reading face, the "o" blow on wet paint, the hook's scheming plot (one-sided smirk, half-lids, one
  // brow arched) and the red cap's belly laugh (^^ + open D)
  sheepish: { eye: ["small", "small"], brow: [-5, 2], mouth: "grin" },
  dotSmirk: { eye: ["dot", "dot"], brow: [-3, -3], mouth: "smirk1" },
  blow: { eye: ["lid", "lid"], brow: [-1, -2], mouth: "o" },
  plot: { eye: ["lid", "lid"], brow: [2, -1], brow2: [-6, -8], mouth: "smirk1" },
  laugh: { eye: ["happy", "happy"], brow: [-4, -4], mouth: "grin" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" || k === "big" || k === "side" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k === "goggle" ? "goggleHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" ? "dash" : lid > 0 ? halfLid(k) : k;

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, lookY: number, skin: string) => {
  const lx = x + look * 3.4 * u, ly = ey + lookY * 3.2 * u, lw = 3.4 * u;
  switch (kind) {
    case "side": { // A3 side-eye: a white almond under a thick lid, a BIG dot pupil pushed ~70 % toward the corner on the
      // look side (it stays mostly visible: it reads as a pupil, never a slit); the lid tips down toward the look side
      const s = Math.sign(look) || 1, m = Math.min(1, Math.abs(look) / 1.2), yl = ey - 1.8 * u, rx = 9.4 * u, ry = 7.4 * u;
      const cl = ellPts(x, yl, rx, ry, 0, 180, 0, 24).concat([[x - rx, yl - 1.2 * u], [x + rx, yl - 1.2 * u]]);
      p.poly(cl, WHITE, 0);
      p.clip(cl, () => p.dot(x + s * m * 0.7 * (rx - 3.6 * u), yl + 3.3 * u + clamp(lookY, -1, 1) * 1.1 * u, 4.4 * u, EYE));
      p.arc(x, yl, rx, ry, 0, 180, 1.7 * u, EYE);
      const t = 1.6 * u * s; // lid tilt: lower on the look side (a sly squint toward it)
      p.stroke([[x - 10.4 * u, yl - t * 0.5 - 0.6 * u], [x + 10.4 * u, yl + t * 0.5 - 0.6 * u]], lw * 1.25, EYE);
      break;
    }
    case "dot": p.ell(lx, ly, 3.4 * u, 5 * u, EYE, 0); break;
    case "big": p.ell(lx, ly, 4.4 * u, 6.4 * u, EYE, 0); break;
    case "small": p.ell(lx, ly, 2.7 * u, 4 * u, EYE, 0); break;
    case "lid": { // half-lid: flat lid line, pupil half-disc under it (shifted by the gaze)
      const yl = ey - u + lookY * 1.6 * u;
      p.ell(x + look * 3.6 * u, yl, 6.3 * u, 5.6 * u, EYE, 0, 0, 180);
      p.stroke([[x - 8.5 * u, yl], [x + 8.5 * u, yl]], lw, EYE);
      break;
    }
    case "slit": p.ell(lx, ey, 6.3 * u, 2.4 * u, EYE, 0, 0, 180); p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw, EYE); break;
    case "happy": p.arc(x, ey + 3 * u, 7.5 * u, 6 * u, 200, 340, lw, EYE); break;
    case "dash": p.stroke([[x - 8 * u, ey], [x + 8 * u, ey]], lw, EYE); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw, EYE); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 10.5 * u, 10.5 * u, WHITE, 2.4 * u); p.dot(x + look * 4 * u, ey + 1 * u + lookY * 3 * u, 3 * u, EYE);
      if (kind === "shockHalf") { p.ell(x, ey, 10.5 * u, 10.5 * u, skin, 0, 180, 360); p.stroke([[x - 10.5 * u, ey], [x + 10.5 * u, ey]], 2.4 * u); }
      break;
    case "goggle": case "goggleHalf": // 1.4x white rings, a thick ink ring, a tiny pinned pupil + a white catch light
      // (A3: the pupil travels up to ~40 % of the ring radius, so lookY -1 visibly lifts the gaze to the ring top)
      p.ell(x, ey - 1 * u, 14.5 * u, 14.5 * u, WHITE, 3.2 * u);
      p.dot(x + clamp(look, -1.4, 1.4) * 5.2 * u, ey - 1 * u + clamp(lookY, -1.2, 1.2) * 6 * u, 2.8 * u, EYE);
      p.dot(x + clamp(look, -1.4, 1.4) * 5.2 * u - 1.2 * u, ey - 1 * u + clamp(lookY, -1.2, 1.2) * 6 * u - 1.2 * u, 0.85 * u, WHITE);
      if (kind === "goggleHalf") { p.ell(x, ey - 1 * u, 14.5 * u, 14.5 * u, skin, 0, 180, 360); p.stroke([[x - 14.5 * u, ey - 1 * u], [x + 14.5 * u, ey - 1 * u]], 3 * u); }
      break;
  }
};

/** open "D" mouth with a white teeth band */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 2.8 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number) => {
  const mw = 3.6 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u, my], [mx + 5.5 * u, my - 0.6 * u]], mw); break;
    case "pout": p.stroke([[mx - 3.5 * u, my + 0.5 * u], [mx + 3.5 * u, my]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + 1.5 * u, my - 4 * u, 7.5 * u, 4.5 * u, 15, 140, mw); break;
    case "smirk1": { // one-sided smirk: a flat line that curls up at one end
      p.stroke([[mx - 6 * u, my + 0.5 * u], [mx + 2 * u, my + 0.8 * u]], mw);
      p.arc(mx + 2 * u, my - 3.4 * u, 5 * u, 4.2 * u, 20, 95, mw);
      break;
    }
    case "purse": p.ell(mx + 3 * u, my + 0.5 * u, 2.6 * u, 2.9 * u, MOUTH, 2.4 * u); p.arc(mx + 3 * u, my + 0.5 * u, 5.2 * u, 5.4 * u, 300, 420, 1.6 * u); break;
    case "smile": p.arc(mx, my - 3 * u, 7.5 * u, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 11.5 * u, 8 * u, u); break;
    case "o": p.ell(mx + 2 * u, my, 3.2 * u, 3.8 * u, MOUTH, 2.6 * u); break;
    case "O": p.ell(mx, my + 2 * u, 7.5 * u, 9.5 * u, MOUTH, 3 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 8.5 * u + i * 1.42 * u, my + 1.4 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly(rrect(mx - 11 * u, my - 4.5 * u, mx + 11 * u, my + 4.5 * u, 3 * u), WHITE, 2.8 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 5.5 * u, my - 4.5 * u], [mx + j * 5.5 * u, my + 4.5 * u]], 1.4 * u);
      p.stroke([[mx - 11 * u, my], [mx + 11 * u, my]], 1.4 * u);
      break;
    // lip flaps (the whisper line only): closed-ish / half open / round
    case "t0": p.ell(mx + u, my, 4.6 * u, 1.8 * u, MOUTH, 2.4 * u); break;
    case "t1": dmouth(p, mx + u, my - 1.5 * u, 6.5 * u, 5.5 * u, u); break;
    case "t2": p.ell(mx + u, my + u, 4.2 * u, 5.2 * u, MOUTH, 2.6 * u); break;
  }
};

/** face (front / 3-4). u = 1 % of the head width W. Eyes ~25u apart, brows 20u up, mouth 20u down, slid toward facing */
/** extra face controls (all optional): fdx / fdy shift every feature (a head turn / looking up), browUp raises one
 *  brow [screen-left, screen-right] in u, wink closes one eye (-1 / 1 = screen side), blush 0..1, glint 0..1 on lenses */
export type FaceX = { fdx?: number; fdy?: number; browUp?: [number, number]; wink?: number; blush?: number; glint?: number;
  browGap?: number; browCol?: string; moustache?: string;
  /** pale halo under the brows so they read over a dark fringe / visor edge (skin colour) */
  browHalo?: string;
  /** glasses pop (u, + = up) on a shock; brow floor (u from the head centre, brows never go above it: under a visor) */
  glassDy?: number; browMin?: number;
};
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lookY: number, lid: number,
  brim: boolean, skin: string, talk: number, glasses: string | null | undefined, X: FaceX = {}) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing + (X.fdx ?? 0) * u, dy = (X.fdy ?? 0) * u;
  const gog = F.eye[0] === "goggle";
  const ex = (F.eye[0] === "shock" ? 13 : gog ? 15.5 : 12.5) * u, ey = cy + 2 * u + dy, bc = X.browCol ?? INK;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    let kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    if (X.wink && side === Math.sign(X.wink)) kind = "happy";
    eye(p, kind, x, ey, u, side, look, lookY, skin);
    const [dI, dO] = side > 0 && F.brow2 ? F.brow2 : F.brow;
    const up = X.browUp ? X.browUp[side < 0 ? 0 : 1] : 0;
    let by = ey - (X.browGap ?? (brim ? 17 : 20)) * u + Math.min(0, lookY) * 1.6 * u - up * u;
    if (X.browMin !== undefined) by = Math.max(by, cy + (X.browMin + 2.5 - Math.min(dI, dO)) * u); // brow tops stay under a brim
    const halo = (pts: () => void) => { if (X.browHalo) pts(); };
    if (kind === "shock" || kind === "shockHalf" || kind === "goggle" || kind === "goggleHalf") {
      // arched brows jumped up: higher for goggle (the jump), a pale halo keeps them readable over hair
      let ay = by - (gog ? 7 : 6) * u + (gog ? 0.5 * dI * u + 5 * u : 0);
      if (X.browMin !== undefined) ay = Math.max(ay, cy + (X.browMin + 5) * u);
      halo(() => p.arc(x, ay, 9.5 * u, 3.4 * u, 195, 345, 7.4 * u, X.browHalo));
      p.arc(x, ay, 9 * u, 3.2 * u, 200, 340, 3.8 * u, bc);
    } else {
      halo(() => taper(p, [x - side * 8 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 8.4 * u, 6 * u, X.browHalo));
      taper(p, [x - side * 8 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.6 * u, bc);
    }
  }
  if (X.blush) for (const side of [-1, 1]) {
    const g = p.g; g.save(); g.globalAlpha = 0.38 * clamp(X.blush, 0, 1);
    p.ell(fx + side * (ex + 3 * u), ey + 10 * u, 7.5 * u, 3.8 * u, "#ef8b7b", 0); g.restore();
  }
  if (glasses === "round") {
    // goggle: the lenses grow with the eyes and the frames pop up (X.glassDy) then settle
    const gy = ey - (X.glassDy ?? 0) * u, lr = gog ? 15.5 : 10;
    for (const side of [-1, 1]) p.ell(fx + side * ex, gy, lr * u, (lr - 0.5) * u, null, 2.3 * u);
    p.arc(fx, gy - 1 * u, (ex / u - lr) * u + 0.6 * u, 2.2 * u, 200, 340, 2.2 * u);
    if (X.glint) for (const side of [-1, 1]) { // glare: two diagonal white streaks across each lens
      const gx = fx + side * ex, k = X.glint;
      p.stroke([[gx - 6 * u, gy + 2 * u], [gx + 1 * u, gy - 6 * u]], 2.4 * u * k, "#ffffff");
      p.stroke([[gx - 1 * u, gy + 5 * u], [gx + 4.5 * u, gy - 1.5 * u]], 1.4 * u * k, "#ffffff");
    }
  } else if (glasses === "sun") {
    for (const side of [-1, 1]) {
      p.ell(fx + side * ex, ey, 10.5 * u, 8 * u, "#1d1a22", 2.2 * u);
      p.stroke([[fx + side * ex - 5 * u, ey - 3 * u], [fx + side * ex - 1 * u, ey - 5 * u]], 1.8 * u, "#ffffff");
    }
    p.stroke([[fx - ex + 9 * u, ey - 2 * u], [fx + ex - 9 * u, ey - 2 * u]], 2.4 * u);
  }
  const mx = cx + 8 * u * facing + (X.fdx ?? 0) * u, my = cy + 22 * u + dy * 0.8;
  if (X.moustache) { // neat moustache (stands in for the missing nose): ONE solid soft bar, a single scallop underneath
    const y0 = my - 10 * u, pts: P2[] = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16, x = mx - 11 * u + 22 * u * t; pts.push([x, y0 - 1.6 * u * Math.sin(Math.PI * t) + 0.8 * u * Math.abs(t - 0.5)]); }
    for (let i = 0; i <= 16; i++) { const t = 1 - i / 16, x = mx - 11 * u + 22 * u * t; pts.push([x, y0 + 3.2 * u + 1.6 * u * Math.sin(Math.PI * t) - 1.4 * u * Math.exp(-(((t - 0.5) / 0.09) ** 2))]); }
    p.poly(pts, X.moustache, 2 * u);
    p.stroke([[mx - 6 * u, y0 + 0.6 * u], [mx + 4 * u, y0 + 0.2 * u]], 0.9 * u, mix(X.moustache, "#ffffff", 0.45));
  }
  mouth(p, talk >= 0 ? (["t0", "t1", "t2"] as MouthK[])[talk % 3] : F.mouth, mx, my + (X.moustache ? 2.6 * u : 0), u);
};

// ---------------- outfits ----------------
export type Build = "adult" | "small" | "tall" | "kid";
export type HairStyle = "bob" | "short" | "swept" | "bowl" | "bun" | "crop" | "pony" | "curly" | "none";
export type Outfit = {
  shirt: string; pants: string; shoes: string; skin?: string;
  hair?: string; hairStyle?: HairStyle;
  hat?: "sunhat" | "bucket" | "ranger" | "cap" | "visor" | "fedora" | null; hatCol?: string; band?: string;
  /** raise the front hairline by this share of the head height (brows sit on skin, not under the fringe) */
  fringeUp?: number;
  /** paler Hawaiian print (no red flower centres: the chip must not hide in it) */
  printPale?: boolean;
  /** colour of the pencil / pen tucked behind the ear */
  pencilCol?: string;
  vest?: string; cardigan?: string; print?: "hawaii" | "book" | "plaid" | "palm" | "pine" | null;
  glasses?: "round" | "sun" | null; camera?: "cross" | "neck" | null; backpack?: string | null;
  tie?: string; collar?: boolean; pocket?: boolean; dress?: boolean; shorts?: boolean; pencil?: boolean;
  build?: Build;
  /** extras: moustache colour, brow colour, half-rim glasses pushed up on the forehead, lanyard badge, fanny pack
   *  colour, sunglasses pushed up on the forehead, knit sweater (rib hem), pen / folded map peeking from the pocket */
  moustache?: string; browCol?: string; glassesUp?: boolean; badge?: boolean; fanny?: string; sunUp?: boolean; sweater?: boolean;
  pocketPeek?: "pen" | "map" | null;
  /** A5: the honest student's unique marks: a gold star sticker on the chest, a red hair clip */
  starBadge?: boolean; hairClip?: string;
  /** A3 backpack extras: a water bottle in the side pocket (colour), a carabiner swinging on the strap */
  bottle?: string; carabiner?: boolean;
};
const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  // ~3.3-3.5 head heights (head ~30 % of the height); adults 1.62-1.73 m (HH ~0.5 m)
  adult: { a: 122, torso: 1.1, legs: 1.25, tw: 0.84 },
  small: { a: 120, torso: 1.06, legs: 1.2, tw: 0.78 },
  tall: { a: 122, torso: 1.12, legs: 1.34, tw: 0.86 },
  kid: { a: 112, torso: 0.86, legs: 0.95, tw: 0.96 }, // bean torso as wide as the head (no head wedge showing beside it)
};

// ---------------- hair + hats ----------------
const STRAW = "#e9cf8f";
/** hair parts BEHIND the head (bob sides, ponytail, bun) */
const hairBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, wind: number, back: boolean, swing = 0, facing = 0) => {
  const col = o.hair ?? "#5a3b2a", u = (2 * H.a) / 100;
  void facing;
  if (o.hairStyle === "bob") {
    // shoulder-length bob that frames the face below the hat brim; ends flick with the wind (+ a swing on head moves)
    const w = H.a * 1.13, top = hc - H.b * 0.95, bot = hc + H.b * (back ? 1.08 : 1.0), fl = (wind * 6 + swing) * u;
    const pts: P2[] = [];
    for (let i = 0; i <= 16; i++) { const t = Math.PI + (Math.PI * i) / 16; pts.push([cx + w * Math.cos(t), hc + (hc - top) * Math.sin(t)]); }
    pts.push([cx + w + 2 * u + fl, bot - 10 * u], [cx + w - 6 * u + fl, bot + 4 * u], [cx + 0.55 * w, bot - 2 * u]);
    pts.push([cx - 0.55 * w, bot - 2 * u], [cx - w + 6 * u + fl, bot + 4 * u], [cx - w - 2 * u + fl, bot - 10 * u]);
    p.shadedFill(pts, col, mul(col, SH_FELT), light, w);
    p.inkRing(pts, ow * 0.85, thick);
    // A3: 3 lighter strand stripes per side that bend with the flick + one gloss highlight on the lit side
    const lite = mix(col, "#f2c79a", 0.38);
    p.clip(pts, () => {
      for (const s of [-1, 1]) for (const k of [0, 1, 2]) {
        const x0 = cx + s * (w - (5 + 7 * k) * u), x1 = cx + s * (w - (3 + 7 * k) * u) + fl * (1 - 0.25 * k);
        p.stroke(curve([x0, hc - (6 + 4 * k) * u], [x0 + s * 2 * u + fl * 0.4, (hc + bot) / 2], [x1, bot - (8 + 3 * k) * u], 6), (k === 1 ? 1.4 : 1.1) * u, k === 2 ? shade(col, 0.72) : lite);
      }
      const gs = Math.cos(light) < 0 ? -1 : 1;
      p.stroke(curve([cx + gs * (w - 9 * u), hc - 2 * u], [cx + gs * (w - 6 * u) + fl * 0.4, hc + 0.35 * (bot - hc)], [cx + gs * (w - 7 * u) + fl * 0.7, hc + 0.65 * (bot - hc)], 6), 2.6 * u, mix(col, "#fff3e0", 0.55));
    });
  } else if (o.hairStyle === "pony") {
    const sx = cx + (back ? 0 : H.a * 0.95), sy = hc - H.b * 0.2;
    const pts: P2[] = [[sx - 10 * u, sy - 12 * u], [sx + 18 * u + wind * 5 * u, sy + 10 * u], [sx + 14 * u + wind * 8 * u, sy + 50 * u], [sx - 2 * u, sy + 30 * u]];
    p.poly(curve(pts[0], pts[1], pts[2], 8).concat(curve(pts[2], pts[3], pts[0], 8)), col, ow * 0.85);
  } else if (o.hairStyle === "bun") {
    p.ell(cx + 2 * u, hc - H.b * 1.02, 20 * u, 17 * u, col, ow * 0.85);
    p.arc(cx + 2 * u, hc - H.b * 1.02, 12 * u, 9 * u, 200, 320, 1.5 * u, shade(col, 0.7));
  }
  // A3: temple tufts under a hat brim sit BEHIND the head (they poke out past the outline like sideburns, never a dark
  // smear on the cheek): small 2-point tufts with a gloss tick
  const st = o.hairStyle ?? "short";
  if (!back && o.hat && o.hat !== "visor" && (st === "crop" || st === "short" || st === "curly" || st === "bowl" || st === "swept")) {
    const hcol = liftDark(col, 0.06);
    for (const s of [-1, 1]) {
      const tx = cx + s * 0.97 * H.a, ty = hc - 0.36 * H.b;
      const tuft: P2[] = [[tx - s * 6 * u, ty - 11 * u], [tx + s * 7 * u, ty - 9 * u], [tx + s * 4 * u, ty - 3 * u], [tx + s * 8 * u, ty + 3 * u], [tx + s * 2 * u, ty + 8 * u], [tx - s * 6 * u, ty + 9 * u]];
      p.poly(tuft, hcol, ow * 0.5);
      p.stroke([[tx + s * 1 * u, ty - 6 * u], [tx + s * 4 * u, ty + 1 * u]], 1.1 * u, mix(hcol, "#ffffff", 0.35));
    }
  }
};

/** hair cap ON the head (front: a cap cut at the hairline; back: covers almost the whole head) */
const hairOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, ow: number, back: boolean, hatted: boolean) => {
  const st = o.hairStyle ?? "short", col = o.hair ?? "#5a3b2a", u = (2 * H.a) / 100, crown = hc - H.b, HH = 2 * H.b;
  if (st === "none") return;
  if (hatted && st !== "bob") {
    // tufts of hair under a hat brim at the temples: the SAME small crescent mirrored on both sides (clipped to the
    // head), never darker than L* ~25, with a gloss tick (no one-sided "eye patch")
    if (back) {
      // A3: from behind under a hat: the hair MASS in the hair colour (warm-lifted, never grey) from the brim down to a
      // near-straight nape hairline at ~89 % of the head height, a narrow shaded nape band below it, 3 gloss stripes
      const hc2 = backHair(col);
      p.clip(hp, () => {
        const hl: P2[] = [];
        for (let k = 0; k <= 16; k++) { const t = k / 16, x = cx - 1.2 * H.a + 2.4 * H.a * t; hl.push([x, hc + 0.78 * H.b + 0.025 * H.b * Math.sin(t * Math.PI * 9) - 0.05 * H.b * (2 * t - 1) ** 2]); }
        p.poly([[cx - 1.3 * H.a, hc + 1.3 * H.b], [cx + 1.3 * H.a, hc + 1.3 * H.b], ...hl.slice().reverse()], mul(o.skin ?? SKIN, [0.86, 0.84, 0.9]), 0);
        p.poly([[cx - 1.3 * H.a, hc - 1.2 * H.b], [cx + 1.3 * H.a, hc - 1.2 * H.b], ...hl.slice().reverse()], hc2, 0);
        p.shadedFill([[cx - 1.3 * H.a, hc - 1.2 * H.b], [cx + 1.3 * H.a, hc - 1.2 * H.b], [cx + 1.3 * H.a, hc + 0.8 * H.b], [cx - 1.3 * H.a, hc + 0.8 * H.b]], "rgba(0,0,0,0)", "rgba(40,20,50,0.22)", light, H.a, 0.2);
        for (const s2 of [-0.5, 0, 0.5]) p.stroke([[cx + s2 * H.a, hc - 0.4 * H.b], [cx + s2 * 1.08 * H.a, hc + 0.62 * H.b]], 1.5 * u, mix(hc2, "#ffffff", 0.3));
        p.stroke(hl, 1.2 * u, shade(hc2, 0.75));
      });
      p.inkRing(hp, ow, thickAngle(light));
    }
    return;
  }
  if (st === "bob") { // under the sun hat the bob shows only at the sides (hairBehind); in back view it covers the head
    if (back) {
      const run = keepRun(hp, ([, y]) => y < hc + 2 * H.b).map(([x, y]) => [cx + (x - cx) * 1.04, hc + (y - hc) * 1.03] as P2);
      p.shadedFill(run, col, mul(col, SH_FELT), light, H.a, 0.35); p.poly(run, null, ow * 0.8);
      for (const s of [-0.4, 0, 0.4]) p.stroke([[cx + s * H.a, crown + 0.3 * HH], [cx + s * 1.1 * H.a, hc + 0.6 * H.b]], 1.5 * u, shade(col, 0.72));
    }
    return;
  }
  let cut = crown + ((st === "bowl" ? 0.4 : st === "swept" ? 0.27 : 0.29) - (o.fringeUp ?? 0)) * HH;
  // A3: from behind the hair covers ~94 % of the head height; the last ~6 % is a STRAIGHT shaded nape band (never a
  // curved pale crescent that reads as a grin on the back of the head)
  if (back) cut = hc + 0.95 * H.b; // A4: the hair meets the collar (no pale face-fill band above the backpack)
  const keep = ([x, y]: P2) => y < cut || (st === "bowl" && !back && Math.abs(x - cx) > 0.8 * H.a && y < hc + 0.3 * H.b);
  const arc = keepRun(hp, keep).map(([x, y]) => [cx + (x - cx) * 1.035, hc + (y - hc) * 1.035] as P2);
  if (arc.length < 3) return;
  if (!back) {
    const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
    if (st === "bowl") { // straight fringe
      arc.push([x0 + 0.08 * H.a, cut], [x1 - 0.08 * H.a, cut]);
    } else if (st === "swept") { // swept back: the hairline rises in the middle
      for (let i = 1; i < 8; i++) { const t = i / 8; arc.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 9 * u * Math.sin(Math.PI * t)]); }
    } else if (st === "curly") {
      for (let i = 1; i < 9; i++) arc.push([x0 + ((x1 - x0) * i) / 9, y0 + ((y1 - y0) * i) / 9 + (i % 2 ? 6 * u : 0)]);
    } else {
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
  }
  // from behind, dark hair is lifted to a WARM mid brown (never grey, never the ink colour) so a back view reads as hair
  const hcol = back ? backHair(col) : col;
  if (back) p.clip(hp, () => p.poly([[cx - 1.3 * H.a, cut - 1 * u], [cx + 1.3 * H.a, cut - 1 * u], [cx + 1.3 * H.a, hc + 1.3 * H.b], [cx - 1.3 * H.a, hc + 1.3 * H.b]], mul(o.skin ?? SKIN, [0.86, 0.84, 0.9]), 0));
  p.shadedFill(arc, hcol, mul(hcol, SH_FELT), light, H.a, 0.35);
  p.poly(arc, null, ow * 0.85);
  // 2-3 inner stripe lines + one gloss stroke (bible 4.1 hair)
  const sc = shade(hcol, 0.7), gl = mix(hcol, "#ffffff", 0.45);
  if (st === "swept") {
    // ONE swept-back silver shape: 3 thin inner strands following the sweep + a gloss stroke; small rounded side
    // wings over the temples (no spikes, no crown)
    p.clip(arc, () => { for (const s of [-0.5, -0.05, 0.4]) p.arc(cx + s * H.a + 22 * u, crown + 0.3 * HH, 30 * u, 15 * u, 198, 262, 1.1 * u, sc); });
    if (!back) for (const s of [-1, 1]) {
      // A3: swept side hair as 3-point tufts over the temples with 2 lighter strand lines (never round "earmuffs")
      const tx = cx + s * 0.93 * H.a, ty = hc - 0.3 * H.b;
      const tuft: P2[] = [[tx - s * 4 * u, ty - 11 * u], [tx + s * 6 * u, ty - 9 * u], [tx + s * 3 * u, ty - 4 * u], [tx + s * 8 * u, ty], [tx + s * 3 * u, ty + 4 * u], [tx + s * 6 * u, ty + 9 * u], [tx - s * 3 * u, ty + 8 * u]];
      p.poly(tuft, shade(hcol, 0.95), ow * 0.42);
      for (const k of [0, 1]) p.stroke([[tx - s * (1 - k * 0.5) * u, ty - (7 - 9 * k) * u], [tx + s * (4 - k) * u, ty - (3 - 9 * k) * u]], 1 * u, mix(hcol, "#ffffff", 0.45));
    }
  } else for (const s of [-0.45, 0.05, 0.5]) p.stroke([[cx + s * H.a, crown + 0.08 * HH], [cx + s * H.a - 4 * u, Math.min(cut, hc + 0.7 * H.b) - 6 * u]], 1.5 * u, sc);
  if (back && st !== "swept") for (const s of [-0.5, 0, 0.5]) p.stroke([[cx + s * H.a, crown + 0.3 * HH], [cx + s * 1.1 * H.a, cut - 8 * u]], 1.4 * u, mix(hcol, "#ffffff", 0.28));
  if (st !== "bowl") p.arc(cx - 0.3 * H.a, crown + 0.2 * HH, 14 * u, 8 * u, 200, 265, 2.6 * u, gl);
  else p.arc(cx - 0.25 * H.a, crown + 0.12 * HH, 18 * u, 7 * u, 200, 300, 2.4 * u, gl);
};
/** dark hair (L* < ~25) lifted toward a paler tone of itself (back views, tufts) */
const liftDark = (c: string, k = 0.24) => {
  const n = parseInt(c.slice(1), 16), lin = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const Y = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return Y < 0.045 ? mix(c, "#ffffff", k) : c;
};
/** back-of-head hair: dark hair lifted toward a warm brown (#4A3326-#6a4a34 range), so it never reads as a dark
 *  ball or a grey helmet; lighter hair stays itself */
const backHair = (c: string) => {
  const n = parseInt(c.slice(1), 16), lum = 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
  return lum < 70 ? mix(c, "#8a5e40", 0.42) : c;
};

/** hats (front and back views share the shape; brims sway with the wind) */
const hatOn = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, ow: number, wind: number, back: boolean, facing = 0, flut = 0) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, col = o.hatCol ?? STRAW, sh = mul(col, SH_FELT);
  if (o.hat === "sunhat") {
    const by = hc - 0.8 * H.b, rx = 0.8 * W, ry = 0.075 * HH, tw = wind * 2.2 + flut * 2.2;
    // brim: wide flat ellipse, the two tips lift and dip with the wind (+ a soft flutter wave running along the edge)
    const brim: P2[] = ellPts(cx, by, rx, ry, 0, 360, tw, 60).map(([x, y]) => { const t = (x - cx) / rx;
      return [x, y - (wind * 7 + flut * 4) * u * t ** 3 - 1.5 * u * Math.abs(t) ** 4 + flut * 1.6 * u * Math.sin(t * 5 + flut * 2) * Math.abs(t)] as P2; });
    p.gradFill(brim, col, sh, light, 0.35);
    p.clip(brim, () => {
      for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, r0 = 0.5, r1 = 0.95; p.stroke([[cx + rx * r0 * Math.cos(a), by + ry * r0 * Math.sin(a)], [cx + rx * r1 * Math.cos(a), by + ry * r1 * Math.sin(a)]], 1.1 * u, shade(col, 0.82)); }
    });
    p.inkRing(brim, ow * 0.8, thickAngle(light));
    // crown dome
    const cw = 0.36 * W, ch = 0.36 * HH, cr: P2[] = [];
    for (let i = 0; i <= 20; i++) { const t = Math.PI + (Math.PI * i) / 20; cr.push([cx + cw * Math.cos(t) * (1 - 0.12 * Math.sin(t) ** 2), by - 2 * u + ch * Math.sin(t)]); }
    cr.push([cx + cw, by + 1.5 * u], [cx - cw, by + 1.5 * u]);
    p.shadedFill(cr, col, sh, light, cw, 0.4);
    p.clip(cr, () => {
      for (let k = 1; k < 4; k++) p.arc(cx, by + 2 * u, cw * 1.02, ch * (k / 4), 190, 350, 1.0 * u, shade(col, 0.85));
      p.band([[cx - cw - 4 * u, by - 4.5 * u], [cx + cw + 4 * u, by - 4.5 * u]], o.band ?? "#f2c230", 0.075 * HH, 0.9 * u);
    });
    p.poly(cr, null, ow * 0.85);
    // bow on the band (screen-right in front view, screen-left from behind)
    const s = back ? -1 : 1, bx = cx + s * (cw - 6 * u), byy = by - 5 * u, bc = o.band ?? "#f2c230";
    p.ell(bx + s * 7 * u, byy - 3 * u, 7 * u, 4.5 * u, bc, 1.8 * u, 0, 360, -25 * s + wind * 8);
    p.ell(bx + s * 7 * u, byy + 4 * u, 6 * u, 3.6 * u, bc, 1.8 * u, 0, 360, 30 * s + wind * 8);
    p.ell(bx, byy, 3.4 * u, 3.4 * u, shade(bc, 0.9), 1.8 * u);
    // two ribbon tails hanging from the bow, swinging on the wind (+-6 deg) with a lagging tip
    for (const [k, len] of [[0, 17], [1, 13]] as const) {
      const a0 = rad(s * (8 + 14 * k) + wind * 9 + flut * 10 * (k ? -1 : 1)), a1 = a0 + rad(wind * 7 + flut * 9);
      const m: P2 = [bx + Math.sin(a0) * len * 0.55 * u, byy + 2 * u + Math.cos(a0) * len * 0.55 * u];
      const e: P2 = [m[0] + Math.sin(a1) * len * 0.5 * u, m[1] + Math.cos(a1) * len * 0.5 * u];
      p.band(curve([bx, byy + 2 * u], m, e, 6), bc, 2.8 * u, 0.9 * u, "round");
    }
  } else if (o.hat === "fedora") {
    // straw fedora: pinched crown with a dark band, a medium brim curling up at the sides
    const by = hc - 0.62 * H.b, tw = wind * 1.5 + flut;
    const brim = rotPts(ellPts(cx, by, 0.62 * W, 0.07 * HH, 0, 360, 0, 40).map(([x, y]) => [x, y - 3 * u * (((x - cx) / (0.62 * W)) ** 2)] as P2), rad(tw), cx, by);
    p.gradFill(brim, col, sh, light, 0.3); p.inkRing(brim, ow * 0.75, thickAngle(light));
    const crown = rotPts([[cx - 0.31 * W, by], [cx - 0.27 * W, by - 0.3 * HH], [cx - 0.1 * W, by - 0.36 * HH], [cx, by - 0.31 * HH], [cx + 0.1 * W, by - 0.36 * HH], [cx + 0.27 * W, by - 0.3 * HH], [cx + 0.31 * W, by]], rad(tw), cx, by);
    p.shadedFill(crown, col, sh, light, 0.3 * W, 0.4);
    p.clip(crown, () => p.band([[cx - 0.4 * W, by - 0.06 * HH], [cx + 0.4 * W, by - 0.06 * HH]], "#5a3a26", 0.075 * HH, 0.6 * u));
    p.poly(crown, null, ow * 0.8);
    p.clip(brim, () => { for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; p.stroke([[cx + 0.4 * W * Math.cos(a), by + 0.045 * HH * Math.sin(a)], [cx + 0.6 * W * Math.cos(a), by + 0.068 * HH * Math.sin(a)]], 0.9 * u, shade(col, 0.82)); } });
  } else if (o.hat === "bucket") {
    const by = hc - 0.6 * H.b, tw = wind * 1.5 + flut;
    const crown = rotPts([[cx - 0.36 * W, by], [cx - 0.28 * W, by - 0.3 * HH], [cx - 0.18 * W, by - 0.36 * HH], [cx + 0.18 * W, by - 0.36 * HH], [cx + 0.28 * W, by - 0.3 * HH], [cx + 0.36 * W, by]], rad(tw), cx, by);
    p.shadedFill(crown, col, sh, light, 0.36 * W, 0.4); p.poly(crown, null, ow * 0.85);
    p.stroke(rotPts([[cx - 0.34 * W, by - 0.06 * HH], [cx + 0.34 * W, by - 0.06 * HH]], rad(tw), cx, by), 1.6 * u, shade(col, 0.7));
    const brim = rotPts([[cx - 0.4 * W, by - 2 * u], [cx + 0.4 * W, by - 2 * u], [cx + 0.54 * W, by + 0.1 * HH], [cx + 0.3 * W, by + 0.135 * HH], [cx - 0.3 * W, by + 0.135 * HH], [cx - 0.54 * W, by + 0.1 * HH]], rad(tw), cx, by);
    p.gradFill(brim, shade(col, 1.05), sh, light, 0.3); p.poly(brim, null, ow * 0.8);
    p.stroke(rotPts([[cx - 0.47 * W, by + 0.075 * HH], [cx - 0.28 * W, by + 0.105 * HH], [cx + 0.28 * W, by + 0.105 * HH], [cx + 0.47 * W, by + 0.075 * HH]], rad(tw), cx, by), 1.3 * u, shade(col, 0.72));
  } else if (o.hat === "ranger") {
    const by = hc - 0.62 * H.b, tw = wind * 1.5 + flut;
    const brim = ellPts(cx, by, 0.7 * W, 0.06 * HH, 0, 360, tw, 48);
    p.gradFill(brim, col, sh, light, 0.3); p.inkRing(brim, ow * 0.8, thickAngle(light));
    const crown = rotPts([[cx - 0.3 * W, by], [cx - 0.26 * W, by - 0.28 * HH], [cx - 0.12 * W, by - 0.4 * HH], [cx, by - 0.33 * HH], [cx + 0.12 * W, by - 0.4 * HH], [cx + 0.26 * W, by - 0.28 * HH], [cx + 0.3 * W, by]], rad(tw), cx, by);
    p.shadedFill(crown, col, sh, light, 0.3 * W, 0.4);
    p.clip(crown, () => p.band([[cx - 0.4 * W, by - 0.05 * HH], [cx + 0.4 * W, by - 0.05 * HH]], "#3a2a1c", 0.07 * HH, 0.6 * u));
    p.poly(crown, null, ow * 0.85);
    p.stroke([[cx, by - 0.33 * HH], [cx, by - 0.16 * HH]], 1.5 * u, shade(col, 0.7));
  } else if (o.hat === "cap" || o.hat === "visor") {
    const by = hc - (o.hat === "visor" ? 0.66 : 0.5) * H.b; // the visor sits high on the forehead: brows can act under it
    if (o.hat === "cap") {
      const crown: P2[] = [];
      for (let i = 0; i <= 18; i++) { const t = Math.PI + (Math.PI * i) / 18; crown.push([cx + 1.04 * H.a * Math.cos(t), by + 0.31 * HH * Math.sin(t)]); }
      p.shadedFill(crown, col, sh, light, H.a, 0.4); p.poly(crown, null, ow * 0.85);
      p.stroke([[cx, by - 0.31 * HH], [cx, by - 0.04 * HH]], 1.3 * u, shade(col, 0.7));
      p.dot(cx, by - 0.31 * HH, 3.2 * u, shade(col, 0.8));
      if (back) {
        // A3: the cap's BACK: a strap opening (hair shows through) with the adjuster strap across it, two panel seams,
        // the top button with a highlight
        const oy = by - 0.005 * HH, hcB = backHair(o.hair ?? "#5a3b2a");
        p.ell(cx, oy, 0.24 * H.a, 0.1 * HH, hcB, 1.6 * u, 180, 360);
        p.band([[cx - 0.3 * H.a, oy - 0.045 * HH], [cx + 0.3 * H.a, oy - 0.045 * HH]], shade(col, 0.82), 0.035 * HH, 0.8 * u);
        p.poly(rrect(cx + 0.05 * H.a, oy - 0.07 * HH, cx + 0.15 * H.a, oy - 0.02 * HH, 0.6 * u), "#c9ccd2", 0.9 * u);
        for (const s of [-1, 1]) p.arc(cx + s * 0.42 * H.a, by, 0.35 * H.a, 0.29 * HH, s > 0 ? 200 : 270, s > 0 ? 270 : 340, 1.1 * u, shade(col, 0.72));
        p.dot(cx - 1 * u, by - 0.31 * HH - 1 * u, 1.1 * u, mix(col, "#ffffff", 0.5));
      }
      if (!back) {
        // a real ball-cap BILL sticking out toward the lens (and toward the facing side): a flat lens shape with a
        // dark underside band, so the cap never reads as a beret
        // narrower than the head (a beret-wide brim would read as a beret), deeper, its dark underside showing
        const bx = cx + 12 * u * facing, bw = 0.4 * W, bt = (wind * 1.2 + flut * 0.8) * u;
        const bill: P2[] = [];
        for (let i = 0; i <= 24; i++) { const t = Math.PI * (i / 24); bill.push([bx + bw * Math.cos(t), by - 0.03 * HH + 0.085 * HH * Math.sin(t) + bt * Math.cos(t)]); }
        p.poly(bill, mix(col, "#5a1010", 0.45), ow * 0.8);
        p.clip(bill, () => p.ell(bx, by - 0.035 * HH, bw * 1.02, 0.05 * HH, shade(col, 1.0), 0, 0, 180));
        p.arc(bx, by - 0.035 * HH, bw * 0.9, 0.04 * HH, 25, 155, 1.3 * u, mix(col, "#ffffff", 0.35));
      }
    } else {
      // sun visor: band round the head + a stiff bill with a green-tinted underside (reads as a visor, not a sweatband)
      p.gradFill(rrect(cx - 0.5 * W, by - 0.06 * HH, cx + 0.5 * W, by + 0.04 * HH, 3 * u), col, mul(col, SH_FELT), light, 0.3);
      p.poly(rrect(cx - 0.5 * W, by - 0.06 * HH, cx + 0.5 * W, by + 0.04 * HH, 3 * u), null, ow * 0.7);
      if (!back) {
        const bt = wind * 1.2 * u;
        p.ell(cx + 3 * u, by + 0.03 * HH + bt, 0.46 * W, 0.085 * HH, "#5e8a6a", ow * 0.75, 0, 180);
        p.arc(cx + 3 * u, by + 0.03 * HH + bt, 0.44 * W, 0.05 * HH, 15, 165, 1.6 * u, shade(col, 0.9));
      }
    }
  }
};

// ---------------- petrified wood ----------------
/** a petrified-wood chip: an irregular 5-7-sided ROUNDED rock silhouette, mottled jasper fill (red / orange / purple
 *  with white crystal flecks), a thin bark-brown rind along one edge, the white paint dot off-centre (marked wood).
 *  quartz = the cooler purple / blue quartz ring chip with a white crystal rim (the dusk tag chip) */
export const jasper = (p: Pen, cx: number, cy: number, r: number, seed: number, o: { dot?: boolean; quartz?: boolean; ink?: number; dotK?: number } = {}) => {
  const n = 5 + Math.floor(rnd(seed, 1) * 3), cor: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rnd(seed, 2) * 1.2, rr = r * (0.78 + 0.3 * rnd(seed, 10 + i)); cor.push([cx + rr * Math.cos(a), cy + rr * 0.82 * Math.sin(a)]); }
  // rounded corners: quadratic curves through the edge midpoints
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) { const a = cor[i], b = cor[(i + 1) % n], c = cor[(i + 2) % n]; pts.push(...curve(lerp2(a, b, 0.5), b, lerp2(b, c, 0.5), 5).slice(0, -1)); }
  const ink = o.ink ?? r * 0.1;
  const A = o.quartz ? ["#5e7fd0", "#8a5aa8", "#a9c4f2", "#eef2ff"] : ["#c84a3a", "#e8893a", "#8a5aa8", "#f2c64a"];
  p.poly(pts, A[0], 0);
  p.clip(pts, () => {
    if (o.quartz) { // concentric quartz ring: blue outside, purple band, pale crystal core
      p.ell(cx + r * 0.05, cy, r * 0.82, r * 0.66, A[1], 0); p.ell(cx + r * 0.08, cy, r * 0.5, r * 0.4, A[2], 0); p.ell(cx + r * 0.1, cy, r * 0.22, r * 0.18, A[3], 0);
    } else for (let k = 0; k < 7; k++) { // mottled jasper blobs
      const bx = cx + (rnd(seed, 30 + k) - 0.5) * 1.5 * r, by = cy + (rnd(seed, 40 + k) - 0.5) * 1.2 * r, br = r * (0.2 + 0.3 * rnd(seed, 50 + k));
      p.ell(bx, by, br, br * 0.7, A[1 + (k % 3)], 0, 0, 360, rnd(seed, 60 + k) * 180);
    }
    for (let k = 0; k < 6; k++) p.dot(cx + (rnd(seed, 70 + k) - 0.5) * 1.4 * r, cy + (rnd(seed, 80 + k) - 0.5) * 1.1 * r, r * 0.045 * (1 + rnd(seed, 90 + k)), "#fff6ea");
    // bark rind along the lower-left edge
    p.stroke(pts.filter(([x, y]) => (x - cx) * 0.6 + (y - cy) > r * 0.25), r * 0.2, o.quartz ? "#4a3a5a" : "#6a4a34");
  });
  if (o.quartz) p.poly(pts, null, r * 0.12, "#ffffff");
  p.poly(pts, null, ink);
  if (o.dot) { const k = o.dotK ?? 1; p.ell(cx + r * 0.32, cy - r * 0.24, r * 0.27 * k, r * 0.25 * k, WHITE, Math.max(ink * 0.8, r * 0.06)); }
  return pts;
};

// ---------------- held props ----------------
export type Hold = "camera" | "clipboard" | "pen" | "chalk" | "stopwatch" | "tally" | "chip" | "scoop" | "letter" | "panel" | "clip" | "brush"
  | "bucket" | "map" | "plank" | "testboard" | "pencil" | "envelope" | "pole" | "coffee" | "tarp" | "counter" | "phone" | "paper" | "gum" | "ruler" | "note" | null;
/** prop at hand (hx, hy); ang in degrees (0 = upright); side = which arm; n = prop state (ticks, seconds, scoop load) */
const holdProp = (p: Pen, kind: Hold, hx: number, hy: number, u: number, ang: number, side: number, light: number, n = 0) => {
  if (!kind) return;
  const R = (pts: P2[]) => rotPts(pts, rad(ang), hx, hy), th = thickAngle(light);
  switch (kind) {
    case "bucket": { // small metal chip bucket hanging from the hand
      p.arc(hx, hy + 14 * u, 13 * u, 14 * u, 200, 340, 1.8 * u);
      const b = R([[hx - 15 * u, hy + 12 * u], [hx + 15 * u, hy + 12 * u], [hx + 12 * u, hy + 40 * u], [hx - 12 * u, hy + 40 * u]]);
      p.gradFill(b, "#b9c0cc", "#7c8494", light, 0.3); p.poly(b, null, 2.2 * u);
      for (const [dx, c] of [[-7, "#c84a3a"], [0, "#f2c64a"], [7, "#8a5aa8"]] as const) p.ell(hx + dx * u, hy + 12 * u, 5 * u, 3.4 * u, c, 1.2 * u);
      break;
    }
    case "map": { // a fold-out park map held open in front of the chest (opens toward the body centre)
      const w = 46 * u, x0 = side < 0 ? hx : hx - w, pts = R(rrect(x0, hy - 30 * u, x0 + w, hy + 4 * u, 1.5 * u));
      p.poly(pts, "#efe6c8", 1.8 * u);
      for (const k of [1, 2]) p.stroke(R([[x0 + (w * k) / 3, hy - 30 * u], [x0 + (w * k) / 3, hy + 4 * u]]), 0.9 * u, "#b8a77e");
      p.stroke(R([[x0 + 6 * u, hy - 8 * u], [x0 + 16 * u, hy - 20 * u], [x0 + 30 * u, hy - 14 * u], [x0 + 40 * u, hy - 24 * u]]), 1.6 * u, "#c8343a");
      p.ell(...R([[x0 + 30 * u, hy - 4 * u]])[0], 6 * u, 3.4 * u, "#8fb8d8", 0);
      p.ell(...R([[x0 + 12 * u, hy - 24 * u]])[0], 5 * u, 3 * u, "#a7c48a", 0);
      break;
    }
    case "plank": { // a sign panel carried flat under the arm (seen edge-on: a long brown board)
      const b = R(rrect(hx - 44 * u, hy - 6 * u, hx + 40 * u, hy + 3 * u, 1.5 * u));
      p.poly(b, "#6b4426", 2 * u);
      p.stroke(R([[hx - 40 * u, hy - 2 * u], [hx + 36 * u, hy - 2 * u]]), 1 * u, "#f1e2c0");
      break;
    }
    case "testboard": { // the professor's big clipboard: SIGN TEST, columns A / B, n tally ticks written so far
      const b = R(rrect(hx - 29 * u, hy - 40 * u, hx + 29 * u, hy + 30 * u, 3 * u));
      p.poly(b, "#a8743f", 2.4 * u);
      p.poly(R(rrect(hx - 25 * u, hy - 34 * u, hx + 25 * u, hy + 26 * u, 1 * u)), "#fbf8ef", 1.3 * u);
      p.poly(R(rrect(hx - 9 * u, hy - 44 * u, hx + 9 * u, hy - 34 * u, 1.5 * u)), "#b9bcc8", 1.6 * u);
      p.text("SIGN TEST", ...R([[hx, hy - 27 * u]])[0], 7.1 * u, "#2b1a12", "Arial Black", "center", rad(ang));
      // the holding hand's fingers wrap the board's lower-left corner
      p.dot(...R([[hx - 27 * u, hy + 24 * u]])[0], 5.4 * u);
      p.band(R([[hx - 26 * u, hy + 21 * u], [hx - 20 * u, hy + 18 * u]]), INK, 3.2 * u, 0, "round");
      p.stroke(R([[hx - 19 * u, hy - 21 * u], [hx + 19 * u, hy - 21 * u]]), 1 * u, "#8a93a8");
      p.stroke(R([[hx, hy - 19 * u], [hx, hy + 22 * u]]), 1 * u, "#8a93a8");
      for (const [cx, L] of [[-10, "A"], [10, "B"]] as const) p.text(L, ...R([[hx + cx * u, hy - 13 * u]])[0], 9 * u, "#c8343a", "Arial Black", "center", rad(ang));
      for (let k = 0; k < Math.min(n, 16); k++) { // ink ticks appear one by one: 5-bar gates; A6 P2 (no spoiler before shot 10): A and B fill EVENLY
        const col = k % 2 ? 10 : -10, i = Math.floor(k / 2), g = Math.floor(i / 5), j = i % 5;
        const x = hx + (col - 6 + j * 3) * u, y = hy - 2 * u + g * 11 * u;
        p.stroke(R(j < 4 ? [[x, y - 3.5 * u], [x, y + 3.5 * u]] : [[x - 13 * u, y + 2.5 * u], [x + 0.5 * u, y - 2.5 * u]]), 1.2 * u, "#2a3a6a");
      }
      break;
    }
    case "pencil": {
      p.band(R([[hx, hy + 3 * u], [hx, hy - 15 * u]]), "#f2c230", 3 * u, 0.9 * u, "round");
      p.dot(...R([[hx, hy - 16 * u]])[0], 1.6 * u, "#e88a9a");
      break;
    }
    case "pole": { // trekking pole planted ahead of the hand (hiker)
      p.band(R([[hx, hy - 6 * u], [hx, hy + 92 * u]]), "#9aa4b4", 2.2 * u, 0.8 * u, "round");
      p.band(R([[hx, hy - 7 * u], [hx, hy + 5 * u]]), "#2a2a32", 3.6 * u, 0.8 * u, "round");
      break;
    }
    case "paper": { // A4: a test paper held out (a big red "A" grade and 3 ruled lines)
      const b = R(rrect(hx - 15 * u, hy - 40 * u, hx + 15 * u, hy + 2 * u, 1 * u));
      p.poly(b, "#fbf8ef", 1.5 * u);
      for (let r = 0; r < 3; r++) p.stroke(R([[hx - 10 * u, hy - 24 * u + r * 7 * u], [hx + 10 * u, hy - 24 * u + r * 7 * u]]), 1 * u, "#8a93a8");
      p.text("A", ...R([[hx + 7 * u, hy - 33 * u]])[0], 9 * u, "#d8342c", "Arial Black", "center", rad(ang));
      p.dot(hx, hy, 5.4 * u);
      break;
    }
    case "gum": { // A5: a pink bubble-gum bubble at the mouth (n = 0..10 size)
      const r = (5 + 1.1 * n) * u;
      p.ell(hx + side * 2 * u, hy - 2 * u, r, r * 0.92, "#ff8fc0", 1.6 * u);
      p.ell(hx + side * 2 * u - 0.35 * r, hy - 2 * u - 0.35 * r, 0.22 * r, 0.16 * r, "#ffe1ef", 0);
      break;
    }
    case "ruler": { // A5: a wooden school ruler with tick marks
      const b = R(rrect(hx - 3 * u, hy - 40 * u, hx + 3 * u, hy + 4 * u, 0.8 * u));
      p.poly(b, "#e9c46a", 1.4 * u);
      for (let k = 0; k < 7; k++) p.stroke(R([[hx - 3 * u, hy - 36 * u + k * 6 * u], [hx - (k % 2 ? 0.5 : -0.8) * u, hy - 36 * u + k * 6 * u]]), 0.9 * u);
      break;
    }
    case "note": { // A5: a crumpled crib note (a small cream wad with scribble lines)
      const pts: P2[] = []; for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, rr = (7 + (k % 2 ? 1.5 : -1)) * u; pts.push([hx + rr * Math.cos(a), hy - 6 * u + rr * Math.sin(a)]); }
      p.poly(pts, "#f4ecd6", 1.3 * u);
      p.stroke([[hx - 4 * u, hy - 8 * u], [hx + 3 * u, hy - 7 * u]], 0.9 * u, "#5a6a9a"); p.stroke([[hx - 3 * u, hy - 4 * u], [hx + 4 * u, hy - 5 * u]], 0.9 * u, "#5a6a9a");
      break;
    }
    case "envelope": {
      const b = R(rrect(hx - 16 * u, hy - 20 * u, hx + 16 * u, hy + 2 * u, 1 * u));
      p.poly(b, "#f6efe0", 1.6 * u);
      p.stroke(R([[hx - 16 * u, hy - 20 * u], [hx, hy - 9 * u], [hx + 16 * u, hy - 20 * u]]), 1.2 * u, "#b8a77e");
      p.poly(R(rrect(hx + 7 * u, hy - 18 * u, hx + 13 * u, hy - 12 * u, 0.5 * u)), "#d8432f", 0.8 * u);
      break;
    }
    case "camera": { // compact camera held up (to the eye or out for a photo)
      const b = R(rrect(hx - 14 * u, hy - 10 * u, hx + 14 * u, hy + 9 * u, 3 * u));
      p.poly(b, "#3b3a46", 2.4 * u);
      const [lx, ly] = R([[hx + side * 3 * u, hy]])[0];
      p.ell(lx, ly, 6.5 * u, 6.5 * u, "#b9bcc8", 2 * u); p.ell(lx, ly, 3.8 * u, 3.8 * u, "#1b1d2c", 0); p.dot(lx - 1.4 * u, ly - 1.4 * u, 1.2 * u, WHITE);
      const [fx, fy] = R([[hx - side * 9 * u, hy - 6 * u]])[0]; p.dot(fx, fy, 2 * u, "#e9edf5");
      break;
    }
    case "clipboard": case "tally": {
      const b = R(rrect(hx - 17 * u, hy - 26 * u, hx + 17 * u, hy + 20 * u, 2.5 * u));
      p.poly(b, "#a8743f", 2.2 * u);
      p.poly(R(rrect(hx - 14 * u, hy - 22 * u, hx + 14 * u, hy + 17 * u, 1 * u)), "#fbf8ef", 1.2 * u);
      p.poly(R(rrect(hx - 7 * u, hy - 29 * u, hx + 7 * u, hy - 22 * u, 1.5 * u)), "#b9bcc8", 1.6 * u);
      if (kind === "tally") {
        for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) {
          const x = hx - 10 * u + k * 3.2 * u, y = hy - 15 * u + r * 8 * u;
          p.stroke(R(k < 4 ? [[x, y - 2.5 * u], [x, y + 2.5 * u]] : [[x - 13 * u, y + 2 * u], [x - 0.5 * u, y - 2 * u]]), 0.9 * u, "#2a3a6a");
        }
      } else for (let r = 0; r < 5; r++) p.stroke(R([[hx - 10 * u, hy - 14 * u + r * 6.5 * u], [hx + (r % 2 ? 6 : 10) * u, hy - 14 * u + r * 6.5 * u]]), 1 * u, "#8a93a8");
      break;
    }
    case "pen": case "chalk": case "brush": {
      const col = kind === "pen" ? "#2f4fa8" : kind === "chalk" ? "#fbfaf4" : "#c9a06a";
      p.band(R([[hx, hy + 4 * u], [hx, hy - 14 * u]]), col, (kind === "chalk" ? 3.4 : 2.6) * u, 0.9 * u, "round");
      if (kind === "brush") { const [tx, ty] = R([[hx, hy - 15 * u]])[0]; p.ell(tx, ty, 2.2 * u, 3.4 * u, WHITE, 1 * u); }
      break;
    }
    case "stopwatch": {
      const [cx, cy] = R([[hx, hy - 26 * u]])[0];
      p.band(R([[hx, hy - 6 * u], [hx, hy - 10 * u]]), "#b9bcc8", 4 * u, 1 * u);
      p.ell(cx, cy - 22 * u, 4.5 * u, 3 * u, "#d0d3dc", 1.6 * u);
      p.ell(cx, cy, 22 * u, 22 * u, "#c9ccd6", 2.4 * u);
      p.ell(cx, cy, 18.5 * u, 18.5 * u, "#fbfaf2", 1.4 * u);
      // n = ticks so far (+1000 = the click flash): a red second hand jumps one step per tick round the dial
      const fl = n >= 1000, tk = fl ? n - 1000 : n, a = rad(-90 + tk * 30);
      for (let k = 0; k < 12; k++) { const b = rad(k * 30); p.stroke([[cx + 15.5 * u * Math.cos(b), cy + 15.5 * u * Math.sin(b)], [cx + 17.5 * u * Math.cos(b), cy + 17.5 * u * Math.sin(b)]], 1.1 * u, "#5a5e6e"); }
      p.text("2:00:00", cx, cy + 5 * u, 8.4 * u, "#1d1f2e", "Arial Black");
      p.stroke([[cx, cy], [cx + 15 * u * Math.cos(a), cy + 15 * u * Math.sin(a)]], 1.6 * u, "#c8343a");
      p.dot(cx, cy, 2 * u, "#c8343a");
      if (fl) { for (let k = 0; k < 8; k++) { const b = rad(k * 45 + 22); p.stroke([[cx + 26 * u * Math.cos(b), cy + 26 * u * Math.sin(b)], [cx + 34 * u * Math.cos(b), cy + 34 * u * Math.sin(b)]], 2 * u, "#fffbe6"); } }
      break;
    }
    case "chip": { // small rainbow petrified-wood chip PINCHED by its edge (fingers below it, the whole cut face shows)
      // n bits: 1 = white paint dot, 2 = glint, 4 = big (the marked-wood insert), 8 = quartz (the dusk tag chip)
      const big = n & 4 ? 1.8 : 1, r = 17 * u * big, cy = hy - r * 0.95; // A6: 1.8x (was 1.45x): the held chips read at phone size
      jasper(p, hx, cy, r, 5 + (n >> 4), { dot: !!(n & 1), quartz: !!(n & 8), ink: 2 * u * big, dotK: n & 4 ? 1.5 : 1 });
      if (n & 2) star4(p, hx - r * 0.6, cy - r * 0.7, r * 1.1, "#fffdf2", 1.2 * u);
      // finger + thumb pinching the lower edge
      p.dot(hx, hy, 5.4 * u);
      p.band([[hx - 3 * u, hy - 2 * u], [hx - 4.5 * u, hy - 8 * u]], INK, 3.4 * u, 0, "round");
      p.band([[hx + 3 * u, hy - 2 * u], [hx + 4.5 * u, hy - 7.5 * u]], INK, 3.2 * u, 0, "round");
      break;
    }
    case "scoop": { // metal hand scoop, handle in the hand, bowl beyond
      p.band(R([[hx, hy + 4 * u], [hx, hy - 20 * u]]), "#7a5236", 4.4 * u, 1.2 * u, "round");
      const b = R([[hx - 11 * u, hy - 20 * u], [hx + 11 * u, hy - 20 * u], [hx + 9 * u, hy - 44 * u], [hx, hy - 48 * u], [hx - 9 * u, hy - 44 * u]]);
      p.gradFill(b, "#c9ced8", "#7f8696", light, 0.3); p.poly(b, null, 2.2 * u);
      // n = chips riding on the blade (a loaded scoop reads as scooping)
      for (let k = 0; k < Math.min(n, 4); k++) {
        const [cx, cy] = R([[hx + (k - 1.5) * 5.5 * u, hy - 38 * u + (k % 2) * 5 * u]])[0];
        jasper(p, cx, cy, 5.6 * u, 31 + k, { ink: 1.2 * u });
      }
      break;
    }
    case "coffee": { // paper coffee cup with a sleeve and a curl of steam (n = frame, steam phase)
      const c = R([[hx - 9 * u, hy - 24 * u], [hx + 9 * u, hy - 24 * u], [hx + 7 * u, hy + 6 * u], [hx - 7 * u, hy + 6 * u]]);
      p.poly(c, "#f4efe4", 1.8 * u);
      p.poly(R([[hx - 8.4 * u, hy - 14 * u], [hx + 8.4 * u, hy - 14 * u], [hx + 7.7 * u, hy - 4 * u], [hx - 7.7 * u, hy - 4 * u]]), "#b07a4a", 1.2 * u);
      p.poly(R(rrect(hx - 10.5 * u, hy - 28 * u, hx + 10.5 * u, hy - 23 * u, 1.5 * u)), "#e9e2d6", 1.4 * u);
      const ph = n * 0.35, st: P2[] = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; st.push([hx + 4 * u * Math.sin(ph + t * 5), hy - 31 * u - 24 * u * t]); }
      const g = p.g; g.save(); g.globalAlpha = 0.7; p.stroke(R(st), 2.2 * u, "#fbfbff"); g.restore();
      p.dot(hx, hy, 5.4 * u);
      break;
    }
    case "letter": {
      // A3: a BIG apology card held up to the lens (~0.3 x 0.22 m): "SORRY!" in bold red hand lettering, a heart doodle,
      // two scribbled lines and a signature squiggle (the key noun reads at phone size)
      const b = R(rrect(hx - 37 * u, hy - 52 * u, hx + 37 * u, hy + 4 * u, 2 * u));
      p.poly(R(rrect(hx - 35 * u, hy - 49 * u, hx + 40 * u, hy + 7 * u, 2 * u)), "rgba(40,20,50,0.25)", 0);
      p.poly(b, "#fbf6e6", 1.8 * u);
      p.text("SORRY!", ...R([[hx - 3 * u, hy - 36 * u]])[0], 18.5 * u, "#c8343a", "Arial Black", "center", rad(ang) - 0.06);
      const hx2 = hx + 22 * u, hy2 = hy - 14 * u, ht: P2[] = [];
      for (let i = 0; i <= 24; i++) { const t = (i / 24) * Math.PI * 2; ht.push([hx2 + 5.5 * u * Math.sin(t) ** 3, hy2 - 4.5 * u * (0.8 * Math.cos(t) - 0.3 * Math.cos(2 * t) - 0.12 * Math.cos(3 * t))]); }
      p.poly(R(ht), "#ef6a7a", 1.2 * u);
      for (let r = 0; r < 2; r++) { const sq: P2[] = []; for (let i = 0; i <= 10; i++) sq.push([hx - 26 * u + i * 3.6 * u, hy - 16 * u + r * 8 * u + 1.2 * u * Math.sin(i * 1.7 + r)]); p.stroke(R(sq), 1.2 * u, "#3e4a7a"); }
      { const sg: P2[] = []; for (let i = 0; i <= 12; i++) sg.push([hx + 4 * u + i * 1.8 * u, hy - 3 * u - 2.2 * u * Math.sin(i * 1.3)]); p.stroke(R(sg), 1.1 * u, "#3e4a7a"); }
      break;
    }
    case "tarp": { // the spare Sign B panel under a blue tarp, carried flat against the hip (rope ties, a flapping corner)
      const b = R(rrect(hx - 40 * u, hy - 30 * u, hx + 36 * u, hy + 22 * u, 4 * u));
      p.gradFill(b, "#4f7fb8", "#35588a", light, 0.3); p.poly(b, null, 2.2 * u);
      for (const k of [-0.45, 0.4]) p.stroke(R([[hx + k * 76 * u - 2 * u, hy - 31 * u], [hx + k * 76 * u + 2 * u, hy + 23 * u]]), 2 * u, "#d9c48e");
      p.poly(R([[hx + 36 * u, hy - 30 * u], [hx + 46 * u, hy - 38 * u + 4 * u * Math.sin(n * 0.9)], [hx + 34 * u, hy - 18 * u]]), "#5a8ac4", 1.6 * u);
      for (let k = 0; k < 3; k++) p.stroke(R([[hx - 30 * u + k * 22 * u, hy - 24 * u], [hx - 26 * u + k * 22 * u, hy + 14 * u]]), 1 * u, "#6f9ad0");
      p.dot(hx, hy, 5.4 * u);
      break;
    }
    case "counter": { // a chrome hand tally counter, thumb on the plunger (n: +1000 = the click)
      const cl2 = n >= 1000;
      p.ell(hx, hy - 6 * u, 9 * u, 9 * u, "#c9ccd6", 1.8 * u);
      p.poly(rrect(hx - 6 * u, hy - 9 * u, hx + 6 * u, hy - 4 * u, 1 * u), "#1d1f2e", 1 * u);
      p.text(String(n % 1000).padStart(3, "0"), hx, hy - 6.5 * u, 4.2 * u, "#f2f2ea", "Arial Black");
      p.band([[hx + 6 * u, hy - 14 * u + (cl2 ? 2 * u : 0)], [hx + 6 * u, hy - 19 * u + (cl2 ? 2 * u : 0)]], "#9aa0ae", 3 * u, 0.8 * u, "round");
      p.dot(hx, hy, 5.4 * u);
      break;
    }
    case "phone": { // a phone held under a desk, its screen glowing
      const b = R(rrect(hx - 7 * u, hy - 26 * u, hx + 7 * u, hy, 2.5 * u));
      p.poly(b, "#1d1f2e", 1.6 * u);
      p.poly(R(rrect(hx - 5.4 * u, hy - 24 * u, hx + 5.4 * u, hy - 2 * u, 1.5 * u)), "#9fe6ff", 0);
      p.dot(hx, hy, 5.4 * u);
      break;
    }
    case "clip": { // a single paperclip with a small red gift bow (thought bubble); n = size x10 (25 = 2.5x)
      // A4: a thick SILVER wire (#C9D2DC) with a plum outline and one white highlight, so it reads as a paperclip at
      // phone size; the bow is under half the clip's size, pinned to its top end (never a heart)
      const z = (n || 10) / 10, v = u * z, wI = 1.55 * v, wS = 0.95 * v;
      const cp = R(rrect(hx - 4 * v, hy - 22 * v, hx + 4 * v, hy + 2 * v, 4 * v));
      p.poly(cp, null, wI, INK); p.poly(cp, null, wS, "#c9d2dc");
      const ci = R(rrect(hx - 1.8 * v, hy - 17 * v, hx + 1.8 * v, hy - 2 * v, 1.8 * v)); p.poly(ci, null, wI, INK); p.poly(ci, null, wS, "#c9d2dc");
      p.stroke(R([[hx - 4 * v + 0.2 * wS, hy - 15 * v], [hx - 4 * v + 0.2 * wS, hy - 5 * v]]), 0.4 * v, "#ffffff");
      const [bx, by] = R([[hx, hy - 23 * v]])[0], b = 0.55 * v;
      p.ell(bx - 4 * b, by - 1.5 * b, 4.2 * b, 2.6 * b, "#f05a6a", 0.6 * v, 0, 360, 25); p.ell(bx + 4 * b, by - 1.5 * b, 4.2 * b, 2.6 * b, "#f05a6a", 0.6 * v, 0, 360, -25);
      p.band([[bx - 1 * b, by], [bx - 3.5 * b, by + 6 * b]], "#e2453c", 1.6 * b, 0.4 * v, "round"); p.band([[bx + 1 * b, by], [bx + 3.5 * b, by + 6 * b]], "#e2453c", 1.6 * b, 0.4 * v, "round");
      p.dot(bx, by - 0.8 * b, 1.9 * b, "#b52f2a");
      break;
    }
    case "panel": { // the spare sign panel held flat in front of the chest (sign swap)
      void th;
      const x0 = Math.min(hx - side * 10 * u, hx + side * 76 * u), x1 = Math.max(hx - side * 10 * u, hx + side * 76 * u);
      const pb = R(rrect(x0, hy - 58 * u, x1, hy + 26 * u, 3 * u));
      p.poly(pb, "#5a3a22", 2.6 * u);
      p.poly(R(rrect(x0 + 5 * u, hy - 53 * u, x1 - 5 * u, hy + 21 * u, 2 * u)), "#f4ead0", 1.4 * u);
      for (let r = 0; r < 3; r++) p.stroke(R([[x0 + 12 * u, hy - 44 * u + r * 9 * u], [x1 - 12 * u, hy - 44 * u + r * 9 * u]]), 3 * u, "#5a3a22");
      for (const k of [0.3, 0.5, 0.7]) { const fx = x0 + (x1 - x0) * k; p.dot(fx, hy - 6 * u, 3.6 * u, "#5a3a22"); p.stroke([[fx, hy - 3 * u], [fx, hy + 12 * u]], 3 * u, "#5a3a22"); }
      break;
    }
  }
};

// ---------------- the rig (geometry shared by drawing and by cast.ts, which needs hand positions) ----------------
export type Target = "hang" | "hip" | "mouth" | "chin" | "head" | "pocket" | "chest" | "chestPocket" | "waist" | "reach" | "ground"
  | "eye" | "up" | "point" | "board" | "show" | "behind" | "lap" | "strap" | "whisper" | "temple" | "raise" | "selfie" | "thumb" | "hipPocket";
/** hand drawing: ball (default), open mitten (whisper), thumbs-up, 1-3 raised fingers (counting), open palm */
export type HandShape = "ball" | "mitten" | "thumb" | "f1" | "f2" | "f3" | "palm";
/** a hand: a named target (or a design point in FINAL canvas units), optionally blended toward b by k, offset in u.
 *  split: draw the arm behind the body and only the hand in front (whisper hand beside the face). n = prop state */
export type Hand = { a: Target | P2; b?: Target | P2; k?: number; dx?: number; dy?: number; hold?: Hold; ang?: number; front?: boolean; bend?: number;
  shape?: HandShape; split?: boolean; n?: number;
  /** arm reach limit in head heights (default 1.12: rubber hose, never a cane) */
  maxLen?: number;
  /** A3: always draw this arm + hand on the TOP layer (over the head and hat), also in a back view (gestures) */
  over?: boolean;
  /** mitten / palm size: paddle height in head heights (default 0.2; the whisper hand ~0.4) */
  sz?: number };
export type PersonOpts = {
  view?: "front" | "back";
  mode?: "stand" | "walk" | "kneel" | "chair" | "squat";
  phase?: number; expr?: Expr; look?: number; lookY?: number; blink?: number; talk?: number;
  tilt?: number; headTilt?: number; nod?: number; breath?: number; wind?: number; squash?: number;
  facing?: -1 | 0 | 1; hands?: [Hand | null, Hand | null];
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; seed?: number;
  /** stride multiplier in walk mode (foot lift) */
  lift?: number;
  /** face extras (feature shift = head turn / look up, one-brow raise, wink, blush, lens glint) */
  face?: FaceX;
  /** weight shift -1..1: that leg takes the weight, the other knee bends */
  shift?: number;
  /** hat lags the head (deg, a rotation spring) / hair end swing (u) */
  hatLag?: number; hairSwing?: number;
  /** backlight rim colour on the upper contours (sunset) and its strength 0..1 (default 1) */
  rim?: string; rimK?: number;
  /** brim shadow strength on the face (0 = none; default by hat) */
  brimShade?: number;
  /** pocket bulge after something went into it (0..1) */
  bulge?: number;
  /** A6: a visible hip-pocket slit on the shorts [side -1 | 1, bulge 0..1, chip peek 0..1] (shot 3) */
  hipSlit?: [number, number, number];
  /** a chip peeking out of the chest pocket: 0 = none, 0..1 = how far it sticks out (top 30 % at ~0.35) */
  pocketChip?: number;
  /** hat brim / ribbon flutter (-1..1, a fast wave on top of the slow wind) */
  flutter?: number;
  /** hide the strap camera (it is up at the eye in a hand) */
  noCam?: boolean;
  /** the hat pops up off the head (design units) */
  hatLift?: number;
  /** A3: a continuous crouch 0..1 (stand mode): hips drop, knees bend out (legs ~35 % shorter), torso tips 8 deg
   *  toward `facing`; negative = a small rise (anticipation / overshoot) */
  crouch?: number;
  /** A3: lower-body plum shade 0..1 (backlit sunset figure / ground separation) */
  lowShade?: number;
  /** A4: reading glasses (glassesUp outfits) dropping from the hair onto the nose 0..1 (>1 = the bounce) */
  glassesDrop?: number;
};
const FRONT_T: Partial<Record<Target, boolean>> = { mouth: true, chin: true, head: true, pocket: true, hipPocket: true, chest: true, chestPocket: true,
  waist: true, eye: true, hip: true, show: true, lap: true, strap: true, whisper: true, temple: true, selfie: true, thumb: true };

export type Rig = ReturnType<typeof rig>;
export const rig = (o: Outfit, opts: PersonOpts) => {
  const { mode = "stand", phase = 0, tilt = 0, headTilt = 0, nod = 0, breath = 0, squash = 0, facing = 0, seed = 1, view = "front" } = opts;
  const Bd = BUILD[o.build ?? "adult"], two = Math.PI * 2;
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, legLen = Bd.legs * HH;
  // walk: the body dips on each footfall (bob ~3 % of the height peak to peak)
  const bob = mode === "walk" ? 0.1 * HH * (opts.lift ?? 1) * (0.5 + 0.5 * Math.cos(2 * two * phase)) : 0;
  let hipY = sole - legLen + 0.12 * HH + bob;
  const ck = mode === "stand" ? clamp(opts.crouch ?? 0, -0.2, 1) : 0;
  if (mode === "kneel") hipY = sole - 0.33 * legLen; // A4: a real kneel (torso ~25 % lower than standing, not a lunge)
  else if (mode === "squat") hipY = sole - 0.36 * legLen;
  else if (mode === "chair") hipY = sole - (o.build === "kid" ? 0.45 : 0.47) / 0.00216; // sitting ON the 0.42 m seats
  else if (ck > 0) hipY += ck * ((sole - 0.4 * legLen) - hipY); // continuous crouch toward a squat (legs ~35 % shorter at 0.6)
  else if (ck < 0) hipY += ck * 0.4 * HH;                      // a small rise (anticipation / overshoot: -0.2 = +2 % height)
  hipY += squash * 0.06 * HH;
  const torsoBot = hipY + 0.12 * HH;
  const hunch = mode === "kneel" ? 0.84 : mode === "squat" ? 0.88 : 1 - 0.1 * Math.max(0, ck); // crouching bodies fold a little
  const th = Bd.torso * HH * hunch * (1 + 0.015 * breath) * (1 - 0.04 * squash);
  const chin = torsoBot - th, hc = chin - H.b + nod * 0.05 * HH, crown = hc - H.b;
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b;
  const sway = mode === "walk" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway + 8 * Math.max(0, ck) * (facing || 1); // upper body rotation about the hips (deg)
  const sh = (side: number): P2 => [tcx + side * 0.8 * T.a, chin + 0.14 * HH];
  const mx = 300 + 8 * u * facing, my = hc + 22 * u;
  const back = view === "back";
  const swing = mode === "walk" ? Math.sin(two * phase) : 0;
  const tgt = (t: Target, side: number): P2 => {
    const S = sh(side);
    switch (t) {
      case "hang": { const f = Math.max(0, swing * side); return [tcx + side * (1.12 * T.a + 7 * u) - side * 5 * u * f, chin + 1.02 * HH - 9 * u * f]; }
      case "hip": return [tcx + side * 1.02 * T.a, torsoBot - 0.42 * HH];
      case "mouth": return [mx + side * 15 * u, my - 2 * u];
      case "chin": return [300 + side * 6 * u, hc + H.b * 0.92];
      case "head": return [300 + side * 0.82 * H.a, hc - 0.62 * H.b];
      case "pocket": return [tcx + side * 0.86 * T.a, torsoBot - 0.16 * HH];
      case "chest": return [tcx + side * 0.2 * T.a, chin + 0.42 * HH];
      case "chestPocket": return [tcx + side * 0.45 * T.a, chin + 0.3 * HH];
      case "waist": return [tcx + side * 0.45 * T.a, chin + 0.72 * HH];
      case "strap": return [tcx - 0.2 * T.a, chin + 0.3 * HH];
      case "lap": return [tcx + side * 0.35 * T.a, torsoBot - 0.05 * HH];
      case "reach": return [tcx + side * 1.55 * T.a, torsoBot + 0.25 * HH];
      case "ground": return [tcx + side * 1.45 * T.a, sole - 10 * u];
      case "whisper": return [300 + side * 1.3 * H.a, my + 0.15 * HH];        // wrist below + outside the mouth: the paddle rises beside it, clear of the face
      case "temple": return [300 + side * 0.9 * H.a, hc - 0.18 * H.b];         // finger tap on the temple
      case "raise": return [tcx + side * 1.15 * T.a, chin - 0.38 * HH];         // hand raised beside the head (counting, waving)
      case "selfie": return [tcx + side * 1.75 * T.a, chin - 0.3 * HH];        // arm out and up, camera toward the face
      case "thumb": return [tcx + side * 1.3 * T.a, chin + 0.22 * HH];          // thumbs-up out in front
      case "eye": return [300 + 8 * u * facing + side * 12 * u, hc + 2 * u];
      case "up": return [tcx + side * 1.4 * T.a, crown - 0.15 * HH];
      case "point": return [tcx + side * 1.95 * T.a, chin - 0.05 * HH];
      case "board": return [tcx + side * 1.25 * T.a, chin - 0.32 * HH];
      case "show": return [tcx + side * 1.3 * T.a, chin + 0.12 * HH];
      case "behind": return [tcx + side * 0.6 * T.a, torsoBot - 0.2 * HH];
      case "hipPocket": return [300 + side * (0.98 * T.a - 6 * u), torsoBot + 0.07 * HH]; // A6: INTO the shorts' hip-pocket slit (the slit + chip peek show inboard of the hand)
    }
    return S;
  };
  // final canvas point -> body space (undo the hip rotation)
  const unrot = (q: P2): P2 => rotAbout(q, -rad(A), [300, hipY]);
  const res = (t: Target | P2, side: number): P2 => (typeof t === "string" ? tgt(t, side) : unrot(t));
  const hands = ([0, 1] as const).map((i) => {
    const side = i ? 1 : -1, h = opts.hands?.[i] ?? { a: "hang" as Target };
    let q = res(h.a, side);
    if (h.b !== undefined) q = lerp2(q, res(h.b, side), clamp(h.k ?? 0, 0, 1));
    q = [q[0] + (h.dx ?? 0) * u, q[1] + (h.dy ?? 0) * u];
    { // rubber-hose arms stretch a little, never into canes: at most ~1.1 x a hanging arm
      const S0 = sh(side), dx = q[0] - S0[0], dy = q[1] - S0[1], l = Math.hypot(dx, dy), mx2 = (h.maxLen ?? 1.12) * HH;
      if (l > mx2) q = [S0[0] + (dx * mx2) / l, S0[1] + (dy * mx2) / l];
    }
    const tg = h.b !== undefined && (h.k ?? 0) > 0.5 ? h.b : h.a; // the dominant target decides front / behind
    let front = h.front ?? (typeof tg === "string" ? !!FRONT_T[tg] : true);
    if (back) front = !front && (typeof tg === "string" && (tg === "up" || tg === "board" || tg === "point" || tg === "head" || tg === "raise" || tg === "temple"));
    if (h.over) front = true;
    return { side, S: sh(side), H: q, front, hold: h.hold ?? null, ang: h.ang ?? 0, bend: h.bend ?? 1, shape: h.shape ?? "ball", split: !!h.split, n: h.n ?? 0,
      whisper: tg === "whisper", sz: h.sz ?? (tg === "whisper" ? 0.4 : 0.2) };
  });
  /** body-space point -> final canvas (design) point */
  const fin = (q: P2): P2 => rotAbout(q, rad(A), [300, hipY]);
  return { Bd, H, W, HH, u, sole, legLen, hipY, torsoBot, chin, hc, crown, T, tcx, tcy, A, headTilt, sh, hands, fin, mx, my, back, mode, phase, ck };
};
/** where hand i ends up on the final canvas (design units): cast.ts places FX (chips, tags) at it */
export const handAt = (o: Outfit, opts: PersonOpts, i: 0 | 1): P2 => { const R = rig(o, opts); return R.fin(R.hands[i].H); };
/** A3: the head centre on the final canvas + the head half width (design units): FX parented to the head (sweat, "!") */
export const headAt = (o: Outfit, opts: PersonOpts): [number, number, number] => { const R = rig(o, opts); const [x, y] = R.fin([300, R.hc]); return [x, y, R.H.a]; };

// ---------------- the person ----------------
const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 2.6, INK);
  p.stroke([a, b], w, col);
};

export const drawPerson = (p: Pen, o: Outfit, opts: PersonOpts) => {
  const R = rig(o, opts);
  const { expr = "neutral", look = 0, lookY = 0, blink = 0, talk = -1, wind = 0, light = DEF_LIGHT, facing = 0, seed = 1 } = opts;
  const { H, W, HH, u, sole, hipY, torsoBot, chin, hc, T, tcx, tcy, A, back, mode, phase } = R;
  const skin = o.skin ?? SKIN, two = Math.PI * 2, thick = thickAngle(light), ow = OW * u;
  // rubber-hose limbs: dark strokes tinted by the clothes (never pale tubes that read as canes)
  const legCol = mix(o.pants, INK, 0.62), sleeve = o.cardigan ?? o.shirt, armCol = o.dress ? mix(o.shirt, INK, 0.82) : mix(sleeve, INK, 0.88); // A3: plum-dark arms read over any shirt
  const legW = 5.4 * u, footW = 7.2 * u, shoe = o.shoes;
  p.rot = null;
  // ---- behind everything: backpack bulk peeking past the shoulders (front) ----
  if (o.backpack && !back) {
    p.rot = A ? [rad(A), 300, hipY] : null;
    const bp = rrect(tcx - 1.08 * T.a, chin - 0.02 * HH, tcx + 1.08 * T.a, chin + 0.75 * HH, 14 * u);
    if (o.bottle) { // a water bottle peeking out of the pack's side pocket (behind the body)
      const bx = tcx - 1.12 * T.a, b = rotPts(rrect(bx - 8 * u, chin + 0.12 * HH, bx + 8 * u, chin + 0.5 * HH, 5 * u), rad(-8), bx, chin + 0.5 * HH);
      p.gradFill(b, o.bottle, mul(o.bottle, SH_CLOTH), light, 0.3); p.poly(b, null, ow * 0.6);
      p.poly(rotPts(rrect(bx - 6 * u, chin + 0.07 * HH, bx + 6 * u, chin + 0.13 * HH, 2 * u), rad(-8), bx, chin + 0.5 * HH), "#3a3f4a", ow * 0.5);
      p.stroke(rotPts([[bx - 4 * u, chin + 0.2 * HH], [bx - 4 * u, chin + 0.42 * HH]], rad(-8), bx, chin + 0.5 * HH), 1.6 * u, mix(o.bottle, "#ffffff", 0.5));
    }
    p.gradFill(bp, o.backpack, mul(o.backpack, SH_CLOTH), light); p.poly(bp, null, ow * 0.8);
    p.rot = null;
  }
  // ---- legs + feet (not rotated) ----
  const hx = (s: number) => 300 + s * 14 * u;
  if (mode === "kneel") {
    // one knee down: thigh to the knee on the ground, shin flat behind it (26u), sole turned up; the other foot planted
    // with its knee up toward the chip side (facing)
    const s = facing || 1, kx = hx(-s) - s * 2 * u;
    p.stroke(curve([hx(-s), hipY], [hx(-s) - s * 3 * u, (hipY + sole) / 2], [kx, sole - 6 * u]), legW, legCol);
    p.stroke([[kx, sole - 6 * u], [kx - s * 26 * u, sole - 6 * u]], legW, legCol);
    footStroke(p, [kx - s * 26 * u, sole - 6 * u], [kx - s * 30 * u, sole - 15 * u], footW, shoe);
    const kn: P2 = [hx(s) + s * 46 * u, hipY - 0.1 * HH]; // the raised knee sticks out past the torso so the kneel reads
    p.stroke([[hx(s), hipY], kn, [hx(s) + s * 38 * u, sole - 5 * u]], legW, legCol);
    footStroke(p, [hx(s) + s * 35 * u, sole - 4 * u], [hx(s) + s * 49 * u, sole - 3 * u], footW, shoe);
  } else if (mode === "squat") {
    for (const s of [-1, 1]) {
      const kn: P2 = [300 + s * 38 * u, hipY - 0.04 * HH];
      p.stroke([[hx(s), hipY], kn, [300 + s * 24 * u, sole - 5 * u]], legW, legCol);
      footStroke(p, [300 + s * 21 * u, sole - 4 * u], [300 + s * 34 * u, sole - 3 * u], footW, shoe);
    }
  } else if (mode === "chair") {
    for (const s of [-1, 1]) {
      const kn: P2 = [300 + s * 17 * u, hipY + 0.1 * HH];
      p.stroke([[hx(s), hipY], kn, [300 + s * 19 * u, sole - 5 * u]], legW, legCol);
      footStroke(p, [300 + s * 16 * u, sole - 4 * u], [300 + s * 29 * u, sole - 3 * u], footW, shoe);
    }
  } else {
    const L = mode === "walk" ? 34 * (opts.lift ?? 1) : 0, sh2 = clamp(opts.shift ?? 0, -1, 1);
    const ck = Math.max(0, R.ck);
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      // weight shift: the loaded leg stays straight, the free one bends its knee in and lifts the heel a touch
      const free = mode === "walk" ? 0 : Math.max(0, -sh2 * side) * (1 - ck);
      const fx = 300 + side * (21 - 4 * free + 4 * ck) * u, fy = sole - 4 * u - up - 3 * u * free;
      let k: P2 = [(hx(side) + fx) / 2 + side * (1.5 * u + up * 0.16) - side * 9 * u * free, (hipY + fy) / 2 - up * 0.08 + 2 * u * free];
      if (ck > 0) k = lerp2(k, [300 + side * 40 * u, hipY + 0.02 * HH], Math.min(1, ck * 1.15)); // crouch: the knees bend OUT
      p.stroke(curve([hx(side), hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * (back ? 6 : 12) * u, fy + 0.5 * u], footW, shoe);
    }
  }
  // ---- upper body: rotates about the hips ----
  p.rot = A ? [rad(A), 300, hipY] : null;
  const tp = blobPts(tcx, tcy, T);
  type HR = (typeof R.hands)[number];
  const drawArm = (h: HR, part: "all" | "arm" | "hand" = "all") => {
    const S = h.S, Hd = h.H, dx = Hd[0] - S[0], dy = Hd[1] - S[1], l = Math.hypot(dx, dy) || 1;
    if (part !== "hand") {
      if (h.whisper) {
        // whisper: upper arm down and OUT from the near shoulder (clear of the dress), forearm rising outside the head
        // silhouette to the wrist below the paddle hand
        const E: P2 = [S[0] + h.side * 1.0 * T.a, S[1] + 0.22 * HH];
        p.stroke(curve(S, [S[0] + h.side * 0.62 * T.a, S[1] + 0.17 * HH], E, 6).concat(curve(E, [E[0] + h.side * 5 * u, (E[1] + Hd[1]) / 2], Hd, 8)), 5.2 * u, armCol);
      } else {
        // elbow: bulge outward (away from the body centre), more when the arm is bent short
        const out = h.side, bulge = (0.16 + 0.22 * clamp(1 - l / (1.05 * HH), 0, 1)) * l * h.bend;
        let nx = -dy / l, ny = dx / l; if (nx * out < 0) { nx = -nx; ny = -ny; }
        const E: P2 = [(S[0] + Hd[0]) / 2 + nx * bulge, (S[1] + Hd[1]) / 2 + ny * bulge];
        p.stroke(curve(S, E, Hd), 5.6 * u, armCol);
      }
    }
    if (part === "arm" || h.hold === "panel") return;
    const sh0 = h.shape, sd = h.side;
    if (sh0 === "mitten" || sh0 === "palm") {
      // A3 open hand: a skin-coloured MITTEN PADDLE rising from the wrist (fingers up), plum outline, a thumb on the
      // body side, two finger-split lines; "palm" adds a crease. Size h.sz head heights (the whisper hand ~0.4)
      const hh2 = h.sz * HH, ww = 0.58 * hh2, a = rad(sd * 10 + h.ang), z = hh2 / (0.2 * HH);
      const R2 = (pts: P2[]) => rotPts(pts, a, Hd[0], Hd[1]);
      const pad = R2(rrect(Hd[0] - ww / 2, Hd[1] - hh2, Hd[0] + ww / 2, Hd[1] + 0.08 * hh2, ww * 0.42, 6));
      const th2 = R2(ellPts(Hd[0] - sd * ww * 0.52, Hd[1] - 0.32 * hh2, ww * 0.2, hh2 * 0.24, 0, 360, -sd * 28, 20));
      // A4: the open hand matches the ball hands (dark plum, a soft lighter rim on the lit side + pale finger splits),
      // so every hand in a frame shares one style
      const HC = "#3a2836", HL = "#8a7590";
      p.poly(th2, HC, 1.5 * u * Math.sqrt(z));
      p.poly(pad, HC, 1.6 * u * Math.sqrt(z));
      p.g.save(); p.g.globalAlpha = 0.6; p.clip(pad, () => p.shadedFill(pad, "rgba(0,0,0,0)", "rgba(150,130,170,0.55)", light + Math.PI, ww * 0.6, 0.35)); p.g.restore();
      for (const k of [-1, 1]) p.stroke(R2([[Hd[0] + k * ww * 0.17, Hd[1] - hh2 * 0.98], [Hd[0] + k * ww * 0.15, Hd[1] - hh2 * 0.68]]), 1.1 * u * Math.sqrt(z), HL);
      if (sh0 === "palm") p.arc(...R2([[Hd[0], Hd[1] - 0.22 * hh2]])[0], ww * 0.28, hh2 * 0.1, 20, 160, 1 * u, HL);
      return;
    }
    p.dot(Hd[0], Hd[1], 5.4 * u);
    if (sh0 === "thumb") p.band([[Hd[0] + sd * 1 * u, Hd[1] - 3 * u], [Hd[0] + sd * 1.5 * u, Hd[1] - 11 * u]], INK, 3.4 * u, 0, "round");
    else if (sh0 === "f1" || sh0 === "f2" || sh0 === "f3") {
      const n = +sh0[1];
      for (let k = 0; k < n; k++) { const x = Hd[0] + (k - (n - 1) / 2) * 3.6 * u; p.band([[x, Hd[1] - 3 * u], [x + (k - (n - 1) / 2) * 1 * u, Hd[1] - 12.5 * u]], INK, 2.8 * u, 0, "round"); }
    }
  };
  const props = (h: HR) => { if (h.hold && !(back && !h.front)) holdProp(p, h.hold, h.H[0], h.H[1], u, h.ang, h.side, light, h.n); };
  for (const h of R.hands) if (!h.front || h.split) { drawArm(h, h.split ? "arm" : "all"); if (!back && !h.split) props(h); }
  // ---- skirt / shorts ----
  const waist = torsoBot - 0.3 * HH;
  if (o.shorts && mode !== "chair") {
    const y0 = hipY - 0.12 * HH, y1 = hipY + (mode === "kneel" || mode === "squat" ? 0.26 : 0.42) * HH, wx = 0.98 * T.a;
    const sp: P2[] = [[300 - wx, y0], [300 + wx, y0], [300 + wx + 4 * u, y1], [300 + 3 * u, y1], [300, y1 - 0.12 * HH], [300 - 3 * u, y1], [300 - wx - 4 * u, y1]];
    p.gradFill(sp, o.pants, mul(o.pants, SH_CLOTH), light);
    if (opts.lowShade) { const g = p.g; g.save(); g.fillStyle = `rgba(60,25,70,${0.3 * opts.lowShade})`; p.path(sp, true); g.fill(); g.restore(); }
    p.inkRing(sp, ow * 0.75, thick);
    if (!back && mode !== "kneel" && mode !== "squat") for (const s of [-1, 1]) { // hip pocket slits with dashed stitching
      const st = mix(o.pants, "#1f2a5c", 0.55), x0 = 300 + s * (wx - 4 * u), x1 = 300 + s * (wx - 17 * u);
      p.stroke(curve([x0, y0 + 2 * u], [x1 + s * 2 * u, y0 + 9 * u], [x0 + s * 1 * u, y0 + 22 * u], 6), 1.8 * u, st);
      for (let k = 0; k < 4; k++) { const yy = y0 + 4 * u + k * 5 * u; p.stroke([[x0 - s * (6 + 0.6 * k) * u, yy], [x0 - s * (6 + 0.6 * k) * u, yy + 2.2 * u]], 0.9 * u, mix(o.pants, "#ffffff", 0.35)); }
    }
  }
  // ---- torso / dress ----
  let body = tp;
  if (!o.dress && wind && mode !== "chair") { // loose shirt hem flutters in the wind (lower third of the torso sways, rippling)
    body = tp.map(([x, y]) => { const k = clamp((y - (tcy + 0.35 * T.b)) / (0.65 * T.b), 0, 1); return [x + wind * 3.2 * u * k + k * 0.9 * u * Math.sin(x * 0.08 + wind * 3), y] as P2; });
  }
  let hem: P2[] = [], dressK = { fl: 0, wR: 0, hemY: 0 };
  if (o.dress) {
    const top = keepRun(tp, ([, y]) => y < waist);
    const ft = opts.flutter ?? 0, hemY = hipY + (mode === "chair" ? 0.25 : mode === "kneel" || mode === "squat" ? 0.4 : 0.62) * HH, fl = (wind * 7 + ft * 3.6) * u;
    const wR = (1.28 + 0.025 * ft) * T.a, skirt: P2[] = [];
    skirt.push([tcx + 0.92 * T.a, waist], [tcx + wR + fl, hemY - 3 * u]);
    // the hem ripples (a wave running along it with the gusts: 4-6 px at 1080 in a MS)
    for (let i = 0; i <= 12; i++) { const t = i / 12; skirt.push([tcx + wR + fl - 2 * wR * t + fl * 0.4 * Math.sin(Math.PI * t), hemY + (3.2 + 2.2 * Math.abs(ft)) * u * Math.sin(t * Math.PI * 4 + wind * 2 + ft * 3)]); }
    hem = skirt.slice(2, 15);
    skirt.push([tcx - wR + fl, hemY - 3 * u], [tcx - 0.92 * T.a, waist]);
    body = [...top, ...skirt];
    dressK = { fl, wR, hemY };
  }
  p.gradFill(body, o.shirt, mul(o.shirt, SH_CLOTH), light);
  p.clip(body, () => {
    const pc = o.print;
    if (pc === "hawaii") {
      const fl = o.printPale ? "#f6c79a" : mix(o.shirt, "#fff3dc", 0.62), cen = o.printPale ? "#f2b07a" : "#e2453c", leaf = mix(o.shirt, "#f6d58a", o.printPale ? 0.3 : 0.5);
      for (let i = 0; i < 11; i++) {
        const x = tcx + (rnd(seed + 40, i) - 0.5) * 2.1 * T.a, y = chin + (0.06 + 0.92 * ((i + rnd(seed + 41, i)) / 11)) * (torsoBot - chin);
        const r = (5.5 + 2.5 * rnd(seed + 42, i)) * u, a0 = rnd(seed + 43, i) * 72;
        p.ell(x + 7 * u, y + 5 * u, r * 0.9, r * 0.45, leaf, 0, 0, 360, a0 + 30);
        for (let k = 0; k < 5; k++) { const a = rad(a0 + k * 72); p.ell(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, r * 0.36, fl, 0, 0, 360, a0 + k * 72); }
        p.dot(x, y, r * 0.24, cen);
      }
    } else if (pc === "palm" || pc === "pine") {
      // A3 tourist print variety: palm fronds or little pineapples (paler than the shirt, no red centres)
      const lt = mix(o.shirt, "#fff3dc", 0.55), gr = mix(o.shirt, "#4f8a4a", 0.55);
      for (let i = 0; i < 9; i++) {
        const x = tcx + (rnd(seed + 44, i) - 0.5) * 2.1 * T.a, y = chin + (0.08 + 0.9 * ((i + rnd(seed + 45, i)) / 9)) * (torsoBot - chin), r = (6 + 2.5 * rnd(seed + 46, i)) * u;
        if (pc === "palm") {
          const a0 = rad(-90 + (rnd(seed + 47, i) - 0.5) * 50);
          for (let k = -2; k <= 2; k++) { const a = a0 + k * 0.55, tip: P2 = [x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3 + Math.abs(k) * 2 * u];
            p.stroke(curve([x, y], [(x + tip[0]) / 2 + 2 * u * k, (y + tip[1]) / 2 - 2 * u], tip, 5), 2.2 * u, k % 2 ? gr : lt); }
          p.stroke([[x, y], [x + 1.5 * u, y + r * 1.1]], 1.6 * u, mix(o.shirt, "#7a4a2e", 0.4));
        } else {
          p.ell(x, y + 1.5 * u, r * 0.45, r * 0.62, lt, 0);
          for (let k = -1; k <= 1; k++) p.stroke([[x + k * r * 0.22, y + 1.5 * u - r * 0.5], [x + k * r * 0.22 - r * 0.25, y + 1.5 * u + r * 0.5]], 0.8 * u, mix(o.shirt, "#c88a30", 0.5));
          for (const k of [-1, 0, 1]) p.ell(x + k * 2.2 * u, y - r * 0.68, 1.5 * u, r * 0.32, gr, 0, 0, 360, k * 25);
        }
      }
    } else if (pc === "plaid") {
      for (let k = -4; k <= 4; k++) { p.stroke([[tcx + k * 14 * u, chin - 10 * u], [tcx + k * 14 * u, torsoBot + 10 * u]], 2 * u, shade(o.shirt, 0.82)); p.stroke([[tcx - 80 * u, chin + 0.1 * HH + k * 14 * u], [tcx + 80 * u, chin + 0.1 * HH + k * 14 * u]], 2 * u, shade(o.shirt, 0.82)); }
    }
    if (back && (o.vest || o.cardigan)) { const vc = (o.vest ?? o.cardigan)!; p.gradFill(tp, vc, mul(vc, SH_CLOTH), light); p.stroke([[tcx, chin + 0.2 * HH], [tcx, torsoBot]], 1.6 * u, shade(vc, 0.75)); }
    else if (o.vest || o.cardigan) {
      const vc = (o.vest ?? o.cardigan)!, gap = o.vest ? 9 * u : 7 * u;
      for (const s of [-1, 1]) {
        const panel: P2[] = [[tcx + s * gap, chin + 0.36 * HH], [tcx + s * 0.36 * T.a, chin - 0.1 * HH], [tcx + s * 1.3 * T.a, chin - 0.1 * HH],
          [tcx + s * 1.3 * T.a, torsoBot + 0.2 * HH], [tcx + s * (gap - 1 * u), torsoBot + 0.2 * HH]];
        p.gradFill(panel, vc, mul(vc, SH_CLOTH), light);
        p.stroke([[tcx + s * gap, torsoBot + 0.2 * HH], [tcx + s * gap, chin + 0.36 * HH], [tcx + s * 0.36 * T.a, chin - 0.1 * HH]], 2.2 * u);
        if (o.vest) for (const yy of [0.42, 0.78]) {
          const py = chin + yy * HH, px = tcx + s * 0.55 * T.a;
          if (o.pocketPeek === "pen" && s > 0 && yy < 0.5) { p.band([[px + 3 * u, py - 1 * u], [px + 4 * u, py - 15 * u]], "#2f4fa8", 2.8 * u, 0.9 * u, "round"); p.stroke([[px + 5.2 * u, py - 12 * u], [px + 5.6 * u, py - 3 * u]], 1.2 * u, "#c9ccd6"); } // A4: a pen clipped in the vest pocket
          p.poly(rrect(px - 9 * u, py - 5 * u, px + 9 * u, py + 9 * u, 1.5 * u), shade(vc, 0.94), 1.6 * u);
          p.stroke([[px - 9 * u, py - 1 * u], [px + 9 * u, py - 1 * u]], 1.4 * u);
        }
      }
      if (o.cardigan) for (let i = 0; i < 4; i++) p.dot(tcx + gap + 3.5 * u, chin + 0.45 * HH + i * 0.17 * HH, 2.2 * u, "#e9e2d2");
    }
    if (o.pocket && !back) { // chest pocket with a flap + button (the dusk chip goes in here); a pen or a folded map peeks out
      const px = tcx - 0.45 * T.a, py = chin + 0.3 * HH, bl = opts.bulge ?? 0, dk = shade(o.shirt, 0.8);
      if (o.pocketPeek === "pen" && !opts.pocketChip) p.band([[px + 5 * u, py - 6 * u], [px + 6 * u, py - 19 * u]], "#2f4fa8", 3 * u, 0.9 * u, "round");
      if (o.pocketPeek === "map" && !opts.pocketChip) { p.poly([[px - 8 * u, py - 6 * u], [px - 7 * u, py - 17 * u], [px + 3 * u, py - 16 * u], [px + 2 * u, py - 6 * u]], "#efe6c8", 1.3 * u); p.stroke([[px - 6 * u, py - 12 * u], [px + 1 * u, py - 14 * u]], 1 * u, "#c8343a"); }
      const pc = opts.pocketChip ?? 0;
      if (pc > 0) jasper(p, px + 1 * u, py - 8 * u - 16 * u * (pc - 0.35), 11.5 * u, 7, { ink: 1.6 * u });
      p.poly(rrect(px - 11 * u - bl * 1.5 * u, py - 9 * u, px + 11 * u + bl * 1.5 * u, py + 11 * u + bl * 3 * u, 2 * u + bl * 3 * u), dk, 1.7 * u);
      if (bl > 0) p.ell(px, py + 3 * u, 6 * u * bl, 4.5 * u * bl, shade(o.shirt, 0.9), 0);
      p.poly([[px - 11.5 * u, py - 9 * u], [px + 11.5 * u, py - 9 * u], [px + 11 * u, py - 3 * u], [px, py - 1 * u], [px - 11 * u, py - 3 * u]], shade(o.shirt, 0.72), 1.5 * u);
      p.dot(px, py - 2.6 * u, 1.6 * u, "#efe6d6");
    }
    if (o.sweater && !back) { // knit rib hem + cuffs lines on the sweater
      for (let k = -5; k <= 5; k++) p.stroke([[tcx + k * 6.5 * u, torsoBot - 0.1 * HH], [tcx + k * 6.5 * u, torsoBot + 2 * u]], 1.2 * u, shade(o.shirt, 0.78));
      p.stroke([[tcx - 1.2 * T.a, torsoBot - 0.11 * HH], [tcx + 1.2 * T.a, torsoBot - 0.11 * HH]], 1.6 * u, shade(o.shirt, 0.72));
    }
    if (o.dress) {
      // A3 sundress detail: a 15 % darker far side, 3 soft fold lines from the waist that swing with the wind, a small
      // patch pocket, a white scalloped hem trim (~3 % of the dress height); the waist sash on top
      const g = p.g, fs = Math.cos(light) <= 0 ? 1 : -1, { fl, wR, hemY } = dressK;
      const [ax, ay] = p.P(tcx + fs * 0.15 * wR, waist), [bx, by] = p.P(tcx + fs * 1.05 * wR, waist);
      const sg = g.createLinearGradient(ax, ay, bx, by); sg.addColorStop(0, "rgba(30,20,70,0)"); sg.addColorStop(1, "rgba(30,20,70,0.17)");
      g.save(); g.fillStyle = sg; p.path(body, true); g.fill(); g.restore();
      const fold = shade(o.shirt, 0.8), foldL = mix(o.shirt, "#ffffff", 0.22);
      for (const [k, w2] of [[-0.55, 1.6], [0.05, 1.3], [0.55, 1.6]] as const) {
        const x0 = tcx + k * 0.75 * T.a, x1 = tcx + k * wR + fl * (0.7 + 0.3 * k);
        p.stroke(curve([x0, waist + 6 * u], [(x0 + x1) / 2 + fl * 0.3 + k * 3 * u, (waist + hemY) / 2], [x1, hemY - 5 * u], 8), w2 * u, fold);
        p.stroke(curve([x0 + 2.2 * u, waist + 10 * u], [(x0 + x1) / 2 + fl * 0.3 + k * 3 * u + 2.2 * u, (waist + hemY) / 2], [x1 + 2 * u, hemY - 9 * u], 8), 0.9 * u, foldL);
      }
      const pk = -fs, px = tcx + pk * 0.62 * T.a + fl * 0.3, py = waist + 0.2 * HH;
      p.poly(rrect(px - 10 * u, py - 6 * u, px + 10 * u, py + 11 * u, 3 * u), shade(o.shirt, 0.9), 1.4 * u);
      p.stroke([[px - 8 * u, py - 3 * u], [px + 8 * u, py - 3 * u]], 0.9 * u, mix(o.shirt, "#ffffff", 0.5));
      if (hem.length) {
        const trim = "#fbf7ee";
        for (let i = 0; i < hem.length - 1; i++) {
          const [x0, y0] = hem[i], [x1, y1] = hem[i + 1];
          for (const t of [0.25, 0.75]) { const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; p.ell(x, y - 1.6 * u, 2.9 * u, 2.6 * u, trim, 0); }
        }
        p.stroke(hem.map(([x, y]) => [x, y - 4.6 * u] as P2), 1.6 * u, trim);
      }
      p.band([[tcx - 1.4 * T.a, waist - 1 * u], [tcx + 1.4 * T.a, waist - 1 * u]], mix("#1fa6a0", "#ffffff", 0.45), 4.4 * u, 1.2 * u);
    }
    if (opts.lowShade) { // A3: lower-body plum shade (backlit sunset figures read against the orange floor)
      const g = p.g, [ax, ay] = p.P(tcx, chin + 0.35 * HH), [bx, by] = p.P(tcx, torsoBot + 0.1 * HH);
      const lg = g.createLinearGradient(ax, ay, bx, by); lg.addColorStop(0, "rgba(60,25,70,0)"); lg.addColorStop(1, `rgba(60,25,70,${0.3 * opts.lowShade})`);
      g.save(); g.fillStyle = lg; p.path(body, true); g.fill(); g.restore();
    }
    if (o.print === "book" && !back) { // plain open-book icon (no logo)
      const bx = tcx + 2 * u * facing, by = chin + 0.42 * HH;
      for (const s of [-1, 1]) p.poly([[bx, by - 7 * u], [bx + s * 15 * u, by - 10 * u], [bx + s * 15 * u, by + 7 * u], [bx, by + 10 * u]], "#fbf6e6", 1.8 * u);
      for (const s of [-1, 1]) for (let r = 0; r < 3; r++) p.stroke([[bx + s * 3.5 * u, by - 4 * u + r * 4.6 * u], [bx + s * 12 * u, by - 6 * u + r * 4.6 * u]], 1 * u, "#8a93a8");
    }
    if (back && o.backpack) {
      const bp = rrect(tcx - 0.86 * T.a, chin + 0.02 * HH, tcx + 0.86 * T.a, chin + 0.9 * HH, 16 * u);
      p.gradFill(bp, o.backpack, mul(o.backpack, SH_CLOTH), light); p.poly(bp, null, ow * 0.8);
      p.poly(rrect(tcx - 0.6 * T.a, chin + 0.5 * HH, tcx + 0.6 * T.a, chin + 0.84 * HH, 9 * u), shade(o.backpack, 0.9), 1.8 * u);
      p.arc(tcx, chin + 0.12 * HH, 0.78 * T.a, 0.12 * HH, 180, 360, 1.6 * u, shade(o.backpack, 0.6));
    }
  });
  p.inkRing(body, ow, thick);
  // backlight rim (drawn before the head covers the neck): A3 wider (~5 px at a MS), running down the sides to the hips
  if (opts.rim) rimLine(p, body, ow * 0.5, opts.rim, 2.6 * u * (opts.rimK ?? 1), tcy + 0.55 * T.b);
  // ---- on top of the torso: straps, camera, collar, tie ----
  if (o.backpack && !back) for (const s of [-1, 1]) {
    p.band([[tcx + s * 0.5 * T.a, chin + 0.02 * HH], [tcx + s * 0.62 * T.a, chin + 0.78 * HH]], shade(o.backpack, 0.85), 5.5 * u, 1.3 * u);
    p.poly(rrect(tcx + s * 0.6 * T.a - 3.5 * u, chin + 0.5 * HH, tcx + s * 0.6 * T.a + 3.5 * u, chin + 0.58 * HH, 1 * u), "#c9ccd2", 1.2 * u);
    if (o.carabiner && s > 0) { // a carabiner swinging on the right strap (wind + body sway, counter to the lean)
      const cx2 = tcx + 0.6 * T.a, cy2 = chin + 0.58 * HH, sw2 = rad(wind * 14 + 10 * Math.sin(two * phase) + 8 * (opts.flutter ?? 0) - 0.8 * A);
      p.poly(rotPts(ellPts(cx2, cy2 + 7 * u, 4.6 * u, 7 * u, 0, 360, 0, 18), sw2, cx2, cy2), null, 2.2 * u, "#d8a020");
      p.stroke(rotPts([[cx2 + 3.6 * u, cy2 + 3 * u], [cx2 + 3.6 * u, cy2 + 10 * u]], sw2, cx2, cy2), 1.2 * u, "#8a6a10");
    }
  }
  if (o.camera === "cross" && !opts.noCam) {
    const a: P2 = [tcx - 0.62 * T.a, chin + 0.04 * HH], b: P2 = [tcx + 0.92 * T.a, torsoBot - 0.36 * HH];
    p.band([a, b], "#5a3a26", 2.8 * u, 1 * u);
    if (!back) {
      const sw = wind * 6 + 3 * Math.sin(two * phase) + 3 * (opts.flutter ?? 0) - 0.6 * A; // A3: the camera hangs: it counter-swings a lean
      const cam = rotPts(rrect(b[0] - 11 * u, b[1] - 2 * u, b[0] + 11 * u, b[1] + 14 * u, 2.5 * u), rad(sw), b[0], b[1]);
      p.poly(cam, "#3b3a46", 2 * u);
      const [lx, ly] = rotPts([[b[0], b[1] + 6.5 * u]], rad(sw), b[0], b[1])[0];
      p.ell(lx, ly, 5 * u, 5 * u, "#b9bcc8", 1.6 * u); p.dot(lx, ly, 2.6 * u, "#1b1d2c"); p.dot(lx - 1 * u, ly - 1 * u, 0.9 * u, WHITE);
    }
  } else if (o.camera === "neck" && !back && !opts.noCam) {
    const cy = chin + 0.42 * HH, sw = wind * 4 + 3 * Math.sin(two * phase) + 2.5 * (opts.flutter ?? 0);
    for (const s of [-1, 1]) p.stroke([[tcx + s * 0.42 * T.a, chin + 0.02 * HH], [tcx + s * 9 * u, cy - 2 * u]], 1.8 * u, "#2a2228");
    const cam = rotPts(rrect(tcx - 12 * u, cy - 2 * u, tcx + 12 * u, cy + 13 * u, 2.5 * u), rad(sw), tcx, cy);
    p.poly(cam, "#3b3a46", 2 * u);
    const [lx, ly] = rotPts([[tcx, cy + 6 * u]], rad(sw), tcx, cy)[0];
    p.ell(lx, ly, 5 * u, 5 * u, "#b9bcc8", 1.6 * u); p.dot(lx, ly, 2.6 * u, "#1b1d2c");
  }
  if (o.collar && !back) {
    if (o.sweater) p.poly([[tcx - 15 * u, chin - 0.01 * HH], [tcx + 15 * u, chin - 0.01 * HH], [tcx, chin + 0.24 * HH]], shade(o.shirt, 0.78), 1.6 * u); // sweater V
    for (const s of [-1, 1]) p.poly([[tcx + s * 1 * u, chin + 0.08 * HH], [tcx + s * 20 * u, chin - 0.03 * HH], [tcx + s * 17 * u, chin + 0.2 * HH]], "#f6f3ec", 1.8 * u);
  }
  if (o.starBadge && !back) star4(p, tcx + 0.5 * T.a, chin + 0.36 * HH, 11 * u, "#ffd23a", 1.6 * u);
  if (o.badge && !back) { // lanyard + ID badge
    p.stroke([[tcx - 0.42 * T.a, chin + 0.02 * HH], [tcx + 0.28 * T.a, chin + 0.46 * HH], [tcx + 0.52 * T.a, chin + 0.02 * HH]], 1.6 * u, "#c8343a");
    const bx = tcx + 0.28 * T.a, by2 = chin + 0.46 * HH;
    p.poly(rrect(bx - 8 * u, by2, bx + 8 * u, by2 + 20 * u, 1.5 * u), "#fbf8ef", 1.5 * u);
    p.poly(rrect(bx - 5 * u, by2 + 3 * u, bx + 5 * u, by2 + 10 * u, 1 * u), "#8fb2d6", 0);
    for (const k of [13, 16]) p.stroke([[bx - 5 * u, by2 + k * u], [bx + 5 * u, by2 + k * u]], 1 * u, "#8a93a8");
  }
  if (o.fanny && !back) { // fanny pack on the belly
    p.stroke([[tcx - 1.05 * T.a, torsoBot - 0.22 * HH], [tcx + 1.05 * T.a, torsoBot - 0.24 * HH]], 2.2 * u, "#2a2228");
    const fb = rrect(tcx - 20 * u, torsoBot - 0.3 * HH, tcx + 18 * u, torsoBot - 0.14 * HH, 6 * u);
    p.gradFill(fb, o.fanny, mul(o.fanny, SH_CLOTH), light); p.poly(fb, null, 1.8 * u);
    p.stroke([[tcx - 15 * u, torsoBot - 0.24 * HH], [tcx + 13 * u, torsoBot - 0.24 * HH]], 1.1 * u, shade(o.fanny, 0.6));
  }
  if (o.tie && !back) {
    p.poly([[tcx - 5 * u, chin + 0.02 * HH], [tcx + 5 * u, chin + 0.02 * HH], [tcx + 3 * u, chin + 0.1 * HH], [tcx - 3 * u, chin + 0.1 * HH]], o.tie, 1.6 * u);
    p.poly([[tcx - 3 * u, chin + 0.1 * HH], [tcx + 3 * u, chin + 0.1 * HH], [tcx + 7 * u, chin + 0.62 * HH], [tcx, chin + 0.72 * HH], [tcx - 7 * u, chin + 0.62 * HH]], o.tie, 1.6 * u);
    for (let k = 0; k < 4; k++) p.stroke([[tcx - 5 * u, chin + (0.2 + 0.13 * k) * HH], [tcx + 5 * u, chin + (0.15 + 0.13 * k) * HH]], 1.6 * u, shade(o.tie, 0.7));
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + R.headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  const headRot = (extra: number): number[] | null => {
    // head rotation about the chin, plus an extra rotation about the head centre (hat lag), as one Pen rotation
    if (!Ah && !extra) return null;
    const a1 = rad(Ah + extra), a0 = rad(Ah), c1x = 0, c1y = hc - chin; // head centre relative to the chin
    const r = (x: number, y: number, a: number): P2 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const q1 = r(-c1x, -c1y, a1), q0 = r(c1x, c1y, a0);
    return [a1, 300, chin, cpx - 300 + q1[0] + q0[0], cpy - chin + q1[1] + q0[1]];
  };
  p.rot = headRot(0);
  hairBehind(p, o, H, 300, hc, light, thick, ow, wind, back, opts.hairSwing ?? 0, facing);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  const hatted = !!o.hat && o.hat !== "visor";
  if (back && facing) {
    // back 3/4 (A3): the head turns toward `facing`: a ~25 % cheek crescent shows on that side (the hair cap slides
    // away), with one white-rimmed side-eye looking further round, the glasses' temple arm + lens edge, a brow tick
    // A5 (audit: the white eye inside the crescent read as a sticker / headband): a real 3/4 rear view. The hair dome
    // covers ~86 % of the head; on the turning side a thin skin sliver (~14 % of the head width) with the CHEEK bulging
    // a little past the skull contour (inked, continuous), a short brow tick and a lash tick poking past the contour
    // (they tilt up when the character looks up); no eye white. Glasses: just the temple arm.
    // A6 P1 (still read as a white comma inside the hair): a narrower sliver (~17 % of the head) tinted toward the
    // lavender far side, never a pure-white crescent
    const sl = 0.19 * H.a, skinQ = mix(skin, "#b9a8d2", 0.32);
    p.clip(hp, () => { p.poly(hp, skinQ, 0); });
    p.clip(hp, () => {
      const g = p.g; g.save();
      hairOn(p, o, hp.map(([x, y]) => [x - facing * sl, y] as P2), H, 300 - facing * sl, hc, light, ow, back, hatted);
      g.restore();
    });
    const ly = clamp(opts.lookY ?? 0, -1.5, 1.5), cx0 = 300 + facing * 0.9 * H.a, cy0 = hc + 0.3 * H.b;
    // the cheek: a skin ellipse bulging ~5 % past the contour at jaw height, its seam hidden under the head fill
    const ck: P2[] = []; for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 2; ck.push([cx0 + 0.16 * H.a * Math.cos(a), cy0 + 0.26 * H.b * Math.sin(a)]); }
    p.poly(ck, skinQ, ow * 0.9);
    p.clip(hp, () => { p.poly(ck.map(([x, y]) => [x - facing * 0.04 * H.a, y] as P2), skinQ, 0); });
    p.inkRing(hp, ow, thick);
    { const ex = 300 + facing * 1.0 * H.a, ey = hc - 0.02 * H.b + ly * 2 * u, up = -ly * 4 * u + (opts.face?.browUp?.[1] ?? 0) * u, bc = opts.face?.browCol ?? INK;
      p.stroke([[ex - facing * 4 * u, ey - 10 * u], [ex + facing * 4.5 * u, ey - 12 * u - up]], 3.2 * u, bc);          // brow tick
      p.stroke([[ex - facing * 1 * u, ey], [ex + facing * 4 * u, ey - 1.5 * u - up * 0.6]], 2.4 * u, INK); }             // lash tick
    if (o.glasses) p.stroke([[300 + facing * 0.45 * H.a, hc - 4 * u], [300 + facing * 0.98 * H.a, hc - 2.5 * u]], 2.4 * u);
  } else hairOn(p, o, hp, H, 300, hc, light, ow, back, hatted);
  if (!back) {
    const brim = o.hat === "bucket" || o.hat === "ranger" || o.hat === "cap" || o.hat === "visor";
    const X: FaceX = { ...(opts.face ?? {}) };
    if (o.hairStyle === "bowl" && !o.hat) { X.fdy = (X.fdy ?? 0) + 7; X.browGap = 13.5; } // eyes on skin below the fringe
    // brows that rise into a dark fringe (shock / brows-up) keep a skin-coloured halo so they always act
    if (!o.hat && o.hairStyle && o.hairStyle !== "none" && o.hairStyle !== "bob") X.browHalo = skin;
    if (o.hat === "visor" || o.hat === "cap") { // brows sit a little lower under a brim (room to lift) and never go under it
      X.browHalo = skin; X.browMin = X.browMin ?? (o.hat === "visor" ? -20 : -18.5); X.browGap = X.browGap ?? (o.hat === "visor" ? 13 : 14);
    }
    if (o.hat === "sunhat") X.browMin = X.browMin ?? -0.65 * H.b / u + 3.5; // reading up: brows stay under the straw brim, never hidden by it
    if (o.browCol) X.browCol = o.browCol;
    if (o.moustache) X.moustache = o.moustache;
    faceFront(p, 300, hc, W, expr, facing, look, lookY, blink, brim, skin, talk, o.glasses, X);
    // soft brim shadow across the forehead (lavender multiply), following the head
    // A7 P2 (noon sun, a wide straw brim, an evenly lit face): a firmer lavender brim band that reaches the eyes
    const bs = opts.brimShade ?? (o.hat === "sunhat" ? 1 : o.hat ? 0.75 : 0);
    if (bs > 0) p.clip(hp, () => {
      const g = p.g, top = hc - (o.hat === "sunhat" ? 0.72 : 0.58) * H.b, bot = hc + (o.hat === "sunhat" ? 0.06 : -0.24) * H.b;
      const [ax, ay] = p.P(300, top), [bx, by] = p.P(300, bot), gr = g.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, `rgba(160,142,208,${0.85 * bs})`); gr.addColorStop(0.5, `rgba(184,168,204,${0.6 * bs})`); gr.addColorStop(1, "rgba(184,168,204,0)");
      g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = gr;
      p.path(rrect(300 - 1.3 * H.a, top - 0.2 * H.b, 300 + 1.3 * H.a, bot, 1), true); g.fill(); g.restore();
    });
    const gDrop = clamp(opts.glassesDrop ?? 0, 0, 1.25);
    if (o.glassesUp && gDrop >= 0.6) { // A4: the readers dropped onto his nose: thin rims round the eyes (see-through), a bridge, glints
      const gy = hc + 3 * u + (1 - gDrop) * -6 * u + (opts.face?.fdy ?? 0) * u, gx0 = 300 + 7 * u * facing + (opts.face?.fdx ?? 0) * u;
      for (const s of [-1, 1]) { const gx = gx0 + s * 12.5 * u; p.ell(gx, gy, 9.6 * u, 7.4 * u, null, 1.7 * u); p.stroke([[gx - 5 * u, gy - 3 * u], [gx - 2 * u, gy - 5 * u]], 1.2 * u, "#ffffff"); }
      p.arc(gx0, gy - 1.5 * u, 3 * u, 2 * u, 200, 340, 1.6 * u);
    }
    if (o.glassesUp && gDrop < 0.6) { // A3: reading glasses PERCHED on the hair well above the hairline: opaque pale lenses with their own
      // ink rims and a soft shadow under them (the hair strands never run through the lenses)
      const g = p.g, gy = hc - 0.8 * H.b + gDrop * 0.6 * H.b, gx0 = 300 + 6 * u * facing;
      g.save(); g.globalAlpha = 0.28;
      for (const s of [-1, 1]) p.ell(gx0 + s * 11.5 * u, gy + 3 * u, 8.6 * u, 5 * u, "#3a2a50", 0);
      g.restore();
      for (const s of [-1, 1]) { const gx = gx0 + s * 11.5 * u; p.ell(gx, gy, 8 * u, 5.2 * u, "#e4edf3", 1.5 * u); p.stroke([[gx - 4 * u, gy - 1 * u], [gx - 1 * u, gy - 3 * u]], 1.1 * u, "#ffffff"); }
      p.stroke([[gx0 - 3.5 * u, gy - 1 * u], [gx0 + 3.5 * u, gy - 1 * u]], 1.5 * u);
    }
    if (o.sunUp && !o.hat) { // sunglasses pushed up on the forehead (with a hat they sit on the brim: after the hat)
      const gy = hc - 0.66 * H.b;
      for (const s of [-1, 1]) p.ell(300 + 7 * u * facing + s * 12 * u, gy, 9.5 * u, 6.2 * u, "#1d1a22", 2 * u);
      p.stroke([[300 + 7 * u * facing - 4 * u, gy - 1 * u], [300 + 7 * u * facing + 4 * u, gy - 1 * u]], 2 * u);
    }
  } // (A3: no glasses ticks on a plain back view: they read as stray black marks on the hair)
  if (o.pencil) {
    const s = back ? -1 : 1, px = 300 + s * 0.92 * H.a, py = hc - 0.05 * H.b;
    const pts = rotPts([[px - 3 * u, py - 22 * u], [px + 3 * u, py - 22 * u], [px + 3 * u, py + 12 * u], [px, py + 18 * u], [px - 3 * u, py + 12 * u]], rad(-30 * s), px, py);
    p.poly(pts, o.pencilCol ?? "#f2c230", 1.6 * u);
    const er = rotPts([[px - 3 * u, py - 22 * u], [px + 3 * u, py - 22 * u], [px + 3 * u, py - 17 * u], [px - 3 * u, py - 17 * u]], rad(-30 * s), px, py);
    p.poly(er, "#e88a9a", 1.4 * u);
  }
  if (o.hairClip) { // A5: a small barrette on the hair (screen-left side front, right side from behind)
    const s = back ? 1 : -1, cx = 300 + s * 0.62 * H.a, cy = hc - 0.62 * H.b;
    p.poly(rotPts(rrect(cx - 9 * u, cy - 3.2 * u, cx + 9 * u, cy + 3.2 * u, 2.5 * u), rad(28 * s), cx, cy), o.hairClip, 1.6 * u);
    p.dot(cx + s * 4 * u, cy - 1 * u, 1.3 * u, "#ffffff");
  }
  if (opts.rim) rimLine(p, hp, ow * 0.55, opts.rim, 1.6 * u * (opts.rimK ?? 1), hc + 0.25 * H.b);
  if (opts.hatLag || opts.hatLift) { p.rot = headRot(opts.hatLag ?? 0.0001); if (opts.hatLift && p.rot) p.rot = [p.rot[0], p.rot[1], p.rot[2], p.rot[3] ?? 0, (p.rot[4] ?? 0) - opts.hatLift]; }
  hatOn(p, o, H, 300, hc, light, ow, wind + 0.35 * (opts.flutter ?? 0), back, facing, opts.flutter ?? 0);
  if (o.sunUp && o.hat && !back) { // A3: sunglasses pushed up onto the hat brim / cap crown (the eyes stay free to act)
    const gy = hc - (o.hat === "cap" ? 0.62 : o.hat === "visor" ? 0.78 : 0.56) * H.b, gx = 300 + 7 * u * facing;
    for (const s of [-1, 1]) { p.ell(gx + s * 12 * u, gy, 9.5 * u, 6 * u, "#1d1a22", 2 * u); p.stroke([[gx + s * 12 * u - 5 * u, gy - 2 * u], [gx + s * 12 * u - 1 * u, gy - 4 * u]], 1.6 * u, "#ffffff"); }
    p.stroke([[gx - 4 * u, gy - 1 * u], [gx + 4 * u, gy - 1 * u]], 2 * u);
  }
  // ---- arms + props in front ----
  p.rot = A ? [rad(A), 300, hipY] : null;
  if (opts.hipSlit && o.shorts && !back) { // A6 P2 (shot 3; drawn OUTSIDE the shirt clip, under the front arms): a READABLE hip-pocket slit on the shorts just under the shirt hem,
    // its bulge after the chip goes in and a rainbow chip corner peeking out of it
    const [hs, hb, hpk] = opts.hipSlit, wx = 0.98 * T.a, x0 = 300 + hs * (wx - 4 * u), x1 = 300 + hs * (wx - 21 * u), y0 = torsoBot + 1 * u, y1 = torsoBot + 0.17 * HH;
    const st = "#140a1c", hl = mix(o.pants, "#ffffff", 0.42);
    if (hb > 0) p.ell(300 + hs * (wx - 13 * u), torsoBot + 0.09 * HH, 10 * u * (1 + 0.5 * hb), 8 * u * (1 + 0.4 * hb), mix(o.pants, "#ffffff", 0.16), 0);
    if (hpk > 0) { const jx = 300 + hs * (wx - 14 * u), jy = torsoBot + (3 - 7 * hpk) * u; jasper(p, jx, jy, 7.5 * u, 9, { ink: 1.5 * u }); }
    const sl2 = curve([x0, y0], [x1 + hs * 2 * u, torsoBot + 0.06 * HH], [x1 - hs * 1 * u, y1], 8);
    p.stroke(sl2.map(([x, y]) => [x - hs * 1.6 * u, y] as P2), 1.3 * u, hl);            // a pale lip on the slit (contrast on dark shorts)
    p.stroke(sl2, 3 * u, st);
    for (let k = 0; k < 4; k++) { const yy = y0 + 4 * u + k * 5 * u; p.stroke([[x1 + hs * (9 - 1.6 * k) * u, yy], [x1 + hs * (9 - 1.6 * k) * u, yy + 2.2 * u]], 1 * u, hl); }
  }
  for (const h of R.hands) if (h.front || h.split) { drawArm(h, h.split ? "hand" : "all"); props(h); }
  p.rot = null;
};

/** backlight rim: a thin warm line just outside the upper part of a contour (points above yMax) */
const rimLine = (p: Pen, pts: P2[], off: number, col: string, w: number, yMax: number) => {
  const n = pts.length;
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x / n; cy += y / n; }
  const run = keepRun(pts, ([, y]) => y < yMax).map(([x, y]): P2 => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + (dx / l) * off, y + (dy / l) * off]; });
  if (run.length > 2) p.stroke(run, w, col);
};

// ---------------- the raven (background gag on the trailhead sign) ----------------
/** perched raven filling the design card (feet at y 975): head -1 / 0 / 1 = beak to screen-left / front / right */
export type RavenOpts = { head: number; hop: number; ruffle: number; blink: number; light?: number;
  /** head cock (deg), peer down toward something below (0..1), wings spread for a flap (0..1) */
  cock?: number; dip?: number; wing?: number };
export const drawRaven = (p: Pen, o: RavenOpts) => {
  const light = o.light ?? DEF_LIGHT, thick = thickAngle(light), lift = o.hop * 70, B = "#1e2233", SHN = "#3b4a7a", u = 4.6;
  const fy = 975 - lift, by = fy - 190, rf = Math.max(o.ruffle, 0.4 * (o.wing ?? 0)), wg = o.wing ?? 0, dip = o.dip ?? 0;
  if (wg > 0) for (const s of [-1, 1]) { // spread wings behind the body (flap / take-off)
    const a = rad(-s * (20 + 95 * wg));
    const w = rotPts([[300 + s * 50, by - 70], [300 + s * 230, by - 40], [300 + s * 260, by + 10], [300 + s * 200, by + 30], [300 + s * 150, by + 10], [300 + s * 110, by + 60], [300 + s * 60, by + 40]], a, 300 + s * 50, by - 50);
    p.gradFill(w, mix(B, SHN, 0.3), B, light); p.poly(w, null, 10);
    for (const k of [0.45, 0.7]) { const q = lerp2(w[1], w[5], k); p.stroke([lerp2(w[0], w[6], 0.5), q], 3, SHN); }
  }
  // legs + feet
  for (const s of [-1, 1]) {
    p.stroke([[300 + s * 22, by + 80], [300 + s * 26, fy - 6]], 9, "#4a4650");
    for (const d of [-1, 0, 1]) p.stroke([[300 + s * 26, fy - 6], [300 + s * 26 + d * 18, fy]], 6, "#4a4650");
  }
  // tail
  const tail: P2[] = [[300 - 40, by + 60], [300 + 40, by + 60], [300 + 70, by + 210], [300, by + 190], [300 - 70, by + 210]];
  p.gradFill(tail, B, mul(B, SH_CLOTH), light); p.inkRing(tail, 12, thick);
  // body (puffs up on a ruffle)
  const bodyP = blobPts(300, by, { a: 118 * (1 + 0.1 * rf), b: 140 * (1 + 0.06 * rf), nTop: 2.2, nBot: 2.0, egg: 0.25, asym: 0, rot: 0, noise: 0.012 + 0.03 * rf, seed: 77 });
  p.gradFill(bodyP, B, mul(B, [0.75, 0.75, 0.85]), light);
  p.clip(bodyP, () => {
    p.arc(300 - 30, by - 30, 70, 60, 200, 300, 14, SHN); // sheen
    for (let i = 0; i < 4; i++) p.arc(300, by + 20 + i * 26, 90 - i * 6, 26, 20, 160, 3, mix(B, SHN, 0.5)); // feather rows
  });
  p.inkRing(bodyP, 14, thick);
  // wings: folded at the sides, they flick out on a ruffle
  for (const s of [-1, 1]) {
    const wa = rf * 22;
    const w = rotPts([[300 + s * 60, by - 60], [300 + s * 128, by + 10], [300 + s * 110, by + 120], [300 + s * 70, by + 90]], rad(-s * wa), 300 + s * 70, by - 50);
    p.gradFill(w, mix(B, SHN, 0.25), B, light); p.poly(w, null, 9);
  }
  // head (cocks about the neck; peering down drops it forward)
  const hx = 300 + o.head * (22 + 30 * dip), hy = by - 175 + 80 * dip, hr = 78;
  if (o.cock || dip) p.rot = [rad((o.cock ?? 0) + o.head * 18 * dip), hx, hy + 60];
  const hp = blobPts(hx, hy, { a: hr, b: hr * 0.95, nTop: 2.1, nBot: 2.2, egg: 0, asym: 0, rot: 0, noise: 0.01, seed: 78 });
  p.gradFill(hp, B, mul(B, [0.8, 0.8, 0.9]), light);
  p.clip(hp, () => p.arc(hx - 18, hy - 20, 40, 30, 200, 300, 10, SHN));
  p.inkRing(hp, 13, thick);
  // beak
  const bk = o.head === 0 ? [[hx - 24, hy + 6], [hx + 24, hy + 6], [hx, hy + 70]] as P2[]
    : [[hx + o.head * 40, hy - 14], [hx + o.head * 130, hy + 18], [hx + o.head * 40, hy + 26]] as P2[];
  p.poly(bk, "#c9c2a0", 9);
  p.stroke(o.head === 0 ? [[hx, hy + 8], [hx, hy + 60]] : [[hx + o.head * 44, hy + 8], [hx + o.head * 122, hy + 18]], 4, "#8a846a");
  // eyes: one (profile) or two (front); a little white glint so it reads as glossy
  const eyes: number[] = o.head === 0 ? [-30, 30] : [o.head * 18];
  for (const ex of eyes) {
    if (o.blink > 0.5) p.stroke([[hx + ex - 11, hy - 14], [hx + ex + 11, hy - 14]], 6, "#fbe9a0");
    else { p.ell(hx + ex, hy - 14, 13, 13, "#f2d27a", 4); p.dot(hx + ex + o.head * 3, hy - 14, 6.5, "#121420"); p.dot(hx + ex - 3, hy - 18, 2.6, WHITE); }
  }
  p.rot = null;
  void u;
};

// ---------------- effects ----------------
/** cartoon thought bubble on a 1000 x 800 canvas: cloud outline with bumps, trailing circles to bottom-left/right */
const bubbleFrame = (p: Pen, tailX: number) => {
  const cx = 500, cy = 340, rx = 430, ry = 270, n = 13, pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    for (let k = 0; k <= 8; k++) {
      const a = a0 + ((a1 - a0) * k) / 8, bump = 1 + 0.09 * Math.sin((k / 8) * Math.PI);
      pts.push([cx + rx * bump * Math.cos(a), cy + ry * bump * Math.sin(a)]);
    }
  }
  const tx = tailX, ts = tailX < 500 ? -1 : 1;
  if (tailX >= 0) { p.ell(tx, 676, 46, 38, "#fdfbf6", 11); p.ell(tx + ts * 50, 748, 27, 23, "#fdfbf6", 9); } // (tailX < 0: cast.ts draws the tail dots in the world, down to the thinker's head)
  p.poly(pts, "#fdfbf6", 0);
  return pts;
};
/** A4: the mystery "?" thought bubble (shot 6) on a 256 x 256 canvas: a small cream cloud with a big bold red "?" and
 *  two tail dots toward the lower right (her head) */
export const fxQuestion = (p: Pen) => {
  const pts: P2[] = [];
  for (let i = 0; i < 9; i++) for (let k = 0; k <= 6; k++) { const a = ((i + k / 6) / 9) * Math.PI * 2, b = 1 + 0.08 * Math.sin((k / 6) * Math.PI); pts.push([118 + 92 * b * Math.cos(a), 108 + 84 * b * Math.sin(a)]); }
  p.ell(206, 206, 17, 15, "#fdfbf6", 7); p.ell(236, 236, 10, 9, "#fdfbf6", 6);
  p.poly(pts, "#fdfbf6", 10);
  p.text("?", 118, 112, 150, "#c8343a", "Arial Black");
};
/** A4: a soft see-through contact shadow on a 128 x 128 canvas (rgb "r,g,b", peak alpha a): for unlit diagram floors */
export const fxSoftBlob = (p: Pen, rgb: string, a: number) => {
  const g = p.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.55, `rgba(${rgb},${0.75 * a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
/** A4: one thought-bubble tail dot (cream with the bubble's ink) on a 128 x 128 canvas */
export const fxTailDot = (p: Pen) => p.ell(64, 64, 50, 44, "#fdfbf6", 12);
const bubbleInk = (p: Pen, pts: P2[]) => p.poly(pts, null, 13);

/** shot 1: she hands a single paperclip (with a tiny gift bow) back to a surprised office clerk */
export const fxBubbleClip = (p: Pen, step = 8, tail = true) => {
  // step = frames since the pop, on 2s: her arm pulls back (3 f anticipation) then pushes the BIG bowed paperclip at
  // him; a tiny bow; his arms bob up in surprise with pulsing ticks, then he reaches for it and wipes his brow
  const fr = bubbleFrame(p, tail ? 560 : -1);
  const g = p.g, st = step, bob = st % 4 < 2 ? -6 : 6;
  p.clip(fr, () => {
  // desk + clerk on the right
  p.poly(rrect(560, 470, 900, 560, 10), "#a8743f", 9);
  const clerk: Outfit = { shirt: "#f2f2ef", pants: "#3b3f52", shoes: "#3a2a20", hair: "#3a2a20", hairStyle: "short", tie: "#c8343a", glasses: null };
  g.save(); g.translate(820 - 300 * 0.5, 600 - 975 * 0.5); g.scale(0.5, 0.5);
  const wipe = st >= 12;
  // A4: from step 6 his near hand reaches out toward the clip (palm up), the far one stays up in surprise / wipes
  const reachC = st >= 6;
  drawPerson(new Pen(g), clerk, { expr: wipe ? "worry" : "goggle", facing: -1, look: -0.8, lookY: 0.2, /* A5: goggle eyes */ tilt: -4 + (st % 4 < 2 ? 1.5 : -1.5),
    hands: [reachC ? { a: "point", dx: -8, dy: 14 + 0.5 * bob, shape: "palm", sz: 0.24 } : { a: "up", dy: 10 + bob }, wipe ? { a: "head", dx: -6, dy: st % 4 < 2 ? 2 : -3 } : { a: "up", dy: 10 - bob }], seed: 4 });
  g.restore();
  p.poly(rrect(560, 470, 900, 545, 10), "#b98250", 9); // desk front over the clerk's legs
  p.poly(rrect(600, 430, 700, 470, 4), "#fbf8ef", 6);    // papers on the desk
  // her (mini): teal sundress + sun hat, leaning in and holding the paperclip right up to the clerk
  const her: Outfit = WOMAN_FIT, HX = 450;
  // A6 (render check: the red bow sat ON the clerk's face and read as a bloody nose): the clip is offered tipped
  // toward him (66 deg) at his chest / palm height in the clear gap between them, and he sits 55 u further right (the bow stays in the gap, off his face and shirt)
  const reach = st < 3 ? -8 - 8 * (st / 3) : -8 + 10 * Math.min(1, (st - 3) / 3) - 3 * (st >= 6 && st < 8 ? 1 : 0);
  const ho: PersonOpts = { expr: "proud", facing: 1, tilt: 6 + (st >= 8 && st < 10 ? 9 : 0), headTilt: st >= 8 && st < 10 ? 8 : 0,
    hands: [{ a: "hang" }, { a: "point", dx: reach, dy: 34, hold: "clip", front: true, n: 58, ang: 66 }], seed: 11, wind: 0.2 };
  g.save(); g.translate(HX - 300 * 0.52, 625 - 975 * 0.52); g.scale(0.52, 0.52);
  drawPerson(new Pen(g), her, ho);
  g.restore();
  // little sparkle at the paperclip
  const [hx, hy] = handAt(her, ho, 1);
  const sx = HX + (hx - 300) * 0.52, sy = 625 + (hy - 975) * 0.52 - 26;
  if (Math.floor(st / 6) % 2 === 0) star4(p, sx + 34, sy - 60, 30, "#ffd84a", 3); else star4(p, sx - 8, sy - 30, 18, "#fff6c0", 3);
  // surprise ticks over the clerk (pulse on 2s)
  const tl = st % 4 < 2 ? 1 : 1.3;
  for (const a of [-60, -90, -120]) { const b = rad(a); p.stroke([[790 + 66 * Math.cos(b), 205 + 66 * Math.sin(b)], [790 + (66 + 34 * tl) * Math.cos(b), 205 + (66 + 34 * tl) * Math.sin(b)]], 8); }
  if (wipe) { const dx = 745, dy = 228, pts: P2[] = [[dx, dy - 22]]; for (let i = 0; i <= 14; i++) { const a = rad(-20 + (220 * i) / 14); pts.push([dx + 13 * Math.cos(a), dy + 12 + 13 * Math.sin(a)]); } p.poly(pts, "#8fd0f0", 5); }
  });
  bubbleInk(p, fr);
};

/** shot 12: four pupils, each cheating unmistakably (peeking with a dotted eye-line, crib note up the sleeve, a paper
 *  plane, answers written on the palm), all side-eyed; ph 0 / 1 flips their eyes (2-frame loop, every 8 f) */
export const fxBubbleCheat = (p: Pen, ph = 0) => {
  // A3: THREE pupils at 1.4x, each with ONE unmistakable cheat: a peeker on a bold dotted eye-line to his neighbour's
  // big red "A+" paper, a crib sheet unrolled out of a sleeve, a phone glowing under a desk; 2 poses swap every 8 f
  const fr = bubbleFrame(p, 520), g = p.g, sc = 0.76, base = 650, dy0 = 556; // A4: figures +25 %
  p.clip(fr, () => {
    p.poly(rrect(40, 520, 960, 780, 0), "#e9dcc0", 0);
    p.poly(rrect(40, 70, 960, 520, 0), "#f4ead6", 0);
    for (let k = 0; k < 6; k++) p.stroke([[60 + k * 170, 520], [100 + k * 170, 470]], 3, "#e2d4b4");
    const kid = (v: number): Outfit => ({ shirt: ["#5c7fa8", "#4f6f96", "#6a86ad"][v], pants: "#3b3f52", shoes: "#3a2a20", hair: ["#2a2020", "#c9a46a", "#7a4a2e"][v],
      hairStyle: (["short", "curly", "pony"] as HairStyle[])[v], collar: true, sweater: true, build: "kid" });
    const xs = [205, 500, 795];
    const figs: PersonOpts[] = [
      // A7 P2 (a frozen drawing for 1.8 s): 4 poses on 2s-ish (cast.ts ph 0..3): the peeker's eyes dart between his own
      // paper and the neighbour's, the crib strip slides, the phone hand flicks
      { expr: "shifty", facing: 1, look: ph % 2 ? 1.4 : 0.5, lookY: ph % 2 ? 0.7 : 1, tilt: 13 + (ph % 2 ? 3 : 0), headTilt: ph % 2 ? 6 : 2, hands: [{ a: "lap" }, { a: "chest", dx: 8, dy: 10 }] },
      { expr: "shifty", facing: -1, look: ph >= 2 ? -1.3 : 1.3, lookY: 0.2, tilt: -3 + (ph === 1 ? 2 : 0), hands: [{ a: "raise", dx: -6 + (ph === 3 ? 4 : 0), dy: 22 }, { a: "lap" }] },
      { expr: "shifty", facing: -1, look: -1, lookY: 1, tilt: -9 - (ph % 2 ? 2 : 0), headTilt: ph % 2 ? -5 : -2, hands: [{ a: "lap", dx: -10, dy: 26 - (ph === 2 ? 6 : 0), hold: "phone" }, { a: "lap" }] },
    ];
    const at2 = (i: number, hand: 0 | 1): P2 => { const [hx, hy] = handAt(kid(i), { ...figs[i], mode: "chair", seed: 3 + i * 2 }, hand); return [xs[i] + (hx - 300) * sc, base + (hy - 975) * sc]; };
    const head = (i: number): P2 => [xs[i] + (figs[i].facing ?? 0) * 6, base + (503 - 975) * sc];
    // 3: the phone glow on the face + under the desk (drawn first, then the figure over it)
    { const [x, y] = at2(2, 0), gl = g.createRadialGradient(x, y - 40, 0, x, y - 40, 210); // A4: 2x the glow (#9FE3FF)
      gl.addColorStop(0, "rgba(159,227,255,1)"); gl.addColorStop(0.45, "rgba(159,227,255,0.7)"); gl.addColorStop(1, "rgba(159,227,255,0)"); g.fillStyle = gl; g.fillRect(x - 220, y - 260, 440, 330); }
    figs.forEach((o, i) => {
      g.save(); g.translate(xs[i] - 300 * sc, base - 975 * sc); g.scale(sc, sc);
      drawPerson(new Pen(g), kid(i), { ...o, mode: "chair", seed: 3 + i * 2 });
      g.restore();
      // desk in front with a test paper (the middle one wears a big red A+)
      const x = xs[i];
      p.poly(rrect(x - 118, dy0, x + 118, dy0 + 40, 7), "#a8743f", 8);
      p.poly([[x - 80, dy0 + 5], [x + 44, dy0 + 2], [x + 52, dy0 + 20], [x - 72, dy0 + 23]], "#fbf8ef", 5);
      if (i === 1) p.text("A+", x - 6, dy0 + 12, 30, "#d8342c", "Arial Black", "center", -0.05);
      else for (let k = 0; k < 3; k++) p.stroke([[x - 66 + k * 8, dy0 + 8 + k * 4], [x + 26 + k * 3, dy0 + 7 + k * 4]], 2.5, "#8a93a8");
      p.poly(rrect(x - 104, dy0 + 40, x - 92, dy0 + 110, 2), "#7a5236", 5); p.poly(rrect(x + 92, dy0 + 40, x + 104, dy0 + 110, 2), "#7a5236", 5);
    });
    // 1: a BOLD dotted eye-line arrow from the peeker's eyes to the A+ paper
    { const [ex, ey] = head(0), a: P2 = [ex + 52, ey + 4], b: P2 = [xs[1] - 30, dy0 + 6];
      for (let k = 0; k < 8; k++) p.dot(a[0] + ((b[0] - a[0]) * k) / 8, a[1] + ((b[1] - a[1]) * k) / 8, 8);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      p.poly(rotPts([[b[0] + 20, b[1]], [b[0] - 12, b[1] - 16], [b[0] - 12, b[1] + 16]], ang, b[0], b[1]), INK, 0); }
    // 2: a long crib sheet unrolled out of the raised cuff, answers scrawled down it (it sways on the 2nd pose)
    { const [x, y] = at2(1, 0), sw = [-4, 2, 8, 2][ph % 4], strip: P2[] = [[x - 12, y - 4], [x + 12, y - 4], [x + 16 + sw, y + 150], [x - 10 + sw, y + 156]];
      p.poly(strip, "#fbf8ef", 5);
      for (let k = 0; k < 6; k++) p.stroke([[x - 6 + sw * (k / 6), y + 14 + k * 22], [x + 9 + sw * (k / 6), y + 14 + k * 22]], 3.4, "#2a3a6a");
      p.ell(x, y - 2, 15, 8, "#fbf8ef", 5); }
    // 3: the glowing phone screen rays
    { const [x, y] = at2(2, 0); for (const a of [-70, -90, -110]) { const r = rad(a); p.stroke([[x + 18 * Math.cos(r), y - 20 + 18 * Math.sin(r)], [x + 40 * Math.cos(r), y - 20 + 40 * Math.sin(r)]], 4, "#7fd8f6"); } }
    // a sweat drop on the peeker's temple
    { const [hx, hy] = head(0), sx = hx - 70, sy = hy - 50, pts: P2[] = [[sx, sy - 28]];
      for (let i = 0; i <= 16; i++) { const a = rad(-20 + (220 * i) / 16); pts.push([sx + 19 * Math.cos(a), sy + 18 + 19 * Math.sin(a)]); }
      p.poly(pts, "#8fd0f0", 6); }
  });
  bubbleInk(p, fr);
};
/** 4-point star (glint / flash) */
export const star4 = (p: Pen, x: number, y: number, r: number, col = "#ffffff", ink = 0) => {
  const pts: P2[] = [];
  for (let k = 0; k < 8; k++) { const a = rad(k * 45 - 90), rr = k % 2 ? r * 0.2 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
  p.poly(pts, col, ink);
};
/** glint sparkle on a 256 x 256 canvas: white 4-point star with a pale gold core and a small secondary star */
export const fxGlint = (p: Pen, t: number) => {
  // BOLD sparkle (A2): a soft warm bloom disc, a long white 4-point star with a #FFF3B0 core and a plum hairline (so it
  // reads on pale sand too), a thin diagonal cross and a small secondary star
  const k = 0.45 + 0.55 * Math.sin(Math.PI * clamp(0.15 + 0.85 * t, 0, 1)), g = p.g;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 70 * k);
  gr.addColorStop(0, "rgba(255,248,214,0.85)"); gr.addColorStop(0.5, "rgba(255,236,170,0.35)"); gr.addColorStop(1, "rgba(255,236,170,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 70 * k, 0, Math.PI * 2); g.fill();
  star4(p, 128, 128, 118 * k, "#fffdf2", 3);
  star4(p, 128, 128, 52 * k, "#fff3b0");
  p.g.save(); p.rot = [rad(45), 128, 128]; star4(p, 128, 128, 56 * k, "#fffdf2"); p.rot = null; p.g.restore();
  star4(p, 204, 64, 30 * k, "#fffdf2", 2);
};
/** sweat drop on a 128 x 192 canvas */
export const fxSweat = (p: Pen) => {
  const pts: P2[] = [[64, 14]];
  for (let i = 0; i <= 20; i++) { const a = rad(-20 + (220 * i) / 20); pts.push([64 + 44 * Math.cos(a), 124 + 44 * Math.sin(a)]); }
  p.poly(pts.map(([x, y]) => [x, y] as P2), "#8fd0f0", 9);
  p.arc(52, 120, 18, 26, 160, 250, 8, "#ffffff");
};
/** the chip's tag on a 768 x 384 canvas: manila tag, string hole, "TIMES STOLEN:" + a big count */
export const fxTag = (p: Pen, n: number, twine = false, flap = false) => {
  const paper = "#f1dfae", g = p.g;
  const tg: P2[] = [[110, 30], [748, 30], [748, 354], [110, 354], [20, 258], [20, 126]];
  p.poly(tg, paper, 12);
  p.ell(78, 192, 24, 24, "#c9a86a", 8);
  // two-line label fitted to <= 420 px (A4: ~8 % bigger), then a big red count in its own box
  const fit = (s: string, px: number, maxW: number) => { g.font = `${px}px Arial Black`; const w = g.measureText(s).width; return w > maxW ? (px * maxW) / w : px; };
  const ts = Math.min(fit("TIMES", 96, 420), fit("STOLEN:", 96, 420));
  p.text("TIMES", 336, 122, ts, "#2b1a12", "Arial Black");
  p.text("STOLEN:", 336, 228, ts, "#2b1a12", "Arial Black");
  if (flap) p.poly(rrect(552, 58, 728, 326, 14), "#3a2a32", 7); // A4: the split-flap slot (cast.ts flips the number card over it)
  else { p.poly(rrect(552, 58, 728, 326, 14), "#fbf3dc", 7); p.text(String(n), 640, 200, fit(String(n), 230, 150), "#c8343a", "Arial Black"); }
  // a string loop through the hole + A4: a small red RETURNED stamp (the bait chip came back through the conscience pile)
  p.arc(78, 192, 40, 46, 120, 400, 6, "#e9e0c8");
  if (twine) p.stroke([[78, 196], [40, 236], [4, 262]], 9, INK); // A3: the short dark twine down into the pocket
  const g2 = p.g; g2.save(); g2.globalAlpha = 0.85;
  p.poly(rotPts(rrect(132, 270, 538, 350, 7), rad(-6), 335, 310), null, 6, "#d8342c"); p.text("RETURNED", 335, 313, 62, "#d8342c", "Arial Black", "center", rad(-6)); // A6 P2: >= 30 px at the snap
  g2.restore();
};
/** A4: the tag's split-flap number card (192 x 288): cream card, plum ink, the big red count, a hinge line */
export const fxTagFlap = (p: Pen, n: number) => {
  p.poly(rrect(8, 8, 184, 280, 14), "#fbf3dc", 8);
  p.stroke([[14, 144], [178, 144]], 3, "rgba(60,30,40,0.35)");
  const g = p.g; g.font = "230px Arial Black"; const w = g.measureText(String(n)).width, s = w > 150 ? (230 * 150) / w : 230;
  p.text(String(n), 96, 150, s, "#c8343a", "Arial Black");
};
/** A4: a big chrome stopwatch held up to the lens, with the holding ball hand and a thumb on the crown, on a 320 x 400
 *  canvas. press 0..1 squashes the crown button under the thumb; flick = the 1 f digit flicker on the click */
export const fxStopwatch = (p: Pen, press = 0, flick = false) => {
  const cx = 160, cy = 220, R = 128;
  // the holding hand behind the case (ball + fingers wrapped round the left side), the thumb on the crown
  p.dot(cx - 92, cy + 86, 46);
  p.band([[cx - 120, cy + 40], [cx - 132, cy - 6]], INK, 26, 0, "round");
  p.band([[cx - 104, cy + 90], [cx - 60, cy + 120]], INK, 24, 0, "round");
  // crown + button (pressed down by `press`)
  const by = cy - R - 30 + 12 * press;
  p.poly(rrect(cx - 16, by, cx + 16, by + 26, 6), "#d0d3dc", 7);
  p.poly(rrect(cx - 10, cy - R - 8, cx + 10, by + 22, 3), "#b9bcc8", 6);
  p.ell(cx, cy, R, R, "#c9ccd6", 10);
  p.ell(cx - 8, cy - 8, R - 20, R - 20, "#e6e8ef", 0);
  p.ell(cx, cy, R - 18, R - 18, "#fbfaf2", 6);
  for (let k = 0; k < 12; k++) { const b = rad(k * 30); p.stroke([[cx + (R - 30) * Math.cos(b), cy + (R - 30) * Math.sin(b)], [cx + (R - 22) * Math.cos(b), cy + (R - 22) * Math.sin(b)]], 5, "#5a5e6e"); }
  // the BIG digital readout (an LCD window across the dial): 2:00:00, inverted for the 1 f flicker
  p.poly(rrect(cx - 114, cy - 34, cx + 114, cy + 40, 8), flick ? "#1d1f2e" : "#dfe8d2", 6);
  p.text("2:00:00", cx, cy + 4, 52, flick ? "#dfe8d2" : "#1d1f2e", "Arial Black");
  p.stroke([[cx, cy - 46], [cx + 60, cy - 80]], 6, "#c8343a"); p.dot(cx, cy - 46, 7, "#c8343a");
  p.arc(cx - 40, cy - 60, 60, 46, 200, 250, 7, "#ffffff");
  // the thumb pressing the button
  p.band([[cx - 64, cy - R + 6], [cx - 14, by + 2]], INK, 24, 0, "round");
  if (press > 0.5) for (let k = 0; k < 5; k++) { const b = rad(-150 + k * 30); p.stroke([[cx + 40 * Math.cos(b), by - 6 + 40 * Math.sin(b)], [cx + 62 * Math.cos(b), by - 6 + 62 * Math.sin(b)]], 7, "#fffbe6"); }
};
/** the chip held in the hand with its tag on a string, on a 1024 x 512 canvas (chip at the left, tag to the right) */
export const fxChipTag = (p: Pen, n: number, chip: boolean) => {
  const g = p.g;
  // A3: the SAME rainbow petrified-wood bait chip as the trails (red / orange / yellow / purple, bark rind, one white
  // paint dot), tied to the tag's eyelet with a short dark twine
  // A7 P2: the chip ~1.3x bigger (the payoff's hero object), the tag a little smaller and further right
  p.stroke([[220, 236], [292, 222], [392, 256]], 7, "#2c1e2a");
  g.save(); g.translate(352, 78); g.scale(0.82, 0.82); fxTag(new Pen(g), n); g.restore();
  if (chip) jasper(p, 160, 250, 148, 21, { dot: true, ink: 12, dotK: 1.35 });
};
/** darken an effect card toward the scene light (unlit cards in dusk / night shots), keeping its alpha */
export const tintCard = (p: Pen, w: number, h: number, rgba: string) => {
  const g = p.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = rgba; g.fillRect(0, 0, w * 8, h * 8); g.restore();
};
/** a small rainbow chip on a 96 x 96 canvas (flying into the bucket, placed on the ground) */
export const fxChip = (p: Pen, seed: number, dot = false, quartz = false, dotK = 1) => {
  jasper(p, 48, 50, 34, seed, { dot, quartz, ink: 5, dotK });
};
/** chalk stick-bean figure on a 128 x 256 canvas (blueprint diagram people); pose 0..1 = walk swing, chip = holds wood */
export const fxChalkMan = (p: Pen, swing: number, chip: boolean, col = "#f4f8ff", pocket = 0, look = 0, tap = 0, pose = 0) => {
  // pose: 0 walk / stand, 1 checks a wristwatch, 2 shrug, 3 waves "come on", 4 snaps a photo (hands at the face)
  const s = swing;
  p.stroke([[64, 120], [64 + 22 * s, 232]], 10, col); p.stroke([[64, 120], [64 - 22 * s + 10 * tap, 232 - 12 * tap]], 10, col);
  p.ell(64, 104, 30, 46, null, 10, 0, 360, 0, col);
  // right arm: swings, holds a chip, or slips to the hip pocket (the pocketing gesture)
  const rx = 100 + 10 * s, ry = chip ? 112 : 150;
  if (pose === 1) { p.stroke([[50, 90], [40, 70], [62, 62]], 9, col); p.stroke([[78, 90], [100, 150]], 9, col); p.ell(62, 62, 7, 7, null, 5, 0, 360, 0, col); }
  else if (pose === 2) { p.stroke([[50, 90], [22, 84], [14, 62]], 9, col); p.stroke([[78, 90], [106, 84], [114, 62]], 9, col); }
  else if (pose === 3) { p.stroke([[50, 90], [30 - 10 * s, 150]], 9, col); p.stroke([[78, 90], [104, 60], [96 + 14 * s, 26]], 9, col); }
  else if (pose === 4) { p.stroke([[50, 90], [46, 50]], 9, col); p.stroke([[78, 90], [82, 50]], 9, col); p.poly(rrect(40, 30, 88, 56, 4), "#2a5cb0", 6, col); }
  else { p.stroke([[50, 90], [30 - 10 * s, 150]], 9, col); p.stroke([[78, 90], [rx + (86 - rx) * pocket, ry + (140 - ry) * pocket]], 9, col); }
  p.ell(64 + look * 6, 38, 30, 29, "#2a5cb0", 10, 0, 360, 0, col);
  if (look) for (const e of [-9, 9]) p.dot(64 + look * 6 + e + look * 7, 36, 4.5, col); // side glance
  if (chip && pocket < 0.6) { const c: P2[] = [[96, 98], [116, 92], [122, 110], [104, 120]]; p.poly(c, "#e8893a", 6, col); }
};
/** chalk tumbleweed (blueprint gag) on a 128 x 128 canvas */
export const fxChalkWeed = (p: Pen, rot: number, col = "#f4f8ff") => {
  for (let k = 0; k < 7; k++) { const a = rot + k * 0.9, r0 = 22 + 18 * ((k * 37) % 5) / 5; p.arc(64 + 6 * Math.cos(a * 2), 64 + 6 * Math.sin(a * 3), r0 + 18, r0 + 10, (a * 57) % 360, ((a * 57) % 360) + 220, 5, col); }
  p.ell(64, 64, 52, 50, null, 6, 0, 360, 0, col);
};
/** whisper squiggles on a 128 x 128 canvas: three short plum arcs ")))" (k 0..1 = how far they have drifted / faded) */
export const fxSquiggle = (p: Pen, k: number) => {
  const g = p.g; g.save(); g.globalAlpha = 1 - 0.6 * k;
  for (let i = 0; i < 3; i++) p.arc(30 + i * 26 + 10 * k, 64, 16 + i * 8, 22 + i * 10, -55, 55, 7, INK);
  g.restore();
};
/** a jackrabbit mid-hop, side view, on a 128 x 96 canvas (shot 7 background gag); leg 0..1 = tuck .. stretch */
export const fxRabbit = (p: Pen, leg: number) => {
  const B = "#b08a64", D = "#7a5a3e";
  p.band([[40, 60], [14 - 8 * leg, 74 + 10 * leg]], D, 7, 3, "round");
  p.ell(54, 52, 30, 17, B, 4, 0, 360, -8);
  p.ell(88, 38, 13, 11, B, 4);
  for (const k of [0, 1]) p.poly([[84 + k * 6, 30], [80 + k * 8, 4], [90 + k * 7, 6], [92 + k * 5, 30]], k ? B : D, 3);
  p.dot(93, 36, 2.6, EYE); p.ell(26, 46, 7, 7, "#efe6d6", 3);
  p.band([[70, 64], [86 + 10 * leg, 74 - 4 * leg]], D, 5, 2.5, "round");
};
/** music note (whistling) on a 128 x 128 canvas: off-white with plum ink */
export const fxNote = (p: Pen, col = "#f8f3ee") => {
  p.ell(48, 96, 21, 15, col, 7, 0, 360, -22);
  p.band([[66, 92], [66, 22]], col, 9, 4);
  p.band(curve([66, 24], [92, 34], [100, 62], 8), col, 9, 4, "round");
};
/** A6 ADD: a cold-morning breath puff on a 256 x 128 canvas, t 0..1: three small cartoon vapour puffs (white, a thin
 *  cool-grey line so they read against a pale sky) that bud out of the mouth one after another, drift right and up,
 *  swell and fade (mirror with dir = -1) */
export const fxBreath = (p: Pen, t: number, dir = 1) => {
  const g = p.g; g.save(); if (dir < 0) { g.translate(256, 0); g.scale(-1, 1); }
  for (const [x0, y0, r, d] of [[36, 76, 24, 0], [96, 68, 32, 0.12], [164, 62, 40, 0.24]] as const) {
    const k = clamp((t + 0.05 - d) / (1 - d), 0, 1); if (k <= 0) continue;
    const x = x0 + 40 * k, y = y0 - 10 * k, rr = r * (0.6 + 0.5 * k), a = Math.min(1, 3.5 * k) * (1 - Math.max(0, (k - 0.55) / 0.45));
    g.globalAlpha = a; // A6 P3: a pale lavender fill (55 %) with a thin plum-grey ink, so the wisp reads on a pale sky
    g.beginPath(); g.ellipse(x, y, rr, rr * 0.86, 0, 0, Math.PI * 2);
    g.fillStyle = "rgba(232,228,242,0.62)"; g.fill(); g.lineWidth = 4; g.strokeStyle = "rgba(44,30,42,0.42)"; g.stroke();
    g.beginPath(); g.ellipse(x - 0.3 * rr, y - 0.3 * rr, 0.28 * rr, 0.2 * rr, 0, 0, Math.PI * 2); g.fillStyle = "#ffffff"; g.fill();
  }
  g.restore();
};
/** dust puff on a 256 x 128 canvas, t 0..1 (grows and fades) */
export const fxPuff = (p: Pen, t: number, chalk = false) => {
  // A6 P3 (a row of identical cotton balls): 5 soft-edged puffs of different sizes and beige tones (#E8D2B0..#D9BE98;
  // chalk dust stays white), each rising 10-20 px at its own rate while it fades, one pebble kicked out sideways
  const g = p.g; g.save(); g.filter = "blur(2.5px)";
  const C = chalk ? ["#fbfaf4", "#f1f0ea", "#fbfaf4", "#e9e8e2", "#f6f5ef"] : ["#e8d2b0", "#dcc29e", "#e4cca8", "#d9be98", "#eedcbc"];
  ([[70, 22, 0.8], [124, 34, 0.55], [184, 20, 1.0], [98, 15, 1.2], [156, 26, 0.7]] as const).forEach(([x, r, rs], k) => {
    g.globalAlpha = 0.88 * (1 - t) ** (0.8 + 0.2 * k);
    p.ell(x + (x - 128) * t * 0.7, 96 - (10 + 12 * rs) * t * 1.6 - (r > 25 ? 8 : 0), r * (0.7 + 0.7 * t), r * (0.58 + 0.6 * t), C[k], 0);
  });
  g.filter = "none";
  if (!chalk && t > 0.15 && t < 0.8) { g.globalAlpha = 1; p.ell(200 + 60 * t, 100 - 40 * t + 50 * t * t, 5, 4, "#8a6a52", 2); }
  g.restore();
};
/** surprise "!" pop on a 128 x 256 canvas (red with plum ink) */
export const fxBang = (p: Pen) => {
  p.poly([[44, 24], [84, 24], [74, 168], [54, 168]], "#ff5a3c", 9);
  p.ell(64, 214, 20, 20, "#ff5a3c", 9);
};
/** loose feather on a 128 x 128 canvas */
export const fxFeather = (p: Pen) => {
  const pts = curve([24, 104], [60, 40], [108, 20], 10).concat(curve([108, 20], [74, 74], [24, 104], 10));
  p.poly(pts, "#2a3048", 5);
  p.stroke(curve([26, 102], [64, 56], [104, 24], 8), 3, "#4a5a8a");
};
/** a desert lizard clinging to a vertical post, seen from above, on a 128 x 256 canvas: push = push-up (0..1), head = -1..1 */
export const fxLizard = (p: Pen, push: number, head: number) => {
  const B = "#c9a46a", D = "#8a6a3e", w = 1 + 0.12 * push;
  for (const [y, s] of [[96, -1], [96, 1], [160, -1], [160, 1]] as const) { // legs (straighten on a push-up)
    const kx = 64 + s * (26 + 8 * push) * w, fy = y + (y < 120 ? -14 : 14);
    p.stroke([[64 + s * 10, y], [kx, y + (y < 120 ? -4 : 4)], [kx + s * 8, fy]], 7, D);
    for (const d of [-1, 0, 1]) p.stroke([[kx + s * 8, fy], [kx + s * 14, fy + d * 7]], 3, D);
  }
  p.band(curve([64, 172], [70, 214], [44, 246], 10), B, 10, 4, "round"); // tail
  p.ell(64, 128, 16 * w, 46, B, 5);
  for (const [x, y] of [[60, 112], [70, 128], [58, 144], [68, 158]] as const) p.dot(x, y, 3.4, D);
  const hx = 64 + head * 9, hp = rotPts(ellPts(hx, 70, 13, 19, 0, 360, 0, 20), rad(head * 22), 64, 88);
  p.poly(hp, B, 5);
  for (const s of [-1, 1]) p.dot(...rotPts([[hx + s * 8, 64]], rad(head * 22), 64, 88)[0], 3.2, EYE);
};
/** flying raven silhouette on a 256 x 128 canvas; w = wing phase -1 (down) .. 1 (up) */
export const fxFlyRaven = (p: Pen, w: number, B = "#1e2233", dir = 1, chalk = false) => {
  // A4: a real wing-spread flight silhouette (both wings out to the sides, a gull bend at the wrist, FIVE primary
  // "finger" feathers at each tip, a wedge tail, the body pitched ~15 deg nose-up); w = -1 down-stroke .. 1 up-stroke.
  // chalk = unfilled chalk-line drawing (blueprint), dir -1 = flying screen-left
  const g = p.g; g.save();
  if (dir < 0) { g.translate(256, 0); g.scale(-1, 1); }
  p.rot = [rad(-14), 128, 64];
  const wing = (side: number): P2[] => {
    const S: P2 = [128 + side * 6, 62], W: P2 = [128 + side * 54, 56 - 22 * w], T: P2 = [128 + side * 112, 62 - 36 * w];
    const dl = Math.hypot(T[0] - W[0], T[1] - W[1]) || 1, d: P2 = [(T[0] - W[0]) / dl, (T[1] - W[1]) / dl];
    let n: P2 = [-d[1], d[0]]; if (n[1] < 0) n = [-n[0], -n[1]];
    const pts: P2[] = [S, W, T];
    for (let k = 0; k < 5; k++) {
      const t = k * 0.11, b = lerp2(T, W, t), L = 24 - k * 2.5;
      pts.push([b[0] + n[0] * L + d[0] * (7 - k), b[1] + n[1] * L + d[1] * (7 - k)]);
      const nb = lerp2(T, W, t + 0.06); pts.push([nb[0] + n[0] * 9, nb[1] + n[1] * 9]);
    }
    pts.push([W[0] + n[0] * 24, W[1] + n[1] * 24], [S[0] + n[0] * 15 + side * 4, S[1] + n[1] * 15]);
    return pts;
  };
  const beak = chalk ? B : B === "#1e2233" ? "#8a846a" : B;
  const tail: P2[] = [[110, 66], [72, 58], [66, 70], [72, 82], [110, 74]];
  if (chalk) {
    const wl = 5;
    for (const s of [-1, 1]) p.poly(wing(s), null, wl, B);
    p.ell(128, 68, 26, 12, null, wl, 0, 360, 0, B); p.ell(158, 60, 11, 10, null, wl, 0, 360, 0, B);
    p.poly([[167, 57], [186, 61], [167, 65]], null, wl * 0.8, B); p.poly(tail, null, wl, B);
    p.dot(160, 58, 2.6, B);
  } else {
    p.poly(wing(-1), mix(B, "#000000", 0.15), 0);
    p.poly(tail, B, 0);
    p.ell(128, 68, 27, 12, B, 0); p.ell(158, 60, 12, 11, B, 0);
    p.poly([[168, 56], [190, 61], [168, 66]], beak, 0);
    p.poly(wing(1), B, 0);
    if (B === "#1e2233") { p.stroke([[136, 60], [168, 56 - 18 * w]], 2.4, "#3b4a7a"); p.dot(160, 58, 2.2, "#f2d27a"); }
  }
  p.rot = null; g.restore();
};
/** A5 (shot 14 insert / wide): his ball hand gripping the hand scoop, on a 512 x 512 card centred on the hand. th =
 *  the blade's screen direction (deg, 0 = right, 90 = down), sl = the sleeve's direction (toward his body, off the
 *  card), n = chips riding on the blade (0-5), sleeve / skin colours */
export const fxHandScoop = (p: Pen, th: number, sl: number, n: number, sleeve = "#b8472e", skin = SKIN, limb: boolean | P2[] = false) => {
  const c = Math.cos(rad(th)), s0 = Math.sin(rad(th)), cs = Math.cos(rad(sl)), ss = Math.sin(rad(sl)), H: P2 = [256, 256];
  const at = (d: number, w: number): P2 => [H[0] + c * d - s0 * w, H[1] + s0 * d + c * w];
  // the sleeve (forearm) to the card edge, toward his body; A6 P1 (the wide: a flat red plank floating under his arm):
  // limb = the standard single dark stick-arm stroke along the SAME shoulder-to-hand line, so it merges with his arm
  // A7 P1 (the wide: two loose sticks): limb = the card arm's OWN curve (hand -> elbow -> toward the shoulder, canvas
  // offsets from the hand), so the overlay forearm and the card's upper arm share one elbow
  if (Array.isArray(limb)) p.stroke([H, ...limb.map(([x, y]) => [H[0] + x, H[1] + y] as P2)], 17, INK);
  else if (limb) p.stroke([[H[0] + cs * 10, H[1] + ss * 10], [H[0] + cs * 250, H[1] + ss * 250]], 17, INK);
  else p.band([[H[0] + cs * 14, H[1] + ss * 14], [H[0] + cs * 300, H[1] + ss * 300]], sleeve, 44, 5, "round");
  // the handle, then the blade (a rounded open scoop, its bowl lighter inside)
  p.band([at(0, 0), at(70, 0)], "#7a5236", 15, 4, "round");
  const blade: P2[] = [at(62, -26), at(150, -30), at(176, -16), at(182, 0), at(176, 16), at(150, 30), at(62, 26)];
  p.poly(blade, "#aeb5c2", 6);
  p.poly([at(74, -17), at(148, -21), at(166, -10), at(168, 0), at(166, 10), at(148, 21), at(74, 17)], "#d7dce6", 0);
  p.stroke([at(80, -12), at(150, -14)], 3, "#ffffff");
  for (let k = 0; k < Math.min(5, n); k++) { const [x, y] = at(96 + (k % 3) * 24, (k - 2) * 9); jasper(p, x, y, 15, 31 + k, { ink: 3.5 }); }
  // the ball hand gripping the handle (fingers wrap over it)
  p.ell(H[0], H[1], 30, 28, skin, 6);
  p.stroke([at(-6, -18), at(16, -20)], 4, INK); p.stroke([at(-4, 18), at(16, 20)], 4, INK);
};
/** A5 (shot 10 insert): a tourist's arm rising from below holding a rainbow chip up (256 x 512 card: sleeve from the
 *  bottom edge, ball hand, the chip pinched above it, a little star when lit = 1) */
export const fxHandChip = (p: Pen, sleeve: string, seed: number, lit = 0) => {
  // A7 P2 (they read as orange crayons with white tips): an ARM like the cast's: a short-sleeve stub with the paler
  // flower print at the bottom, the dark plum stick forearm, the dark ball hand pinching a BIG inked rainbow chip
  const arm = mix(sleeve, INK, 0.88);
  p.band([[128, 520], [128, 392]], sleeve, 96, 7, "round");
  for (const [x, y] of [[104, 430], [150, 468], [118, 500], [158, 410]] as P2[]) { p.ell(x, y, 11, 9, mix(sleeve, "#ffffff", 0.55), 0); p.dot(x, y, 3.5, mix(sleeve, "#ffffff", 0.2)); }
  p.stroke([[128, 400], [128, 250]], 30, arm);
  p.dot(128, 240, 34);
  p.band([[110, 232], [102, 206]], INK, 18, 0, "round"); p.band([[146, 232], [154, 208]], INK, 17, 0, "round");
  jasper(p, 128, 150, 56, seed, { ink: 7 });
  if (lit) star4(p, 178, 98, 38, "#fffdf2", 3);
};
/** camera flash: white starburst on a 256 x 256 canvas */
export const fxFlash = (p: Pen) => {
  for (let i = 0; i < 12; i++) { const a = rad(i * 30); p.stroke([[128 + 26 * Math.cos(a), 128 + 26 * Math.sin(a)], [128 + (i % 2 ? 84 : 120) * Math.cos(a), 128 + (i % 2 ? 84 : 120) * Math.sin(a)]], 12, "#fffef6"); }
  p.ell(128, 128, 34, 34, "#fffef6", 0);
};
/** tally sheet lying on the ground, 256 x 320 canvas */
export const fxTally = (p: Pen) => {
  p.poly(rrect(14, 14, 242, 306, 6), "#fbf8ef", 7);
  for (let r = 0; r < 6; r++) for (let k = 0; k < 5; k++) {
    const x = 40 + k * 16 + (r % 2) * 90, y = 50 + Math.floor(r / 2) * 80 + 0;
    if (k < 4) p.stroke([[x, y - 18], [x, y + 18]], 5, "#2a3a6a"); else p.stroke([[x - 70, y + 12], [x + 4, y - 12]], 5, "#2a3a6a");
  }
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail (multiply colour) */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};
/** tight contact shadow right under the feet on a 128 x 128 canvas (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

// ---------------- the cast's wardrobe (one body colour + one signature item each; no logos, no patches) ----------------
/** the honest woman: the ONLY teal in the film + the big straw sun hat with a yellow band + camera across her body */
export const WOMAN_FIT: Outfit = { shirt: "#1fa6a0", pants: "#4a3a40", shoes: "#c8573e", hair: "#7a4a2e", hairStyle: "bob", hat: "sunhat", hatCol: STRAW,
  band: "#f2c230", camera: "cross", dress: true, build: "small" };
export const FIANCE_FIT: Outfit = { shirt: "#d9a21e", pants: "#b9a27a", shoes: "#6b4a32", hair: "#3a2a20", hairStyle: "short", glasses: "round",
  print: "book", backpack: "#5e6b3a", shorts: true, fringeUp: 0.07, bottle: "#5fa8d8", carabiner: true };
export const PROF_FIT: Outfit = { shirt: "#a9cbea", pants: "#5a5448", shoes: "#4a3426", hair: "#a9a9b4", hairStyle: "swept", vest: "#6e7a3a", build: "tall",
  browCol: "#5e5e6c", moustache: "#b4b4be", glassesUp: true, badge: true, pocketPeek: "pen" }; // A4: a pen in the vest pocket (the pencil behind the ear is the student's)
/** the sign-swap assistant: one of the khaki research team (khaki bucket hat + khaki vest + team lanyard); tall, with
 *  sunglasses as his own mark (red caps are the TOURISTS' signature, never the team's) */
export const ASST3_FIT: Outfit = { shirt: "#7a3e7a", pants: "#4a4a52", shoes: "#3a2a20", hair: "#6a4a30", hairStyle: "crop", hat: "bucket", hatCol: "#7a6a48",
  vest: "#c2a878", glasses: null, sunUp: true, build: "tall", badge: true }; // A3: sunglasses pushed up onto the brim: his eyes track the panel
/** recolour every colour of an outfit (chalk-tinted blueprint visitor, backlit plum sunset tourists) */
export const tintFit = (o: Outfit, fn: (c: string) => string): Outfit => {
  const out: Outfit = { ...o };
  for (const k of ["shirt", "pants", "shoes", "skin", "hair", "hatCol", "band", "vest", "cardigan", "backpack", "tie", "fanny", "moustache"] as const) {
    const v = out[k]; if (typeof v === "string" && v[0] === "#") (out as Record<string, unknown>)[k] = fn(v);
  }
  return out;
};
export const ASST1_FIT: Outfit = { shirt: "#b8472e", pants: "#6e5a40", shoes: "#4a3426", hair: "#4a3020", hairStyle: "crop", hat: "bucket", hatCol: "#8c7a52", vest: "#c2a878" };
export const ASST2_FIT: Outfit = { shirt: "#3d63b8", pants: "#5a4a3a", shoes: "#3a2a20", hair: "#2a2020", hairStyle: "crop", hat: "bucket", hatCol: "#5e7f6b", vest: "#c2a878", build: "small" };
export const RANGER_FIT: Outfit = { shirt: "#4e7a4a", pants: "#5a4a32", shoes: "#3a2a20", hair: "#5a3b2a", hairStyle: "crop", hat: "ranger", hatCol: "#9c7a45" };
export const TEACHER_FIT: Outfit = { shirt: "#f3ead8", pants: "#4a4458", shoes: "#3a2a20", hair: "#8a4a2e", hairStyle: "bun", cardigan: "#8a5a9e", glasses: "round", build: "small" };
export const STUDENT_FIT: Outfit = { shirt: "#5c7fa8", pants: "#3b3f52", shoes: "#3a2a20", hair: "#3a2a1e", hairStyle: "bowl", collar: true, sweater: true, pencil: true, build: "kid", starBadge: true, hairClip: "#e23a3a" };
/** the blueprint person = the story's visitor (orange Hawaiian shirt, red cap, camera). A3: NOT chalk-tinted any more:
 *  the card is lit nearly neutral in the blueprint space (cardshade uFlat), so #F07A2A / #D8342C pop against the blue */
export const BP_FIT: Outfit = { shirt: "#f07a2a", pants: "#313862", shoes: "#e9e4da", hair: "#4a3326", hairStyle: "crop", hat: "cap", hatCol: "#d8342c",
  print: "hawaii", shorts: true, camera: "neck", pocket: true };
const T_SHIRTS = ["#f07a2a", "#e8692a", "#f28c3a", "#ee7330", "#f5822e", "#e2662a", "#f39440", "#eb7226"];
const T_HAIR = ["#3a2a20", "#7a4a2e", "#2a2020", "#a87a4a", "#5a3b2a", "#c9a46a", "#9a9aa4", "#4a3020"];
/** tourists (adults only): orange Hawaiian shirts (+-8 % hue), red caps or visors, cameras; v = variant. Variants carry
 *  their own extras so a crowd never reads as copy-paste: 6 = older man (grey moustache + visor), 5 = ponytail woman,
 *  7 = fanny pack, 3 = sunglasses pushed up; pockets carry a pen or a folded park map */
export const tourist = (v: number): Outfit => ({
  shirt: T_SHIRTS[v % 8], pants: ["#313862", "#6e6a5a", "#3e4a6a", "#5a5a6e"][v % 4], shoes: ["#f2c230", "#3a2a20", "#e9e4da", "#4a3426"][v % 4],
  hair: T_HAIR[v % 8], hairStyle: (["crop", "short", "curly", "crop", "short", "pony", "short", "curly"] as HairStyle[])[v % 8],
  hat: v === 6 ? "visor" : v === 5 ? null : v % 3 === 1 ? "visor" : v % 3 === 0 ? "cap" : null, hatCol: v % 3 === 1 || v === 6 ? "#f4f1ea" : "#d8342c",
  print: "hawaii", shorts: true, camera: v % 2 ? "neck" : null, glasses: v % 4 === 2 && v !== 6 ? "sun" : null, pocket: true,
  build: (["adult", "tall", "small", "adult", "small", "small", "tall", "adult"] as Build[])[v % 8],
  moustache: v === 6 ? "#b8b8c2" : undefined, sunUp: v === 3, fanny: v === 7 ? "#3e6a8a" : undefined,
  pocketPeek: (["pen", "map", null, "map", "pen", null, "pen", "map"] as const)[v % 8],
});
const PUPIL_SHIRT = ["#5c7fa8", "#4f6f96", "#6a86ad", "#58779e", "#5c7fa8"];
export const pupil = (v: number): Outfit => ({
  shirt: PUPIL_SHIRT[v % 5], pants: "#3b3f52", shoes: "#3a2a20", hair: ["#2a2020", "#7a4a2e", "#c9a46a", "#5a3b2a", "#3a2a20"][v % 5],
  hairStyle: (["short", "pony", "curly", "bob", "swept"] as HairStyle[])[v % 5], collar: true, sweater: true, build: "kid", // A7 P3: no "crop" (it read as a bald head on a kid)
});

// ---------------- the Sign A panel swap (shot 8), shared by CHAR (the assistant's hands) and WORLD-EXT (the panels) ----------------
/** [dx, dy, dz, rotZ] of a panel relative to its hanging spot on the Sign A hooks (TT.signA: x, cy, z) */
export type PanelPose = [number, number, number, number];
const sm01 = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const lerpP = (a: PanelPose, b: PanelPose, k: number): PanelPose => a.map((v, i) => v + (b[i] - v) * sm01(k)) as PanelPose;
/** where the old STAY ON TRAIL panel (old) and the new Sign A panel (neu) are in shot `id` at t = f - BEAT.swapping.
 *  A3 (readable, ~33 f): -7..-1 he turns to the post, dips, both hands on the panel's near side edge; -1..7 the old
 *  panel lifts and unhooks (8 f); 7..13 it is carried and set leaning on the right post (6 f); 13..19 the new panel
 *  comes up out of the stack (6 f); 19..25 it is hung on the hooks with a 2 f overshoot, then wobbles +-2 deg 6 f.
 *  Shot 9 keeps the old panel leaning until he picks it up (t 40..42), then it is the plank under his arm (null). */
export const SWAP_STACK: PanelPose = [0.88, -1.07, 0.15, 0.22], SWAP_LEAN: PanelPose = [0.84, -1.08, 0.27, 0.2];
export const SWAP_T = { grip: -1, lifted: 7, leaned: 13, up: 19, hung: 25, pick9: 99, gone9: 28 }; // A6 LEAD P3: off 2 f sooner (the 8 -> 9 dissolve) // A4: gone9 = he walks off right (empty-handed) BEFORE the 8 -> 9 dissolve; the old panel stays leaning
export const swapPath = (id: number, t: number): { old: PanelPose | null; neu: PanelPose } => {
  const HOOK: PanelPose = [0, 0, 0, 0], T = SWAP_T, OFF: PanelPose = [0, 0.14, 0.15, -0.02], LIFT: PanelPose = [0.3, 0.15, 0.16, 0.05], PRE: PanelPose = [0, 0.13, 0.08, 0];
  if (id < 8) return { old: HOOK, neu: SWAP_STACK };
  if (id === 9) return { old: SWAP_LEAN, neu: HOOK }; // A4: the old panel stays leaning on the post foot (he walks off without it)
  if (id > 9) return { old: null, neu: HOOK };
  let old: PanelPose = HOOK;
  if (t >= T.grip) old = lerpP(HOOK, OFF, (t - T.grip) / (T.lifted - T.grip));
  if (t >= T.lifted) old = lerpP(OFF, SWAP_LEAN, (t - T.lifted) / (T.leaned - T.lifted));
  let neu: PanelPose = SWAP_STACK;
  if (t >= T.leaned) neu = lerpP(SWAP_STACK, LIFT, (t - T.leaned) / (T.up - T.leaned));
  if (t >= T.up) neu = lerpP(LIFT, PRE, (t - T.up) / 3);
  if (t >= T.up + 3) { const k = (t - T.up - 3) / 3; neu = lerpP(PRE, HOOK, k); if (k > 0.5 && k < 1.3) neu[1] -= 0.025 * Math.sin(Math.PI * (k - 0.5) / 0.8); }
  if (t >= T.hung && t < T.hung + 6) neu = [0, 0, 0, 0.035 * Math.sin((t - T.hung) * 1.6) * (1 - (t - T.hung) / 6)];
  return { old, neu };
};

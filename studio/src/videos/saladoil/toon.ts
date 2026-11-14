// The cast of "The Oil Tanks That Were Mostly Water" (saladoil): flat 2D cartoon cards drawn on a canvas (the Pen
// drawing system, kept from the antitheft engine), the 1960s wardrobe (suits, overalls, work jackets, fedoras, flat caps)
// and the joke cast + effect cards (the oil blob, the fish, the inspector's clipboard, the reflection in the oil).
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
  | "gasp" | "knowing" | "content" | "ponder" | "hush" | "sheepish" | "dotSmirk" | "blow" | "plot" | "laugh" | "alert"
  | "shout" | "holler" | "deadpan" | "bliss" | "beam" | "pant" | "curious" | "wink"
  | "squint" | "goggleO" | "warm" | "sigh" | "inhale" | "peek"
  // fix r2 (A2): the inspector reading DOWN at his board, his pencil lick; the lender's suspicious / intrigued / peering /
  // wide-eyed beats (white sclera, not goggles); Tino's brag grin, chin-up pride and thrill
  | "readDown" | "lick" | "suspicious" | "intrigued" | "peer" | "ohWide" | "brag" | "chinUp" | "thrill"
  // fix r3 (A3 ACTING): DIRECTED GAZE faces: white almond eyes whose big pupil is pushed toward the target (look / lookY),
  // so "looking at the tape / the hatch / the tank / the board / each other" reads at phone size (never a lens stare)
  | "gazeGrin" | "gazeSmile" | "gazeSmug" | "gazeFocus" | "readLow" | "lickLow" | "curiousLow" | "peerLow" | "gazeGasp" | "gazeWorry"
  | "gazeO" | "sideGrin" | "gazeProud" | "gazeAlert" | "yawn";
type EyeK = "dot" | "big" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "side" | "goggle" | "goggleHalf"
  | "down" | "wideW" | "gaze" | "gazeLow";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "o" | "O" | "wave" | "teeth" | "t0" | "t1" | "t2" | "pout" | "purse" | "smirk1"
  | "y0" | "y1" | "y2" | "pant" | "hmm" | "tight" | "lick";
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
  // saladoil: the tank man's SHOUT down (brows hoisted; the big mouth shapes come from the yell flaps); the traders'
  // holler into the phones (squeezed eyes, knitted brows, open D); the inspector's deadpan (flat brows, half-lids, a
  // flat line); the banker's bliss (closed ^^ eyes, a wide smile); Tino's beam (the big confident D grin, brows up);
  // the blob's pant (tired half-lids, an open panting mouth); the lender's curious look (one brow up, a small "o");
  // wink (cast.ts sets face.wink)
  shout: { eye: ["squeeze", "squeeze"], brow: [-7, -10], mouth: "O" },
  holler: { eye: ["squeeze", "squeeze"], brow: [5, -2], mouth: "grin" },
  deadpan: { eye: ["lid", "lid"], brow: [1.5, 1.5], mouth: "dash" },
  bliss: { eye: ["happy", "happy"], brow: [-4, -2], mouth: "smileWide" },
  beam: { eye: ["happy", "happy"], brow: [-6, -5], mouth: "grin" },
  pant: { eye: ["lid", "lid"], brow: [-4, 3], mouth: "pant" },
  // fix r1: curious = ONE brow hoisted + a small side "hmm" mouth (it no longer reads like "wide")
  curious: { eye: ["lid", "lid"], brow: [-1, -1], brow2: [-9, -12], mouth: "hmm" },
  wink: { eye: ["lid", "lid"], brow: [-3, -4], mouth: "smirk1" },
  // fix r1: a suspicious squint (narrowed slit eyes, brows down and knitted, a tight flat mouth)
  squint: { eye: ["slit", "slit"], brow: [4, 1], mouth: "tight" },
  // fix r1: the goggle stare with the round "O" (the lender on "inside?")
  goggleO: { eye: ["goggle", "goggle"], brow: [-12, -11], mouth: "O" },
  // fix r1: the quiet, knowing win (closed ^^ eyes, LEVEL brows a touch arched, a closed smile): never worried / teary
  warm: { eye: ["happy", "happy"], brow: [-2, -4], mouth: "smile" },
  // fix r1: the sigh (half-lids, brows sagging outward, a wavy "~" mouth)
  sigh: { eye: ["lid", "lid"], brow: [-3, 3], mouth: "wave" },
  // fix r1: the big breath before the shout (eyes squeezed, cheeks full, mouth shut)
  inhale: { eye: ["squeeze", "squeeze"], brow: [-4, -6], mouth: "tight" },
  // fix r1: the greedy peek (goggle eyes, a wide grin)
  peek: { eye: ["goggle", "goggle"], brow: [-10, -9], mouth: "grin" },
  // fix r2: eyes DOWN on the clipboard (drooping lids over low pupils), flat brows, the deadpan line; the pencil lick
  readDown: { eye: ["down", "down"], brow: [2.5, 2.5], mouth: "dash" },
  lick: { eye: ["down", "down"], brow: [2.5, 2.5], mouth: "lick" },
  // fix r2 lender: suspicious (one brow hoisted, half-lids, the side "hmm"), intrigued (dot eyes, brows up, lips pressed),
  // peer (narrowed half-lids with VISIBLE pupils, knitted brows), ohWide (white sclera eyes + the round O)
  suspicious: { eye: ["lid", "lid"], brow: [3, 1], brow2: [-6, -10], mouth: "hmm" },
  intrigued: { eye: ["dot", "dot"], brow: [-6, -5], mouth: "pout" },
  peer: { eye: ["lid", "lid"], brow: [4.5, 1], mouth: "tight" },
  ohWide: { eye: ["wideW", "wideW"], brow: [-11, -10], mouth: "O" },
  // fix r2 Tino: the brag (half-lids, one brow hoisted, the big D grin), chin-up pride (open dot eyes, brows raised, a
  // closed smile), the thrill (big eyes + the open grin)
  brag: { eye: ["lid", "lid"], brow: [1, -2], brow2: [-7, -10], mouth: "grin" },
  chinUp: { eye: ["dot", "dot"], brow: [-6, -6], mouth: "smile" },
  thrill: { eye: ["big", "big"], brow: [-8, -7], mouth: "grin" },
  // fix r3: directed-gaze faces (gaze = open white eyes, pupils pushed by look / lookY; gazeLow = a heavy lid over the
  // top ~45 %, the pupil at the bottom: looking DOWN at the tape / the board / into the hatch)
  gazeGrin: { eye: ["gaze", "gaze"], brow: [-6, -5], mouth: "grin" },
  gazeSmile: { eye: ["gaze", "gaze"], brow: [-2, -3], mouth: "smile" },
  gazeSmug: { eye: ["gaze", "gaze"], brow: [2, -2], brow2: [-5, -8], mouth: "smirk1" },
  gazeFocus: { eye: ["gazeLow", "gazeLow"], brow: [2, -1], mouth: "pout" },
  readLow: { eye: ["gazeLow", "gazeLow"], brow: [2.5, 2.5], mouth: "dash" },
  lickLow: { eye: ["gazeLow", "gazeLow"], brow: [2.5, 2.5], mouth: "lick" },
  curiousLow: { eye: ["gaze", "gaze"], brow: [1, 0], brow2: [-8, -11], mouth: "hmm" },
  peerLow: { eye: ["gazeLow", "gazeLow"], brow: [4.5, 1], mouth: "tight" },
  gazeGasp: { eye: ["gaze", "gaze"], brow: [-8, -7], mouth: "o" },
  gazeWorry: { eye: ["gaze", "gaze"], brow: [-5, 3], mouth: "wave" },
  gazeO: { eye: ["gaze", "gaze"], brow: [-9, -8], mouth: "O" },
  sideGrin: { eye: ["side", "side"], brow: [-3, -4], mouth: "grin" },
  gazeProud: { eye: ["gaze", "gaze"], brow: [-4, -5], mouth: "smileWide" },
  gazeAlert: { eye: ["gaze", "gaze"], brow: [-7, -6], mouth: "dash" },
  yawn: { eye: ["happy", "happy"], brow: [-4, -5], mouth: "O" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" || k === "big" || k === "side" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k === "goggle" ? "goggleHalf" : k === "wideW" ? "lid"
  : k === "gaze" ? "gazeLow" : k === "gazeLow" ? "slit" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" ? (k === "down" ? "down" : "dash") : lid > 0 ? halfLid(k) : k;

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
    case "down": { // fix r2: eyes DOWN (reading): a heavy drooping lid (a "u" curve) low in the eye, the pupil a half-disc
      // peeking out under it, pushed to the bottom (it reads as looking down, never at the lens)
      const yl = ey + 2.2 * u;
      p.ell(x + look * 2.2 * u, yl + 0.8 * u, 4.8 * u, 3.8 * u, EYE, 0, 0, 180);
      p.arc(x, yl - 2.6 * u, 8.8 * u, 3.4 * u, 10, 170, lw * 1.1, EYE);
      break;
    }
    case "wideW": { // fix r2: wide eyes as WHITE sclera with a thin outline (not a glasses rim) and 1.5x dot pupils
      p.ell(x, ey - 0.5 * u, 10.5 * u, 11.5 * u, WHITE, 1.6 * u);
      const px = x + clamp(look, -1.4, 1.4) * 3.6 * u, py = ey - 0.5 * u + clamp(lookY, -1.2, 1.2) * 4.2 * u;
      p.dot(px, py, 4.6 * u, EYE); p.dot(px - 1.5 * u, py - 1.6 * u, 1.3 * u, WHITE);
      break;
    }
    case "gaze": case "gazeLow": { // fix r3: a directed gaze (the style kit's side-eye, opened up): a white almond with a thin
      // outline, a BIG dot pupil pushed up to ~85 % of the free room toward (look, lookY); gazeLow drops a heavy lid over
      // the top ~45 % and keeps the pupil at the bottom (it reads as looking DOWN, never as shut, never at the lens)
      const low = kind === "gazeLow", rx = (low ? 10.2 : 9.6) * u, ry = (low ? 9.4 : 8.8) * u, pr = (low ? 3.7 : 4.6) * u, cy0 = ey - 0.6 * u;
      const lx2 = clamp(look, -1.4, 1.4) / 1.4, ly2 = low ? Math.max(0.8, clamp(lookY, -1.4, 1.4) / 1.4) : clamp(lookY, -1.4, 1.4) / 1.4;
      const room = (r: number) => r - pr - 0.5 * u, n2 = Math.hypot(lx2, ly2) > 1 ? Math.hypot(lx2, ly2) : 1;
      const px = x + (lx2 / n2) * room(rx) * 0.92, py = cy0 + (ly2 / n2) * room(ry) * 0.92;
      const al = ellPts(x, cy0, rx, ry, 0, 360, 0, 32);
      p.poly(al, WHITE, 0);
      const yl = cy0 - 0.42 * ry;   // gazeLow: the lid covers the top ~30 %, a band of white shows ABOVE the low pupil
      p.clip(al, () => {
        p.dot(px, py, pr, EYE);
        if (low) p.poly([[x - rx - 2 * u, cy0 - ry - 2 * u], [x + rx + 2 * u, cy0 - ry - 2 * u], [x + rx + 2 * u, yl], [x - rx - 2 * u, yl]], skin, 0);
      });
      if (low) {
        p.arc(x, cy0, rx, ry, -6, 186, 1.5 * u, EYE);
        const hw = rx * Math.sqrt(Math.max(0, 1 - ((yl - cy0) / ry) ** 2)) + 1.2 * u;
        const tl = 1.2 * u * clamp(look, -1, 1); // the lid dips toward the look side
        p.stroke([[x - hw, yl - tl], [x + hw, yl + tl]], lw * 1.05, EYE);
      } else {
        p.poly(al, null, 1.5 * u, EYE);
        p.arc(x, cy0, rx, ry, 200, 340, lw * 0.8, EYE); // the upper lid line
      }
      break;
    }
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
    // the SHOUT flaps (big: they must read in a medium-wide): a mid D with teeth, a wide-open yell with the tongue, a tall O
    case "y0": dmouth(p, mx, my - 1 * u, 9.5 * u, 7.5 * u, u); break;
    case "y1": dmouth(p, mx, my - 2 * u, 13 * u, 13 * u, u, true); break;
    case "y2": p.ell(mx, my + 2.5 * u, 7.5 * u, 10.5 * u, MOUTH, 3 * u); p.ell(mx + 1.5 * u, my + 8 * u, 4 * u, 2.4 * u, TONGUE, 0); break;
    case "pant": dmouth(p, mx, my - 0.5 * u, 7 * u, 6.5 * u, u, true); break;
    // a small sideways "hmm" (a short tilted line pushed to one side with a tiny curl)
    case "hmm": p.stroke([[mx + 0.5 * u, my + 1.2 * u], [mx + 7.5 * u, my - 0.6 * u]], mw * 0.95); p.arc(mx + 8.6 * u, my - 2.4 * u, 2 * u, 2 * u, 40, 150, mw * 0.7); break;
    // pressed lips (cheeks full)
    case "tight": p.stroke([[mx - 4 * u, my], [mx + 4 * u, my]], mw * 1.05); for (const s of [-1, 1]) p.stroke([[mx + s * 4 * u, my - 1.4 * u], [mx + s * 5.4 * u, my + 1.2 * u]], mw * 0.55); break;
    // fix r2: the pencil lick (a small "o" with the tongue tip out)
    case "lick": p.ell(mx + 1 * u, my, 3.6 * u, 3.2 * u, MOUTH, 2.4 * u); p.ell(mx + 2.6 * u, my + 3.4 * u, 2.6 * u, 2.2 * u, TONGUE, 1.4 * u); break;
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
  /** lip flaps use the big shout shapes */
  yell?: boolean;
  /** fix r3: one eye pops open into a directed gaze (screen side -1 / 1) while the other keeps the expression's eye */
  open1?: number;
};
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lookY: number, lid: number,
  brim: boolean, skin: string, talk: number, glasses: string | null | undefined, X: FaceX = {}) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing + (X.fdx ?? 0) * u, dy = (X.fdy ?? 0) * u;
  const gog = F.eye[0] === "goggle";
  const gz = F.eye[0] === "gaze" || F.eye[0] === "gazeLow";
  const ex = (F.eye[0] === "shock" ? 13 : gog ? 15.5 : F.eye[0] === "wideW" || gz ? 13.5 : 12.5) * u, ey = cy + 2 * u + dy, bc = X.browCol ?? INK;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    let kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    if (X.wink && side === Math.sign(X.wink)) kind = "happy";
    if (X.open1 && side === Math.sign(X.open1)) kind = "gaze";
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
  } else if (glasses === "horn") {
    // horn-rimmed browline glasses: a thick dark top bar over each lens, thin lower rims, a bridge, a glint
    const gy = ey - (X.glassDy ?? 0) * u;
    for (const side of [-1, 1]) {
      const gx = fx + side * ex;
      p.poly(rrect(gx - 11 * u, gy - 7.5 * u, gx + 11 * u, gy + 8 * u, 4.5 * u), null, 1.7 * u, "#2a1a14");
      p.band([[gx - 10.5 * u, gy - 6.2 * u], [gx + 10.5 * u, gy - 6.8 * u]], "#4a2a1a", 3.8 * u, 1 * u, "round");
      if (X.glint) p.stroke([[gx - 6 * u, gy + 3 * u], [gx + 1 * u, gy - 4 * u]], 2.2 * u * X.glint, "#ffffff");
    }
    p.stroke([[fx - ex + 11 * u, gy - 4.5 * u], [fx + ex - 11 * u, gy - 4.5 * u]], 2.2 * u, "#2a1a14");
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
  mouth(p, talk >= 0 ? ((X.yell ? ["y0", "y1", "y2"] : ["t0", "t1", "t2"]) as MouthK[])[talk % 3] : F.mouth, mx, my + (X.moustache ? 2.6 * u : 0), u);
};

// ---------------- outfits ----------------
export type Build = "adult" | "small" | "tall" | "round";
export type HairStyle = "bob" | "short" | "swept" | "slick" | "crew" | "bowl" | "bun" | "crop" | "pony" | "curly" | "none" | "bald";
export type Outfit = {
  /** the body colour: the shirt, or the jacket of a suit / work jacket */
  shirt: string; pants: string; shoes: string; skin?: string;
  hair?: string; hairStyle?: HairStyle;
  hat?: "cap" | "flatcap" | "fedora" | "pillbox" | null; hatCol?: string; band?: string;
  /** raise the front hairline by this share of the head height (brows sit on skin, not under the fringe) */
  fringeUp?: number;
  vest?: string; cardigan?: string; print?: "plaid" | null;
  glasses?: "round" | "horn" | null;
  tie?: string; collar?: boolean; pocket?: boolean; dress?: boolean; pencil?: boolean; pencilCol?: string;
  build?: Build;
  moustache?: string; browCol?: string; sweater?: boolean;
  /** a suit jacket (o.shirt) over a white shirt: notched lapels, buttons (double-breasted: 2 x 3), optional
   *  pinstripes and a pocket square */
  suit?: { double?: boolean; stripe?: string; square?: string };
  /** the tie's pattern: little oil drops in this colour (Tino's gold tie) */
  tieDrops?: string;
  /** a lapel pin: the gold oil can (Tino's signature) */
  pin?: "oilcan";
  /** bib overalls in this colour over o.shirt (straps, brass buttons, a bib pocket, orange stitching); o.pants = the legs */
  overalls?: string;
  /** a big measuring-tape reel clipped to a tool belt (colour) */
  reel?: string;
  /** a work jacket (o.shirt): collar points over a pale work shirt + dark tie, a button placket, two chest flap pockets */
  workJacket?: boolean;
  /** a plain name badge on the chest (its text) */
  badge?: string;
  /** shirt sleeves rolled to the elbow (a shirt-colour upper arm with a cuff, the dark forearm below) */
  rolled?: boolean;
  /** a waiter's apron (colour) */
  apron?: string;
  /** fix r1: suspender straps (front: two straps to the waistband; back: an X), sleeve garters on the upper arms, a darker
   *  collar band (colour), a fountain pen clipped in the breast pocket, a gold pocket-watch chain, a back patch (text) */
  braces?: string; garters?: string; collarCol?: string; penPocket?: boolean; watchChain?: boolean; patch?: string;
};
const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  // ~3.3-3.5 head heights (head ~30 % of the height); adults 1.62-1.73 m (HH ~0.5 m)
  adult: { a: 122, torso: 1.1, legs: 1.25, tw: 0.84 },
  small: { a: 120, torso: 1.06, legs: 1.2, tw: 0.78 },
  tall: { a: 122, torso: 1.12, legs: 1.34, tw: 0.86 },
  // Tino: a round barrel of a man (a wide, round torso on short legs): the main character's silhouette
  round: { a: 126, torso: 1.1, legs: 1.06, tw: 1.14 },
};

// ---------------- hair + hats ----------------
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
  if (!back && o.hat && o.hat !== "pillbox" && (st === "crop" || st === "short" || st === "curly" || st === "bowl" || st === "swept")) {
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
  if (st === "bald" && !hatted) {
    // fix r1: a bald pate (a soft scalp gloss) with a horseshoe of hair at the temples (front) / round the back (back view)
    p.clip(hp, () => {
      if (back) p.poly([[cx - 1.3 * H.a, hc - 0.05 * H.b], [cx + 1.3 * H.a, hc - 0.05 * H.b], [cx + 1.3 * H.a, hc + 0.88 * H.b], [cx - 1.3 * H.a, hc + 0.88 * H.b]], backHair(col), 0);
      else for (const s of [-1, 1]) p.poly([[cx + s * 0.78 * H.a, hc - 0.42 * H.b], [cx + s * 1.2 * H.a, hc - 0.5 * H.b], [cx + s * 1.2 * H.a, hc + 0.2 * H.b], [cx + s * 0.86 * H.a, hc + 0.08 * H.b]], col, 0);
      p.arc(cx - 0.32 * H.a, crown + 0.2 * HH, 16 * u, 9 * u, 200, 290, 3 * u, "#ffffff");
    });
    p.inkRing(hp, ow, thickAngle(light));
    return;
  }
  if (hatted && st !== "bob") {
    // tufts of hair under a hat brim at the temples: the SAME small crescent mirrored on both sides (clipped to the
    // head), never darker than L* ~25, with a gloss tick (no one-sided "eye patch")
    if (back) {
      // A3: from behind under a hat: the hair MASS in the hair colour (warm-lifted, never grey) from the brim down to a
      // near-straight nape hairline at ~89 % of the head height, a narrow shaded nape band below it, 3 gloss stripes
      const hc2 = backHair(col);
      p.clip(hp, () => {
        const hl: P2[] = [];
        // fix r1: under a cap only a nape of hair shows; fix r2 (A2): under a fedora / flat cap the hair mass covers ~90 % of
        // the head (a thin shaded nape strip, no pale crescent that reads as a mask)
        const capB = o.hat === "cap" || o.hat === "fedora" || o.hat === "flatcap", ny = o.hat === "cap" ? 0.46 : capB ? 0.8 : 0.78;
        for (let k = 0; k <= 16; k++) { const t = k / 16, x = cx - 1.2 * H.a + 2.4 * H.a * t; hl.push([x, hc + ny * H.b + 0.025 * H.b * Math.sin(t * Math.PI * 9) - 0.05 * H.b * (2 * t - 1) ** 2]); }
        p.poly([[cx - 1.3 * H.a, hc + 1.3 * H.b], [cx + 1.3 * H.a, hc + 1.3 * H.b], ...hl.slice().reverse()], mul(o.skin ?? SKIN, [0.86, 0.84, 0.9]), 0);
        p.poly([[cx - 1.3 * H.a, hc - 1.2 * H.b], [cx + 1.3 * H.a, hc - 1.2 * H.b], ...hl.slice().reverse()], hc2, 0);
        p.shadedFill([[cx - 1.3 * H.a, hc - 1.2 * H.b], [cx + 1.3 * H.a, hc - 1.2 * H.b], [cx + 1.3 * H.a, hc + 0.8 * H.b], [cx - 1.3 * H.a, hc + 0.8 * H.b]], "rgba(0,0,0,0)", "rgba(40,20,50,0.22)", light, H.a, 0.2);
        for (const s2 of capB ? [-0.32, 0.32] : [-0.5, 0, 0.5]) p.stroke([[cx + s2 * H.a, hc - (capB ? 0.0 : 0.4) * H.b], [cx + s2 * 1.08 * H.a, hc + (ny - 0.16) * H.b]], 1.5 * u, mix(hc2, "#ffffff", 0.3));
        p.stroke(hl, ny > 0.7 ? 2.2 * u : 1.2 * u, ny > 0.7 ? INK : shade(hc2, 0.75));
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
  let cut = crown + ((st === "bowl" ? 0.4 : st === "swept" ? 0.27 : st === "slick" ? 0.31 : st === "crew" ? 0.22 : 0.29) - (o.fringeUp ?? 0)) * HH;
  // A3: from behind the hair covers ~94 % of the head height; the last ~6 % is a STRAIGHT shaded nape band (never a
  // curved pale crescent that reads as a grin on the back of the head)
  if (back) cut = hc + 0.95 * H.b; // A4: the hair meets the collar (no pale face-fill band above the backpack)
  const keep = ([x, y]: P2) => y < cut || (st === "bowl" && !back && Math.abs(x - cx) > 0.8 * H.a && y < hc + 0.3 * H.b);
  const vol = st === "slick" ? 1.06 : 1.035; // slicked hair sits up off the scalp (a glossy helmet)
  const arc = keepRun(hp, keep).map(([x, y]) => [cx + (x - cx) * vol, hc + (y - hc) * vol] as P2);
  if (arc.length < 3) return;
  if (!back) {
    const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
    if (st === "bowl") { // straight fringe
      arc.push([x0 + 0.08 * H.a, cut], [x1 - 0.08 * H.a, cut]);
    } else if (st === "slick") { // slicked back: a clean hairline with a small widow's peak in the middle
      for (let i = 1; i < 12; i++) { const t = i / 12; arc.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 6 * u * Math.sin(Math.PI * t) + 7 * u * Math.exp(-(((t - 0.5) / 0.07) ** 2))]); }
    } else if (st === "crew") { // a short crew cut: a near-straight bristly hairline
      for (let i = 1; i < 14; i++) { const t = i / 14; arc.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 2 * u * Math.sin(Math.PI * t) + (i % 2 ? 1.6 * u : 0)]); }
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
  if (st === "slick") {
    // slicked-back black hair: long glossy combed strands sweeping back, a bright blue-white gloss, neat pointed sideburns
    p.clip(arc, () => {
      for (const s of [-0.62, -0.25, 0.12, 0.5]) p.stroke(curve([cx + s * H.a - 4 * u, cut - 3 * u], [cx + s * H.a + 10 * u, crown + 0.12 * HH], [cx + s * H.a + 30 * u, crown + 0.02 * HH], 10), 1.3 * u, mix(hcol, "#8a90b8", 0.45));
      p.stroke(curve([cx - 0.62 * H.a, cut - 9 * u], [cx - 0.3 * H.a, crown + 0.06 * HH], [cx + 0.2 * H.a, crown + 0.04 * HH], 10), 3.4 * u, mix(hcol, "#dfe6ff", 0.62));
      p.stroke(curve([cx + 0.35 * H.a, cut - 6 * u], [cx + 0.5 * H.a, crown + 0.1 * HH], [cx + 0.75 * H.a, crown + 0.14 * HH], 8), 1.8 * u, mix(hcol, "#dfe6ff", 0.4));
    });
    if (!back) for (const s of [-1, 1]) p.poly([[cx + s * 0.9 * H.a, hc - 0.5 * H.b], [cx + s * 1.02 * H.a, hc - 0.45 * H.b], [cx + s * 0.99 * H.a, hc + 0.06 * H.b], [cx + s * 0.92 * H.a, hc - 0.1 * H.b]], hcol, ow * 0.4);
  } else if (st === "crew") {
    // a crew cut: short bristles along the top edge, two faint stripe rows, a small gloss
    p.clip(arc, () => { for (const r of [0.08, 0.16]) p.arc(cx, crown + r * HH + 4 * u, 0.85 * H.a, 0.18 * HH, 200, 340, 1 * u, mix(hcol, "#ffffff", 0.22)); });
    for (let i = 2; i < arc.length - 2; i += 2) { const [x, y] = arc[i]; if (y > cut - 4 * u) continue; const dx = x - cx, dy = y - hc, l = Math.hypot(dx, dy) || 1; p.stroke([[x, y], [x + (dx / l) * 2.6 * u, y + (dy / l) * 2.6 * u]], 1.1 * u, hcol); }
  } else if (st === "swept") {
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
  if (st !== "bowl" && st !== "slick") p.arc(cx - 0.3 * H.a, crown + 0.2 * HH, 14 * u, 8 * u, 200, 265, 2.6 * u, gl);
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
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, col = o.hatCol ?? "#3a3a40", sh = mul(col, SH_FELT);
  if (o.hat === "fedora") {
    // a felt fedora: a pinched crown with a dark band, a medium brim (snap-brim: curled up at the sides), a felt sheen
    const by = hc - 0.62 * H.b, tw = wind * 1.5 + flut, Rt = (pts: P2[]) => rotPts(pts, rad(tw), cx, by);
    const brim = Rt(ellPts(cx, by, 0.64 * W, 0.078 * HH, 0, 360, 0, 40).map(([x, y]) => [x, y - 3.6 * u * (((x - cx) / (0.64 * W)) ** 2)] as P2));
    p.gradFill(brim, mix(col, "#ffffff", 0.08), sh, light, 0.3); p.inkRing(brim, ow * 0.75, thickAngle(light));
    const crown = Rt([[cx - 0.32 * W, by], [cx - 0.28 * W, by - 0.3 * HH], [cx - 0.12 * W, by - 0.37 * HH], [cx, by - 0.31 * HH], [cx + 0.12 * W, by - 0.37 * HH], [cx + 0.28 * W, by - 0.3 * HH], [cx + 0.32 * W, by]]);
    p.shadedFill(crown, col, sh, light, 0.3 * W, 0.4);
    p.clip(crown, () => {
      p.band(Rt([[cx - 0.4 * W, by - 0.055 * HH], [cx + 0.4 * W, by - 0.055 * HH]]), o.band ?? mix(col, "#120c10", 0.62), 0.085 * HH, 0.6 * u);
      p.stroke(Rt([[cx - 0.01 * W, by - 0.3 * HH], [cx + 0.02 * W, by - 0.17 * HH]]), 1.4 * u, shade(col, 0.66)); // the centre dent
      p.stroke(Rt(curve([cx - 0.24 * W, by - 0.12 * HH], [cx - 0.2 * W, by - 0.25 * HH], [cx - 0.08 * W, by - 0.31 * HH], 8)), 1.8 * u, mix(col, "#ffffff", 0.3)); // felt sheen
    });
    p.poly(crown, null, ow * 0.8);
  } else if (o.hat === "flatcap") {
    // a 1960s flat cap: a soft flat crown pulled forward over the brow, a short stiff peak, one seam, tweed flecks
    const by = hc - 0.5 * H.b, tw = wind * 1.2 + flut * 0.8, Rt = (pts: P2[]) => rotPts(pts, rad(tw), cx, by);
    const crown: P2[] = [];
    for (let i = 0; i <= 24; i++) { const t = Math.PI + (Math.PI * i) / 24; crown.push([cx + 1.1 * H.a * Math.cos(t), by + 0.24 * HH * Math.sin(t) * (1 + 0.12 * Math.cos(t) * (facing || 1))]); }
    crown.push([cx + 1.08 * H.a, by + 0.04 * HH], [cx - 1.08 * H.a, by + 0.04 * HH]);
    const cr = Rt(crown);
    p.shadedFill(cr, col, sh, light, 1.1 * H.a, 0.4);
    p.clip(cr, () => {
      for (let i = 0; i < 22; i++) { const x = cx + (rnd(7, i) - 0.5) * 2 * H.a, y = by - (0.02 + 0.2 * rnd(8, i)) * HH; p.stroke(Rt([[x, y], [x + 1.8 * u, y - 1.3 * u]]), 0.8 * u, shade(col, 0.8)); }
      p.stroke(Rt(curve([cx - 0.95 * H.a, by - 0.1 * HH], [cx, by - 0.19 * HH], [cx + 0.95 * H.a, by - 0.1 * HH], 10)), 1.3 * u, shade(col, 0.7));
      p.stroke(Rt(curve([cx - 0.75 * H.a, by - 0.15 * HH], [cx - 0.35 * H.a, by - 0.22 * HH], [cx + 0.05 * H.a, by - 0.23 * HH], 8)), 2 * u, mix(col, "#ffffff", 0.3));
    });
    p.inkRing(cr, ow * 0.85, thickAngle(light));
    if (!back) { // the short peak toward the lens (and the facing side)
      const bx = cx + 9 * u * facing, bw = 0.46 * W, pk: P2[] = [];
      for (let i = 0; i <= 20; i++) { const t = Math.PI * (i / 20); pk.push([bx + bw * Math.cos(t), by + 0.03 * HH + 0.065 * HH * Math.sin(t)]); }
      p.poly(Rt(pk), shade(col, 0.86), ow * 0.7);
      p.arc(...Rt([[bx, by + 0.035 * HH]])[0], bw * 0.85, 0.035 * HH, 25, 155, 1.2 * u, mix(col, "#ffffff", 0.3));
    }
  } else if (o.hat === "pillbox") {
    // a small 1960s pillbox hat perched toward the back of the head
    const by = hc - 0.88 * H.b, bx = cx - 10 * u * (facing || 1), a = rad(-12 * (facing || 1) + wind * 1.2);
    const box = rotPts(rrect(bx - 0.19 * W, by - 0.21 * HH, bx + 0.19 * W, by + 0.01 * HH, 5 * u), a, bx, by);
    p.shadedFill(box, col, sh, light, 0.2 * W, 0.4); p.poly(box, null, ow * 0.75);
    p.poly(rotPts(ellPts(bx, by - 0.21 * HH, 0.19 * W, 0.035 * HH, 0, 360, 0, 20), a, bx, by), mix(col, "#ffffff", 0.2), ow * 0.5);
    const [kx, ky] = rotPts([[bx + 0.17 * W, by - 0.08 * HH]], a, bx, by)[0];
    for (const s2 of [-1, 1]) p.ell(kx + s2 * 4 * u, ky, 4.5 * u, 3 * u, shade(col, 0.75), 1 * u, 0, 360, s2 * 30);
  } else if (o.hat === "cap") {
    // fix r1: from behind the cap sits lower and wider (covers the top ~45 % of the head), so a back view reads as a cap
    const by = back ? hc - 0.08 * H.b : hc - 0.5 * H.b, chH = back ? 0.53 * HH : 0.31 * HH;
    const crown: P2[] = [];
    for (let i = 0; i <= 18; i++) { const t = Math.PI + (Math.PI * i) / 18; crown.push([cx + (back ? 1.1 : 1.04) * H.a * Math.cos(t), by + chH * Math.sin(t)]); }
    p.shadedFill(crown, col, sh, light, H.a, 0.4); p.poly(crown, null, ow * 0.85);
    p.stroke([[cx, by - chH], [cx, by - 0.04 * HH]], 1.3 * u, shade(col, 0.7));
    for (const s of [-1, 1]) p.arc(cx + s * 0.42 * H.a, by, 0.35 * H.a, chH * 0.93, s > 0 ? 200 : 270, s > 0 ? 270 : 340, 1.1 * u, shade(col, 0.72));
    p.dot(cx, by - chH, 3.2 * u, shade(col, 0.8));
    p.arc(cx - 0.45 * H.a, by - 0.16 * HH, 0.28 * H.a, 0.1 * HH, 200, 300, 2 * u, mix(col, "#ffffff", 0.35)); // crown sheen
    if (back) {
      // the cap's BACK: a strap opening (hair shows through) with the adjuster strap across it, the top button highlight
      const oy = by - 0.005 * HH;
      p.ell(cx, oy, 0.2 * H.a, 0.07 * HH, shade(col, 0.55), 1.4 * u, 180, 360);
      p.band([[cx - 0.26 * H.a, oy - 0.04 * HH], [cx + 0.26 * H.a, oy - 0.04 * HH]], shade(col, 0.78), 0.03 * HH, 0.8 * u);
      p.stroke([[cx - 1.06 * H.a, by - 0.02 * HH], [cx + 1.06 * H.a, by - 0.02 * HH]], 1.4 * u, shade(col, 0.62));
    } else {
      // a real ball-cap BILL sticking out toward the lens (and toward the facing side): its dark underside showing
      const bx = cx + 12 * u * facing, bw = 0.4 * W, bt = (wind * 1.2 + flut * 0.8) * u;
      const bill: P2[] = [];
      for (let i = 0; i <= 24; i++) { const t = Math.PI * (i / 24); bill.push([bx + bw * Math.cos(t), by - 0.03 * HH + 0.085 * HH * Math.sin(t) + bt * Math.cos(t)]); }
      p.poly(bill, mix(col, "#5a1010", 0.45), ow * 0.8);
      p.clip(bill, () => p.ell(bx, by - 0.035 * HH, bw * 1.02, 0.05 * HH, shade(col, 1.0), 0, 0, 180));
      p.arc(bx, by - 0.035 * HH, bw * 0.9, 0.04 * HH, 25, 155, 1.3 * u, mix(col, "#ffffff", 0.35));
    }
  }
};

// ---------------- held props ----------------
export type Hold = "clipboard" | "pencil" | "stamp" | "handset" | "wrench" | "newspaper" | "umbrella" | "card" | "cup" | "slip"
  | "pointer" | "papers" | "flashlight" | "phone" | "thermos" | "briefcase" | "rag" | "handbag" | null;
/** prop at hand (hx, hy); ang in degrees (0 = upright); side = which arm; n = prop state (stamp inked, cord swing, steam) */
const holdProp = (p: Pen, kind: Hold, hx: number, hy: number, u: number, ang: number, side: number, light: number, n = 0) => {
  if (!kind) return;
  const R = (pts: P2[]) => rotPts(pts, rad(ang), hx, hy), Q = (x: number, y: number): P2 => R([[x, y]])[0];
  switch (kind) {
    case "stamp": { // the banker's wooden rubber stamp gripped by its neck: a round knob above the fist, the block and the
      // rubber below (n = 1: the rubber is inked red)
      p.poly(R(ellPts(hx, hy - 10 * u, 7.5 * u, 6.2 * u, 0, 360, 0, 20)), "#9a5e34", 1.6 * u);
      p.arc(...Q(hx - 2.4 * u, hy - 12 * u), 3.4 * u, 2.2 * u, 200, 300, 1.4 * u, "#e0a070");
      p.poly(R(rrect(hx - 2.8 * u, hy - 5 * u, hx + 2.8 * u, hy + 9 * u, 1 * u)), "#6a3e22", 1.2 * u);
      p.poly(R(rrect(hx - 13 * u, hy + 8 * u, hx + 13 * u, hy + 16 * u, 1.6 * u)), "#6a4426", 1.6 * u);
      p.stroke(R([[hx - 11 * u, hy + 10 * u], [hx + 9 * u, hy + 10 * u]]), 1 * u, "#a87a50");
      p.poly(R(rrect(hx - 12 * u, hy + 16 * u, hx + 12 * u, hy + 19.5 * u, 0.8 * u)), n ? "#d02a20" : "#2e2430", 1.2 * u);
      p.dot(hx, hy, 5.8 * u);
      break;
    }
    case "handset": { // a 1960s phone receiver held to the ear: the earpiece above the fist, the mouthpiece at the mouth
      // corner, the curly cord hanging from it (n = cord swing -1..1)
      const s = side, ear = Q(hx + s * 2 * u, hy - 14 * u), mo = Q(hx - s * 8 * u, hy + 17 * u);
      p.band([ear, mo], "#1c1a22", 6.4 * u, 1 * u, "round");
      p.ell(ear[0], ear[1], 7.6 * u, 6 * u, "#1c1a22", 1.4 * u, 0, 360, s * 30 + ang);
      p.ell(mo[0], mo[1], 7.2 * u, 5.8 * u, "#1c1a22", 1.4 * u, 0, 360, -s * 25 + ang);
      p.stroke([[ear[0] - s * 3 * u, ear[1] - 2 * u], [ear[0] + s * 1 * u, ear[1] - 4 * u]], 1.4 * u, "#6a6a7e");
      const cord: P2[] = [];
      for (let i = 0; i <= 44; i++) { const t = i / 44, a = t * Math.PI * 18; cord.push([mo[0] + 3 * u * Math.cos(a) + n * 7 * u * t * t, mo[1] + 5 * u + t * 40 * u + 2.2 * u * Math.sin(a)]); }
      p.stroke(cord, 1.2 * u, "#1c1a22");
      p.dot(hx, hy, 5.8 * u);
      break;
    }
    case "wrench": { // a big steel spanner along `ang` (0 = up): an open jaw at the far end, a highlight down the bar
      const L = 40 * u;
      p.band(R([[hx, hy + 7 * u], [hx, hy - L]]), "#a9b1bd", 5 * u, 1.3 * u, "round");
      p.poly(R([[hx - 8.5 * u, hy - L + 1 * u], [hx - 9 * u, hy - L - 13 * u], [hx - 3.4 * u, hy - L - 13 * u], [hx - 3.4 * u, hy - L - 6 * u],
        [hx + 3.4 * u, hy - L - 6 * u], [hx + 3.4 * u, hy - L - 13 * u], [hx + 9 * u, hy - L - 13 * u], [hx + 8.5 * u, hy - L + 1 * u]]), "#a9b1bd", 1.4 * u);
      p.stroke(R([[hx - 1.2 * u, hy - 4 * u], [hx - 1.2 * u, hy - L + 3 * u]]), 1.1 * u, "#eef2f8");
      p.dot(hx, hy, 5.8 * u);
      break;
    }
    case "newspaper": { // a broadsheet held open at the chest for reading: headline bars, a photo box, columns, the fold
      const w = 56 * u, h2 = 40 * u, x0 = side < 0 ? hx - 5 * u : hx - w + 5 * u, y0 = hy - h2 + 8 * u;
      p.poly(R(rrect(x0, y0, x0 + w, y0 + h2, 1 * u)), "#f1ece0", 1.6 * u);
      p.stroke(R([[x0 + w / 2, y0], [x0 + w / 2, y0 + h2]]), 1.1 * u, "#bfb6a2");
      p.band(R([[x0 + 4 * u, y0 + 6 * u], [x0 + w - 5 * u, y0 + 6 * u]]), "#2a2a30", 3.4 * u, 0);
      p.band(R([[x0 + 4 * u, y0 + 11.5 * u], [x0 + w * 0.6, y0 + 11.5 * u]]), "#2a2a30", 2.4 * u, 0);
      p.poly(R(rrect(x0 + 4 * u, y0 + 16 * u, x0 + 20 * u, y0 + 28 * u, 0.5 * u)), "#9a9aa4", 0.8 * u);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 5; r++) { const xc = x0 + (c < 1 ? 22 : 8 + c * 12) * u; if (c === 0 && r > 1) continue;
        p.stroke(R([[xc, y0 + (17 + r * 4.4) * u], [xc + 9 * u, y0 + (17 + r * 4.4) * u]]), 0.9 * u, "#7a7a84"); }
      p.dot(hx, hy, 5.8 * u);
      break;
    }
    case "umbrella": { // the crook handle under the fist (the canopy and shaft are drawn behind the head by drawPerson)
      p.band(R([[hx, hy - 5 * u], [hx, hy + 8 * u]]), "#3a3036", 2.6 * u, 0.9 * u, "round");
      p.arc(...Q(hx + 3.6 * u, hy + 8 * u), 3.6 * u, 4 * u, 0, 180, 2.8 * u, "#7a5232");
      p.dot(hx, hy, 5.8 * u);
      break;
    }
    case "card": { // a plain payment card (no logo, no text): cream with a blue band; fix r2: n = size (default 1)
      const z = n > 0 ? n : 1;
      // fix r3 (A3 P2): pale green with one white stripe (no logo, no text)
      p.poly(R(rrect(hx - 3 * u, hy - 4 * u - 11 * u * z, hx - 3 * u + 16 * u * z, hy - 4 * u, 1.2 * u * z)), "#a8dcb0", 1.3 * u * Math.sqrt(z));
      p.poly(R(rrect(hx - 3 * u, hy - 4 * u - 8.4 * u * z, hx - 3 * u + 16 * u * z, hy - 4 * u - 6.2 * u * z, 0)), "#ffffff", 0);
      p.dot(hx, hy, 5.6 * u);
      break;
    }
    case "cup": { // a coffee cup on its saucer with a curl of steam (n = steam phase)
      p.ell(...Q(hx, hy - 2.5 * u), 11.5 * u, 2.8 * u, "#f4f0e8", 1.2 * u);
      p.poly(R([[hx - 7 * u, hy - 15 * u], [hx + 7 * u, hy - 15 * u], [hx + 5.6 * u, hy - 3.5 * u], [hx - 5.6 * u, hy - 3.5 * u]]), "#faf6ee", 1.3 * u);
      p.stroke(R([[hx - 6.6 * u, hy - 11.5 * u], [hx + 6.6 * u, hy - 11.5 * u]]), 1.5 * u, "#c84a3a");
      p.arc(...Q(hx + 8 * u, hy - 9.5 * u), 3 * u, 3.4 * u, 270, 450, 1.4 * u);
      const st: P2[] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; st.push([hx + 2.6 * u * Math.sin(n * 0.35 + t * 5), hy - 18 * u - 16 * u * t]); }
      const g = p.g; g.save(); g.globalAlpha = 0.55; p.stroke(R(st), 1.8 * u, "#ffffff"); g.restore();
      break;
    }
    case "slip": { // a small order slip / note pad
      p.poly(R(rrect(hx - 4 * u, hy - 20 * u, hx + 12 * u, hy - 2 * u, 0.8 * u)), "#fbf7e8", 1.2 * u);
      for (let r = 0; r < 3; r++) p.stroke(R([[hx - 1 * u, hy - 15 * u + r * 4.4 * u], [hx + 9 * u, hy - 15 * u + r * 4.4 * u]]), 0.9 * u, "#7a84a0");
      p.dot(hx, hy, 5.6 * u);
      break;
    }
    case "clipboard": { // a small clipboard (lined sheet) held flat against the chest
      p.poly(R(rrect(hx - 17 * u, hy - 26 * u, hx + 17 * u, hy + 20 * u, 2.5 * u)), "#a8743f", 2.2 * u);
      p.poly(R(rrect(hx - 14 * u, hy - 22 * u, hx + 14 * u, hy + 17 * u, 1 * u)), "#fbf8ef", 1.2 * u);
      p.poly(R(rrect(hx - 7 * u, hy - 29 * u, hx + 7 * u, hy - 22 * u, 1.5 * u)), "#b9bcc8", 1.6 * u);
      for (let r = 0; r < 5; r++) p.stroke(R([[hx - 10 * u, hy - 14 * u + r * 6.5 * u], [hx + (r % 2 ? 6 : 10) * u, hy - 14 * u + r * 6.5 * u]]), 1 * u, "#8a93a8");
      break;
    }
    case "pencil": { // a yellow pencil: the point down in the fist's direction of travel, a pink eraser
      p.band(R([[hx, hy + 4 * u], [hx, hy - 16 * u]]), "#f2c230", 3 * u, 0.9 * u, "round");
      p.dot(...Q(hx, hy - 17 * u), 1.8 * u, "#e88a9a");
      p.dot(hx, hy, 5.6 * u);
      break;
    }
    // ---- fix r1 props ----
    case "pointer": { // a long wooden pointer along ang (0 = up), n = its length in u (default 150), a black rubber tip
      const L = (n || 150) * u;
      p.band(R([[hx, hy + 10 * u], [hx, hy - L]]), "#b07a3e", 2.6 * u, 1 * u, "round");
      p.stroke(R([[hx - 0.6 * u, hy + 6 * u], [hx - 0.6 * u, hy - L + 4 * u]]), 0.8 * u, "#e0b070");
      p.poly(R(rrect(hx - 2.2 * u, hy - L - 7 * u, hx + 2.2 * u, hy - L + 1 * u, 1.4 * u)), "#2a2228", 0.9 * u);
      p.dot(hx, hy, 5.8 * u);
      break;
    }
    case "papers": { // a fan of 4 cream OIL RECEIPTS held up (each: a dark header bar, lines, a red stamp mark)
      for (let k = 0; k < 4; k++) {
        const a = rad(ang - 30 + k * 17), Rk = (pts: P2[]) => rotPts(pts, a, hx, hy);
        p.poly(Rk(rrect(hx - 9 * u, hy - 38 * u, hx + 9 * u, hy - 4 * u, 1 * u)), k % 2 ? "#fbf3df" : "#f6ecd2", 1.3 * u);
        p.poly(Rk(rrect(hx - 7 * u, hy - 35 * u, hx + 7 * u, hy - 31 * u, 0.5 * u)), "#3a3040", 0);
        for (let r = 0; r < 3; r++) p.stroke(Rk([[hx - 6 * u, hy - (27 - r * 4.5) * u], [hx + (r % 2 ? 3 : 6) * u, hy - (27 - r * 4.5) * u]]), 0.8 * u, "#9a8f7c");
        p.poly(Rk(rrect(hx - 1 * u, hy - 15 * u, hx + 7 * u, hy - 10 * u, 0.8 * u)), null, 1.1 * u, "#c0241c");
      }
      p.dot(hx, hy, 5.8 * u);
      break;
    }
    case "flashlight": { // a chrome flashlight along ang (0 = up): the lens end lit (n = beam on 0..1)
      p.poly(R(rrect(hx - 3.4 * u, hy - 26 * u, hx + 3.4 * u, hy + 6 * u, 1.6 * u)), "#9aa2b2", 1.3 * u);
      p.poly(R(rrect(hx - 5 * u, hy - 33 * u, hx + 5 * u, hy - 24 * u, 1.6 * u)), "#b8c0cc", 1.3 * u);
      p.stroke(R([[hx - 1.6 * u, hy - 30 * u], [hx - 1.6 * u, hy + 3 * u]]), 1 * u, "#eef2f8");
      p.poly(R(rrect(hx - 4 * u, hy - 35 * u, hx + 4 * u, hy - 32.5 * u, 1 * u)), n > 0 ? "#fff2b0" : "#d8dce4", 0.8 * u);
      p.dot(hx, hy, 5.8 * u);
      break;
    }
    case "phone": { // a 1960s desk phone base held at the chest (dial ring) + the coiled cord up to the receiver hand
      p.poly(R([[hx - 15 * u, hy + 6 * u], [hx + 15 * u, hy + 6 * u], [hx + 11 * u, hy - 9 * u], [hx - 11 * u, hy - 9 * u]]), "#1c1a22", 1.3 * u);
      p.ell(...Q(hx, hy - 1 * u), 7 * u, 4 * u, "#e8e2d4", 1 * u);
      p.dot(...Q(hx, hy - 1 * u), 1.6 * u, "#1c1a22");
      p.stroke(R([[hx - 10 * u, hy - 8 * u], [hx + 6 * u, hy - 8.5 * u]]), 1 * u, "#5a5a6a");
      p.dot(hx, hy + 6 * u, 5.4 * u);
      if (n > 0.05) { // the receiver DROPPED: it dangles below the base on its coiled cord, swinging (angle n - 1 rad)
        const a0 = n - 1, A0: P2 = [hx - 12 * u, hy + 2 * u], E: P2 = [A0[0] + Math.sin(a0) * 46 * u, A0[1] + Math.cos(a0) * 46 * u];
        const cord: P2[] = [];
        for (let i = 0; i <= 40; i++) { const t = i / 40, c = lerp2(A0, E, t), w2 = Math.PI * 14 * t; cord.push([c[0] + 2.6 * u * Math.cos(w2) * Math.cos(a0), c[1] - 2.6 * u * Math.cos(w2) * Math.sin(a0) + 1.6 * u * Math.sin(w2)]); }
        p.stroke(cord, 1.3 * u, "#1c1a22");
        const r2 = (pts: P2[]) => rotPts(pts, -a0 + Math.PI / 2, E[0], E[1]);
        p.band(r2([[E[0] - 13 * u, E[1]], [E[0] + 13 * u, E[1]]]), "#1c1a22", 6 * u, 1 * u, "round");
        for (const s2 of [-1, 1]) { const q2 = r2([[E[0] + s2 * 13 * u, E[1] + 2 * u]])[0]; p.ell(q2[0], q2[1], 6.6 * u, 5 * u, "#1c1a22", 1.2 * u); }
      }
      break;
    }
    case "thermos": { // a tartan thermos cup (steam curl, n = phase)
      p.poly(R(rrect(hx - 6 * u, hy - 14 * u, hx + 6 * u, hy + 3 * u, 1.2 * u)), "#c8452c", 1.3 * u);
      p.stroke(R([[hx - 6 * u, hy - 8 * u], [hx + 6 * u, hy - 8 * u]]), 1.2 * u, "#2a5a3a"); p.stroke(R([[hx - 2 * u, hy - 14 * u], [hx - 2 * u, hy + 3 * u]]), 1 * u, "#2a5a3a");
      const st: P2[] = []; for (let i = 0; i <= 8; i++) { const t = i / 8; st.push([hx + 2.4 * u * Math.sin(n * 0.3 + t * 5), hy - 17 * u - 15 * u * t]); }
      const g = p.g; g.save(); g.globalAlpha = 0.5; p.stroke(R(st), 1.6 * u, "#ffffff"); g.restore();
      p.dot(hx, hy, 5.6 * u);
      break;
    }
    case "briefcase": { // a brown leather briefcase hanging from the fist
      p.poly(R(rrect(hx - 17 * u, hy + 4 * u, hx + 17 * u, hy + 27 * u, 2.4 * u)), "#6a3e22", 1.5 * u);
      p.stroke(R([[hx - 17 * u, hy + 11 * u], [hx + 17 * u, hy + 11 * u]]), 1.1 * u, "#4a2a16");
      for (const s of [-1, 1]) p.poly(R(rrect(hx + s * 9 * u - 2 * u, hy + 9.5 * u, hx + s * 9 * u + 2 * u, hy + 13 * u, 0.6 * u)), "#e0b040", 0.7 * u);
      p.arc(...Q(hx, hy + 3 * u), 6 * u, 5 * u, 180, 360, 2 * u, "#4a2a16");
      p.dot(hx, hy, 5.6 * u);
      break;
    }
    case "rag": { // a red shop rag wiping (n = flap)
      p.poly(R([[hx - 6 * u, hy - 4 * u], [hx + 8 * u, hy - 6 * u + n * 2 * u], [hx + 10 * u, hy + 14 * u], [hx - 4 * u, hy + 16 * u + n * 2 * u]]), "#c84a3a", 1.2 * u);
      p.dot(hx, hy, 5.6 * u);
      break;
    }
    case "handbag": { // a small handbag clutched at the chest
      p.arc(...Q(hx, hy - 2 * u), 7 * u, 7 * u, 180, 360, 1.8 * u, "#5a2a2a");
      p.poly(R(rrect(hx - 11 * u, hy - 2 * u, hx + 11 * u, hy + 13 * u, 3 * u)), "#7a3a3a", 1.4 * u);
      p.dot(...Q(hx, hy + 1.5 * u), 1.6 * u, "#e0b040");
      p.dot(hx, hy, 5.4 * u);
      break;
    }
  }
  void light;
};

// ---------------- the rig (geometry shared by drawing and by cast.ts, which needs hand positions) ----------------
export type Target = "hang" | "hip" | "mouth" | "chin" | "head" | "pocket" | "chest" | "chestPocket" | "waist" | "reach" | "ground"
  | "eye" | "up" | "point" | "board" | "show" | "behind" | "lap" | "strap" | "whisper" | "temple" | "raise" | "selfie" | "thumb" | "hipPocket"
  | "ear" | "shout";
/** hand drawing: ball (default), open mitten (whisper), thumbs-up, 1-3 raised fingers (counting), open palm */
export type HandShape = "ball" | "mitten" | "thumb" | "f1" | "f2" | "f3" | "palm";
/** a hand: a named target (or a design point in FINAL canvas units), optionally blended toward b by k, offset in u.
 *  split: draw the arm behind the body and only the hand in front (whisper hand beside the face). n = prop state */
export type Hand = { a: Target | P2; b?: Target | P2; k?: number; dx?: number; dy?: number; hold?: Hold; ang?: number; front?: boolean; bend?: number;
  shape?: HandShape; split?: boolean; n?: number;
  /** do not draw this arm on the body card (cast.ts draws it on its own card, reaching across a desk) */
  hide?: boolean;
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
  /** hat brim / coat-tail flutter (-1..1, a fast wave on top of the slow wind) */
  flutter?: number;
  /** the hat pops up off the head (design units) */
  hatLift?: number;
  /** A3: a continuous crouch 0..1 (stand mode): hips drop, knees bend out (legs ~35 % shorter), torso tips 8 deg
   *  toward `facing`; negative = a small rise (anticipation / overshoot) */
  crouch?: number;
  /** A3: lower-body plum shade 0..1 (backlit sunset figure / ground separation) */
  lowShade?: number;
  /** the measuring-tape reel (outfit.reel): which hip it hangs on, its crank angle (rad), and the hand the tape runs up to */
  reelSide?: -1 | 1; reelSpin?: number; tapeHand?: 0 | 1;
  /** lip flaps are the big SHOUT shapes (the tank man's "Ninety percent full!") */
  yell?: boolean;
  /** fix r1: hide the belt reel (he holds it in his hand: the world draws it), a banknote tucked behind the ear, the
   *  pencil behind the ear on / off (overrides outfit.pencil), a sweat drop on the brow (0..1 scale), the umbrella's
   *  canopy tilt (deg, + = toward screen right) */
  noReel?: boolean; earNote?: boolean; earPencil?: boolean; sweat?: number; umbTilt?: number;
  /** fix r3: a banknote tucked into the breast pocket (40 % of it sticking up, angled 15 deg); a 2nd sweat drop (0..1);
   *  a gulp (0..1: the chin dips, a throat bob line) */
  pocketNote?: boolean; sweat2?: number; gulp?: number;
  /** fix r1: rain ticks bounce off the umbrella canopy (a video-frame phase; -1 = none) */
  rain?: number;
  /** fix r2: kneel mode blend 0 (standing) .. 1 (one knee down; > 1 = a deeper dip / anticipation), so kneeling down and
   *  standing up take real frames instead of a 1-frame pose pop */
  kneelK?: number;
  /** fix r2: clip the whole card below this design y (a figure seen over a rim: nothing below the belt is drawn) */
  cutY?: number;
  /** fix r2: the tape reel rides hand reelHand (reelK 0) and swings to its hip clip (reelK 1) */
  reelHand?: 0 | 1; reelK?: number;
  /** fix r2: the umbrella blows inside out (0 .. 1) */
  umbInv?: number;
};
const FRONT_T: Partial<Record<Target, boolean>> = { mouth: true, chin: true, head: true, pocket: true, hipPocket: true, chest: true, chestPocket: true,
  waist: true, eye: true, hip: true, show: true, lap: true, strap: true, whisper: true, temple: true, selfie: true, thumb: true, ear: true, shout: true };

export type Rig = ReturnType<typeof rig>;
export const rig = (o: Outfit, opts: PersonOpts) => {
  const { mode = "stand", phase = 0, tilt = 0, headTilt = 0, nod = 0, breath = 0, squash = 0, facing = 0, seed = 1, view = "front" } = opts;
  const Bd = BUILD[o.build ?? "adult"], two = Math.PI * 2;
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, legLen = Bd.legs * HH;
  // walk: the body dips on each footfall (bob ~3 % of the height peak to peak)
  const bob = mode === "walk" ? 0.1 * HH * (opts.lift ?? 1) * (0.5 + 0.5 * Math.cos(2 * two * phase)) : 0;
  let hipY = sole - legLen + 0.12 * HH + bob;
  const ck = mode === "stand" ? clamp(opts.crouch ?? 0, -0.2, 1) : 0;
  const kk = mode === "kneel" ? clamp(opts.kneelK ?? 1, -0.2, 1.15) : 0;
  if (mode === "kneel") hipY += kk * (sole - 0.33 * legLen - hipY); // A4: a real kneel (torso ~25 % lower than standing); fix r2: blended
  else if (mode === "squat") hipY = sole - 0.36 * legLen;
  else if (mode === "chair") hipY = sole - 0.47 / 0.00216; // sitting ON the 0.42 m seats
  else if (ck > 0) hipY += ck * ((sole - 0.4 * legLen) - hipY); // continuous crouch toward a squat (legs ~35 % shorter at 0.6)
  else if (ck < 0) hipY += ck * 0.4 * HH;                      // a small rise (anticipation / overshoot: -0.2 = +2 % height)
  hipY += squash * 0.06 * HH;
  const torsoBot = hipY + 0.12 * HH;
  const hunch = mode === "kneel" ? 1 - 0.16 * clamp(kk, 0, 1) : mode === "squat" ? 0.88 : 1 - 0.1 * Math.max(0, ck); // crouching bodies fold a little
  const th = Bd.torso * HH * hunch * (1 + 0.015 * breath) * (1 - 0.04 * squash);
  const chin = torsoBot - th, hc = chin - H.b + nod * 0.05 * HH, crown = hc - H.b;
  const rnd0 = o.build === "round"; // Tino: a rounder barrel torso (fuller belly)
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: rnd0 ? 2.0 : 2.2, nBot: rnd0 ? 2.1 : 2.6, egg: rnd0 ? 0.16 : 0.12,
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
      case "ear": return [300 + side * 1.0 * H.a, hc + 0.1 * H.b];             // a phone receiver held to the ear
      case "shout": return [300 + side * 1.14 * H.a, my + 0.12 * HH];          // a cupped hand beside the mouth (outside the head)
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
    if (h.b !== undefined) q = lerp2(q, res(h.b, side), clamp(h.k ?? 0, -0.25, 1.25));
    q = [q[0] + (h.dx ?? 0) * u, q[1] + (h.dy ?? 0) * u];
    { // rubber-hose arms stretch a little, never into canes: at most ~1.1 x a hanging arm
      const S0 = sh(side), dx = q[0] - S0[0], dy = q[1] - S0[1], l = Math.hypot(dx, dy), mx2 = (h.maxLen ?? 1.12) * HH;
      if (l > mx2) q = [S0[0] + (dx * mx2) / l, S0[1] + (dy * mx2) / l];
    }
    const tg = h.b !== undefined && (h.k ?? 0) > 0.5 ? h.b : h.a; // the dominant target decides front / behind
    let front = h.front ?? (typeof tg === "string" ? !!FRONT_T[tg] : true);
    if (back) front = !front && (typeof tg === "string" && (tg === "up" || tg === "board" || tg === "point" || tg === "head" || tg === "raise" || tg === "temple"));
    if (h.over) front = true;
    return { side, S: sh(side), H: q, front, hold: h.hold ?? null, ang: h.ang ?? 0, bend: h.bend ?? 1, shape: h.shape ?? "ball", split: !!h.split, n: h.n ?? 0, hide: !!h.hide,
      whisper: tg === "whisper", sz: h.sz ?? (tg === "whisper" ? 0.4 : 0.2) };
  });
  /** body-space point -> final canvas (design) point */
  const fin = (q: P2): P2 => rotAbout(q, rad(A), [300, hipY]);
  return { Bd, H, W, HH, u, sole, legLen, hipY, torsoBot, chin, hc, crown, T, tcx, tcy, A, headTilt, sh, hands, fin, mx, my, back, mode, phase, ck, kk };
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
/** open-hand / thumbs-up fill (dark plum, a paler knuckle line), shared by every hand so a frame has one hand style */
const HAND = "#3a2836", HAND_L = "#8a7590";
/** an umbrella over a figure (drawn BEHIND the head): a black canopy with scalloped rib tips, ribs and a sheen, on a
 *  shaft that rises from the hand (hx, hy) to the canopy at y = top; bob = a small rain bob (design units) */
const umbrellaBehind = (p: Pen, hx: number, hy: number, top: number, u: number, light: number, bob: number, tilt = 0, headX = 300, rain = -1, inv = 0) => {
  // fix r1: a REAL umbrella: the canopy ~2.3 head widths across (~1 m), its rim ~0.1 head heights over the hat, centred
  // over the head, tilted into the wind; an inked shaft from the fist up to the canopy's centre (it reads as held)
  // fix r2: inv 0..1 blows it inside out (the dome flips up into a cup)
  const rx = 115 * u, ry = 46 * u, cx = Math.abs(hx - headX) > 100 ? 0.82 * hx + 0.18 * headX : 0.35 * hx + 0.65 * headX, cy = top + bob - 30 * u * inv, a = rad(tilt), fy = 1 - 2 * clamp(inv, 0, 1);
  const Rt = (pts: P2[]) => rotPts(pts.map(([x, y]) => [x, cy + (y - cy) * fy] as P2), a, cx, cy);
  const tipU = Rt([[cx, cy - 2 * u]])[0];
  p.band([[hx, hy], tipU], "#2c2830", 3.2 * u, 1.1 * u, "round");
  const dome: P2[] = [];
  for (let i = 0; i <= 28; i++) { const t = Math.PI + (Math.PI * i) / 28; dome.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); }
  for (let k = 0; k < 8; k++) { const xa = cx + rx - (2 * rx * k) / 8, xb = xa - (2 * rx) / 8; dome.push(...curve([xa, cy], [(xa + xb) / 2, cy - 7 * u], [xb, cy], 6).slice(1)); }
  const D = Rt(dome);
  p.gradFill(D, "#3a4256", "#151821", light, 0.3);
  p.clip(D, () => {
    p.stroke(Rt(curve([cx - 0.78 * rx, cy - 0.2 * ry], [cx - 0.58 * rx, cy - 0.82 * ry], [cx - 0.1 * rx, cy - 0.98 * ry], 12)), 4.4 * u, "#7684a2");
    p.stroke(Rt(curve([cx - 0.5 * rx, cy - 0.15 * ry], [cx - 0.36 * rx, cy - 0.62 * ry], [cx - 0.04 * rx, cy - 0.8 * ry], 10)), 1.6 * u, "#9aa6c2");
  });
  for (let k = 1; k < 8; k++) { const xk = cx + rx - (2 * rx * k) / 8; p.stroke(Rt(curve([cx, cy - ry], [cx + (xk - cx) * 0.62, cy - ry * 0.72], [xk, cy], 6)), 1.3 * u, "#505a72"); }
  p.poly(D, null, 2.8 * u);
  for (let k = 0; k <= 8; k++) { const q = Rt([[cx + rx - (2 * rx * k) / 8, cy + 1 * u]])[0]; p.dot(q[0], q[1], 1.8 * u, "#2c2830"); } // rib tips
  p.band([Rt([[cx, cy - ry]])[0], Rt([[cx, cy - ry - 10 * u]])[0]], "#2c2830", 2.6 * u, 0.9 * u, "round");
  if (rain >= 0) for (let k = 0; k < 3; k++) { // rain ticks bouncing off the canopy (a new set every 8 f)
    const ph = Math.floor(rain / 8) * 3 + k, a = Math.PI + Math.PI * (0.15 + 0.7 * rnd(ph, 3)), t = (rain % 8) / 8;
    const bx = cx + rx * 0.92 * Math.cos(a), by2 = cy + ry * 0.92 * Math.sin(a) - 6 * u * t, q2 = Rt([[bx, by2]])[0];
    p.stroke([[q2[0] - 3 * u, q2[1] - 2 * u - 4 * u * t], [q2[0] - 5 * u, q2[1] - 8 * u - 6 * u * t]], 1.6 * u, "#eef4ff");
    p.stroke([[q2[0] + 3 * u, q2[1] - 2 * u - 4 * u * t], [q2[0] + 5 * u, q2[1] - 8 * u - 6 * u * t]], 1.6 * u, "#eef4ff");
  }
};
/** Tino's gold oil-can lapel pin (s = size unit): a little can with a spout, a handle, a glint and one amber drop */
const pinOilcan = (p: Pen, x: number, y: number, s: number) => {
  const gold = "#f4c234", gd = "#b8861a";
  p.arc(x - 5.6 * s, y + 1.5 * s, 3 * s, 3.8 * s, 90, 270, 1.6 * s, gd);
  p.band([[x + 3.5 * s, y - 1 * s], [x + 10 * s, y - 7.5 * s]], gold, 2.2 * s, 0.7 * s, "round");
  p.poly(rrect(x - 5 * s, y - 3.5 * s, x + 5 * s, y + 6 * s, 1.5 * s), gold, 0.9 * s);
  p.ell(x, y - 3.5 * s, 5 * s, 2.2 * s, mix(gold, "#ffffff", 0.25), 0.9 * s, 180, 360);
  p.stroke([[x - 3 * s, y - 1 * s], [x - 3 * s, y + 4 * s]], 1.1 * s, "#fff6c8");
  p.poly([[x + 10.6 * s, y - 6 * s], [x + 12 * s, y - 3 * s], [x + 10.6 * s, y - 2 * s], [x + 9.4 * s, y - 3 * s]], "#e8961e", 0.6 * s);
};
/** dashed stitching between two points (overalls, pockets) */
const stitch = (p: Pen, a: P2, b: P2, u: number, col = "#e0943a") => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.floor(L / (3.2 * u)));
  for (let k = 0; k < n; k += 2) p.stroke([lerp2(a, b, k / n), lerp2(a, b, Math.min(1, (k + 1) / n))], 0.8 * u, col);
};

export const drawPerson = (p: Pen, o: Outfit, opts: PersonOpts) => {
  const R = rig(o, opts);
  const { expr = "neutral", look = 0, lookY = 0, blink = 0, talk = -1, wind = 0, light = DEF_LIGHT, facing = 0 } = opts;
  const { H, W, HH, u, sole, hipY, torsoBot, chin, hc, T, tcx, tcy, A, back, mode, phase } = R;
  const skin = o.skin ?? SKIN, two = Math.PI * 2, thick = thickAngle(light), ow = OW * u;
  // rubber-hose limbs: dark strokes tinted by the clothes (never pale tubes that read as canes)
  const legCol = mix(o.pants, INK, 0.62), armCol = o.dress ? mix(o.shirt, INK, 0.82) : mix(o.cardigan ?? o.shirt, INK, 0.88);
  const legW = 5.4 * u, footW = 7.2 * u, shoe = o.shoes;
  p.rot = null;
  // fix r2: a figure seen over a rim: nothing of the card below cutY is drawn (restored at the end)
  const cutY = opts.cutY;
  if (cutY !== undefined) { p.g.save(); p.g.beginPath(); p.g.rect(-3000, -3000, 6600, cutY + 3000); p.g.clip(); }
  // ---- legs + feet (not rotated) ----
  const hx = (s: number) => 300 + s * 14 * u;
  if (mode === "kneel") {
    // one knee down: thigh to the knee on the ground, shin flat behind it, sole turned up; the other foot planted with
    // its knee up toward `facing`. fix r2: blended from a standing pair of legs by kneelK (no 1-frame pose pop)
    const s = facing || 1, kx = hx(-s) - s * 2 * u, k = clamp(R.kk, 0, 1), L2 = lerp2;
    const bk = L2([hx(-s) - s * 1.5 * u, (hipY + sole) / 2], [kx, sole - 6 * u], k), bf = L2([300 - s * 21 * u, sole - 4 * u], [kx - s * 26 * u, sole - 6 * u], k);
    p.stroke(curve([hx(-s), hipY], [hx(-s) - s * 3 * u * k, (hipY + bk[1]) / 2], bk).concat([bf]), legW, legCol);
    footStroke(p, bf, L2([300 - s * 33 * u, sole - 3.5 * u], [kx - s * 30 * u, sole - 15 * u], k), footW, shoe);
    const kn = L2([hx(s) + s * 3 * u, (hipY + sole) / 2], [hx(s) + s * 46 * u, hipY - 0.1 * HH], k), ff = L2([300 + s * 21 * u, sole - 4 * u], [hx(s) + s * 38 * u, sole - 5 * u], k);
    p.stroke([[hx(s), hipY], kn, ff], legW, legCol);
    footStroke(p, L2([300 + s * 18 * u, sole - 4 * u], [hx(s) + s * 35 * u, sole - 4 * u], k), L2([300 + s * 33 * u, sole - 3.5 * u], [hx(s) + s * 49 * u, sole - 3 * u], k), footW, shoe);
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
  // an umbrella held over the head: canopy + shaft BEHIND the body and the head (the fist grips the crook in front)
  for (const h of R.hands) if (h.hold === "umbrella" && !h.hide) umbrellaBehind(p, h.H[0], h.H[1], R.crown - (o.hat ? 0.3 : 0.18) * HH, u, light, h.n, opts.umbTilt ?? 0, 300, opts.rain ?? -1, opts.umbInv ?? 0);
  const tp = blobPts(tcx, tcy, T);
  type HR = (typeof R.hands)[number];
  const drawArm = (h: HR, part: "all" | "arm" | "hand" = "all") => {
    if (h.hide) return;
    const S = h.S, Hd = h.H, dx = Hd[0] - S[0], dy = Hd[1] - S[1], l = Math.hypot(dx, dy) || 1;
    if (part !== "hand") {
      if (h.whisper) {
        const E: P2 = [S[0] + h.side * 1.0 * T.a, S[1] + 0.22 * HH];
        p.stroke(curve(S, [S[0] + h.side * 0.62 * T.a, S[1] + 0.17 * HH], E, 6).concat(curve(E, [E[0] + h.side * 5 * u, (E[1] + Hd[1]) / 2], Hd, 8)), 5.2 * u, armCol);
      } else {
        // elbow: bulge outward (away from the body centre), more when the arm is bent short
        const bulge = (0.16 + 0.22 * clamp(1 - l / (1.05 * HH), 0, 1)) * l * h.bend;
        let nx = -dy / l, ny = dx / l; if (nx * h.side < 0) { nx = -nx; ny = -ny; }
        const E: P2 = [(S[0] + Hd[0]) / 2 + nx * bulge, (S[1] + Hd[1]) / 2 + ny * bulge];
        const arm = curve(S, E, Hd, 12);
        if (o.rolled) {
          // a rolled shirt sleeve: the dark forearm, then the shirt-colour upper arm over it with a folded cuff at the elbow
          p.stroke(arm.slice(4), 5.6 * u, armCol);
          p.band(arm.slice(0, 5), o.shirt, 8.5 * u, 1.3 * u, "round");
          const [ex, ey] = arm[4], [ax, ay] = arm[2], a2 = Math.atan2(ey - ay, ex - ax);
          p.band([[ex - Math.cos(a2) * 2.6 * u, ey - Math.sin(a2) * 2.6 * u], [ex + Math.cos(a2) * 1.6 * u, ey + Math.sin(a2) * 1.6 * u]], shade(o.shirt, 0.9), 11 * u, 1.1 * u);
          if (o.garters) { const [gx, gy] = arm[2], [bx2, by2] = arm[1], a3 = Math.atan2(gy - by2, gx - bx2); p.band([[gx - Math.cos(a3) * 1.4 * u, gy - Math.sin(a3) * 1.4 * u], [gx + Math.cos(a3) * 1.4 * u, gy + Math.sin(a3) * 1.4 * u]], o.garters, 10 * u, 0.9 * u); }
        } else p.stroke(arm, 5.6 * u, armCol);
      }
    }
    if (part === "arm") return;
    const sh0 = h.shape, sd = h.side;
    if (sh0 === "mitten" || sh0 === "palm") {
      // an open hand: a dark MITTEN PADDLE rising from the wrist (fingers up), a thumb on the body side, two finger-split
      // lines; "palm" adds a crease. Size h.sz head heights
      const hh2 = h.sz * HH, ww = 0.58 * hh2, a = rad(sd * 10 + h.ang), z = hh2 / (0.2 * HH);
      const R2 = (pts: P2[]) => rotPts(pts, a, Hd[0], Hd[1]);
      const pad = R2(rrect(Hd[0] - ww / 2, Hd[1] - hh2, Hd[0] + ww / 2, Hd[1] + 0.08 * hh2, ww * 0.42, 6));
      const th2 = R2(ellPts(Hd[0] - sd * ww * 0.52, Hd[1] - 0.32 * hh2, ww * 0.2, hh2 * 0.24, 0, 360, -sd * 28, 20));
      p.poly(th2, HAND, 1.5 * u * Math.sqrt(z));
      p.poly(pad, HAND, 1.6 * u * Math.sqrt(z));
      p.g.save(); p.g.globalAlpha = 0.6; p.clip(pad, () => p.shadedFill(pad, "rgba(0,0,0,0)", "rgba(150,130,170,0.55)", light + Math.PI, ww * 0.6, 0.35)); p.g.restore();
      for (const k of [-1, 1]) p.stroke(R2([[Hd[0] + k * ww * 0.17, Hd[1] - hh2 * 0.98], [Hd[0] + k * ww * 0.15, Hd[1] - hh2 * 0.68]]), 1.1 * u * Math.sqrt(z), HAND_L);
      if (sh0 === "palm") p.arc(...R2([[Hd[0], Hd[1] - 0.22 * hh2]])[0], ww * 0.28, hh2 * 0.1, 20, 160, 1 * u, HAND_L);
      return;
    }
    if (sh0 === "thumb") {
      // a BIG readable thumbs-up: the thumb straight up out of a fist, the knuckles toward the lens
      const z = h.sz / 0.2, v = u * z;
      p.band([[Hd[0] - sd * 1.5 * v, Hd[1] - 3 * v], [Hd[0] - sd * 2.2 * v, Hd[1] - 17 * v]], HAND, 5 * v, 1.4 * u, "round");
      p.ell(Hd[0], Hd[1], 8 * v, 7 * v, HAND, 1.5 * u);
      for (const k of [-1, 0, 1]) p.stroke([[Hd[0] + sd * 1.5 * v, Hd[1] + k * 2.8 * v], [Hd[0] + sd * 6 * v, Hd[1] + k * 2.8 * v]], 1 * u, HAND_L);
      p.stroke([[Hd[0] - sd * 3.2 * v, Hd[1] - 14.5 * v], [Hd[0] - sd * 2.9 * v, Hd[1] - 9 * v]], 1 * u, HAND_L);
      return;
    }
    p.dot(Hd[0], Hd[1], 5.4 * u);
    if (sh0 === "f1" || sh0 === "f2" || sh0 === "f3") {
      const n = +sh0[1];
      for (let k = 0; k < n; k++) { const x = Hd[0] + (k - (n - 1) / 2) * 3.6 * u; p.band([[x, Hd[1] - 3 * u], [x + (k - (n - 1) / 2) * 1 * u, Hd[1] - 12.5 * u]], INK, 2.8 * u, 0, "round"); }
    }
  };
  const props = (h: HR) => { if (h.hold && !h.hide && !(back && !h.front)) holdProp(p, h.hold, h.H[0], h.H[1], u, h.ang, h.side, light, h.n); };
  for (const h of R.hands) if (!h.front || h.split) { drawArm(h, h.split ? "arm" : "all"); if (!back && !h.split) props(h); }
  // ---- torso / dress ----
  const waist = torsoBot - 0.3 * HH;
  let body = tp;
  if (!o.dress && wind && mode !== "chair") { // a loose hem / jacket skirt flutters in the wind (the lower third sways, rippling)
    body = tp.map(([x, y]) => { const k = clamp((y - (tcy + 0.35 * T.b)) / (0.65 * T.b), 0, 1); return [x + wind * 3.2 * u * k + k * 0.9 * u * Math.sin(x * 0.08 + wind * 3), y] as P2; });
  }
  let hem: P2[] = [], dressK = { fl: 0, wR: 0, hemY: 0 };
  if (o.dress) {
    const top = keepRun(tp, ([, y]) => y < waist);
    const ft = opts.flutter ?? 0, hemY = hipY + (mode === "chair" ? 0.25 : mode === "kneel" || mode === "squat" ? 0.4 : 0.62) * HH, fl = (wind * 7 + ft * 3.6) * u;
    const wR = (1.28 + 0.025 * ft) * T.a, skirt: P2[] = [];
    skirt.push([tcx + 0.92 * T.a, waist], [tcx + wR + fl, hemY - 3 * u]);
    for (let i = 0; i <= 12; i++) { const t = i / 12; skirt.push([tcx + wR + fl - 2 * wR * t + fl * 0.4 * Math.sin(Math.PI * t), hemY + (3.2 + 2.2 * Math.abs(ft)) * u * Math.sin(t * Math.PI * 4 + wind * 2 + ft * 3)]); }
    hem = skirt.slice(2, 15);
    skirt.push([tcx - wR + fl, hemY - 3 * u], [tcx - 0.92 * T.a, waist]);
    body = [...top, ...skirt];
    dressK = { fl, wR, hemY };
  }
  // the V of the shirt under a suit / work jacket (front)
  const suit = o.suit, dbl = !!suit?.double, jacket = !!suit || !!o.workJacket;
  const vb = chin + (suit ? (dbl ? 0.36 : 0.45) : 0.27) * HH, vx = tcx + (dbl ? 0.1 * T.a : 0);
  const shirtV: P2[] = [[tcx - 0.36 * T.a, chin - 0.08 * HH], [tcx + 0.36 * T.a, chin - 0.08 * HH], [vx, vb]];
  p.gradFill(body, o.shirt, mul(o.shirt, SH_CLOTH), light);
  p.clip(body, () => {
    if (o.print === "plaid") {
      for (let k = -4; k <= 4; k++) { p.stroke([[tcx + k * 14 * u, chin - 10 * u], [tcx + k * 14 * u, torsoBot + 10 * u]], 2 * u, shade(o.shirt, 0.82)); p.stroke([[tcx - 80 * u, chin + 0.1 * HH + k * 14 * u], [tcx + 80 * u, chin + 0.1 * HH + k * 14 * u]], 2 * u, shade(o.shirt, 0.82)); }
    }
    if (suit?.stripe) for (let k = -14; k <= 14; k++) p.stroke([[tcx + k * 6.4 * u, chin - 0.12 * HH], [tcx + k * 6.4 * u, torsoBot + 0.12 * HH]], 0.75 * u, suit.stripe);
    if (o.overalls) {
      // bib overalls: the trousers part from the waist down + the bib with straps, brass buttons, a pocket, orange
      // stitching (front); the straps cross in an X over the back (back view)
      const oc = o.overalls, oS = mul(oc, SH_CLOTH), wy = chin + 0.6 * HH;
      p.gradFill([[tcx - 2 * T.a, wy], [tcx + 2 * T.a, wy], [tcx + 2 * T.a, torsoBot + 0.4 * HH], [tcx - 2 * T.a, torsoBot + 0.4 * HH]], oc, oS, light);
      p.stroke([[tcx - 2 * T.a, wy], [tcx + 2 * T.a, wy]], 1.4 * u, shade(oc, 0.6));
      stitch(p, [tcx - 1.2 * T.a, wy + 2.6 * u], [tcx + 1.2 * T.a, wy + 2.6 * u], u);
      if (!back) {
        const bib = rrect(tcx - 0.52 * T.a, chin + 0.2 * HH, tcx + 0.52 * T.a, wy + 2 * u, 3 * u);
        p.gradFill(bib, oc, oS, light); p.poly(bib, null, 1.5 * u);
        stitch(p, [tcx - 0.46 * T.a, chin + 0.23 * HH], [tcx + 0.46 * T.a, chin + 0.23 * HH], u);
        for (const s of [-1, 1]) {
          p.band([[tcx + s * 0.43 * T.a, chin + 0.23 * HH], [tcx + s * 0.64 * T.a, chin - 0.06 * HH]], oc, 7 * u, 1.1 * u);
          stitch(p, [tcx + s * 0.4 * T.a, chin + 0.21 * HH], [tcx + s * 0.6 * T.a, chin - 0.05 * HH], u);
          p.ell(tcx + s * 0.43 * T.a, chin + 0.24 * HH, 3 * u, 3 * u, "#e2ac3c", 1 * u);
          p.dot(tcx + s * 0.43 * T.a - 0.8 * u, chin + 0.24 * HH - 0.8 * u, 0.9 * u, "#fff3c8");
          stitch(p, [tcx + s * 0.47 * T.a, chin + 0.27 * HH], [tcx + s * 0.47 * T.a, wy], u);
        }
        const pk = rrect(tcx - 14 * u, chin + 0.31 * HH, tcx + 14 * u, chin + 0.48 * HH, 2 * u);
        p.poly(pk, shade(oc, 0.92), 1.2 * u);
        stitch(p, [tcx - 12 * u, chin + 0.34 * HH], [tcx + 12 * u, chin + 0.34 * HH], u);
        p.band([[tcx + 6 * u, chin + 0.33 * HH], [tcx + 7 * u, chin + 0.25 * HH]], "#e8d9b0", 2.2 * u, 0.7 * u, "round"); // a pencil stub in the bib pocket
      } else {
        for (const s of [-1, 1]) p.band([[tcx + s * 0.64 * T.a, chin - 0.06 * HH], [tcx - s * 0.3 * T.a, wy + 2 * u]], oc, 7.5 * u, 1.1 * u);
        p.poly(rrect(tcx - 12 * u, wy + 5 * u, tcx + 12 * u, wy + 0.16 * HH, 2 * u), shade(oc, 0.92), 1.2 * u);
      }
    }
    if (o.apron && !back) { // a waiter's long white apron from the waist down + its tie string
      p.poly(rrect(tcx - 0.78 * T.a, chin + 0.56 * HH, tcx + 0.78 * T.a, torsoBot + 0.5 * HH, 3 * u), o.apron, 1.4 * u);
      p.stroke([[tcx - 1.2 * T.a, chin + 0.56 * HH], [tcx + 1.2 * T.a, chin + 0.56 * HH]], 2 * u, shade(o.apron, 0.8));
    }
    if (jacket && !back) p.poly(shirtV, o.workJacket ? "#d6e2ee" : "#f6f3ec", 0);
    if (o.workJacket && !back) {
      p.stroke([[tcx + 2 * u, vb], [tcx + 2 * u, torsoBot + 0.1 * HH]], 1.6 * u, shade(o.shirt, 0.62));
      for (const k of [0.12, 0.26, 0.4]) p.dot(tcx - 1.5 * u, vb + k * HH, 2.2 * u, shade(o.shirt, 0.55));
      for (const s of [-1, 1]) {
        const px = tcx + s * 0.52 * T.a, py = chin + 0.36 * HH;
        p.poly(rrect(px - 12 * u, py - 6 * u, px + 12 * u, py + 13 * u, 1.6 * u), shade(o.shirt, 0.95), 1.3 * u);
        p.poly([[px - 12.5 * u, py - 7 * u], [px + 12.5 * u, py - 7 * u], [px + 12 * u, py], [px, py + 2 * u], [px - 12 * u, py]], shade(o.shirt, 0.8), 1.3 * u);
        p.dot(px, py - 0.5 * u, 1.6 * u, shade(o.shirt, 0.5));
      }
    }
    if ((o.vest || o.cardigan) && !back) {
      const vc = (o.vest ?? o.cardigan)!, gap = o.vest ? 9 * u : 7 * u;
      for (const s of [-1, 1]) {
        const panel: P2[] = [[tcx + s * gap, chin + 0.36 * HH], [tcx + s * 0.36 * T.a, chin - 0.1 * HH], [tcx + s * 1.3 * T.a, chin - 0.1 * HH],
          [tcx + s * 1.3 * T.a, torsoBot + 0.2 * HH], [tcx + s * (gap - 1 * u), torsoBot + 0.2 * HH]];
        p.gradFill(panel, vc, mul(vc, SH_CLOTH), light);
        p.stroke([[tcx + s * gap, torsoBot + 0.2 * HH], [tcx + s * gap, chin + 0.36 * HH], [tcx + s * 0.36 * T.a, chin - 0.1 * HH]], 2.2 * u);
      }
      if (o.cardigan) for (let i = 0; i < 4; i++) p.dot(tcx + gap + 3.5 * u, chin + 0.45 * HH + i * 0.17 * HH, 2.2 * u, "#e9e2d2");
    } else if ((o.vest || o.cardigan) && back) { const vc = (o.vest ?? o.cardigan)!; p.gradFill(tp, vc, mul(vc, SH_CLOTH), light); }
    if (o.pocket && !back && !jacket && !o.overalls) { // a plain chest pocket with a flap + button
      const px = tcx - 0.45 * T.a, py = chin + 0.3 * HH;
      p.poly(rrect(px - 11 * u, py - 9 * u, px + 11 * u, py + 11 * u, 2 * u), shade(o.shirt, 0.86), 1.5 * u);
      p.poly([[px - 11.5 * u, py - 9 * u], [px + 11.5 * u, py - 9 * u], [px + 11 * u, py - 3 * u], [px, py - 1 * u], [px - 11 * u, py - 3 * u]], shade(o.shirt, 0.74), 1.4 * u);
    }
    if (o.sweater && !back) for (let k = -5; k <= 5; k++) p.stroke([[tcx + k * 6.5 * u, torsoBot - 0.1 * HH], [tcx + k * 6.5 * u, torsoBot + 2 * u]], 1.2 * u, shade(o.shirt, 0.78));
    if (o.dress) {
      // dress detail: a darker far side, 3 soft fold lines from the waist that swing with the wind, a belt
      const g = p.g, fs = Math.cos(light) <= 0 ? 1 : -1, { fl, wR, hemY } = dressK;
      const [ax, ay] = p.P(tcx + fs * 0.15 * wR, waist), [bx, by] = p.P(tcx + fs * 1.05 * wR, waist);
      const sg = g.createLinearGradient(ax, ay, bx, by); sg.addColorStop(0, "rgba(30,20,70,0)"); sg.addColorStop(1, "rgba(30,20,70,0.17)");
      g.save(); g.fillStyle = sg; p.path(body, true); g.fill(); g.restore();
      for (const [k, w2] of [[-0.55, 1.6], [0.05, 1.3], [0.55, 1.6]] as const) {
        const x0 = tcx + k * 0.75 * T.a, x1 = tcx + k * wR + fl * (0.7 + 0.3 * k);
        p.stroke(curve([x0, waist + 6 * u], [(x0 + x1) / 2 + fl * 0.3 + k * 3 * u, (waist + hemY) / 2], [x1, hemY - 5 * u], 8), w2 * u, shade(o.shirt, 0.8));
      }
      if (hem.length) p.stroke(hem.map(([x, y]) => [x, y - 4.6 * u] as P2), 1.6 * u, mix(o.shirt, "#ffffff", 0.5));
      p.band([[tcx - 1.4 * T.a, waist - 1 * u], [tcx + 1.4 * T.a, waist - 1 * u]], shade(o.shirt, 0.7), 4 * u, 1 * u);
    }
    if (o.braces) { // fix r1: suspender straps (front: two straps down to the waistband with clips; back: an X)
      const bc = o.braces, y0 = chin - 0.06 * HH, y1 = torsoBot + 0.05 * HH;
      if (!back) for (const s of [-1, 1]) { p.band([[tcx + s * 0.6 * T.a, y0], [tcx + s * 0.46 * T.a, y1]], bc, 4.6 * u, 0.9 * u); p.poly(rrect(tcx + s * 0.47 * T.a - 3 * u, y1 - 0.2 * HH, tcx + s * 0.47 * T.a + 3 * u, y1 - 0.2 * HH + 4 * u, 0.6 * u), "#c9ccd6", 0.7 * u); }
      else for (const s of [-1, 1]) p.band([[tcx + s * 0.62 * T.a, y0], [tcx - s * 0.5 * T.a, y1]], bc, 5 * u, 1 * u);
    }
    if (o.patch && back && o.overalls) { // fix r1: a plain cream back patch with the yard's name (text only, no logo)
      const py = chin + 0.36 * HH;
      p.poly(rrect(tcx - 19 * u, py - 6.5 * u, tcx + 19 * u, py + 6.5 * u, 3 * u), "#f2e8d0", 1.3 * u);
      p.text(o.patch, tcx, py + 0.5 * u, 7.4 * u, "#b8331f", "Arial Black");
    }
    if (opts.lowShade) { // lower-body plum shade (backlit figures / ground separation)
      const g = p.g, [ax, ay] = p.P(tcx, chin + 0.35 * HH), [bx, by] = p.P(tcx, torsoBot + 0.1 * HH);
      const lg = g.createLinearGradient(ax, ay, bx, by); lg.addColorStop(0, "rgba(60,25,70,0)"); lg.addColorStop(1, `rgba(60,25,70,${0.3 * opts.lowShade})`);
      g.save(); g.fillStyle = lg; p.path(body, true); g.fill(); g.restore();
    }
  });
  p.inkRing(body, ow, thick);
  if (opts.rim) rimLine(p, body, ow * 0.5, opts.rim, 2.6 * u * (opts.rimK ?? 1), tcy + 0.55 * T.b);
  // ---- on top of the torso: collar, tie, lapels, buttons, pin, badge, the tool belt + reel ----
  // fix r2 (A2): from behind, a shirt collar band at the neck (traders, suits): a back view reads as a person, not an egg
  if (back && (o.collar || jacket) && !o.overalls) {
    p.band(curve([tcx - 0.46 * T.a, chin - 0.01 * HH], [tcx, chin + 0.075 * HH], [tcx + 0.46 * T.a, chin - 0.01 * HH], 10), o.collarCol ?? "#f6f3ec", 6.5 * u, 1.3 * u);
  }
  if (!back) {
    if ((o.collar || jacket) && !o.workJacket) for (const s of [-1, 1]) p.poly([[tcx + s * 1 * u, chin + 0.07 * HH], [tcx + s * 19 * u, chin - 0.04 * HH], [tcx + s * 16 * u, chin + 0.17 * HH]], o.collarCol ?? "#f6f3ec", (o.collarCol ? 2.2 : 1.6) * u);
    if (o.workJacket) for (const s of [-1, 1]) p.poly([[tcx + s * 1 * u, chin + 0.07 * HH], [tcx + s * 16 * u, chin - 0.03 * HH], [tcx + s * 13 * u, chin + 0.13 * HH]], "#d6e2ee", 1.4 * u);
    if (o.tie) {
      const tw = o.tieDrops ? 1.45 : suit ? 1.1 : 0.72, tc = o.tie;
      const drawTie = () => {
        p.poly([[tcx - 5 * tw * u, chin + 0.02 * HH], [tcx + 5 * tw * u, chin + 0.02 * HH], [tcx + 3 * tw * u, chin + 0.1 * HH], [tcx - 3 * tw * u, chin + 0.1 * HH]], shade(tc, 0.92), 1.6 * u);
        // fix r1: the tie's tail flicks in the wind (the lower blade swings sideways with the gusts + flutter)
        const tf = jacket ? 0 : (wind * 3 + (opts.flutter ?? 0) * 2.2) * u, tf2 = jacket ? (wind * 1.4 + (opts.flutter ?? 0) * 1.2) * u : 0;
        const blade: P2[] = [[tcx - 3 * tw * u, chin + 0.1 * HH], [tcx + 3 * tw * u, chin + 0.1 * HH], [tcx + 7 * tw * u + 0.6 * (tf + tf2), chin + 0.62 * HH], [tcx + tf + tf2, chin + 0.72 * HH], [tcx - 7 * tw * u + 0.6 * (tf + tf2), chin + 0.62 * HH]];
        p.gradFill(blade, tc, mul(tc, [0.85, 0.82, 0.86]), light, 0.4); p.poly(blade, null, 1.6 * u);
        if (o.tieDrops) p.clip(blade, () => { // little oil drops (teardrops, pointy end up) in rows
          for (let k = 0; k < 6; k++) for (const s of k % 2 ? [-1, 1] : [0]) {
            const x = tcx + s * (2.4 + 0.35 * k) * tw * u, y = chin + (0.17 + 0.085 * k) * HH;
            p.poly([[x, y - 3 * u], [x + 1.9 * u, y + 0.4 * u], [x, y + 2 * u], [x - 1.9 * u, y + 0.4 * u]], o.tieDrops!, 0);
            p.dot(x, y + 0.3 * u, 1.9 * u, o.tieDrops!);
          }
        });
        else if (suit) for (let k = 0; k < 4; k++) p.stroke([[tcx - 5 * u, chin + (0.2 + 0.13 * k) * HH], [tcx + 5 * u, chin + (0.15 + 0.13 * k) * HH]], 1.6 * u, shade(tc, 0.7));
      };
      if (jacket) p.clip(shirtV, drawTie); else drawTie();
    }
    if (suit) {
      // notched lapels along the V, the double-breasted front edge, the buttons, a pocket square
      p.clip(body, () => {
        for (const s of [-1, 1]) {
          const lap: P2[] = [[tcx + s * 0.36 * T.a, chin - 0.08 * HH], [tcx + s * 0.72 * T.a, chin - 0.01 * HH], [tcx + s * 0.68 * T.a, chin + 0.09 * HH],
            [tcx + s * 0.55 * T.a, chin + 0.11 * HH], [tcx + s * 0.6 * T.a, chin + 0.17 * HH], [vx + s * 0.1 * T.a, vb + 0.01 * HH], [vx, vb]];
          p.poly(lap, mix(shade(o.shirt, 0.86), "#ffffff", 0.04), 1.6 * u);
          p.stroke([[tcx + s * 0.62 * T.a, chin + 0.04 * HH], [vx + s * 0.16 * T.a, vb - 0.04 * HH]], 0.9 * u, mix(o.shirt, "#ffffff", 0.3));
        }
        p.stroke([[vx, vb], [vx + (dbl ? 0.08 : 0) * T.a, torsoBot + 0.1 * HH]], 1.7 * u);
      });
      const bc = shade(o.shirt, 0.55), rows = dbl ? [0.07, 0.18, 0.29] : [0.08, 0.2];
      for (const r of rows) for (const bxx of dbl ? [tcx - 0.26 * T.a, tcx + 0.4 * T.a] : [vx + 4 * u]) {
        const by = vb + r * HH; if (by > torsoBot - 0.06 * HH) continue;
        p.ell(bxx, by, 2.8 * u, 2.8 * u, bc, 1 * u); p.dot(bxx - 0.8 * u, by - 0.8 * u, 0.8 * u, mix(bc, "#ffffff", 0.5));
      }
      if (suit.square) { // a pocket square (three peaks above the welt) on the screen-right chest
        const px = tcx + 0.56 * T.a, py = chin + 0.3 * HH;
        p.poly([[px - 10 * u, py], [px - 7 * u, py - 7 * u], [px - 3 * u, py - 2.5 * u], [px + 1 * u, py - 8 * u], [px + 4 * u, py - 2 * u], [px + 8 * u, py - 6 * u], [px + 10 * u, py]], suit.square, 1.2 * u);
        p.stroke([[px - 11 * u, py + 0.5 * u], [px + 11 * u, py + 0.5 * u]], 1.6 * u, shade(o.shirt, 0.6));
      }
      if (o.pin === "oilcan") pinOilcan(p, tcx - 0.52 * T.a, chin + 0.17 * HH, 0.95 * u); // fix r1: ~10 % of the head width
      if (o.penPocket) { // a fountain pen clipped in the breast pocket: a black cap with a gold clip over the welt
        const px = tcx + 0.56 * T.a, py = chin + 0.3 * HH;
        p.stroke([[px - 10 * u, py + 0.5 * u], [px + 10 * u, py + 0.5 * u]], 1.6 * u, shade(o.shirt, 0.6));
        p.poly(rrect(px - 2.4 * u, py - 11 * u, px + 2.4 * u, py + 1 * u, 1.2 * u), "#1a1620", 1 * u);
        p.band([[px + 0.4 * u, py - 9.5 * u], [px + 0.4 * u, py - 1 * u]], "#e8b830", 1 * u, 0.4 * u);
      }
      if (o.watchChain) { const pts = curve([tcx - 0.05 * T.a, chin + 0.56 * HH], [tcx + 0.3 * T.a, chin + 0.66 * HH], [tcx + 0.62 * T.a, chin + 0.58 * HH], 10);
        p.stroke(pts, 2.2 * u, "#7a5a10"); p.stroke(pts, 1.2 * u, "#f2c84a"); p.dot(tcx - 0.05 * T.a, chin + 0.56 * HH, 2 * u, "#f2c84a"); }
    }
    if (o.badge) { // a plain name badge (text only, no logo) clipped above the screen-left chest pocket
      const bx = tcx - 0.5 * T.a, by = chin + (o.workJacket ? 0.24 : 0.28) * HH;
      p.poly(rrect(bx - 16 * u, by - 5.5 * u, bx + 16 * u, by + 5.5 * u, 1.2 * u), "#f8f3e2", 1.3 * u);
      p.text(o.badge, bx, by + 0.4 * u, 5.4 * u, "#1f2c5a", "Arial Black");
      p.poly(rrect(bx - 3 * u, by - 8 * u, bx + 3 * u, by - 5 * u, 0.8 * u), "#c9ccd6", 0.9 * u);
    }
  }
  if (o.reel && !opts.noReel) {
    // the tool belt + the big measuring-tape reel clipped to it at the hip (reelSide), its crank turning (reelSpin);
    // tapeHand: the yellow tape runs from the reel up to that hand (it carries on in the world into the oil)
    const rs = opts.reelSide ?? -1, rr = 16 * u, by0 = chin + 0.6 * HH;
    // fix r2: the reel can ride a hand (reelK 0) and swing to its hip clip (reelK 1) with a little follow-through
    const rk = opts.reelHand !== undefined ? clamp(opts.reelK ?? 1, 0, 1.1) : 1, hipR: P2 = [tcx + rs * 0.98 * T.a, chin + 0.74 * HH];
    const inH: P2 = opts.reelHand !== undefined ? [R.hands[opts.reelHand].H[0], R.hands[opts.reelHand].H[1] + 10 * u] : hipR;
    const [rx, ry] = lerp2(inH, hipR, rk), sp = (opts.reelSpin ?? 0) + 0.6 * Math.sin(Math.PI * clamp(rk, 0, 1));
    p.clip(body, () => p.band([[tcx - 1.4 * T.a, by0], [tcx + 1.4 * T.a, by0 + 1 * u]], "#6a4428", 5 * u, 1 * u));
    if (!back) { p.poly(rrect(tcx - 5 * u, by0 - 4 * u, tcx + 5 * u, by0 + 4.5 * u, 1 * u), "#d8b04a", 1 * u); p.poly(rrect(tcx - 2.5 * u, by0 - 1.5 * u, tcx + 2.5 * u, by0 + 2 * u, 0.5 * u), "#6a4428", 0); }
    if (rk > 0.85) p.band([[hipR[0] - rs * 3 * u, by0], [rx, ry - rr + 2 * u]], "#4a3020", 4 * u, 0.9 * u);
    const disc = ellPts(rx, ry, rr, rr, 0, 360, 0, 32);
    p.gradFill(disc, o.reel, mul(o.reel, SH_CLOTH), light, 0.3); p.poly(disc, null, 1.8 * u);
    for (let k = 0; k < 4; k++) { const a = sp * 0.5 + (k * Math.PI) / 2 + 0.4; p.ell(rx + Math.cos(a) * 11.5 * u, ry + Math.sin(a) * 11.5 * u, 2.4 * u, 2.4 * u, shade(o.reel, 0.55), 0.7 * u); }
    p.ell(rx, ry, 8 * u, 8 * u, "#f2c230", 1 * u);
    p.ell(rx, ry, 5.5 * u, 5.5 * u, null, 0.7 * u, 0, 360, 0, "#b88a18");
    p.ell(rx, ry, 3.2 * u, 3.2 * u, "#9aa0ae", 0.9 * u);
    p.arc(rx, ry, rr - 2.4 * u, rr - 2.4 * u, 200, 290, 1.6 * u, mix(o.reel, "#ffffff", 0.45));
    const kx = rx + Math.cos(sp) * 10 * u, ky = ry + Math.sin(sp) * 10 * u;
    p.band([[rx, ry], [kx, ky]], "#c9ccd6", 2.2 * u, 0.7 * u, "round"); p.ell(kx, ky, 3.2 * u, 3.6 * u, "#8a5430", 0.9 * u);
    if (opts.tapeHand !== undefined && !back) {
      const h = R.hands[opts.tapeHand], e0: P2 = [rx - rs * 1 * u, ry - 9 * u];
      p.band([e0, h.H], "#f2c230", 2.8 * u, 0.8 * u);
    }
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + R.headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  const headRot = (extra: number): number[] | null => {
    if (!Ah && !extra) return null;
    const a1 = rad(Ah + extra), a0 = rad(Ah), c1y = hc - chin;
    const r = (x: number, y: number, a: number): P2 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const q1 = r(0, -c1y, a1), q0 = r(0, c1y, a0);
    return [a1, 300, chin, cpx - 300 + q1[0] + q0[0], cpy - chin + q1[1] + q0[1]];
  };
  p.rot = headRot(0);
  hairBehind(p, o, H, 300, hc, light, thick, ow, wind, back, opts.hairSwing ?? 0, facing);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  const hatted = !!o.hat;
  if (back && facing) {
    // back 3/4: the head turns toward `facing`: a thin lavender skin sliver with the cheek bulging past the skull, a brow
    // tick and a lash tick past the contour (they tilt up when the character looks up); glasses: the temple arm
    const sl = 0.19 * H.a, skinQ = mix(skin, "#b9a8d2", 0.32);
    p.clip(hp, () => { p.poly(hp, skinQ, 0); });
    p.clip(hp, () => hairOn(p, o, hp.map(([x, y]) => [x - facing * sl, y] as P2), H, 300 - facing * sl, hc, light, ow, back, hatted));
    const ly = clamp(lookY, -1.5, 1.5), cx0 = 300 + facing * 0.9 * H.a, cy0 = hc + 0.3 * H.b;
    const ck: P2[] = []; for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 2; ck.push([cx0 + 0.16 * H.a * Math.cos(a), cy0 + 0.26 * H.b * Math.sin(a)]); }
    p.poly(ck, skinQ, ow * 0.9);
    p.clip(hp, () => { p.poly(ck.map(([x, y]) => [x - facing * 0.04 * H.a, y] as P2), skinQ, 0); });
    p.inkRing(hp, ow, thick);
    { const ex = 300 + facing * 1.0 * H.a, ey = hc - 0.02 * H.b + ly * 2 * u, up = -ly * 4 * u + (opts.face?.browUp?.[1] ?? 0) * u, bc = opts.face?.browCol ?? INK;
      p.stroke([[ex - facing * 4 * u, ey - 10 * u], [ex + facing * 4.5 * u, ey - 12 * u - up]], 3.2 * u, bc);
      p.stroke([[ex - facing * 1 * u, ey], [ex + facing * 4 * u, ey - 1.5 * u - up * 0.6]], 2.4 * u, INK); }
    if (o.glasses) p.stroke([[300 + facing * 0.45 * H.a, hc - 4 * u], [300 + facing * 0.98 * H.a, hc - 2.5 * u]], 2.4 * u);
  } else hairOn(p, o, hp, H, 300, hc, light, ow, back, hatted);
  if (!back) {
    const capLike = o.hat === "cap" || o.hat === "flatcap";
    const X: FaceX = { ...(opts.face ?? {}) };
    if (o.hairStyle === "bowl" && !o.hat) { X.fdy = (X.fdy ?? 0) + 7; X.browGap = 13.5; }
    // brows that rise into a dark fringe keep a skin-coloured halo so they always act
    if (!o.hat && o.hairStyle && o.hairStyle !== "none" && o.hairStyle !== "bob") X.browHalo = skin;
    // fix r3 (A3 P2): slicked hair: the brow tops never rise past 3 % of the head height under the hairline (raised brows
    // inside black hair read as goggles pushed up on the head); the hairline at the brows sits ~5.5 u above the cut
    if (!o.hat && o.hairStyle === "slick") { const hl = ((0.19 + (o.fringeUp ?? 0)) * HH * 1.06) / u + 5.5; X.browMin = Math.max(X.browMin ?? -99, -(hl - 3)); }
    if (capLike) { X.browHalo = skin; X.browMin = X.browMin ?? -18.5; X.browGap = X.browGap ?? 14; }
    if (o.browCol) X.browCol = o.browCol;
    if (o.moustache) X.moustache = o.moustache;
    if (opts.yell) X.yell = true;
    faceFront(p, 300, hc, W, expr, facing, look, lookY, blink, capLike, skin, talk, o.glasses, X);
    // soft brim shadow across the forehead (lavender multiply), following the head
    const bs = opts.brimShade ?? (o.hat && o.hat !== "pillbox" ? 0.7 : 0);
    if (bs > 0) p.clip(hp, () => {
      const g = p.g, top = hc - (o.hat === "fedora" ? 0.66 : 0.58) * H.b, bot = hc - 0.24 * H.b;
      const [ax, ay] = p.P(300, top), [bx, by] = p.P(300, bot), gr = g.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, `rgba(160,142,208,${0.85 * bs})`); gr.addColorStop(0.5, `rgba(184,168,204,${0.6 * bs})`); gr.addColorStop(1, "rgba(184,168,204,0)");
      g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = gr;
      p.path(rrect(300 - 1.3 * H.a, top - 0.2 * H.b, 300 + 1.3 * H.a, bot, 1), true); g.fill(); g.restore();
    });
  }
  if (opts.pocketNote && !back) { // fix r3 (A3 P3): the banknote tucked into the breast pocket (screen right), 40 % sticking up
    const px = tcx + 0.5 * T.a, py = chin + 0.3 * HH, a = rad(15), R2 = (pts: P2[]) => rotPts(pts, a, px, py);
    p.poly(R2(rrect(px - 9 * u, py - 18 * u, px + 9 * u, py + 6 * u, 1 * u)), "#9cc48a", 1.4 * u);
    p.ell(...R2([[px, py - 10 * u]])[0], 3.2 * u, 3.2 * u, null, 1 * u, 0, 360, 0, "#4a7a3a");
    p.poly(rrect(px - 12 * u, py - 1 * u, px + 12 * u, py + 9 * u, 1 * u), shade(o.shirt, 0.9), 1.4 * u); // the pocket welt over it
  }
  if (opts.gulp && !back) { // fix r3: a gulp: a small throat-bob tick under the chin
    const k = clamp(opts.gulp, 0, 1); p.arc(300, hc + 1.02 * H.b + 2 * u * k, 5 * u, 3 * u * k, 20, 160, 1.6 * u, INK);
  }
  if (opts.sweat2 && !back) { // a second sweat drop on the far temple
    const sx = 300 + 0.66 * H.a, sy = hc - 0.3 * H.b, k = opts.sweat2;
    p.poly([[sx, sy - 11 * u * k], [sx + 5 * u * k, sy + 1 * u * k], [sx, sy + 5 * u * k], [sx - 5 * u * k, sy + 1 * u * k]], "#8fd0f0", 1.3 * u);
    p.dot(sx, sy + 0.6 * u * k, 4.8 * u * k, "#8fd0f0"); p.arc(sx - 1.4 * u * k, sy, 2.2 * u * k, 3 * u * k, 160, 250, 1.1 * u, "#ffffff");
  }
  if (opts.earNote && !back) { // fix r1: a banknote tucked behind the ear (shot 5)
    const s = -1, px = 300 + s * 0.98 * H.a, py = hc - 0.2 * H.b;
    const nt = rotPts(rrect(px - 16 * u, py - 7 * u, px + 16 * u, py + 7 * u, 1 * u), rad(-24 * s), px, py);
    p.poly(nt, "#9cc48a", 1.4 * u); p.ell(px, py, 4 * u, 4 * u, null, 1 * u, 0, 360, 0, "#4a7a3a");
  }
  if (opts.earPencil ?? o.pencil) { // a pencil tucked behind the ear
    const s = back ? -1 : 1, px = 300 + s * 0.92 * H.a, py = hc - 0.05 * H.b;
    p.poly(rotPts([[px - 3 * u, py - 22 * u], [px + 3 * u, py - 22 * u], [px + 3 * u, py + 12 * u], [px, py + 18 * u], [px - 3 * u, py + 12 * u]], rad(-30 * s), px, py), o.pencilCol ?? "#f2c230", 1.6 * u);
    p.poly(rotPts([[px - 3 * u, py - 22 * u], [px + 3 * u, py - 22 * u], [px + 3 * u, py - 17 * u], [px - 3 * u, py - 17 * u]], rad(-30 * s), px, py), "#e88a9a", 1.4 * u);
  }
  if (opts.sweat && !back) { // fix r1: a sweat drop on the brow (pops in at full size)
    const sx = 300 - 0.62 * H.a, sy = hc - 0.42 * H.b, k = opts.sweat;
    p.poly([[sx, sy - 13 * u * k], [sx + 6 * u * k, sy + 1 * u * k], [sx, sy + 6 * u * k], [sx - 6 * u * k, sy + 1 * u * k]].map(([x, y]) => [x, y] as P2), "#8fd0f0", 1.4 * u);
    p.dot(sx, sy + 0.6 * u * k, 5.6 * u * k, "#8fd0f0"); p.arc(sx - 1.6 * u * k, sy, 2.6 * u * k, 3.4 * u * k, 160, 250, 1.2 * u, "#ffffff");
  }
  if (opts.rim) rimLine(p, hp, ow * 0.55, opts.rim, 1.6 * u * (opts.rimK ?? 1), hc + 0.25 * H.b);
  if (opts.hatLag || opts.hatLift) { p.rot = headRot(opts.hatLag ?? 0.0001); if (opts.hatLift && p.rot) p.rot = [p.rot[0], p.rot[1], p.rot[2], p.rot[3] ?? 0, (p.rot[4] ?? 0) - opts.hatLift]; }
  hatOn(p, o, H, 300, hc, light, ow, wind + 0.35 * (opts.flutter ?? 0), back, facing, opts.flutter ?? 0);
  // ---- arms + props in front ----
  p.rot = A ? [rad(A), 300, hipY] : null;
  for (const h of R.hands) if (h.front || h.split) { drawArm(h, h.split ? "hand" : "all"); props(h); }
  p.rot = null;
  if (cutY !== undefined) p.g.restore();
};

/** a lone arm on its own card (cast.ts: an arm that reaches across a desk in front of the body card): the rubber-hose
 *  arm in the outfit's sleeve colour from S (shoulder) to Hd (hand) in this card's design units, the hand (ball or
 *  thumb) and a held prop; k = stroke scale (the arm card sits nearer the lens than the body: k = its distance / the
 *  body's), u = the owner's head unit */
export const drawLoneArm = (p: Pen, o: Outfit, S: P2, Hd: P2, side: number, u0: number, k: number, hand: { hold?: Hold; ang?: number; n?: number; bend?: number; elbow?: number; up?: number; thumb?: number; w?: number },
  light = DEF_LIGHT) => {
  const u = u0 * k, armCol = mix(o.cardigan ?? o.shirt, INK, 0.88), dx = Hd[0] - S[0], dy = Hd[1] - S[1], l = Math.hypot(dx, dy) || 1;
  const bulge = 0.2 * l * (hand.bend ?? 1);
  let nx = -dy / l, ny = dx / l; if (nx * side < 0) { nx = -nx; ny = -ny; }
  // fix r2 (A2): a real ELBOW (two straight segments joined at a bent joint, raised by `up` design units) instead of a hose
  const el = hand.elbow ?? 0;
  const E: P2 = el ? [(S[0] + Hd[0]) / 2 + nx * el * l, (S[1] + Hd[1]) / 2 + ny * el * l - (hand.up ?? 0) * u] : [(S[0] + Hd[0]) / 2 + nx * bulge, (S[1] + Hd[1]) / 2 + ny * bulge];
  const arm = el ? [...[0, 1, 2, 3, 4, 5].map((i) => lerp2(S, E, i / 6)), ...[0, 1, 2, 3, 4, 5, 6].map((i) => lerp2(E, Hd, i / 6))] : curve(S, E, Hd, 12);
  const n0 = parseInt(o.shirt.slice(1), 16), lum = (0.3 * ((n0 >> 16) & 255) + 0.59 * ((n0 >> 8) & 255) + 0.11 * (n0 & 255)) / 255;
  if (o.rolled) {
    p.stroke(arm.slice(4), 5.6 * u, armCol);
    p.band(arm.slice(0, 5), o.shirt, 8.5 * u, 1.3 * u, "round");
  } else if (lum > 0.55) {
    // fix r2 (A2): a pale shirt SLEEVE (a white band with an ink rim, ~8 % of the head width) to the wrist, so it reads as
    // an arm, never a cable
    p.band(arm.slice(0, 12), o.shirt, 8 * u, 1.3 * u, "round");
    p.stroke(arm.slice(1, 10).map(([x, y]) => [x - 1.6 * u, y - 1.6 * u] as P2), 1.3 * u, "#ffffff");
  } else {
    // a jacket sleeve: a tube in the jacket colour to just short of the wrist, a white shirt cuff, then the hand
    p.band(arm.slice(0, 11), o.shirt, 9.5 * u, 1.3 * u, "round");
    const [cx2, cy2] = arm[10], [ax, ay] = arm[9], a2 = Math.atan2(cy2 - ay, cx2 - ax);
    p.band([[cx2, cy2], [cx2 + Math.cos(a2) * 3 * u, cy2 + Math.sin(a2) * 3 * u]], "#f6f3ec", 7.5 * u, 1.1 * u, "round");
  }
  if (hand.thumb !== undefined) { // fix r3: a fist with the thumb jerked out along `thumb` (deg, 0 = up)
    const v = u * 1.9, R2 = (pts: P2[]) => rotPts(pts, rad(hand.thumb!), Hd[0], Hd[1]);
    p.band(R2([[Hd[0], Hd[1] - 3 * v], [Hd[0], Hd[1] - 15 * v]]), HAND, 5 * v, 1.4 * u, "round");
    p.ell(Hd[0], Hd[1], 7.5 * v, 6.5 * v, HAND, 1.5 * u);
    for (const kk of [-1, 0, 1]) p.stroke(R2([[Hd[0] + 2 * v, Hd[1] + kk * 2.6 * v], [Hd[0] + 6 * v, Hd[1] + kk * 2.6 * v]]), 1 * u, HAND_L);
    return;
  }
  p.dot(Hd[0], Hd[1], 5.6 * u);
  holdProp(p, hand.hold ?? null, Hd[0], Hd[1], u, hand.ang ?? 0, side, light, hand.n ?? 0);
};
/** the shoulder of arm i on the final canvas (design units) and the head unit u: cast.ts joins a lone arm card to it */
/** a body point on the final canvas: x in torso half-widths from the torso centre, y in head heights below the chin */
export const bodyAt = (o: Outfit, opts: PersonOpts, x: number, y: number): P2 => { const R = rig(o, opts); return R.fin([R.tcx + x * R.T.a, R.chin + y * R.HH]); };
/** the measuring-tape reel's crank knob on the final canvas (a hand turning the reel goes here) */
export const reelKnobAt = (o: Outfit, opts: PersonOpts): P2 => {
  const R = rig(o, opts), rs = opts.reelSide ?? -1, sp = opts.reelSpin ?? 0, rx = R.tcx + rs * 0.98 * R.T.a, ry = R.chin + 0.74 * R.HH;
  return R.fin([rx + Math.cos(sp) * 10 * R.u, ry + Math.sin(sp) * 10 * R.u]);
};
export const shoulderAt = (o: Outfit, opts: PersonOpts, i: 0 | 1): [number, number, number] => { const R = rig(o, opts); const [x, y] = R.fin(R.sh(i ? 1 : -1)); return [x, y, R.u]; };

/** backlight rim: a thin warm line just outside the upper part of a contour (points above yMax) */
const rimLine = (p: Pen, pts: P2[], off: number, col: string, w: number, yMax: number) => {
  const n = pts.length;
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x / n; cy += y / n; }
  const run = keepRun(pts, ([, y]) => y < yMax).map(([x, y]): P2 => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + (dx / l) * off, y + (dy / l) * off]; });
  if (run.length > 2) p.stroke(run, w, col);
};

// ---------------- shared effect helpers ----------------
export const star4 = (p: Pen, x: number, y: number, r: number, col = "#ffffff", ink = 0) => {
  const pts: P2[] = [];
  for (let k = 0; k < 8; k++) { const a = rad(k * 45 - 90), rr = k % 2 ? r * 0.2 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
  p.poly(pts, col, ink);
};
/** A4: a soft see-through contact shadow on a 128 x 128 canvas (rgb "r,g,b", peak alpha a): for unlit diagram floors */
export const fxSoftBlob = (p: Pen, rgb: string, a: number) => {
  const g = p.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.55, `rgba(${rgb},${0.75 * a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
/** sweat drop on a 128 x 192 canvas */
export const fxSweat = (p: Pen) => {
  const pts: P2[] = [[64, 14]];
  for (let i = 0; i <= 20; i++) { const a = rad(-20 + (220 * i) / 20); pts.push([64 + 44 * Math.cos(a), 124 + 44 * Math.sin(a)]); }
  p.poly(pts.map(([x, y]) => [x, y] as P2), "#8fd0f0", 9);
  p.arc(52, 120, 18, 26, 160, 250, 8, "#ffffff");
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

// ---------------- the wardrobe (one body colour + one signature item each; generic cartoons, NO likenesses, NO logos) ----------------
/** TINO (the main character): a round barrel of a man, slicked black hair, a double-breasted GREY suit, a GOLD tie with
 *  little oil drops, a gold pocket square and the gold oil-can lapel pin. Nobody else wears grey + gold. */
export const TINO_FIT: Outfit = { shirt: "#8a8f99", pants: "#6f737c", shoes: "#3a2418", hair: "#141018", hairStyle: "slick", fringeUp: 0.05, tie: "#e0a92a", tieDrops: "#8a5a0e",
  suit: { double: true, square: "#f2c230" }, pin: "oilcan", build: "round" };
/** TINO'S TANK MAN: denim bib overalls over a cream work shirt (sleeves rolled), a red cap, the weighted measuring tape
 *  on a big red-orange reel clipped to his tool belt */
export const TANKMAN_FIT: Outfit = { shirt: "#eadfc6", pants: "#2c4f80", overalls: "#3f6fa8", shoes: "#4a3020", hair: "#6a4020", hairStyle: "crop", hat: "cap", hatCol: "#c8452c",
  reel: "#b8472e", rolled: true, patch: "ALLIED" };
/** the INSPECTOR (no company mark, never named on screen): a khaki work jacket over a pale work shirt + dark tie, a
 *  tweed flat cap, a neat moustache, a plain "INSPECTOR" badge; he carries the clipboard (cast.ts: an effect card) */
export const INSP_FIT: Outfit = { shirt: "#b79a62", pants: "#5f5444", shoes: "#3a2a20", hair: "#5a4632", hairStyle: "crop", hat: "flatcap", hatCol: "#7a6440",
  workJacket: true, tie: "#33293a", badge: "INSPECTOR", moustache: "#6a5038" };
/** the BANKER: a navy pinstripe suit, round glasses, a red tie, grey hair; the rubber stamp is his signature prop */
export const BANKER_FIT: Outfit = { shirt: "#24345e", pants: "#1f2a4a", shoes: "#1a1416", hair: "#a2a2ac", hairStyle: "short", glasses: "round", tie: "#b02a30",
  suit: { stripe: "rgba(214,222,244,0.34)" }, fringeUp: 0.1, browCol: "#5a5a68", penPocket: true, watchChain: true };
/** the YOUNG INVESTOR (generic, NOT a likeness): horn-rimmed glasses, a crew cut, a white shirt, a thin dark tie */
export const INVESTOR_FIT: Outfit = { shirt: "#f4f2ec", pants: "#3a3d46", shoes: "#2a2226", hair: "#5a3f2a", hairStyle: "crew", glasses: "horn", tie: "#1e2230", collar: true, pocket: true };
/** the LENDERS: grey / brown / blue-grey suits, felt fedoras, plain ties (black umbrellas in the rain) */
export const lenderFit = (v: number): Outfit => ({ shirt: ["#5c606a", "#6a5444", "#4e5a6a"][v % 3], pants: ["#33353c", "#3e3228", "#2e3644"][v % 3], shoes: "#1a1416",
  hair: ["#3a2a20", "#6a6a72", "#4a3020"][v % 3], hairStyle: "short", hat: "fedora", hatCol: ["#2e2e36", "#4a3a2a", "#2a3644"][v % 3], tie: ["#6a1c22", "#2a4a3a", "#5a3a6a"][v % 3],
  suit: {}, moustache: v % 3 === 1 ? "#5a4a40" : undefined });
/** the TRADERS (1963 trading floor): white shirts with rolled sleeves, thin ties (navy / red / green), varied hair */
export const traderFit = (v: number): Outfit => {
  // fix r1: PALE TINTED shirts (blue / yellow / green / pink: a value step under the #F8F3EE faces, so heads separate from
  // bodies), a darker collar band, a slate waistcoat or red sleeve garters on alternate traders, suspenders (an X from
  // behind), real hair variety (black, ginger, grey, one bald with glasses)
  const shirt = ["#c9daee", "#efe2b0", "#d3e6cf", "#e8d2cc", "#c9daee", "#efe2b0"][v % 6];
  return { shirt, collarCol: shade(shirt, 0.8), pants: ["#3e4250", "#4a4038", "#33384a"][v % 3], shoes: "#2a2226",
    hair: ["#1a1416", "#b8642c", "#4a3a30", "#6a6a72", "#5a3b2a", "#2a2020"][v % 6], hairStyle: (["slick", "crop", "swept", "bald", "curly", "crew"] as HairStyle[])[v % 6],
    tie: ["#1e2230", "#a8242c", "#2a5a3a"][v % 3], collar: true, rolled: true, glasses: v % 6 === 3 ? "round" : null, moustache: v % 6 === 2 ? "#5a4a40" : undefined,
    vest: v % 4 === 1 ? "#4a4f5c" : undefined, garters: v % 4 === 3 ? "#a8242c" : undefined, braces: v % 2 === 0 ? ["#7a2a2a", "#2a3a5a", "#5a3a20"][v % 3] : undefined,
    build: v % 3 === 1 ? "small" : "adult" };
};
/** the PUMP WORKERS (Tino's men): denim overalls, slate caps, rolled grey-blue work shirts, wrenches */
export const workerFit = (v: number): Outfit => ({ shirt: ["#9aa8b8", "#a8a090"][v % 2], pants: "#2e4a70", overalls: "#3e5f8a", shoes: "#3a2a20", hair: ["#4a3020", "#2a2020"][v % 2],
  hairStyle: "crop", hat: "cap", hatCol: "#4a5a72", rolled: true });
/** street passers-by (muted 1960s coats and hats) */
export const walkerFit = (v: number): Outfit => [
  { shirt: "#6a5a4a", pants: "#3a3a42", shoes: "#2a2226", hair: "#3a2a20", hairStyle: "short", hat: "fedora", hatCol: "#3a3a40", suit: {}, tie: "#5a2a2a" } as Outfit,
  { shirt: "#7a5a6a", pants: "#4a3a40", shoes: "#5a2a2a", hair: "#5a3020", hairStyle: "bob", hat: "pillbox", hatCol: "#2f8a86", dress: true, build: "small" } as Outfit,
  { shirt: "#4e5e6a", pants: "#33363e", shoes: "#2a2226", hair: "#6a6a72", hairStyle: "short", hat: "fedora", hatCol: "#4a4038", suit: {}, tie: "#2a3a5a", moustache: "#7a7a80" } as Outfit,
][v % 3];
/** the cafe across the street (through the office window): a waiter in a white apron, happy customers */
export const cafeFit = (v: number): Outfit => [
  { shirt: "#f4f2ec", pants: "#2a2a30", shoes: "#1a1416", hair: "#2a2020", hairStyle: "slick", tie: "#1a1a20", collar: true, apron: "#fbfaf4" } as Outfit,
  { shirt: "#d9604a", pants: "#4a3a40", shoes: "#6a2a2a", hair: "#7a4a2e", hairStyle: "bob", hat: "pillbox", hatCol: "#f2ead8", dress: true, build: "small" } as Outfit,
  { shirt: "#4a7a6a", pants: "#3a3a42", shoes: "#2a2226", hair: "#3a2a20", hairStyle: "short", hat: "fedora", hatCol: "#5a4a3a", suit: {}, tie: "#c8a040" } as Outfit,
  { shirt: "#e8c35a", pants: "#4a4458", shoes: "#3a2a20", hair: "#a87a4a", hairStyle: "pony", dress: true, build: "small" } as Outfit,
][v % 4];

// ---------------- the joke cast + effect cards ----------------
/** the oil blob (shot 13) on a 512 x 512 canvas (it sits on y ~470): a glossy golden drop with dot eyes and acting brows,
 *  tiny stick arms; sq = squash (+ wider / - taller), lean = tip lag (-1..1), look = pupils, mood picks the face,
 *  sweat 0..1 = the sweat drop, wipe 0..1 = the brow wipe (an arm sweeps across the brow), cheer = arms up */
export type BlobSt = { sq: number; lean: number; look: number; blink: boolean; mood: "happy" | "proud" | "tired" | "relief" | "sigh" | "beam"; sweat: number; wipe: number; cheer: number; pant: number;
  /** fix r1: the arrival pose (0 arms up, 1 a little bow, 2 a tired thumbs-up), a huff-puff cloud 0..1, pupils up (-) / down (+) */
  pose?: number; huff?: number; lookY?: number;
  /** fix r2: the sweat drop slides down the temple (0..1), the pant mouth (true = the open huff, false = the tired smirk),
   *  cheeks puffing (0..1), the C thumbs-up drooping (0..1) */
  sweatY?: number; huffOpen?: boolean; cheek?: number; droop?: number;
  /** fix r3: dizzy spiral eyes (the spin phase; undefined = off) */
  dizzy?: number };
export const drawBlob = (p: Pen, b: BlobSt) => {
  const g = p.g, cx = 256, base = 470, w = 128 * (1 + 0.16 * b.sq), h = 300 * (1 - 0.14 * b.sq), top = base - h;
  const pose = b.pose ?? 0, bow = pose === 1 ? b.cheer : 0, lean = b.lean + 0.55 * bow;
  const pts: P2[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = (i / 80) * Math.PI * 2, y = base - h / 2 - (h / 2) * Math.cos(t), k = (base - y) / h;
    pts.push([cx + w * Math.sin(t) * Math.abs(Math.sin(t / 2)) ** 1.15 + lean * 46 * k * k, y + bow * 26 * k * k]);
  }
  // tiny feet (dark gold), then the arms behind the body
  for (const s of [-1, 1]) p.ell(cx + s * 52, base - 4, 30, 14, "#b87410", 8);
  const sh = (s: number): P2 => [cx + s * 0.86 * w + lean * 20, base - 0.36 * h];
  const arm = (s: number, hand: P2, thumb = false) => {
    const S = sh(s); p.stroke(curve(S, [(S[0] + hand[0]) / 2 + s * 18, (S[1] + hand[1]) / 2 + 10], hand, 8), 15, INK); p.dot(hand[0], hand[1], 17, INK);
    if (thumb) { p.dot(hand[0], hand[1], 22, INK); p.band([[hand[0] - s * 8, hand[1] - 12], [hand[0] - s * 12, hand[1] - 38]], INK, 17, 0, "round"); p.stroke([[hand[0] + s * 2, hand[1] - 6], [hand[0] + s * 14, hand[1] - 4]], 3, "#8a7590"); }
  };
  const wipeOn = b.wipe > 0 && b.wipe < 1;
  // fix r2: the wipe hand travels an arc ABOVE the brows (left -> right), the eyes squeezed shut ^^ while it passes
  // fix r3 (A3 P2): the wipe goes ACROSS the brow at brow height, from the right temple to the left temple (16-18 f)
  const wipeHand: P2 = [cx + 0.72 * w - 1.3 * w * b.wipe, base - 0.45 * h + bow * 22 - 38 - 6 * Math.sin(Math.PI * b.wipe)];
  // body: a warm radial gold (pale top-left, amber bottom-right) + a bright inner bounce on the lower right
  const gr = g.createRadialGradient(cx - 0.35 * w, top + 0.55 * h, 10, cx, base - 0.4 * h, 1.15 * h);
  gr.addColorStop(0, "#ffe9a0"); gr.addColorStop(0.35, "#f8c53e"); gr.addColorStop(0.75, "#e89a1c"); gr.addColorStop(1, "#b86a0c");
  p.path(pts, true); g.fillStyle = gr; g.fill();
  p.clip(pts, () => { p.arc(cx + 0.1 * w, base - 0.3 * h, 0.85 * w, 0.3 * h, 10, 120, 12, "#ffd668"); });
  p.inkRing(pts, 12, thickAngle(DEF_LIGHT));
  // the shine: a long soft highlight + a dot
  p.ell(cx - 0.42 * w + lean * 18, top + 0.5 * h + bow * 20, 18, 46, "#fff8dc", 0, 0, 360, 18);
  p.dot(cx - 0.3 * w + lean * 14, top + 0.3 * h + bow * 24, 10, "#fffdf0");
  // the face
  const ey = base - 0.45 * h + bow * 22, ex = 46, lx = b.look * 9 + lean * 22, ly = (b.lookY ?? 0) * 8;
  const tired = b.mood === "tired" || b.mood === "sigh", happyEyes = b.mood === "proud" || b.mood === "beam" || bow > 0.3;
  if (b.dizzy !== undefined && !wipeOn) for (const s of [-1, 1]) { // fix r3: the dizzy "counted again and again" take
    const sp: P2[] = []; for (let k = 0; k <= 40; k++) { const t = k / 40, a = t * Math.PI * 4.5 + b.dizzy * s; sp.push([cx + s * ex + lx * 0.5 + Math.cos(a) * 20 * t, ey + Math.sin(a) * 20 * t]); }
    p.stroke(sp, 5.5, INK); }
  else if (b.blink || happyEyes || wipeOn) for (const s of [-1, 1]) p.arc(cx + s * ex + lx * 0.5, ey + 6, 18, 12, 200, 340, 9, INK);
  else for (const s of [-1, 1]) {
    if (tired) { p.ell(cx + s * ex + lx, ey + 2 + ly * 0.4, 15, 13, INK, 0, 0, 180); p.stroke([[cx + s * ex - 20 + lx * 0.4, ey + 1], [cx + s * ex + 20 + lx * 0.4, ey + 1]], 8, INK); continue; }
    p.ell(cx + s * ex + lx, ey + ly, 14, 21, INK, 0);
    p.dot(cx + s * ex + lx - 4, ey - 8 + ly, 5, "#ffffff");
  }
  const brow = tired ? [10, -6] : happyEyes ? [-14, -12] : [-8, -10];
  for (const s of [-1, 1]) taper(p, [cx + s * (ex - 18) + lx * 0.5, ey - 34 + brow[0]], [cx + s * (ex + 18) + lx * 0.5, ey - 34 + brow[1] + (tired ? 8 : 0)], 13, 8);
  { const ck = 1 + 0.45 * clamp(b.cheek ?? 0, 0, 1); for (const s of [-1, 1]) { g.save(); g.globalAlpha = 0.45; p.ell(cx + s * (ex + 24 + 6 * (ck - 1)) + lx * 0.5, ey + 30, 20 * ck, 10 * ck, "#ef6a5a", 0); g.restore(); } }
  const my = ey + 46, mx = cx + lx * 0.6;
  if (b.mood === "sigh") { const sg: P2[] = []; for (let i = 0; i <= 12; i++) sg.push([mx - 22 + i * 3.7, my - 8 + 4 * Math.sin(i * 1.25)]); p.stroke(sg, 8, INK); }
  else if (b.mood === "tired" && b.huffOpen === false) p.arc(mx + 4, my - 12, 22, 12, 20, 140, 9, INK);
  else if (b.mood === "tired") { const o = b.huffOpen ? 1.15 : 0.6 + 0.4 * b.pant; dmouth(p, mx, my - 4, 22, 18 * o, 4.2, true); }
  else if (happyEyes) dmouth(p, mx, my - 6, 30, 24, 4.2);
  else p.arc(mx, my - 14, 26, 16, 20, 160, 9, INK);
  // the huff-puff: little white clouds out of the mouth corner
  if (b.huff && b.huff > 0.02) {
    g.save(); g.globalAlpha = 0.85 * Math.sin(Math.PI * Math.min(1, b.huff));
    for (const [dx, dy, r] of [[58, -4, 16], [84, -16, 12], [104, -30, 8]] as const) p.ell(mx + dx * (0.6 + 0.6 * b.huff), my + dy * (0.6 + 0.6 * b.huff), r, r * 0.8, "#ffffff", 4, 0, 360, 0, "#c8d8e8");
    g.restore();
  }
  // arms in front: idle at the sides / the arrival pose / the brow wipe
  if (b.cheer > 0 && pose === 0) for (const s of [-1, 1]) arm(s, lerp2([cx + s * (w + 22), base - 0.2 * h], [cx + s * (w + 40), top + 0.2 * h], b.cheer));
  else if (b.cheer > 0 && pose === 1) { arm(-1, lerp2([cx - w - 18, base - 0.16 * h], [cx - 0.2 * w + lean * 30, base - 0.3 * h], b.cheer)); arm(1, lerp2([cx + w + 18, base - 0.16 * h], [cx + w + 70, base - 0.42 * h], b.cheer)); }
  else if (b.cheer > 0 && pose === 2) { const dr = clamp(b.droop ?? 0, 0, 1); arm(-1, [cx - w - 18, base - 0.12 * h]); arm(1, lerp2([cx + w + 18, base - 0.16 * h], [cx + w + 34 + 14 * dr, top + 0.42 * h + 46 * dr], b.cheer), b.cheer > 0.5); }
  else {
    arm(-1, [cx - w - 18, base - 0.16 * h]);
    if (wipeOn) { // fix r3: the forearm comes in from the right side with the elbow BELOW the body's widest line (outside
      // the silhouette), the mitten sweeping across the brow
      const S = sh(1), H2 = wipeHand, E: P2 = [cx + w + 34, base - 0.42 * h];
      p.stroke(curve(S, [S[0] + 30, S[1] + 4], E, 6).concat(curve(E, [(E[0] + H2[0]) / 2 + 20, (E[1] + H2[1]) / 2 + 10], H2, 10).slice(1)), 20, INK);
      p.ell(H2[0], H2[1], 26, 20, INK, 0); p.stroke([[H2[0] - 12, H2[1] + 4], [H2[0] + 10, H2[1] + 6]], 3, "#8a7590");
    }
    else arm(1, [cx + w + 18, base - 0.16 * h]);
  }
  // the sweat drop (pops on in 1 f and stays); during the wipe's end it flicks off with droplets, then a fresh one beads
  // fix r2: the drop is 1.7x (it reads at phone size) and slides down the temple (sweatY); the wipe takes it off at ~0.8
  if (b.sweat > 0 && !(b.wipe >= 0.78 && b.wipe < 1)) { const sy = top + 0.36 * h + 41 * clamp(b.sweatY ?? 0, 0, 1), sx = cx + 0.62 * w, z = 1.7 * b.sweat;
    p.rot = [0.35, sx, sy]; p.poly([[sx, sy - 34 * z], [sx + 15 * z, sy - 2 * z], [sx, sy + 24 * z], [sx - 15 * z, sy - 2 * z]], "#8fd0f0", 6); p.ell(sx, sy + 4 * z, 15 * z, 19 * z, "#8fd0f0", 0); p.arc(sx - 5 * z, sy, 5 * z, 10 * z, 160, 250, 4, "#ffffff"); p.rot = null; }
  if (b.wipe >= 0.66 && b.wipe < 1) { const t = (b.wipe - 0.66) / 0.34, H2 = wipeHand; for (const [dx, dy, r] of [[1.3, -0.7, 13], [1.6, -0.25, 9], [1.15, 0.15, 7]] as const) p.ell(H2[0] - 20 - dx * 80 * t, H2[1] + dy * 70 * t + 70 * t * t, r, r * 1.3, "#8fd0f0", 4); } // flung off to the left
};
/** the joke fish (shots 10 / 12) on a 512 x 320 canvas, facing right: a small orange cartoon fish, calm and unbothered,
 *  tail wag (tail -1..1), blink; fix r1: pectoral fin flutter (fin -1..1), lid 0 (eye open, looking up by `up` 0..1)
 *  .. 1 (the calm half-lid) .. 2 (shut: the slow deadpan blink) */
export const drawFish = (p: Pen, tail: number, blink: boolean, fin = 0, lid = 1, up = 0, daze = 0, wide = 0, alpha = 1) => {
  if (alpha < 0.999) { // fix r2: fade (rendered whole, then multiplied in)
    const off = document.createElement("canvas"); off.width = 512; off.height = 320;
    const q = new Pen(off.getContext("2d")!); drawFish(q, tail, blink, fin, lid, up, daze, wide, 1);
    const g = p.g; g.save(); g.globalAlpha = clamp(alpha, 0, 1); g.drawImage(off, 0, 0); g.restore(); return;
  }
  const cx = 280, cy = 160;
  p.poly([[cx - 140, cy], [cx - 220, cy - 70 - 26 * tail], [cx - 196, cy], [cx - 220, cy + 70 - 26 * tail]], "#f07a2a", 9);
  p.stroke([[cx - 200, cy - 40 - 14 * tail], [cx - 160, cy - 6]], 4, "#c85a1a"); p.stroke([[cx - 200, cy + 40 - 14 * tail], [cx - 160, cy + 6]], 4, "#c85a1a");
  p.poly([[cx - 60, cy - 70], [cx - 10 + 6 * fin, cy - 128], [cx + 50, cy - 74]], "#f07a2a", 8);
  const body = ellPts(cx, cy, 160, 92, 0, 360, 0, 48);
  p.gradFill(body, "#ffb25a", "#e8742a", rad(-120), 0.3);
  p.clip(body, () => {
    p.ell(cx + 10, cy + 52, 130, 44, "#ffd89a", 0);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) p.arc(cx - 70 + k * 46 + (r % 2) * 23, cy - 30 + r * 30, 18, 16, 280, 440, 3, "#ffcf8a");
  });
  p.poly(body, null, 10);
  p.poly(rotPts([[cx - 10, cy + 10], [cx - 70, cy + 40], [cx - 30, cy + 54]], 0.3 * tail + 0.35 * fin, cx - 10, cy + 10), "#f07a2a", 7);
  const er = 24 + 9 * wide;
  p.ell(cx + 92, cy - 22, er, er, "#ffffff", 6);
  if (daze > 0.02) { // fix r2: dazed swirl eyes (a spiral turning with daze)
    const sp: P2[] = []; for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * Math.PI * 4.2 + daze * 9; sp.push([cx + 92 + Math.cos(a) * er * 0.85 * t, cy - 22 + Math.sin(a) * er * 0.85 * t]); }
    p.stroke(sp, 4.5, INK);
  } else if (wide > 0.02) { // fix r2: startled: a wide white eye with a tiny pinned pupil, brow jumped up
    p.dot(cx + 96, cy - 24, 7, INK); p.dot(cx + 98, cy - 27, 2.4, "#ffffff");
    p.arc(cx + 92, cy - 22 - er - 10, 22, 8, 200, 340, 7, INK);
  } else if (blink || lid >= 1.9) p.stroke([[cx + 72, cy - 22], [cx + 112, cy - 22]], 7, INK);
  else {
    const py = cy - 18 - 10 * up;
    p.dot(cx + 98, py, 12, INK); p.dot(cx + 102, py - 4, 3.5, "#ffffff");
    if (lid > 0.05) { // the calm lid comes down over the top of the eye (lid 1 = half, toward 2 = closing)
      const ly = cy - 46 + 24 * Math.min(1, lid) + 22 * Math.max(0, lid - 1);
      p.clip(ellPts(cx + 92, cy - 22, 24, 24), () => p.poly([[cx + 60, cy - 60], [cx + 124, cy - 60], [cx + 124, ly], [cx + 60, ly]], "#ffb25a", 0));
      p.stroke([[cx + 66, ly], [cx + 118, ly - 2]], 6, INK);
    }
  }
  p.arc(cx + 128, cy + 22, 16, 10, 20, 150, 6, INK);
};
/** a few rising bubbles on a 128 x 256 canvas (phase 0..1 moves them up) */
export const fxBubbles = (p: Pen, ph: number) => {
  for (let k = 0; k < 4; k++) { const t = (ph + k / 4) % 1, x = 64 + 18 * Math.sin(t * 7 + k * 2), y = 240 - 220 * t, r = 7 + 6 * (k % 2) + 6 * t;
    const g = p.g; g.save(); g.globalAlpha = 1 - 0.6 * t; p.ell(x, y, r, r, "rgba(220,240,255,0.25)", 3, 0, 360, 0, "#eaf6ff"); p.dot(x - r * 0.35, y - r * 0.35, r * 0.25, "#ffffff"); g.restore(); }
};
/** the inspector's clipboard (shot 4 B) on a 512 x 420 canvas (an unlit board that must READ: "90%" / "FULL", the red
 *  tick drawn in over tick 0..1 from "believed"), with his two hands drawn on it: the left one gripping the board's
 *  edge, the right one holding the pencil whose point rides the tick (lift 0..1 = the pencil lifts off after it) */
export const drawClipboard = (p: Pen, tick: number, tap: number, lift: number, pen = 1, flut = 0) => {
  const g = p.g;
  g.fillStyle = "#a8743f"; g.strokeStyle = INK; g.lineWidth = 10;
  g.beginPath(); g.roundRect(20, 34, 470, 370, 22); g.fill(); g.stroke();
  g.strokeStyle = "#c8945a"; g.lineWidth = 5; g.beginPath(); g.moveTo(40, 390); g.lineTo(470, 390); g.stroke();
  g.fillStyle = "#fbf8ef"; g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.roundRect(44, 66, 422, 318, 8); g.fill(); g.stroke();
  g.strokeStyle = "#c8cede"; g.lineWidth = 3; for (const y of [120, 216, 330]) { g.beginPath(); g.moveTo(62, y); g.lineTo(448, y); g.stroke(); }
  // fix r2: the sheet's bottom-right corner lifts and flutters in the harbour wind (a dog-ear that grows / shrinks)
  { const c = 22 + 16 * clamp(flut, -1, 1); g.fillStyle = "#e6dcc4"; g.strokeStyle = INK; g.lineWidth = 4;
    g.beginPath(); g.moveTo(466 - c, 384); g.lineTo(466, 384 - c); g.lineTo(466 - 0.9 * c, 384 - 0.85 * c); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = "#b9bcc8"; g.lineWidth = 6; g.beginPath(); g.roundRect(186, 14, 140, 64, 12); g.fill(); g.stroke();
  g.fillStyle = "#1a2a52"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = '150px "Arial Black", Arial'; g.fillText("90%", 255, 170);
  g.font = '104px "Arial Black", Arial'; g.fillText("FULL", 215, 302);
  // the tick: a short down-stroke, then the long up-stroke
  const A: P2 = [356, 282], B: P2 = [392, 330], C: P2 = [470, 204], L1 = Math.hypot(B[0] - A[0], B[1] - A[1]), L2 = Math.hypot(C[0] - B[0], C[1] - B[1]);
  const d = clamp(tick, 0, 1) * (L1 + L2), tip: P2 = d <= L1 ? lerp2(A, B, d / L1) : lerp2(B, C, (d - L1) / L2);
  if (tick > 0) {
    g.strokeStyle = "#d8342c"; g.lineWidth = 30; g.lineCap = "round"; g.lineJoin = "round"; // fix r3: a bolder red tick
    g.beginPath(); g.moveTo(...A); if (d > L1) g.lineTo(...B); g.lineTo(...tip); g.stroke();
  }
  // the left hand grips the board's left edge (thumb over the front)
  p.dot(26, 250, 30, HAND); p.band([[30, 236], [62, 222]], HAND, 16, 0, "round"); p.stroke([[40, 252], [58, 246]], 4, HAND_L);
  // the pencil hand: the point at the tick tip (hovering + tapping before, lifting after); pen 0 = the pencil is still
  // behind his ear (no pencil hand on the board yet)
  if (!pen) return;
  const pt: P2 = tick <= 0 ? [A[0] - 6, A[1] - 8 - 10 * tap] : tick >= 1 ? [C[0] - 30 * lift, C[1] - 46 * lift] : tip;
  const ang = -2.08, top: P2 = [pt[0] + Math.cos(ang) * 112, pt[1] + Math.sin(ang) * 112]; // fix r1: leaning up-LEFT so the hand stays on the board
  p.band([pt, top], "#f2c230", 16, 4, "butt");
  p.poly([[pt[0] - 7, pt[1] - 6], [pt[0] + 8, pt[1] - 9], pt], "#f2d8a8", 3);
  p.dot(pt[0], pt[1] - 1, 4, "#2a2030");
  p.dot(top[0], top[1], 9, "#e88a9a");
  const hp = lerp2(pt, top, 0.42);
  p.dot(hp[0], hp[1], 30, HAND); p.stroke([[hp[0] - 12, hp[1] + 4], [hp[0] + 6, hp[1] + 14]], 4, HAND_L);
};
/** shot 7: the lender's face reflected in the golden oil on a 512 x 512 SOFT card (fix r1): the SAME man (his black
 *  fedora seen in gold: a dark bronze pinched crown + brim, a band), his shoulders with the white shirt V and a red tie,
 *  his expression (curious / squint / goggleO); drawn ~80 % opaque and displaced by a horizontal ripple (rip), plus an
 *  expanding ring from a bubble that pops at his chin (ring 0..1, 0 = none) that wobbles the face harder */
export const drawReflection = (p: Pen, rip: number, expr: Expr, blink: number, ring = 0) => {
  const g = p.g, cx = 256, cy = 262, W = 214, ink = "#7a4a12";
  const off = document.createElement("canvas"); off.width = 512; off.height = 512;
  const q = new Pen(off.getContext("2d")!);
  const H = headBlob(13, W / 2);
  // shoulders + the shirt V + the red tie (a dark suit seen in gold)
  const sh: P2[] = [[cx - 1.25 * W / 2 * 1.5, 512], [cx - 0.95 * W, cy + 1.25 * H.b], [cx - 0.35 * W, cy + 0.92 * H.b], [cx + 0.35 * W, cy + 0.92 * H.b], [cx + 0.95 * W, cy + 1.25 * H.b], [cx + 1.25 * W / 2 * 1.5, 512]];
  q.poly(sh, "#7a5418", 8, ink);
  // fix r2 (A2): the collar sits 0.15 head heights BELOW the chin as a wide flat V, the tie narrow and dark at 65 % (never
  // fangs + a tongue under the "O")
  q.poly([[cx - 0.36 * W, cy + 1.3 * H.b], [cx + 0.36 * W, cy + 1.3 * H.b], [cx, cy + 1.62 * H.b]], "#f2dca0", 6, ink);
  { const gq = q.g; gq.save(); gq.globalAlpha = 0.65;
    q.poly([[cx - 0.024 * W, cy + 1.36 * H.b], [cx + 0.024 * W, cy + 1.36 * H.b], [cx + 0.036 * W, cy + 1.62 * H.b], [cx, cy + 1.74 * H.b], [cx - 0.036 * W, cy + 1.62 * H.b]], "#7e2a20", 3, ink);
    gq.restore(); }
  const hp = blobPts(cx, cy, H);
  q.shadedFill(hp, "#ffe8a8", "#f0bf5a", rad(-120), H.a);
  q.inkRing(hp, 9, thickAngle(DEF_LIGHT), 0.45, ink);
  faceFront(q, cx, cy, W, expr, 0, 0, expr === "goggleO" || expr === "ohWide" ? -0.4 : 0, blink, false, "#ffe8a8", -1, null, { browCol: "#4a2a08", fdy: 3 });
  // the fedora (as the real one: a pinched crown, a dark band, a curled snap brim) in dark bronze
  const HH = 2 * H.b, by = cy - 0.62 * H.b;
  const brim = ellPts(cx, by, 0.64 * W, 0.078 * HH, 0, 360, 0, 40).map(([x, y]) => [x, y - 3.6 * (W / 100) * (((x - cx) / (0.64 * W)) ** 2)] as P2);
  q.poly(brim, "#4a2e0e", 8, ink);
  const crown: P2[] = [[cx - 0.32 * W, by], [cx - 0.28 * W, by - 0.3 * HH], [cx - 0.12 * W, by - 0.37 * HH], [cx, by - 0.31 * HH], [cx + 0.12 * W, by - 0.37 * HH], [cx + 0.28 * W, by - 0.3 * HH], [cx + 0.32 * W, by]];
  q.poly(crown, "#5a3812", 8, ink);
  q.clip(crown, () => { q.band([[cx - 0.4 * W, by - 0.055 * HH], [cx + 0.4 * W, by - 0.055 * HH]], "#2a1806", 0.085 * HH, 0); q.stroke(curve([cx - 0.24 * W, by - 0.12 * HH], [cx - 0.2 * W, by - 0.25 * HH], [cx - 0.08 * W, by - 0.31 * HH], 8), 5, "#a07a3a"); });
  // copy it in with a horizontal ripple (rows shift by a sine that travels with rip; the bubble ring adds a wobble)
  // fix r3 (A3 P2): the ripple is a gentle sway (<= ~2.5 canvas px: <= 2 px on screen), never a lumpy silhouette
  const A = 1.3 + 0.9 * Math.sin(Math.PI * Math.min(1, ring));
  g.save(); g.globalAlpha = 0.86;
  for (let y = 0; y < 512; y += 4) { const dx = A * Math.sin(y * 0.035 + rip * 3.1) + 0.5 * Math.sin(y * 0.09 - rip * 2); g.drawImage(off, 0, y, 512, 4, dx, y, 512, 4); }
  g.restore();
  // ripple rings (the oil breathes) + the bubble's ring expanding from his chin; fix r2: every ring centred on the CHIN
  // (and starting outside the face), never round an eye
  for (let k = 0; k < 4; k++) { const r = 150 + 52 * k + 14 * rip; g.save(); g.globalAlpha = 0.4 - 0.08 * k; p.ell(cx, cy + 1.05 * H.b, r, r * 0.86, null, 5, 0, 360, 0, "#fff3c0"); g.restore(); }
  // fix r3: the bloop ring starts at the chin 0.6 face widths to the RIGHT and grows 0 -> 0.75 W radius with a fade, so it
  // never frames the mouth (no pacifier / nose-ring read)
  if (ring > 0 && ring < 1) { g.save(); g.globalAlpha = 0.9 * (1 - ring) ** 1.3; const r = 6 + 0.75 * W * ring; p.ell(cx + 0.6 * W, cy + 1.0 * H.b, r, r * 0.62, null, 6 * (1 - 0.5 * ring), 0, 360, 0, "#fffbe0"); g.restore(); }
  // the edges dissolve into the oil
  g.save(); g.globalCompositeOperation = "destination-in";
  const fade = g.createRadialGradient(cx, cy + 20, 140, cx, cy + 20, 256); fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fade; g.fillRect(0, 0, 512, 512);
  g.restore();
};
/** shout lines on a 256 x 256 canvas: 3 thick strokes fanning out from the centre (the mouth): right / down-right / down
 *  (mirror the card for the other side); k 0..1 pulses their length */
export const fxShout = (p: Pen, k: number) => {
  // fix r3 (A3 P2): three short CURVED sound arcs, concentric round the mouth (the card centre), opening toward the
  // down-right (mirror the card for down-left); they start a little in front of the mouth and pulse outward with k
  const dir = 52, span = 30;
  for (let i = 0; i < 3; i++) {
    const r = 26 + 22 * i + 8 * k, w = 5.2 - 0.6 * i, a0 = dir - span + 4 * i, a1 = dir + span - 4 * i, pts: P2[] = [];
    for (let j = 0; j <= 12; j++) { const a = rad(a0 + ((a1 - a0) * j) / 12); pts.push([128 + Math.cos(a) * r, 128 + Math.sin(a) * r]); }
    p.stroke(pts, w, INK);
  }
};
/** shot 11 (fix r1): a FRIENDLY cartoon hand gripping the dressing bottle by its NECK (so the oil layer stays in view), on
 *  a 1024 x 1024 card: Tino's grey suit sleeve from the top-right corner, a white shirt cuff with a gold cufflink, a white
 *  cartoon glove (3 stitch lines) whose fingers wrap round the front of the neck, the thumb over the top. The grip (the
 *  neck centre) sits at (430, 640); sw = shake swing, sq = the grip squash (0..1) */
export const drawShakeHand = (p: Pen, sw: number, sq = 0) => {
  const G: P2 = [430 + 6 * sw, 640], wr: P2 = [G[0] + 150, G[1] - 120 + 6 * sw];
  const arm = curve([1240, -260], [900, 140 + 10 * sw], wr, 16);
  p.band(arm, "#8a8f99", 168, 12, "round");
  p.stroke(arm.slice(1, 13).map(([x, y]) => [x - 40, y + 30] as P2), 10, "#9ea3ad");                         // the lit edge
  p.stroke(curve([960, 60], [880, 200], [760, 300], 8), 8, "#6a6f79");                                       // a fold
  const cuffA: P2 = [wr[0] + 40, wr[1] - 36], cuffB: P2 = [wr[0] - 6, wr[1] + 8];
  p.band([cuffA, cuffB], "#f6f3ec", 150, 10, "round");
  pinOilcan(p, wr[0] + 24, wr[1] - 30, 3.2); p.dot(wr[0] + 20, wr[1] - 38, 4, "#fff6c8");                   // fix r3: the gold OIL-CAN cufflink
  // the glove: the palm + back of the hand behind the neck, the fingers wrapped across its front
  const s = 1 - 0.06 * sq;
  p.ell(G[0] + 70, G[1] - 40, 112 * s, 92, "#fbf8f2", 10);
  for (const k of [-1, 0, 1]) p.stroke(curve([G[0] + 40 + k * 26, G[1] - 100], [G[0] + 60 + k * 28, G[1] - 70], [G[0] + 70 + k * 30, G[1] - 30], 6), 6, "#d8d0c4");
  for (let k = 0; k < 4; k++) { const y = G[1] - 52 + k * 36 * s; p.band([[G[0] + 66, y], [G[0] - 74 * s, y + 10]], "#fbf8f2", 40, 9, "round"); p.stroke([[G[0] - 30, y + 2], [G[0] - 62 * s, y + 8]], 4, "#d8d0c4"); }
  p.band([[G[0] + 40, G[1] - 96], [G[0] - 56 * s, G[1] - 112]], "#fbf8f2", 44, 9, "round");                  // the thumb
  p.band([[G[0] - 4, G[1] - 22], [G[0] - 2, G[1] + 4]], "#f2c234", 12, 4, "round"); p.dot(G[0] - 3, G[1] - 14, 4, "#fff6c8"); // a gold signet ring
};
/** shot 11 (fix r1): a small tabby cat sitting on the table (person-card design space 600 x 1000, sitting on the soles
 *  line y 975): tilt = head tilt (deg), eye 0 open / 1 wide / 2 half-lid / 3 shut, tail = swish (-1..1), look = pupils */
export type CatSt = { tilt: number; eye: number; tail: number; look: number; ear: number;
  /** fix r2: peek = only the head + one paw (it pops in at the frame edge); paw 0..1 = the front paw lifts to bat;
   *  curl 0..1 = the tail curls into a question mark */
  peek?: boolean; paw?: number; curl?: number };
export const drawCat = (p: Pen, c: CatSt, light = DEF_LIGHT) => {
  const fur = "#e8964a", furS = "#c8743a", str = "#a85a26", wh = "#fbf3e6", thick = thickAngle(light);
  const paw = clamp(c.paw ?? 0, 0, 1), curl = clamp(c.curl ?? 0, 0, 1);
  if (c.peek) { // the peek: one front paw on the edge under the chin (it hooks over), lifted a touch by `paw`
    const px = 210, py = 700 - 60 * paw;
    p.band([[px + 30, 800], [px, py + 20]], fur, 58, 9, "round");
    p.ell(px - 6, py, 40, 30, wh, 8);
    for (const k of [-1, 0, 1]) p.stroke([[px - 6 + k * 14, py + 6], [px - 6 + k * 14, py + 22]], 4, furS);
  } else {
    // the tail curling round the front paws (swishing); fix r2: it can curl up into a question mark
    const tl = curl > 0.02
      ? curve([400, 930], [530 - 20 * curl, 860 - 120 * curl], [480 + 10 * c.tail, 760 - 200 * curl], 14)
      : curve([400, 930], [525 + 55 * c.tail, 890 - 80 * c.tail], [480 + 150 * c.tail, 760 - 70 * c.tail], 14); // fix r3: a wide, readable swish
    p.band(tl, fur, 44, 9, "round"); for (let k = 3; k < 13; k += 3) p.stroke([[tl[k][0] - 18, tl[k][1] - 6], [tl[k][0] + 18, tl[k][1] + 6]], 7, str);
    if (curl > 0.02) { const [ex, ey] = tl[tl.length - 1]; p.band(curve([ex, ey], [ex - 50 * curl, ey - 70 * curl], [ex - 96 * curl, ey - 10 * curl], 10), fur, 40, 9, "round"); }
    // body: a sitting pear
    const body: P2[] = []; for (let i = 0; i < 48; i++) { const t = (i / 48) * Math.PI * 2, x = Math.cos(t), y = Math.sin(t); body.push([300 + 118 * x * (1 + 0.2 * Math.max(0, y)), 800 + 175 * y]); }
    p.shadedFill(body, fur, furS, light, 140); p.inkRing(body, 10, thick);
    p.clip(body, () => { p.ell(300, 860, 62, 110, wh, 0); for (const k of [-1, 1]) for (let r = 0; r < 3; r++) p.arc(300 + k * 92, 720 + r * 58, 34, 18, k > 0 ? 160 : -20, k > 0 ? 220 : 40, 9, str); });
    for (const k of [-1, 1]) {
      const lift = k < 0 ? paw : 0, fx = 300 + k * 46 - 30 * lift, fy = 962 - 150 * lift;
      if (lift > 0.02) p.band([[300 + k * 40, 900], [fx, fy + 10]], fur, 40, 8, "round");
      p.ell(fx, fy, 34, 18, wh, 8); p.stroke([[fx - 8, fy - 10], [fx - 8, fy + 4]], 3, furS);
    }
  }
  // head (tilts about the neck)
  p.rot = [rad(c.tilt), 300, 650];
  const ear = (s: number) => [[300 + s * 40, 470], [300 + s * (96 + 4 * c.ear), 386 - 10 * c.ear], [300 + s * 104, 500]] as P2[];
  for (const s of [-1, 1]) { p.poly(ear(s), fur, 9); p.poly([[300 + s * 58, 478], [300 + s * 92, 414 - 8 * c.ear], [300 + s * 94, 492]], "#f2a8a0", 0); }
  const hp = ellPts(300, 545, 112, 96);
  p.shadedFill(hp, fur, furS, light, 112); p.inkRing(hp, 10, thick);
  p.clip(hp, () => { for (const x of [-26, 0, 26]) p.stroke([[300 + x, 452], [300 + x * 0.8, 494]], 9, str); p.ell(300, 600, 70, 46, wh, 0); });
  // eyes: big round with slit pupils (wide = huge round pupils; half = a heavy lid; shut = a line)
  for (const s of [-1, 1]) {
    const ex = 300 + s * 44, ey = 536;
    if (c.eye >= 3) { p.arc(ex, ey + 4, 18, 8, 200, 340, 7, INK); continue; }
    const r = c.eye === 1 ? 27 : 22;
    p.ell(ex, ey, r, r, "#d8e86a", 6);
    if (c.eye === 1) p.ell(ex + 4 * c.look, ey + 1, 15, 17, INK, 0); else p.ell(ex + 5 * c.look, ey + 1, 5, 17, INK, 0);
    p.dot(ex + 5 * c.look - 6, ey - 8, 4, "#ffffff");
    if (c.eye === 2) { p.clip(ellPts(ex, ey, r, r), () => p.poly([[ex - 30, ey - 40], [ex + 30, ey - 40], [ex + 30, ey + 2], [ex - 30, ey + 2]], fur, 0)); p.stroke([[ex - r, ey + 1], [ex + r, ey + 1]], 7, INK); }
  }
  p.poly([[290, 586], [310, 586], [300, 598]], "#e8707a", 3);
  p.arc(288, 604, 12, 9, 10, 150, 4, INK); p.arc(312, 604, 12, 9, 30, 170, 4, INK);
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) p.stroke([[300 + s * 52, 598 + k * 9], [300 + s * 120, 590 + k * 16]], 2.6, "#5a4a40");
  p.rot = null;
};

// ---------------- fix r1 effect cards ----------------
/** a soft warm light cone on a 256 x 128 SOFT card: narrow at the left (the lens, height r of the right end), wide at the
 *  right; k = strength */
export const fxBeam = (p: Pen, k: number, r: number) => {
  const g = p.g, h0 = 64 * r;
  const lg = g.createLinearGradient(0, 0, 256, 0);
  lg.addColorStop(0, `rgba(255,236,170,${0.75 * k})`); lg.addColorStop(0.5, `rgba(255,226,150,${0.38 * k})`); lg.addColorStop(1, `rgba(255,214,130,${0.12 * k})`);
  g.fillStyle = lg; g.beginPath(); g.moveTo(0, 64 - h0); g.lineTo(256, 4); g.lineTo(256, 124); g.lineTo(0, 64 + h0); g.closePath(); g.fill();
  const vg = g.createLinearGradient(0, 0, 0, 128); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(0.5, "rgba(0,0,0,1)"); vg.addColorStop(1, "rgba(0,0,0,0)");
  g.globalCompositeOperation = "destination-in"; g.fillStyle = vg; g.fillRect(0, 0, 256, 128); g.globalCompositeOperation = "source-over";
};
/** a warm soft light spot (the flashlight on the oil) on a 128 x 128 SOFT card */
export const fxSpot = (p: Pen, k: number) => {
  const g = p.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(255,248,214,${0.85 * k})`); gr.addColorStop(0.45, `rgba(255,232,160,${0.45 * k})`); gr.addColorStop(1, "rgba(255,220,140,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
/** one glossy bubble on a 128 x 128 card (k = size 0..1) */
export const fxBubble = (p: Pen, k: number) => {
  const r = 14 + 40 * clamp(k, 0, 1);
  p.ell(64, 64, r, r, "rgba(230,245,255,0.35)", 5, 0, 360, 0, "#eaf6ff"); p.dot(64 - r * 0.38, 64 - r * 0.38, r * 0.26, "#ffffff");
};
/** a little dust puff (k = phase 0..1) on a 128 x 128 SOFT card */
export const fxDust = (p: Pen, k: number) => {
  const g = p.g; g.save(); g.globalAlpha = 0.55 * (1 - k);
  for (const [dx, dy, r] of [[-18, 8, 22], [10, 4, 26], [30, 14, 16]] as const) p.ell(64 + dx * (1 + k), 92 + dy - 20 * k, r * (0.7 + 0.6 * k), r * 0.6 * (0.7 + 0.6 * k), "#e8dcc4", 0);
  g.restore();
};
/** a herring gull on a 256 x 256 card (standing on y ~228): white body, grey back, black wing tips, yellow beak; wing
 *  0 folded .. 1 raised; head -1 / 1 looks left / right; flying = legs tucked */
export const drawGull = (p: Pen, wing: number, head: number, flying: boolean) => {
  const cx = 128, by = flying ? 150 : 170;
  if (!flying) for (const s of [-1, 1]) p.stroke([[cx + s * 10, by + 26], [cx + s * 12, 226]], 5, "#e88a3a");
  const body = ellPts(cx, by, 52, 30, 0, 360, -8, 32);
  p.poly(body, "#f6f4ee", 6);
  p.poly([[cx + 46, by - 6], [cx + 86, by + 4], [cx + 48, by + 14]], "#f0eee6", 5); // tail
  // wings: folded along the back, or raised in a beat (two wings, grey with black tips)
  for (const s of [1, -1]) {
    const a = rad(-10 - 120 * wing * (s > 0 ? 1 : 0.85)), base: P2 = [cx + 6, by - 10], L = 86;
    const tip: P2 = [base[0] + Math.cos(a) * L * (wing > 0.05 ? 1 : 0.9) + (wing > 0.05 ? 0 : 20), base[1] + Math.sin(a) * L * (wing > 0.05 ? 1 : 0.3)];
    if (wing < 0.05 && s < 0) continue;
    p.poly([base, [base[0] + 18, base[1] - 8], tip, [tip[0] - 6, tip[1] + 10], [base[0] + 30, base[1] + 14]], "#9aa2b2", 5);
    p.poly([tip, [tip[0] - 16, tip[1] + 2], [tip[0] - 6, tip[1] + 10]], "#1e1e26", 0);
  }
  const hx = cx - 44, hy = by - 30;
  p.ell(hx, hy, 22, 20, "#f8f6f0", 6);
  const bd = head > 0 ? -1 : 1;
  p.poly([[hx + bd * 18, hy + 2], [hx + bd * 40, hy + 6], [hx + bd * 18, hy + 10]], "#f2c234", 4);
  p.dot(hx + bd * 36, hy + 7, 3, "#d8402a");
  p.dot(hx + bd * 6, hy - 4, 4.5, INK);
};
/** frame 0 / the loop (fix r1): the tank man's arm seen from above as it enters the frame edge (a 256 x 128 card): the
 *  rolled cream shirt sleeve with its cuff, the dark forearm, and the mitten FIST gripping the tape (thumb over the top,
 *  knuckle lines), painted in the dawn light (an unlit card) */
export const drawTopFist = (p: Pen, bob: number, sq = 0) => {
  // fix r2: sq 0..1 = a finger squeeze (the fist tightens: knuckles bunch, the thumb presses down, the forearm tenses)
  const y = 64 + 2 * bob, s = 1 - 0.07 * sq;
  p.band([[-20, y + 6], [104, y + 2]], "#f4dfb8", 50, 8, "round");
  p.band([[86, y + 2], [104, y + 1]], "#e2c894", 58, 7);
  p.stroke([[20, y - 10], [90, y - 12]], 4, "#fff2d8");
  p.band([[100, y + 1], [178, y - 2]], "#4a3446", 24 + 2 * sq, 7, "round");
  p.ell(200, y - 2, 32 * s, 28 * s, "#3e2c3c", 7);
  for (const k of [-1, 0, 1]) p.stroke([[208 - 2 * sq, y - 2 + k * 10 * s], [226 - 3 * sq, y - 3 + k * 10 * s]], 4, "#9a86a2");
  p.band([[186, y - 24 * s + 3 * sq], [214 - 2 * sq, y - 30 * s + 5 * sq]], "#3e2c3c", 16, 6, "round");
  p.arc(192, y - 12, 16, 9, 200, 300, 4, "#b8a4c0");
};
/** fix r3 (A3 P2, the loop shot): the tank man's long dawn SILHOUETTE SHADOW lying on the roof, for a multiply blob card on
 *  a 512 x 192 canvas (white = no shadow): his kneeling body from the left (off the frame edge) to the head at the right
 *  end with the red cap's peak sticking out, and the reaching arm toward the hatch; soft edges; col = the shadow colour */
export const fxManShadow = (p: Pen, col: string, alpha = 1) => {
  // (alpha < 1: a see-through violet silhouette on a clear canvas for a SOFT card, drawn over the oil shader)
  const g = p.g;
  if (alpha >= 1) { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 192); }
  g.save(); g.filter = "blur(5px)"; g.fillStyle = col; g.globalAlpha = Math.min(1, alpha);
  const sil: P2[] = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; sil.push([-20 + 330 * t, 96 - (40 + 14 * Math.sin(Math.PI * t)) * (0.85 + 0.15 * t)]); }   // the back
  sil.push([330, 60], [352, 74]);                                                                                                         // the neck
  for (let i = 0; i <= 24; i++) { const t = 1 - i / 24; sil.push([-20 + 330 * t, 96 + (36 + 10 * Math.sin(Math.PI * t)) * (0.85 + 0.15 * t)]); } // the knees / belly side
  p.path(sil, true); g.fill();
  g.beginPath(); g.ellipse(392, 94, 50, 46, 0, 0, Math.PI * 2); g.fill();                                                              // the head
  g.beginPath(); g.moveTo(402, 50); g.quadraticCurveTo(452, 46, 470, 70); g.lineTo(506, 84); g.lineTo(468, 100); g.quadraticCurveTo(430, 104, 400, 96); g.closePath(); g.fill(); // cap + peak
  g.lineCap = "round"; g.strokeStyle = col; g.lineWidth = 22; g.beginPath(); g.moveTo(300, 128); g.quadraticCurveTo(370, 150, 430, 146); g.stroke();             // the arm toward the hatch
  g.restore();
};
/** fix r3 (shot 11): two short curved motion arcs beside the shaken bottle (k 0..1 fades them in / out) on a 128 x 128 card */
export const fxMotion = (p: Pen, k: number) => {
  const g = p.g; g.save(); g.globalAlpha = clamp(k, 0, 1);
  for (const [r, w] of [[40, 7], [58, 5.5]] as const) p.arc(30, 64, r, r * 1.15, -38, 38, w, INK);
  g.restore();
};
/** a single banknote (128 x 64) */
export const fxBill = (p: Pen) => {
  p.poly(rrect(6, 6, 122, 58, 4), "#a8d098", 4); p.poly(rrect(14, 13, 114, 51, 3), null, 2, "#4a7a3a");
  p.ell(64, 32, 13, 13, "#cfe8c0", 3, 0, 360, 0, "#4a7a3a");
};
/** an order slip flying up (128 x 128) */
export const fxSlip = (p: Pen) => {
  p.poly(rrect(24, 14, 104, 114, 4), "#fbf7e8", 5);
  for (let r = 0; r < 4; r++) p.stroke([[36, 36 + r * 18], [r % 2 ? 76 : 92, 36 + r * 18]], 4, "#7a84a0");
};
/** a little gold drip print on the pipe (128 x 64) */
export const fxDrip = (p: Pen) => { p.ell(64, 32, 40, 18, "#e8a020", 4, 0, 360, 0, "#9a6010"); p.ell(54, 28, 12, 5, "#ffe8a0", 0); };

// ---------------- fix r2 effect cards ----------------
/** shot 2 (fix r2): a worker's hand truck with two stacked oil drums (red over blue, ribbed, a bung), its two wheels and
 *  the long handle rising to the upper right (the pusher's hands go there), on a 256 x 384 card (wheels on y ~360);
 *  sp = the wheel spin (rad) */
export const drawHandTruck = (p: Pen, sp: number) => {
  // the frame: the nose plate on the ground, two rails up to the handle
  p.band([[70, 352], [104, 40], [150, 18]], "#5a5e66", 12, 5, "round");
  p.band([[96, 352], [126, 42]], "#6a6e78", 10, 4, "round");
  p.poly(rrect(52, 346, 190, 360, 3), "#7a7e88", 5);
  // two drums
  for (const [y0, c] of [[200, "#2f5aa8"], [62, "#c8402c"]] as const) {
    p.poly(rrect(84, y0, 212, y0 + 140, 10), c, 6);
    for (const k of [0.3, 0.7]) p.stroke([[86, y0 + 140 * k], [210, y0 + 140 * k]], 5, shade(c, 0.7));
    p.stroke([[100, y0 + 14], [100, y0 + 126]], 6, mix(c, "#ffffff", 0.35));
    p.ell(176, y0 + 8, 9, 4, shade(c, 0.6), 3);
  }
  // the wheels
  for (const x of [88, 168]) { p.ell(x, 352, 26, 26, "#2a2a30", 6); p.ell(x, 352, 10, 10, "#9aa0ae", 3); p.stroke([[x, 352], [x + 20 * Math.cos(sp), 352 + 20 * Math.sin(sp)]], 4, "#9aa0ae"); }
};
/** shot 16 (fix r2): a gull's soft shadow (wings spread) for a multiply blob card on a 256 x 128 canvas (white = none) */
export const fxGullShadow = (p: Pen, col: string, wing: number) => {
  const g = p.g; g.fillStyle = WHITE; g.fillRect(0, 0, 256, 128);
  g.save(); g.filter = "blur(5px)"; g.fillStyle = col;
  const w = 0.6 + 0.4 * wing;
  g.beginPath(); g.moveTo(128, 50); g.quadraticCurveTo(80, 30 - 20 * w, 18, 52 - 10 * w); g.quadraticCurveTo(70, 58, 112, 72);
  g.lineTo(122, 98); g.lineTo(134, 98); g.lineTo(144, 72); g.quadraticCurveTo(186, 58, 238, 52 - 10 * w); g.quadraticCurveTo(176, 30 - 20 * w, 128, 50); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(128, 44, 10, 9, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};
/** a 4-point glint (a card corner flash) on a 128 x 128 SOFT card, k = 0..1 strength */
export const fxGlint = (p: Pen, k: number) => {
  const g = p.g; g.save(); g.globalAlpha = clamp(k, 0, 1);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 40); gr.addColorStop(0, "rgba(255,255,240,0.9)"); gr.addColorStop(1, "rgba(255,255,240,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  star4(p, 64, 64, 56 * (0.6 + 0.4 * k), "#ffffff", 0);
  g.restore();
};
/** a breath-steam puff in the cold rain (k = phase 0..1: it grows, drifts up and fades) on a 128 x 128 SOFT card */
export const fxSteam = (p: Pen, k: number) => {
  const g = p.g; g.save(); g.globalAlpha = 0.55 * Math.sin(Math.PI * clamp(k, 0, 1));
  for (const [dx, dy, r] of [[-10, 6, 16], [8, -4, 20], [22, -16, 13]] as const) p.ell(52 + dx * (1 + k), 76 + dy - 26 * k, r * (0.6 + 0.8 * k), r * 0.75 * (0.6 + 0.8 * k), "#eef4ff", 0);
  g.restore();
};
/** a splash ring + three drops (k = phase 0..1) on a 256 x 128 card: the water surface where the fish lands */
export const fxSplash = (p: Pen, k: number) => {
  const g = p.g; g.save(); g.globalAlpha = 1 - clamp(k, 0, 1);
  p.ell(128, 84, 40 + 80 * k, 12 + 22 * k, null, 6 * (1 - 0.5 * k), 0, 360, 0, "#eaf6ff");
  for (const [dx, h] of [[-46, 50], [0, 70], [44, 54]] as const) p.ell(128 + dx * (0.6 + k), 84 - h * Math.sin(Math.PI * Math.min(1, k * 1.3)), 7, 9, "#cfeaff", 3, 0, 360, 0, "#eaf6ff");
  g.restore();
};
/** the shot-3 / 5 cash cart pushed by a clerk (a little brass-railed trolley with cash bundles) on a 256 x 192 card */
export const drawCashCart = (p: Pen) => {
  p.poly(rrect(20, 70, 236, 150, 8), "#6a3e22", 6);
  p.stroke([[24, 66], [232, 66]], 6, "#d8b04a");
  for (let k = 0; k < 5; k++) { const x = 40 + k * 38; p.poly(rrect(x, 40 - (k % 2) * 10, x + 32, 70, 3), "#a8d098", 4); p.stroke([[x + 4, 55 - (k % 2) * 5], [x + 28, 55 - (k % 2) * 5]], 3, "#4a7a3a"); }
  p.band([[236, 80], [252, 30]], "#d8b04a", 6, 3, "round");
  for (const x of [52, 204]) { p.ell(x, 164, 18, 18, "#2a2a30", 5); p.ell(x, 164, 6, 6, "#c8a040", 2); }
};

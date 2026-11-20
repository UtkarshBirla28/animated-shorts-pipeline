// HAND + POP DRAWINGS (owner CAST): pure canvas drawing, no timeline (safe for benches). hands.ts animates them.
import { Pen, INK, mix, rrect, type P2 } from "../../../videos/clown/toon";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
const SKIN = "#f0d6c0", CREASE = "#c49a8a";
const ellP = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 26): P2[] => {
  const o: P2[] = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, x = rx * Math.cos(t), y = ry * Math.sin(t); o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return o;
};
const rot = (pts: P2[], a: number, c: P2): P2[] => pts.map(([x, y]) => [c[0] + (x - c[0]) * Math.cos(a) - (y - c[1]) * Math.sin(a), c[1] + (x - c[0]) * Math.sin(a) + (y - c[1]) * Math.cos(a)]);

/** a big 4-finger hand on a 1000 x 1000 canvas: the wrist at `w`, pointing along `ang` (rad, 0 = up), `curl` 0 open ..
 *  1 fist, `index` 0..1 keeps the index finger straight (a point), the sleeve cuff behind the wrist */
export const drawBigHand = (p: Pen, w: P2, ang: number, curl: number, index = 0, cuff = "#8a8f99", skin = SKIN) => {
  const R = (pts: P2[]) => rot(pts, ang, w);
  // the forearm + the sleeve cuff
  p.poly(R(rrect(w[0] - 70, w[1] + 20, w[0] + 70, w[1] + 520, 40)), skin, 9);
  p.poly(R(rrect(w[0] - 92, w[1] + 150, w[0] + 92, w[1] + 560, 30)), cuff, 9);
  p.stroke(R([[w[0] - 88, w[1] + 190], [w[0] + 88, w[1] + 190]]), 6, mix(cuff, "#000000", 0.25));
  // the palm
  const palm = R(ellP(w[0], w[1] - 90, 100, 120));
  // fingers: 4 capsules from the knuckle line; each bends by `curl` (shorter + rotated toward the palm)
  const fx = [-66, -22, 22, 64], fl = [150, 180, 172, 132];
  const fingers: { pts: P2[]; w: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const c = i === 1 ? curl * (1 - index) : curl, base: P2 = [w[0] + fx[i], w[1] - 180], len = fl[i] * (1 - 0.55 * c);
    const a1 = (i - 1.5) * 0.08 - c * 0.2, a2 = a1 - c * 1.9;
    const mid: P2 = [base[0] + Math.sin(a1) * len * 0.55, base[1] - Math.cos(a1) * len * 0.55], tip: P2 = [mid[0] + Math.sin(a2) * len * 0.5, mid[1] - Math.cos(a2) * len * 0.5];
    fingers.push({ pts: R([base, mid, tip]), w: 50 });
  }
  const thumb = R([[w[0] + 92, w[1] - 60], [w[0] + 150 - 50 * curl, w[1] - 150 + 40 * curl], [w[0] + 160 - 110 * curl, w[1] - 230 + 110 * curl]]);
  // one merged silhouette: ink first, then fills
  p.poly(palm, INK, 0); p.poly(ellP(...(R([[w[0], w[1] - 90]])[0] as [number, number]), 110, 130, ang), INK, 0);
  for (const fg of fingers) p.stroke(fg.pts, fg.w + 20, INK);
  p.stroke(thumb, 56 + 20, INK);
  p.poly(palm, skin, 0);
  for (const fg of fingers) p.stroke(fg.pts, fg.w, skin);
  p.stroke(thumb, 56, skin);
  for (const fg of fingers) { const [b, m] = [fg.pts[0], fg.pts[1]]; p.stroke([[m[0] * 0.8 + b[0] * 0.2 - 12, m[1] * 0.8 + b[1] * 0.2], [m[0] * 0.8 + b[0] * 0.2 + 12, m[1] * 0.8 + b[1] * 0.2]], 4, CREASE); }
  p.stroke(R([[w[0] - 60, w[1] - 40], [w[0] + 30, w[1] - 70]]), 4, CREASE);
};
/** the keys on a ring with a small green TRAIN charm, hanging from a point, swinging by `swing` (rad) */
export const drawKeys = (p: Pen, at: P2, swing: number) => {
  const R = (pts: P2[]) => rot(pts, swing, at);
  p.poly(ellP(at[0], at[1] + 40, 40, 40), null, 9, "#b9bcc8"); p.poly(ellP(at[0], at[1] + 40, 40, 40), null, 3, "#e6e8ee");
  p.poly(R(rrect(at[0] - 18, at[1] + 70, at[0] + 18, at[1] + 230, 10)), "#c9ced8", 6);
  p.poly(R(rrect(at[0] - 34, at[1] + 70, at[0] + 34, at[1] + 120, 18)), "#c9ced8", 6);
  for (const k of [0, 1, 2]) p.poly(R(rrect(at[0] + 18, at[1] + 160 + k * 22, at[0] + 34, at[1] + 172 + k * 22, 3)), "#c9ced8", 4);
  const b2 = rot([[at[0] + 20, at[1] + 70]], swing * 1.3, at)[0];
  p.poly(rot(rrect(b2[0] - 14, b2[1], b2[0] + 14, b2[1] + 140, 8), swing * 1.3, b2), "#d9b44a", 6);
  // the train charm: a little emerald commuter car (a window row, a stripe) on a short chain
  const c2 = rot([[at[0] - 30, at[1] + 70]], swing * 1.6, at)[0];
  const ch = rot(rrect(c2[0] - 70, c2[1] + 40, c2[0] + 20, c2[1] + 100, 14), swing * 1.6 + 0.2, c2);
  p.stroke([[at[0] - 25, at[1] + 70], c2, [c2[0] - 25, c2[1] + 40]], 4, "#b9bcc8");
  p.poly(ch, "#e8ecef", 6); p.clip(ch, () => { p.poly(rot(rrect(c2[0] - 72, c2[1] + 72, c2[0] + 22, c2[1] + 86, 0), swing * 1.6 + 0.2, c2), "#1f9a5a", 0); for (const k of [0, 1, 2]) p.poly(rot(rrect(c2[0] - 60 + k * 26, c2[1] + 48, c2[0] - 44 + k * 26, c2[1] + 64, 3), swing * 1.6 + 0.2, c2), "#5a7088", 0); });
};

// ---------------- the lab's 2D pops (draw on any 2D canvas / card; `k` 0..1 the pop's scale with its overshoot)
/** the calling bubble: a white speech bubble with a pointing-finger ICON (the volunteer's silent call) */
export const drawCallBubble = (p: Pen, c: P2, r: number, k: number) => {
  if (k <= 0.01) return; const s = r * k;
  p.poly(ellP(c[0], c[1], s, s * 0.78), "#ffffff", s * 0.07);
  p.poly([[c[0] - s * 0.3, c[1] + s * 0.62], [c[0] - s * 0.55, c[1] + s * 1.05], [c[0] + s * 0.02, c[1] + s * 0.7]], "#ffffff", s * 0.07);
  p.poly(ellP(c[0], c[1], s * 0.97, s * 0.75), "#ffffff", 0);
  // the finger icon: a fist with the index out
  p.poly(rrect(c[0] - s * 0.34, c[1] - s * 0.05, c[0] + s * 0.12, c[1] + s * 0.36, s * 0.12), "#2c1e2a", 0);
  p.poly(rrect(c[0] - s * 0.04, c[1] - s * 0.5, c[0] + s * 0.12, c[1] + s * 0.05, s * 0.08), "#2c1e2a", 0);
};
export const drawTick = (p: Pen, c: P2, r: number, k: number, col = "#2f9a4a") => { if (k <= 0.01) return; const s = r * k; p.stroke([[c[0] - s * 0.5, c[1]], [c[0] - s * 0.1, c[1] + s * 0.4], [c[0] + s * 0.6, c[1] - s * 0.5]], s * 0.26, INK); p.stroke([[c[0] - s * 0.5, c[1]], [c[0] - s * 0.1, c[1] + s * 0.4], [c[0] + s * 0.6, c[1] - s * 0.5]], s * 0.16, col); };
/** the "-85 %" chip (the only on-screen number words besides the captions) */
export const drawChip = (p: Pen, c: P2, h: number, k: number, text = "-85 %") => {
  if (k <= 0.01) return; const s = h * k, w = s * 2.6;
  p.poly(rrect(c[0] - w / 2, c[1] - s / 2, c[0] + w / 2, c[1] + s / 2, s * 0.45), "#ffffff", s * 0.08);
  p.text(text, c[0], c[1] + s * 0.03, s * 0.62, "#c8332e", "Arial Black");
};
/** the pop curve (scale 0 -> 1.12 -> 1 in ~8 f) for a pop starting at frame f0 */
export const popK = (f: number, f0: number) => { const q = (f - f0) / 8; return q <= 0 ? 0 : q < 1 ? 1.12 * Math.sin(q * Math.PI / 2) : 1 + 0.12 * Math.exp(-(q - 1) * 3) * Math.cos((q - 1) * 6); };

/** A POINTING HAND SEEN FROM THE FRONT: the index finger coming straight AT the lens (frame 0: the driver's white glove;
 *  the last shot: the tourist's hand). c = the fist's centre, s = the fist's width (any units), side = the thumb's
 *  screen side (+1 right), fill = glove white / skin, arm = the foreshortened sleeve behind it (its colour, the shirt
 *  cuff's colour, the direction it comes from in rad: 0 = straight below, + = from the lower right), thrust 0..1.2 =
 *  how far out it is (the fingertip is nearest the lens: it grows) */
export const drawLensPoint = (p: Pen, c: P2, s: number, o: { fill?: string; line?: string; side?: 1 | -1; ow?: number; arm?: { col: string; cuff?: string; from?: number; len?: number }; thrust?: number; glove?: boolean } = {}) => {
  const fill = o.fill ?? "#f8f3ee", line = o.line ?? "#b3a2c0", sd = o.side ?? 1, ow = o.ow ?? Math.max(1.5, 0.075 * s), th = clamp(o.thrust ?? 1, 0, 1.3);
  const [x, y] = c;
  if (o.arm) { // the sleeve, foreshortened, behind the fist; the white shirt cuff at the wrist
    const a = o.arm.from ?? 0.5, L = (o.arm.len ?? 1.5) * s, dx = Math.sin(a) * L, dy = Math.cos(a) * L;
    const q = (t: number, w: number): P2[] => { const cx = x + dx * t, cy = y + 0.2 * s + dy * t, nx = Math.cos(a) * w, ny = -Math.sin(a) * w; return [[cx - nx, cy - ny], [cx + nx, cy + ny]]; };
    const a0 = q(0.15, 0.46 * s), a1 = q(1, 0.64 * s);
    p.poly([a0[0], a0[1], a1[1], a1[0]], o.arm.col, ow);
    if (o.arm.cuff) { const b0 = q(0.1, 0.47 * s), b1 = q(0.3, 0.51 * s); p.poly([b0[0], b0[1], b1[1], b1[0]], o.arm.cuff, ow * 0.8); }
  }
  // (2026-11-20 final, s03b: at a third of the frame the old fist read as a WHITE BLOB. Now a cotton GLOVE seen
  // front-on: a soft-shaded back of the hand with three stitched darts, the curled fingers as ONE block with deep crease
  // lines and knuckle bumps, the thumb pad across them, and a LONG index finger with two joint creases leading out
  // toward the side (down the track) and toward us; a cuff seam. Creases are a cool darker tone, never pure white)
  const shadeC = mix(fill, "#7d86a8", 0.26), crease = mix(fill, "#3d4670", 0.55), hi = mix(fill, "#ffffff", 0.35), lw = Math.max(0.9, 0.045 * s);
  if (o.arm?.cuff) { // the cuff's seam + its flared edge (the cuff quad itself is drawn with the sleeve above)
    const a = o.arm.from ?? 0.5, dx = Math.sin(a), dy = Math.cos(a), cx = x + dx * 0.32 * s, cy = y + 0.2 * s + dy * 0.32 * s, nx = Math.cos(a) * 0.5 * s, ny = -Math.sin(a) * 0.5 * s;
    p.stroke([[cx - nx, cy - ny], [cx + nx, cy + ny]], lw, crease);
  }
  // the back of the hand (the fist), soft-shaded from the top
  const fist = rrect(x - 0.5 * s, y - 0.36 * s, x + 0.5 * s, y + 0.46 * s, 0.22 * s);
  p.poly(fist, fill, ow);
  p.clip(fist, () => { p.poly(rrect(x - 0.7 * s, y + 0.06 * s, x + 0.7 * s, y + 0.7 * s, 0), shadeC, 0); p.poly(rrect(x - 0.42 * s, y - 0.33 * s, x + 0.2 * s, y - 0.24 * s, 0.04 * s), hi, 0); });
  p.poly(fist, null, ow);
  if (o.glove) for (const k of [-1, 0, 1]) p.stroke([[x + (k * 0.2 + sd * 0.1) * s, y - 0.3 * s], [x + (k * 0.19 + sd * 0.1) * s, y - 0.12 * s]], lw * 0.8, crease);   // the stitched darts (a glove only)
  // the curled fingers: one block with deep crease lines between the fingers and round knuckle bumps at its far end
  const cb = rrect(x - 0.47 * s, y - 0.02 * s, x + 0.45 * s, y + 0.44 * s, 0.14 * s);
  p.poly(cb, fill, ow * 0.85);
  p.clip(cb, () => p.poly(rrect(x - 0.6 * s, y + 0.3 * s, x + 0.6 * s, y + 0.6 * s, 0), shadeC, 0));
  p.poly(cb, null, ow * 0.85);
  for (const k of [1, 2]) p.stroke([[x - 0.44 * s, y + (-0.02 + 0.15 * k) * s], [x + 0.42 * s, y + (-0.02 + 0.15 * k) * s]], lw * 1.1, crease);
  for (const k of [0, 1, 2]) p.arc(x + sd * 0.4 * s, y + (0.055 + 0.15 * k) * s, 0.07 * s, 0.07 * s, sd > 0 ? -90 : 90, sd > 0 ? 90 : 270, lw, crease);
  // the thumb: a pad lying across the curled fingers, its nail-side seam
  const tA: P2 = [x + sd * 0.46 * s, y + 0.22 * s], tB: P2 = [x + sd * 0.02 * s, y + 0.08 * s], tw = 0.115 * s;
  p.stroke([tA, tB], 2 * tw + 2 * ow, INK); p.stroke([tA, tB], 2 * tw, fill);               // a round-ended pad (ink, then the fill)
  p.stroke([[tB[0] + sd * 0.05 * s, tB[1] - 0.06 * s], [tB[0] + sd * 0.14 * s, tB[1] - 0.03 * s]], lw * 0.8, crease);
  // the INDEX FINGER: long, out to the side and up toward us, two joint creases, the round tip nearest
  const ib: P2 = [x - sd * 0.18 * s, y - 0.24 * s], len = (0.46 + 0.1 * th) * s, ang = Math.atan2(-0.8, -sd * 0.6);   // (up and out: the tip stays in frame)
  const it: P2 = [ib[0] + Math.cos(ang) * len, ib[1] + Math.sin(ang) * len], ux = Math.cos(ang), uy = Math.sin(ang), nx2 = -uy, ny2 = ux;
  const w0 = 0.21 * s, w1 = (0.2 + 0.05 * th) * s;
  const finger: P2[] = [[ib[0] + nx2 * w0, ib[1] + ny2 * w0], [it[0] + nx2 * w1, it[1] + ny2 * w1], [it[0] - nx2 * w1, it[1] - ny2 * w1], [ib[0] - nx2 * w0, ib[1] - ny2 * w0]];
  p.poly(finger, fill, ow);
  p.clip(finger, () => p.poly([[ib[0] - nx2 * w0 * 0.1, ib[1] - ny2 * w0 * 0.1], [it[0] - nx2 * w1 * 0.1, it[1] - ny2 * w1 * 0.1], [it[0] - nx2 * w1 * 1.2, it[1] - ny2 * w1 * 1.2], [ib[0] - nx2 * w0 * 1.2, ib[1] - ny2 * w0 * 1.2]], shadeC, 0));
  p.poly(finger, null, ow);
  for (const t of [0.38, 0.7]) { const cx = ib[0] + ux * len * t, cy = ib[1] + uy * len * t, ww = (w0 + (w1 - w0) * t) * 0.85; p.stroke([[cx + nx2 * ww, cy + ny2 * ww], [cx - nx2 * ww, cy - ny2 * ww]], lw, crease); }
  p.poly(ellP(it[0], it[1], w1 * 1.02, w1 * 1.02), fill, ow);                          // the round fingertip, nearest to us
  p.arc(it[0], it[1], w1 * 0.6, w1 * 0.6, 200, 280, lw, hi);
};

/** THE POINTING GLOVE along an arm (C-4): wrist at `w`, pointing along `dir` (rad, canvas), v = design units x size.
 *  The whole hand is LONG ALONG THE ARM'S LINE: the back of the hand, the index finger straight on from it, the thumb
 *  lying forward on top, three curled fingers under: the finger continues the forearm, nothing stands up from it.
 *  `far` 0..1 = the arm goes into the picture (seen from behind): the finger is foreshortened.
 *  `cuff` = a flared glove cuff with a seam behind the wrist. Returns the fingertip */
export const drawPointGlove = (p: Pen, w: P2, dir: number, v: number, o: { fill?: string; line?: string; ink?: string; ow?: number; far?: number; cuff?: boolean; flip?: 1 | -1 } = {}): P2 => {
  const fill = o.fill ?? "#eef4ff", far = clamp(o.far ?? 0, 0, 1), ow = o.ow ?? 1.5 * v, ink = o.ink ?? INK, line = o.line ?? mix(fill, "#4a5b8c", 0.42);
  const ca = Math.cos(dir), sa = Math.sin(dir), ts = o.flip ?? (ca >= 0 ? -1 : 1);       // the thumb side is the UPPER side on screen
  const L = (x: number, y: number): P2 => [w[0] + y * ca * v - x * ts * sa * v, w[1] + y * sa * v + x * ts * ca * v];
  const M = (pts: [number, number][]): P2[] => pts.map(([x, y]) => L(x, y));
  const capsule = (a: [number, number], b: [number, number], r: number, n = 9): P2[] => { // local capsule a -> b (along y mostly)
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, out: [number, number][] = [];
    for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (Math.PI * i) / n; out.push([b[0] + r * (Math.cos(t) * ux - Math.sin(t) * nx), b[1] + r * (Math.cos(t) * uy - Math.sin(t) * ny)]); }
    for (let i = 0; i <= n; i++) { const t = Math.PI / 2 + (Math.PI * i) / n; out.push([a[0] + r * (Math.cos(t) * ux - Math.sin(t) * nx), a[1] + r * (Math.cos(t) * uy - Math.sin(t) * ny)]); }
    return M(out);
  };
  const fl = 12.5 * (1 - 0.34 * far), shadeC = mix(fill, "#5f77b8", 0.2);
  if (o.cuff) { // the cuff: flared toward the forearm, a seam line across it
    p.poly(M([[-5.6, -7.4], [5.6, -7.4], [4.7, -0.6], [-4.7, -0.6]]), fill, ow, ink);
    p.stroke(M([[-5.2, -4.6], [5.2, -4.6]]), 0.9 * v, line);
  }
  // the three curled fingers under the index (drawn first: the back of the hand overlaps them)
  for (const [x, y, r] of [[-0.9, 10.4, 2.5], [-3.1, 9.6, 2.4], [-4.5, 7.9, 2.1]] as [number, number, number][]) p.poly(M(ell(x, y, r, r)), shadeC, ow * 0.8, ink);
  // the back of the hand: long along the arm
  const hand = capsule([0, 2.2], [0.2, 8.2], 5.1);
  p.poly(hand, fill, ow, ink);
  p.clip(hand, () => p.poly(M([[-7, -4], [-2.3, -4], [-2.9, 15], [-7, 15]]), shadeC, 0));
  p.poly(hand, null, ow, ink);
  // the thumb TUCKED on the hand's upper edge (drawn before the index: a short pad that ends below the index's root).
  // 2026-11-20: a long thumb lying forward read as a SECOND raised finger on the lit still (a "V" / a rude sign)
  p.poly(capsule([3.9, 3.4], [3.3, 7.2], 1.65), fill, ow * 0.85, ink);
  // the index finger: straight on along the arm's line, the one long thing
  const idx = capsule([1.7, 7.6], [1.7, 8.6 + fl], 2.25);
  p.poly(idx, fill, ow, ink);
  // glove darts on the back of the hand (along the arm)
  for (const x of [-1.4, 1.2]) p.stroke(M([[x, 2.2], [x, 6.4]]), 0.8 * v, line);
  return L(1.7, 8.6 + fl + 2.25);
};
/** THE FLAT GLOVE (C-9): the driver's hand held up BY HIS EAR between the name and the status (and any non-pointing
 *  aimed hand of his): a flat white glove along the forearm's line, four fingers together with their gaps, the thumb at
 *  the side, the flared cuff with its seam. A fist in a white glove read as a WHITE BALL on the lit film. Same frame
 *  as drawPointGlove (wrist at `w`, fingers along `dir`, v = units x size, `far` = foreshortened from behind) */
export const drawFlatGlove = (p: Pen, w: P2, dir: number, v: number, o: { fill?: string; line?: string; ink?: string; ow?: number; far?: number; cuff?: boolean; flip?: 1 | -1 } = {}): void => {
  const fill = o.fill ?? "#eef4ff", far = clamp(o.far ?? 0, 0, 1), ow = o.ow ?? 1.5 * v, ink = o.ink ?? INK, line = o.line ?? mix(fill, "#4a5b8c", 0.42);
  const ca = Math.cos(dir), sa = Math.sin(dir), ts = o.flip ?? (ca >= 0 ? -1 : 1);
  const L = (x: number, y: number): P2 => [w[0] + y * ca * v - x * ts * sa * v, w[1] + y * sa * v + x * ts * ca * v];
  const M = (pts: [number, number][]): P2[] => pts.map(([x, y]) => L(x, y));
  const capsule = (a: [number, number], b: [number, number], r: number, n = 8): P2[] => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, out: [number, number][] = [];
    for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (Math.PI * i) / n; out.push([b[0] + r * (Math.cos(t) * ux - Math.sin(t) * nx), b[1] + r * (Math.cos(t) * uy - Math.sin(t) * ny)]); }
    for (let i = 0; i <= n; i++) { const t = Math.PI / 2 + (Math.PI * i) / n; out.push([a[0] + r * (Math.cos(t) * ux - Math.sin(t) * nx), a[1] + r * (Math.cos(t) * uy - Math.sin(t) * ny)]); }
    return M(out);
  };
  const fk = 1 - 0.35 * far, shadeC = mix(fill, "#5f77b8", 0.2);
  if (o.cuff) { p.poly(M([[-5.8, -7.4], [5.8, -7.4], [4.9, -0.6], [-4.9, -0.6]]), fill, ow, ink); p.stroke(M([[-5.4, -4.6], [5.4, -4.6]]), 0.9 * v, line); }
  // four fingers together (drawn before the palm: the palm covers their roots), the middle ones longest
  const F: [number, number][] = [[-3.5, 7.6], [-1.15, 9.4], [1.2, 9.0], [3.5, 7.2]];
  for (const [x, l] of F) p.poly(capsule([x, 7.0], [x * 1.04, 7.0 + l * fk], 1.3), fill, ow * 0.85, ink);
  // the thumb at the upper side, a little apart
  p.poly(capsule([4.4, 2.6], [6.4, 7.4 * (1 - 0.2 * far)], 1.55), fill, ow * 0.85, ink);
  // the palm (the back of the hand): wide and flat
  const palm = M([[-4.9, 0], [4.9, 0], [5.0, 8.4], [-5.0, 8.4]]);
  p.poly(palm, fill, ow, ink);
  p.clip(palm, () => p.poly(M([[-6, -1], [-2.6, -1], [-3.0, 9], [-6, 9]]), shadeC, 0));
  p.poly(palm, null, ow, ink);
  for (const x of [-1.6, 1.4]) p.stroke(M([[x, 1.6], [x, 6.0]]), 0.8 * v, line);      // the glove darts
};
const ell = (cx: number, cy: number, rx: number, ry: number, n = 14): [number, number][] => { const o: [number, number][] = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; o.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); } return o; };

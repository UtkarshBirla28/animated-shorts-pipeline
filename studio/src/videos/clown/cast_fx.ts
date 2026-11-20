// EXTRA CAST DRAWINGS + PROPS of "The Clown Nobody Saw" (owner CHAR). All drawn with the toon.ts Pen in the 600 x 1000
// card design space (soles at y 975, 1 unit = 2.16 mm, 1 m = 463 units). Props take `u` = the holder's head unit (1 % of
// the head width, ~2.4 design units for an adult) so they scale with the person who holds them.
//   - the cast's pigeons (drawPigeon: the one that trots after the clown's wheel, the ones that flutter aside);
//   - the MONEY in a hand: drawBill (the world's bill: 0.56 x 0.25 m, white border, "ONE 1 ONE"), drawBillsFan, drawPeg
//     (a wooden clothes peg that opens);
//   - drawUnicycle (the student rolls it in), drawGarmentBag (flung open: the clown suit inside, the red nose on top);
//   - the crowd's props: drawSkateboard, drawBike (wheels projected for the heading), drawDog, drawFrisbee, drawTote,
//     drawMug.
// The pigeons of the SET (sets_square.ts) only peck in place; these match their look (grey body, darker tail, pink legs).
import { Pen, P2, INK, rrect, mix, shade } from "./toon";

const TAU = Math.PI * 2;
const UM = 1 / 0.00216;
const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const ellP = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28): P2[] => {
  const o: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = rx * Math.cos(a), y = ry * Math.sin(a); o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return o;
};
const rotP = (pts: P2[], deg: number, c: P2): P2[] => { const a = rad(deg), cs = Math.cos(a), sn = Math.sin(a); return pts.map(([x, y]) => [c[0] + (x - c[0]) * cs - (y - c[1]) * sn, c[1] + (x - c[0]) * sn + (y - c[1]) * cs]); };

// ================================================================== PIGEONS (unchanged from v1)
/** a pigeon facing screen LEFT (mirror the card for right). run = leg cycle phase (cycles), flap = 0 folded .. 1 wings
 *  beating (wing = the beat phase in cycles), peck = 0..1 head down, lift = 0..1 body pitched up (taking off) */
export type PigeonSt = { run: number; flap: number; wing: number; peck: number; lift: number };
export const drawPigeon = (p: Pen, s: PigeonSt) => {
  const ol = 22, grey = "#8a8f9e", dark = "#5e6372", cx = 300, cy = 760 - 60 * s.lift;
  p.g.save(); p.g.translate(cx, cy); p.g.rotate(0.35 * s.lift - 0.25 * s.peck); p.g.translate(-cx, -cy);
  if (s.flap < 0.8) for (const k of [0, 0.5]) { const a = Math.sin(TAU * (s.run + k)), x0 = cx + (k ? 30 : -20), fx = x0 - 70 * a, fy = 965 - 40 * Math.max(0, Math.cos(TAU * (s.run + k)));
    p.stroke([[x0, cy + 110], [(x0 + fx) / 2 - 14, (cy + 110 + fy) / 2], [fx, fy]], 16, "#d86a7a"); p.stroke([[fx - 34, fy + 4], [fx + 14, fy + 4]], 14, "#d86a7a"); }
  p.poly([[cx + 150, cy - 30], [cx + 330, cy - 70], [cx + 315, cy + 40]], dark, ol);
  p.poly(ellP(cx, cy, 200, 128, -0.15), grey, ol);
  p.stroke([[cx - 130, cy + 50], [cx - 20, cy + 96], [cx + 90, cy + 80]], 16, "#a9aebb");
  const hx = cx - 170, hy = cy - 150 + 150 * s.peck;
  p.poly([[cx - 150, cy - 50], [hx - 20, hy + 20], [hx + 60, hy + 30], [cx - 60, cy - 90]], grey, ol);
  p.stroke([[cx - 140, cy - 60], [cx - 80, cy - 96]], 20, "#5fb08a");
  p.poly(ellP(hx, hy, 72, 66), grey, ol);
  p.poly([[hx - 62, hy - 6], [hx - 122, hy + 14], [hx - 60, hy + 30]], "#f0a030", 14);
  p.dot(hx - 18, hy - 12, 17, "#ffffff"); p.dot(hx - 22, hy - 12, 9, "#2a2632");
  if (s.flap > 0.15) { const up = Math.sin(TAU * s.wing), k = s.flap;
    p.poly([[cx - 90, cy - 40], [cx + 30, cy - 60 - 330 * up * k], [cx + 190, cy - 40 - 250 * up * k], [cx + 120, cy + 10]], "#a3a8b6", ol);
    p.stroke([[cx - 20, cy - 40 - 120 * up * k], [cx + 110, cy - 30 - 150 * up * k]], 14, "#c9cdd8");
  } else { p.poly(ellP(cx + 40, cy - 6, 150, 78, -0.2), "#a3a8b6", ol); p.stroke([[cx - 40, cy + 20], [cx + 130, cy - 4]], 13, dark); p.stroke([[cx - 20, cy + 44], [cx + 150, cy + 22]], 13, dark); }
  p.g.restore();
};

// ================================================================== THE MONEY
const BG1 = "#bfe6b4", BG3 = "#2c6e48", BPAPER = "#fbfdf6";
/** ONE dollar bill like the world's (0.56 x 0.25 m at k = 1: 108 x 48 u): white border, pale green field, an ink frame,
 *  the oval with "1", "ONE" either side. c = centre, ang = rotation (deg), k = size scale, flex = a bend (-1..1) */
export const drawBill = (p: Pen, c: P2, u: number, ang = 0, k = 1, flex = 0) => {
  const w = 54 * u * k, h = 24 * u * k, R = (pts: P2[]) => rotP(pts, ang, c);
  const bend = (pts: P2[]): P2[] => pts.map(([x, y]) => [x, y + flex * 5 * u * k * ((x - c[0]) / w) ** 2] as P2);
  const out = R(bend(rrect(c[0] - w, c[1] - h, c[0] + w, c[1] + h, 2 * u * k)));
  p.poly(out, BPAPER, 2 * u * k);
  p.poly(R(bend(rrect(c[0] - w + 4 * u * k, c[1] - h + 4 * u * k, c[0] + w - 4 * u * k, c[1] + h - 4 * u * k, 1.2 * u * k))), BG1, 1.2 * u * k, BG3);
  p.poly(R(ellP(c[0], c[1], 13 * u * k, 13 * u * k, 0, 20)), "#e8f7e0", 1.2 * u * k, BG3);
  p.text("1", ...R([[c[0], c[1] + 1 * u * k]])[0], 18 * u * k, BG3, "Georgia", "center", rad(ang));
  for (const sd of [-1, 1]) p.text("ONE", ...R([[c[0] + sd * 32 * u * k, c[1] + 1 * u * k]])[0], 8.5 * u * k, BG3, "Georgia", "center", rad(ang));
};
/** a FAN of n bills held in a fist at h (the bills rise above the hand), spread over `spread` degrees */
export const drawBillsFan = (p: Pen, h: P2, u: number, n = 3, ang = 0, spread = 26, k = 0.62) => {
  for (let i = 0; i < n; i++) {
    const a = ang - 90 + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), r = 30 * u * k * 1.6, cx = h[0] + Math.cos(rad(a)) * r, cy = h[1] + Math.sin(rad(a)) * r;
    drawBill(p, [cx, cy], u, a + 90, k, 0.3);
  }
};
/** a wooden clothes PEG (0.115 m: 22 u long at k = 1): `open` 0..1 spreads the jaws (the lower ends squeezed together),
 *  the steel coil in the middle. c = the coil, ang = 0 points the jaws DOWN */
export const drawPeg = (p: Pen, c: P2, u: number, ang = 0, open = 0, k = 1) => {
  const L = 22 * u * k, w = 3.1 * u * k, o = clamp(open, 0, 1) * 9;
  for (const sd of [-1, 1]) {
    const slat = rotP(rrect(c[0] - w, c[1] - 0.42 * L, c[0] + w, c[1] + 0.58 * L, 1.2 * u * k).map(([x, y]) => [x + sd * w * 0.95, y] as P2), ang + sd * o, c);
    p.poly(slat, sd < 0 ? "#d9a96a" : "#c8945a", 1.4 * u * k);
    p.stroke(rotP([[c[0] + sd * w * 0.95, c[1] + 0.3 * L], [c[0] + sd * w * 0.95, c[1] + 0.52 * L]], ang + sd * o, c), 0.9 * u * k, "#8a5a2a");
  }
  p.poly(ellP(c[0], c[1], 3.4 * u * k, 3.4 * u * k, 0, 14), "#aab2c0", 1.1 * u * k);
  p.dot(c[0] - 0.9 * u * k, c[1] - 0.9 * u * k, 1 * u * k, "#e8ecf4");
};

// ================================================================== THE UNICYCLE (rolled by hand)
/** a unicycle held by its saddle at `saddle` (design units), the tyre on the ground (y = ground). s = the heading's
 *  sideways part (side-on: a round wheel; head-on: an edge), spin = the wheel angle (rad: metres / 0.27), lean = the
 *  hub's x offset from under the saddle (design units: the post tilts), u = the holder's head unit */
export const drawUnicycle = (p: Pen, saddle: P2, ground: number, s: number, spin: number, u: number, lean = 0) => {
  const R = 0.27 * UM, cx = saddle[0] + lean, cy = ground - R, ry = R, rx = Math.max(Math.abs(s) * ry, 0.04 * UM), edge = Math.abs(s) < 0.2, sg = Math.sign(s || 1);
  // tyre + two-colour rim + spokes (the spin reads at any size), like the clown's
  p.poly(ellP(cx, cy, rx, ry, 0, 40), edge ? "#2a2230" : "#f4f1e6", 0);
  if (!edge) {
    for (let k = 0; k < 4; k++) { const a0 = -spin + (k * Math.PI) / 2, pts: P2[] = [[cx, cy]]; for (let i = 0; i <= 8; i++) { const a = a0 + (Math.PI / 2) * (i / 8); pts.push([cx + rx * Math.cos(a) * sg, cy - ry * Math.sin(a)]); } p.poly(pts, k % 2 ? "#ffd21a" : "#f4f1e6", 0); }
    p.poly(ellP(cx, cy, rx * 0.8, ry * 0.8, 0, 36), "#cfe6f2", 0);
    for (let k = 0; k < 8; k++) { const a = -spin + (k * Math.PI) / 4; p.stroke([[cx, cy], [cx + rx * 0.82 * Math.cos(a) * sg, cy - ry * 0.82 * Math.sin(a)]], (k % 4 === 0 ? 3 : 1.6) * u, k % 4 === 0 ? "#e9342c" : "#7c8496"); }
    p.poly(ellP(cx, cy, rx * 0.8, ry * 0.8, 0, 36), null, 1.5 * u);
  }
  p.poly(ellP(cx, cy, rx, ry, 0, 40), null, 6.4 * u, "#2a2230");
  p.poly(ellP(cx, cy, Math.max(3.5 * u, 5.5 * u * Math.abs(s)), 5.5 * u, 0, 16), "#c9ccd6", 1.4 * u);
  // fork (red), crown, seat post (steel), saddle (black, a bit of red trim)
  const crown: P2 = [cx + (saddle[0] - cx) * 0.38, cy - R - 0.05 * UM + (saddle[1] - (cy - R - 0.05 * UM)) * 0.0];
  for (const lr of [-1, 1]) p.band([[cx + lr * 4 * u * (1 - Math.abs(s)), cy], [crown[0] + lr * 3 * u * (1 - Math.abs(s)), crown[1]]], "#e9342c", 4 * u, 1.2 * u, "round");
  p.band([crown, [saddle[0], saddle[1] + 6 * u]], "#c9ccd6", 3.8 * u, 1.2 * u, "round");
  const sw = 16 * u * (0.45 + 0.55 * Math.abs(s));
  p.poly(ellP(saddle[0], saddle[1] + 2 * u, sw, 6.5 * u, 0, 20), "#2a2230", 1.5 * u);
  p.stroke([[saddle[0] - sw * 0.7, saddle[1] - 0.5 * u], [saddle[0] + sw * 0.4, saddle[1] - 1.5 * u]], 1.6 * u, "#e9342c");
};

// ================================================================== THE GARMENT BAG + THE CLOWN SUIT
const SUIT_P = "#a436f2", SUIT_Y = "#ffd21a", SUIT_R = "#e9342c";
/** the clown suit on its hanger (hook top at `hook`): purple / yellow halves, the white ruff, red pom-poms, baggy sleeves,
 *  the red nose sitting on the hanger's hook. sway = a small swing (deg) */
export const drawClownSuit = (p: Pen, hook: P2, u: number, sway = 0) => {
  const R = (pts: P2[]) => rotP(pts, sway, hook), hx = hook[0], hy = hook[1], W = 46 * u, top = hy + 22 * u, bot = top + 150 * u;
  // the hanger: a wire hook + a bar
  p.stroke(R([[hx, hy + 12 * u], [hx, hy + 2 * u], [hx + 6 * u, hy - 4 * u], [hx + 1 * u, hy - 9 * u]]), 2.2 * u, "#8a8f9e");
  // the suit body: a baggy jumpsuit (two halves), sleeves hanging down
  const body: P2[] = [[hx - W, top + 6 * u], [hx + W, top + 6 * u], [hx + W * 1.05, top + 70 * u], [hx + W * 0.9, bot], [hx + 6 * u, bot], [hx, top + 104 * u], [hx - 6 * u, bot], [hx - W * 0.9, bot], [hx - W * 1.05, top + 70 * u]];
  for (const sd of [-1, 1]) p.band(R([[hx + sd * W * 0.92, top + 12 * u], [hx + sd * W * 1.3, top + 52 * u], [hx + sd * W * 1.32, top + 96 * u]]), sd < 0 ? SUIT_P : SUIT_Y, 15 * u, 1.6 * u, "round");
  p.poly(R(body), SUIT_P, 2.2 * u);
  p.clip(R(body), () => { p.poly(R([[hx, top - 10 * u], [hx + 2 * W, top - 10 * u], [hx + 2 * W, bot + 10 * u], [hx, bot + 10 * u]]), SUIT_Y, 0);
    for (const [dx, dy] of [[0.5, 0.3], [0.7, 0.62], [0.35, 0.85]] as const) p.dot(...R([[hx + dx * W, top + dy * 120 * u]])[0], 4 * u, SUIT_P);
    for (const [dx, dy] of [[-0.5, 0.36], [-0.72, 0.66], [-0.36, 0.86]] as const) p.dot(...R([[hx + dx * W, top + dy * 120 * u]])[0], 4 * u, SUIT_Y); });
  p.poly(R(body), null, 2.2 * u);
  for (const k of [0.22, 0.42, 0.62]) { const c = R([[hx, top + k * 120 * u]])[0]; p.poly(ellP(c[0], c[1], 6.4 * u, 6.4 * u, 0, 16), SUIT_R, 1.5 * u); p.dot(c[0] - 2 * u, c[1] - 2 * u, 1.8 * u, "#ffb0a0"); }
  // the ruff: white scallops along the neckline, over the hanger bar
  for (let i = 0; i < 9; i++) { const t = i / 8, c = R([[hx - W * 0.85 + 1.7 * W * t, top + 4 * u + 5 * u * Math.sin(Math.PI * t)]])[0]; p.poly(ellP(c[0], c[1], 8.5 * u, 7.5 * u, 0, 16), i % 2 ? "#fff2a8" : "#fdfbf6", 1.5 * u); }
  // the red nose on top of the hook
  const nz = R([[hx + 1 * u, hy - 14 * u]])[0]; p.poly(ellP(nz[0], nz[1], 7.5 * u, 7.2 * u, 0, 18), SUIT_R, 1.6 * u); p.dot(nz[0] - 2.4 * u, nz[1] - 2.4 * u, 2 * u, "#ffb0a0");
};
/** the GARMENT BAG on its hanger, hook at `hook` (in the holder's raised fist). open 0..1: the front flap swings aside
 *  toward screen side `side` (its lining shows past 90 deg), revealing the clown suit; sway (deg) swings the whole bag */
export const drawGarmentBag = (p: Pen, hook: P2, u: number, open = 0, side: 1 | -1 = 1, sway = 0, suit = 1) => {
  const R = (pts: P2[]) => rotP(pts, sway, hook), hx = hook[0], hy = hook[1], W = 44 * u, top = hy + 16 * u, bot = top + 148 * u, o = clamp(open, 0, 1);
  const bag: P2[] = [[hx - W * 0.7, top], [hx + W * 0.7, top], [hx + W, top + 26 * u], [hx + W, bot - 6 * u], [hx - W, bot - 6 * u], [hx - W, top + 26 * u]];
  // the back panel (dark inside), the suit, then the flap
  p.poly(R(rrect(hx - W, top + 4 * u, hx + W, bot, 8 * u)), "#1e2a44", 2.4 * u);
  // p3: `suit` (0..1 + a bounce) = the suit tumbling out after the flap: it swings toward the opening side and settles
  if (o > 0.05) drawClownSuit(p, hook, u * 0.8, sway - side * (14 * Math.sin(Math.PI * clamp(suit, 0, 1)) + 60 * Math.max(0, suit - 1)));
  else p.stroke(R([[hx, hy + 12 * u], [hx, hy + 2 * u], [hx + 6 * u, hy - 4 * u], [hx + 1 * u, hy - 9 * u]]), 2.2 * u, "#8a8f9e");
  // the flap hinged on the `side` edge swings out past it (toward `side`): its width = cos(angle); past 90 deg its grey lining shows
  const a = Math.PI * 0.92 * o, cw = Math.cos(a), hingeX = hx + side * W, farX = hingeX - side * 2 * W * cw;   // hinged on the `side` edge: open, it ends past it
  const flap: P2[] = [[hingeX, top + 26 * u], [hingeX, bot - 6 * u], [farX, bot - 6 * u - 12 * u * Math.sin(a)], [farX, top + 26 * u - 8 * u * Math.sin(a)]];
  if (o < 0.04) { p.poly(R(bag), "#2c3d66", 2.4 * u); p.stroke(R([[hx, top + 6 * u], [hx, bot - 10 * u]]), 1.8 * u, "#c9ccd6"); p.poly(R(rrect(hx - 3 * u, top + 30 * u, hx + 3 * u, top + 40 * u, 1 * u)), "#c9ccd6", 1 * u); }
  else if (Math.abs(cw) > 0.03) { p.poly(R(flap), cw > 0 ? "#2c3d66" : "#8a93ab", 2.4 * u); if (cw < 0) p.stroke(R([[hingeX, top + 40 * u], [farX * 0.5 + hingeX * 0.5, top + 46 * u]]), 1.4 * u, "#c3c8d6"); }
  // the bag's shoulder seam + a tag
  p.stroke(R([[hx - W * 0.7, top + 2 * u], [hx + W * 0.7, top + 2 * u]]), 2 * u, mix("#2c3d66", "#ffffff", 0.2));
};

// ================================================================== THE CROWD'S PROPS
/** a skateboard under the feet: centre c (on the ground), s = the heading's sideways part (side-on: the long deck with two
 *  wheels; head-on: short), tilt (deg, a kick-turn), u = the rider's head unit */
export const drawSkateboard = (p: Pen, c: P2, u: number, s: number, tilt = 0, col = "#2f6ae0") => {
  const L = 0.8 * UM * Math.max(0.28, Math.abs(s)) / 2, R = (pts: P2[]) => rotP(pts, tilt * Math.sign(s || 1), [c[0], c[1]]);
  for (const sd of [-1, 1]) { p.poly(R(ellP(c[0] + sd * L * 0.7, c[1] - 4 * u, 4.6 * u, 4.6 * u, 0, 12)), "#f2e9d0", 1.4 * u); }
  p.poly(R([[c[0] - L, c[1] - 14 * u], [c[0] + L, c[1] - 14 * u], [c[0] + L + 6 * u, c[1] - 19 * u], [c[0] + L + 2 * u, c[1] - 10 * u], [c[0] - L - 2 * u, c[1] - 10 * u], [c[0] - L - 6 * u, c[1] - 19 * u]]), col, 1.8 * u);
  p.stroke(R([[c[0] - L * 0.8, c[1] - 12.5 * u], [c[0] + L * 0.8, c[1] - 12.5 * u]]), 1.4 * u, mix(col, "#ffffff", 0.5));
};
/** a BICYCLE seen at heading s (side-on: two round wheels; head-on: edges), its wheels turning (spin rad); the hub height
 *  = wheel radius above the ground (y = 975). Returns where the rider's saddle, pedal centre and the bars sit (design
 *  units) so the cyclist's legs and hands can meet them */
export const drawBike = (p: Pen, s: number, spin: number, u: number, col = "#e04a3a"): { saddle: P2; crank: P2; bars: P2 } => {
  const R = 0.34 * UM, sg = Math.sign(s || 1), as = Math.max(0.12, Math.abs(s)), wb = 0.52 * UM * as, cy = 975 - R;
  const hubs: P2[] = [[300 - sg * wb, cy], [300 + sg * wb, cy]];
  const wheel = (h: P2) => {
    const rx = Math.max(0.04 * UM, Math.abs(s) * R);
    p.poly(ellP(h[0], h[1], rx, R, 0, 40), null, 5.2 * u, "#2a2230");
    if (Math.abs(s) > 0.2) for (let k = 0; k < 6; k++) { const a = -spin + (k * Math.PI) / 3; p.stroke([[h[0], h[1]], [h[0] + rx * 0.9 * Math.cos(a) * sg, h[1] - R * 0.9 * Math.sin(a)]], 1.1 * u, "#9aa0ae"); }
    p.dot(h[0], h[1], 3 * u, "#c9ccd6");
  };
  wheel(hubs[0]); wheel(hubs[1]);
  const crank: P2 = [300 - sg * 0.04 * UM * as, cy + 0.02 * UM], saddle: P2 = [300 - sg * 0.12 * UM * as, cy - 0.5 * UM], bars: P2 = [300 + sg * 0.36 * UM * as, cy - 0.56 * UM];
  const fr = (a: P2, b: P2) => p.band([a, b], col, 3.6 * u, 1.1 * u, "round");
  fr(hubs[0], crank); fr(crank, [saddle[0], saddle[1] + 4 * u]); fr(hubs[0], [saddle[0] + sg * 2 * u, saddle[1] + 10 * u]); fr([saddle[0] + sg * 4 * u, saddle[1] + 12 * u], [bars[0] - sg * 4 * u, bars[1] + 14 * u]); fr(crank, [bars[0] - sg * 5 * u, bars[1] + 16 * u]); fr([bars[0] - sg * 4 * u, bars[1] + 14 * u], hubs[1]);
  p.band([[bars[0] - sg * 4 * u, bars[1] + 14 * u], bars], "#c9ccd6", 2.6 * u, 1 * u, "round");
  p.band([[bars[0] - 7 * u * (1 - as * 0.6), bars[1]], [bars[0] + 7 * u * (1 - as * 0.6), bars[1]]], "#2a2230", 3.2 * u, 0.9 * u, "round");
  p.poly(ellP(saddle[0], saddle[1], 11 * u * (0.5 + 0.5 * as), 4.2 * u, 0, 14), "#2a2230", 1.3 * u);
  p.dot(crank[0], crank[1], 4.4 * u, "#c9ccd6"); p.poly(ellP(crank[0], crank[1], 4.4 * u, 4.4 * u, 0, 12), null, 1.2 * u);
  return { saddle, crank, bars };
};
/** a small happy DOG walking at heading sign `dir` (+1 = toward screen right), gait phase ph (cycles), tail wag phase;
 *  feet at (x, 975). col = the coat. Returns the collar point (the lead runs from there to the walker's hand) */
export const drawDog = (p: Pen, x: number, dir: 1 | -1, ph: number, u: number, col = "#e8b26a", wag = 0): P2 => {
  const y = 975, b = (v: number) => x + dir * v, bob = 1.6 * u * Math.abs(Math.sin(TAU * ph)), by = y - 38 * u - bob;
  // legs (4, trotting diagonal pairs)
  for (const [lx, k] of [[-14, 0], [14, 0.5], [-9, 0.5], [19, 0]] as const) { const sw = 6 * u * Math.sin(TAU * (ph + k)); p.stroke([[b(lx * u), by + 6 * u], [b(lx * u + sw), y - 2 * u]], 4.4 * u, shade(col, 0.72)); }
  // tail (wagging), body, head with a floppy ear, a red collar
  const tw = 14 * Math.sin(TAU * wag);
  p.stroke([[b(-20 * u), by - 4 * u], [b(-30 * u), by - 16 * u + tw * 0.3 * u], [b(-34 * u - tw * 0.2 * u), by - 24 * u + tw * 0.6 * u]], 4.2 * u, shade(col, 0.85));
  p.poly(ellP(b(0), by, 24 * u, 12 * u, 0, 24), col, 2 * u);
  const hx = b(24 * u), hy = by - 14 * u;
  p.poly(ellP(hx, hy, 11 * u, 10 * u, 0, 20), col, 2 * u);
  p.poly(ellP(b(31 * u), hy + 3 * u, 6 * u, 4.4 * u, 0, 14), mix(col, "#ffffff", 0.35), 1.6 * u);
  p.dot(b(36 * u), hy + 1.5 * u, 2 * u, INK); p.dot(b(27 * u), hy - 3 * u, 1.6 * u, INK);
  p.poly(rotP(ellP(b(18 * u), hy - 2 * u, 4.5 * u, 9 * u, 0, 14), dir * 20, [b(18 * u), hy - 8 * u]), shade(col, 0.7), 1.5 * u);
  p.band([[b(16 * u), hy + 6 * u], [b(20 * u), hy + 10 * u]], "#e9342c", 3 * u, 0.8 * u, "round");
  return [b(18 * u), hy + 8 * u];
};
/** a FRISBEE (a flying disc) at c, tilt (deg), spin phase (the stripe turns), k = size */
export const drawFrisbee = (p: Pen, c: P2, u: number, tilt = 0, spin = 0, col = "#ff5a3a", k = 1) => {
  const r = 14 * u * k, R = (pts: P2[]) => rotP(pts, tilt, c);
  p.poly(R(ellP(c[0], c[1], r, r * 0.34, 0, 24)), col, 1.8 * u * k);
  p.stroke(R(ellP(c[0], c[1] - 1 * u * k, r * 0.66, r * 0.2, 0, 20).concat([ellP(c[0], c[1] - 1 * u * k, r * 0.66, r * 0.2, 0, 20)[0]])), 1.2 * u * k, mix(col, "#ffffff", 0.5));
  const a = TAU * spin; p.dot(...R([[c[0] + Math.cos(a) * r * 0.7, c[1] + Math.sin(a) * r * 0.22]])[0], 1.8 * u * k, "#ffffff");
};
/** a canvas TOTE bag hanging from the shoulder strap at s (design units) down the side; col = the bag */
export const drawTote = (p: Pen, s: P2, u: number, side: number, col = "#efe3c6", sway = 0) => {
  const bx = s[0] + side * 8 * u + sway * u, by = s[1] + 70 * u;
  p.band([[s[0], s[1]], [bx - side * 4 * u, by - 14 * u]], shade(col, 0.8), 2.6 * u, 0.9 * u, "round");
  p.poly(rrect(bx - 14 * u, by - 14 * u, bx + 14 * u, by + 16 * u, 3 * u), col, 1.8 * u);
  p.stroke([[bx - 8 * u, by - 2 * u], [bx + 8 * u, by - 2 * u]], 1.4 * u, shade(col, 0.7));
};
/** a mug of tea / coffee (the mum's), a curl of steam (k 0..1) */
export const drawMug = (p: Pen, h: P2, u: number, col = "#f2d34a", steam = 0) => {
  p.poly(rrect(h[0] - 8 * u, h[1] - 12 * u, h[0] + 8 * u, h[1] + 6 * u, 2.6 * u), col, 1.7 * u);
  p.arc(h[0] + 9 * u, h[1] - 3 * u, 4.6 * u, 5 * u, -80, 80, 2.2 * u, INK);
  if (steam > 0.05) { const g = p.g; g.save(); g.globalAlpha = 0.8 * steam; p.stroke([[h[0] - 2 * u, h[1] - 16 * u], [h[0] + 2 * u, h[1] - 21 * u], [h[0] - 2 * u, h[1] - 26 * u], [h[0] + 1 * u, h[1] - 31 * u]], 1.8 * u, "#ffffff"); g.restore(); }
};

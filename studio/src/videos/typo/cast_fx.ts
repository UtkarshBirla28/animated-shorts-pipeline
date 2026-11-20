// The typo short's extra cast drawings (owner CHAR): the invented debut MASCOT, the giant PINNING HAND, the MOTHS out of
// the seller's pockets, the boss's order SLIP, a push pin, the "!" shout burst. All drawn with the toon.ts Pen; lit
// cards use the 600 x 1000 design space (soles at y 975, cast.ts SU), effect cards their own canvas.
import { Pen, P2, rrect, INK, mix, shade } from "./toon";

const rad = (d: number) => (d * Math.PI) / 180;
const HAND = "#3a2836", HAND_L = "#8a7590";
const ellP = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 40): P2[] => {
  const r = rad(rot), out: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a); out.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]); }
  return out;
};
const rot = (pts: P2[], a: number, c: P2): P2[] => pts.map(([x, y]) => [c[0] + (x - c[0]) * Math.cos(a) - (y - c[1]) * Math.sin(a), c[1] + (x - c[0]) * Math.sin(a) + (y - c[1]) * Math.cos(a)]);

/** the little invented debut MASCOT (an original design, no letters, no logo): a round sky-blue bean with a white belly,
 *  a tuft curl on top, big shiny eyes, rosy cheeks, a little red tie, stubby arms (the right one rings a brass hand bell)
 *  and two round feet. ~0.95 m tall. ring = the bell swing (deg), arm = the bell arm raised 0..1, hop = squash/hop
 *  (-1..1), blink 0..1, joy 0..1 (^^ eyes + open smile), light = the canvas light angle */
export type MascotSt = { ring: number; arm: number; hop: number; blink: number; joy: number; light: number; wave: number;
  /** the striking hand (design point, the hanging debut bell's side) + the mallet swing (deg); with it no hand bell is drawn */
  strike?: [number, number]; mallet?: number };
export const drawMascot = (p: Pen, s: MascotSt) => {
  const blue = "#4a9ae8", blueD = "#2f6fb8", white = "#fbfbf6", g = p.g;
  const sq = s.hop, cx = 300, base = 975 - Math.max(0, -sq) * 40, w = 205 * (1 + 0.08 * sq), h = 420 * (1 - 0.08 * sq), cy = base - h / 2 - 12;
  // feet
  for (const k of [-1, 1]) p.poly(ellP(cx + k * 78, base - 6, 58, 26), blueD, 9);
  // arms (behind the body): the left waves a little, the right holds the bell up beside the body
  const shL: P2 = [cx - 0.86 * w, cy + 30], shR: P2 = [cx + 0.86 * w, cy + 30];
  let hL: P2 = [cx - 1.25 * w, cy + 60 - 60 * s.wave], hR: P2 = [cx + 1.18 * w + 20 * s.arm, cy + 90 - 230 * s.arm];
  if (s.strike) { // the bell hangs beside it: the striking arm reaches out to it (screen side of the bell), the other waves
    const sd = s.strike[0] < cx ? -1 : 1, rest: P2 = [cx + sd * 1.2 * w, cy + 70], reach = s.strike;
    const k = Math.max(0, Math.min(1, s.arm)), at: P2 = [rest[0] + (reach[0] - rest[0]) * k, rest[1] + (reach[1] - rest[1]) * k];
    const free: P2 = [cx - sd * 1.25 * w, cy + 60 - 120 * s.wave];
    if (sd < 0) { hL = at; hR = free; } else { hR = at; hL = free; }
  }
  for (const [S, H] of [[shL, hL], [shR, hR]] as const) {
    p.stroke([S, [(S[0] + H[0]) / 2, (S[1] + H[1]) / 2 + 14], H], 46, INK);
    p.stroke([S, [(S[0] + H[0]) / 2, (S[1] + H[1]) / 2 + 14], H], 30, blue);
  }
  // the body: a round bean with a white belly and a soft far-side shade
  const body = ellP(cx, cy, w, h / 2, 0, 72).map(([x, y]) => [x, y + (y > cy ? 0.04 : -0.06) * (y - cy)] as P2);
  const gr = g.createRadialGradient(cx - 0.35 * w, cy - 0.3 * h, 0, cx - 0.2 * w, cy - 0.15 * h, 1.25 * w);
  gr.addColorStop(0, mix(blue, "#ffffff", 0.18)); gr.addColorStop(0.6, blue); gr.addColorStop(1, blueD);
  p.path(body, true); g.fillStyle = gr; g.fill();
  p.clip(body, () => { p.poly(ellP(cx, cy + 0.2 * h, 0.66 * w, 0.32 * h, 0, 48), white, 0); });
  p.poly(body, null, 12);
  // the tuft curl on top
  p.stroke([[cx - 6, cy - h / 2 + 8], [cx + 6, cy - h / 2 - 36], [cx + 38, cy - h / 2 - 50], [cx + 50, cy - h / 2 - 28], [cx + 30, cy - h / 2 - 18]], 24, INK);
  p.stroke([[cx - 6, cy - h / 2 + 8], [cx + 6, cy - h / 2 - 36], [cx + 38, cy - h / 2 - 50], [cx + 50, cy - h / 2 - 28], [cx + 30, cy - h / 2 - 18]], 12, white);
  // the face
  const fy = cy - 0.17 * h;
  for (const k of [-1, 1]) {
    const ex = cx + k * 62;
    if (s.joy > 0.5) p.arc(ex, fy + 8, 22, 18, 200, 340, 10);
    else if (s.blink > 0.5) p.stroke([[ex - 20, fy], [ex + 20, fy]], 9);
    else { p.poly(ellP(ex, fy, 20, 27), "#2a2030", 0); p.dot(ex - 7, fy - 10, 7, "#ffffff"); p.dot(ex + 6, fy + 9, 3.5, "#ffffff"); }
    g.save(); g.globalAlpha = 0.5; p.poly(ellP(ex + k * 22, fy + 42, 26, 13), "#ff8a8a", 0); g.restore();
  }
  if (s.joy > 0.3) { p.poly(ellP(cx, fy + 52, 34, 26 * s.joy).filter(([, y]) => y >= fy + 52).concat([[cx - 34, fy + 52]]), "#7a1e2c", 7); }
  else p.arc(cx, fy + 36, 30, 20, 25, 155, 9);
  // the little red tie under the face
  const ty = fy + 98;
  p.poly([[cx - 22, ty], [cx + 22, ty], [cx + 12, ty + 20], [cx - 12, ty + 20]], "#c8352c", 6);
  p.poly([[cx - 12, ty + 20], [cx + 12, ty + 20], [cx + 24, ty + 92], [cx, ty + 112], [cx - 24, ty + 92]], "#d8433a", 6);
  p.stroke([[cx - 10, ty + 40], [cx + 10, ty + 32]], 5, "#f08a7a");
  // hands (balls) + the bell in the right one
  if (s.strike) { // a little wooden mallet in the striking hand, its head toward the bell
    const H = s.strike[0] < cx ? hL : hR, F = s.strike[0] < cx ? hR : hL, sd = s.strike[0] < cx ? -1 : 1, t = rad(35 + (s.mallet ?? 0));
    const tip: P2 = [H[0] + sd * Math.sin(t) * 110, H[1] - Math.cos(t) * 110], a = sd * t;
    p.band([H, tip], "#a8743f", 12, 5, "round");
    p.poly(rot(rrect(tip[0] - 30, tip[1] - 18, tip[0] + 30, tip[1] + 18, 8), a, tip), "#c8955a", 6);
    for (const X of [H, F]) { p.dot(X[0], X[1], 30, INK); p.dot(X[0], X[1], 21, blue); }
    void s.light; return;
  }
  p.dot(hL[0], hL[1], 30, INK); p.dot(hL[0], hL[1], 21, blue);
  const bc: P2 = [hR[0], hR[1]], a = rad(s.ring);
  const bell = rot([[bc[0] - 22, bc[1] + 36], [bc[0] + 22, bc[1] + 36], [bc[0] + 36, bc[1] + 84], [bc[0] + 56, bc[1] + 106], [bc[0] - 56, bc[1] + 106], [bc[0] - 36, bc[1] + 84]], a, bc);
  p.poly(rot([[bc[0] - 9, bc[1] - 6], [bc[0] + 9, bc[1] - 6], [bc[0] + 9, bc[1] + 40], [bc[0] - 9, bc[1] + 40]], a, bc), "#7a4a26", 6);
  p.poly(bell, "#f2c23a", 8);
  p.stroke(rot([[bc[0] - 14, bc[1] + 50], [bc[0] - 30, bc[1] + 94]], a, bc), 8, "#fff3c0");
  const cl = rot([[bc[0] - 14 * Math.sin(a * 1.6), bc[1] + 116]], a, bc)[0];
  p.dot(cl[0], cl[1], 13, "#8a5a10");
  p.dot(bc[0], bc[1], 30, INK); p.dot(bc[0], bc[1], 21, blue);
  // ring lines beside the bell while it swings
  const rk = Math.min(1, Math.abs(s.ring) / 22);
  if (rk > 0.15) for (const k of [-1, 1]) for (const j of [0, 1]) {
    const bx = bc[0] + k * (78 + 26 * j), by = bc[1] + 70;
    g.save(); g.globalAlpha = rk; p.arc(bx, by, 16 + 14 * j, 30 + 16 * j, k < 0 ? 120 : -60, k < 0 ? 240 : 60, 7, "#2a2030"); g.restore();
  }
  void s.light;
};

/** the giant PINNING HAND on its own lit card: a navy sleeve with a white cuff coming up from the lower right, a big
 *  plum mitten with the thumb and finger pinching a red push pin whose point is at design (300, 300). press 0..1 squashes
 *  the fingertips flat (the push), pin = the pin still in the fingers */
export const drawPinHand = (p: Pen, press: number, pin: boolean) => {
  const tip: P2 = [300, 300], g = p.g;
  // sleeve from off-card (lower right) to the wrist
  const wr: P2 = [372, 430];
  p.band([[640, 1020], [520, 700], wr], "#2e3f6a", 92, 7, "round");
  p.stroke([[600, 960], [500, 690]], 6, mix("#2e3f6a", "#ffffff", 0.25));
  p.band([[wr[0] + 22, wr[1] + 50], [wr[0] + 6, wr[1] + 18]], "#f6f3ec", 98, 6);
  // the mitten: a big rounded paddle angled up-left toward the tip, the thumb under it
  const a = rad(-38), c: P2 = [tip[0] + 58, tip[1] + 78];
  const sq = 1 - 0.12 * press;
  const pad = rot(rrect(c[0] - 46, c[1] - 78 * sq, c[0] + 46, c[1] + 74, 40), a, c);
  p.poly(rot(ellP(c[0] - 52, c[1] + 18, 22, 40, -30), a, c), HAND, 6);
  p.poly(pad, HAND, 7);
  g.save(); g.globalAlpha = 0.5; p.clip(pad, () => p.poly(rot(ellP(c[0] + 30, c[1] + 30, 40, 80), a, c), "#5a4660", 0)); g.restore();
  for (const k of [-1, 1]) p.stroke(rot([[c[0] + k * 15, c[1] - 76 * sq], [c[0] + k * 14, c[1] - 30]], a, c), 4, HAND_L);
  if (pin) { // the push pin pinched at the fingertip: a red head + a silver point
    p.poly(rrect(tip[0] - 4, tip[1] - 2, tip[0] + 4, tip[1] + 22, 2), "#c9ccd6", 3);
    p.poly(ellP(tip[0] + 2, tip[1] + 34, 22, 15), "#d8382c", 5);
    p.dot(tip[0] - 6, tip[1] + 30, 5, "#ff9a8a");
  }
};

/** a red push pin head seen from the front (64 x 64 fx) */
export const fxPin = (p: Pen) => {
  p.poly(ellP(32, 32, 20, 20), "#d8382c", 4);
  p.poly(ellP(32, 32, 11, 11), shade("#d8382c", 0.8), 3);
  p.dot(26, 25, 5, "#ff9a8a");
};

/** a moth (128 x 128 fx): dusty grey-brown wings flapping (ph 0..1), a little body, two feelers */
export const fxMoth = (p: Pen, ph: number) => {
  const k = 0.35 + 0.65 * Math.abs(Math.cos(ph * Math.PI * 2)), col = "#b5a58e", dk = "#7e6e5a";
  for (const s of [-1, 1]) {
    p.poly(ellP(64 + s * 24 * k, 56, 26 * k + 4, 22, s * 25), col, 4);
    p.poly(ellP(64 + s * 18 * k, 80, 17 * k + 3, 14, -s * 20), shade(col, 0.9), 4);
    p.dot(64 + s * 26 * k, 56, 5, dk);
  }
  p.poly(ellP(64, 66, 7, 22), dk, 3);
  for (const s of [-1, 1]) p.stroke([[64, 46], [64 + s * 10, 30], [64 + s * 18, 26]], 2.5, INK);
};

/** the boss's ORDER SLIP as a readable card (256 x 160): "SELL 1" big, "@ ¥610,000" under it, a red header bar */
export const fxOrderSlip = (p: Pen) => {
  p.poly(rrect(6, 6, 250, 154, 8), "#fbf6e4", 5);
  p.poly(rrect(14, 14, 242, 40, 4), "#c8352c", 0);
  p.text("ORDER", 128, 28, 22, "#ffffff", "Arial Black");
  p.text("SELL 1", 128, 78, 46, "#1e2235", "Arial Black");
  p.text("@ ¥610,000", 128, 126, 34, "#1e2235", "Arial Black");
};

/** a comic shout burst (128 x 128 fx): three radiating strokes (k = 0..1 size / alpha) */
export const fxBurst = (p: Pen, k: number) => {
  const g = p.g; g.save(); g.globalAlpha = Math.min(1, k * 1.4);
  for (const [a, l] of [[-50, 1], [-15, 1.2], [20, 0.9]] as const) {
    const r0 = 28, r1 = 28 + 46 * l * k;
    p.stroke([[64 + r0 * Math.cos(rad(a)), 64 + r0 * Math.sin(rad(a))], [64 + r1 * Math.cos(rad(a)), 64 + r1 * Math.sin(rad(a))]], 9, INK);
  }
  g.restore();
};

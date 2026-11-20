// THE HOOK's choreography (fix2, audit 2 "Design A: the calm man under the board"), shared by cast.ts (his face + his
// right hand) and sets_desk.ts (the two hero certificates, the calendar pages of the loop shot). Pure functions of the
// picture frame, every key a BEAT word. Shot 1 is ONE unbroken front-right medium (cams_desk A0 -> C1):
//   "One"            calm; his finger hovers over the glowing ENTER key and dips (anticipation)
//   "typo"           the finger lands, the key flashes; he does not react
//   "cost a Tokyo"   certificate no. 1 pops out of the keys like toast and lands flat on his forehead; he looks up at
//                    it, peels it off with his other hand, reads it (still calm); the big board starts to flip
//   "¥40 billion."   he lays it tidily on his papers; the board passes 14,500 and turns red: red light on his face,
//                    only his eyes go up, then the round-eyed "O"
//   "And it sold shares..."   he snatches a flying certificate out of the air
//   "that didn't even exist." he holds it up before his face; it goes see-through from one edge to the other and we see
//                    his worried face through it (held)
import { BEAT } from "./beats";
import { TR, V3 } from "./plan";

const c01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = c01(x); return u * u * (3 - 2 * u); };
const mix3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** the front-right lens' screen axes in the set (unit, horizontal): R = screen right, F = away from the lens */
const R: V3 = [-0.792, 0, -0.607], F: V3 = [-0.607, 0, 0.792];
/** a set-local point given about his eyes: x m to screen right, y m up, d m toward the lens */
export const faceL = (x: number, y: number, d: number): V3 => [R[0] * x - F[0] * d, 1.18 + y, 1.95 + R[2] * x - F[2] * d];
export const HK = {
  pop: BEAT.typo + 3,          // certificate no. 1 rises out of the keys
  stick: BEAT.typo + 16,       // ... and lands flat on his forehead
  reach: BEAT.cost + 12,       // his right hand starts up
  grip: BEAT.cost + 24,        // ... is on the paper
  off: BEAT.forty + 4,         // peeled, held out beside his head: he reads it
  down: BEAT.billion - 5,      // he starts to lay it on his papers
  rest: BEAT.billion + 10,     // ... it lies there, the hand goes back to the desk edge
  eyesUp: BEAT.billion + 2,    // the board turned red: his eyes go up
  oh: BEAT.billion + 15,       // the "O"
  grab: BEAT.andIt - 1,        // the hand shoots up after a flying certificate
  caught: BEAT.sold + 1,       // ... caught
  bring: BEAT.sold + 14,       // he brings it before his face
  held: BEAT.that1 + 2,        // ... held up, his face behind it
  ghost0: BEAT.didnt - 1, ghost1: BEAT.exist1 - 1,   // the paper goes see-through, edge to edge
};
/** certificate size (m): the fountain's sheets and the hero sheets */
export const CERT = { w: 0.19, h: 0.132 };
const KEYS: V3 = [0.04, TR.kb.c[1] + 0.02, 1.3];
const FOREHEAD = faceL(0.01, 0.2, 0.035), OUT = faceL(-0.36, 0.0, 0.16), STACK: V3 = [0.62, TR.desk.top + 0.024, 1.32];
const CATCH = faceL(-0.37, 0.27, 0.14), FRONT = faceL(0.0, -0.01, 0.42);
export type CertPose = { on: boolean; p: V3; roll: number; flip: number; flat: number; s: number; wipe: number };
const OFF: CertPose = { on: false, p: [0, 0, 0], roll: 0, flip: 0, flat: 0, s: 1, wipe: 0 };
/** hero certificate A (no. 1): pops, lands on his forehead, is peeled off, read, laid on the papers. `flat` 0 = facing
 *  the lens, 1 = lying flat; flip = a tumble about its long axis (turns) */
export const certA = (id: number, f: number): CertPose => {
  if (id !== 1 || f < HK.pop) return OFF;
  if (f < HK.pop + 5) { const e = 1 - (1 - (f - HK.pop) / 5) ** 2; return { on: true, p: [KEYS[0], KEYS[1] + 0.09 * e, KEYS[2]], roll: 0, flip: 0, flat: 0, s: 0.75 + 0.25 * e, wipe: 0 }; }
  if (f < HK.stick) {
    const u = (f - HK.pop - 5) / (HK.stick - HK.pop - 5), e = u * u * (3 - 2 * u), a: V3 = [KEYS[0], KEYS[1] + 0.09, KEYS[2]];
    const p = mix3(a, FOREHEAD, e); p[1] += 0.2 * Math.sin(Math.PI * u) * (1 - 0.4 * u);
    return { on: true, p, roll: 0.14 * e, flip: 1 - e, flat: 0, s: 1 + 0.4 * e, wipe: 0 };
  }
  // the slap: a 6 f squash that settles
  const sq = f < HK.stick + 6 ? 1.4 + 0.12 * Math.cos(((f - HK.stick) / 6) * Math.PI) * (1 - (f - HK.stick) / 6) : 1.4;
  if (f < HK.grip) return { on: true, p: [FOREHEAD[0], FOREHEAD[1] - 0.012 * sm((f - HK.stick) / 10), FOREHEAD[2]], roll: 0.14, flip: 0, flat: 0, s: sq, wipe: 0 };
  const pk = sm((f - HK.grip) / (HK.off - HK.grip)), dk = sm((f - HK.down) / (HK.rest - HK.down));
  const bob = 0.006 * Math.sin((f - HK.off) * 0.35) * (f >= HK.off && f < HK.down ? 1 : 0);
  let p = mix3([FOREHEAD[0], FOREHEAD[1] - 0.012, FOREHEAD[2]], OUT, pk); p[1] += 0.05 * Math.sin(Math.PI * pk) + bob;
  p = mix3(p, STACK, dk); p[1] += 0.06 * Math.sin(Math.PI * dk);
  return { on: true, p, roll: 0.14 + (-0.3 - 0.14) * pk + 0.55 * dk, flip: 0, flat: dk, s: 1.4 - 0.4 * dk, wipe: 0 };
};
/** hero certificate B: flies up out of the keys, is snatched from the air, held up before his face, turns ghost */
export const certB = (id: number, f: number): CertPose => {
  const t0 = HK.grab + 1;
  if (id !== 1 || f < t0) return OFF;
  if (f < HK.caught) {
    const u = (f - t0) / (HK.caught - t0), e = 1 - (1 - u) ** 1.7, a: V3 = [KEYS[0] + 0.05, KEYS[1], KEYS[2]];
    const p = mix3(a, CATCH, e); p[1] += 0.1 * Math.sin(Math.PI * u);
    return { on: true, p, roll: -0.5 + 0.3 * e, flip: 1.5 * (1 - e), flat: 0, s: 0.8 + 0.3 * e, wipe: 0 };
  }
  const sh = f < HK.caught + 6 ? 0.02 * Math.sin((f - HK.caught) * 1.3) * (1 - (f - HK.caught) / 6) : 0;
  const bk = sm((f - HK.bring) / (HK.held - HK.bring));
  const p = mix3(CATCH, FRONT, bk); p[1] += sh + 0.004 * Math.sin(f * 0.22) * bk;
  return { on: true, p, roll: -0.2 + 0.16 * bk, flip: 0, flat: 0, s: 1.1 + 0.5 * bk, wipe: sm((f - HK.ghost0) / (HK.ghost1 - HK.ghost0)) };
};
/** fix2 (audit 7), shot 8, the second "Nothing.": ONE certificate drifts down between the boss and the trader (the only
 *  thing that moves in the two-shot) */
export const certDrift = (id: number, f: number): CertPose => {
  const u = (f - (BEAT.nothing2 - 4)) / 70;
  if (id !== 8 || u < 0 || u > 1) return OFF;
  return { on: true, p: [0.42 + 0.1 * Math.sin(u * 9), 2.0 - 1.15 * u, 2.12 + 0.03 * Math.cos(u * 7)], roll: 0.5 * Math.sin(u * 9 + 0.5), flip: 0.08 * Math.sin(u * 11), flat: 0, s: 1.35, wipe: 0 };
};
/** fix2 (audit 11), shot 8, the mystery ("But how do you sell something that doesn't exist?"): he lifts ONE see-through
 *  certificate off the desk and looks at us through it on "doesn't exist" (the hook's ghost sheet again); it drops as
 *  the boss bursts in. The lens is cams_desk S8A (front-right, nearer his right side) */
const DESK8: V3 = [0.3, TR.desk.top + 0.03, 1.47], FRONT8: V3 = [0.55, 1.1, 1.9];   // fix4 (6): beside his face (it covered his eyes)
export const certMyst = (id: number, f: number): CertPose => {
  const a = BEAT.something - 8, k = sm((f - a) / 18) * (1 - sm((f - (BEAT.cancelIt - 8)) / 8));
  if (id !== 8 || f < a || f > BEAT.cancelIt + 2) return OFF;
  const p = mix3(DESK8, FRONT8, k); p[1] += 0.04 * Math.sin(Math.PI * k) + 0.004 * Math.sin(f * 0.2) * k;
  return { on: true, p, roll: 0.3 * (1 - k) + 0.05, flip: 0, flat: 0.92 * (1 - k), s: 1 + 0.55 * k, wipe: 1 };
};
/** his right hand in shot 8 while he holds that sheet (null = on the keys) */
export const mystHand = (f: number): V3 | null => {
  const c = certMyst(8, f); if (!c.on) return null;
  return [c.p[0] + 0.05 * c.s * (1 - c.flat), c.p[1] - 0.06 * c.s * (1 - c.flat) + 0.02 * c.flat, c.p[2] + 0.07 * c.s * (1 - c.flat)];
};
/** his right hand (set-local): on the desk edge; up to the paper on his forehead; with it; back; the snatch; holding it up */
export const HAND_REST: V3 = [0.36, TR.desk.top + 0.045, 1.5];
export const rightHand = (id: number, f: number): { p: V3; hold: boolean } => {
  if (id !== 1) return { p: HAND_REST, hold: false };
  const A = certA(id, f), B = certB(id, f);
  const cornerA: V3 = [A.p[0] - R[0] * 0.09 * (1 - A.flat), A.p[1] - 0.05 * (1 - A.flat) + 0.02 * A.flat, A.p[2] - R[2] * 0.09 * (1 - A.flat)];
  if (f < HK.grab - 3) {
    // up to the forehead (a 3 f dip first), then with the paper, then back to the desk edge
    const a = (f - (HK.reach - 3)) / 3, dip = a > 0 && a < 1 ? -0.03 * Math.sin((Math.PI / 2) * a) : a >= 1 && f < HK.reach + 4 ? -0.03 * (1 - sm((f - HK.reach) / 4)) : 0;
    const up = sm((f - HK.reach) / (HK.grip - HK.reach)), back = sm((f - HK.rest) / 12);
    const fore: V3 = [FOREHEAD[0] - R[0] * 0.09, FOREHEAD[1] - 0.06, FOREHEAD[2] - R[2] * 0.09];
    let p = mix3(HAND_REST, f < HK.grip ? fore : cornerA, up); p[1] += dip + 0.07 * Math.sin(Math.PI * up) * (f < HK.grip ? 1 : 0);
    p = mix3(p, HAND_REST, back); p[1] += 0.04 * Math.sin(Math.PI * back);
    return { p, hold: f >= HK.grip && f < HK.rest };
  }
  const a = (f - (HK.grab - 3)) / 3, dip = a < 1 ? -0.035 * Math.sin((Math.PI / 2) * a) : f < HK.grab + 4 ? -0.035 * (1 - sm((f - HK.grab) / 4)) : 0;
  const u = c01((f - HK.grab) / (HK.caught - HK.grab)), up = 0.5 * sm(u) + 0.5 * (1 - (1 - u) ** 2.2);
  const over = f >= HK.caught && f < HK.caught + 6 ? 0.03 * (1 - sm((f - HK.caught) / 6)) : 0;
  const cornerB: V3 = [B.p[0] - R[0] * 0.07 * B.s, B.p[1] - 0.055 * B.s, B.p[2] - R[2] * 0.07 * B.s];
  const tgt: V3 = f < HK.caught ? [CATCH[0] - R[0] * 0.07, CATCH[1] - 0.055, CATCH[2] - R[2] * 0.07] : cornerB;
  const p = mix3(HAND_REST, tgt, up); p[1] += dip + over;
  return { p, hold: f >= HK.caught };
};

// ---------------- the loop shot (14): "one second" = the clock's second hand ticks; "eight years" = eight calendar pages
/** the second hand's tick (0 -> 1 over 7 f with a tiny overshoot) on "one second." */
export const TICK14 = BEAT.oneSec + 4;
export const tickAt = (id: number, f: number) => {
  if (id !== 14) return 1;
  const t = f - TICK14; if (t < 0) return 0; if (t >= 7) return 1;
  return t < 3 ? 1.25 * sm(t / 3) : 1.25 - 0.25 * sm((t - 3) / 4);
};
/** his eyes go up to the clock on "one second." and come back to his screen (0..1) */
export const clockGlance = (id: number, f: number) => (id !== 14 ? 0 : sm((f - (BEAT.oneSec - 6)) / 10) * (1 - sm((f - (BEAT.second + 12)) / 12)));
/** calendar page k (0..7 = the years 2006..2013) crossing the frame behind him on "The fight over it took eight years." */
export const PAGES = 8;
export const pageAt = (id: number, f: number, k: number): { on: boolean; p: V3; roll: number; flip: number } => {
  const t0 = BEAT.theFight + 2 + k * 6.5, T = 30, u = (f - t0) / T;
  if (id !== 14 || u <= 0 || u >= 1) return { on: false, p: [0, 0, 0], roll: 0, flip: 0 };
  // right to left across the frame at head-and-board height, 0.5 m behind him, a little rise and dip (paper on the air)
  const x = 1.05 - 2.1 * u, y = 0.34 + 0.16 * Math.sin(u * 5.2 + k * 1.9) + 0.07 * (((k * 5) % 3) - 1), d = -0.5 - 0.06 * (k % 3);
  return { on: true, p: faceL(x, y, d), roll: 0.35 * Math.sin(u * 6.5 + k * 2.3), flip: 0.14 * Math.sin(u * 9 + k) };
};

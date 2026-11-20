// PICTURE-TIME REMAPS of "The Clown Nobody Saw" (owner EDIT). One general mechanism: film shot `id` at film frame f shows
// the WORLD of shot `src` at picture time `t` (camera, light, set, cast, idle life all at t). Clown.tsx renders every
// layer through remapAt(), so every animator's staging follows it automatically: stage a shot as a function of its own
// picture time and the slow motion, the replays and the rewind come for free.
//   - normal shots: src = id, t = f
//   - S20 SLOW MOTION: src = S20, t runs at ~45 % (eased in over 8 f from the shot's first frame). Key S20's actions with
//     pt(SID.S20, BEAT.x) (the picture time at that word), not BEAT.x.
//   - E1 REPLAY OF THE COUNT ("You counted five phones."; p3, FIX2 D2): src = Q1. It comes in during the silence after the
//     mind-blow line. Each of the five phone people is HELD for E1T.hold film frames (>= 9; the picture crawls 2 picture
//     frames round plan.ts PHONES[k].t, with a small 2D punch-in on that person: story.ts zoomAt), a 2-3 f WHIP
//     (fast-forward) between them, in count order; pop 5 comes up >= 6 f before "phones." ends. E1T (below) lists the real
//     hold and pop frames; scripts/export_timeline.mjs writes them into timeline.json (`e1`) for the sound's pips.
//   - E2 REPLAY OF THE WAVE ("You saw the clown."): src = Q3; t replays Q3 from the brake into the wave, real speed.
//   - E3 TAPE REWIND ("Did you see the money?"; p3, FIX2 D2): a hard cut in the hush after "clown."; the picture rewinds
//     fast (src = Q3 / Q2 / Q1 by t: the film's own shots) under "Did you see the" to REW.tS, a moment before the FIRST
//     DUCK; from ~10 f before "money?" THE HOLD (REW.hold >= 36 film frames, through the word and ~0.5 s after): a SLOW
//     PASS forward through the duck (the ducker walks up behind the lowest bill, drops and passes under it: ~0.25x, then
//     ~0.7x through the drop, then a near-freeze on the lowest point), with a 1.5x 2D punch-in on the three bills + the
//     ducking head (story.ts zoomAt); then a QUICK REWIND (REW.r2 f) to t = 0, landing on frame 0's state exactly at
//     TOTAL (the loop: remapAt(E3, TOTAL) = { src: Q1, t: 0 }, zoom 1).
// The tape LOOK is LOOK's: tapeAt(f) = { rewind (the fast parts only), freeze (= the hold), ring, hold } and e3Hold(f)
// (0..1: the hold's clean-colour / ring switch). This module only moves time.
import { SHOTS, SID, TOTAL, BEAT } from "./beats";
import { PHONES, DUCKS } from "./plan";

const c01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = c01(x); return u * u * (3 - 2 * u); };
const S = (key: string) => SHOTS[SID[key] - 1];

export type Remap = {
  /** the shot whose world, camera and staging are drawn */ src: number;
  /** its picture time */ t: number;
  /** picture frames per film frame here (negative while rewinding, ~0.1-0.7 in E3's hold) */ rate: number;
  /** E3's HOLD (the slow pass on the first duck; kept name: it was a dead freeze until p3) */ freeze: boolean;
  /** the picture runs backward (E3's two fast parts) */ rewind: boolean;
};

/** monotone cubic through [x, y] knots (Fritsch-Carlson), linear past the ends */
const mono = (K: [number, number][], f: number) => {
  if (f <= K[0][0]) return K[0][1] + (f - K[0][0]) * ((K[1][1] - K[0][1]) / (K[1][0] - K[0][0]));
  const n = K.length;
  if (f >= K[n - 1][0]) return K[n - 1][1] + (f - K[n - 1][0]) * ((K[n - 1][1] - K[n - 2][1]) / (K[n - 1][0] - K[n - 2][0]));
  const d = K.slice(0, -1).map((k, i) => (K[i + 1][1] - k[1]) / (K[i + 1][0] - k[0]));
  const m = K.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])));
  let i = 0; while (i + 2 < n && f > K[i + 1][0]) i++;
  const h = K[i + 1][0] - K[i][0], u = (f - K[i][0]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * K[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * K[i + 1][1] + (u3 - u2) * h * m[i + 1];
};

// ---------------- S20: slow motion ----------------
const SLOW = 0.45, SLOW_IN = 8;
/** picture time of S20 at film frame f (identity before its first frame) */
const slowT = (f: number) => {
  const a = S("S20").a, x = (f - a) / SLOW_IN;
  if (x <= 0) return f;
  if (x <= 1) return f - (1 - SLOW) * SLOW_IN * (x ** 3 - x ** 4 / 2);
  return a + SLOW_IN * (1 - (1 - SLOW) / 2) + SLOW * (f - a - SLOW_IN);
};

// ---------------- E1: the replay of the count (five holds + whips) ----------------
/** picture frames each hold crawls (centred on PHONES[k].t) and the fast-forward rate of the lead-in / lead-out */
const E1_CRAWL = 2, E1_LEAD = 2;
/** E1's schedule in FILM frames: `starts[k]` = the first frame phone person k is held, `hold` frames each (>= 9 whenever
 *  the voice leaves room), `whip` frames of fast-forward between two holds. The first hold starts once the dissolve in
 *  is over (a + 4); the last one starts >= 6 f before "phones." ends and ends before the dissolve to E2. */
export const E1T = (() => {
  const s = S("E1"), n = PHONES.length, s0 = Math.round(s.a) + 4;
  const lastStart = Math.min(Math.round(BEAT.countedEnd) - 6, Math.round(s.b) - 3 - 9);
  const step = Math.max(11, Math.min(15, Math.floor((lastStart - s0) / Math.max(1, n - 1))));
  const whip = step >= 12 ? 3 : 2, hold = step - whip, starts = PHONES.map((_, k) => s0 + k * step);
  return { a: s.a, b: s.b, s0, step, hold, whip, starts,
    /** per person: n (1..5), the hold [a, b) in film frames, `pop` = the first frame the number badge is visible (the
     *  sound's pip goes ON this frame, never before), `t` = the Q1 picture frame held */
    holds: PHONES.map((p, k) => ({ n: k + 1, a: starts[k], b: starts[k] + hold, pop: starts[k] + 1, t: p.t })) };
})();
/** E1's picture time (Q1's clock) at film frame f */
const e1T = (f: number) => {
  const { starts, hold, whip, s0 } = E1T, n = starts.length, T = (k: number) => PHONES[k].t;
  if (f <= s0) return T(0) - E1_CRAWL / 2 - (s0 - f) * E1_LEAD;
  for (let k = 0; k < n; k++) {
    const a = starts[k], b = a + hold;
    if (f < b) return T(k) - E1_CRAWL / 2 + (E1_CRAWL * (f - a)) / hold;
    if (k + 1 < n && f < b + whip) { const u = sm((f - b) / whip); return T(k) + E1_CRAWL / 2 + (T(k + 1) - E1_CRAWL / 2 - (T(k) + E1_CRAWL / 2)) * u; }
  }
  return T(n - 1) + E1_CRAWL / 2 + (f - (starts[n - 1] + hold)) * E1_LEAD;
};
/** which phone person E1 is holding at film frame f (-1 = in a whip), and how far through the hold (0..1) */
export const e1Hold = (f: number): { k: number; u: number } => {
  for (let k = 0; k < E1T.starts.length; k++) { const u = (f - E1T.starts[k]) / E1T.hold; if (u >= 0 && u < 1) return { k, u }; }
  return { k: -1, u: 0 };
};
/** E1's replay punch-in strength (0..1) and which phone person it is on: it rises through each hold (so the picture keeps
 *  moving while the person is held) and falls back to 0 through the whip after it (story.ts zoomAt turns it into a 2D
 *  scale about that person's head on screen) */
export const e1Punch = (f: number): { k: number; b: number } => {
  for (let k = E1T.starts.length - 1; k >= 0; k--) {
    const f0 = E1T.starts[k];
    if (f < f0) continue;
    const u = (f - f0) / E1T.hold, d = k + 1 < E1T.starts.length ? E1T.whip : Math.max(4, S("E1").b + 8 - f0 - E1T.hold);
    return { k, b: u <= 1 ? Math.pow(Math.max(0, u), 0.7) : Math.max(0, 1 - (f - f0 - E1T.hold) / d) };
  }
  return { k: -1, b: 0 };
};

// ---------------- E2: the replay of the wave ----------------
/** E2 starts E2_LEAD picture frames before "You saw him" (the clown brakes, then waves) */
const E2_LEAD = 10;
const e2T = (f: number) => BEAT.youSaw - E2_LEAD + (f - S("E2").a);

// ---------------- E3: the tape rewind + the slow pass on the first duck ----------------
/** E3's segments in FILM frames: `a` = the cut; `r1` f of fast rewind (under "Did you see the"); the HOLD from
 *  h0 = a + r1 (about 10 f before "money?", so LOOK's ring is complete before the word) for `hold` f (>= 36, to ~0.5 s after
 *  the word); `r2` f of quick rewind to frame 0 at TOTAL. Picture times: `from` (where E2 stopped), the slow pass tS -> tE
 *  round `duck` = DUCKS[0].t (the ducker's head is lowest under the lowest bill there). */
export const REW = (() => {
  const s = S("E3"), a = s.a, R2 = 10, h1 = TOTAL - R2;
  const h0 = Math.max(Math.round(a) + 8, Math.min(Math.round(BEAT.theMoney) - 10, h1 - 36));
  const duck = DUCKS[0].t;
  return { a, r1: h0 - a, hold: h1 - h0, r2: R2, from: e2T(a), duck, tS: duck - 21, tE: duck + 5 };   /* p4 (QUIZ, audit R8): the pass widened to picture 120-146 so the drop reads */
})();
const H0 = REW.a + REW.r1, H1 = H0 + REW.hold;
/** the slow pass: (film frame, picture time) knots: 8 f at ~0.25x (the punch-in lands, he walks up behind the bill), the
 *  DROP at ~0.7x, then a decelerating near-freeze on the lowest point under the bill */
/* p4 (QUIZ, audit R8): 8 f walk-up at ~0.6x while the punch-in lands, the lift + DROP at ~1.1x on "mo-" (his head goes
 * under the lowest bill as the word starts), then ~0.45x with the head LOW under the bill through "-ney?" */
const PASS: [number, number][] = [[H0, REW.tS], [H0 + 8, REW.tS + 5], [H0 + 18, REW.duck - 5], [H1, REW.tE]];
/** E3's picture time at film frame f */
const e3T = (f: number) => {
  const x = f - REW.a;
  if (x <= 0) return REW.from;   // (a hard cut: before E3 it is the frame where E2 stopped)
  if (f < H0) { const u = x / REW.r1; return REW.tS + (REW.from - REW.tS) * (1 - u) ** 1.8; }
  if (f < H1) return mono(PASS, f);
  if (f >= TOTAL) return 0;   /* exactly frame 0 (no float dust: the seam check compares cameras bit for bit) */
  const u = c01((f - H1) / REW.r2);
  /* t = tE * (1 - g(u)), g(u) = (3 - e) u^2 + (e - 2) u^3: speed 0 out of the hold, a peak of ~1.5 tE / r2 in the middle,
   * and exactly -1 picture frame per frame at TOTAL (e = r2 / tE), where t = 0 = frame 0 */
  const e = Math.min(1.5, REW.r2 / Math.max(1, REW.tE)), g = (3 - e) * u * u + (e - 2) * u * u * u;
  return REW.tE * (1 - Math.min(1, g));
};
/** the quiz shot that holds picture time t (the rewind passes back through the film's own Q3, Q2, Q1) */
const quizSrc = (t: number) => (t >= S("Q3").a ? SID.Q3 : t >= S("Q2").a ? SID.Q2 : SID.Q1);
/** E3's HOLD as 0..1 (film frame f): 0 while the tape runs fast, 1 through the slow pass (it ramps in over the hold's
 *  first 5 f and out over the first 4 f of the last rewind). LOOK: the clean full colour, the ring and the dimmed
 *  surround ride on this; the tape look (scan lines, chroma split, rewind glyph) on tapeAt(f).rewind only. */
export const e3Hold = (f: number) => (f < H0 - 0.5 || f >= TOTAL ? 0 : sm((f - H0 + 1) / 5) * (1 - sm((f - H1) / 4)));
/** E3's punch-in drive 0..1 (story.ts zoomAt scales the picture 1 + 0.5 x this about a pivot that centres the three
 *  bills + the ducking head): in over the hold's first 8 f, out over the last rewind, exactly 0 from TOTAL - 2 */
export const e3Punch = (f: number) => (f < H0 || f >= TOTAL - 2 ? 0 : sm((f - H0) / 8) * (1 - sm((f - H1) / Math.max(3, REW.r2 - 3))));

// ---------------- the map ----------------
const raw = (id: number, f: number): { src: number; t: number } => {
  if (id === SID.S20) return { src: id, t: slowT(f) };
  if (id === SID.E1) return { src: SID.Q1, t: e1T(f) };
  if (id === SID.E2) return { src: SID.Q3, t: e2T(f) };
  if (id === SID.E3) { const t = e3T(f); return { src: quizSrc(t), t }; }
  return { src: id, t: f };
};
/** what film shot `id` shows at film frame f (any f inside its life, s.a - XPAD .. s.b + XPAD) */
export const remapAt = (id: number, f: number): Remap => {
  const r = raw(id, f), r1 = raw(id, f + 0.5), r0 = raw(id, f - 0.5), rate = r1.t - r0.t;
  const hold = id === SID.E3 && f >= H0 && f < H1;
  return { ...r, rate, freeze: hold, rewind: id === SID.E3 && !hold && f >= REW.a };
};
/** picture time of shot id at film frame f (animators: key slowed / replayed shots with pt(id, BEAT.word)) */
export const pt = (id: number, f: number) => raw(id, f).t;
/** the film frame at which shot id's picture time reaches t (inverse of pt for the monotone shots; S20 only) */
export const filmFrameOf = (id: number, t: number) => {
  const s = SHOTS[id - 1]; let lo = s.a - 10, hi = s.b + 10;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (pt(id, m) < t) lo = m; else hi = m; }
  return (lo + hi) / 2;
};

/** the tape look's drive for LOOK (E3 only; f = the FILM frame): `rewind` = 0..1 strength of the TAPE look (the two fast
 *  parts only: in over 3 f at the cut, out over the 3 f before the hold; in again over 3 f after it, out over the last
 *  6 f before TOTAL); `freeze` = the hold (the slow pass: clean colour); `ring` = the gold ring's draw (0..1: on over the
 *  hold's first 8 f, so it is complete before "money?"; it fades over the last rewind; 0 from TOTAL - 4); `hold` = e3Hold */
export const tapeAt = (f: number) => {
  if (f < REW.a - 0.5 || f >= TOTAL) return { rewind: 0, freeze: false, ring: 0, hold: 0 };
  const freeze = f >= H0 && f < H1;
  const rewind = freeze ? 0 : f < H0 ? sm((f - REW.a + 1) / 3) * (1 - sm((f - (H0 - 3)) / 3)) : sm((f - H1 + 1) / 3) * (1 - sm((f - (TOTAL - 7)) / 6));
  const ring = f < H0 ? 0 : sm((f - H0) / 8) * (1 - sm((f - H1) / Math.max(4, TOTAL - 4 - H1)));
  return { rewind, freeze, ring, hold: e3Hold(f) };
};
export const isRewind = (f: number) => tapeAt(f).rewind > 0.01;

// ---------------- the film context (which FILM shot / frame a layer belongs to, while it is drawn) ----------------
/** set by Clown.tsx right before each layer's world.update (synchronous), so a set or cast module drawing src's world can
 *  still know it is being shown as, e.g., E3 (LOOK's ring) */
export const FILM = { id: 1, f: 0 };
export const setFilm = (id: number, f: number) => { FILM.id = id; FILM.f = f; };

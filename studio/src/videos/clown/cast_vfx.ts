// THE CARTOON EFFECTS KIT of "The Clown Nobody Saw" (owner DESIGN, p3). Every effect is a PURE function of the frame (no
// state: loop-safe, remap-safe, chunk-safe) that DRAWS into the 600 x 1000 card design space (the same space the figures
// use: soles at y 975, 1 unit = 2.16 mm, u = 1 % of a head width = 2.4 units), around an anchor point `at`.
//
// HOW TO PUT ONE IN A SHOT (two ways, both use the existing card paths):
//   (a) on the figure's OWN card, after the figure:   E.putFig(out, cam, key, pos, (p) => { PPL.drawDude(p, P); VFX.notes(p, f, A.head) })
//   (b) on a see-through card at the SAME pos (bright, unlit, soft edges: dust, trails, flash, anything that should not
//       take the card light):   E.putGhost(out, cam, `vfx|dust|${f}`, pos, (p) => VFX.dust(p, f, f0, [300, 975]), scale)
//   The card key must change every frame the effect changes (put f, or the effect's local time, in the key).
//   Anchors (head, crown, mouth, hands, horn bell...) in card units: PPL.anchors("dude", P) / PPL.clownAnchors(P).
// Sizes: `u` scales everything (default 2.4 = an adult's head unit; the clown's card: pass A.u). At 1080 wide with a figure
// ~45 % of the frame height 1 u is ~2.8 px, so a 40 u "!" is ~110 px; with a mid-ground figure (400 px) it is ~50 px.
// Timing: t = f - f0 is the effect's own clock; every effect is invisible before f0 and after its life.
// QUIZ RULE: `blah` (the phone chatter bubble) and anything else that marks a phone person is for STORY shots only, never
// Q1-Q3. Nothing here draws near an ear by itself.
import { Pen, P2, INK, mix, shade } from "./toon";

const TAU = Math.PI * 2;
const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
const eo = (x: number) => { const c = clamp(x, 0, 1); return 1 - (1 - c) ** 3; };
const hash = (a: number, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
/** draw fn at alpha a (multiplies the current alpha) */
const A = (p: Pen, a: number, fn: () => void) => { if (a <= 0.01) return; const g = p.g; g.save(); g.globalAlpha *= Math.min(1, a); fn(); g.restore(); };
/** a pop scale: 0 -> 1 + over in `up` frames, settles to 1 over `settle` */
const pop = (t: number, up = 4, over = 0.3, settle = 6) => (t < 0 ? 0 : t < up ? (1 + over) * eo(t / up) : 1 + over * Math.max(0, 1 - (t - up) / settle));
const ellP = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 20): P2[] => { const o: P2[] = [], r = rad(rot); for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = rx * Math.cos(a), y = ry * Math.sin(a); o.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]); } return o; };
const rotP = (pts: P2[], d: number, c: P2): P2[] => { const a = rad(d), cs = Math.cos(a), sn = Math.sin(a); return pts.map(([x, y]) => [c[0] + (x - c[0]) * cs - (y - c[1]) * sn, c[1] + (x - c[0]) * sn + (y - c[1]) * cs]); };
const star = (cx: number, cy: number, r: number, n = 4, rot = 0, inner = 0.4): P2[] => { const o: P2[] = []; for (let i = 0; i < 2 * n; i++) { const a = rad(rot) + (i / (2 * n)) * TAU - Math.PI / 2, q = i % 2 ? r * inner : r; o.push([cx + q * Math.cos(a), cy + q * Math.sin(a)]); } return o; };
/** a puffy cloud blob (a circle with 7 bumps) */
const cloud = (cx: number, cy: number, r: number, seed: number, flat = 1): P2[] => { const o: P2[] = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU, q = r * (1 + 0.16 * Math.sin(7 * a + seed * 9)); o.push([cx + q * Math.cos(a), cy + q * Math.sin(a) * flat]); } return o; };
const heart = (cx: number, cy: number, r: number): P2[] => { const o: P2[] = []; for (let i = 0; i < 30; i++) { const t = (i / 30) * TAU; o.push([cx + (r * 16 * Math.sin(t) ** 3) / 16, cy - (r * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))) / 16]); } return o; };
type O = { u?: number; col?: string };
const U = (o?: O) => o?.u ?? 2.4;

// ================================================================== GROUND + MOTION
/** DUST PUFFS at the feet / the tyre (`at` = the ground point). kind: "skid" (a brake: 5 puffs thrown BEHIND, dir = the
 *  travel's screen side +1 / -1; life ~24 f), "stop" (a hard stop: 3 puffs both sides, 16 f), "land" (a jump landing: a low
 *  ring of 6, 14 f), "steps" (quick steps: one small puff every 6 f from f0 until o.f1). Use it for: the clown's brake at
 *  the lens, the interviewer's step-in stop, the spin's plant, a skater's landing, the tiptoe sneak */
export const dust = (p: Pen, f: number, f0: number, at: P2, o: O & { kind?: "skid" | "stop" | "land" | "steps"; dir?: number; f1?: number } = {}) => {
  const u = U(o), t = f - f0, kind = o.kind ?? "stop", dir = o.dir ?? 1, col = o.col ?? "#f3ebdc";
  const puff = (x: number, y: number, r: number, a: number, seed: number) => A(p, a, () => { p.poly(cloud(x, y, r, seed, 0.78), col, 1.3 * u, mix(INK, col, 0.35)); p.arc(x - 0.2 * r, y - 0.25 * r, 0.5 * r, 0.36 * r, 200, 300, 1.2 * u, "#ffffff"); });
  if (kind === "steps") { const f1 = o.f1 ?? f0 + 60; for (let k = Math.floor((Math.min(f, f1) - f0) / 6); k >= 0 && f - (f0 + 6 * k) < 10; k--) { const tt = f - (f0 + 6 * k); if (tt < 0) continue;
      puff(at[0] - dir * (6 + 1.2 * tt) * u + (k % 2 ? 8 : -8) * u, at[1] - (3 + 0.7 * tt) * u, (5.5 + 0.8 * tt) * u, 0.85 * (1 - tt / 10), k); } return; }
  if (t < 0) return;
  const N = kind === "skid" ? 5 : kind === "land" ? 6 : 3, life = kind === "skid" ? 16 : kind === "land" ? 14 : 16;
  for (let i = 0; i < N; i++) {
    const tt = t - (kind === "skid" ? 1.8 * i : 0); if (tt < 0 || tt > life) continue; const k = tt / life, e = eo(k);
    const sd = kind === "skid" ? -dir : kind === "land" ? Math.cos((i / N) * TAU + 0.4) : i - 1, spread = kind === "skid" ? 18 + 12 * i : kind === "land" ? 34 : 22;
    puff(at[0] + sd * spread * e * u, at[1] - (4 + (kind === "land" ? 4 * Math.abs(Math.sin((i / N) * TAU)) : 9 + 3 * (i % 2)) * e) * u, (8 + 13 * e + 2 * (i % 2)) * u * (kind === "land" ? 0.75 : 1), 0.92 * (1 - k * k), i + 3);
  }
  if (kind === "land" && t < 5) for (const sd of [-1, 1]) A(p, 1 - t / 5, () => p.stroke([[at[0] + sd * (16 + 4 * t) * u, at[1] - 5 * u], [at[0] + sd * (26 + 5 * t) * u, at[1] - 9 * u]], 2 * u, INK));
};
/** SPEED LINES behind a fast mover (`at` = the mover's centre; dir = its travel's screen side). n streaks over a band h u
 *  tall, re-drawn every 2 f so they flicker; white with a plum edge so they read on brick and on sky. len in u. Use it for:
 *  the clown's ride-bys, the jogger, a dash. Give it o.k (0..1) to fade it in / out with the speed */
export const speedLines = (p: Pen, f: number, at: P2, o: O & { dir?: number; len?: number; n?: number; h?: number; k?: number } = {}) => {
  const u = U(o), dir = o.dir ?? 1, n = o.n ?? 7, h = o.h ?? 150, len = o.len ?? 70, k = o.k ?? 1, sd = Math.floor(f / 2);
  A(p, k, () => { for (let i = 0; i < n; i++) { const y = at[1] + (hash(sd, i) - 0.5) * h * u, x0 = at[0] - dir * (28 + 30 * hash(sd, i + 9)) * u, L = len * (0.5 + 0.7 * hash(sd, i + 5)) * u, w = (1.6 + 1.6 * hash(sd, i + 2)) * u;
      const pts: P2[] = [[x0, y], [x0 - dir * L, y]]; p.stroke(pts, w + 1.5 * u, mix(INK, "#7a5a90", 0.35)); p.stroke(pts, w, o.col ?? "#ffffff"); } });
};
/** a SOFT SMEAR TRAIL behind a fast mover: fading ovals in col (default the clown's yellow + purple), len u long, h u
 *  tall. Draw it on a ghost card BEHIND the mover (see the header). Use it for: the clown's ride-bys, a whip past the lens */
export const smearTrail = (p: Pen, _f: number, at: P2, o: O & { dir?: number; len?: number; h?: number; col2?: string; k?: number } = {}) => {
  const u = U(o), dir = o.dir ?? 1, len = o.len ?? 110, h = o.h ?? 120, k = o.k ?? 1;
  for (let i = 0; i < 6; i++) A(p, 0.3 * k * (1 - i / 6), () => p.poly(ellP(at[0] - dir * (18 + (i * len) / 6) * u, at[1], (len / 5) * u, (h / 2) * (1 - 0.1 * i) * u, 0, 18), i % 2 ? o.col2 ?? "#a436f2" : o.col ?? "#ffd21a", 0));
};

// ================================================================== HITS + REACTIONS
/** IMPACT STARS: n stars fly out of `at` spinning (14 f). Use it for: a high-five, a bump, the peg's snap, a honk in a face */
export const impactStars = (p: Pen, f: number, f0: number, at: P2, o: O & { n?: number } = {}) => {
  const u = U(o), t = f - f0, n = o.n ?? 4; if (t < 0 || t > 14) return;
  for (let i = 0; i < n; i++) { const a = rad(-150 + (300 * i) / Math.max(1, n - 1) + 20 * hash(i, 3)), d = (10 + 34 * eo(t / 9)) * u, r = (7 - 0.35 * t) * u * (0.8 + 0.4 * hash(i, 1));
    A(p, 1 - sm((t - 9) / 5), () => p.poly(star(at[0] + d * Math.cos(a), at[1] + d * Math.sin(a) * 0.8, r, 4, 12 * t + 40 * i), o.col ?? "#ffd21a", 1.5 * u)); }
};
/** a POP BURST: a spiky white burst that pops with overshoot (4 f up, 5 f hold, 4 f out). Use it for: any small hit / snap /
 *  a number landing; put impactStars on top for a bigger hit */
export const popBurst = (p: Pen, f: number, f0: number, at: P2, o: O & { r?: number } = {}) => {
  const u = U(o), t = f - f0; if (t < 0 || t > 13) return; const s = pop(t, 3, 0.35, 4) * (o.r ?? 20) * u, pts: P2[] = [];
  for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU + 0.2, q = i % 2 ? s * 0.55 : s * (0.9 + 0.2 * hash(i, 7)); pts.push([at[0] + q * Math.cos(a), at[1] + q * Math.sin(a)]); }
  A(p, 1 - sm((t - 9) / 4), () => p.poly(pts, o.col ?? "#ffffff", 1.8 * u));
};
/** SURPRISE LINES: a burst of short tapered ticks round a head (`at` = the head centre, r = how far out in u, default 64).
 *  They jump out in 3 f, hold, fade by 18 f. Use it for: a jaw drop, the spin's reaction, "what clown?" */
export const surpriseLines = (p: Pen, f: number, f0: number, at: P2, o: O & { r?: number; n?: number; life?: number } = {}) => {
  const u = U(o), t = f - f0, life = o.life ?? 18, n = o.n ?? 9; if (t < 0 || t > life) return;
  const r0 = ((o.r ?? 64) + 8 * eo(t / 3)) * u;
  A(p, 1 - sm((t - life + 6) / 6), () => { for (let i = 0; i < n; i++) { const a = rad(-205 + (230 * i) / (n - 1)), L = (i % 2 ? 9 : 15) * u, c = Math.cos(a), s = Math.sin(a);
      const pts: P2[] = [[at[0] + r0 * c, at[1] + r0 * s], [at[0] + (r0 + L) * c, at[1] + (r0 + L) * s]]; p.stroke(pts, 4.6 * u, INK); p.stroke(pts, 2.2 * u, o.col ?? "#fff2a8"); } });
};
/** a "!" or "?" (o.ch) that POPS above a head with overshoot, tilts, bobs, and fades (o.hold frames, default 22). `at` =
 *  where its bottom sits (the crown + ~12 u). Size ~40 u tall. Use it for: "!" the spin / a honk in a face; "?" the puzzled
 *  "Sorry... what clown?" */
export const bang = (p: Pen, f: number, f0: number, at: P2, o: O & { ch?: string; hold?: number; size?: number } = {}) => {
  const u = U(o), t = f - f0, hold = o.hold ?? 22, ch = o.ch ?? "!"; if (t < 0 || t > hold + 5) return;
  const s = pop(t, 4, 0.35, 6) * (o.size ?? 40) * u, col = o.col ?? (ch === "?" ? "#ffd21a" : "#e9342c"), x = at[0], y = at[1] - s * 0.5 - 1.5 * u * Math.sin(TAU * t / 18), ang = rad(-8 + 5 * Math.sin(TAU * t / 22));
  A(p, 1 - sm((t - hold) / 5), () => { for (let k = 0; k < 10; k++) p.text(ch, x + 2.4 * u * Math.cos((k * TAU) / 10), y + 2.4 * u * Math.sin((k * TAU) / 10), s, INK, "Arial Black", "center", ang);
    p.text(ch, x, y, s, col, "Arial Black", "center", ang); p.text(ch, x - 0.9 * u, y - 0.9 * u, s * 0.96, mix(col, "#ffffff", 0.35), "Arial Black", "center", ang); p.text(ch, x, y, s * 0.94, col, "Arial Black", "center", ang); });
};
/** SWEAT DROPS: n light-blue teardrops pop at `at` (the temple) and slide down (each 16 f), repeating every 24 f until
 *  o.f1 (default one round). Use it for: the phone guy caught out, the professor sneaking, a near miss */
export const sweat = (p: Pen, f: number, f0: number, at: P2, o: O & { n?: number; f1?: number; side?: number } = {}) => {
  const u = U(o), n = o.n ?? 1, f1 = o.f1 ?? f0 + 1, sd = o.side ?? 1;
  for (let r = 0; f0 + 24 * r < f1; r++) for (let i = 0; i < n; i++) { const t = f - (f0 + 24 * r) - 3 * i; if (t < 0 || t > 16) continue;
    const s = pop(t, 2, 0.3, 3) * (6.6 - 1.0 * i) * u, x = at[0] + sd * (5 * i + 0.3 * t) * u, y = at[1] + (6 * i + 0.55 * t) * u;
    A(p, 1 - sm((t - 11) / 5), () => { p.poly([[x, y - 2.3 * s], [x + s, y + 0.2 * s], [x + 0.7 * s, y + 0.9 * s], [x, y + 1.2 * s], [x - 0.7 * s, y + 0.9 * s], [x - s, y + 0.2 * s]], "#8fd0f0", 1.3 * u); p.arc(x - 0.25 * s, y + 0.1 * s, 0.4 * s, 0.6 * s, 150, 250, 1.1 * u, "#ffffff"); }); }
};
/** TEARS OF LAUGHTER: little blue drops squirt in arcs from both eye corners (`at` = the head centre), a new pair every
 *  7 f while o.f1 (default f0 + 30) lasts. Use it for: the friends' "He was amazing!", the relieved clown */
export const laughTears = (p: Pen, f: number, f0: number, at: P2, o: O & { f1?: number } = {}) => {
  const u = U(o), f1 = o.f1 ?? f0 + 30;
  for (let k = 0; f0 + 7 * k < f1; k++) { const t = f - (f0 + 7 * k); if (t < 0 || t > 12) continue;
    for (const sd of [-1, 1]) { const x = at[0] + sd * (24 + 3.2 * t) * u, y = at[1] - 2 * u - 2.4 * t * u + 0.26 * t * t * u, r = (6.4 - 0.2 * t) * u;
      A(p, 1 - sm((t - 8) / 4), () => { p.poly(ellP(x, y, r * 0.8, r, sd * 30, 12), "#8fd0f0", 1.1 * u); p.dot(x - 0.3 * r, y - 0.3 * r, 0.3 * r, "#ffffff"); }); } }
};
/** HEARTS: n hearts pop at `at` and float up with a sway (30 f each, staggered 5 f). Use it for: the clown's blown kiss, the
 *  friend who loved him */
export const hearts = (p: Pen, f: number, f0: number, at: P2, o: O & { n?: number; rise?: number } = {}) => {
  const u = U(o), n = o.n ?? 3;
  for (let i = 0; i < n; i++) { const t = f - f0 - 5 * i; if (t < 0 || t > 30) continue; const s = pop(t, 4, 0.4, 5) * (9 + 3 * hash(i, 4)) * u;
    const x = at[0] + (14 * (hash(i, 1) - 0.5) + 6 * Math.sin(TAU * t / 20 + i)) * u, y = at[1] - (o.rise ?? 1.6) * t * u - 6 * i * u;
    A(p, 1 - sm((t - 22) / 8), () => { p.poly(heart(x, y, s), o.col ?? "#ff4f8a", 1.5 * u); p.arc(x - 0.4 * s, y - 0.35 * s, 0.3 * s, 0.25 * s, 190, 290, 1.1 * u, "#ffd0e0"); }); }
};
/** the ANGER mark: a red cross-vein that throbs at `at` (the temple) + two steam squiggles off the top. Continuous: give
 *  o.k 0..1 to fade it. Use it for: an annoyed walker the clown nearly hits */
export const anger = (p: Pen, f: number, at: P2, o: O & { k?: number } = {}) => {
  const u = U(o), s = (10 + 1.6 * Math.sin(TAU * f / 8)) * u;
  A(p, o.k ?? 1, () => { for (let q = 0; q < 4; q++) { const a = q * 90 + 45, c: P2 = [at[0] + 0.55 * s * Math.cos(rad(a)), at[1] + 0.55 * s * Math.sin(rad(a))]; const arc: P2[] = []; for (let i = 0; i <= 6; i++) { const b = rad(a + 180 - 55 + (110 * i) / 6); arc.push([c[0] + 0.62 * s * Math.cos(b), c[1] + 0.62 * s * Math.sin(b)]); } p.stroke(arc, 3.6 * u, INK); p.stroke(arc, 1.9 * u, o.col ?? "#e9342c"); }
    for (const sd of [-1, 1]) { const pts: P2[] = []; for (let i = 0; i <= 8; i++) pts.push([at[0] + sd * (12 + 2 * Math.sin(i * 1.5 + f * 0.5)) * u, at[1] - (14 + 2.2 * i) * u]); p.stroke(pts, 1.8 * u, "#ffffff"); } });
};
/** SLEEP "z z z": three z rise from `at` and grow, looping every 48 f. Use it for: the blank "mind elsewhere" body (the hero
 *  in S15 / S20) as a gag variant, a bored pigeon */
export const zzz = (p: Pen, f: number, at: P2, o: O & { k?: number } = {}) => {
  const u = U(o);
  for (let i = 0; i < 3; i++) { const t = (((f + 16 * i) % 48) + 48) % 48, s = (13 + 0.4 * t) * u, x = at[0] + (0.5 * t + 5 * Math.sin(t / 6)) * u, y = at[1] - 1.15 * t * u;
    A(p, (o.k ?? 1) * sm(t / 5) * (1 - sm((t - 36) / 12)), () => { for (let k = 0; k < 8; k++) p.text("z", x + 1.6 * u * Math.cos((k * TAU) / 8), y + 1.6 * u * Math.sin((k * TAU) / 8), s, INK, "Arial Black"); p.text("z", x, y, s, o.col ?? "#ffffff", "Arial Black"); }); }
};
/** a LIGHT BULB that pings on above a head (`at` = its base, ~14 u over the crown): pops with overshoot, 8 rays flash twice,
 *  holds o.hold (default 26 f), fades. Use it for: Hyman's idea on "...and a clown suit" */
export const bulb = (p: Pen, f: number, f0: number, at: P2, o: O & { hold?: number } = {}) => {
  const u = U(o), t = f - f0, hold = o.hold ?? 26; if (t < 0 || t > hold + 6) return;
  const s = pop(t, 4, 0.35, 6), r = 11 * u * s, cx = at[0], cy = at[1] - 16 * u * s, lit = t < 12 ? 0.6 + 0.4 * Math.cos(TAU * t / 6) : 1;
  A(p, 1 - sm((t - hold) / 6), () => {
    A(p, 0.35 * lit, () => p.poly(ellP(cx, cy, 2.3 * r, 2.3 * r, 0, 22), "#fff3a0", 0));
    for (let i = 0; i < 8; i++) { const a = rad(-180 + (180 * i) / 7), d0 = 1.5 * r, d1 = (2.0 + 0.3 * lit) * r; const pts: P2[] = [[cx + d0 * Math.cos(a), cy + d0 * Math.sin(a)], [cx + d1 * Math.cos(a), cy + d1 * Math.sin(a)]]; p.stroke(pts, 3.6 * u, INK); p.stroke(pts, 1.8 * u, "#ffd21a"); }
    p.poly([[cx - 0.5 * r, cy + 0.8 * r], [cx + 0.5 * r, cy + 0.8 * r], [cx + 0.42 * r, cy + 1.45 * r], [cx - 0.42 * r, cy + 1.45 * r]], "#9aa0ae", 1.5 * u);
    p.poly(ellP(cx, cy, r, 1.05 * r, 0, 22), mix("#ffe45a", "#ffffff", 0.25 * lit), 1.8 * u); p.arc(cx - 0.3 * r, cy - 0.3 * r, 0.42 * r, 0.42 * r, 190, 280, 1.5 * u, "#ffffff");
    p.stroke([[cx - 0.3 * r, cy + 0.5 * r], [cx - 0.12 * r, cy], [cx + 0.12 * r, cy + 0.2 * r], [cx + 0.3 * r, cy + 0.5 * r]], 1.2 * u, "#c98a10");
  });
};

// ================================================================== SOUND YOU CAN SEE
/** HONK RINGS, the clown's motif: n bold arcs expand out of the horn's bell (`at`, PPL.clownAnchors(P).horn) along dir (deg,
 *  canvas: -90 = up, 0 = right), each 13 f, 2.5 f apart; cream with an ink edge. Use it for: every honk (with
 *  PPL.clownHonk + PPL.honkJiggle) */
export const honkRings = (p: Pen, f: number, f0: number, at: P2, o: O & { dir?: number; n?: number; r?: number } = {}) => {
  const u = U(o), n = o.n ?? 3, dir = o.dir ?? -45;
  for (let i = 0; i < n; i++) { const t = f - f0 - 2.5 * i; if (t < 0 || t > 13) continue; const r = (12 + (o.r ?? 62) * eo(t / 13)) * u, w = (5.4 - 0.2 * t) * u, pts: P2[] = [];
    for (let k = 0; k <= 10; k++) { const a = rad(dir - 40 + 8 * k); pts.push([at[0] + r * Math.cos(a), at[1] + r * Math.sin(a)]); }
    A(p, 1 - sm((t - 8) / 5), () => { p.stroke(pts, w + 3 * u, INK); p.stroke(pts, w, o.col ?? "#fff2a8"); }); }
};
/** MUSIC NOTES drifting up from headphones (`at` = a cup / the crown): a note every 12 f, each rises 60 u over 36 f with a
 *  sway. Continuous (o.k fades it). Use it for: the headphones dude, the couple sharing earbuds (STORY shots: notes beside
 *  a head are not a phone, but keep them off the five phone people) */
export const notes = (p: Pen, f: number, at: P2, o: O & { k?: number; side?: number } = {}) => {
  const u = U(o), sd = o.side ?? 1;
  for (let i = 0; i < 3; i++) { const t = (((f + 12 * i) % 36) + 36) % 36, n = Math.floor((f + 12 * i) / 36), x = at[0] + sd * (8 + 0.5 * t + 6 * Math.sin(t / 5 + i)) * u, y = at[1] - (4 + 1.7 * t) * u, s = pop(t, 4, 0.3, 4) * 1.5 * u;
    A(p, (o.k ?? 1) * (1 - sm((t - 26) / 10)), () => { const col = o.col ?? ["#8ee03a", "#ffffff", "#ffd21a"][((n + i) % 3 + 3) % 3], two = (n + i) % 2 === 0;
      const stem: P2[] = [[x + 3 * s, y], [x + 3 * s, y - 13 * s]], flag: P2[] = two ? [[x + 3 * s, y - 13 * s], [x + 12 * s, y - 15 * s], [x + 12 * s, y - 2 * s]] : [[x + 3 * s, y - 13 * s], [x + 8 * s, y - 9 * s]];
      for (const [w, c] of [[4.4, INK], [2, col]] as const) { p.stroke(stem, w * s, c); p.stroke(flag, w * s, c); }
      p.poly(ellP(x, y, 4 * s, 3 * s, -20, 12), col, 1.4 * s); if (two) p.poly(ellP(x + 9 * s, y - 2 * s, 4 * s, 3 * s, -20, 12), col, 1.4 * s); }); }
};
/** the "BLAH-BLAH" bubble: a small speech bubble that pulses beside a phone (`at` = just outside the phone, side = which way
 *  it sits), three squiggle lines wriggling inside. STORY SHOTS ONLY (never Q1-Q3: nothing may mark the phone people in the
 *  quiz). o.k fades it. Use it for: S1 the oblivious phone guy, S15 the hero's call */
export const blah = (p: Pen, f: number, at: P2, o: O & { side?: number; k?: number } = {}) => {
  const u = U(o), sd = o.side ?? 1, s = 1.5 * (1 + 0.07 * Math.sin(TAU * f / 9)) * u, cx = at[0] + sd * 20 * s, cy = at[1] - 12 * s;
  A(p, o.k ?? 1, () => { p.poly([[cx - sd * 12 * s, cy + 6 * s], [at[0] + sd * 2 * s, at[1] + 2 * s], [cx - sd * 6 * s, cy + 9 * s]], "#ffffff", 1.5 * u);
    p.poly(ellP(cx, cy, 17 * s, 12 * s, 0, 22), "#ffffff", 1.6 * u); p.poly([[cx - sd * 11.4 * s, cy + 5.4 * s], [at[0] + sd * 4 * s, at[1] + 0.5 * s], [cx - sd * 6.6 * s, cy + 8 * s]], "#ffffff", 0);
    for (let r = 0; r < 3; r++) { const pts: P2[] = [], L = [11, 8, 10][r]; for (let i = 0; i <= 10; i++) pts.push([cx - L * s + ((2 * L * i) / 10) * s, cy + (r - 1) * 5.4 * s + 1.5 * s * Math.sin(i * 1.9 + f * 0.9 + r)]); p.stroke(pts, 1.5 * u, o.col ?? "#5a4a6a"); } });
};
/** a STEAM / BREATH puff: three little clouds leave `at` along dir (deg), swell and fade (18 f). Use it for: a mug in the
 *  call bubble, a sigh, a panting jogger, the balloon's squeal */
export const puff = (p: Pen, f: number, f0: number, at: P2, o: O & { dir?: number } = {}) => {
  const u = U(o), d = rad(o.dir ?? -90);
  for (let i = 0; i < 3; i++) { const t = f - f0 - 3 * i; if (t < 0 || t > 18) continue; const k = t / 18, r = (7 + 12 * eo(k)) * u, x = at[0] + (8 + 36 * eo(k)) * u * Math.cos(d) + 3 * u * Math.sin(t / 3 + i), y = at[1] + (8 + 36 * eo(k)) * u * Math.sin(d);
    A(p, 0.95 * (1 - k * k), () => p.poly(cloud(x, y, r, i + 1), o.col ?? "#ffffff", 1.5 * u, "#9a90b4")); }
};

// ================================================================== THINGS THAT FALL
type Fall = O & { n?: number; w?: number; ground?: number; seed?: number };
/** one falling piece. Ballistic (term 0: vUp u / f up, grav u / f2: confetti), or LIGHT (term > 0: a quick puff up of
 *  vUp u, then a steady fall at term u / f: feathers, paper). It stops on the ground line and stays there */
const faller = (f: number, f0: number, at: P2, i: number, o: Fall, u: number, vUp: number, grav: number, drift: number, term = 0) => {
  const t = f - f0, sd = (o.seed ?? 1) * 17 + i, w = (o.w ?? 200) * u, ground = (o.ground ?? 975) - 3 * u * hash(sd, 4), ph = hash(sd, 3) * TAU, k = 0.5 + hash(sd, 2);
  const yAt = (x: number) => (term > 0 ? at[1] - vUp * k * u * (1 - Math.exp(-x / 5)) + term * (0.75 + 0.5 * hash(sd, 6)) * u * x : at[1] - vUp * k * u * x + 0.5 * grav * u * x * x);
  let tLand = 400; for (let x = 1; x < 400; x++) if (yAt(x) >= ground && (term > 0 || x > (vUp * k) / Math.max(1e-3, grav))) { tLand = x; break; }
  const tt = Math.min(Math.max(t, 0), tLand), vx = ((hash(sd, 1) - 0.5) * w) / (term > 0 ? Math.max(20, tLand) : 11);
  return { x: at[0] + vx * tt * (term > 0 ? 1 : 1 - 0.012 * Math.min(tt, 40)) + drift * u * Math.sin(tt / 6 + ph), y: Math.min(yAt(tt), ground), landed: t >= tLand, spin: tt * (0.25 + 0.3 * hash(sd, 5)) + ph, sd, t };
};
/** a CONFETTI BURST: n pieces (default 46, the clown's purple + yellow + a few red / white) shoot up and out of `at`, flutter
 *  down and SETTLE on the ground line (o.ground, card y; default the soles 975) where they stay. w = spread in u. About
 *  45 f to settle. Use it for: the clown-suit reveal (S5), the end */
export const confetti = (p: Pen, f: number, f0: number, at: P2, o: Fall & { cols?: string[] } = {}) => {
  const u = U(o), n = o.n ?? 46, cols = o.cols ?? ["#a436f2", "#ffd21a", "#a436f2", "#ffd21a", "#e9342c", "#ffffff"]; if (f < f0) return;
  for (let i = 0; i < n; i++) { const q = faller(f, f0, at, i, o, u, 9, 0.32, 5), c = cols[i % cols.length], h = q.landed ? 1.8 : 4.6 * Math.abs(Math.cos(q.spin * 2.2)) + 0.8;
    p.poly(rotP([[q.x - 4.5 * u, q.y - h * u], [q.x + 4.5 * u, q.y - h * u], [q.x + 4.5 * u, q.y + h * u], [q.x - 4.5 * u, q.y + h * u]], q.landed ? 12 * (hash(q.sd, 6) - 0.5) : 60 * Math.sin(q.spin), [q.x, q.y]), c, 0.9 * u, shade(c, 0.55)); }
};
/** PIGEON FEATHERS: n grey feathers (default 6) drift down from `at` with a pendulum sway and settle on o.ground. ~70 f.
 *  Use it for: after a flush (the clown through the flock, the dog's dart) */
export const feathers = (p: Pen, f: number, f0: number, at: P2, o: Fall = {}) => {
  const u = U(o), n = o.n ?? 6; if (f < f0) return;
  for (let i = 0; i < n; i++) { const q = faller(f, f0 + 2 * i, at, i, o, u, 16, 0, 16, 2.4); if (q.t < 0) continue; const a = q.landed ? 80 : 35 * Math.sin(q.spin * 1.3), L = (13 + 5 * hash(q.sd, 8)) * u;
    const pts = rotP([[q.x, q.y - L], [q.x + 0.28 * L, q.y - 0.3 * L], [q.x + 0.2 * L, q.y + 0.6 * L], [q.x, q.y + L], [q.x - 0.2 * L, q.y + 0.6 * L], [q.x - 0.28 * L, q.y - 0.3 * L]], a, [q.x, q.y]);
    p.poly(pts, o.col ?? (i % 2 ? "#c9cdd8" : "#a3a8b6"), 1.1 * u); p.stroke(rotP([[q.x, q.y - 0.8 * L], [q.x, q.y + 1.2 * L]], a, [q.x, q.y]), 0.8 * u, "#6e7384"); }
};
/** a PAPER FLUTTER: n sheets (default 5) burst from `at`, tumble and settle on o.ground (~40 f). Use it for: the extra who
 *  drops papers, the office (Hyman's notes when the door flies open) */
export const paperFlutter = (p: Pen, f: number, f0: number, at: P2, o: Fall = {}) => {
  const u = U(o), n = o.n ?? 5; if (f < f0) return;
  for (let i = 0; i < n; i++) { const q = faller(f, f0, at, i, o, u, 40, 0, 12, 3.4), h = q.landed ? 2 : 7 * Math.abs(Math.cos(q.spin * 1.6)) + 1.2, a = q.landed ? 8 * (hash(q.sd, 6) - 0.5) : 50 * Math.sin(q.spin);
    const r = rotP([[q.x - 6 * u, q.y - h * u], [q.x + 6 * u, q.y - h * u], [q.x + 6 * u, q.y + h * u], [q.x - 6 * u, q.y + h * u]], a, [q.x, q.y]);
    p.poly(r, "#fbf8ef", 1.1 * u); if (h > 4) for (const k of [-0.4, 0.2]) p.stroke(rotP([[q.x - 4 * u, q.y + k * h * u], [q.x + 3 * u, q.y + k * h * u]], a, [q.x, q.y]), 0.7 * u, "#9aa3b8"); }
};

// ================================================================== SHINE
/** SPARKLES / twinkles: n four-point stars blink at seeded spots within r u of `at` (each 16 f, staggered), continuous;
 *  o.f0 starts them, o.k fades them. Use it for: the suit reveal, a proud moment, the bills at the end */
export const sparkles = (p: Pen, f: number, at: P2, o: O & { n?: number; r?: number; f0?: number; k?: number } = {}) => {
  const u = U(o), n = o.n ?? 6, r = (o.r ?? 60) * u; if (o.f0 !== undefined && f < o.f0) return;
  for (let i = 0; i < n; i++) { const t = (((f + 5 * i) % 16) + 16) % 16, c = Math.floor((f + 5 * i) / 16), a = TAU * hash(i, c), d = r * (0.35 + 0.65 * hash(i + 3, c)), s = Math.sin((Math.PI * t) / 16) * (13 + 7 * hash(i, 2)) * u;
    A(p, o.k ?? 1, () => { const x = at[0] + d * Math.cos(a), y = at[1] + d * Math.sin(a) * 0.8; p.poly(star(x, y, s, 4, 0, 0.26), o.col ?? "#fff7c0", 1.2 * u); p.dot(x, y, 0.22 * s, "#ffffff"); }); }
};
/** a CAMERA-FLASH white pop for a comic beat: a soft white disc centred on `at` (r u, default 260 = most of a card) at 85 %
 *  on f0, 45 % on f0 + 1, 12 % on f0 + 2, gone. Draw it on a ghost card in front of the action. Use it for: the suit
 *  reveal's snap, the freeze on the first duck */
export const flash = (p: Pen, f: number, f0: number, at: P2 = [300, 480], o: O & { r?: number } = {}) => {
  const t = f - f0, a = t === 0 ? 0.85 : t === 1 ? 0.45 : t === 2 ? 0.12 : 0; if (a <= 0) return; const u = U(o), g = p.g, r = (o.r ?? 260) * u;
  const gr = g.createRadialGradient(at[0], at[1], 0, at[0], at[1], r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.55, `rgba(255,255,255,${a * 0.7})`); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.save(); g.fillStyle = gr; g.beginPath(); g.arc(at[0], at[1], r, 0, TAU); g.fill(); g.restore();
};
/** MOTION MULTIPLES: draw `fn` n times behind itself, stepped back by dx u along dir, fading (0.45, 0.25, 0.12...), then
 *  once solid. For the spin use PPL.spinAt's smear (built in); use this for anything else that whips (a head turn, the
 *  flung flap, the clown's U-turn). fn draws the figure at its normal place */
export const multiples = (p: Pen, fn: (q: Pen) => void, o: { n?: number; dx?: number; dir?: number; u?: number; k?: number } = {}) => {
  const g = p.g, T = g.getTransform(), cv = document.createElement("canvas"); cv.width = g.canvas.width; cv.height = g.canvas.height;
  const og = cv.getContext("2d")!; og.setTransform(T); fn(new Pen(og));
  const n = o.n ?? 3, step = (o.dx ?? 14) * (o.u ?? 2.4) * Math.abs(T.a) * (o.dir ?? 1), k = o.k ?? 1;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = n; i >= 1; i--) { g.globalAlpha = 0.5 * k * 0.55 ** (i - 1); g.drawImage(cv, -i * step, 0); }
  g.globalAlpha = 1; g.drawImage(cv, 0, 0); g.restore();
};

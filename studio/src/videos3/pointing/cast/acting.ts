// THE ACTING (owner CAST): the film's glue between the BEAT TABLE (beats.ts: data), the MOVES (moves.ts) and the film's
// clock (timing.ts: the voice's words; shots.ts: the shot table).
//   driver / tourist / kid: actBeats() on the beat table. To re-time: nothing (beats follow their words). New script:
//   edit beats.ts, then read beatReport().
//   the dropped / background characters (NY conductor, NY commuter, volunteer, researcher, mum): the first owner's
//   per-shot code below, kept as it was (LEGACY: keyed to script v2 words; a missing word just leaves them in their hold).
// RULE: nothing here reads SHOT_TABLE / the word table at import time (shots -> cams -> sets -> cast is a cycle).
import * as PPL from "../../../videos/clown/cast_people";
import type { Arm, ArmTo } from "../../../videos/clown/cast_people";
import type { Expr, MouthK, P2 } from "../../../videos/clown/toon";
import { SHOT_TABLE } from "../shots";
import { wordF, wordEnd, mouthAt } from "./timing";
import { BEATS } from "./beats";
import { timeBeats, actBeats, walkedM, hookK, pointK, type Resolver, type Timed } from "./moves";
import { gazeTo, mixG, callOut, type ActEnv, type Actor } from "./gesture";
export { callOut, gazeTo, type ActEnv, type Actor, type CallOpt } from "./gesture";
import type { CPose, Who } from "./people";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
const TAU = Math.PI * 2;

// ---------------- shots + words
export const shotAt = (f: number) => SHOT_TABLE.find((s) => f >= s.from && f < s.to) ?? SHOT_TABLE[SHOT_TABLE.length - 1];
const inShot = (f: number, id: string) => { const s = SHOT_TABLE.find((q) => q.id === id); return !!s && f >= s.from - 8 && f < s.to + 8; };
const W = (key: string) => wordF(key);
const WE = (key: string) => wordEnd(key) * 30;

/** a calm single POINT (no call): rise at f0 with the recipe, hold, back at f1; `reach` = the hand goes TO the point
 *  (hover beside a lamp) instead of pointing along it */
const pointAt = (f: number, f0: number, f1: number, aim: P2 | null, rest: ArmTo | P2, o: { reach?: boolean; move?: number; still?: boolean; hs?: number } = {}): Arm => {
  const g = f < f1 ? PPL.gesture(f, f0, { ant: 5, move: o.move ?? 6, over: o.still ? 0.02 : 0.1, settle: 9 }) : 1 - sm((f - f1) / 12);
  const hand = g > 0.45 ? "point" : "ball";
  if (o.reach && aim) return { to: rest, to2: aim, k: g, hand, hs: o.hs ?? 1.15, front: true };
  return aim ? { to: rest, aim, k: g, hand, hs: o.hs ?? 1.15, front: true } : { to: rest, to2: "point", k: g, hand, hs: o.hs ?? 1.15, front: true };
};

// ---------------- life
const life = (f: number, seed: number, amt = 1, seated = false) => {
  const L = PPL.holdLife(f, seed, amt);
  return { ...L, shift: seated ? 0 : L.shift, blink: PPL.blinkAt(f, seed), nod: 0 as number };
};
/** an expression track with the minimum hold (no flicker) */
const faceTrack = (f: number, keys: [number, Expr][]) => { const fa = PPL.faceAt(f, keys.filter((k) => Number.isFinite(k[0])), 12); return { expr: fa.expr, lid: fa.lid }; };
// ================================================================== THE THREE HEROES: the beat table (beats.ts) on the moves (moves.ts)
/** the film's cue resolver: words from the voice timeline (timing.ts), shots from the shot table. LAZY (import cycle rule) */
export const filmResolver = (): Resolver => ({
  word: (k) => wordF(k), wordEnd: (k) => wordEnd(k) * 30,
  shot: (id) => { const s = SHOT_TABLE.find((q) => q.id === id) ?? SHOT_TABLE.find((q) => q.id === "v3_" + id || "v3_" + q.id === id); return s ? [s.from, s.to] : null; },
  shotEnd: (f) => shotAt(Math.max(0, f)).to, shotStart: (f) => shotAt(Math.max(0, f)).from,
});
let _timed: Timed[] | null = null;
/** the film's beats with their frames (resolved on first use, memoised: never at import time) */
export const filmBeats = (): Timed[] => {
  if (!_timed) { _timed = timeBeats(BEATS, filmResolver()); const r = beatReport(); if (r.length) console.warn("cast beats: " + r.join(" | ")); }
  return _timed;
};
/** what does not line up with the current script / voice: beats whose word is missing, calls whose two words are too
 *  close for the ear hold, points under 12 f. Empty = all good. Look at it after every re-time */
export const beatReport = (): string[] => (_timed ?? timeBeats(BEATS, filmResolver())).filter((t) => t.why).map((t) => `${t.b.who}: ${t.why}`);
/** [f0, f1] frames of a character's n-th beat of a move (null: none): for sets that sync a PROP to the acting */
export const beatWin = (who: Who, m: Timed["b"]["m"], n = 0): [number, number] | null => { const t = filmBeats().filter((q) => q.ok && q.b.who === who && q.b.m === m)[n]; return t ? [t.f0, t.f1] : null; };
/** METRES a character has walked at film time t (all its walk beats): move its card along its path by exactly this */
export const walkedAt = (who: Who, t: number): number => { let m = 0; for (const q of filmBeats()) if (q.ok && q.b.who === who && q.b.m === "walk") m += walkedM(t * 30, q.f0, q.f1, q.b.gait); return m; };
/** the suitcase hook at film time t: reach 0..1 (his foot going out to the wheel), drag 0..1 (pulling it in); 0s before */
export const hookAt = (t: number, n = 0): { reach: number; drag: number } => { const w = beatWin("tourist", "hook", n); return w ? hookK(t * 30, w[0]) : { reach: 0, drag: 0 }; };
/** the n-th call of a character at film time t as a number: 1 = the arm is out (pointing), 0 = at rest / back by the
 *  ear, with the snap's overshoot: drive a prop with the call's own clock (the frame-0 glove card: hands.ts lensGlove) */
export const callKAt = (who: Who, t: number, n = 0): number => {
  const q = filmBeats().filter((x) => x.ok && x.b.who === who && x.b.m === "call")[n]; if (!q || !q.call) return 0;
  const late = q.b.m === "call" ? q.b.late ?? (q.b.style === "kid" ? 6 : 0) : 0;
  return callOut(t * 30 - late, q.call, "low").k;
};
/** the same for a character's n-th `point` beat (0 rest .. 1 out) */
export const pointKAt = (who: Who, t: number, n = 0): number => {
  const q = filmBeats().filter((x) => x.ok && x.b.who === who && x.b.m === "point")[n]; if (!q || q.b.m !== "point") return 0;
  return pointK(t * 30, q.f0, q.f1, q.b);
};
const hero = (who: "driver" | "tourist" | "kid"): Actor => (e) => actBeats(who, filmBeats(), e, { mouth: mouthAt(who, e.t).mouth });
export const actDriver = hero("driver"), actKid = hero("kid"), actTourist = hero("tourist");

// ================================================================== LEGACY (script v2, not in the v3 film: kept, not polished)
// ---------------- THE NY CONDUCTOR (upper body in his window)
export const actConductor: Actor = (e) => {
  const f = e.f, L = life(f, 8, 0.6);
  let right: Arm = { to: "low", hand: "flat", hs: 1.2 }, keys: [number, Expr][] = [[0, "deadpan"]], gz = { look: L.look, lookY: L.lookY }, extra: Partial<CPose> = {};
  if (inShot(f, "s10")) { const fy = W("york#2") || W("york"); extra = { tilt: 6 * sm((f - fy + 4) / 10), nod: -1.0 * sm((f - fy) / 8) }; }
  if (inShot(f, "s12")) {
    const fc = W("conductors"), fp = W("point#1") || W("point");
    gz = mixG(gz, gazeTo(e, e.aim), clamp((f - fc + 3) / 3, 0, 1));
    right = pointAt(f, fp - 2, 1e9, e.aim, "low", { hs: 1.3 });
    keys = [[0, "deadpan"], [fc, "squint"], [fp, "stern"]];
    extra = { nod: (L.nod ?? 0) + 1.4 * PPL.bump(f, fc + 8, 4, 6), tilt: 5 };
  }
  if (inShot(f, "s13")) {
    const fn = W("no#1") || W("no"), fd = W("doors#4");
    right = { to: "low", to2: "raise", k: PPL.gesture(f, fn - 2), hand: "point", hs: 1.3, dx: 4 * Math.sin((f - fn) / 7), front: true };
    gz = { look: 1.2 * Math.sin((f - fn) / 14), lookY: -0.1 };
    extra = { tilt: 9 * sm((f - fn) / 12), headTilt: f > fd ? 5 * Math.sin((f - fd) / 6) * Math.exp(-(f - fd) / 26) : 0 };
    keys = [[0, "squint"], [fd, "deadpan"]];
  }
  const fa = faceTrack(f, keys);
  return { ...L, ...gz, ...extra, expr: fa.expr, blink: Math.max(L.blink ?? 0, fa.lid), ...PPL.bodyArms(e.back, right, { to: "low", hand: "flat", hs: 1.2 }), handK: 1.1 };
};

// ================================================================== THE NY COMMUTER (the tunnel gag, muted)
export const actCommuter: Actor = (e) => {
  const f = e.f, L = life(f, 3, 0.7);
  const fd = W("doors#3"), fo = W("opening"), fi = W("in#2"), ft = W("tunnels");
  let gz = gazeTo(e, e.aim), keys: [number, Expr][] = [[0, "blank"], [fi, "puzzled"], [ft, "deadpan"]];
  const lookDown = f >= fi && f < ft - 2;
  if (lookDown) gz = { look: 0.2, lookY: 1.1 };
  const slow = (f0: number) => clamp(1 - Math.abs(f - f0 - 5) / 6, 0, 1);
  const blink = Math.max(L.blink ?? 0, slow(fo + 8), slow(ft + 10));
  const pole: Arm = { to: e.restL ?? "raise", hand: "grip", hs: 1.2 };
  const phone: Arm = { to: lookDown ? "chest" : "hang", to2: lookDown ? [300, 440] as P2 : undefined, k: 1, hand: "grip", prop: { k: "phone", col: "#e9342c" }, hs: 1.2, dx: lookDown ? 3 * Math.sin((f - fi) / 3) : 0 };
  const fa = faceTrack(f, keys);
  return { ...L, ...gz, tilt: (L.tilt ?? 0) + 6 * sm((f - fd) / 14), expr: fa.expr, blink: Math.max(blink, fa.lid), ...PPL.bodyArms(e.back, phone, pole), handK: 1.1 };
};

// ================================================================== THE LAB
export const actVolunteer: Actor = (e) => {
  const t = e.t, f = e.f, L = life(f, 6, 0.6, true);
  const fe = W("every"), fl = W("looking"), fth = W("they"), fo = W("one#2");
  const press = (f0: number) => PPL.gestureBack(f, f0 - 4, f0 + 8);
  let right: Arm = { to: e.restR ?? "belly", to2: e.aim ?? "point", k: 0.55, hand: "point", hs: 1.25, front: true };
  let keys: [number, Expr][] = [[0, "focusB"]], extra: Partial<CPose> = {};
  if (inShot(f, "s17")) {
    if (f < fth) { const k = Math.max(press(fe), press(fl)); right = { to: e.restR ?? "belly", to2: e.restL ?? e.aim ?? "point", k: 0.55 + 0.45 * k, hand: "point", hs: 1.25, front: true };
      keys = [[0, "focusB"], [fe + 6, "grimace"], [fe + 26, "focusB"], [fl + 6, "grimace"]]; }
    else { right = pointAt(f, fth - 2, fo + 6, e.look ?? e.aim, e.restR ?? "belly", { hs: 1.3 }); keys = [[0, "brightO"], [fo, "proudB"]];
      extra = { nod: (L.nod ?? 0) + 1.6 * PPL.bump(f, fo + 2, 5, 7), mouth: f < fo ? (Math.floor(f / 4) % 2 ? "vA" : "vO") as MouthK : undefined }; }
  }
  const gz = gazeTo(e, e.look ?? e.aim);
  const fa = faceTrack(f, keys);
  void t;
  return { ...L, ...gz, ...extra, expr: fa.expr, blink: Math.max(L.blink ?? 0, fa.lid), seat: e.seat, ...PPL.bodyArms(e.back, right, { to: "seat", hand: "ball", hs: 1.2 }), handK: 1.1 };
};
export const actResearcher: Actor = (e) => {
  const f = e.f, L = life(f, 9, 0.7);
  const fl = W("lab"), fd = W("loud");
  let pen: Arm = { ...PPL.writeArm(f), hs: 1.15 }, keys: [number, Expr][] = [[0, "gazeFocus"]], hold: CPose["hold"];
  if (inShot(f, "s16") && f > fl - 6 && f < fl + 40) { pen = { to: "chest", to2: "show", k: PPL.gestureBack(f, fl - 4, fl + 30), hand: "grip", hs: 1.2 }; hold = [{ k: "stopwatch", side: e.back ? -1 : 1, open: (f - fl) * 0.2 }]; keys = [[0, "polite"]]; }
  if (inShot(f, "s17") && f > fd - 4) { keys = [[0, "gazeFocus"], [fd + 4, "content"]]; pen = { ...PPL.writeArm(f), dy: -6 * PPL.bump(f, fd, 3, 5), dx: 5 * PPL.bump(f, fd + 2, 3, 4), hs: 1.15 }; }
  const fa = faceTrack(f, keys);
  return { ...L, expr: fa.expr, blink: Math.max(L.blink ?? 0, fa.lid), look: (L.look ?? 0) * 0.5, lookY: 0.6, hold, ...PPL.bodyArms(e.back, pen, { ...PPL.clipboardArm(-8), hs: 1.15 }), handK: 1.1 };
};
export const actMum: Actor = (e) => {
  const f = e.f, L = life(f, 5, 0.6);
  return { ...L, expr: PPL.faceAt(f, [[0, "polite"], [W("fan") + 6, "brightGrin"], [W("fan") + 60, "polite"]], 12).expr, ...gazeTo(e, e.look ?? e.aim, 0.8),
    ...PPL.bodyArms(e.back, e.restR ? { to: e.restR, hand: "flat", hs: 1.1 } : { to: "hang", hand: "ball" }, { to: "strap", hand: "grip" }) };
};

/** a pose with no NaN in it: a legacy actor whose cue word is not in the script computes NaN gesture values; here they
 *  become 0 / dropped, so the character simply stays in its living hold instead of losing an arm */
const clean = (P: CPose): CPose => {
  const fix = (o: Record<string, unknown>): Record<string, unknown> => {
    const r: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === "number") { if (Number.isFinite(v)) r[k] = v; else if (k === "k" || k === "dx" || k === "dy" || k === "ang") r[k] = 0; }
      else if (Array.isArray(v)) { if (!v.some((x) => typeof x === "number" && !Number.isFinite(x))) r[k] = v; }
      else if (v && typeof v === "object") r[k] = fix(v as Record<string, unknown>);
      else r[k] = v;
    }
    return r;
  };
  return fix(P as unknown as Record<string, unknown>) as unknown as CPose;
};
const LEGACY: Partial<Record<Who, Actor>> = { ny_conductor: actConductor, ny_commuter: actCommuter, volunteer: actVolunteer, researcher: actResearcher, kid_mum: actMum };
/** the actor of a character: the BEAT TABLE when the active table has rows for it (the three heroes; any other
 *  character joins by simply getting rows in beats.ts), else its legacy per-shot code (NaN-safe), else a living hold */
export const actorOf = (who: Who, seed: number): Actor => {
  if (BEATS.some((b) => b.who === who)) return (e) => actBeats(who, filmBeats(), e, who === "driver" || who === "tourist" || who === "kid" ? { mouth: mouthAt(who, e.t).mouth } : undefined);
  const L = LEGACY[who]; if (L) return (e) => clean(L(e));
  return actIdle(seed);
};
/** every main character's actor (kept for older callers: prefer actorOf) */
export const ACTORS: Partial<Record<Who, Actor>> = { driver: actDriver, kid: actKid, tourist: actTourist, ...LEGACY };
/** a plain moving hold for anyone without a script */
export const actIdle = (seed: number): Actor => (e) => ({ ...life(e.f, seed, 0.8, e.seat !== undefined), expr: "polite", seat: e.seat, ...gazeTo(e, e.look ?? e.aim, 0.6) });
void TAU;

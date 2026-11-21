// THE v4 CLOCK of 'pointing' (DIRECTOR). Turns THE VOICE into frames: every spoken word of the v4 script with its time,
// every CUT as a rule on words (shot_plan.ts), TOTAL. Imports only data files (script, plan_words, words, shot_plan), so
// any set, camera or cast file may import it at top level. The v3 clock (../timeline.ts) is untouched.
// Source of the word times: words.ts (VOICE, the real voice) when it has words, else plan_words.ts (the script's plan).
import { LINES, SCRIPT_SOURCE, type CapStyle } from "./script";
import { PLAN_WORDS } from "./plan_words";
import { WORDS } from "./words";
import { SHOT_PLAN, type ShotPlan } from "./shot_plan";

export const FPS = 30;
export { LINES, SCRIPT_SOURCE };
export type { CapStyle };

// ---------------------------------------------------------------- the words of the script, timed
const SYN: Record<string, string> = { "1000": "thousand", "1": "one", "6": "six", "12": "twelve", "5": "five", "3": "three", "0": "zero" };
/** a word's key: lower case, letters + digits + apostrophe (numerals map to their word) */
export const norm = (w: string) => { const k = w.toLowerCase().replace(/[^a-z0-9']/g, ""); return SYN[k] ?? k; };
export type Tok = { w: string; key: string; n: number; who: string; line: string; li: number; i: number; s: number; e: number;
  /** where the time comes from: the real voice, the plan, or derived (a word the voice file lacks) */
  src: "voice" | "plan" | "derived" };

const build = (): { toks: Tok[]; notes: string[] } => {
  const toks: Tok[] = [], notes: string[] = [], count: Record<string, number> = {};
  LINES.forEach((L, li) => {
    for (const raw of L.text.split(/\s+/).filter(Boolean)) {
      const k = norm(raw); if (!k) continue;
      count[k] = (count[k] ?? 0) + 1;
      toks.push({ w: raw, key: `${k}#${count[k]}`, n: count[k], who: L.who, line: L.id, li, i: toks.length, s: NaN, e: NaN, src: "plan" });
    }
  });
  const byLine = new Map<string, Tok[]>();
  for (const t of toks) byLine.set(t.line, [...(byLine.get(t.line) ?? []), t]);
  // 1) the plan (always: also the fallback for anything the voice file lacks)
  const plan = new Map<Tok, { s: number; e: number }>();
  for (const [line, ts] of byLine) {
    const P = PLAN_WORDS.filter((p) => p.line === line);
    if (P.length !== ts.length) notes.push(`plan_words.ts has ${P.length} words for ${line}, the script has ${ts.length}: re-run make_v4_script.py`);
    ts.forEach((t, k) => { const p = P[Math.min(k, P.length - 1)]; if (p) { plan.set(t, { s: p.s, e: p.e }); t.s = p.s; t.e = p.e; } });
  }
  if (!WORDS.length) return { toks, notes };
  // 2) the REAL voice, line by line, in order (the v3 matcher: in-order alignment, numerals, merged tokens)
  const V = WORDS.map((w) => ({ k: norm(w.w), s: w.s, e: w.e, raw: w.w }));
  let j = 0, shift = 0;
  const place = (ts: Tok[]): boolean => {
    const align = (a0: number) => { let a = a0, sc = 0; const hit: (number | null)[] = [];
      for (const t of ts) { let f: number | null = null; for (let look = a; look < Math.min(V.length, a + 3); look++) if (V[look].k === norm(t.w)) { f = look; break; } hit.push(f); if (f !== null) { a = f + 1; sc++; } }
      return { hit, end: a, sc }; };
    let best = -1, bestScore = 0, bestHit: (number | null)[] = [], bestEnd = j;
    for (let a = j; a <= Math.min(V.length - 1, j + 12); a++) { const r = align(a); if (r.sc > bestScore) { bestScore = r.sc; best = a; bestHit = r.hit; bestEnd = r.end; } }
    if (best < 0 || bestScore < Math.max(1, Math.ceil(ts.length * 0.6))) return false;
    const hit = bestHit;
    ts.forEach((t, q) => { const f = hit[q]; if (f !== null) { t.s = V[f].s; t.e = V[f].e; t.src = "voice"; } });
    ts.forEach((t, q) => {   // a word swallowed by the next word's numeral token ("a thousand" = "1,000")
      const f = q + 1 < ts.length ? hit[q + 1] : null;
      if (hit[q] !== null || f === null || !/[0-9]/.test(V[f].raw)) return;
      const cut = V[f].s + 0.3 * (V[f].e - V[f].s); t.s = V[f].s; t.e = cut; ts[q + 1].s = cut; t.src = "voice"; hit[q] = -1;
    });
    ts.forEach((t, q) => {   // a word the voice file lacks: its planned offset from the nearest matched neighbour
      if (hit[q] !== null) return;
      const near = ts.map((x, r) => ({ x, r })).filter(({ r }) => hit[r] !== null).sort((u, v) => Math.abs(u.r - q) - Math.abs(v.r - q))[0];
      if (near) { const d = near.x.s - plan.get(near.x)!.s, p = plan.get(t)!; t.s = p.s + d; t.e = p.e + d; t.src = "derived"; }
      notes.push(`"${t.w}" (${t.line}) is not in words.ts: placed from the plan`);
    });
    j = bestEnd; return true;
  };
  for (const [line, ts] of byLine) {
    if (place(ts)) { const last = ts[ts.length - 1]; shift = last.e - plan.get(last)!.e; }
    else { for (const t of ts) { const p = plan.get(t)!; t.s = p.s + shift; t.e = p.e + shift; t.src = "derived"; } notes.push(`line ${line} is not in words.ts: planned times shifted by ${shift.toFixed(2)} s`); }
  }
  return { toks, notes };
};
const BUILT = build();
/** every spoken word of the v4 film in script order, with its time */
export const TOKS: Tok[] = BUILT.toks;
export const WORD_SOURCE = WORDS.length ? `v4/words.ts (the real voice: ${WORDS.length} words)` : `v4/plan_words.ts (the plan of ${SCRIPT_SOURCE})`;
export const tokOf = (key: string): Tok | undefined => { const [w, n] = key.split("#"), k = norm(w), nn = n ? +n : 1; return TOKS.find((t) => norm(t.w) === k && t.n === nn); };
const need = (key: string): Tok => { const t = tokOf(key); if (!t) throw new Error(`v4 timeline: no word "${key}" in the script`); return t; };
/** film seconds at the START / the END of a word ("shout#1"; "#1" may be left out) */
export const S = (key: string) => need(key).s;
export const E = (key: string) => need(key).e;
/** the first / last word of a line */
export const lineStart = (id: string) => { const t = TOKS.find((x) => x.line === id); if (!t) throw new Error(`v4 timeline: no line ${id}`); return t.s; };
export const lineEnd = (id: string) => { const ts = TOKS.filter((x) => x.line === id); if (!ts.length) throw new Error(`v4 timeline: no line ${id}`); return ts[ts.length - 1].e; };
const fr = (sec: number) => Math.round(sec * FPS);

// ---------------------------------------------------------------- the cuts: SHOT_PLAN's rules on words
export const SHOT_IDS: string[] = SHOT_PLAN.map((p) => p.id);
const LEAD_S = 0.10, MIN_SHOT_F = 20;
/** the LOOP TAIL (lead 2026-11-21, option B): the film runs on after the last word ("it.") so her arm can come down from
 *  the point into the exact frame-0 pose and the last frame flows into frame 0 (2066 f = 68.87 s on the real voice) */
const TAIL_S = 0.49;
const ruleOf = (p: ShotPlan): number => {
  const [kind, key] = p.start.split(":");
  const base = kind === "line" ? lineStart(key) - (p.lead ?? LEAD_S) : kind === "word" ? S(key) - (p.lead ?? 0.03) : NaN;
  if (!isFinite(base)) throw new Error(`v4 shot ${p.id}: bad start rule "${p.start}"`);
  return fr(base + (p.at ?? 0));
};
const CUTS = (() => {
  const notes: string[] = [];
  const from = SHOT_PLAN.map((p, k) => (k === 0 ? 0 : (() => { try { return ruleOf(p); } catch (e) { notes.push(String(e)); return NaN; } })()));
  for (let k = 1; k < from.length; k++) {
    if (!isFinite(from[k])) from[k] = from[k - 1] + MIN_SHOT_F;
    if (from[k] < from[k - 1] + MIN_SHOT_F) { notes.push(`shot ${SHOT_IDS[k]}: its rule gives frame ${from[k]}, moved to ${from[k - 1] + MIN_SHOT_F}`); from[k] = from[k - 1] + MIN_SHOT_F; }
  }
  // the film ends TAIL_S after the last word (the loop: frame 0 is the next frame)
  let total = fr(TOKS[TOKS.length - 1].e + TAIL_S);
  if (total < from[from.length - 1] + MIN_SHOT_F) { notes.push("the last shot was under 20 f: lengthened"); total = from[from.length - 1] + MIN_SHOT_F; }
  return { from, total, notes };
})();
export const TOTAL = CUTS.total;
export const L = TOTAL / FPS;
/** frames: each shot's [from, to) */
export const FRAMES: Record<string, [number, number]> = Object.fromEntries(SHOT_IDS.map((id, k) => [id, [CUTS.from[k], k + 1 < SHOT_IDS.length ? CUTS.from[k + 1] : CUTS.total]]));
export const cutS = (id: string) => FRAMES[id][0] / FPS;
export const cutE = (id: string) => FRAMES[id][1] / FPS;
export const shotOfFrame = (f: number): string => { let cur = SHOT_IDS[0]; for (const id of SHOT_IDS) { if (f >= FRAMES[id][0]) cur = id; else break; } return cur; };
/** what did not line up (empty = all good) */
export const TIMELINE_NOTES: string[] = [...BUILT.notes, ...CUTS.notes];

// ---------------------------------------------------------------- the shared events of the OPENING (film seconds)
// The lamp, the beeps and the cuts are RULES ON THE WORDS: when VOICE publishes the real "Go" onsets these move by
// themselves. LAB's lamp + CAST's presses + SOUND's beeps all read these (never typed seconds).
const tryS = (k: string) => { try { return S(k); } catch { return NaN; } };
const GO = [1, 2, 3, 4, 5, 6, 7].map((n) => tryS(`go#${n}`));
export const EV = {
  /** the lamp turns green on "green" (line 1) */
  lampGreen: tryS("green#1"),
  /** the six green flashes + presses: one on each of the first six "Go" words */
  goFlashes: GO.slice(0, 6),
  /** the RED: on the seventh "Go!" (the hard cut), then the held beat of silence (0.5 s) */
  red: GO[6],
  /** the held beat ends when the narrator speaks again ("Did"); without it, 0.7 s after the red */
  redBeatEnd: isFinite(tryS("did#1")) ? tryS("did#1") : GO[6] + 0.7,
  /** the hard cut to red (v04's first frame, never before the red word): a set may key its red on this frame */
  redCut: (() => { const i = SHOT_IDS.indexOf("v04"); return i >= 0 ? CUTS.from[i] / FPS : GO[6]; })(),
  /** the big red X pops on "She" ("She did.") */
  xPop: tryS("she#1"),
  /** the loop: her arm is up and pointing on "point" of the last line (point#6) */
  loopPoint: tryS("point#6"),
  /** THE LOOP TAIL: from the end of the last word ("it.") to the last frame: her arm comes down into frame 0's hover pose,
   *  eyes back to the lamp, the lamp + console lights in their frame-0 state/phase; the last frame (TOTAL - 1) must
   *  equal frame 0 (the seam gate: no bigger than one held-shot frame step; the caption is gone by loopTailClear) */
  loopTail: (() => { try { return E("it#5"); } catch { return NaN; } })(),
  /** the caption "and say it." is gone from this time on (6 f before the end), so frame 0 brings "Tap your foot" alone */
  loopTailClear: (CUTS.total - 6) / FPS,
};

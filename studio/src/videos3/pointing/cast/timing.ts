// WORD TIMELINE + LIP-SYNC (owner CAST). Every spoken word of the film with its speaker and its film time.
// SOURCE (ALL-1, 2026-11-19 23:30): THE FILM'S CLOCK, ../timeline.ts (DIRECTOR): the script's words with the REAL voice's
// times as soon as words.ts has words, the planned times until then; ABSOLUTE film seconds either way. So the cast
// re-times by itself when VOICE writes words.ts: nothing to run here (voice_v1.ts and voice_sync.py are the v2 route:
// not used any more). The phone's replay of the tourist's line (v3_r01) is "phone": it has word keys ("what's#2") for
// the beats, but it moves nobody's mouth.
import { TOKS, WORD_SOURCE, shotOfFrame, FPS } from "../timeline";
import type { MouthK } from "../../../videos/clown/toon";

export type Speaker = "driver" | "tourist" | "kid" | "narrator" | "phone";
export type Tok = { w: string; key: string; n: number; who: Speaker; s: number; e: number; shot: string; punct: string; loud: boolean };

const norm = (w: string) => { const k = w.toLowerCase().replace(/[^a-z0-9']/g, ""); return k === "1000" ? "thousand" : k === "1" ? "one" : k === "6" ? "six" : k; };
const SPK: Record<string, Speaker> = { D: "driver", T: "tourist", KID: "kid", N: "narrator" };
/** the STATUS words of the call-outs and the shouted words (bigger mouths) */
const LOUD = new Set(["green", "check", "closed", "nothing", "signal", "doors", "bag", "vending", "machine", "stay"]);

const build = (): Tok[] => TOKS.map((t) => {
  const who: Speaker = t.line === "v3_r01" ? "phone" : SPK[t.who] ?? "narrator", k = norm(t.w);
  return { w: t.w, key: t.key, n: t.n, who, s: t.s, e: t.e, shot: shotOfFrame(Math.round(t.s * FPS)), punct: (/[.…!?,:]+$/.exec(t.raw) ?? [""])[0],
    loud: who !== "narrator" && who !== "phone" && t.line !== "v3_t07" && LOUD.has(k) };          // "Bag... gone." is flat and small: never loud
});
// lazy + memoised (timeline.ts has no cycle with the sets, but nothing in cast/ reads a table at import time)
let _toks: Tok[] | null = null;
/** every spoken word (built on first use, memoised) */
export const getToks = (): Tok[] => (_toks ??= build());
/** where the timings come from right now (timeline.ts WORD_SOURCE: the real voice, or the plan) */
export const voiceSource = (): string => WORD_SOURCE;

/** a word by its key ("Signal", "check#2", "finger#3"): the token (undefined if the script has none) */
export const tok = (key: string): Tok | undefined => {
  const [w, n] = key.split("#"), k = norm(w), nn = n ? +n : 1;
  return getToks().find((t) => norm(t.w) === k && t.n === nn);
};
/** film seconds at the START of a word (key convention above); NaN when not found */
export const wordT = (key: string) => tok(key)?.s ?? NaN;
/** film seconds at the END of a word */
export const wordEnd = (key: string) => tok(key)?.e ?? NaN;
/** frames (30 fps) */
export const wordF = (key: string) => wordT(key) * 30;
/** the word a speaker is saying at t (with a small tail) */
export const speakingAt = (who: Speaker, t: number): Tok | undefined => getToks().find((q) => q.who === who && t >= q.s - 0.02 && t < q.e + 0.03);
/** the speaker's line spans (for the talk hand / laughs): first and last word time of each contiguous run */
export const linesOf = (who: Speaker): [number, number][] => {
  const o: [number, number][] = [];
  for (const q of getToks()) { if (q.who !== who) continue; const l = o[o.length - 1]; if (l && q.s - l[1] < 0.7) l[1] = q.e; else o.push([q.s, q.e]); }
  return o;
};

// ---------------- visemes from the letters of the word ----------------
type Seg = { m: MouthK; w: number };
const VOW: Record<string, MouthK> = { a: "vA", e: "vE", i: "vI", y: "vI", o: "vO", u: "vU" };
const segsOf = (word: string): Seg[] => {
  const s = word.toLowerCase().replace(/[^a-z]/g, ""), out: Seg[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ("mbp".includes(ch)) { if (out[out.length - 1]?.m !== "vM") out.push({ m: "vM", w: 0.6 }); continue; }
    if ("fv".includes(ch)) { out.push({ m: "vI", w: 0.45 }); continue; }
    if (ch === "w" || (ch === "q")) { out.push({ m: "vU", w: 0.5 }); continue; }
    const v = VOW[ch];
    if (v) { // a vowel cluster = one shape (the first vowel decides; "oo" / "ou" round)
      let j = i; while (j + 1 < s.length && VOW[s[j + 1]]) j++;
      const cl = s.slice(i, j + 1), m: MouthK = /oo|ou|ue/.test(cl) ? "vU" : /ee|ea|ie/.test(cl) ? "vE" : cl === "e" && j === s.length - 1 && s.length > 2 ? "vM" : v;
      if (!(cl === "e" && j === s.length - 1 && s.length > 2)) out.push({ m, w: 1 });
      i = j;
    }
  }
  if (!out.length) out.push({ m: "vE", w: 1 });
  return out;
};
/** the mouth of a speaking character at film time t (undefined = not speaking: use the expression's own mouth).
 *  Each viseme holds >= 2 frames; between words with a real gap the lips close (vM) for a beat, then rest */
export const mouthAt = (who: Speaker, t: number): { mouth?: MouthK; loud: boolean; word?: Tok } => {
  const q = getToks().find((x) => x.who === who && t >= x.s - 0.03 && t < x.e + 0.09);
  if (!q) return { loud: false };
  if (t >= q.e) return { mouth: "vM", loud: q.loud, word: q };              // the closing beat after the word
  const segs = segsOf(q.w), tot = segs.reduce((a, s) => a + s.w, 0);
  const dur = Math.max(1 / 15, q.e - q.s), k = Math.max(0, Math.min(0.999, (t - q.s) / dur)) * tot;
  // quantise to frames so a shape never flickers for 1 frame
  let acc = 0, m: MouthK = segs[0].m;
  for (const s of segs) { if (k < acc + s.w) { m = s.m; break; } acc += s.w; }
  if (q.loud && (m === "vA" || m === "vE" || m === "vO")) m = m === "vA" ? "laugh" : m === "vO" ? "O" : "vE";
  return { mouth: m, loud: q.loud, word: q };
};

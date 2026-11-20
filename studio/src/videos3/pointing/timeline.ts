// THE FILM'S CLOCK of 'pointing' (DIRECTOR, script v3 LOCKED 2026-11-19; sound/pointing/SCRIPT_v3.md).
// One place that turns THE VOICE into frames: every spoken word of the script with its time, every CUT as a rule on
// those words (the script's own rules: "cut 1 in the silence after 'not.'", "cut 2 one frame before 'finger'" ...), the
// timed EVENTS the picture and the sound share (doors, lamps, the glide, the melody) and the film's length L.
// Source of the times: words.ts (the REAL voice, written by VOICE alone) as soon as it has words; until then
// plan_words.ts (the script's planned times; briefs/v3/pointing/director/make_plan.py). Nothing here is a fixed second:
// when the voice lands, every cut, caption, event and the loop length move by themselves.
//
// IMPORT RULE: this file imports ONLY words.ts and plan_words.ts (no cams, no sets, no cast, no remotion), so ANY file
// may import it at top level, also sets/<set>.ts and sets/<set>.cams.ts (no cycle). The shot table (shots.ts) is built
// from it.
import { WORDS } from "./words";
import { PLAN_WORDS, PLAN_SOURCE } from "./plan_words";

export const FPS = 30;
export type Who = "N" | "D" | "T" | "KID";
/** caption looks: n = narrator (sentence case), c = a character (CAPS), phone = his own voice from his phone (CAPS, 80 %,
 *  a phone pictogram), small = the last line (lower-case, 72 %) */
export type CapStyle = "n" | "c" | "phone" | "small";
/** one caption chunk: its text and how many SPOKEN words it covers; build = the words come up one by one (a call-out:
 *  the name, the held beat, the status) */
export type Chunk = { text: string; n: number; build?: boolean };
export type LineDef = { id: string; who: Who; text: string; style: CapStyle; caps: Chunk[] };

const c = (text: string, n?: number, build?: boolean): Chunk => ({ text, n: n ?? text.split(/\s+/).length, ...(build ? { build } : {}) });
/** THE SCRIPT (SCRIPT_v3.md section 2 + the caption run of 5.5): 131 spoken words in 25 lines + the phone's replay */
export const LINES: LineDef[] = [
  { id: "v3_n01", who: "N", style: "n", text: "His bag is on that train.", caps: [c("His bag"), c("on that train.", 4)] },   // "is" is heard, not shown
  { id: "v3_n02", who: "N", style: "n", text: "He is not.", caps: [c("He is not.")] },
  { id: "v3_n03", who: "N", style: "n", text: "All he did was laugh... at a finger.", caps: [c("All he did"), c("was laugh"), c("at a finger.")] },
  { id: "v3_d01", who: "D", style: "c", text: "Signal... green!", caps: [c("SIGNAL... GREEN!", 2, true)] },
  { id: "v3_t01", who: "T", style: "c", text: "He's pointing at nothing!", caps: [c("HE'S POINTING"), c("AT NOTHING!")] },
  { id: "v3_n04", who: "N", style: "n", text: "But that driver has a thousand people behind him.", caps: [c("But that driver"), c("has 1,000 people", 4), c("behind him.")] },
  { id: "v3_n05", who: "N", style: "n", text: "So he checks with a finger and a shout.", caps: [c("So he checks"), c("with a finger"), c("and a shout.")] },
  { id: "v3_n06", who: "N", style: "n", text: "First stop.", caps: [c("First stop.")] },
  { id: "v3_n07", who: "N", style: "n", text: "His suitcase tries to get off...", caps: [c("His suitcase"), c("tries to"), c("get off...")] },
  { id: "v3_n08", who: "N", style: "n", text: "...and the boy's finger saves it.", caps: [c("and the"), c("boy's finger"), c("saves it.")] },
  { id: "v3_t02", who: "T", style: "c", text: "Bad suitcase.", caps: [c("BAD SUITCASE.")] },
  { id: "v3_d02", who: "D", style: "c", text: "Doors... closed!", caps: [c("DOORS... CLOSED!", 2, true)] },
  { id: "v3_t03", who: "T", style: "c", text: "What's a finger gonna do?", caps: [c("WHAT'S A FINGER"), c("GONNA DO?")] },
  { id: "v3_n09", who: "N", style: "n", text: "Second stop.", caps: [c("Second stop.")] },
  { id: "v3_t04", who: "T", style: "c", text: "Stay. Be right back.", caps: [c("STAY."), c("BE RIGHT BACK.")] },
  { id: "v3_n10", who: "N", style: "n", text: "It stays.", caps: [c("It stays.")] },
  { id: "v3_t05", who: "T", style: "c", text: "Vending machine... check!", caps: [c("VENDING MACHINE..."), c("CHECK!")] },
  { id: "v3_t06", who: "T", style: "c", text: "This kid gets it!", caps: [c("THIS KID"), c("GETS IT!")] },
  { id: "v3_n11", who: "N", style: "n", text: "You see, his eyes looked right at it. His mind was on his phone.",
    caps: [c("You see,"), c("his eyes"), c("looked right"), c("at it."), c("His mind"), c("was on"), c("his phone.")] },
  { id: "v3_r01", who: "T", style: "phone", text: "What's a finger gonna do?", caps: [c("WHAT'S A FINGER"), c("GONNA DO?")] },   // his phone replays v3_t03
  { id: "v3_n12", who: "N", style: "n", text: "Japan's railway lab tested it.", caps: [c("Japan's railway lab"), c("tested it.")] },
  { id: "v3_n13", who: "N", style: "n", text: "For every six mistakes people made just looking... when they pointed and said it out loud: about one.",
    caps: [c("For every 6"), c("mistakes people made"), c("just looking..."), c("when they pointed"), c("and said it"), c("out loud:"), c("about 1.")] },
  { id: "v3_n14", who: "N", style: "n", text: "A finger and a shout drag your mind back.", caps: [c("A finger"), c("and a shout"), c("drag your mind"), c("back.")] },
  { id: "v3_d03", who: "D", style: "c", text: "Doors... closed!", caps: [c("DOORS..."), c("...CLOSED!")] },
  { id: "v3_k01", who: "KID", style: "c", text: "Bag... check!", caps: [c("BAG... CHECK!", 2, true)] },
  { id: "v3_t07", who: "T", style: "small", text: "Bag... gone.", caps: [c("bag... gone.", 2, true)] },
];
const REPLAY = "v3_r01", REPLAY_OF = "v3_t03";

// ---------------------------------------------------------------- the words of the script, timed
const SYN: Record<string, string> = { "1000": "thousand", "1": "one", "6": "six" };
/** the word key of the cast / the bible (`starts_on`): lower case, letters + digits + apostrophe ("1,000" = thousand) */
export const norm = (w: string) => { const k = w.toLowerCase().replace(/[^a-z0-9']/g, ""); return SYN[k] ?? k; };
export type Tok = { w: string; raw: string; key: string; n: number; who: Who; line: string; li: number; i: number; s: number; e: number;
  /** where the time comes from: the real voice, the plan, or derived (a word the voice file lacks) */
  src: "voice" | "plan" | "derived" };

const buildToks = (): { toks: Tok[]; notes: string[] } => {
  const toks: Tok[] = [], notes: string[] = [], count: Record<string, number> = {};
  LINES.forEach((L, li) => {
    for (const raw of L.text.split(/\s+/).filter(Boolean)) {
      const bare = raw.replace(/^[.…]+/, "").replace(/[.…!?,:"]+$/, ""), k = norm(bare);
      if (!k) continue;
      count[k] = (count[k] ?? 0) + 1;
      toks.push({ w: bare, raw: raw.replace(/^[.…]+/, ""), key: `${k}#${count[k]}`, n: count[k], who: L.who, line: L.id, li, i: toks.length, s: NaN, e: NaN, src: "plan" });
    }
  });
  // 1) the plan (always: it is also the fallback for anything the voice file lacks)
  const byLine = new Map<string, Tok[]>();
  for (const t of toks) byLine.set(t.line, [...(byLine.get(t.line) ?? []), t]);
  const plan = new Map<Tok, { s: number; e: number }>();
  for (const [line, ts] of byLine) {
    const P = PLAN_WORDS.filter((p) => p.line === line);
    if (P.length !== ts.length) notes.push(`plan_words.ts has ${P.length} words for ${line}, the script has ${ts.length}`);
    ts.forEach((t, k) => { const p = P[Math.min(k, P.length - 1)]; if (p) plan.set(t, { s: p.s, e: p.e }); });
  }
  for (const t of toks) { const p = plan.get(t); if (p) { t.s = p.s; t.e = p.e; } }
  if (!WORDS.length) return { toks, notes };
  // 2) the REAL voice: line by line, in order. A line is found as the window of the voice words that matches most of its
  //    words; inside it the words are matched in order (a word the voice file lacks is placed between its neighbours)
  const V = WORDS.map((w) => ({ k: norm(w.w), s: w.s, e: w.e }));
  let j = 0, shift = 0;
  const place = (ts: Tok[], optional: boolean): boolean => {
    // in-order match from voice word a (each word looks up to 3 voice words ahead): robust to a merged / numeral token
    // ("a thousand" spoken as the one token "1,000") and to a word the voice file lacks (positional scoring was not)
    const align = (a0: number) => { let a = a0, sc = 0; const hit: (number | null)[] = [];
      for (const t of ts) { let f: number | null = null; for (let look = a; look < Math.min(V.length, a + 3); look++) if (V[look].k === norm(t.w)) { f = look; break; } hit.push(f); if (f !== null) { a = f + 1; sc++; } }
      return { hit, end: a, sc }; };
    let best = -1, bestScore = 0, bestHit: (number | null)[] = [], bestEnd = j;
    for (let a = j; a <= Math.min(V.length - 1, j + 12); a++) {
      const r = align(a); if (r.sc > bestScore) { bestScore = r.sc; best = a; bestHit = r.hit; bestEnd = r.end; }
    }
    if (best < 0 || bestScore < Math.max(1, Math.ceil(ts.length * 0.6))) return false;
    const a = bestEnd, hit = bestHit;
    ts.forEach((t, q) => { const f = hit[q]; if (f !== null) { t.s = V[f].s; t.e = V[f].e; t.src = "voice"; } });
    // a word swallowed by the NEXT word's numeral token ("a" of "a thousand" = "1,000"): it shares that token's start
    ts.forEach((t, q) => {
      const f = q + 1 < ts.length ? hit[q + 1] : null;
      if (hit[q] !== null || f === null || !/[0-9]/.test(WORDS[f].w)) return;
      const nx = ts[q + 1], cut = V[f].s + 0.3 * (V[f].e - V[f].s);
      t.s = V[f].s; t.e = cut; nx.s = cut; t.src = "voice"; hit[q] = -1;
    });
    // words the voice file lacks: keep their planned offset from the nearest matched neighbour of the line
    ts.forEach((t, q) => {
      if (hit[q] !== null) return;
      const near = ts.map((x, r) => ({ x, r })).filter(({ r }) => hit[r] !== null).sort((u, v) => Math.abs(u.r - q) - Math.abs(v.r - q))[0];
      if (near) { const d = near.x.s - plan.get(near.x)!.s, p = plan.get(t)!; t.s = p.s + d; t.e = p.e + d; t.src = "derived"; }
      if (!optional) notes.push(`"${t.w}" (${t.line}) is not in words.ts: placed from the plan`);
    });
    j = a;
    return true;
  };
  for (const [line, ts] of byLine) {
    if (line === REPLAY) continue;
    if (place(ts, false)) { const last = ts[ts.length - 1]; shift = last.e - plan.get(last)!.e; }
    else { for (const t of ts) { const p = plan.get(t)!; t.s = p.s + shift; t.e = p.e + shift; t.src = "derived"; } notes.push(`line ${line} is not in words.ts: planned times shifted by ${shift.toFixed(2)} s`); }
    if (line === "v3_n11") {
      // the phone's replay: in the voice file if VOICE put it there, else derived: v3_t03's own rhythm, starting 0.30 s
      // before the end of "phone." (SCRIPT_v3 2.3)
      const rp = byLine.get(REPLAY)!, src = byLine.get(REPLAY_OF)!, j0 = j;
      if (!place(rp, true)) { j = j0; const t0 = ts[ts.length - 1].e - 0.30; rp.forEach((t, q) => { t.s = t0 + (src[q].s - src[0].s); t.e = t0 + (src[q].e - src[0].s); t.src = "derived"; }); }
    }
  }
  return { toks, notes };
};
const BUILT = buildToks();
/** MEASURED ONSETS that words.ts does not carry (VOICE, hand-measured; 02:10): the word's start is SET to this value.
 *  The opening's measured onsets (finger 4.69 ...) are in words.ts since 01:25, so only the rows below remain.
 *  "what's#1" (v3_t03) decides cut s10. */
const ONSET_FIX: Record<string, number> = { "what's#1": 24.195 };
if (WORDS.length) for (const [key, s] of Object.entries(ONSET_FIX)) {
  const t = BUILT.toks.find((x) => x.key === key); if (!t || Math.abs(t.s - s) < 0.005) continue;
  t.s = s; const prev = BUILT.toks[t.i - 1]; if (prev && prev.e > s) prev.e = s;
}
/** every spoken word of the film in script order, with its time */
export const TOKS: Tok[] = BUILT.toks;
/** "words.ts (the real voice)" or the plan's own source line */
export const WORD_SOURCE = WORDS.length ? `words.ts (the real voice: ${WORDS.length} words)` : `plan_words.ts: ${PLAN_SOURCE}`;
export const tokOf = (key: string): Tok | undefined => { const [w, n] = key.split("#"), k = norm(w), nn = n ? +n : 1; return TOKS.find((t) => norm(t.w) === k && t.n === nn); };
const need = (key: string): Tok => { const t = tokOf(key); if (!t) throw new Error(`timeline: no word "${key}" in the script`); return t; };
/** film seconds at the START / the END of a word ("finger#3", "check#2"; "#1" may be left out) */
export const S = (key: string) => need(key).s;
export const E = (key: string) => need(key).e;
const fr = (sec: number) => Math.round(sec * FPS);

// ---------------------------------------------------------------- the cuts (the script's rules; plan times in brackets)
export const SHOT_IDS = ["s01", "s02", "s03", "s03b", "s04", "s05", "s06", "s07", "s08", "s09", "s10", "s11", "s12", "s13", "s14", "s15", "s16a", "s16b",
  "s17", "s18", "s19", "s20", "s21", "s22", "s23", "s24"] as const;
export type ShotId = (typeof SHOT_IDS)[number];
/** v3_s14, the boy's second point with no words: 1.10 s on the plan; the script allows 1.40 s if the storyboard shows it
 *  does not read (SCRIPT_v3 4.2, first allowance). DIRECTOR's call after the storyboard */
export const P01_LEN_S = 1.10;
const RULES: Record<ShotId, () => number> = {
  s01: () => 0,
  s02: () => fr((E("not") + S("all")) / 2),            // [3.05] cut 1: in the silence after "not."
  s03: () => fr(S("finger#1")) - 1,                    // [4.88] cut 2: one frame before "finger"
  s03b: () => fr(S("signal") - 0.04),                  // LEAD 02:35: the driver's FACE (front 3/4) for "Signal... green!"; s03 = the glove insert
  s04: () => fr(S("he's") - 0.10),                     // [7.20] his laugh starts under the tail of "green!"
  s05: () => fr(S("but") - 0.07),                      // [8.93]
  s06: () => fr(S("so") - 0.08),                       // [11.92]
  s07: () => fr(E("shout#1") + 0.15),                  // [14.75] the train stops, the doors open under "First stop."
  s08: () => fr(E("off")),                             // [17.95] the boy's point snaps out in the 0.50 s after "off..."
  s09: () => fr(E("suitcase#2") + 0.40),               // [21.75] THE PLANT: the doors are a third shut at the cut
  s10: () => fr(S("what's#1") - 0.245),                // [24.88]
  s11: () => fr(S("second") - 0.145),                  // [27.00]
  s12: () => fr(S("it#2") - 0.50),                     // [30.55] the bag alone before "It stays."
  s13: () => fr(S("vending") - 0.25),                  // [32.75]
  s14: () => fr(E("check#1") + 0.33),                  // [35.19] after the 0.33 s pose hold
  s15: () => fr(E("check#1") + 0.33) + fr(P01_LEN_S),  // [36.29]
  s16a: () => fr(S("you") - 0.20),                     // [39.39] he has turned back to his phone
  s16b: () => fr(E("phone") - 0.30),                   // [43.47] the phone's replay starts: the same-axis cut-in
  s17: () => fr(S("tested")) - 1,                      // [46.55] on "tested"
  s18: () => fr(E("looking")),                         // [50.09] on the hang after "looking..."
  s19: () => fr(S("when")),                            // [51.09]
  s20: () => fr(E("one") + 0.41),                      // [54.60] after the 6-against-1 hold
  s21: () => fr(S("back#2")) - 1,                      // [57.30] on "back."
  s22: () => fr(S("doors#2") - 0.15),                  // [58.32] THE PAYOFF: the doors are SEEN sliding before "Doors..."
  s23: () => fr(S("bag#2") - 0.08),                    // [61.40]
  s24: () => fr(E("check#2") + 0.445),                 // [63.23] after the grin drains and the cap goes up
};
const MIN_SHOT_F = 20;
const cuts = (() => {
  const notes: string[] = [];
  const from = SHOT_IDS.map((id) => RULES[id]());
  for (let k = 1; k < from.length; k++) if (from[k] < from[k - 1] + MIN_SHOT_F) { notes.push(`shot ${SHOT_IDS[k]}: its rule gives frame ${from[k]}, moved to ${from[k - 1] + MIN_SHOT_F} (the shot before would be under ${MIN_SHOT_F} f)`); from[k] = from[k - 1] + MIN_SHOT_F; }
  // the film ends 0.10 s after "gone." (2 frames before the arm's lock-out lands: frame 0 is the next frame)
  let total = fr(E("gone") + 0.10);
  if (total < from[from.length - 1] + MIN_SHOT_F) { notes.push("the last shot was under 20 f: lengthened"); total = from[from.length - 1] + MIN_SHOT_F; }
  return { from, total, notes };
})();
/** frames: total length, and each shot's [from, to) */
export const TOTAL = cuts.total;
/** THE LOOP LENGTH in seconds: shot 1 is the last shot's set-up running on; whoever needs "film time + L" reads it here */
export const L = TOTAL / FPS;
export const FRAMES: Record<ShotId, [number, number]> = Object.fromEntries(SHOT_IDS.map((id, k) => [id, [cuts.from[k], k + 1 < SHOT_IDS.length ? cuts.from[k + 1] : cuts.total]])) as Record<ShotId, [number, number]>;
/** a shot's start / end in film seconds */
export const cutS = (id: ShotId) => FRAMES[id][0] / FPS;
export const cutE = (id: ShotId) => FRAMES[id][1] / FPS;
/** the shot a frame belongs to */
export const shotOfFrame = (f: number): ShotId => { let cur: ShotId = "s01"; for (const id of SHOT_IDS) { if (f >= FRAMES[id][0]) cur = id; else break; } return cur; };

// ---------------------------------------------------------------- the events picture and sound share (film seconds)
/** THE ONE DOOR SPEED of the film: open to shut in 1.3 s, in the plant and in the payoff (fact guard 4) */
export const DOOR_CLOSE_S = 1.3;
const chimeA = E("suitcase#2"), chimeB = E("back#2") + 0.40;
export const EV = {
  // ---- the hook (shot 1): the arm lands on frame 2; the suitcase leaves the frame; he turns to the lens on "He"; a slow blink
  armLands: 2 / FPS, bagOutOfFrame: 1.4, headTurn: S("he#1"), blink: S("not") + 0.08,
  /** hook B: the same-axis punch-in (1.25x) on "He" */
  punchIn: fr(S("he#1")) / FPS,
  // ---- shot 2: the matched face held 10 f, the move done 40 f in, still for the rest; the phone swings to the glass (12 f)
  s02FaceHold: cutS("s02") + 10 / FPS, s02MoveEnd: cutS("s02") + 40 / FPS, phoneSwing: cutS("s03") - 12 / FPS,
  // ---- shot 3: the glove is 40 % up at the cut and at full stretch 0.05 s before "Signal"
  gloveFull: S("signal") - 0.05,
  // ---- shot 5: the train picks up speed, the suitcase creeps back on "people"; the foot hook is CAST's beat ("behind-4")
  speedUp: cutS("s05"), bagCreep: S("people"), footHook: S("behind") + 0.27, bagHome: E("him") + 0.0,
  // ---- shot 6: the train brakes: the suitcase rolls forward and bumps the wall, the cap drops (CAST: "finger#2+3")
  brake: S("finger#2") + 0.10, bagBump: S("finger#2") + 0.52, stopA: cutS("s07") + 0.3,
  // ---- THE PLANT (station A): chime + doors start together on the boy's nod, the leaves meet, the red side lamps go
  //      out, THEN the call, then the glide
  chimeA, doorsMeetA: chimeA + DOOR_CLOSE_S, lampsOutA: chimeA + DOOR_CLOSE_S + 0.25, callA: S("doors#1"), glideA: E("closed#1") + 0.075,
  // ---- station B
  arriveB: cutS("s11") - 0.4, doorsOpenB: cutS("s11") + 0.1, park: S("stay"), hopOut: S("be"),
  boyPoint2: cutS("s14") + 0.3, look0: cutS("s15") + 0.40, look1: cutS("s15") + 1.10,
  focusToBag: S("looked"), focusBack: S("phone"), replay0: S("what's#2"), replay1: E("do#2"),
  // ---- the departure melody (an original 5.5 s phrase played twice; the music-note pictogram pulses with it)
  melody0: S("japan's"), melody1: S("japan's") + 11.0,
  ballsHold0: E("one"), cabQuiet0: E("back#2"),
  // ---- THE PAYOFF (station B): chime + doors, "Doors..." over the platform, the leaves meet on the bag, lamps out,
  //      "...closed!", the glide
  chimeB, doorsMeetB: chimeB + DOOR_CLOSE_S, lampsOutB: chimeB + DOOR_CLOSE_S + 0.30, callB: S("doors#2"), closedB: S("closed#2"), glideB: E("closed#2") + 0.085,
  kidCheck: S("check#2"), headTurnB: S("check#2"), grinDrained: E("check#2") + 0.445,
  // ---- the last shot: "Bag..." the arm up, the ear, "gone." the 12 f sag + the 6 f lock-out; the music stops on "gone."
  lastBag: S("bag#3"), gone: S("gone"), musicStop: S("gone"), end: TOTAL / FPS,
};
/** what did not line up (empty = all good): logged once by the film, shown in the director's notes */
export const TIMELINE_NOTES: string[] = [...BUILT.notes, ...cuts.notes];

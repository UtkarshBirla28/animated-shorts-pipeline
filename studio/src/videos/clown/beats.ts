// BEATS + SHOT TABLE of "The Clown Nobody Saw" (clown), REBUILD v2 (sound/clown/SCRIPT_v6.md, BUILD_PLAN_v2.md).
// Owner: EDIT. Every key frame is a WORD of the narration (words.ts, generated from the voice dir), never a literal frame.
// Words are found by TEXT, line by line in script order (`LINES` below), so the anchors survive however the voice build
// splits the phrases (one phrase per sentence or per line), digits or words ("1 in 4" / "one in four"), and punctuation.
// The three optional lines of the script's cut order ("Don't lose count.", "Then his team asked people leaving:",
// "Many spun around to look.") may be missing: their beats then fall back to the end of the line before, and the shots
// built on them keep a minimum length (see `bound` below). Everything still compiles.
import { WORDS, PHRASES } from "./words";
import type { LightName, SetName } from "./plan";

export const FPS = 30;

// ---------------- the word finder ----------------
const NUM: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", hundred: "100" };
/** a token's key: lower case, letters / digits only, number words as digits */
const nk = (w: string) => { const k = w.toLowerCase().replace(/[^a-z0-9%]/g, ""); return NUM[k] ?? k; };
const TOK = WORDS.map((w) => nk(w.w));
const toks = (s: string) => s.split(/\s+/).map(nk).filter(Boolean);
/** first index >= from where the token list t starts (-1 = none) */
const find = (t: string[], from: number, to = TOK.length) => {
  for (let i = from; i + t.length <= to; i++) if (t.every((x, k) => TOK[i + k] === x)) return i;
  return -1;
};

/** the script's lines in order (SCRIPT_v6.md). `opt` = on the script's cut list. Found by their first 3 (else 2, else 1) tokens. */
const LINES = {
  quick: "Quick test.",
  count: "Count the people on a phone.",
  dontLose: "Don't lose count.",
  howMany: "How many?",
  five: "Five.",
  andClown: "And the clown?",
  sawHim: "You saw him, right?",
  experiment: "In a real experiment, most people on a phone call never saw him.",
  hyman: "Psychologist Ira Hyman needed a distraction nobody could miss.",
  student: "Then a student told him:",
  unicycle: "I own a unicycle.",
  suit: "and a clown suit.",
  hour: "So for one hour, the clown rode circles in the middle of campus.",
  team: "Then his team asked people leaving:",
  unusual: "Did you see anything unusual?",
  amazing: "The clown? He was amazing!",
  dude: "Dude, the unicycle guy!",
  whatClown: "Sorry... what clown?",
  straight: "Even asked straight out, only one in four people on a call had seen him.",
  spun: "Many spun around to look.",
  weird: "Here's the weird part: people listening to music noticed him.",
  youSee: "You see, a call pulls your mind toward someone who isn't there.",
  sneakier: "So Hyman tried something sneakier.",
  hung: "He hung dollar bills on a branch, right at head height.",
  nearly: "Nearly everyone ducked under it.",
  onAPhone: "On a phone? Only 6 in 100 stopped for the money.",
  bodies: "Their bodies dodged it.",
  minds: "Their minds never saw it.",
  counted: "You counted five phones.",
  sawClown: "You saw the clown.",
  money: "Did you see the money?",
} as const;
export type LineName = keyof typeof LINES;
const OPT = new Set<LineName>(["dontLose", "team", "spun"]);
/** word index range [i0, i1] of each line; ok = false: the line is not in this voice (i0 = i1 = the last word before it) */
export const LN = {} as Record<LineName, { i0: number; i1: number; ok: boolean }>;
{
  const names = Object.keys(LINES) as LineName[];
  let cur = 0;
  const start: Partial<Record<LineName, number>> = {};
  for (const n of names) {
    const t = toks(LINES[n]);
    let i = -1;
    for (const k of [3, 2, 1]) { if (t.length >= k || k === 1) { i = find(t.slice(0, Math.min(k, t.length)), cur); if (i >= 0) break; } }
    if (i < 0 && !OPT.has(n)) throw new Error(`beats.ts: line not found in words.ts: "${LINES[n]}"`);
    if (i >= 0) { start[n] = i; cur = i + 1; }
  }
  names.forEach((n, j) => {
    const i0 = start[n];
    if (i0 === undefined) { LN[n] = { i0: -1, i1: -1, ok: false }; return; }
    let nx = WORDS.length;
    for (let k = j + 1; k < names.length; k++) if (start[names[k]] !== undefined) { nx = start[names[k]]!; break; }
    LN[n] = { i0, i1: nx - 1, ok: true };
  });
  // a missing optional line sits on the last word of the line before it
  names.forEach((n, j) => {
    if (LN[n].ok) return;
    let k = j - 1; while (k >= 0 && !LN[names[k]].ok) k--;
    const e = k >= 0 ? LN[names[k]].i1 : 0;
    LN[n] = { i0: e, i1: e, ok: false };
  });
}
/** start frame of line n */
const L = (n: LineName) => (LN[n].ok ? WORDS[LN[n].i0].f : WORDS[LN[n].i1].fe);
/** end frame of line n (its last word's end) */
const LE = (n: LineName) => WORDS[LN[n].i1].fe;
/** index of word w (k-th occurrence) inside line n; a word the voice changed falls back to its share of the line */
const wIdx = (n: LineName, w: string, k = 0): number | null => {
  const { i0, i1, ok } = LN[n];
  if (!ok) return null;
  let i = i0, hit = -1;
  for (let c = 0; c <= k; c++) { hit = find(toks(w), i, i1 + 1); if (hit < 0) break; i = hit + 1; }
  return hit >= 0 ? hit : null;
};
const share = (n: LineName, w: string) => {
  const t = toks(LINES[n]), j = Math.max(0, t.indexOf(toks(w)[0]));
  return L(n) + ((LE(n) - L(n)) * j) / Math.max(1, t.length);
};
/** start / end frame of word w of line n */
const Wd = (n: LineName, w: string, k = 0) => { const i = wIdx(n, w, k); return i === null ? (LN[n].ok ? share(n, w) : L(n)) : WORDS[i].f; };
const WdE = (n: LineName, w: string, k = 0) => { const i = wIdx(n, w, k); return i === null ? (LN[n].ok ? share(n, w) + 6 : LE(n)) : WORDS[i].fe; };
/** is the line in this voice? */
export const hasLine = (n: LineName) => LN[n].ok;

export const END = WORDS[WORDS.length - 1].fe;               // the last word ends ("money?")
/** the picture runs TAIL frames past the last word, then loops into frame 0. p3 (FIX2 D2): 24 f: E3's slow pass on the
 *  first duck holds ~0.5 s past "money?", then a quick rewind to frame 0 (remap.ts) */
export const TAIL = 24;
/** the film length AND the loop period: frame TOTAL shows exactly frame 0 (E3 rewinds to picture time 0, see remap.ts) */
export const TOTAL = END + TAIL;
/** every shot is alive from s.a - XPAD to s.b + XPAD picture frames (a dissolve of up to 2 * XPAD frames fits) */
export const XPAD = 6.5;

/** frames the story beats react on (cams, cast, overlays and sound read these; react 0-3 f before the word) */
const BW = {
  // ---- QUIZ ----
  quick: L("quick"), test: Wd("quick", "test"),
  count: L("count"), people: Wd("count", "people"), onAPhone: Wd("count", "phone"), jobEnd: LE("count"),
  dontLose: L("dontLose"), loseCount: Wd("dontLose", "count"), dontLoseEnd: LE("dontLose"),
  howMany: L("howMany"), manyQ: Wd("howMany", "many"), howManyEnd: LE("howMany"),
  five: L("five"), fiveEnd: LE("five"),
  andTheClown: L("andClown"), clownQ: Wd("andClown", "clown"), clownQEnd: LE("andClown"),
  youSaw: L("sawHim"), sawHim: Wd("sawHim", "saw"), right: Wd("sawHim", "right"), youSawEnd: LE("sawHim"),
  // ---- STORY ----
  inAReal: L("experiment"), experiment: Wd("experiment", "experiment"), most: Wd("experiment", "most"), phoneCall: Wd("experiment", "phone"),
  neverSaw: Wd("experiment", "never"), sawHim7: Wd("experiment", "saw"), experimentEnd: LE("experiment"),
  psychologist: L("hyman"), hyman: Wd("hyman", "hyman"), needed: Wd("hyman", "needed"), distraction: Wd("hyman", "distraction"),
  nobody: Wd("hyman", "nobody"), miss: Wd("hyman", "miss"), hymanEnd: LE("hyman"),
  thenAStudent: L("student"), student: Wd("student", "student"), toldHim: Wd("student", "told"), studentEnd: LE("student"),
  iOwn: L("unicycle"), own: Wd("unicycle", "own"), unicycle: Wd("unicycle", "unicycle"), unicycleEnd: LE("unicycle"),
  andAClown: L("suit"), clownSuit: Wd("suit", "clown"), suit: Wd("suit", "suit"), suitEnd: LE("suit"),
  soFor: L("hour"), oneHour: Wd("hour", "hour"), theClownRode: Wd("hour", "clown"), circles: Wd("hour", "circles"), middle: Wd("hour", "middle"),
  campus: Wd("hour", "campus"), hourEnd: LE("hour"),
  thenHisTeam: L("team"), asked: Wd("team", "asked"), leaving: Wd("team", "leaving"), teamEnd: LE("team"),
  didYouSee: L("unusual"), anything: Wd("unusual", "anything"), unusual: Wd("unusual", "unusual"), unusualEnd: LE("unusual"),
  theClownQ: L("amazing"), heWas: Wd("amazing", "he"), amazing: Wd("amazing", "amazing"), amazingEnd: LE("amazing"),
  dude: L("dude"), unicycleGuy: Wd("dude", "guy"), dudeEnd: LE("dude"),
  sorry: L("whatClown"), whatClown: Wd("whatClown", "what"), whatClownEnd: LE("whatClown"),
  even: L("straight"), straightOut: Wd("straight", "straight"), only: Wd("straight", "only"), one18: Wd("straight", "1"), in18: Wd("straight", "in"),
  four18: Wd("straight", "4"), four18End: WdE("straight", "4"), onACall: Wd("straight", "call"), had: Wd("straight", "had"), hadSeen: Wd("straight", "seen"), straightEnd: LE("straight"),
  many: L("spun"), spun: Wd("spun", "spun"), around: Wd("spun", "around"), toLook: Wd("spun", "look"), spunEnd: LE("spun"),
  heres: L("weird"), weird: Wd("weird", "weird"), listening: Wd("weird", "listening"), music: Wd("weird", "music"), noticed: Wd("weird", "noticed"),
  weirdEnd: LE("weird"),
  youSee: L("youSee"), aCall: Wd("youSee", "call"), pulls: Wd("youSee", "pulls"), yourMind: Wd("youSee", "mind"), someone: Wd("youSee", "someone"),
  isntThere: Wd("youSee", "there"), youSeeEnd: LE("youSee"),
  soHyman: L("sneakier"), tried: Wd("sneakier", "tried"), sneakier: Wd("sneakier", "sneakier"), sneakierEnd: LE("sneakier"),
  heHung: L("hung"), hung: Wd("hung", "hung"), dollarBills: Wd("hung", "dollar"), onABranch: Wd("hung", "branch"), rightAt: Wd("hung", "right"),
  headHeight: Wd("hung", "head"), hungEnd: LE("hung"),
  nearly: L("nearly"), everyone: Wd("nearly", "everyone"), ducked: Wd("nearly", "ducked"), underIt: Wd("nearly", "under"), nearlyEnd: LE("nearly"),
  onAPhoneQ: L("onAPhone"), phoneQ: Wd("onAPhone", "phone"), onlySix: Wd("onAPhone", "only"), six: Wd("onAPhone", "6"), in100: Wd("onAPhone", "in"),
  hundred: Wd("onAPhone", "100"), stoppedFor: Wd("onAPhone", "stopped"), theMoney25: Wd("onAPhone", "money"), onAPhoneEnd: LE("onAPhone"),
  theirBodies: L("bodies"), bodies: Wd("bodies", "bodies"), dodged: Wd("bodies", "dodged"), bodiesEnd: LE("bodies"),
  theirMinds: L("minds"), minds: Wd("minds", "minds"), neverSaw26: Wd("minds", "never"), mindsEnd: LE("minds"),
  // ---- END ----
  youCounted: L("counted"), fivePhones: Wd("counted", "5"), phonesW: Wd("counted", "phones"), countedEnd: LE("counted"),
  youSawThe: L("sawClown"), clownEnd: Wd("sawClown", "clown"), sawClownEnd: LE("sawClown"),
  didYou: L("money"), see: Wd("money", "see"), theMoney: Wd("money", "money"), theMoneyEnd: WdE("money", "money"), end: END,
};
/** the story beats (LOOK moved off cut 1's names; the LEGACY aliases were removed on 2026-11-17) */
export const BEAT = BW;
export type BeatName = keyof typeof BEAT;

// ---------------- who talks when (character lines: the talking actor's mouth moves on these words) ----------------
export type Talk = { who: string; line: LineName; a: number; b: number; words: { w: string; f: number; fe: number }[] };
const SPEAKER_OF: Partial<Record<LineName, string>> = { unicycle: "student", suit: "student", unusual: "interviewer", amazing: "friend",
  dude: "headphones", whatClown: "phone_guy" };
/** the character lines (the voice's own `speaker` field wins over the script's when it is there) */
export const TALKS: Talk[] = (Object.keys(SPEAKER_OF) as LineName[]).filter((n) => LN[n].ok).map((n) => {
  const { i0, i1 } = LN[n], ws = WORDS.slice(i0, i1 + 1);
  const ph = PHRASES.find((p) => p.f <= ws[0].f + 1 && p.fe >= ws[0].fe - 1) as { speaker?: string } | undefined;
  const who = (ph?.speaker && !/^(n|narrator)$/i.test(ph.speaker) ? ph.speaker : SPEAKER_OF[n]!).toLowerCase();
  return { who, line: n, a: ws[0].f, b: ws[ws.length - 1].fe, words: ws.map((w) => ({ w: w.w, f: w.f, fe: w.fe })) };
});
/** is `who` talking at frame f (inside a word, +-1 f)? who: student / interviewer / friend / headphones / phone_guy */
export const talking = (who: string, f: number) => TALKS.some((t) => t.who === who && t.words.some((w) => f >= w.f - 1 && f <= w.fe + 1));

// ---------------- shots ----------------
export type Relight = { f: number; to: LightName; dur: number };
export type ShotDef = { id: number; key: string; a: number; b: number; set: SetName; light: LightName; relight?: Relight[]; sunAz?: number; sunEl?: number;
  /** the line(s) it carries, for the tables */ line: string };
/** a dissolve boundary sits 3 f after the first word of the new clause, so the ~7 f dissolve starts 1 f before that word */
const B = (f: number) => f + 3;
/** a hard cut lands 2 f before the stressed word (the comic snaps) */
const C = (f: number) => f - 2;
const optA = (n: LineName, f: number, fallback: number) => (LN[n].ok ? f : fallback);
type Row = [key: string, a: number, set: SetName, light: LightName, line: string];
const R: Row[] = [
  ["Q1", 0, "square", "sq_day", "Quick test. Count the people on a phone. [the count] Don't lose count."],
  ["Q2", B(BEAT.howMany), "square", "sq_day", "How many? Five."],
  ["Q3", B(BEAT.andTheClown), "square", "sq_day", "And the clown? You saw him, right?"],
  ["S1", B(BEAT.inAReal), "square", "sq_day", "In a real experiment, most people on a phone call never saw him."],
  ["S2", B(BEAT.psychologist), "office", "of_warm", "Psychologist Ira Hyman needed a distraction nobody could miss."],
  ["S3", B(BEAT.thenAStudent), "office", "of_warm", "Then a student told him:"],
  ["S4", B(BEAT.iOwn), "office", "of_warm", "STUDENT: I own a unicycle."],
  ["S5", C(BEAT.andAClown), "office", "of_warm", "STUDENT: ...and a clown suit. (HARD CUT on \"...and\"; the bag flings open on \"clown\")"],
  ["S6", B(BEAT.soFor), "square", "sq_day", "So for one hour, the clown rode circles in the middle of campus."],
  /* p3 (FIX2 D4 + audit p2 m7 / M3): every join on a sentence boundary. Without the "team" line S6 keeps the whole of
     "...in the middle of campus."; S7 = the INTERVIEWER'S LINE, said facing the lens; S8 = the reaction: it comes in as
     her question ends and holds the friend's face through "The clown?"; S9 = "He was amazing!" (the pair, the pedal mime) */
  ["S7", optA("team", B(BEAT.thenHisTeam), B(BEAT.didYouSee)), "square", "sq_day", LN.team.ok ? "Then his team asked people leaving:" : "INTERVIEWER: Did you see anything unusual? (she asks FACING the lens)"],
  ["S8", optA("team", B(BEAT.didYouSee), BEAT.unusualEnd + 2), "square", "sq_day", LN.team.ok ? "INTERVIEWER: Did you see anything unusual?" : "(the reaction, as the question ends) FRIEND: The clown?"],
  ["S9", optA("team", B(BEAT.theClownQ), B(BEAT.heWas)), "square", "sq_day", LN.team.ok ? "FRIEND: The clown? He was amazing!" : "FRIEND: He was amazing! (the pedal mime)"],
  ["S10", B(BEAT.dude), "square", "sq_day", "HEADPHONES: Dude, the unicycle guy!"],
  ["S11", B(BEAT.sorry), "square", "sq_day", "PHONE GUY: Sorry... what clown?"],
  ["S12", B(BEAT.even), "square", "sq_day", "Even asked straight out, only 1 in 4 people on a call had seen him."],
  ["S13", optA("spun", C(BEAT.many), B(BEAT.heres) - 45), "square", "sq_day", "Many spun around to look. (HARD CUT on \"Many\"; the spin on \"spun around\")"],
  ["S14", B(BEAT.heres), "square", "sq_day", "Here's the weird part: people listening to music noticed him."],
  ["S15", B(BEAT.youSee), "square", "sq_day", "You see, a call pulls your mind toward someone who isn't there."],
  ["S16", B(BEAT.soHyman), "square", "sq_day", "So Hyman tried something sneakier."],
  ["S17", B(BEAT.heHung), "square", "sq_day", "He hung dollar bills on a branch, right at head height."],
  ["S18", B(BEAT.nearly), "square", "sq_day", "Nearly everyone ducked under it."],
  ["S19", B(BEAT.onAPhoneQ), "square", "sq_day", "On a phone? Only 6 in 100 stopped for the money."],
  ["S20", B(BEAT.theirBodies), "square", "sq_slow", "Their bodies dodged it. Their minds never saw it. (SLOW MOTION ~45 %)"],
  /* p3 (FIX2 D2): E1 comes in during the silence after the mind-blow line (its dissolve centred <= 5 f after "saw it.");
     E3 cuts to the rewind in the hush after "clown." (never later than 3 f before "Did") */
  ["E1", Math.min(B(BEAT.youCounted), BEAT.mindsEnd + 5), "square", "sq_day", "You counted five phones. (REPLAY of Q1: five holds, a number on each)"],
  ["E2", B(BEAT.youSawThe), "square", "sq_day", "You saw the clown. (REPLAY of Q3)"],
  ["E3", Math.min(BEAT.sawClownEnd + 2, BEAT.didYou - 3), "square", "sq_day", "Did you see the money? (TAPE REWIND -> a slow pass on the first duck -> frame 0; HARD CUT in, in the hush)"],
];
export const SHOTS: ShotDef[] = R.map(([key, a, set, light, line], i) => ({ id: i + 1, key, a, b: i + 1 < R.length ? R[i + 1][1] : TOTAL, set, light, line }));
export const LAST = SHOTS.length;
/** shot id by key ("Q1", "S20", "E3") */
export const SID = Object.fromEntries(SHOTS.map((s) => [s.key, s.id])) as Record<string, number>;
// S6: time passes (an hour): the light should swing a little warmer over the line. No warmer square preset exists yet
// (LOOK: add e.g. "sq_late" to look_square.ts + plan.ts LightName, then: SHOTS[SID.S6 - 1].relight = [{ f: BEAT.theClownRode - 6, to: "sq_late", dur: 70 }])
SHOTS[SID.S6 - 1].relight = [{ f: BEAT.theClownRode - 6, to: "sq_warm", dur: 70 }];   /* LOOK p3: "sq_warm" exists (look_square.ts): the light turns late-afternoon as the clock spins */
// S15: the world drains as her mind leaves for the call
SHOTS[SID.S15 - 1].relight = [{ f: BEAT.pulls - 4, to: "sq_call", dur: 18 }];

/** cross-dissolve length (VIDEO frames) into each shot; 0 = a straight cut (the comic snaps: the clown suit, the spin, the
 *  rewind). Default 7 f (BUILD_PLAN_v2: 6-8 f). */
export const XFADE: Record<number, number> = Object.fromEntries(SHOTS.slice(1).map((s) => [s.id, 7]));
XFADE[SID.S5] = 0; XFADE[SID.S13] = 0; XFADE[SID.E3] = 0;
XFADE[SID.S3] = 6;   // the door: a quick one
XFADE[SID.S6] = 8;   // out of the office into the hour: a touch longer

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

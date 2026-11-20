// BEATS + SHOT TABLE of "The Typo That Sold More Shares Than Existed" (typo), keyed to the FINAL voice (words.ts,
// generated from sound/typo/voice/words.json: 84.15 s since the P2 touch-ups: phrase 5 "Each one costs around 600,000
// yen." is CUT, so PW(5, ...) does not exist; the boss's "Cancel it!" is its own voice). Never literal frames: every
// key frame is a word (PW = start frame of a word in phrase i, PWE = its end frame). The picture runs on this voice
// (voicewarp.ts is an IDENTITY map), every helper still goes through the words so a later re-voice moves everything.
import { WORDS, PW, PWE, PWi, wi } from "./words";
import type { LightName, SetName } from "./plan";

export const FPS = 30;
/** start frame of the n-th (0-based) `w` inside phrase i */
const PWn = (i: number, w: string, n: number) => WORDS[wi(w, PWi(i), n)].f;
const PWEn = (i: number, w: string, n: number) => WORDS[wi(w, PWi(i), n)].fe;
export const END = WORDS[WORDS.length - 1].fe;              // the last word ends ("years.")
export const TAIL = 20;                                     // silent loop button after the last word (= voice_warp.py TAIL)
export const TOTAL = END + 2 + TAIL;
/** every shot is alive from s.a - XPAD to s.b + XPAD picture frames (a dissolve of up to 2 * XPAD frames fits) */
export const XPAD = 6.5;

/** frames the story beats react on (cast.ts / sets_*.ts / cams_*.ts / sound read these; react 0-3 f before the word) */
export const BEAT = {
  // 1 HOOK: "One typo cost a Tokyo bank ¥40 billion. And it sold shares... that didn't even exist."
  one: PW(0), typo: PW(0, "typo"), cost: PW(0, "cost"), tokyo: PW(0, "Tokyo"), bank: PW(0, "bank"), forty: PW(0, "¥40"), billion: PW(0, "billion."),
  billionEnd: PWE(0, "billion."), andIt: PW(1), sold: PW(1, "sold"), shares1: PW(1, "shares..."), that1: PW(1, "that"), didnt: PW(1, "didn't"),
  even: PW(1, "even"), exist1: PW(1, "exist."), exist1End: PWE(1, "exist."),
  // 2 SETTING: "December 8th, 2005. A small company called J-Com starts trading on the Tokyo Stock Exchange."
  december: PW(2), eighth: PW(2, "8th,"), y2005: PW(2, "2005."), small: PW(3, "small"), company: PW(3, "company"), called: PW(3, "called"),
  jcom: PW(3, "J-Com"), starts: PW(3, "starts"), trading: PW(3, "trading"), tokyo2: PW(3, "Tokyo"), stockEx: PW(3, "Stock"), exchange: PW(3, "Exchange."),
  exchangeEnd: PWE(3, "Exchange."),
  // 3 THE SIZE: "It has only about 14,500 shares."
  itHas: PW(4), only: PW(4, "only"), about1: PW(4, "about"), n14500: PW(4, "14,500"), shares2: PW(4, "shares."), shares2End: PWE(4, "shares."),
  // 4 THE TRADER: "At Mizuho Securities, a trader gets a simple job: sell one share, for ¥610,000."
  at: PW(6), mizuho: PW(6, "Mizuho"), securities: PW(6, "Securities,"), trader: PW(6, "trader"), gets: PW(6, "gets"), simple: PW(6, "simple"), job: PW(6, "job:"),
  sell1: PW(7), oneShare: PW(7, "one"), share: PW(7, "share,"), for1: PW(7, "for"), y610k: PW(7, "¥610,000."), y610kEnd: PWE(7, "¥610,000."),
  // "He types... 610,000 shares... for ¥1."   (the QTY / PRICE boxes fill on the words)
  he: PW(8), types: PW(8, "types..."), n610k: PW(8, "610,000"), n610kEnd: PWE(8, "610,000"), shares3: PW(8, "shares..."), for2: PW(8, "for"),
  yen1: PW(8, "¥1."), yen1End: PWE(8, "¥1."),
  // "Easy mistake."  (FUNNY: a held deadpan + a tea sip, the comic plink)
  easy: PW(9), mistake: PW(9, "mistake."), mistakeEnd: PWE(9, "mistake."),
  // 5 41 TIMES: "That's 41 times more shares than the whole company has."
  thats: PW(10), n41: PW(10, "41"), times: PW(10, "times"), more: PW(10, "more"), whole: PW(10, "whole"), company2: PW(10, "company"), has: PW(10, "has."),
  hasEnd: PWE(10, "has."),
  // 6 MYSTERY: "But how do you sell something that doesn't exist?"  (the light dims, a "?" in his glasses)
  but: PW(11), how: PW(11, "how"), sell2: PW(11, "sell"), something: PW(11, "something"), doesnt: PW(11, "doesn't"), exist2: PW(11, "exist?"),
  exist2End: PWE(11, "exist?"),
  // 7 CANCEL: "Cancel it!" (the BOSS, his own voice; lip flaps ONLY here) "They press cancel. Nothing. Again. Nothing."
  cancelIt: PW(12), cancelItEnd: PWE(12, "it!\""), they: PW(13), press: PW(13, "press"), cancel3: PW(13, "cancel."), cancel3End: PWE(13, "cancel."),
  nothing1: PW(14), nothing1End: PWE(14, "Nothing."), again: PW(15), againEnd: PWE(15, "Again."), nothing2: PW(16), nothing2End: PWE(16, "Nothing."),
  // 8 CRASH AND GRAB: "The price crashes to the floor. And all over Japan, buyers grab the cheap shares."
  price: PW(17), crashes: PW(17, "crashes"), floor: PW(17, "floor."), floorEnd: PWE(17, "floor."),
  andAll: PW(18), japan: PW(18, "Japan,"), buyers: PW(18, "buyers"), grab: PW(18, "grab"), cheap: PW(18, "cheap"), shares4: PW(18, "shares."),
  // "One 27-year-old with an online account makes over ¥2 billion."
  one27: PW(19), y27: PW(19, "27-year-old"), online: PW(19, "online"), account: PW(19, "account"), makes: PW(19, "makes"), over1: PW(19, "over"),
  b2: PW(19, "¥2"), billion2: PW(19, "billion."), billion2End: PWE(19, "billion."),
  // 9 PIVOT: "You see, a stock exchange is like a giant notice board. You pin up "selling", and it doesn't stop to check if
  //    you really have it."  "And the cancel button? The exchange's own system had a bug."
  youSee: PW(20), see: PW(20, "see,"), stock: PW(20, "stock"), giant: PW(20, "giant"), notice: PW(20, "notice"), board: PW(20, "board."),
  youPin: PW(21), pin: PW(21, "pin"), up: PW(21, "up"), selling: PW(21, "\"selling\","), doesntStop: PW(21, "doesn't"), stop: PW(21, "stop"),
  check: PW(21, "check"), really: PW(21, "really"), have: PW(21, "have"), haveEnd: PWEn(21, "it.", 1),
  andCancel: PW(22), cancelBtn: PW(22, "cancel"), button: PW(22, "button?"), exchanges: PW(23, "exchange's"), system: PW(23, "system"), bug: PW(23, "bug."),
  bugEnd: PWE(23, "bug."),
  // 10 THE BILL: "Mizuho bought most shares back. But over 96,000 of them never existed, so it paid cash instead.
  //    The bill: about ¥40 billion."
  mizuho2: PW(24), bought: PW(24, "bought"), back: PW(24, "back."), but2: PW(25), n96k: PW(25, "96,000"), never: PW(25, "never"), existed: PW(25, "existed,"),
  so: PW(25, "so"), paid: PW(25, "paid"), cash: PW(25, "cash"), instead: PW(25, "instead."), theBill: PW(26), bill: PW(26, "bill:"), about2: PW(26, "about"),
  forty2: PW(26, "¥40"), billion3: PW(26, "billion."), billion3End: PWE(26, "billion."),
  // 11 THE COURT: "Years later, a court ruled the exchange had to pay part of it."
  years: PW(27), later: PW(27, "later,"), court: PW(27, "court"), ruled: PW(27, "ruled"), pay: PW(27, "pay"), part: PW(27, "part"), partEnd: PWE(27, "it."),
  // 12 PAYOFF / LOOP: "The typo took one second. The fight over it took eight years."
  theTypo: PW(28), typo2: PW(28, "typo"), oneSec: PW(28, "one"), second: PW(28, "second."), theFight: PW(29), fight: PW(29, "fight"),
  eight: PW(29, "eight"), years2: PW(29, "years."), end: END,
};
void PWn;

// ---------------- shots ----------------
export type Relight = { f: number; to: LightName; dur: number };
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: LightName; relight?: Relight[]; sunAz?: number; sunEl?: number };
/** shot boundaries sit 3 f after the first word of the new clause, so the ~10 f dissolve starts 2 f before that word */
const B = (f: number) => f + 3;
const bound = [
  0,                         // 1  HOOK: finger presses the glowing ENTER, certificates puff out, SHARES SOLD races   "One typo ... didn't even exist."
  B(BEAT.december),          // 2  STREET: Tokyo, December 2005, glide toward the exchange   "December 8th, 2005. A small company called"
  B(BEAT.jcom),              // 3  LOBBY: the round ticker wall, the mascot rings the debut bell   "J-Com starts trading on the Tokyo Stock Exchange."
  B(BEAT.itHas),             // 4  PEDESTAL: one tidy stack of 14,500 under a spotlight   "It has only about 14,500 shares."
  B(BEAT.at),                // 5  TRADING ROOM: the wide, then the trader + boss; "sell one share"   "At Mizuho Securities ... ¥610,000."
  B(BEAT.he),                // 6  TYPING: the order screen fills QTY 610000 / PRICE 1; then his deadpan + tea   "He types ... Easy mistake."
  BEAT.n41,                  // 7  41x (fix2, audit 10: a HARD CUT on "41": the deadpan sip of "Easy mistake." holds clean to the cut): the stack dwarfed by a 41-stack tower through the ceiling   "That's 41 times ... company has."
  B(BEAT.but),               // 8  MYSTERY + CANCEL: push on the screen, "?" in his glasses; the boss bursts in; CANCEL x2   "But how ... Nothing."
  BEAT.nothing2End + 16,     // 9  CRASH: the ticker wall's price line plunges onto the red FLOOR bar   "The price crashes to the floor."
  B(BEAT.andAll),            // 10 HOMES: buyers all over Japan click BUY; glide into the 27-year-old's flat   "And all over Japan ... ¥2 billion."
  B(BEAT.youSee),            // 11 PIVOT: the giant notice board, SELLING!, tabs, empty pockets; the CANCEL button + bug   "You see ... had a bug."
  B(BEAT.mizuho2),           // 12 THE BILL: evening; certificates back, ghosts -> cash envelopes, the endless receipt   "Mizuho bought ... ¥40 billion."
  B(BEAT.years),             // 13 COURT: three judges, the broken CANCEL on the evidence table, 2005 -> 2013   "Years later ... part of it."
  B(BEAT.theTypo),           // 14 PAYOFF / LOOP: back to the glowing ENTER (frame 0)   "The typo took one second. The fight ... eight years."
  TOTAL,
];
const set: SetName[] = ["trading", "street", "lobby", "lobby", "trading", "trading", "lobby", "trading", "lobby", "homes", "hall", "trading", "court", "trading"];
const light: LightName[] = ["desk_am", "street_day", "lobby", "museum", "desk_am", "desk_am", "museum", "desk_am", "lobby", "homes", "hall", "desk_eve", "court", "desk_am"];
export const SHOTS: ShotDef[] = set.map((s, i) => ({ id: i + 1, a: bound[i], b: bound[i + 1], set: s, light: light[i] }));
export const LAST = SHOTS.length;
// fix3 (owner): the hook: the WHOLE ROOM flips to the cancel beat's warning red as the counter crosses 14,500 (it reaches
// 14,500 on "billion.": sets_desk soldAt), a 10 f ramp, held to the end of shot 1 (shot 14 = the loop stays desk_am)
SHOTS[0].relight = [{ f: BEAT.billion, to: "alarm_red", dur: 10 }];
// the mystery: the room dims a little on "But" (the screens glow more); the boss's shout flips it to warning red
SHOTS[7].relight = [{ f: BEAT.but - 4, to: "desk_dim", dur: 40 }, { f: BEAT.cancelIt - 3, to: "alarm_red", dur: 9 }];
// the crash: the ticker wall turns red as the price plunges
SHOTS[8].relight = [{ f: BEAT.crashes - 2, to: "lobby_red", dur: 22 }];

/** cross-dissolve length (VIDEO frames) into each shot: 10 f everywhere, 12 into the pivot (a new colour world) and the
 *  court (a jump of years) */
export const XFADE: Record<number, number> = Object.fromEntries(SHOTS.slice(1).map((s) => [s.id, 10]));
XFADE[11] = 12; XFADE[13] = 12;
XFADE[7] = 0;   // fix2 (audit 10): no dissolve eating the "Easy mistake." punchline: a straight cut on "41"

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export { PW, PWE, PWn, PWEn };

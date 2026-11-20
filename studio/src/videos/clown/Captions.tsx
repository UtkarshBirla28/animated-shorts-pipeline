// Burned-in captions of "The Clown Nobody Saw", channel spec (study/CHANNEL_STYLE_BIBLE.md section 7, verified on 16
// videos; the antitheft caption engine, verified on full-size PNG stills: cap top 1322, baseline 1376, centre x 538-540.5,
// 5 px visible stroke): Montserrat 900, 76 px, #FFFFFF, 5 px visible black stroke (paint-order stroke), black shadow 2 px
// right / 4 px down with a ~3 px blur at 85 %, centred x 540, cap top ~1323 / baseline ~1376 (CSS top 1311 px at
// line-height 1): inside the caption band y 1280-1440, far from the count text / chip (top-right) and the bills (upper-left).
// One word per caption; short function words join the next word (never into a punch word, never across a real pause);
// max 3; a caption that would flash for < 4 f merges into its neighbour; hard swap 2 frames before the word's onset.
// CLOWN v6 (SOUND, re-measured on the v6 voice, sound/clown/voice of 2026-11-17 08:10: narrator + five character voices,
// 177 tokens, 70.49 s; the character lines are captioned exactly like the narrator, same spec):
//  - a caption is held through the normal sentence gaps (0.10-0.17 s on this voice) but HIDDEN in a real pause: when the
//    next word starts >= HIDE_GAP_F frames after this caption's last word ends, it leaves HOLD_F frames after that word.
//    On this voice the band is empty in the 7 s COUNT (after "phone." f 65-152 and after "count." f 188-272: the only
//    caption inside the count is "Don't lose count."), before "Five." (12 f), after "unusual?" (12.6 f), inside
//    "Sorry... | what" (11.7 f), after "money." (9 f) and in the hush before "Did you see the money?" (10.5 f);
//  - the two statistics BUILD word by word: "1" -> "1 in" -> "1 in 4", "6" -> "6 in" -> "6 in 100" (each word still
//    appears on its own onset, nothing is shown early, and the whole number is on screen to read);
//  - first caption on frame 1, the last one ("money?") held to TAIL_BLANK frames before the end, so frame 0 and the last
//    frames are the same captionless loop picture. No animation, no emphasis colour. Digits as in words.ts (1, 4, 6, 100);
//  - never over the graphics: the chip / the big 5 sit at y 300-480 (top right), the E1 number pops are clamped to
//    y <= 1180 (Overlays.tsx), the caption band is y 1280-1440.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { SHOTS, XFADE, XPAD, BEAT, V } from "./story";
// captions follow the narration on the real video frame; SHOTS / XFADE are on the picture clock (identity today), so their
// frames go through toNew()
import { VOICE_WORDS as WORDS, VOICE_TOTAL as TOTAL, toNew } from "./voicewarp";

// Loop seam: the last caption ("money?") leaves TAIL_BLANK frames before the end (frame 0 is captionless too), keyed to
// SHOTS / XFADE (never frame numbers), so a voice re-time follows.
const LAST = SHOTS[SHOTS.length - 1];
const TAIL_BLANK = 5;
const LOOP_HIDE = Math.max(Math.round(Math.min(toNew(LAST.a), toNew(LAST.a) + ((XFADE[LAST.id] ?? 0) + 1) / 2, toNew(LAST.a + XPAD))), TOTAL - TAIL_BLANK);
const FIRST_F = 1;

// function words that join the next word ("a unicycle", "on a phone.", "of his owned", "So the", "you counted.")
const JOIN = new Set(["a", "an", "the", "of", "to", "in", "on", "at", "and", "so", "is", "it", "you", "her", "his", "with", "one",
  "by", "he", "but", "when", "if"]);
// a function word never JOINS into one of these (the words the picture lands on): the user's rule "never reveal a punch
// word before it is spoken"
const PUNCH = new Set(["count", "phone", "phones", "five", "clown", "never", "unicycle", "suit", "unusual", "amazing", "1", "4", "weird",
  "music", "mind", "sneakier", "dollar", "bills", "ducked", "6", "100", "bodies", "minds", "money"]);
/* clown v6: the words the picture lands on (the job, the answer, the decoy, the student's two props, the four interview
   lines, the two numbers, the turn, the money, the reveal): each one comes up alone on its own onset ("on a" | "phone.",
   "the" | "clown?", "...and a" | "clown" | "suit.", "what" | "clown?", "to" | "music", "your" | "mind", "dollar" |
   "bills", "the" | "money?") */
/** the statistics build up word by word (matched on the bare words of consecutive one-word captions) */
const BUILD: string[][] = [["1", "in", "4"], ["6", "in", "100"]];
// ... nor across a real pause: the voice's TRUE silences, measured on sound/clown/voice/voice.wav (v6; 10 ms RMS at a 5 ms
// hop, below p99 - 40 dB = -52.7 dBFS, for >= 0.10 s: 33 of them). A function word followed by one of >= GAP_F frames
// shows alone. A re-cut voice simply falls back to the punch rule.
const SIL: [number, number][] = [[0.71, 0.83], [2.15, 5.12], [6.27, 9.12], [9.65, 9.99], [10.70, 10.81], [11.69, 11.81], [12.87, 12.99],
  [16.89, 16.99], [20.95, 21.10], [22.23, 22.37], [23.68, 23.93], [25.01, 25.14], [29.07, 29.21], [32.05, 32.17], [33.48, 33.58],
  [34.22, 34.38], [36.49, 36.60], [39.27, 39.44], [42.16, 42.27], [43.58, 43.69], [46.42, 46.58], [48.37, 48.53], [49.92, 50.02],
  [52.58, 52.76], [55.81, 55.96], [56.48, 56.59], [57.95, 58.09], [58.90, 59.01], [61.42, 61.72], [63.45, 63.58], [65.38, 65.50],
  [67.13, 67.23], [68.45, 68.77]];
const GAP_F = 4;
/** ACOUSTIC onsets (video frames) where words.ts is off by > 1.5 f, measured on the v6 voice.wav.
 *  - The 32 words that follow a true silence: the end of that silence (and the first 5 ms frame within 30 dB of the word's
 *    peak) against the word's start in words.ts: all 32 agree within 0.5 f (the v4 word times were re-timed by the voice
 *    owner and pinned to the acoustic on / off at every sentence edge). "what" (84) has a soft breath from 36.645 s; its
 *    /w/ starts at 36.80-36.82 s as in words.ts: no fix.
 *  - 134 "branch," (the voice owner's note): words.ts 54.34 s, but the /b/ closure is 54.10-54.12 s and its burst is at
 *    54.13-54.14 s = f 1624 (the vowel peaks at 54.23 s): words.ts is 6 f late. Fixed here. (The caption is "on a
 *    branch,", which starts on "on", so the fix only matters if the grouping changes.)
 *  Applied only while the word at that index still has that text (a re-voice silently falls back to words.ts). */
const ONSET_FIX: [number, string, number][] = [[134, "branch,", 1624]];
const ONSET = WORDS.map((w, i) => {
  const fx = ONSET_FIX.find(([k, t]) => k === i && w.w === t);
  return fx ? fx[2] : w.f;
});
/** the silence (video frames) between word i and word i + 1 (0 when they run together) */
const gapAfter = (i: number) => {
  const w = WORDS[i], n = WORDS[i + 1];
  if (!w || !n) return 0;
  const ns = ONSET[i + 1] / 30;
  const r = SIL.find(([a, b]) => Math.abs(b - ns) <= 0.02 && a > w.s);
  return r ? (r[1] - r[0]) * 30 : 0;
};
const LEAD_F = 2;
/** the film's hard cuts (VIDEO frames). A caption swap that falls 1-3 f AFTER a cut snaps back onto the cut frame, so the
 *  old line never sits on the new picture (the new line then leads its word by <= 5 f, still never before the cut). v6
 *  has three: S5 (on "...and": "...and a" comes up on the cut frame), S13 (inside "on a call") and E3 (the rewind: "Did"
 *  comes up ON the cut, after the hush's empty band) */
const CUTS: number[] = SHOTS.filter((s, i) => i > 0 && !XFADE[s.id]).map((s) => s.a);   // v2 (EDIT): every straight cut (S5 the suit, S13 the spin, E3 the rewind); identity clock
const snapCut = (b: number) => { for (const c of CUTS) if (b > c && b - c <= 3) return c; return b; };
/** a caption leaves HOLD_F frames after its last word when the next word starts >= HIDE_GAP_F frames later (the two beats) */
const HIDE_GAP_F = 8, HOLD_F = 1;
/** a caption never grows past this many characters ("So the" | "professor": 16 would run to x ~ 960, into the UI column) */
const MAX_CHARS = 14;
const MIN_HOLD = 4; // frames: anything shorter merges into a neighbour (max 3 words, never across sentence punctuation)
const PUNCH_HOLD = 6;

/** Captions never sit on an in-world board. Two shots have a board in the caption band (seen on the stills
 *  out/clown/cap_v6_*.jpg of 2026-11-17): S12's clipboard page fills the frame centre down to y ~1470, and S19's A-frame
 *  board stands at x >= ~580 across the band. A caption whose first word starts inside one of these shots is placed clear
 *  of the board (px at 1080 x 1920): `top` = the CSS top of the line (default 1311), `dx` = the shift of its centre.
 *  S12: under the clipboard (cap top ~1500, baseline ~1554: still above the Shorts UI at the bottom). S19: 150 px to the
 *  left: the board's left edge is at x 580-600 through the shot, the widest caption there ("stopped", ~330 px) then ends
 *  at x ~555 (it sits between the stopper's legs and the board). Keyed by shot key, never by frame: a re-timed voice
 *  follows; if a camera of S12 / S19 changes, render the stills again and re-measure these two numbers. */
const PLACE: Record<string, { top?: number; dx?: number }> = { S19: { dx: -150 } }; /* lead p3: S12's override removed (EDIT frames the page high now); S19 to re-check on preview 3 (LOOK moved the board) */
const placeOf = (onset: number): { top?: number; dx?: number } => {
  const s = SHOTS.find((x) => onset >= toNew(x.a) && onset < toNew(x.b));
  return (s && PLACE[s.key]) || {};
};

export type Cap = { text: string; f0: number; f1: number; top?: number; dx?: number };
const clean = (w: string) => w.replace(/["“”]/g, "");
const ends = (w: string) => /[.,!?:;…]$|\.\.\.$/.test(w);
const opensQuote = (w: string) => /^["“]/.test(w);
const bareOf = (w: string) => clean(w).toLowerCase().replace(/[^a-z0-9']/g, "");
const isPunch = (w: string | undefined) => !!w && PUNCH.has(bareOf(w));

/** group display words into captions */
export const captions = (): Cap[] => {
  type G = { words: string[]; start: number; last: number };
  const caps: G[] = [];
  let cur: G | null = null;
  WORDS.forEach((w, i) => {
    const text = clean(w.w);
    if (!cur) cur = { words: [], start: ONSET[i], last: i };
    cur.words.push(text); cur.last = i;
    const next = WORDS[i + 1];
    const joinNext = JOIN.has(bareOf(text)) && !ends(text) && cur.words.length < 3 && !!next && !opensQuote(next.w)
      && !isPunch(next.w) && gapAfter(i) < GAP_F && [...cur.words, clean(next.w)].join(" ").length <= MAX_CHARS;
    if (!joinNext || cur.words.length >= 3) { caps.push(cur); cur = null; }
  });
  if (cur) caps.push(cur);
  // merge flashes (< MIN_HOLD f on screen) into the next caption, else into the previous one; never forward into a punch
  // word (it would show early): such a flash joins the previous caption or stays as it is
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i + 1 < caps.length; i++) {
      const c = caps[i], n = caps[i + 1], p = caps[i - 1];
      if (n.start - c.start >= MIN_HOLD) continue;
      const last = c.words[c.words.length - 1];
      if (!ends(last) && c.words.length + n.words.length <= 3 && !isPunch(n.words[0])) {
        caps.splice(i, 2, { words: [...c.words, ...n.words], start: c.start, last: n.last }); changed = true; break;
      }
      if (p && !ends(p.words[p.words.length - 1]) && p.words.length + c.words.length <= 3 && !isPunch(c.words[0])) {
        caps.splice(i - 1, 2, { words: [...p.words, ...c.words], start: p.start, last: c.last }); changed = true; break;
      }
    }
  }
  // a punch word the voice clips short (< PUNCH_HOLD f) takes the plain word after
  // it, so it is on screen long enough to read and is still never shown before it is spoken
  for (let i = 0; i + 1 < caps.length; i++) {
    const c = caps[i], n = caps[i + 1], last = c.words[c.words.length - 1];
    if (isPunch(c.words[0]) && n.start - c.start < PUNCH_HOLD && !ends(last) && !isPunch(n.words[0]) && c.words.length + n.words.length <= 3)
      caps.splice(i, 2, { words: [...c.words, ...n.words], start: c.start, last: n.last });
  }
  // the statistics build up: "1" -> "1 in" -> "1 in 4"
  const text = caps.map((c) => c.words.join(" "));
  for (const seq of BUILD)
    for (let i = 0; i + seq.length <= caps.length; i++)
      if (seq.every((b, k) => caps[i + k].words.length === 1 && bareOf(caps[i + k].words[0]) === b))
        for (let k = 1; k < seq.length; k++) text[i + k] = caps.slice(i, i + k + 1).map((c) => c.words[0]).join(" ");
  return caps.map((c, i) => {
    const next = i + 1 < caps.length ? snapCut(Math.max(FIRST_F, caps[i + 1].start - LEAD_F)) : Math.min(TOTAL - 1, Math.max(c.start + MIN_HOLD, LOOP_HIDE));
    const end = WORDS[c.last].fe;
    const pause = i + 1 < caps.length && caps[i + 1].start - end >= HIDE_GAP_F;
    return { text: text[i], f0: i === 0 ? FIRST_F : snapCut(Math.max(FIRST_F, c.start - LEAD_F)), f1: pause ? Math.min(next, end + HOLD_F) : next, ...placeOf(c.start) };
  });
};
const CAPS = captions();

let fontP: Promise<void> | null = null;
const loadMontserrat = () => {
  if (!fontP) {
    // Montserrat.ttf is the variable font (wght 100-900): font-weight 900 selects Black from it
    const ff = new FontFace("CapMontserrat", `url(${staticFile("fonts/Montserrat.ttf")})`, { weight: "100 900" });
    fontP = ff.load().then((f) => {
      (document.fonts as unknown as { add: (x: FontFace) => void }).add(f);
      if (!document.fonts.check(`900 76px CapMontserrat`)) throw new Error("CapMontserrat 900 not usable");
    });
  }
  return fontP;
};

const STYLE: React.CSSProperties = {
  position: "absolute", left: 0, right: 0, top: 1311, textAlign: "center",
  fontFamily: "CapMontserrat, Montserrat, sans-serif", fontWeight: 900, fontSize: 76, lineHeight: 1,
  color: "#FFFFFF", WebkitTextStroke: "10px #000", paintOrder: "stroke fill",
  // the shadow must be cast by the STROKED glyph: a CSS text-shadow is cast by the fill only and hides completely under
  // the 5 px stroke (measured: dark band 5/5/5/5 px, no shadow). drop-shadow() shadows the painted result; Chrome reads
  // its blur as the Gaussian sigma, so 1.5 px here = text-shadow blur 3 px (measured band top 4.9, left 4.9, right 8.4,
  // bottom 8.7 px; bible 4-5 / 5-6 / ~7 / 8-9).
  filter: "drop-shadow(2px 4px 1.5px rgba(0,0,0,.85))", whiteSpace: "nowrap", letterSpacing: 0,
};

export const Captions: React.FC<{ frame?: number }> = ({ frame }) => {
  const cf = useCurrentFrame();
  const f = frame ?? cf;
  const [handle] = useState(() => delayRender("caption font"));
  // a missing caption font must fail the render loudly, never fall back to a system sans
  useEffect(() => { loadMontserrat().then(() => continueRender(handle), (e) => cancelRender(e)); }, [handle]);
  const c = CAPS.find((k) => f >= k.f0 && f < k.f1);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {c ? <div style={c.top !== undefined || c.dx ? { ...STYLE, top: c.top ?? STYLE.top, left: c.dx ?? 0, right: -(c.dx ?? 0) } : STYLE}>{c.text}</div> : null}
    </AbsoluteFill>
  );
};

// Burned-in captions, channel spec (study/CHANNEL_STYLE_BIBLE.md section 7, verified on 16 videos; the antitheft caption
// engine, verified on full-size PNG stills: cap top 1322, baseline 1376, centre x 538-540.5, 5 px visible stroke):
// Montserrat 900, 76 px, #FFFFFF, 5 px visible black stroke (paint-order stroke), black shadow 2 px right / 4 px down
// with a ~3 px blur at 85 %, centred x 540, cap top ~1323 / baseline ~1376 (CSS top 1311 px at line-height 1).
// One word per caption; short function words join the next word (never into an opening quote, never into a punch word,
// never across a real pause); max 3; a caption that would flash for < 4 f merges into its neighbour; hard swap 2 frames
// before the word's ACOUSTIC onset; held through pauses ("$150 million..." through the long dramatic pause, "on the
// ground..." through the deadpan pause before "believed them."); first caption on frame 1, the last one held to
// TAIL_BLANK frames before the end, so frame 0 and the last frames are the same captionless loop picture. No animation,
// no emphasis colour. Quote marks are dropped (the shouted line keeps its "!"), every other punctuation mark is kept.
// Digits per the brief: 1963, $150 million, 90% (the display words of words.ts already carry them).
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { SHOTS, XFADE, XPAD, BEAT, V } from "./story";
// captions follow the narration on the real video frame; SHOTS / XFADE are on the picture clock (identity today), so their
// frames go through toNew()
import { VOICE_WORDS as WORDS, VOICE_TOTAL as TOTAL, toNew } from "./voicewarp";

// Loop seam: the last caption ("real.") leaves TAIL_BLANK frames before the end (frame 0 is captionless too), keyed to
// SHOTS / XFADE (never frame numbers), so a voice re-time follows.
const LAST = SHOTS[SHOTS.length - 1];
const TAIL_BLANK = 5;
const LOOP_HIDE = Math.max(Math.round(Math.min(toNew(LAST.a), toNew(LAST.a) + ((XFADE[LAST.id] ?? 0) + 1) / 2, toNew(LAST.a + XPAD))), TOTAL - TAIL_BLANK);
const FIRST_F = 1;

// function words that join the next word ("By 1963,", "He pumped", "But Tino's", "When it came", "on the ground...")
// fix r2 (audit A2 P3: "if" flashed alone for 4 f between "But what" and "someone"): "if" joins ("if someone")
const JOIN = new Set(["a", "an", "the", "of", "to", "in", "on", "at", "and", "so", "is", "it", "you", "her", "his", "with", "one",
  "by", "he", "but", "when", "if"]);
// a function word never JOINS into one of these (the joke / mystery / number words the picture lands on): the user's rule
// "never reveal a punch word before it is spoken" ("The" stands alone before "hardest-working"). "water" / "real" are
// not here: their punch uses ("mostly water.", "was real.") never follow a JOIN word, and "on water.", "with water,",
// "And the real" read better joined
const PUNCH = new Set(["150million", "90", "full", "inside", "mostly", "crashed", "bust", "hardestworking",
  "buffett", "warren", "fake", "believed", "king", "cheap"]);
// ... nor across a real pause: the voice's silences (10 ms RMS < p99 - 40 dB for >= 0.1 s), RE-MEASURED in fix round 2 on
// sound/saladoil/voice/voice.wav AFTER the LEAD's two silence inserts ('more.|And' 0.19 -> 0.38 s, 'out?|The' 0.26 ->
// 0.50 s: every later pause moved +0.19 / +0.43 s, so the round-1 list no longer matched any onset after 32 s and function
// words would have joined across real pauses), that END on a word onset (+-0.02 s). A function word followed by one of
// >= GAP_F frames shows alone. A re-cut voice simply falls back to the punch rule.
const SIL: [number, number][] = [[0.00, 0.13], [1.74, 1.84], [5.49, 6.11], [8.15, 8.52], [10.19, 10.29], [12.28, 12.44], [15.07, 15.40],
  [17.25, 17.66], [20.21, 20.49], [22.58, 22.69], [23.90, 24.00], [24.85, 25.19], [26.03, 26.13], [26.53, 26.89], [27.90, 28.07],
  [28.94, 29.47], [30.18, 30.59], [32.19, 32.54], [33.41, 33.65], [38.47, 38.86], [39.09, 39.21], [41.25, 41.92], [46.82, 46.97],
  [48.32, 48.76], [50.76, 51.11], [52.00, 52.46], [53.88, 54.70], [55.15, 55.37], [56.87, 57.11], [58.47, 58.94], [59.42, 59.53],
  [61.04, 61.31], [62.59, 62.77], [64.26, 64.42], [65.79, 66.22], [67.09, 67.41], [68.36, 68.56], [69.81, 69.93], [70.78, 70.95],
  [73.81, 74.15], [76.26, 76.67], [77.61, 77.78], [79.97, 80.29], [83.00, 83.11], [85.37, 85.65], [86.20, 86.55], [87.64, 88.06],
  [89.48, 89.82], [91.29, 91.44]];
const GAP_F = 4;
/** ACOUSTIC onsets (video frames) where words.ts is off by > 2 f, RE-MEASURED in fix round 2 on the current voice.wav
 *  (10 ms RMS envelope, after the LEAD's silence inserts): words.ts marks the start of a k-closure (silence) and the word
 *  is first heard on its burst. Applied only while the word at that index still has that text (a re-voice silently
 *  falls back to words.ts).
 * 104 "crashed.": the k-closure 46.07-46.14 s, the burst 46.15 s = 1384.5 (words.ts 1382)
 * 187 "crashed.": the k-closure 79.11-79.17 s, the burst 79.18 s = 2375.4 (words.ts 2373) */
const ONSET_FIX: [number, string, number][] = [[104, "crashed.", 1384.5], [187, "crashed.", 2375.4]];
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
/** fix r2 (audit A2 P3 shot 4: "full!" stayed 1 f over the ground shot after the hard cut): the film's hard cuts inside a
 *  shot (VIDEO frames; story.ts CAMS shot 4: R4_CUT_V = V(BEAT.andInspector) - 3). A caption swap that falls 1-3 f AFTER a
 *  cut snaps back onto the cut frame, so the old line never sits on the new picture (the new line then leads its word by
 *  <= 5 f, still never before the cut) */
const CUTS = [Math.round(V(BEAT.andInspector) - 3)];
const snapCut = (b: number) => { for (const c of CUTS) if (b > c && b - c <= 3) return c; return b; };
const MIN_HOLD = 4; // frames: anything shorter merges into a neighbour (max 3 words, never across sentence punctuation)
const PUNCH_HOLD = 6;

export type Cap = { text: string; f0: number; f1: number };
const clean = (w: string) => w.replace(/["“”]/g, "");
const ends = (w: string) => /[.,!?:;…]$|\.\.\.$/.test(w);
const opensQuote = (w: string) => /^["“]/.test(w);
const bareOf = (w: string) => clean(w).toLowerCase().replace(/[^a-z0-9']/g, "");
const isPunch = (w: string | undefined) => !!w && PUNCH.has(bareOf(w));

/** group display words into captions */
export const captions = (): Cap[] => {
  const caps: { words: string[]; start: number }[] = [];
  let cur: { words: string[]; start: number } | null = null;
  WORDS.forEach((w, i) => {
    const text = clean(w.w);
    if (!cur) cur = { words: [], start: ONSET[i] };
    cur.words.push(text);
    const next = WORDS[i + 1];
    const joinNext = JOIN.has(bareOf(text)) && !ends(text) && cur.words.length < 3 && !!next && !opensQuote(next.w)
      && !isPunch(next.w) && gapAfter(i) < GAP_F;
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
        caps.splice(i, 2, { words: [...c.words, ...n.words], start: c.start }); changed = true; break;
      }
      if (p && !ends(p.words[p.words.length - 1]) && p.words.length + c.words.length <= 3 && !isPunch(c.words[0])) {
        caps.splice(i - 1, 2, { words: [...p.words, ...c.words], start: p.start }); changed = true; break;
      }
    }
  }
  // a punch word the voice clips short (< PUNCH_HOLD f) takes the plain word after
  // it, so it is on screen long enough to read and is still never shown before it is spoken
  for (let i = 0; i + 1 < caps.length; i++) {
    const c = caps[i], n = caps[i + 1], last = c.words[c.words.length - 1];
    if (isPunch(c.words[0]) && n.start - c.start < PUNCH_HOLD && !ends(last) && !isPunch(n.words[0]) && c.words.length + n.words.length <= 3)
      caps.splice(i, 2, { words: [...c.words, ...n.words], start: c.start });
  }
  return caps.map((c, i) => ({
    text: c.words.join(" "),
    f0: i === 0 ? FIRST_F : snapCut(Math.max(FIRST_F, c.start - LEAD_F)),
    f1: i + 1 < caps.length ? snapCut(Math.max(FIRST_F, caps[i + 1].start - LEAD_F)) : Math.min(TOTAL - 1, Math.max(c.start + MIN_HOLD, LOOP_HIDE)),
  }));
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
      {c ? <div style={STYLE}>{c.text}</div> : null}
    </AbsoluteFill>
  );
};

// Burned-in captions, channel spec (study/CHANNEL_STYLE_BIBLE.md section 7, verified on 16 videos):
// Montserrat 900, 76 px, #FFFFFF, 5 px visible black stroke (paint-order stroke), black shadow 2 px right / 4 px down
// with a ~3 px blur at 85 %, centred x 540, cap top ~1323 / baseline ~1376 (CSS top 1311 px at line-height 1).
// One word per caption; short function words join the next word (never into an opening quote); max 3; a caption that
// would flash for < 4 f (the aligner squeezes some words to 1-3 f, e.g. "tested" 1 f) merges into its neighbour
// ("tested it.", "fewer than"); hard swap 2 frames before the word starts; held through pauses; first caption on
// frame 1, last held to the end of the last dissolve (round 4, see LOOP_HIDE). No animation, no emphasis colour. Quote marks are dropped (the sign and the
// voice carry the quotation), every other punctuation mark is kept.
// Verified on full-size PNG stills (2026-11-10, system Chrome via ANGLE, Montserrat.ttf wght 900): cap top 1322, baseline
// 1376 (cap height 53-54 px, "2%"), descender to 1390 ("permission."), x-height top 1334, centre x 538-540.5, fill 255,
// paint-order works (white glyph keeps its full 53 px; stroke adds 5.0 px outside), dark band beyond the white glyph
// top 5.0 / left 4.7-5.4 / right 6.2-6.3 / bottom 8.7 px (bible 4-5 / 5-6 / ~7 / 8-9). 157 captions, 1.31 words each
// (115 x 1, 36 x 2, 6 x 3), median hold 10 f, min 4 f, no gaps from frame 0 to the end of the last word.
// Loop seam: round 3 held "twice." to the final frame; round 4 (audit A3 P2) ends it with the 15 -> 16 dissolve and
// keeps frame 0 captionless, so the loop button and frame 0 match exactly (LOOP_HIDE below).
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { SHOTS, XFADE } from "./story";
// ElevenLabs re-time (LEAD): captions follow the NEW narration on the real video frame; SHOTS / XFADE are on the
// picture's old clock, so their frames go through toNew()
import { VOICE_WORDS as WORDS, VOICE_TOTAL as TOTAL, toNew } from "./voicewarp";

// Loop seam (round 4, audit A3 P2 shot 16): the last caption ("twice.") leaves when the 15 -> 16 dissolve has finished
// (the punchline must not sit on the honest woman), and frame 0 is captionless too: the first caption ("She'd", its
// word starts at 0.03 s) arrives on frame 1, as in 6 of the 16 references. The captionless loop button (from the end of
// that dissolve to the last frame) and frame 0 are then the same picture with no caption at all. Keyed to SHOTS / XFADE
// (never frame numbers), so a voice re-time follows.
// round 5: AntiTheft.tsx runs every dissolve on the VIDEO clock (XFADE + 1 equal steps centred where the picture reaches
// the shot boundary, clamped to s.a +- 3.95 picture frames): the same end frame here, so "twice." leaves on the first
// frame that is pure shot 16
const LAST = SHOTS[SHOTS.length - 1];
const LOOP_HIDE = Math.ceil(Math.min(toNew(LAST.a) + ((XFADE[LAST.id] ?? 0) + 1) / 2, toNew(LAST.a + 3.95))); // first frame after the last dissolve (new frames)
const FIRST_F = 1;

const JOIN = new Set(["a", "an", "the", "of", "to", "in", "on", "at", "and", "so", "is", "it", "you", "her", "his", "with", "one"]);
const LEAD_F = 2;
const MIN_HOLD = 4; // frames: anything shorter merges into a neighbour (max 3 words, never across sentence punctuation)

export type Cap = { text: string; f0: number; f1: number };
const clean = (w: string) => w.replace(/["“”]/g, "");
const ends = (w: string) => /[.,!?:;…]$|\.\.\.$/.test(w);
const opensQuote = (w: string) => /^["“]/.test(w);

/** group display words into captions */
export const captions = (): Cap[] => {
  const caps: { words: string[]; start: number }[] = [];
  let cur: { words: string[]; start: number } | null = null;
  WORDS.forEach((w, i) => {
    const text = clean(w.w);
    if (!cur) cur = { words: [], start: w.f };
    cur.words.push(text);
    const bare = text.toLowerCase().replace(/[^a-z']/g, "");
    const next = WORDS[i + 1];
    const joinNext = JOIN.has(bare) && !ends(text) && cur.words.length < 3 && !!next && !opensQuote(next.w);
    if (!joinNext || cur.words.length >= 3) { caps.push(cur); cur = null; }
  });
  if (cur) caps.push(cur);
  // merge flashes (< MIN_HOLD f on screen) into the next caption, else into the previous one
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i + 1 < caps.length; i++) {
      const c = caps[i], n = caps[i + 1], p = caps[i - 1];
      if (n.start - c.start >= MIN_HOLD) continue;
      const last = c.words[c.words.length - 1];
      if (!ends(last) && c.words.length + n.words.length <= 3) {
        caps.splice(i, 2, { words: [...c.words, ...n.words], start: c.start }); changed = true; break;
      }
      if (p && !ends(p.words[p.words.length - 1]) && p.words.length + c.words.length <= 3) {
        caps.splice(i - 1, 2, { words: [...p.words, ...c.words], start: p.start }); changed = true; break;
      }
    }
  }
  return caps.map((c, i) => ({
    text: c.words.join(" "),
    f0: i === 0 ? FIRST_F : Math.max(FIRST_F, c.start - LEAD_F),
    f1: i + 1 < caps.length ? Math.max(FIRST_F, caps[i + 1].start - LEAD_F) : Math.min(TOTAL, Math.max(c.start + MIN_HOLD, LOOP_HIDE)),
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

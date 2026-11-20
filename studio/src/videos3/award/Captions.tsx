// House captions for a v3 film (study/CHANNEL_STYLE_BIBLE.md section 7 + the antitheft / clown engine, simplified): Montserrat
// 900, 76 px, white, 5 px black stroke, soft drop shadow, centred x 540, CSS top 1311 (cap top ~1323, baseline ~1376 at
// 1080 x 1920), inside the caption band y 1280-1440. 1-3 words per caption: short function words join the NEXT word
// (never into a PUNCH word), never across a real pause; up 2 f before the word, held through short gaps, hidden in
// pauses >= 8 f; nothing on frame 0 or in the last TAIL frames (the loop picture stays clean). Reads words.ts only.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { WORDS } from "./words";
import { TOTAL } from "./shots";

const JOIN = new Set(["a", "an", "the", "of", "to", "in", "on", "at", "and", "so", "is", "it", "you", "her", "his", "with", "by", "but", "if", "your", "my"]);
/** words the picture lands on: each comes up alone (edit per film; the bible's boards / punch words) */
export const PUNCH = new Set<string>([]);
const LEAD = 2, HIDE_GAP = 8, HOLD = 1, TAIL = 6, MAX_CHARS = 14;
const bare = (w: string) => w.replace(/["“”]/g, "").toLowerCase().replace(/[^a-z0-9'%]/g, "");
type Cap = { text: string; f0: number; f1: number };
export const CAPS: Cap[] = (() => {
  const out: Cap[] = [];
  let cur: { words: string[]; start: number; last: number } | null = null;
  WORDS.forEach((w, i) => {
    const text = w.w.replace(/["“”]/g, ""), next = WORDS[i + 1];
    if (!cur) cur = { words: [], start: w.f, last: i };
    cur.words.push(text); cur.last = i;
    const gap = next ? next.f - w.fe : 99;
    const joinNext = next && JOIN.has(bare(text)) && !PUNCH.has(bare(next.w)) && gap < 4 && cur.words.length < 3 &&
      (cur.words.join(" ") + " " + next.w).length <= MAX_CHARS && !/[.,!?:;]$/.test(text);
    if (!joinNext) { out.push({ text: cur.words.join(" "), f0: Math.max(1, cur.start - LEAD), f1: w.fe }); cur = null; }
  });
  for (let k = 0; k < out.length; k++) {
    const nx = out[k + 1];
    out[k].f1 = nx ? (nx.f0 - out[k].f1 >= HIDE_GAP ? out[k].f1 + HOLD : nx.f0) : Math.min(out[k].f1 + HOLD, TOTAL - TAIL);
  }
  return out;
})();

export const Captions: React.FC<{ frame: number }> = ({ frame }) => {
  const [handle] = useState(() => delayRender("v3 caption font"));
  useEffect(() => {
    const f = new FontFace("MontserratV3", `url(${staticFile("fonts/Montserrat.ttf")})`, { weight: "100 900" });
    f.load().then((ff) => { (document.fonts as unknown as { add: (x: FontFace) => void }).add(ff); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [handle]);
  const c = CAPS.find((x) => frame >= x.f0 && frame < x.f1);
  if (!c || frame === 0 || frame >= TOTAL - TAIL) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 1311, left: 0, width: 1080, textAlign: "center", fontFamily: "MontserratV3", fontWeight: 900,
        fontSize: 76, lineHeight: 1, color: "#FFFFFF", WebkitTextStroke: "10px #000", paintOrder: "stroke fill",
        textShadow: "2px 4px 3px rgba(0,0,0,0.85)" }}>{c.text}</div>
    </AbsoluteFill>
  );
};

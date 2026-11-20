// CAPTIONS of 'pointing', script v3 (DIRECTOR). The house look (study/CHANNEL_STYLE_BIBLE.md section 7: Montserrat 900,
// 76 px, white, 5 px black stroke, soft drop shadow, centred, CSS top 1311, inside the caption band y 1280-1440 at
// 1080 x 1920) with the SCRIPT's own chunks (SCRIPT_v3.md 2.2 + 5.5), not an automatic split:
//   - 1-3 words per chunk; the narrator in sentence case, every character line in CAPS, the last line small and
//     lower-case ("bag... gone."), the phone's replay in CAPS at 80 % with a phone pictogram;
//   - digits on screen ("1,000", "6", "1"); the first sentence shows as "His bag" / "on that train." ("is" is heard);
//   - a call-out builds with the gesture: the NAME, the held beat, then the STATUS word joins it;
//   - one pictogram besides: a small music note pulsing in the top corner while the departure melody plays.
// A chunk comes up 2 f before its first word, holds through short gaps and goes in pauses >= 8 f. The first chunk is
// on screen from FRAME 0 (the script: frame 0's only text is the caption); the last one stays to the last frame, so
// the loop runs "bag... gone." straight into "His bag".
// Times: timeline.ts (the real voice when words.ts has it, the plan before).
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { EV, FPS, LINES, TOKS, TOTAL, type CapStyle } from "./timeline";

const LEAD = 2, HIDE_GAP = 8, HOLD = 2, MAX_W = 960, SIZE = 76;
const SCALE: Record<CapStyle, number> = { n: 1, c: 1, phone: 0.8, small: 0.72 };
export type Cap = { text: string; parts: { text: string; f: number }[]; f0: number; f1: number; style: CapStyle; line: string };
export const CAPS: Cap[] = (() => {
  const out: Cap[] = [];
  for (const L of LINES) {
    const ts = TOKS.filter((t) => t.line === L.id);
    let k = 0;
    for (const ch of L.caps) {
      const ws = ts.slice(k, k + ch.n); k += ch.n;
      if (!ws.length) continue;
      const f0 = Math.max(0, Math.round(ws[0].s * FPS) - LEAD), f1 = Math.round(ws[ws.length - 1].e * FPS);
      // a call-out builds word by word (its words = the chunk's words, one to one)
      const shown = ch.text.split(" ");
      const parts = ch.build && shown.length === ws.length ? shown.map((text, q) => ({ text, f: q === 0 ? f0 : Math.max(f0, Math.round(ws[q].s * FPS) - 1) })) : [{ text: ch.text, f: f0 }];
      out.push({ text: ch.text, parts, f0, f1, style: L.style, line: L.id });
    }
  }
  out.sort((a, b) => a.f0 - b.f0);
  for (let q = 0; q < out.length; q++) {
    const c = out[q], nx = out[q + 1];
    if (!nx) { c.f1 = TOTAL; break; }                       // the last line stays to the last frame
    if (nx.style === "phone" && nx.f0 < c.f1) nx.f0 = c.f1; // his phone answers AFTER the narrator's word is out
    c.f1 = nx.f0 - c.f1 >= HIDE_GAP ? c.f1 + HOLD : nx.f0;
  }
  return out;
})();
/** the departure melody's pulse (s): the music note beats on it. REQUEST to SOUND: publish the melody's note times;
 *  until then 12 pulses per 5.5 s phrase */
export const MELODY_PULSE_S = 5.5 / 12;

let _ctx: CanvasRenderingContext2D | null = null;
const widthOf = (text: string, px: number, ready: boolean) => {
  if (!ready || typeof document === "undefined") return 0;
  _ctx ??= document.createElement("canvas").getContext("2d");
  if (!_ctx) return 0;
  _ctx.font = `900 ${px}px MontserratV3`;
  return _ctx.measureText(text).width;
};
const STROKE = "#000", INK = "#FFFFFF";
const Phone: React.FC<{ h: number }> = ({ h }) => (
  <svg width={h * 0.62} height={h} viewBox="0 0 62 100" style={{ marginRight: h * 0.22, filter: "drop-shadow(2px 4px 3px rgba(0,0,0,0.85))", flex: "none" }}>
    <rect x="6" y="4" width="50" height="92" rx="11" fill={INK} stroke={STROKE} strokeWidth="8" />
    <rect x="16" y="17" width="30" height="56" rx="3" fill="#1f5fe0" />
    <circle cx="31" cy="84" r="4.5" fill={STROKE} />
  </svg>
);
const Note: React.FC<{ k: number }> = ({ k }) => (
  <svg width={92} height={92} viewBox="0 0 100 100" style={{ position: "absolute", top: 250, left: 64, transform: `scale(${1 + 0.16 * k}) rotate(${-6 + 4 * k}deg)`, transformOrigin: "50% 60%",
    filter: "drop-shadow(2px 5px 4px rgba(0,0,0,0.7))" }}>
    <g fill={INK} stroke={STROKE} strokeWidth="7" strokeLinejoin="round">
      <path d="M38 16 L84 6 L84 62 A15 12 0 1 1 72 51 L72 30 L50 35 L50 74 A15 12 0 1 1 38 63 Z" />
    </g>
  </svg>
);

export const Captions: React.FC<{ frame: number }> = ({ frame }) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("v3 caption font"));
  useEffect(() => {
    const f = new FontFace("MontserratV3", `url(${staticFile("fonts/Montserrat.ttf")})`, { weight: "100 900" });
    f.load().then((ff) => { (document.fonts as unknown as { add: (x: FontFace) => void }).add(ff); setReady(true); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [handle]);
  const c = CAPS.find((x) => frame >= x.f0 && frame < x.f1);
  const t = frame / FPS, noteOn = t >= EV.melody0 && t < EV.melody1;
  // the note beats: a quick swell on each pulse; it fades in over 4 f and out over 6 f
  const ph = ((t - EV.melody0) / MELODY_PULSE_S) % 1, beat = Math.exp(-ph * 5);
  const noteA = Math.min(1, (t - EV.melody0) * FPS / 4, (EV.melody1 - t) * FPS / 6);
  let cap: React.ReactNode = null;
  if (c) {
    let px = SIZE * SCALE[c.style];
    const extra = c.style === "phone" ? px * 0.84 : 0, w = widthOf(c.text, px, ready) + extra;
    if (w > MAX_W) px *= MAX_W / w;
    cap = (
      <div style={{ position: "absolute", top: 1311 + (SIZE - px) * 0.5, left: 0, width: 1080, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "MontserratV3",
        fontWeight: 900, fontSize: px, lineHeight: 1, color: INK, WebkitTextStroke: `${Math.max(6, px * 0.132).toFixed(1)}px ${STROKE}`, paintOrder: "stroke fill", whiteSpace: "pre",
        textShadow: "2px 4px 3px rgba(0,0,0,0.85)" }}>
        {c.style === "phone" ? <Phone h={px * 1.0} /> : null}
        {c.parts.map((p, i) => <span key={i} style={{ opacity: frame >= p.f ? 1 : 0 }}>{(i ? " " : "") + p.text}</span>)}
      </div>
    );
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {noteOn ? <div style={{ opacity: Math.max(0, noteA) }}><Note k={beat} /></div> : null}
      {cap}
    </AbsoluteFill>
  );
};

// v4 CAPTIONS (DIRECTOR): the house look, unchanged (Montserrat 900, 76 px, white, black stroke, soft shadow, one centred
// line, its middle at y 1349 of 1920: the band y 1280-1440; owners keep the action out of y 1260-1440, see the top of
// SHOT_REQUESTS_v3.md). Chunks = script.ts (1-3 words per chunk, CAPS for the shouts). A chunk comes up 2 f before its
// first word, holds through short gaps and goes in pauses >= 8 f; the last one stays to the last frame (the loop).
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { FPS, LINES, TOKS, TOTAL, type CapStyle } from "./timeline";

const LEAD = 2, HIDE_GAP = 8, HOLD = 2, MAX_W = 960, SIZE = 76;
const SCALE: Record<CapStyle, number> = { n: 1, c: 1, small: 0.72 };
export type Cap = { text: string; f0: number; f1: number; style: CapStyle; line: string };
export const CAPS: Cap[] = (() => {
  const out: Cap[] = [];
  for (const L of LINES) {
    const ts = TOKS.filter((t) => t.line === L.id); let k = 0;
    for (const ch of L.caps) {
      const ws = ts.slice(k, k + ch.n); k += ch.n; if (!ws.length) continue;
      out.push({ text: ch.text, f0: Math.max(0, Math.round(ws[0].s * FPS) - LEAD), f1: Math.round(ws[ws.length - 1].e * FPS), style: L.style, line: L.id });
    }
  }
  out.sort((a, b) => a.f0 - b.f0);
  for (let q = 0; q < out.length; q++) {
    const c = out[q], nx = out[q + 1];
    if (!nx) { c.f1 = TOTAL; break; }
    c.f1 = nx.f0 - c.f1 >= HIDE_GAP ? c.f1 + HOLD : nx.f0;
  }
  return out;
})();

let _ctx: CanvasRenderingContext2D | null = null;
const widthOf = (text: string, px: number, ready: boolean) => {
  if (!ready || typeof document === "undefined") return 0;
  _ctx ??= document.createElement("canvas").getContext("2d");
  if (!_ctx) return 0;
  _ctx.font = `900 ${px}px MontserratV4`;
  return _ctx.measureText(text).width;
};
export const Captions: React.FC<{ frame: number }> = ({ frame }) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("v4 caption font"));
  useEffect(() => {
    const f = new FontFace("MontserratV4", `url(${staticFile("fonts/Montserrat.ttf")})`, { weight: "100 900" });
    f.load().then((ff) => { (document.fonts as unknown as { add: (x: FontFace) => void }).add(ff); setReady(true); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [handle]);
  const c = CAPS.find((x) => frame >= x.f0 && frame < x.f1);
  if (!c) return null;
  let px = SIZE * SCALE[c.style];
  const w = widthOf(c.text, px, ready);
  if (w > MAX_W) px *= MAX_W / w;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 1311 + (SIZE - px) * 0.5, left: 0, width: 1080, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "MontserratV4",
        fontWeight: 900, fontSize: px, lineHeight: 1, color: "#FFFFFF", WebkitTextStroke: `${Math.max(6, px * 0.132).toFixed(1)}px #000`, paintOrder: "stroke fill", whiteSpace: "pre",
        textShadow: "2px 4px 3px rgba(0,0,0,0.85)" }}>{c.text}</div>
    </AbsoluteFill>
  );
};

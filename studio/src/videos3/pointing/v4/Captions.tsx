// v4 CAPTIONS (DIRECTOR): the house look (Montserrat 900, 76 px, white, black stroke, soft shadow, one centred line, its
// middle at captions_plan CAP_Y = 68 % since audit r1; the GO! pulses and the big X are drawn here too; owners keep the action out of y 1260-1440, see the top of
// SHOT_REQUESTS_v3.md). WHICH chunk shows WHEN = captions_plan.ts (chunks never straddle a cut; probe:
// briefs/v3/pointing/director/probe_captions_v4.mjs). This file only draws it.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { type CapStyle } from "./timeline";
import { capAt, capPos, goAt, X_POS, X_W, xScaleAt } from "./captions_plan";

const MAX_W = 960, SIZE = 76;
const SCALE: Record<CapStyle, number> = { n: 1, c: 1, small: 0.72 };
export { CAPS, GO_PULSES, type Cap } from "./captions_plan";
// the GO pulses (captions_plan.ts GO_PULSES): the same word, size and snap on all seven Go beats, in the house band
const GO_SIZE = 130, GO_SNAP = 3, GO_FROM = 1.15;   // 130 px: fits under the signal head (lead 01:25)   // 150 px x 1.15 stays inside the band

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
  // THE X (captions_plan.ts X_*): a drawn graphic, 45 % of the width, saturated red, thick white + black outline, overshoot pop
  const xs = xScaleAt(frame);
  const xEl = xs > 0 ? (() => {
    const W = X_W * 1080, cx = X_POS[0] * 1080, cy = X_POS[1] * 1920, bar = W * 0.2;
    const arm = (rot: number) => (<div style={{ position: "absolute", left: -W * 0.06, top: W / 2 - bar / 2, width: W * 1.12, height: bar, borderRadius: bar * 0.18,
      background: "#E3120B", border: `${(bar * 0.16).toFixed(1)}px solid #FFFFFF`, boxShadow: "0 0 0 7px #000, 6px 10px 6px rgba(0,0,0,0.6)", transform: `rotate(${rot}deg)` }} />);
    return (<div style={{ position: "absolute", left: cx - W / 2, top: cy - W / 2, width: W, height: W, transform: `scale(${xs.toFixed(3)})`, transformOrigin: "50% 50%" }}>{arm(45)}{arm(-45)}</div>);
  })() : null;
  const g = goAt(frame);
  if (g) {
    const u = Math.min(1, (frame - g.f0) / GO_SNAP), sc = (GO_FROM + (1 - GO_FROM) * (1 - (1 - u) * (1 - u))) * g.scale;   // 3-f snap down to its size
    const size = GO_SIZE * g.scale, halfW = widthOf("GO!", size, ready) / 2 || size * 1.2;
    const cx = Math.max(40 + halfW, Math.min(1040 - halfW, g.pos[0] * 1080));   // the word stays 40 px inside the frame
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {xEl}
        <div style={{ position: "absolute", top: g.pos[1] * 1920 - GO_SIZE * 0.5, left: cx - 300, width: 600, height: GO_SIZE, display: "flex", justifyContent: "center", alignItems: "center",
          fontFamily: "MontserratV4", fontWeight: 900, fontSize: GO_SIZE, lineHeight: 1, color: "#FFFFFF", WebkitTextStroke: `${(GO_SIZE * 0.12).toFixed(1)}px #000`,
          paintOrder: "stroke fill", whiteSpace: "pre", textShadow: "3px 6px 4px rgba(0,0,0,0.85)", transform: `scale(${sc.toFixed(4)})`, transformOrigin: "50% 50%" }}>GO!</div>
      </AbsoluteFill>
    );
  }
  const c = capAt(frame);
  if (!c) return xEl ? <AbsoluteFill style={{ pointerEvents: "none" }}>{xEl}</AbsoluteFill> : null;
  let px = SIZE * SCALE[c.style];
  const w = widthOf(c.text, px, ready);
  if (w > MAX_W) px *= MAX_W / w;
  // the place: the film's one band, or the shot's CAP_POS (the text stays 40 px inside the frame)
  const P = capPos(frame), wPx = Math.min(w, MAX_W), room = Math.max(0, 540 - 40 - wPx / 2);
  const dx = Math.max(-room, Math.min(room, (P.x - 0.5) * 1080)), top = P.y * 1920 - px * 0.5;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {xEl}
      <div style={{ position: "absolute", top, left: dx, width: 1080, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "MontserratV4",
        fontWeight: 900, fontSize: px, lineHeight: 1, color: "#FFFFFF", WebkitTextStroke: `${Math.max(6, px * 0.132).toFixed(1)}px #000`, paintOrder: "stroke fill", whiteSpace: "pre",
        textShadow: "2px 4px 3px rgba(0,0,0,0.85)" }}>{c.text}</div>
    </AbsoluteFill>
  );
};

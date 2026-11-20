// REAL-WORLD KIT phone record UI (K-K1): the SAME look in two places, so a full-frame phone POV (the film's frame 0 /
// last shot) and a phone screen inside the scene (a replay) match exactly:
//  - <RecordUI /> : React DOM / SVG overlay above the canvas (KitFilm `overlay`), for shots seen THROUGH the phone;
//  - drawRecordUI(): the same drawing on a 2D canvas (core/screen.ts composites it into a phone screen texture).
// The look: a red record dot + a white timer "00:12" top-left (tabular digits, soft shadow), thin white corner brackets,
// nothing else (no brand, no text other than the digits). Sizes are fractions of the frame HEIGHT.
import React from "react";

export type RecordUIOpts = {
  /** the timer text ("00:12"), or a function of film time t */
  timer?: string | ((t: number) => string);
  /** the red dot (default true); `blink` pulses it at 1 Hz (pure in t) */
  dot?: boolean;
  blink?: boolean;
  /** thin corner brackets (default true) */
  brackets?: boolean;
  /** overall size multiplier (default 1) */
  scale?: number;
  /** overall opacity 0..1 (slide the UI away with it) */
  opacity?: number;
};
/** timer text for a recording that started at film time t0 with `offsetS` seconds already on the clock */
export const recTimer = (t0: number, offsetS = 0) => (t: number) => {
  const s = Math.max(0, Math.floor(t - t0 + offsetS));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const K = { margin: 0.045, dotR: 0.0105, font: 0.034, gap: 0.016, bracket: 0.06, bracketW: 0.0032, inset: 0.03 };
const RED = "#ff3b30";
const dotAlpha = (o: RecordUIOpts, t: number) => (o.blink ? 0.55 + 0.45 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2)) : 1);
const timerText = (o: RecordUIOpts, t: number) => (typeof o.timer === "function" ? o.timer(t) : o.timer ?? "00:00");

/** draw the record UI on a 2D canvas context of size w x h (transparent background) */
export const drawRecordUI = (g: CanvasRenderingContext2D, w: number, h: number, t: number, o: RecordUIOpts = {}) => {
  const s = (o.scale ?? 1) * h, a = o.opacity ?? 1;
  g.save();
  g.globalAlpha = a;
  const m = K.margin * s, cy = m + K.font * s * 0.5;
  if (o.dot !== false) {
    g.globalAlpha = a * dotAlpha(o, t);
    g.shadowColor = "rgba(0,0,0,0.45)"; g.shadowBlur = 0.006 * s;
    g.fillStyle = RED; g.beginPath(); g.arc(m + K.dotR * s, cy, K.dotR * s, 0, Math.PI * 2); g.fill();
    g.globalAlpha = a;
  }
  g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = 0.008 * s; g.shadowOffsetY = 0.002 * s;
  g.fillStyle = "#ffffff"; g.textBaseline = "middle";
  g.font = `600 ${(K.font * s).toFixed(1)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  (g as CanvasRenderingContext2D & { fontVariantNumeric?: string }).fontVariantNumeric = "tabular-nums";
  g.fillText(timerText(o, t), m + (o.dot !== false ? 2 * K.dotR * s + K.gap * s : 0), cy);
  if (o.brackets !== false) {
    g.shadowBlur = 0.004 * s; g.shadowOffsetY = 0;
    g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = K.bracketW * s; g.lineCap = "round";
    const i = K.inset * s + K.font * s * 1.6, L = K.bracket * s, j = K.inset * s;
    const corner = (x: number, y: number, dx: number, dy: number) => { g.beginPath(); g.moveTo(x, y + dy * L); g.lineTo(x, y); g.lineTo(x + dx * L, y); g.stroke(); };
    corner(j, i, 1, 1); corner(w - j, i, -1, 1); corner(j, h - j, 1, -1); corner(w - j, h - j, -1, -1);
  }
  g.restore();
};

/** the record UI as a DOM overlay (KitFilm `overlay`), matching drawRecordUI. `t` = film time (seconds). */
export const RecordUI: React.FC<RecordUIOpts & { t: number; width?: number; height?: number }> = ({ t, width = 1080, height = 1920, ...o }) => {
  const s = (o.scale ?? 1) * height, m = K.margin * s, cy = m + K.font * s * 0.5;
  const dot = o.dot !== false;
  const i = K.inset * s + K.font * s * 1.6, L = K.bracket * s, j = K.inset * s, bw = K.bracketW * s;
  const corner = (x: number, y: number, dx: number, dy: number) => `M ${x} ${y + dy * L} L ${x} ${y} L ${x + dx * L} ${y}`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o.opacity ?? 1, pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <filter id="kitRecShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy={0.002 * s} stdDeviation={0.004 * s} floodColor="#000" floodOpacity="0.5" /></filter>
        </defs>
        {dot ? <circle cx={m + K.dotR * s} cy={cy} r={K.dotR * s} fill={RED} opacity={dotAlpha(o, t)} filter="url(#kitRecShadow)" /> : null}
        <text x={m + (dot ? 2 * K.dotR * s + K.gap * s : 0)} y={cy} dominantBaseline="central" fill="#fff" filter="url(#kitRecShadow)"
          style={{ font: `600 ${(K.font * s).toFixed(1)}px "Helvetica Neue", Helvetica, Arial, sans-serif`, fontVariantNumeric: "tabular-nums" }}>{timerText(o, t)}</text>
        {o.brackets !== false ? (
          <g stroke="rgba(255,255,255,0.85)" strokeWidth={bw} fill="none" strokeLinecap="round" filter="url(#kitRecShadow)">
            <path d={corner(j, i, 1, 1)} /><path d={corner(width - j, i, -1, 1)} /><path d={corner(j, height - j, 1, -1)} /><path d={corner(width - j, height - j, -1, -1)} />
          </g>
        ) : null}
      </svg>
    </div>
  );
};

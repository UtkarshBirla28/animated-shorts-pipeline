// HOOK TITLE (2026-11-15, the user's "first 3-5 s must be addictive" pass): a bold question in the top band over the
// opening pull-out. It pops in line by line from frame 2 (frame 0 and the last frame stay identical: the LOOP SEAM RULE),
// "$150 MILLION" punches again on the spoken number, and the block slides away just before "water" so the answer lands
// on a clean picture. Same font as the captions (CapMontserrat 900, loaded by Captions.tsx).
import React from "react";
import { AbsoluteFill } from "remotion";
import { BEAT } from "./story";

const c01 = (x: number) => Math.max(0, Math.min(1, x));
const backOut = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const bell = (u: number) => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2);

const IN = 2, OUT = () => BEAT.water1 - 10, OUT_LEN = 8;

const line = (f: number, at: number, dur = 6) => {
  const t = f - at, k = c01(t / dur);
  return { opacity: c01(t / 2), scale: t < 0 ? 0.6 : k < 1 ? 0.6 + 0.4 * backOut(k) : 1 };
};

const TXT: React.CSSProperties = {
  fontFamily: "CapMontserrat, Montserrat, sans-serif", fontWeight: 900, lineHeight: 1, textAlign: "center",
  WebkitTextStroke: "14px #000", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(0,0,0,0.85)", whiteSpace: "nowrap",
};

export const HookTitle: React.FC<{ frame: number }> = ({ frame: f }) => {
  if (f < IN || f > OUT() + OUT_LEN) return null;
  const e = c01((f - OUT()) / OUT_LEN), ex = e * e;
  const k0 = line(f, IN), k1 = line(f, IN + 3), k2 = line(f, IN + 7, 7), k3 = line(f, IN + 12);
  const punch = 1 + 0.09 * bell((f - (BEAT.million - 2)) / 12);
  const st = (k: { opacity: number; scale: number }, extra = 1): React.CSSProperties => ({
    opacity: k.opacity, transform: `scale(${(k.scale * extra).toFixed(4)})`, display: "inline-block" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center", justifyContent: "flex-start", paddingTop: 112,
      opacity: 1 - ex, transform: `translateY(${(-70 * ex).toFixed(2)}px)` }}>
      <div style={{ ...st(k0), fontFamily: TXT.fontFamily, fontWeight: 900, fontSize: 44, color: "#fff", background: "#E0242B",
        border: "6px solid #000", borderRadius: 18, padding: "10px 26px 12px", letterSpacing: 2, marginBottom: 22 }}>1963 · NEW JERSEY</div>
      <div style={{ ...TXT, ...st(k1), fontSize: 80, color: "#FFFFFF" }}>HOW DO YOU FAKE</div>
      <div style={{ ...TXT, ...st(k2, punch), fontSize: 112, color: "#FFD60A", marginTop: 8, WebkitTextStroke: "15px #000", letterSpacing: -1 }}>$150 MILLION</div>
      <div style={{ ...TXT, ...st(k3), fontSize: 96, color: "#FFFFFF", marginTop: 6 }}>OF OIL?</div>
    </AbsoluteFill>
  );
};

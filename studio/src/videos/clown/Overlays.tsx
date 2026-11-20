// OVERLAYS + TAPE LOOK (owner LOOK, v2). Post-layer graphics over the 3D picture and under the captions. BUILD_PLAN_v2
// law 9: on-screen graphics ONLY for the quiz chip, the 1-5 count pops and the ring; every board with words is in the
// world (sets_square.ts: the S12 clipboard page, the S19 A-frame; office.ts: the whiteboard).
//  - THE CHIP "PHONES: ?" (top-right, inside x <= 888, y >= 288; caps >= 40 px) from the end of "Count the people on a
//    phone.", the "?" pulses on "How many?", then FLIPS to a big "5" (digit ~120 px tall) with a pop on "Five." and holds
//    to "You saw him"; in E1 it comes back and counts 1..5 with the pops.
//  - E1 COUNT POPS: a big gold "1".."5" pops over each phone person's head while E1's replay holds them (positions from
//    story.ts e1Pop = EDIT's hook; an animator may override with setCountPopHook).
//  - E3 TAPE REWIND (remap.ts tapeAt): scan lines, a rolling tracking band, a "rewind" glyph (two left triangles; two bars
//    while frozen) top-left, and, for the WORLD group (Clown.tsx applies rewindWorldStyle(f)), lowered saturation, a slight
//    chroma split (an SVG filter rendered here) and a brief tracking wobble where the tape starts, freezes, restarts and
//    lands. Zero outside E3 and at the loop seam.
//  - THE GOLD RING round the three bills during E3's freeze: saturated gold over a dark keyline (9 px over 17 px at 1080),
//    a hand-drawn marker ellipse that draws on over 10 f, a soft iris dims the rest by ~14 %, fades to zero before TOTAL - 4.
//    Projected every frame through the camera of the frame on screen (remapAt -> camAt), so it follows the rewind.
// Same font as the captions (CapMontserrat 900, loaded by Captions.tsx). Nothing in the caption band (y 1280-1440).
import React from "react";
import { AbsoluteFill } from "remotion";
import { BEAT, SID, TOTAL, SHOTS } from "./beats";
import { camAt, project, e1Pop, zoomAt } from "./story";
import { remapAt, tapeAt, REW } from "./remap";
import { SQ, type V3 } from "./plan";

const c01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = c01(x); return u * u * (3 - 2 * u); };
const backOut = (x: number, s = 1.70158) => { const u = c01(x); return 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2; };
const INK = "#2a1c34", FONT = "CapMontserrat, Montserrat, sans-serif", GOLD = "#FFC83D";
const TXT: React.CSSProperties = { fontFamily: FONT, fontWeight: 900, lineHeight: 1, whiteSpace: "nowrap", letterSpacing: 0 };
/** frames of a BEAT name if the beat table has it (the table is EDIT's; a missing name returns NaN and that cue is off) */
const B = (name: string): number => { const v = (BEAT as Record<string, number>)[name]; return typeof v === "number" ? v : NaN; };
const shotA = (id: number | undefined) => (id ? SHOTS[id - 1].a : NaN), shotB = (id: number | undefined) => (id ? SHOTS[id - 1].b : NaN);

// ======================================================================================================== THE CHIP
const CHIP_IN = B("count"), Q_PULSE = B("howMany"), FLIP = B("five") - 2, CHIP_OUT = Math.max(B("five") + 24, Math.min(B("youSaw") - 2, B("andTheClown") + 2)); // lead: leaves as Q3 starts (it covered the clown's face on his brake)
const ChipBox: React.FC<{ label: string; val: string; big: boolean; scale: [number, number]; y: number; opacity: number; pulse?: number }> = ({ label, val, big, scale, y, opacity, pulse = 1 }) => (
  <div style={{ position: "absolute", right: 1080 - 888, top: 300 + y, transform: `scale(${scale[0].toFixed(3)}, ${scale[1].toFixed(3)})`, transformOrigin: "100% 50%", opacity,
    display: "flex", alignItems: "center", gap: 18, background: "#1c2244", border: `6px solid ${INK}`, borderRadius: 26, padding: big ? "12px 30px 10px 30px" : "18px 28px 16px",
    boxShadow: "5px 8px 0 rgba(10,6,24,.45)" }}>
    <span style={{ ...TXT, fontSize: 60, color: "#ffffff" }}>{label}</span>
    <span style={{ ...TXT, fontSize: big ? 168 : 84, color: "#FFD84A", WebkitTextStroke: big ? "6px #1a1030" : "0", paintOrder: "stroke fill",
      transform: `scale(${pulse.toFixed(3)})`, display: "inline-block" }}>{val}</span>
  </div>);
const Chip: React.FC<{ f: number }> = ({ f }) => {
  if (!(f >= CHIP_IN) || f > CHIP_OUT + 10) return null;
  const inn = backOut((f - CHIP_IN) / 8), out = sm((f - CHIP_OUT) / 9);
  const flip = c01((f - FLIP) / 8), done = flip >= 0.5, sy = Math.max(0.06, Math.abs(Math.cos(Math.PI * flip)));
  const pop = done ? 1 + 0.22 * Math.sin(Math.PI * c01((f - FLIP - 4) / 9)) * Math.exp(-c01((f - FLIP - 4) / 9)) : 1;
  /* the "?" pulses twice while "How many?" is asked */
  const q = !done && f >= Q_PULSE && f < FLIP ? 1 + 0.18 * Math.max(0, Math.sin((Math.PI * 2 * (f - Q_PULSE)) / 14)) : 1;
  const k = Math.max(0, inn) * pop * (1 - 0.4 * out);
  return <ChipBox label="PHONES:" val={done ? "5" : "?"} big={done} scale={[k, k * sy]} y={-60 * out} opacity={1 - out} pulse={q} />;
};

// ================================================================================================== E1 COUNT POPS
export type CountPop = { n: number; k: number; x: number; y: number;
  /** QUIZ p4 (AUDIT_edit R6): optional screen point (px) of the person's head: a short POINTER NOTCH on the disc's rim aims at it */
  tx?: number; ty?: number };
let popHook: ((f: number) => CountPop | null) | null = null;
/** ANIMATORS (optional): replace EDIT's e1Pop (story.ts) as the source of the pops: fn(film frame) -> { n 1..5, k 0..1 (the
 *  pop's grow), x, y (screen px at 1080 x 1920 of the spot above the head) } or null between people */
export const setCountPopHook = (fn: (f: number) => CountPop | null) => { popHook = fn; };
const popAt = (f: number): CountPop | null => (popHook ? popHook(f) : e1Pop(f));
const CountPops: React.FC<{ f: number }> = ({ f }) => {
  /* the live pop, or the last one fading out over 6 f after its hold */
  let p = popAt(f), fade = 1;
  if (!p) for (let d = 1; d <= 6; d++) { const q = popAt(f - d); if (q) { p = q; fade = 1 - sm(d / 6); break; } }
  if (!p || fade <= 0.01) return null;
  const P = p, g = backOut(P.k * 1.3, 2.4), x = Math.max(110, Math.min(970, P.x)), y = Math.max(300, Math.min(1180, P.y - 40));
  return (
    <div style={{ position: "absolute", left: x - 85, top: y - 170, width: 170, height: 170, transform: `scale(${(Math.max(0, g) * (0.85 + 0.15 * fade)).toFixed(3)})`, transformOrigin: "50% 100%", opacity: fade }}>
      <svg width={170} height={170} viewBox="0 0 170 170" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {/* a burst of 8 short rays as it lands */}
        {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2, r0 = 84 + 30 * c01(P.k * 2), r1 = r0 + 22 * (1 - c01(P.k * 1.5));
          return <line key={i} x1={85 + Math.cos(a) * r0} y1={85 + Math.sin(a) * r0} x2={85 + Math.cos(a) * r1} y2={85 + Math.sin(a) * r1} stroke={GOLD} strokeWidth={9} strokeLinecap="round" opacity={1 - c01(P.k * 1.4)} />; })}
        {/* QUIZ p4: the pointer notch toward its own person's head (drawn under the disc, so the disc's keyline caps its base) */}
        {P.tx !== undefined && P.ty !== undefined ? (() => { const a = Math.atan2(P.ty - (y - 85), P.tx - x), d = Math.min(34, Math.max(14, Math.hypot(P.tx - x, P.ty - (y - 85)) - 70)), w = 0.36;
          const pt = (r: number, b: number) => `${(85 + Math.cos(a + b) * r).toFixed(1)},${(85 + Math.sin(a + b) * r).toFixed(1)}`;
          return <polygon points={`${pt(66, -w)} ${pt(74 + d, 0)} ${pt(66, w)}`} fill={GOLD} stroke={INK} strokeWidth={9} strokeLinejoin="round" />; })() : null}
        <circle cx={85} cy={85} r={74} fill={GOLD} stroke={INK} strokeWidth={9} />
      </svg>
      <div style={{ position: "absolute", left: 0, top: 14, width: 170, textAlign: "center", ...TXT, fontSize: 136, color: "#ffffff", WebkitTextStroke: `10px ${INK}`, paintOrder: "stroke fill" }}>{P.n}</div>
    </div>);
};
/** E1: the chip comes back and counts with the pops */
const E1Chip: React.FC<{ f: number }> = ({ f }) => {
  let n = 0;
  for (let d = 0; d <= 60 && !n; d += 1) { const q = popAt(f - d); if (q && (d > 0 || q.k > 0.2)) n = q.n; }
  if (!n) return null;
  return <ChipBox label="PHONES:" val={String(n)} big={false} scale={[1, 1]} y={0} opacity={1} />;
};

// ================================================================================================== E3 TAPE LOOK
const H0 = REW.a + REW.r1, H1 = H0 + REW.hold;
/** the tracking wobble (0..1): a short jolt where the tape starts, freezes, restarts and lands */
const wobbleAt = (f: number) => {
  const bump = (c: number, w: number) => Math.exp(-(((f - c) / w) ** 2));
  return Math.min(1, bump(REW.a + 2, 3) + bump(H0 - 1, 2.5) + bump(H1 + 1, 2.5) + 0.7 * bump(TOTAL - 9, 2.5)) * (f >= TOTAL - 3 || f < REW.a - 1 ? 0 : 1);
};
/** for Clown.tsx: the WORLD group's extra filter + transform during E3 (desaturation, the chroma split, the wobble);
 *  { filter: "none", transform: "none" } elsewhere. Compose: filter = [own filter, this filter].join(" ") */
export const rewindWorldStyle = (f: number): { filter: string; transform: string } => {
  const t = tapeAt(f);
  /* EDIT p3: the hold is a 40 f SLOW PASS in clean, full colour with NO tape artefact at all; the tape look (and the
   * rewind glyph) only on the fast rewinds before and after it (tapeAt.rewind is non-zero only there) */
  if (t.rewind <= 0.01) return { filter: "none", transform: "none" };
  /* p3 (audit p2 B1): the HOLD is clean, full colour (no chroma split, saturation 0.9); the tape grade only on the fast parts */
  const k = t.rewind, w = wobbleAt(f) * c01(k * 4), j = Math.sin(f * 2.7) * 0.5 + Math.sin(f * 5.3) * 0.5;
  return { filter: `url(#clownTape) saturate(${(1 - 0.42 * k).toFixed(3)}) contrast(${(1 + 0.08 * k).toFixed(3)}) brightness(${(1 - 0.03 * k).toFixed(3)})`,
    transform: w > 0.01 ? `translateX(${(9 * w * j).toFixed(2)}px) skewX(${(0.6 * w * j).toFixed(3)}deg)` : "none" };
};
/** the SVG filter the world group references: R shifted right, B shifted left (dx px at 1080), G in place */
const TapeDefs: React.FC<{ f: number }> = ({ f }) => {
  const t = tapeAt(f), dx = 4.5 * t.rewind + 3 * wobbleAt(f) * c01(t.rewind * 4);
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <filter id="clownTape" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx={dx.toFixed(2)} dy="0" result="r2" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx={(-dx).toFixed(2)} dy="0" result="b2" />
        <feComposite in="r2" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
        <feComposite in="rg" in2="b2" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
      </filter>
    </svg>);
};
const Tape: React.FC<{ f: number }> = ({ f }) => {
  const t = tapeAt(f);
  if (t.rewind <= 0.01) return null;   /* nothing during the hold: no scan lines, no band, no glyph */
  const k = t.rewind, w = wobbleAt(f) * c01(k * 4);   /* p3: the hold keeps faint scan lines + the pause glyph only */
  /* the rolling tracking band: fast while rewinding (it runs UP the frame), parked low while frozen */
  const by = t.freeze ? 1500 + 8 * Math.sin(f * 1.3) : (((1920 * 4 - (f - REW.a) * 140) % 1920) + 1920) % 1920;
  const blink = t.freeze ? (Math.floor((f - H0) / 8) % 2 === 0 ? 1 : 0.35) : 1;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* scan lines */}
      <AbsoluteFill style={{ opacity: 0.2 * k + 0.1 * w, backgroundImage: "repeating-linear-gradient(to bottom, rgba(10,8,20,0.55) 0px, rgba(10,8,20,0.55) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)" }} />
      {/* the tracking band: a smear of static with a bright line */}
      <div style={{ position: "absolute", left: 0, top: by - 26, width: 1080, height: 52, opacity: t.freeze ? 0 : 0.55 * k + 0.4 * w,
        backgroundImage: "repeating-linear-gradient(to right, rgba(255,255,255,0.32) 0px, rgba(255,255,255,0.05) 7px, rgba(200,210,255,0.28) 13px, rgba(255,255,255,0.02) 21px)", filter: "blur(1px)" }} />
      <div style={{ position: "absolute", left: 0, top: by + 18, width: 1080, height: 4, background: "rgba(255,255,255,0.55)", opacity: t.freeze ? 0 : k }} />
      {/* the rewind / pause glyph, top-left inside the safe zone */}
      <svg width={150} height={90} viewBox="0 0 150 90" style={{ position: "absolute", left: 80, top: 300, opacity: blink * c01((t.freeze ? 1 : k) * 3), overflow: "visible" }}>
        {t.freeze
          ? <g stroke={INK} strokeWidth={7} fill="#ffffff" strokeLinejoin="round"><rect x={34} y={8} width={26} height={74} rx={4} /><rect x={82} y={8} width={26} height={74} rx={4} /></g>
          : <g stroke={INK} strokeWidth={7} fill="#ffffff" strokeLinejoin="round"><path d="M70 6 L70 84 L8 45 Z" /><path d="M136 6 L136 84 L74 45 Z" /></g>}
      </svg>
    </AbsoluteFill>);
};

// ================================================================================================== THE GOLD RING
/** the bills' outline points (pegs, corners) in the world */
const BILL_PTS: V3[] = SQ.bills.flatMap((b) => { const w = SQ.bill.w / 2, h = SQ.bill.h, c = Math.cos(b.yaw), s = Math.sin(b.yaw), p = b.peg;
  return [[p[0] - w * c, p[1], p[2] + w * s], [p[0] + w * c, p[1], p[2] - w * s], [p[0] - w * c, p[1] - h, p[2] + w * s], [p[0] + w * c, p[1] - h, p[2] - w * s]] as V3[]; });
/** a hand-drawn marker ellipse round the projected bills at film frame f (E3): path d, its length, centre, radius */
export const ringPath = (f: number): { d: string; len: number; cx: number; cy: number; rx: number; ex: number; ey: number } | null => {
  const R = remapAt(SID.E3, f), cam = camAt(R.src, R.t), Z = zoomAt(SID.E3, f);
  /* through EDIT's 2D punch-in (story.ts zoomAt): the ring stays on the bills while the world scales about (Z.x, Z.y) */
  const zp = (q: [number, number] | null): [number, number] | null => (q ? [Z.x + (q[0] - Z.x) * Z.k, Z.y + (q[1] - Z.y) * Z.k] : null);
  const pts = BILL_PTS.map((p) => zp(project(cam, p))).filter((q): q is [number, number] => !!q);
  if (pts.length < 6) return null;
  /* the row's axis: bill 0 -> bill 2 on screen */
  const a0 = zp(project(cam, SQ.bills[0].peg)), a2 = zp(project(cam, SQ.bills[2].peg));
  const ang = a0 && a2 ? Math.atan2(a2[1] - a0[1], a2[0] - a0[0]) : 0, ca = Math.cos(ang), sa = Math.sin(ang);
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const [x, y] of pts) { const u = x * ca + y * sa, v = -x * sa + y * ca; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  /* p3: a ROUNDER ring (the short axis at least 44 % of the long one: at 540 wide the old one read as a thin ellipse) */
  const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2, A = ((u1 - u0) / 2) * 1.14 + 40, Bv = Math.max(((v1 - v0) / 2) * 1.3 + 40, A * 0.44);
  /* the whole ring inside x 64 .. 884 (audit p2 B1: its left end was cut by the frame edge): slide it in, never off the bills */
  const fit = Math.min(1, 394 / (Math.abs(A * ca) + Math.abs(Bv * sa))), A2 = Math.max((u1 - u0) / 2 + 18, A * fit), B2 = Math.max((v1 - v0) / 2 + 18, Bv * fit);   /* after the punch-in the ring is trimmed to the safe width, never tighter than the bills + 18 px */
  const hw = Math.abs(A2 * ca) + Math.abs(B2 * sa) + 16, cx0 = uc * ca - vc * sa, cx = hw * 2 > 820 ? 474 : Math.max(64 + hw, Math.min(884 - hw, cx0)), cy = uc * sa + vc * ca - 52;   /* p3: lifted 16 px: the lower lap clears the ducker’s eyes; p4 (QUIZ, audit R8): 52 px, so the lower lap clears his CAP once he is low (from "mo-" on) */
  /* p3: a DOUBLE ring: the marker goes round twice (~750 deg), the second lap a little wider and off-register, like a
   * hand circling something hard */
  const N = 170; let d = "", len = 0, px = 0, py = 0;
  for (let i = 0; i <= N; i++) { const q = i / N, th = -2.5 + q * (4 * Math.PI + 0.5), wob = 1 + 0.035 * Math.sin(3 * th + 0.7) + 0.02 * Math.sin(5 * th) + 0.075 * sm((q - 0.42) / 0.2) + 0.02 * Math.sin(2 * th + 1.3) * q;
    const eu = A2 * wob * Math.cos(th), ev = B2 * wob * Math.sin(th), x = cx + eu * ca - ev * sa, y = cy + eu * sa + ev * ca;
    d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1); if (i) len += Math.hypot(x - px, y - py); px = x; py = y; }
  return { d, len, cx, cy, rx: Math.max(A2, B2), ex: px, ey: py };
};
const Ring: React.FC<{ f: number }> = ({ f }) => {
  if (f < H0 - 0.5 || f >= TOTAL - 4) return null;
  const draw = sm((f - H0) / 8), alive = 1 - sm((f - H1) / Math.max(6, TOTAL - 4 - H1));
  if (draw <= 0.001 || alive <= 0.005) return null;
  const r = ringPath(f);
  if (!r) return null;
  const off = r.len * (1 - draw), dim = 0.3 * alive * draw;
  /* p3: a small sparkle where the marker lifts off (pops as the ring closes, twinkles while it holds) */
  const sp = sm((f - H0 - 8) / 5) * alive, tw = 1 + 0.18 * Math.sin((f - H0) * 0.9), star = (x: number, y: number, R0: number, k: number) => {
    const pts = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, rr = (i % 2 ? 0.3 : 1) * R0 * k; return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`; }).join(" ");
    return <polygon points={pts} fill="#FFF6C8" stroke="#2a1430" strokeWidth={5} strokeLinejoin="round" />; };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* the soft iris: everything but the ring's inside dims ~14 % */}
      <AbsoluteFill style={{ background: `radial-gradient(circle ${(r.rx * 1.25).toFixed(0)}px at ${r.cx.toFixed(0)}px ${r.cy.toFixed(0)}px, rgba(14,8,30,0) 78%, rgba(14,8,30,${dim.toFixed(3)}) 100%)` }} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0, opacity: alive }}>
        <path d={r.d} fill="none" stroke={GOLD} strokeOpacity={0.3} strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={r.len} strokeDashoffset={off} style={{ filter: "blur(5px)" }} />
        <path d={r.d} fill="none" stroke="#2a1430" strokeWidth={25} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={r.len} strokeDashoffset={off} />
        <path d={r.d} fill="none" stroke={GOLD} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={r.len} strokeDashoffset={off} />
        <path d={r.d} fill="none" stroke="#FFE9A0" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={r.len} strokeDashoffset={off} />
        {sp > 0.01 ? <g opacity={sp}>{star(r.ex + 30, r.ey - 34, 44, sp * tw)}{star(r.ex + 84, r.ey - 6, 18, sp * (2 - tw))}{star(r.ex + 6, r.ey - 88, 16, sp * tw)}</g> : null}
      </svg>
    </AbsoluteFill>);
};

/** f = the FILM picture frame (Clown.tsx passes the film clock, not the remapped one), vf = the video frame */
export const Overlays: React.FC<{ f: number; vf: number }> = ({ f }) => {
  const e1 = f >= shotA(SID.E1) && f < shotB(SID.E1);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <TapeDefs f={f} />
      <Chip f={f} />
      {e1 ? <E1Chip f={f} /> : null}
      {e1 ? <CountPops f={f} /> : null}
      <Ring f={f} />
      <Tape f={f} />
    </AbsoluteFill>);
};

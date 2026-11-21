// v4 CAPTION PLAN (DIRECTOR): which caption chunk is on screen on which frames. Pure data (no React), so the probe
// (briefs/v3/pointing/director/probe_captions_v4.mjs) can check it in Node. Captions.tsx draws it.
// Rules:
//  - chunks of 1-3 words, cut at punctuation (as make_v4_script.py) AND at every shot cut that falls inside a line, so a
//    chunk never holds words from both sides of a cut; "New York" / "New Yorkers" stay on one chunk; shouts = one chunk in
//    CAPS (script.ts); the Go run has no chunk (script.ts caps = []);
//  - a chunk comes up LEAD frames before its first word; if a cut falls in that lead, or within SNAP frames before its
//    first word, it comes up ON the cut frame (never on the last frame of the old shot, never a few frames late);
//  - a chunk holds through short gaps, goes in pauses >= HIDE_GAP (HOLD frames after its last word), and is NEVER on
//    screen past a cut that comes after its last word starts (the cut ends it: no caption hangs over into the next shot);
//  - the last chunk clears 6 f before the last frame (the loop tail, lead 2026-11-21).
import { FPS, FRAMES, LINES, SHOT_IDS, TOKS, TOTAL, type CapStyle, type Tok } from "./timeline";

export const LEAD = 2, HIDE_GAP = 8, HOLD = 2, SNAP = 8;   // SNAP 8 (audit r1: 'green light.' came 5 f late after the v02 cut)
export type Cap = { text: string; f0: number; f1: number; style: CapStyle; line: string };
const fr = (s: number) => Math.round(s * FPS);
/** every cut frame of the film (shot starts after frame 0), ascending */
export const CUT_FRAMES: number[] = SHOT_IDS.map((id) => FRAMES[id][0]).filter((f) => f > 0).sort((a, b) => a - b);
const cutIn = (a: number, b: number) => CUT_FRAMES.find((c) => c > a && c <= b);   // first cut in (a, b]

/** audit r2 (lead section 8): breaks that read naturally. A chunk STARTS at these words ... */
export const BREAK_BEFORE = new Set(["on#1", "have#1", "makes#1", "had#1", "must#1"]);
/** ... and these lines run their chunks THROUGH a cut (the words go on across it, as a J-cut): "on every green light."
 *  (L01, v01 -> v02), "have to point at the light," (L07, v12 -> v13), "a steam-train driver's eyes" (L13, v23 -> v23b) */
export const THROUGH_CUT = new Set(["L01", "L07", "L13"]);
/** split a line's words into chunks: phrases at punctuation, at cuts (not for THROUGH_CUT lines) and before
 *  BREAK_BEFORE words, then the best pieces (below) */
const chunkLine = (ts: Tok[], through = false): Tok[][] => {
  // units: "New" glued to a following "York..." word
  const units: Tok[][] = [];
  for (let i = 0; i < ts.length; i++) {
    if (/^new$/i.test(ts[i].w) && i + 1 < ts.length && /^york/i.test(ts[i + 1].w)) { units.push([ts[i], ts[i + 1]]); i++; }
    else units.push([ts[i]]);
  }
  const phrases: Tok[][][] = []; let cur: Tok[][] = [];
  units.forEach((u, k) => {
    if (cur.length && k > 0 && !through && cutIn(fr(units[k - 1][0].s), fr(u[0].s)) !== undefined) { phrases.push(cur); cur = []; }   // a cut before this word
    if (cur.length && BREAK_BEFORE.has(u[0].key)) { phrases.push(cur); cur = []; }                                      // a forced break
    cur.push(u);
    if (/[.,!?;:…]["”]?$/.test(u[u.length - 1].w)) { phrases.push(cur); cur = []; }
  });
  if (cur.length) phrases.push(cur);
  const out: Tok[][] = [];
  // pieces of <= 6 units and <= 30 characters (r2), as few as fit (audit r1: 3-word pieces broke meaning: "After a | hundred
  // times,"); among the splits with that count, the one that never ends a piece on a function word ("the", "a", "your",
  // "at" ...) nor starts one on a particle ("up", "out" ...), then the most even
  const FUNC = /^(a|an|the|to|of|at|in|on|and|or|but|your|my|his|her|their|is|have|has|that's|so|for|with|if|you|must)$/i;
  const PART = /^(up|down|out|off|away|back)/i;
  const chars = (us: Tok[][]) => us.flat().map((t) => t.w).join(" ").length;
  const word = (u: Tok[], last: boolean) => (last ? u[u.length - 1] : u[0]).w.replace(/["“”]/g, "");
  for (const ph of phrases) {
    let best: number[] | null = null, bestCost = Infinity;
    for (let k = 1; k <= ph.length && !best; k++) {
      // every way to cut ph into k pieces (cuts = k-1 positions in 1..len-1)
      const rec = (start: number, left: number, acc: number[]) => {
        if (left === 1) {
          const cuts = [...acc, ph.length]; let prev = 0, cost = 0, ok = true; const lens: number[] = [];
          for (const c of cuts) { const pc = ph.slice(prev, c); if (pc.length > 6 || chars(pc) > 30) { ok = false; break; } lens.push(chars(pc));
            if (c < ph.length && FUNC.test(word(pc[pc.length - 1], true))) cost += 10; if (prev > 0 && PART.test(word(pc[0], false))) cost += 10; prev = c; }
          if (!ok) return; cost += Math.max(...lens) - Math.min(...lens);
          if (cost < bestCost) { bestCost = cost; best = cuts; } return;
        }
        for (let c = start + 1; c <= ph.length - left + 1; c++) rec(c, left - 1, [...acc, c]);
      };
      rec(0, k, []);
    }
    const cuts: number[] = best ?? [ph.length]; let prev = 0;
    for (const c of cuts) { out.push(ph.slice(prev, c).flat()); prev = c; }
  }
  return out;
};

export const CAPS: Cap[] = (() => {
  const out: (Cap & { firstS: number; lastS: number })[] = [];
  for (const L of LINES) {
    if (!L.caps.length) continue;                                     // the Go run: no caption
    const ts = TOKS.filter((t) => t.line === L.id); if (!ts.length) continue;
    // shouts (style c) are ONE chunk in CAPS, also across a J-cut (audit r1: "CLEAR!" alone over the kid read as the kid
    // speaking): the whole call stays up from its onset to its end, through the cut
    const groups = L.style === "c" ? [ts] : chunkLine(ts, THROUGH_CUT.has(L.id));
    for (const g of groups) {
      const text = L.style === "c" ? L.caps.map((c) => c.text).join(" ") : g.map((t) => t.w).join(" ");
      const w0 = fr(g[0].s);
      let f0 = Math.max(0, w0 - LEAD);
      const c = cutIn(f0 - 1, w0) ?? cutIn(w0 - SNAP - 1, w0);       // a cut in the lead, or just before the word: come up on it
      if (c !== undefined) f0 = c;
      out.push({ text, f0, f1: fr(g[g.length - 1].e), style: L.style, line: L.id, firstS: g[0].s, lastS: g[g.length - 1].s });
    }
  }
  out.sort((a, b) => a.f0 - b.f0);
  for (let q = 0; q < out.length; q++) {
    const c = out[q], nx = out[q + 1];
    if (!nx) { c.f1 = TOTAL - 6; } else   // the last chunk clears 6 f before the end (the loop tail: frame 0 brings "Tap your foot")
    { c.f1 = nx.f0 - c.f1 >= HIDE_GAP ? c.f1 + HOLD : nx.f0; }
    const cut = c.style === "c" || THROUGH_CUT.has(c.line) ? undefined : cutIn(fr(c.lastS), c.f1 - 1);   // a cut after its last word starts: it ends there (not a shout / through-cut line)
    if (cut !== undefined) c.f1 = Math.min(c.f1, cut);
    if (nx && c.f1 > nx.f0) c.f1 = nx.f0;
  }
  return out.map(({ firstS: _a, lastS: _b, ...c }) => c);
})();
export const capAt = (frame: number): Cap | undefined => CAPS.find((x) => frame >= x.f0 && frame < x.f1);
/** a shot's caption place when the house band (centre x 0.5, y 0.7026 = 1349 px) would cover its action: the chunk's
 *  CENTRE as fractions of the frame (lead 02:45: v02 clear of her pointing hand, v05 clear of the button rim and the X).
 *  Captions.tsx keeps the text 40 px inside the frame edges. */
// audit r1 (lead 2026-11-21): ONE caption band for the whole film, centred, at 68 % of the height (y 1306 px: the band
// 66-70 %, inside the owners' clear zone 1260-1440 and above the Shorts title overlay); per-shot places only where the
// caption gate (gates_v4 --caps) finds a face, hand or board under the caption, and then only up or down in 62-78 %
// pass 2 (caption gate on CAST's log, 06:23): heights where no face and no hand sits under the caption
export const CAP_POS: Record<string, { x?: number; y?: number }> = {
  v01: { y: 0.74 }, v02: { y: 0.74 }, v03: { y: 0.74 }, v04: { y: 0.74 }, v05: { y: 0.74 },   // the hook band (lead r2: 72-76 %, button framed above it)
  v10: { y: 0.78 }, v12: { y: 0.76 }, v17: { y: 0.72 }, v20: { y: 0.74 }, v27: { y: 0.7 }, v31: { y: 0.74 } };
/** SAFE AREA (lead 2026-11-21 08:50): nothing that matters below y 0.80 or right of x 0.90 (the Shorts app's overlays) */
export const SAFE = { yMax: 0.8, xMax: 0.9 };
export const CAP_Y = 0.68;
export const shotAt = (frame: number) => SHOT_IDS.find((id) => frame >= FRAMES[id][0] && frame < FRAMES[id][1]) ?? "";
export const capPos = (frame: number) => { const p = CAP_POS[shotAt(frame)] ?? {}; return { x: p.x ?? 0.5, y: p.y ?? CAP_Y }; };

// THE GO PULSES (lead's decision 2026-11-20 23:00): during the Go run the normal chunks stay off; instead ONE big "GO!"
// pulses on each of the SEVEN Go words, the red one included and identical (the caption says go while the lamp says
// stop: the trap for viewers with the sound off). A pulse starts on the word's onset frame and lasts the word (onset ->
// end), at most GO_MAX (8) frames, and gone GO_OFF (3) frames before the next Go (lead 00:45): a pulse per beat. Captions.tsx draws it at GO_POS[shot]
// (beside / under the lit lamp, lead 01:25), never over the lamp, her eyes, her hand or the button.
export type GoPulse = { k: number; f0: number; f1: number; shot: string; pos: [number, number]; scale: number };
export const GO_MAX = 6, GO_OFF = 3, GO_LAST_MAX = 12;   // audit r1: Gos 1-6 clear with the lamp flash (6 f); the 7th (red) holds its word
/** each pulse a little bigger, the seventh (beside the RED lamp) the biggest (lead 2026-11-21) */
export const GO_SCALE = [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.4];
/** where the GO! pulse sits (its CENTRE as fractions of the frame: x of 1080, y of 1920), one fixed place per shot:
 *  just under the signal head, between the lamp and her face, clear of her eyes, her hand and the button (measured on
 *  stills f110 / f139 / f172 / f176 / f186 after LAB 01:35). A shot not listed: GO_FALLBACK (y ~1560, under the band). */
export const GO_POS: Record<string, [number, number]> = { v03: [0.18, 0.53], v04: [0.22, 0.49] };
export const GO_FALLBACK: [number, number] = [0.5, 0.8125];
export const GO_PULSES: GoPulse[] = (() => {
  const go = TOKS.filter((t) => /^go#\d+$/.test(t.key) && Number.isFinite(t.s)).sort((a, b) => a.s - b.s);
  return go.map((t, k) => {
    const s0 = fr(t.s), nx = go[k + 1];
    const f0 = cutIn(s0, s0 + 2) ?? s0;                                // a cut 1-2 f after the onset (the red cut): pulse on the cut
    let f1 = Math.min(f0 + (nx ? GO_MAX : GO_LAST_MAX), Math.max(f0 + 4, fr(t.e)));   // a pulse, not a hold
    if (nx) f1 = Math.min(f1, fr(nx.s) - GO_OFF);                         // and >= GO_OFF frames dark before the next Go
    const shot = SHOT_IDS.find((id) => f0 >= FRAMES[id][0] && f0 < FRAMES[id][1]) ?? "";
    return { k: k + 1, f0, f1, shot, pos: GO_POS[shot] ?? GO_FALLBACK, scale: GO_SCALE[Math.min(k, GO_SCALE.length - 1)] };
  });
})();
export const goAt = (frame: number): GoPulse | undefined => GO_PULSES.find((p) => frame >= p.f0 && frame < p.f1);

// THE X (audit r1, lead 2026-11-21): the big red X on "She" is the DIRECTOR's graphic now (LAB's 3D X is retired):
// 45 % of the frame width, saturated red with a thick white + black outline, a 1-2 frame overshoot pop on the word,
// held to the end of its shot; placed in LAB's free area of v05, never over her hand, face or the button.
export const X_POS: [number, number] = [0.205, 0.23];   // r2: centre of the empty LEFT wall of v05's frontal close-up (x 0.03-0.38, y 0.06-0.40, FOR LAB)
export const X_W = 0.34;   // r2: fits the empty wall box 15 px clear of her head
export const X_SHOT = "v05";
export const X_F0 = (() => { const t = TOKS.find((x) => x.key === "she#1"); return t ? fr(t.s) : -1; })();
export const X_F1 = FRAMES[X_SHOT] ? FRAMES[X_SHOT][1] : -1;
/** the X's scale at a frame (0 = not shown): 0.3 -> 1.15 (f+2) -> 0.96 (f+3) -> 1 (f+4), then held */
export const xScaleAt = (frame: number) => {
  if (X_F0 < 0 || frame < X_F0 || frame >= X_F1) return 0;
  const k = frame - X_F0; return [0.3, 0.8, 1.15, 0.96, 1.0][k] ?? 1.0;
};

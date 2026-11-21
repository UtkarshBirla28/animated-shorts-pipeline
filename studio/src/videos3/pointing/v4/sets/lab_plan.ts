// LAB v4: THE LAB'S CLOCK (owner LAB). Pure data on top of the DIRECTOR's v4 clock (no three, no cast): the set, its
// cameras and the sandbox all import it. NOTHING here is a typed frame number:
//   * the lamp / light events come from timeline.ts EV (lampGreen, goFlashes, red, redBeatEnd, xPop: rules on words);
//   * the lab's shots are found by ROLE: the lab (or kitchen) shot that CONTAINS a key word of the script (the first of
//     a list of candidate words that exists), so a renumbered, re-cut or re-worded plan still finds them; a role whose
//     words are all gone simply has no shot (the director's default view takes it).
// While a word is missing from the script (NaN in EV), a PLAN of the 08:25 hook stands in for that one value.
import { EV, LINES, cutS, cutE, SHOT_IDS, FPS, FRAMES, TOTAL, tokOf } from "../timeline";
import { SHOT_PLAN } from "../shot_plan";

/** a line id by a fragment of its text (the script's numbering may change; its words will not) */
export const lineByText = (frag: string) => LINES.find((l) => l.text.toLowerCase().includes(frag.toLowerCase()))?.id;

/** THE ROLES of the lab's shots: how each is found in the shot plan (the first lab / kitchen shot that matches) */
export type Role = "frame0" | "green" | "goRun" | "red" | "frozen" | "loop" | "herPoint"
  | "wide1994" | "switch" | "counter" | "redRoom" | "watched" | "five" | "card" | "wave" | "notOne" | "bored" | "tapper" | "kitchen" | "loopA";
const ROLE_RULES: Record<Role, { words: string[]; set?: string }> = {
  frame0: { words: ["tap#1"] }, green: { words: ["green#1"] }, goRun: { words: ["go#2", "go#1"] }, red: { words: ["go#7"] },
  frozen: { words: ["she#1", "did#1"] }, loop: { words: ["time#1", "try#1"] }, loopA: { words: ["try#1"] }, herPoint: { words: ["pointing#1", "saying#1"] },
  wide1994: { words: ["railway#1", "lab#1"] }, switch: { words: ["trap#1"] }, counter: { words: ["hundred#1"] }, redRoom: { words: ["red#1"] },
  watched: { words: ["watch#1", "people#1"] }, five: { words: ["five#1"] }, card: { words: ["others#1"] }, wave: { words: ["light#2", "point#1"] },
  notOne: { words: ["not#1"] }, bored: { words: ["after#1"] }, tapper: { words: ["brain#1", "hand#1"] },
  kitchen: { words: ["cereal#1", "fridge#1"], set: "kitchen" },
};
const findRole = (r: Role): string | undefined => {
  const R = ROLE_RULES[r], set = R.set ?? "lab";
  for (const w of R.words) {
    const t = tokOf(w); if (!t || !Number.isFinite(t.s)) continue;
    const f = Math.round(t.s * FPS) + 1;
    const p = SHOT_PLAN.find((q) => q.set === set && FRAMES[q.id] && f >= FRAMES[q.id][0] && f < FRAMES[q.id][1]);
    if (p) return p.id;
  }
  return undefined;
};
/** role -> shot id on today's plan (undefined = the plan has no such shot) */
export const ROLE: Partial<Record<Role, string>> = Object.fromEntries((Object.keys(ROLE_RULES) as Role[]).map((r) => [r, findRole(r)]).filter((x) => x[1] && SHOT_IDS.includes(x[1] as string)));
/** a role's span in film seconds ([NaN, NaN] when the plan has no such shot) */
export const spanOf = (r: Role): [number, number] => { const id = ROLE[r]; return id ? [cutS(id), cutE(id)] : [NaN, NaN]; };
export const inRole = (t: number, r: Role) => { const [a, b] = spanOf(r); return t >= a && t < b; };

/** the opening's events in film seconds: EV, with the 08:25 plan standing in for a missing word */
const ok = (x: number, fb: number) => (Number.isFinite(x) ? x : fb);
const PLAN = { green: 1.58, go: [2.97, 3.43, 3.85, 4.23, 4.57, 4.87, 5.13], x: 6.68 };
export const HOOK = {
  green: ok(EV.lampGreen, PLAN.green),
  go: [...EV.goFlashes.map((g, k) => ok(g, PLAN.go[k])), ok(EV.red, PLAN.go[6])],
  red: ok(EV.red, PLAN.go[6]), redBeatEnd: ok(EV.redBeatEnd, PLAN.go[6] + 0.7), x: ok(EV.xPop, PLAN.x),
};
export const fr = (t: number) => Math.round(t * FPS);
/** the opening = frame 0 .. the end of the frozen shot (the lamp + the strip are driven by the hook events there) */
export const OPENING_END = () => { const f = spanOf("frozen")[1]; return Number.isFinite(f) ? f : HOOK.x + 1.0; };

/** the big lamp at time t: which lens is lit (0 none, 2 green, 1 red) and the flash kick 0..1 (decays) */
export const lampAt = (t: number): { state: 0 | 1 | 2; flash: number } => {
  // outside the opening: her point (line 11) = the RED lamp lit; the loop shot = exactly frame 0 (dark)
  // LIFE (V5): a lit red lens never sits dead still: a slow alarm pulse (about 1 per second) on top of the cut's kick
  const pulse = (t: number) => 0.22 * (0.5 - 0.5 * Math.cos(t * 6.3));   // starts at 0: no step after the held beat
  if (inRole(t, "herPoint")) return { state: 1, flash: pulse(t) };
  // FIX R2 (v36): the new round begins: the lamp turns GREEN on "point" and goes dark again in the 12-frame loop tail
  if (inRole(t, "loop")) { const p = tokOf("point#6")?.s ?? NaN; return Number.isFinite(p) && t >= p && !(t >= EV.loopTail) ? { state: 2, flash: Math.exp(-(t - p) * 6) * 0.6 } : { state: 0, flash: 0 }; }
  if (t >= OPENING_END()) return { state: 0, flash: 0 };
  const g = HOOK.go;
  if (t >= HOOK.red) return { state: 1, flash: Math.max(Math.exp(-(t - HOOK.red) * 5), t > HOOK.redBeatEnd ? pulse(t - HOOK.redBeatEnd) : 0.09 * (0.5 - 0.5 * Math.cos((t - HOOK.red) * 9))) };   // the glow breathes a little even in the silent beat
  for (let k = 5; k >= 0; k--) if (t >= g[k]) return t - g[k] < 0.17 + 0.015 * (5 - k) ? { state: 2, flash: Math.exp(-(t - g[k]) * 9) } : { state: 0, flash: 0 };
  if (t >= g[0] - 0.2) return { state: 0, flash: 0 };              // dark for a beat before the first Go: the run starts clean
  if (t >= HOOK.green) return { state: 2, flash: Math.exp(-(t - HOOK.green) * 6) * 0.6 };
  return { state: 0, flash: 0 };
};
/** the button's light: a bright kick on each press (her hand lands ~1 frame after the Go); held on after the red press */
export const buttonAt = (t: number) => {
  if (t >= OPENING_END()) return 0;
  let k = 0; for (const g of HOOK.go) { const d = t - (g + 0.04); if (d > -0.02 && d < 0.4) k = Math.max(k, Math.exp(-Math.max(0, d) * 7)); }
  return t >= HOOK.red ? Math.max(k, 0.55) : k;
};
/** V5: the dome's DIP (0 up .. 1 fully down) under her touch: down 1-2 f after each Go onset (CAST's touch), held 4 f,
 *  back up over 2 f; on the red it goes down and STAYS down (her hand left on it) to the end of the opening */
export const buttonDipAt = (t: number) => {
  if (t >= OPENING_END()) return 0;
  const f = 1 / 30;
  if (t >= HOOK.red + f) return 1;
  let k = 0; for (const g of HOOK.go.slice(0, 6)) { const d = t - g; if (d >= f && d < 6 * f) k = Math.max(k, d < 2 * f ? 0.6 : 1); else if (d >= 6 * f && d < 8 * f) k = Math.max(k, 1 - (d - 6 * f) / (2 * f)); }
  return k;
};
/** the red X: 0 before "She", a pop with an overshoot, then 1 */
export const xAt = (t: number) => { const q = (t - HOOK.x) / 0.2; return q <= 0 ? 0 : q < 1 ? 1.18 * Math.sin((q * Math.PI) / 2) : 1 + 0.18 * Math.exp(-(q - 1) * 3) * Math.cos((q - 1) * 7); };
/** the row of small lamps on the partition: idle blinking; all RED from the red to the end of the opening */
export const stripAt = (i: number, t: number): number => {   // 0 off, 1 red, 2 green, 3 yellow, 4 blue
  if (t >= HOOK.red && t < OPENING_END()) return t < HOOK.redBeatEnd || (Math.floor(t * 6) + i) % 2 === 0 ? 1 : 0;   // V5: all red on the cut, then an alarm chase (life in the frozen shot)
  const tl = ((t % (TOTAL / FPS)) + TOTAL / FPS) % (TOTAL / FPS);   // FIX R1: the pattern repeats with the film: the loop seam matches
  const per = 0.42 + 0.11 * (i % 4), n = Math.floor(tl / per + i * 0.37);
  return (n * 7 + i * 3) % 4 === 0 ? 0 : ([2, 3, 4, 2, 3][(n + i) % 5] as number);
};

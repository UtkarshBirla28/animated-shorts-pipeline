// LAB v4: THE HOOK'S CLOCK (owner LAB). Pure data on top of the v4 clock: no three, no cast, so the set, its cameras and
// the sandbox can all import it. Every time comes from the v4 script's words (v4/timeline.ts: the real voice when VOICE
// installs it, else the plan). While the clock still carries an older script (no "go" words yet), a PLAN of the locked
// SCRIPT_v4 hook (lines 1-3, ~8 s from frame 0) stands in, so the hook can be built and seen today.
//   line 1 "Tap your foot on every green light. Only green."  -> the lamp turns GREEN on the first "green"
//   line 2 "Go. Go. Go. Go. Go. Go. Go!"                      -> a flash + a press on every "Go"; the 7th is RED
//   (0.5 s of silence)                                       -> she has pressed anyway; stillness
//   line 3 "Did you tap? She did."                            -> she freezes staring up at the red lamp; the big red X
//   last line "Now try again. This time, point, and say it."  -> frame 0's picture with her arm already up, pointing
import { tokOf, LINES, cutS, cutE, SHOT_IDS, FPS } from "../timeline";
import { SHOT_PLAN } from "../shot_plan";

export type HookTimes = {
  /** where the times come from */ source: "clock" | "plan";
  /** the first "green" (the lamp turns green) */ green: number;
  /** the seven "Go" onsets; the 7th is the red */ go: number[];
  /** line 3 starts ("Did") and "She did" lands (the X pops) */ did: number; x: number;
  /** the hook's two shots: A = lines 1-2 (frame 0 + the push-in, rest on the red), B = line 3 (her frozen face) */
  A: [number, number]; B: [number, number];
  /** the loop shot (the last line), seconds */ loop: [number, number];
};

const has = (k: string) => { const t = tokOf(k); return t && Number.isFinite(t.s) ? t : undefined; };
/** a line id by a fragment of its text (the script's numbering may change; its words will not) */
export const lineByText = (frag: string) => LINES.find((l) => l.text.toLowerCase().includes(frag.toLowerCase()))?.id;
/** the shots of the v4 plan that belong to a line (their start rule names the line or a word inside it) */
const shotsOfLine = (id: string | undefined) => (id ? SHOT_PLAN.filter((p) => p.set === "lab" && (p.start === `line:${id}` || (p.start.startsWith("word:") && tokOf(p.start.slice(5))?.line === id))).map((p) => p.id) : []);

/** THE PLAN (until the clock has the locked script): James at ~3.25 words/s, the Go run speeding up */
const PLAN = (() => {
  const green = 1.62, go = [3.2, 3.82, 4.37, 4.85, 5.27, 5.64, 5.97], did = go[6] + 0.55 + 0.4;
  return { green, go, did, x: did + 0.62, A: [0, did - 0.08] as [number, number], B: [did - 0.08, did + 1.45] as [number, number], loop: [0, 2.2] as [number, number] };
})();

export const hookTimes = (): HookTimes => {
  const go = [1, 2, 3, 4, 5, 6, 7].map((k) => has(`go#${k}`));
  if (go.every(Boolean) && has("green#1") && has("did#1")) {
    const g = go.map((t) => t!.s), did = has("did#1")!.s, x = has("did#2")?.s ?? did + 0.6;
    const L1 = lineByText("tap your foot"), L3 = lineByText("did you tap"), LZ = lineByText("now try again");
    const sA = shotsOfLine(L1).concat(shotsOfLine(lineByText("go. go"))), sB = shotsOfLine(L3), sZ = shotsOfLine(LZ);
    const span = (ids: string[], fb: [number, number]): [number, number] => (ids.length && ids.every((i) => SHOT_IDS.includes(i)) ? [Math.min(...ids.map(cutS)), Math.max(...ids.map(cutE))] : fb);
    const zS = LZ ? has(`${LINES.find((l) => l.id === LZ)!.text.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9']/g, "")}#1`) : undefined;
    return { source: "clock", green: has("green#1")!.s, go: g, did, x,
      A: span(sA, [0, did - 0.08]), B: span(sB, [did - 0.08, did + 1.45]), loop: span(sZ, zS ? [zS.s - 0.1, zS.s + 2.2] : PLAN.loop) };
  }
  return { source: "plan", ...PLAN };
};
export const HOOK = hookTimes();
export const fr = (t: number) => Math.round(t * FPS);

/** the lamp at time t: 0 = dark, 2 = green, 1 = red; `flash` 0..1 = the brightness kick of a flash (decays) */
export const lampAt = (t: number, H: HookTimes = HOOK): { state: 0 | 1 | 2; flash: number } => {
  const g = H.go;
  if (t >= g[6]) return { state: 1, flash: Math.exp(-(t - g[6]) * 5) };
  for (let k = 5; k >= 0; k--) if (t >= g[k]) return t - g[k] < 0.24 + 0.02 * (5 - k) ? { state: 2, flash: Math.exp(-(t - g[k]) * 9) } : { state: 0, flash: 0 };
  if (t >= g[0] - 0.22) return { state: 0, flash: 0 };              // dark for a beat before the first Go: the run starts clean
  if (t >= H.green) return { state: 2, flash: Math.exp(-(t - H.green) * 6) * 0.6 };
  return { state: 0, flash: 0 };
};
/** the button's light: a bright kick on each press (her hand lands ~1 frame after the Go) */
export const buttonAt = (t: number, H: HookTimes = HOOK) => { let k = 0; for (const g of H.go) { const d = t - (g + 0.04); if (d > -0.02 && d < 0.4) k = Math.max(k, Math.exp(-Math.max(0, d) * 7)); } return k; };
/** the red X: 0 before, a pop with an overshoot, then 1 */
export const xAt = (t: number, H: HookTimes = HOOK) => { const q = (t - H.x) / 0.22; return q <= 0 ? 0 : q < 1 ? 1.18 * Math.sin((q * Math.PI) / 2) : 1 + 0.18 * Math.exp(-(q - 1) * 3) * Math.cos((q - 1) * 7); };
void cutS;

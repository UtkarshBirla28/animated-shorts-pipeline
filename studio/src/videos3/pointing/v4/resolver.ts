// v4 CUE RESOLVER (DIRECTOR): CAST's beat cues on the v4 clock. "shout#1" = that word's first frame, "shout#1.end",
// "@v05" / "@v05.end" = a v4 shot's first / end frame, any of them "+6" / "-4" frames. Use it with cast/moves.ts:
//   const TIMED = timeBeats(BEATS, R_V4);  ...  castCardOf(ctx, who, opts, (e) => actBeats(who, TIMED, e))
import type { Resolver } from "../cast/moves";
import { E, FPS, FRAMES, S, shotOfFrame } from "./timeline";

const fr = (s: number) => Math.round(s * FPS);
const safe = (f: () => number) => { try { return f(); } catch { return NaN; } };
export const R_V4: Resolver = {
  word: (key) => safe(() => fr(S(key))),
  wordEnd: (key) => safe(() => fr(E(key))),
  shot: (id) => FRAMES[id] ?? null,
  shotEnd: (f) => FRAMES[shotOfFrame(f)][1],
  shotStart: (f) => FRAMES[shotOfFrame(f)][0],
};

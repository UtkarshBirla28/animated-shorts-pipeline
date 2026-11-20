// STORY 2 MARKS + TIMING (owner ANIMATOR C; shots S12-S20). PURE: no drawing, no DOM. Every key is a BEAT word, a shot
// span or a plan.ts anchor (never a literal frame). Imported by cast_story2.ts (the staging) and cams_v2.ts (S16: the lens
// follows Hyman's REAL walk, which now has a freeze in it).
import { STORY, type V3 } from "./plan";
import { SHOTS, SID, BEAT } from "./beats";

const c01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const c = c01(x); return c * c * (3 - 2 * c); };
const eio = (x: number) => { const c = c01(x); return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2; };
/** the integral of eio from 0 to x (x in 0..1; 0.5 at x = 1) */
const eioI = (x: number) => { const c = c01(x); return c < 0.5 ? c ** 4 : 0.0625 + (c - 0.5) + ((2 - 2 * c) ** 4 - 1) / 16; };
const SH = (k: string) => SHOTS[SID[k] - 1];
const sm5 = (x: number) => { const c = c01(x); return c * c * c * (c * (6 * c - 15) + 10); };

// ---------------- S14 (p4, audit R3 + the viewer's 44-48 s dip): "Here's the weird part: people listening to music
// noticed him." A PHONE walker (the pink one) walks right under the clown's nose on "weird" while he honks and waves in her
// face: she never looks (she laughs into her call). The lens then drifts back and left to the HEADPHONE DUDE, who bops
// into the frame on "listening", spots the dejected clown on "music" and waves on "noticed him": the clown's payoff.
export const S14A = SH("S14").a, S14B = SH("S14").b;
/** the dude bops east along z ~-2.45 at the walk's speed, entering the frame on "listening" */
const DUDE14A: V3 = [-3.0, 0, -2.42], DUDE14V = 1.04 / 30;
export const dude14 = (f: number): V3 => [DUDE14A[0] + (f - S14A) * DUDE14V, 0, DUDE14A[2] - 0.0012 * (f - S14A)];
/** metres the dude has walked (for his walk phase) */
export const dudeM14 = (f: number) => (f - S14A) * DUDE14V + 3;
/** the clown waits on the lap's front at CL14 (rocking), then rides off east (dejected) from GO14 at up to CV14 */
export const CL14: V3 = [0.35, 0, -3.85];
export const GO14 = Math.round(BEAT.listening - 4), CV14 = 0.75 / 30;
export const clown14 = (f: number): V3 => { const t = f - GO14, a = 18; return [CL14[0] + (t <= 0 ? 0 : CV14 * (t < a ? (t * t) / (2 * a) : a / 2 + (t - a))), 0, CL14[2]]; };
/** the phone walker walks west along z -3.05, just IN FRONT of the clown (behind him she was hidden by his body and wheel):
 *  right under his nose at PASS14; he waves ABOVE her head (his hand stays in view) */
export const PASS14 = Math.round(BEAT.weird + 3), WALK14V = 1.04 / 30;
export const walker14 = (f: number): V3 => [CL14[0] - (f - PASS14) * WALK14V, 0, -3.05];
/** THE LENS: the encounter framing (a point between the clown and the walker, drifting west with her) glides to the
 *  dude-follow framing (EDIT's p3 S14 lens: the dude + 0.35 m at xs 0.42) over CW14 f round "listening" */
const CW0 = BEAT.listening - 16, CW14 = 26;
export const camW14 = (f: number) => sm5((f - CW0) / CW14);
export const cam14T = (f: number): V3 => { const e: V3 = [0.55 - 0.012 * (f - S14A), 1.25, -3.3], d = dude14(f), k = camW14(f);
  return [e[0] + (d[0] + 0.35 - e[0]) * k, e[1] + (1.3 - e[1]) * k, e[2] + (d[2] - e[2]) * k]; };
export const cam14XS = (f: number) => 0.5 - 0.08 * camW14(f);

// ---------------- S16: Hyman's sneak (tiptoe -> FREEZE when a jogger passes -> tiptoe on) ----------------
export const S16A = SH("S16").a, S16B = SH("S16").b;
/** he freezes mid-step here (a jogger passes right behind him), hides the bills, whistles; he goes on at GO16 */
export const FREEZE16 = Math.round(BEAT.tried + 1), GO16 = Math.max(FREEZE16 + 14, Math.round(BEAT.sneakier - 3));
const V16A = 0.56 / 30, V16B = 0.66 / 30, DN16 = 4, UP16 = 5;
const D16: V3 = (() => { const a = STORY.s16.from, b = STORY.s16.to, n = Math.hypot(b[0] - a[0], b[2] - a[2]); return [(b[0] - a[0]) / n, 0, (b[2] - a[2]) / n]; })();
/** metres he has walked from STORY.s16.from at frame f (he is at `from` 6 f before the shot); stateless */
export const m16 = (f: number) => {
  const f0 = S16A - 6, a = V16A * (Math.min(f, FREEZE16) - f0) + V16A * DN16 * (c01((f - FREEZE16) / DN16) - eioI((f - FREEZE16) / DN16));
  return a + V16B * UP16 * eioI((f - GO16) / UP16) + V16B * Math.max(0, f - GO16 - UP16);
};
/** how much he walks (1 = tiptoeing, ~0 = frozen) */
export const go16 = (f: number) => (f < FREEZE16 ? 1 : f < GO16 ? 1 - eio((f - FREEZE16) / DN16) : eio((f - GO16) / UP16));
/** his feet at frame f */
export const hy16 = (f: number): V3 => { const m = m16(f); return [STORY.s16.from[0] + D16[0] * m, 0, STORY.s16.from[2] + D16[2] * m]; };
export const HEAD16 = Math.atan2(D16[0], D16[2]);
/** a point m metres along his line (p4: the pigeon that tiptoes after him walks the same line, a fixed distance behind) */
export const hyM16 = (m: number): V3 => [STORY.s16.from[0] + D16[0] * m, 0, STORY.s16.from[2] + D16[2] * m];
/** the point the S16 lens follows: his position smoothed over +-9 f (so the lens eases out of and into his walk) */
export const cam16 = (f: number): V3 => { let x = 0, z = 0, n = 0; for (let k = -9; k <= 9; k += 3) { const p = hy16(f + k); x += p[0]; z += p[2]; n++; } return [x / n, 0, z / n]; };
/** the lens pushes in a little while he is frozen (the camera never stops), 0..1 */
export const push16 = (f: number) => sm((f - FREEZE16 + 2) / 9) * (1 - sm((f - GO16 - 2) / 12)) * (0.6 + 0.4 * c01((f - FREEZE16) / Math.max(1, GO16 - FREEZE16)));

// STORY 1 MARKS + TIMING (owner ANIMATOR B; shots S1-S11). PURE: no drawing, no DOM. Every key is a BEAT word of the
// narration (beats.ts) or a plan.ts anchor, never a literal frame, so the staging follows any voice. Imported by
// cast_story1.ts (the staging), cams_v2.ts (S7: the pair the lens follows into the stop) and the sound-cue tool
// (out/clown/anim_story1/tools/cues.mjs).
import { STORY, STUDY, OFFICE, SQ, lapPos, lapHeading, type V3 } from "./plan";
import { SHOTS, SID, BEAT, TALKS } from "./beats";

export const TAU = Math.PI * 2;
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const c01 = (x: number) => clamp(x, 0, 1);
export const sm = (x: number) => { const c = c01(x); return c * c * (3 - 2 * c); };
export const eio = (x: number) => { const c = c01(x); return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2; };
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const flat = (a: V3, b: V3) => Math.hypot(b[0] - a[0], b[2] - a[2]);
/** the heading (atan2(x, z) of travel) from a to b */
export const headTo = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2]);
export const dirOf = (h: number): V3 => [Math.sin(h), 0, Math.cos(h)];
/** the shot record by key */
export const SH = (k: string) => SHOTS[SID[k] - 1];
/** shot progress (unclamped) */
export const prog = (k: string, f: number) => { const s = SH(k); return (f - s.a) / (s.b - s.a); };

/** a C1 MONOTONE curve through (frame, value) knots (Fritsch-Carlson), linear outside: eased moves keyed to words */
export const mono = (K: [number, number][], f: number) => {
  const n = K.length;
  if (n === 1) return K[0][1];
  if (f <= K[0][0]) return K[0][1];
  if (f >= K[n - 1][0]) return K[n - 1][1];
  const d = K.slice(0, -1).map((k, i) => (K[i + 1][1] - k[1]) / Math.max(1e-6, K[i + 1][0] - k[0]));
  const m = K.map((_, i) => (i === 0 ? 0 : i === n - 1 ? 0 : d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])));
  let i = 0; while (i + 2 < n && f > K[i + 1][0]) i++;
  const h = K[i + 1][0] - K[i][0], u = (f - K[i][0]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * K[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * K[i + 1][1] + (u3 - u2) * h * m[i + 1];
};

// ---------------- the walk that STOPS (the same arithmetic as cast_people.ts stopWalk, so the lens and the feet agree) ----------------
const goOf = (x: number) => (x < -8 ? 1 : x < 0 ? 1 - eio((x + 8) / 8) : 0);
const distW = (a: number, b: number, v: number) => { let m = 0; for (let x = a; x < b; x += 0.25) m += v * goOf(x + 0.125) * 0.25; return m; };
/** metres RELATIVE to the stop point at t = f - fStop for a walker at v metres / frame (negative before the stop) */
export const stopMetres = (t: number, v: number) => { const D = distW(-8, 0, v); return t <= -8 ? -D + (t + 8) * v : t >= 0 ? 0 : -distW(t, 0, v); };
/** the natural walk speed of cast_people's "walk" gait (1.04 m/s) in metres per frame */
export const V_WALK = 1.04 / 30;

// ================================================================== S1: the phone guy + the circling clown
/** the phone guy walks EDIT's line (the S1 lens follows exactly this point) */
export const s1Guy = (f: number): V3 => lerp3(STORY.s1.from, STORY.s1.to, clamp(prog("S1", f), -0.3, 1.3));
/** the clown circles BEHIND him on a flat loop (1.1 x 0.5 m: wider than deep, so he is side-on or coming at the lens most of
 *  the lap and shows his back only briefly at its left end, behind the guy). Its centre trails the guy at 55 % of his
 *  pace, so the clown keeps his size while the guy grows toward the lens. One lap in 115 f (~1.5 m/s), ridden so the
 *  near side goes right -> left; phased so the back-view end falls on the shot's first and last frames: the honks come
 *  as he rides at the lens (right end), the face-pulling and the frenzy on the near side, closest and biggest */
export const S1C = { rx: 0.6, rz: 0.4, lap: 115, trail: 0.35, cx: -0.05, cz: -0.2 };   /* checked through the S1 lens: his body stays at x ~450-900 (right of the guy's head) except the back-view end behind the guy */
export const s1Centre = (f: number): V3 => { const g = sub3(s1Guy(f), STORY.s1.from), c = STORY.s1.circle.c; return add3([c[0] + S1C.cx, 0, c[2] + S1C.cz], mul3([g[0], 0, g[2]], S1C.trail)); };
/** his lap progress (frames of riding): he GIVES UP on "saw him." and brakes to a dead stop on the near side, side-on, in
 *  view (an exponential stop, ~5 f: the speed never jumps) */
export const s1Stop = () => BEAT.sawHim7 - 3;
const s1Phi = (f: number) => { const fb = s1Stop(), x = Math.min(f, fb) - SH("S1").a - 9; return f <= fb ? x : x + 5 * (1 - Math.exp(-(f - fb) / 5)); };
export const s1Ang = (f: number) => -Math.PI / 2 - (TAU / S1C.lap) * s1Phi(f);
export const s1Clown = (f: number): V3 => { const c = s1Centre(f), a = s1Ang(f); return [c[0] + S1C.rx * Math.sin(a), 0, c[2] + S1C.rz * Math.cos(a)]; };
/** metres the S1 clown has ridden (for the wheel), from 12 f before the shot */
export const s1Metres = (f: number) => { const a0 = SH("S1").a - 12; let m = 0, p = s1Clown(a0); for (let t = a0 + 1; t <= f; t++) { const q = s1Clown(t); m += flat(p, q); p = q; } return m; };
/** S1 key frames (words) */
export const T1 = () => ({
  a: SH("S1").a, b: SH("S1").b, most: BEAT.most, people: BEAT.most + Math.max(6, Math.round((BEAT.phoneCall - BEAT.most) * 0.35)), phone: BEAT.phoneCall,
  never: BEAT.neverSaw, saw: BEAT.sawHim7, end: BEAT.experimentEnd,
});

// ================================================================== S2-S5: the office
/** S2 (p3: Hyman thinks IN MOTION): he works AT the board first (his back to the lens, tapping under the title with a
 *  marker), turns on his name, paces two steps away to his mark (OFFICE.hyman.atBoard) on "needed a", swings back and
 *  jabs the marker at the title on "distraction", crumples an idea and throws it at the board on "nobody could", then
 *  thinks (two chin strokes), eyes to the ceiling and, 6 f before the cut, to the door */
export const S2P0: V3 = add3(OFFICE.hyman.atBoard, [-0.7, 0, -0.22]);
export const T2 = () => { const a = SH("S2").a, b = SH("S2").b; return { a, b, hyman: BEAT.hyman, needed: BEAT.needed, distraction: BEAT.distraction, nobody: BEAT.nobody, miss: BEAT.miss, end: BEAT.hymanEnd,
  tap1: a + 6, tap2: a + 14, turn: BEAT.hyman - 9, paceEnd: BEAT.distraction - 5, paper: BEAT.distraction + 2, toss: BEAT.nobody + 6, chin: BEAT.miss - 5, door: b - 6 }; };
/** Hyman's S2 pace: S2P0 -> atBoard at the walk gait, the last step landing on T2().paceEnd (m = metres walked so far) */
export const s2Hyman = (f: number): { p: V3; m: number; L: number } => {
  const to = OFFICE.hyman.atBoard, L = flat(S2P0, to), m = Math.max(-L, stopMetres(f - T2().paceEnd, V_WALK));
  return { p: add3(to, mul3(dirOf(headTo(S2P0, to)), m)), m: m + L, L };
};
export const T3 = () => ({ a: SH("S3").a, b: SH("S3").b, open: OFFICE.door.openF, student: BEAT.student, told: BEAT.toldHim, end: BEAT.studentEnd, /** Hyman's side step toward the door lands */ step: BEAT.student + 10 });
/** S3: Hyman turns to the door and takes ONE step along the board toward it (S3END): seen whole in the door lens after its
 *  snap push, his head clear of the student's (at the board he is cut by the left edge; at `turned` he covered the student) */
export const S3END: V3 = add3(OFFICE.hyman.atBoard, [0.42, 0, -0.02]);
export const s3Hyman = (f: number): { p: V3; m: number } => {
  const a = add3(OFFICE.hyman.atBoard, [0.18, 0, 0]), L = flat(a, S3END), m = Math.max(-L, stopMetres(f - T3().step, V_WALK));   /* (0.18 m right of his S2 mark: whole in the door lens from its first frame) */
  return { p: add3(S3END, mul3(dirOf(headTo(a, S3END)), m)), m: m + L };
};
/** S4: the student rolls the unicycle in from the door and stops on "unicycle" (Hyman takes two steps to meet him as the
 *  shot starts: hyStop); S5: the suit is revealed on "clown" */
export const T4 = () => ({ a: SH("S4").a, b: SH("S4").b, own: BEAT.own, unicycle: BEAT.unicycle, stop: BEAT.unicycle + 8, end: BEAT.unicycleEnd, hyStop: SH("S4").a + 8 });
export const T5 = () => ({ a: SH("S5").a, b: SH("S5").b, and: BEAT.andAClown, clown: BEAT.clownSuit, suit: BEAT.suit, end: BEAT.suitEnd, /** the reveal's first frame (the arm leads) */ go: BEAT.clownSuit - 1 });
/** the student's walk into the room in S4 (from the doorway to his mark), stopping on T4().stop */
export const s4From: V3 = [OFFICE.student.lean[0], 0, OFFICE.student.lean[2] + 0.05];
export const s4To: V3 = OFFICE.student.inRoom;
export const s4Student = (f: number): { p: V3; m: number } => {
  const L = flat(s4From, s4To), m = Math.max(-L, stopMetres(f - T4().stop, V_WALK));
  return { p: add3(s4To, mul3(dirOf(headTo(s4From, s4To)), m)), m: m + L };
};
/** Hyman's step toward his visitor at the top of S4 (S3END -> turned) */
export const s4Hyman = (f: number): { p: V3; m: number } => {
  const a = S3END, b = OFFICE.hyman.turned, L = flat(a, b), m = Math.max(-L, stopMetres(f - T4().hyStop, V_WALK));
  return { p: add3(b, mul3(dirOf(headTo(a, b)), m)), m: m + L };
};
/** S5: Hyman's mark (where S4 left him) and the suit's place BESIDE the student (metres to the student's screen-left) */
export const HY5: V3 = add3(OFFICE.hyman.turned, [0.05, 0, 0.1]);

// ================================================================== S6: the hour (p4: the crane comes down onto his circle)
/** S6 (p4, audit p3 R2 + RETENTION-6): "the clown rode circles in the middle of campus". A TIGHT circle on the open plaza
 *  in front of the sculpture (centre c, radius r), close to the crane, so he is >= 20 % of the frame in every frame and
 *  the whole circle stays inside it. It is a time-lapse line, so he rides FAST (`laps` circles in the shot), except for a
 *  SLOW-DOWN (S6_SLOW) behind the phone walker he honks at: phased so that at the honk he is on the circle's FAR side
 *  (S6_AH: the side away from the planned lens), riding to screen right right behind her */
export const S6C = { c: [2.0, 0, -1.3] as V3, r: 0.86, laps: 1.6 };
/** the lens's ground axis at the honk (cams_v2.ts camS6 is keyed round it): fw = from the lens toward the circle, rt = screen right */
export const S6_FW: V3 = [-0.286, 0, -0.958], S6_RT: V3 = [0.958, 0, -0.286];
export const S6_AH = Math.atan2(S6_FW[0], S6_FW[2]);
/** the honk at the phone walker (on "circles" + 21), the slow-down round it (len frames, speed down to 1 - k) */
export const S6_HONK = () => BEAT.circles + 21;
const S6_SLOW = { len: 30, k: 0.72 };
const s6Phi = (f: number) => { const u = c01((f - (S6_HONK() - S6_SLOW.len / 2)) / S6_SLOW.len); return f - S6_SLOW.k * S6_SLOW.len * 0.5 * (u - Math.sin(TAU * u) / TAU); };
export const s6W = () => (TAU * S6C.laps) / (SH("S6").b - SH("S6").a);
/** his angle on the circle (decreasing = lapHeading's direction) */
export const s6Ang = (f: number) => S6_AH - s6W() * (s6Phi(f) - s6Phi(S6_HONK()));
export const s6Clown = (f: number) => { const a = s6Ang(f), v = S6C.r * Math.abs(s6Ang(f + 0.5) - s6Ang(f - 0.5)) * 30;
  return { p: [S6C.c[0] + S6C.r * Math.sin(a), 0, S6C.c[2] + S6C.r * Math.cos(a)] as V3, heading: lapHeading(a), metres: S6C.r * Math.abs(a - s6Ang(SH("S6").a - 12)), v, a }; };
const cpt = (kf: number, kr: number): V3 => [S6C.c[0] + kf * S6_FW[0] + kr * S6_RT[0], 0, S6C.c[2] + kf * S6_FW[2] + kr * S6_RT[2]];
/** THE PHONE WALKER he honks at (the pink-phone blonde of the count): across the far side of his circle, left -> right,
 *  chatting; at the honk she is half a step ahead of him (kr = S6_WA.atHonk) and never looks */
export const S6_WA = { from: cpt(1.55, -2.4), to: cpt(1.55, 2.8), atHonk: 0.45, gait: "phone" as const };
/** THE GAPER (the beret woman, no phone): walks in from the left beyond the circle, stops dead on "circles", gapes, claps */
export const S6_GAPE = { from: cpt(3.3, -3.4), at: cpt(2.35, -1.15) };
/** THE NEAR PHONE WALKER (the lime-phone varsity man): crosses the near foreground left -> right on "in the middle of
 *  campus" (2 m in front of the lens's ground point at ~"campus"), soft in the lens blur, the clown juggling behind his head */
export const S6_WB = { from: cpt(-3.0, -1.75), to: cpt(-3.0, 1.95), mid: () => BEAT.middle + 10, gait: "walk" as const };
/** the FAR clown seen behind the study corner (S7-S11): the hour goes on at an easy pace */
export const lapAng = (f: number) => 3.4 - 0.045 * (f - SH("S6").a);
export const T6 = () => ({ a: SH("S6").a, b: SH("S6").b, hour: BEAT.oneHour, rode: BEAT.theClownRode, circles: BEAT.circles, middle: BEAT.middle, campus: BEAT.campus, end: BEAT.hourEnd, honk: S6_HONK() });

// ================================================================== S7-S11: the study corner
// p3 (FIX2 D4): every speaker is seen from the FRONT on their own line. S7 = the INTERVIEWER'S LINE ("Did you see anything
// unusual?"), asked facing the lens from her mark in front of her table (IV7: north-east of the passer-by she has stopped,
// so a lens that looks north sees her face; friend B's shoulder is the near layer at the left edge). S8 = friend B's
// reaction and "The clown?" (over the interviewer's shoulder, as in p2). S9 = "He was amazing!" (the pair, the pedal mime).
export const IV7: V3 = [4.5, 0, 9.55];
/** friend B's mark in S7 (her back / shoulder at the lens' left edge) */
export const B7: V3 = [3.76, 0, 10.35];
export const T7 = () => { const s = SH("S7"), ws = TALKS.find((x) => x.line === "unusual")?.words ?? [], w = (re: RegExp, d: number) => ws.find((q) => re.test(q.w))?.f ?? d;
  return { a: s.a, b: s.b, did: BEAT.didYouSee, see: w(/^see/i, BEAT.didYouSee + 11), anything: w(/^any/i, BEAT.didYouSee + 16), unusual: BEAT.unusual, end: BEAT.unusualEnd,
    /** friend B has just been stopped: her last step lands here */ stop: s.a + 3 }; };
export const S7DIR = headTo(STUDY.walkIn.from, STUDY.walkIn.to);
/** (kept for the tools) friend B's S8 mark */
export const s7B = (_f: number): V3 => STUDY.walkIn.to;
export const A_OFF: V3 = [0.46, 0, -0.34];
export const s7A = (_f: number): V3 => add3(STUDY.walkIn.to, A_OFF);
/** S8: the reaction. `think` = the question's last word (she looks up), `laugh` = the short laugh that opens her line
 *  (~0.3 s before "The"), `clownQ` = "The clown?", `he` = "He was amazing!" (S9 starts on it) */
export const T8 = () => { const t9 = T9(); return { a: SH("S8").a, b: SH("S8").b, unusual: BEAT.unusual, end: BEAT.unusualEnd, laugh: t9.laugh, clownQ: t9.clownQ, clownW: t9.clownW, qEnd: t9.qEnd, he: t9.he }; };
/** S9: "The clown? He was amazing!" (the voice opens the line with a short laugh ~0.3 s before "The": `laugh`) */
export const T9 = () => {
  const ws = TALKS.find((x) => x.line === "amazing")?.words ?? [], he = ws.find((q) => /^he$/i.test(q.w.replace(/[^a-z]/gi, ""))), cw = ws.find((q) => /^clown/i.test(q.w));
  return { a: SH("S9").a, b: SH("S9").b, laugh: BEAT.theClownQ - 9, clownQ: BEAT.theClownQ, clownW: cw ? cw.f : BEAT.theClownQ + 8, qEnd: cw ? cw.fe : BEAT.theClownQ + 25,
    he: he ? he.f : BEAT.theClownQ + Math.round((BEAT.amazing - BEAT.theClownQ) * 0.7), amazing: BEAT.amazing, end: BEAT.amazingEnd };
};
export const T10 = () => ({ a: SH("S10").a, b: SH("S10").b, dude: BEAT.dude, guy: BEAT.unicycleGuy, end: BEAT.dudeEnd,
  /** "the unicycle": the word after "Dude, the" */ uni: (() => { const t = TALKS.find((x) => x.line === "dude"); const w = t?.words.find((q) => /unicycle/i.test(q.w)); return w ? w.f : BEAT.dude + 12; })() });
export const T11 = () => ({ a: SH("S11").a, b: SH("S11").b, sorry: BEAT.sorry, what: BEAT.whatClown, end: BEAT.whatClownEnd,
  /** p4: the word "clown?" (the shrug) */ cw: TALKS.find((x) => x.line === "whatClown")?.words.find((q) => /^clown/i.test(q.w))?.f ?? BEAT.whatClown + 12 });
/** S11: the clown rides by BEHIND the phone guy right -> left, slowing to wave in the gap right of the guy's head on
 *  "what clown?" (u 0.36 -> 0.56 of STUDY.clownBy while he waves), then on behind him */
export const s11U = (f: number) => { const t = T11(); return mono([[t.a - 8, 0], [t.what - 9, 0.3], [t.end + 4, 0.53], [t.b + 8, 0.9]], f); };   /* he idles in the gap (x ~600-780) from "what" until his HONK at end + 2, then rides on behind the guy */
export const s11Clown = (f: number) => { const u = s11U(f), L = flat(STUDY.clownBy.from, STUDY.clownBy.to);
  return { p: lerp3(STUDY.clownBy.from, STUDY.clownBy.to, u), heading: headTo(STUDY.clownBy.from, STUDY.clownBy.to), metres: u * L, v: (s11U(f + 0.5) - s11U(f - 0.5)) * L * 30 }; };
/** the team's second member minds the table (writes, looks up) in S7-S11 */
export const TEAM_B: V3 = [5.05, 0, 8.22];

// ================================================================== the talk: who says which line (beats.ts TALKS)
/** the words of a character line (by the script line name: robust to the voice's speaker labels) */
export const lineWords = (line: string) => TALKS.find((t) => t.line === line)?.words ?? [];

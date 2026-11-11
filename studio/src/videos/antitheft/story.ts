// Timeline of "The Anti-Theft Sign That Made People Steal": shots, light states, cameras, lens blur and impact kicks,
// all keyed to the voice words (words.ts, generated from sound/antitheft/voice/words.json). Grammar from
// study/CHANNEL_STYLE_BIBLE.md section 13: every shot change is a 7 f cross-dissolve centred 3 f after the first word
// of the new clause; no hard cuts; every hold creeps (pushK 0.002-0.004/f); reframes are symmetric smootherstep
// glides of 20-45 f centred on their word; 1-3 snap pushes; a dissolve's incoming camera is already moving.
import { W, WE, wi, WORDS, PW, PWE } from "./words";
import { TH, TT, VISTA, CL, SR, BP, EYE, add, V3, LightName, SetName } from "./plan";
import { blendLight, LightState } from "./lights";

export const FPS = 30;
export type { V3 };
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 3;

// ---------------- key frames from the words ----------------
// PW(i, word) = start frame of `word` in phrase i (voice_build.py P index; phrases 4, 19 were cut, 24 is the short
// analogy "Like a teacher saying, ..."). Shot boundaries sit 3 f after the first word of the new clause, so the 7 f
// dissolve starts on that word.
const B = (i: number, w?: string) => PW(i, w) + 3;
const END = WORDS[WORDS.length - 1].fe;                     // last word ends
export const TAIL = 20;                                     // silent loop button after the last word (<= 15 f)
export const TOTAL = END + 2 + TAIL;
/** frames the story beats react on (cast.ts / sets_*.ts / sound read these; react 0-3 f before the word) */
export const BEAT = {
  paperclip: PW(0, "paperclip"), sign1: PW(1, "sign"), wanted: PW(2, "wanted"), steal1: PW(2, "steal"),
  arizona: PW(3), visitors: PW(5), pocketing: PW(5, "pocketing"), warning: PW(6, "warning"),
  your: PW(7), vandalized: PW(7, "vandalized"), tons14: PW(8, "14"), piece: PW(8, "piece"), timeEnd: PWE(8, "time"),
  sheRead: PW(9), leaned: PW(9, "leaned"), whispered: PW(9, "whispered"), whisper: PW(10), now: PW(10, "now"), nowEnd: PWE(10, "now"),
  but: PW(11), honest: PW(11, "honest"), steal2: PW(11, "steal"),
  professor: PW(12, "professor"), cialdini: PW(12, "Cialdini"), testedIt: PW(12, "tested"),
  team: PW(13), marked: PW(13, "marked"), trails: PW(13, "trails"), swapping: PW(13, "swapping"), signs: PW(13, "signs"),
  oneSaid: PW(14), please1: PW(14, "Please"), another: PW(15), many1: PW(15, "Many"),
  withA: PW(16), pleaseA: PW(16, "please"), pct2: PW(16, "2%"), vanished: PW(16, "vanished"), withB: PW(17), many2: PW(17, "many"), pct8: PW(18, "8%"),
  youSee: PW(20), copyRules: PW(20, "rules"), copyEach: PW(21), eachOther: PW(21, "each"),
  manySteal: PW(22), warning2: PW(22, "warning"), sounds: PW(23), everyone: PW(23, "everyone"),
  teacher: PW(24, "teacher"), half: PW(24, "Half"), cheated: PW(24, "cheated"), otherHalf: PW(25), hears: PW(25, "hears"), everybody: PW(25, "everybody"),
  signDidnt: PW(26), thieves: PW(26, "thieves"), gave: PW(27), permission: PW(27, "permission"),
  and: PW(28), bait: PW(28, "bait"), came: PW(29), conscience: PW(29, "conscience"), pieces: PW(30), mailed: PW(30, "mailed"), apology: PW(30, "apology"),
  soSome: PW(31), stolen: PW(31, "stolen"), twice: PW(31, "twice"), end: END,
};

// ---------------- shots ----------------
export type Relight = { f: number; to: LightName; dur: number };
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: LightName; relight?: Relight[]; sunAz?: number; sunEl?: number };
const bound = [
  0,
  B(3),       // 2 vista crane            "Arizona's Petrified Forest."
  B(5),       // 3 the pocketing tourist  "Visitors kept pocketing little pieces."
  B(6),       // 4 the warning sign       "So the park put up a warning: ... a small piece at a time."
  B(9),       // 5 the whisper two-shot   "She read it, leaned over ... We'd better get ours now."
  B(11),      // 6 mystery push + relight "But why would a warning ..."
  B(12),      // 7 the professor          "Her fiancé's professor ..."
  B(13),      // 8 the team + chips       "His team hid marked wood ..."
  B(14),      // 9 the two signs          "One said ... Another said ..."
  B(16),      // 10 results (noon)        "With please don't ... almost 8%."
  B(20),      // 11 pivot: blueprint      "You see, ..."
  B(24),      // 12 analogy: classroom    "Like a teacher saying ..."
  B(26),      // 13 permission: sunset    "The sign didn't stop thieves. It gave them permission."
  B(28),      // 14 twist: storeroom      "And the bait wood? ..."
  B(31),      // 15 dusk: tagged chip     "So some of it got stolen twice."
  END + 8,    // 16 loop button: back to frame 0 (A4 CAM P1 #14: shot 15 holds the '2' 6 f longer)
  TOTAL,
];
const set: SetName[] = ["trailhead", "vista", "vista", "trailhead", "trailhead", "trailhead", "trails", "trails", "trails", "trails",
  "blueprint", "classroom", "trails", "storeroom", "trailhead", "trailhead"];
const light: LightName[] = ["noon", "noon", "noon", "noon", "noon", "noon", "morning", "morning", "morning", "noon",
  "blueprint", "classroom", "sunset", "night_int", "dusk", "noon"];
export const SHOTS: ShotDef[] = set.map((s, i) => ({ id: i + 1, a: bound[i], b: bound[i + 1], set: s, light: light[i] }));
SHOTS[3].relight = [{ f: BEAT.vandalized - 2, to: "dim", dur: 10 }, { f: BEAT.timeEnd, to: "noon", dur: 18 }]; // dims on "vandalized", lifts as the cloud shadow clears   // the sign: light dims ~20 % on "vandalized"
SHOTS[5].relight = [{ f: BEAT.but + 6, to: "late", dur: 60 }];           // mystery: noon -> late afternoon in-shot
SHOTS[12].sunAz = 0; SHOTS[12].sunEl = 6;                               // permission: backlit sunset, sun behind Sign B
// one world sun per place (CAM A3, out/antitheft/cam/sun.mjs): morning trails 7-8 share shot 9's heading (the 8 -> 9 match
// dissolve no longer jumps); every trailhead-noon shot uses frame 0's sun, so the loop frame 1857 lights like frame 0
SHOTS[6].sunAz = 22.1; SHOTS[7].sunAz = 36.1;
SHOTS[3].sunAz = 75.7; SHOTS[4].sunAz = 61.2; SHOTS[5].sunAz = 77.0; SHOTS[15].sunAz = 78.9;

/** cross-dissolve length (frames) into each shot; 9 f for the time jumps */
export const XFADE: Record<number, number> = Object.fromEntries(SHOTS.slice(1).map((s) => [s.id, 7]));
XFADE[10] = 9; // morning -> noon on the same two signs (match dissolve, time passes)
XFADE[16] = 9; // dusk -> noon loop
XFADE[11] = 5; // A4: the voice warp stretches this one (~11 video f at 7): 5 picture f = ~7 video f on "You see,"

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at frame f: base shot, plus the next shot fading in during its dissolve */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - Math.floor(x / 2) && f < s.a - Math.floor(x / 2) + x)
      return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - Math.floor(x / 2)) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

/** the relight blend of shot `id` at frame f: light a -> b at k (0..1); lightAt and AntiTheft.tsx both use it */
export const lightMixAt = (id: number, f: number): { a: LightName; b: LightName; k: number } => {
  const s = SHOTS[id - 1];
  let a: LightName = s.light, b: LightName = s.light, k = 0;
  for (const r of s.relight ?? []) {
    if (f < r.f) break;
    const kk = smooth((f - r.f) / r.dur);
    b = r.to; k = kk;
    if (kk >= 1) { a = r.to; k = 0; }
  }
  return { a, b, k };
};
/** the blended light state of shot `id` at frame f (relights are smootherstep over dur) */
export const lightAt = (id: number, f: number): LightState => {
  const s = SHOTS[id - 1];
  let cur: LightName = s.light, st = blendLight(cur, cur, 0);
  for (const r of s.relight ?? []) {
    if (f < r.f) break;
    const k = smooth((f - r.f) / r.dur);
    st = blendLight(cur, r.to, k);
    if (k >= 1) cur = r.to;
  }
  return st;
};

// ---------------- camera ----------------
// Round 2-3 (CAM owner): every key word gets its framing on screen; holds creep; reframes are smootherstep bells of
// 20-45 f centred on their word; the hook dives past her shoulder into the glinting rock (ease-in, dissolve at top
// speed) and the vista opens on a log's rainbow cut face (match) and cranes up over it; 1-3 snap pushes (8%,
// permission, twice); shot 16 is the exact backward extension of frame 0's creep (same velocity across the seam).
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; ease?: (u: number) => number; s: (f: number) => Shot };
/** reference camera ease: symmetric smootherstep */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), (k.ease ?? glide)((f - k.f) / (k.dur ?? 30)));
  }
  return cur;
};
/** push-in factor since f0: the subject grows ~rate per frame (0.002-0.004 = 0.2-0.4 %/f); negative rate = slow pull */
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
/** the same steady push, also running BEFORE f0 (k > 1 there): passes k = 1 exactly at f0 (loop seam) */
const pushL = (f: number, f0: number, rate: number) => Math.exp(-rate * (f - f0));
/** dolly push: camera slides toward the look point by factor k */
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const T = (b: V3, d: V3): V3 => add(b, d);
const tt = (d: V3) => T(TT.base, d), cl = (d: V3) => T(CL.base, d), sr = (d: V3) => T(SR.base, d), bp = (d: V3) => T(BP.base, d);
const norm3 = (a: V3): V3 => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** a framing + its creep: hold(pos, look, fov, f0, rate) is a Key body */
const hold = (pos: V3, look: V3, fov: number, f0: number, rate = 0.003, roll = 0) => (f: number): Shot => dolly(pos, look, pushK(f, f0, rate), { fov, roll });

/** FRAME 0 = LAST FRAME (loop): centred medium shot of the honest woman under the big warning sign, text readable */
export const P0: Cam = { pos: [0.0, 0.7, 4.4], look: [0.0, 1.9, 0.4], fov: 51, roll: 0 }; // low hero angle: eyes y~1098 (caption on her chest), whole board + post caps in frame; A4: 0.05 up + 1 deg wider = the raven's head ~60 px under the frame top
const P0_RATE = 0.0045; // frame 0's creep (0.45 %/f: the camera is visibly moving from frame 0); shot 16 arrives on P0 with this exact push velocity
const p0 = (f: number, f0: number, r = P0_RATE): Shot => dolly(P0.pos, P0.look, pushK(f, f0, r), { fov: P0.fov });

const S = SHOTS;
/** camera-only word cues (local: BEAT is the LEAD's contract) */
const CUE = { psych: PW(12, "psychologist"), removed: PW(15, "removed") };
// ---------------- camera helpers (round A2) ----------------
/** a framing that also slides at a constant velocity d (m/f) from f0: the lateral drift on a hold */
const slide = (s: (f: number) => Shot, f0: number, d: V3) => (f: number): Shot => {
  const c = s(f), t = Math.max(0, f - f0);
  return { ...c, pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t], look: [c.look[0] + d[0] * t, c.look[1] + d[1] * t, c.look[2] + d[2] * t] };
};
/** A4: a bell that is 0 with ZERO velocity at both ends and 1 at the middle (16 t^2 (1-t)^2; the old sin(pi t) kept
 *  ~0.4 deg/f of roll at its end and stopped dead, a hitch) */
const bell = (t: number) => { const u = clamp01(t); return 16 * u * u * (1 - u) * (1 - u); };
/** a bank of a rad that rises and settles level over [f0, f0 + dur] (hand-guided lateral moves) */
const bank = (s: (f: number) => Shot, f0: number, dur: number, a: number) => (f: number): Shot => { const c = s(f); return { ...c, roll: (c.roll ?? 0) + a * bell((f - f0) / dur) }; };
/** unit view direction from a compass bearing (deg; 0 = -z, 90 = +x) and a pitch (deg; + = up) */
const dirB = (b: number, p: number): V3 => { const B = (b * Math.PI) / 180, P = (p * Math.PI) / 180; return [Math.sin(B) * Math.cos(P), Math.sin(P), -Math.cos(B) * Math.cos(P)]; };
const along = (p: V3, d: V3, L: number): V3 => [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L];
/** a crane arc: the camera rises by h at the middle of [f0, f0 + dur] and settles back (the look rises half as much) */
const lift = (s: (f: number) => Shot, f0: number, dur: number, h: number) => (f: number): Shot => {
  const c = s(f), k = h * bell((f - f0) / dur);
  return { ...c, pos: [c.pos[0], c.pos[1] + k, c.pos[2]], look: [c.look[0], c.look[1] + 0.5 * k, c.look[2]] };
};
/** A4: the look point that puts world point t at screen fractions (xs, ys) for a camera at pos (pitch solved too) */
const aimY = (pos: V3, t: V3, fov: number, xs: number, ys: number): V3 => {
  const dx = t[0] - pos[0], dz = t[2] - pos[2], dh = Math.hypot(dx, dz), el = Math.atan2(t[1] - pos[1], dh), tv = Math.tan((fov * Math.PI) / 360);
  const pitch = el - Math.atan((0.5 - ys) * 2 * tv), b = Math.atan2(dx, -dz), bb = b - Math.atan((xs - 0.5) * 2 * tv * 0.5625);
  return [pos[0] + dh * Math.sin(bb), pos[1] + dh * Math.tan(pitch), pos[2] - dh * Math.cos(bb)];
};
/** A4: a framing on a circle round target t (az / R / h as around()), t placed at screen (xs, ys) */
type Frame = { pos: V3; look: V3; fov: number };
const orb = (t: V3, az: number, R: number, h: number, fov: number, xs: number, ys: number): Frame => { const p = around(t, az, R, h); return { pos: p, look: aimY(p, t, fov, xs, ys), fov }; };
const holdF = (F: Frame, f0: number, rate = 0.003, roll = 0) => hold(F.pos, F.look, F.fov, f0, rate, roll);
/** A4: framing F EXACTLY at its landing frame fL, with a steady creep that also runs before fL (as a glide target the
 *  creep carries straight on where the glide lands: no stall, and the landing framing is the designed one) */
const holdL = (F: Frame, fL: number, rate = 0.003) => (f: number): Shot => dolly(F.pos, F.look, pushL(f, fL, rate), { fov: F.fov });
/** a camera on a circle round c: azimuth az (deg; 180 = in front, +z), radius R, height h */
const around = (c: V3, az: number, R: number, h: number): V3 => { const a = (az * Math.PI) / 180; return [c[0] + R * Math.sin(a), h, c[2] - R * Math.cos(a)]; };
/** the look point that puts world point t at screen x fraction xs (0..1) for a camera at pos (look height ly) */
const aim = (pos: V3, t: V3, fov: number, xs: number, ly: number): V3 => {
  const b = Math.atan2(t[0] - pos[0], -(t[2] - pos[2])), off = Math.atan((xs - 0.5) * 2 * Math.tan((fov * Math.PI) / 360) * 0.5625), bb = b - off;
  const d = Math.hypot(t[0] - pos[0], t[2] - pos[2]);
  return [pos[0] + d * Math.sin(bb), ly, pos[2] - d * Math.cos(bb)];
};
/** round A3: the plain smootherstep glide from framing a to framing b over [f0, f0 + dur] as ONE framing function, so
 *  lift() / bank() can ride on the whole move (as a cut key) instead of being faded in by the key blend */
const glideTo = (a: (f: number) => Shot, b: (f: number) => Shot, f0: number, dur: number) => (f: number): Shot => mix(full(a(f)), full(b(f)), glide((f - f0) / dur));
/** round A3: a glide from framing a to framing b over [f0, f0 + dur] whose lens travels a quadratic curve bent through
 *  waypoint w (so it can route round an actor instead of sweeping her across the lens); the look turns on its own
 *  smootherstep over the time window [lk0, lk1] (fractions of dur) so the pan can wait until she is out of frame.
 *  Use as a cut key at f0 (it evaluates a and b itself, so both ends stay continuous with their creeps). */
const via = (a: (f: number) => Shot, w: V3, b: (f: number) => Shot, f0: number, dur: number, lk0 = 0, lk1 = 1, fv0 = 0, fv1 = 1) => (f: number): Shot => {
  const t = clamp01((f - f0) / dur), u = glide(t), A = full(a(f)), Bf = full(b(f));
  if (t >= 1) return Bf;
  const p: V3 = [0, 1, 2].map((i) => (1 - u) * (1 - u) * A.pos[i] + 2 * u * (1 - u) * w[i] + u * u * Bf.pos[i]) as V3;
  const win = (x0: number, x1: number) => glide(clamp01((t - x0) / Math.max(1e-3, x1 - x0)));
  const k = win(lk0, lk1), kf = win(fv0, fv1);
  return { pos: p, look: lerp3(A.look, Bf.look, k), fov: A.fov + (Bf.fov - A.fov) * kf, roll: A.roll + (Bf.roll - A.roll) * u };
};

// ---- shot 1: P0 creep -> a banked orbit left -> "one sign...": a 2 deg tilt to the board with a 0.3 %/f push (all six
// lines + post caps on the word) -> the scheming MCU from her left (face upper-middle, the glint rock below the caption
// band and clear of her dress) -> the dive past her into the rock ----
const ROCK: V3 = [TH.glintRock[0], 0.13, TH.glintRock[2]];
// A4 (audit P1 "one framing for 5.8 s"): five framings on the words, each a symmetric bell, every hold creeping:
//   P0 (frame 0: her + the whole board) -> "She'd never even kept": a crane UP to just over her eye line + push to a
//   front MCU (board out of the top, the rock planted lower right; lands on "kept") -> "a borrowed paperclip.": a
//   reveal pull + arc left and DOWN to a low 3/4 (her face above the caption, the thought bubble and the board above
//   her, the raven on top) that drifts and creeps through "Then she read one sign..." -> "and wanted": a crane up +
//   push to the scheming MCU from her left (head ~46 % W, eyes y ~670, the rock + glint lower right, right of and
//   below the caption) -> "steal": a x1.2 snap in 4 f -> the dive into the rock, still accelerating through the
//   dissolve (the look turns over the whole dive, no settle)
const HER: V3 = [TH.woman[0], EYE, TH.woman[2]];
const K2_1 = orb(HER, 186, 2.6, 1.45, 45, 0.5, 0.375);   // head ~41 % W, eyes y ~720, only the board's bottom rail at the top
const K3_1 = orb(HER, 198, 3.15, 0.82, 52, 0.5, 0.585);  // chin y ~1275, bubble y 240-690, raven y ~150
const K3E_1 = orb(HER, 194, 2.85, 0.86, 52, 0.49, 0.575); // ... drifting right and in (0.3 %/f) once the bubble is out
const MCU1 = orb(HER, 190, 2.5, 1.62, 42, 0.42, 0.35);   // head ~46 % W, eyes y ~672, rock x ~930 y ~1410 (clear of the caption)
const K2_A = 2, K2_D = 28, K3_A = BEAT.paperclip - 6, K3_D = 26, K3E_A = K3_A + K3_D, K3E_D = 33;
const MCU1_A = BEAT.wanted - 17, MCU1_D = 26;            // 94 -> 120: lands just before the side-eye (121)
const mcu1 = holdL(MCU1, MCU1_A + MCU1_D, 0.003);                  // A4 P3: the creep runs under the glide (no 1 f stall where it lands)
const SNAP1 = BEAT.steal1 - 2, SNAP1_D = 4;              // a x1.2 snap onto the side-eye + the glinting rock (both stay in frame)
const MCU1_SNAP = (2 * Math.atan(Math.tan((MCU1.fov * Math.PI) / 360) / 1.2) * 180) / Math.PI;
const snap1 = holdL({ pos: MCU1.pos, look: lerp3(MCU1.look, ROCK, 0.16), fov: MCU1_SNAP }, MCU1_A + MCU1_D, 0.003); // the same creep as mcu1 (no pull-back inside the snap)
const DIVE0 = SNAP1 + SNAP1_D + 1, DIVE1 = S[1].a + 6;   // 127 -> 147: the 138-145 dissolve rides the fastest frames
/** A4: the dive as a zoom RATE that keeps rising (smootherstep to DIVE_R over DIVE_RAMP f, so it is still speeding up
 *  through the dissolve on the picture clock: the voice warp cannot turn its end into a settle); the distance to the
 *  rock falls as exp(-lnM) */
const DIVE_R = 0.17, DIVE_RAMP = 20;
const diveLn = (f: number) => {
  const t = Math.max(0, f - DIVE0), u = Math.min(1, t / DIVE_RAMP);
  return DIVE_R * (DIVE_RAMP * (u * u * u - 0.5 * u * u * u * u) + Math.max(0, t - DIVE_RAMP));
};
const dive1 = (f: number): Shot => {
  const c = full(snap1(f)), t = Math.max(0, f - DIVE0), s = Math.exp(-diveLn(f)), el = glide(t / (DIVE1 - DIVE0 - 2));
  return { pos: lerp3(ROCK, c.pos, s), look: lerp3(c.look, ROCK, el), fov: c.fov - 5 * (1 - s), roll: 0.05 * (1 - s) };
};
// ---- shot 2: match on the west cut face of the sliced log at [-22, 0, -30] (sets_ext EXTRA_LOGS, yaw -0.2, len 9; seen
// 30 deg south of its normal, so the old entrance-sign spot stays out of the lens), the dive's push carries on for a
// few frames, then one 50 f bell cranes up and back to the south-west: from there the whole vista lines up in one NE
// view (trail + rail, five sliced logs, ~10 walkers and photographers, the visitor centre + flag, ravens, badlands) ----
// V2F = that log's first slice, which sets_ext.logSlices() rolls off the line and stands on edge with its rainbow face
// turned to the NEAREST story lens (= V2S here): centre [-26.10, -29.59], r 0.61 (seed 300 + 12 * 17; its slice 1
// lies flat beside it). If WORLD-EXT changes the west log or that layout, re-derive this point.
const V2F: V3 = [-26.1, 0.6, -29.59];
const V2S: V3 = along([V2F[0], 0.62, V2F[2]], dirB(248, 0), 4.5);
const V2E: V3 = [-36, 5.2, -22];
const V2A = S[1].a - 4, V2B0 = S[1].a - 1, V2D = 50; // A3: the crane starts inside the dissolve (no dead frames on the slice)
const V2END = dirB(50, -7.5);
/** the crane's path: a bell whose last ~15 % turns into a steady drift (V2W of the mean speed) that runs on through the
 *  186-192 dissolve, so both cameras move across it */
const V2W = 0.4, v2path = (t: number) => (t < 1 ? (1 - V2W) * glide(t) + V2W * t : 1 + V2W * (t - 1));
const vista2 = (f: number): Shot => {
  const t = Math.max(0, (f - V2B0) / V2D), u = v2path(t);
  const pre = 0.9 * (1 - Math.exp(-Math.max(0, f - V2A) / 8)); // the dive's push carries on (~2.5 %/f) and dies out over ~10 f
  const d0 = norm3([V2F[0] - V2S[0], 0, V2F[2] - V2S[2]]);
  const h = V2S[1] + (V2E[1] - V2S[1]) * smooth(Math.min(1, t * 1.5)); // rises early: over the log top by "Petrified"
  const pos: V3 = [V2S[0] + d0[0] * pre + (V2E[0] - V2S[0]) * u, h, V2S[2] + d0[2] * pre + (V2E[2] - V2S[2]) * u];
  const w = glide(clamp01((f - V2B0 + 2) / (V2D - 6)));
  const dv = norm3(lerp3(norm3([V2F[0] - pos[0], V2F[1] - pos[1], V2F[2] - pos[2]]), V2END, w));
  return { pos, look: along(pos, dv, 14), fov: 40 + 18 * glide(Math.min(1, t)), roll: -0.035 * Math.sin(Math.PI * Math.min(1, u)) };
};
// ---- shot 5 (A4): a chest-height two-shot (lens 1.0 -> 1.13 m) from RIGHT of the pair, looking ~8 deg left and
// slightly UP, so the warning board sits WHOLE and centred above them (every routed line whole: the frame top rides the
// board's top edge / warning triangle, never a line of text) and the couple fills the middle (eyes ~0.46-0.51 H, feet
// ~0.77-0.9 H: <= 23 % ground), the mesas between their bodies. One continuous creep-in (~0.2 %/f + a 1.6 deg tilt up,
// no outward move), then a x1.08 dolly snap toward him on "now" (his eyes ~0.73 W; his head + recoil >= 56 px inside the
// right edge, her brim >= 59 px inside the left, the board still whole). The raven's post bracket is now behind his
// head: CHAR is asked to perch it on the board's bottom rail at TH-local [0.15, 2.45, 0.1] (in the gap between their
// heads; see lead_requests) ----
/** a framing from a position, a compass yaw (deg, 0 = -z, + = right) and a pitch (deg, + = up) */
const fr = (pos: V3, yaw: number, pitch: number, fov: number): Frame => ({ pos, look: along(pos, dirB(yaw, pitch), 4), fov });
const S5A = fr([1.0, 1.0, 7.0], -8, 1.4, 44);    // board x 167-913, brim 203 px in, recoil 124 px in
const S5E = fr([0.95, 1.1, 6.05], -8, 3.0, 45);  // (at "now" - 1) board 93-927, brim 98 px in, recoil 86 px in
const S5N = fr([0.92, 1.13, 5.75], -8, 2.5, 45); // the x1.08 snap: board 65-944, brim 59 px in, recoil 56 px in, his eyes ~0.73 W
const creep5 = (f: number): Shot => {
  const u = clamp01((f - (S[4].a - 4)) / (BEAT.now - 1 - (S[4].a - 4)));
  return { pos: lerp3(S5A.pos, S5E.pos, u), look: lerp3(S5A.look, S5E.look, u), fov: S5A.fov + (S5E.fov - S5A.fov) * u };
};
// ---- shot 6 (A4, audit P2 "the third straight-on look at this board in 27 s"): a NEW angle. It opens on a low 3/4 from
// behind-left (lens 0.95 m, 23 deg off the board's axis: the whole board + the raven upper left, both of them whole,
// the flip counter whole) and makes ONE slow arc right + push + crane up over her shoulder: it lands on "steal?" on an
// over-the-shoulder of the whole board (every line readable, "MOSTLY A SMALL PIECE / AT A TIME." just above the caption,
// her soft hat brim in the foreground under the caption; he has walked out of frame right). It creeps on into the
// dissolve (never locked; the 14 TONS counter stays whole, >= 79 px inside the left edge) ----
const S6A: Frame = { pos: [-1.4, 0.95, 6.6], look: [0.38, 1.95, 0.6], fov: 50 };
const S6E: Frame = { pos: [-0.3, 1.42, 4.85], look: [-0.1, 2.8, 0.06], fov: 48 };
const ARC6_A = S[5].a - 4, ARC6_D = BEAT.steal2 + 2 - ARC6_A; // 562 -> 635 (73 f), peak ~1.4 %/f; the look turns late (he stays in frame to ~610)
const arc6 = via(holdL(S6A, ARC6_A, 0.002), [-0.75, 1.15, 5.55], holdL(S6E, ARC6_A + ARC6_D, 0.003), ARC6_A, ARC6_D, 0.3, 1.0, 0, 1);
// ---- shot 7 (A4): ONE wide orbit round the professor that now starts FRONTAL (az 182: the tarp-covered Sign B + its
// LED, the LONG LOGS marker and CRYSTAL all behind him, he on the right third, side-lit by the low sun) and swings on
// to az 216 (the sun now behind his right shoulder: a golden rim) by "Cialdini" - 16, with a 3 deg bank that settles;
// a push to the 3/4 MCU on "Cialdini"; then the fly-through INTO the blank paper under the tallies: the rate ramps
// over 16 f from 5 f before "tested" (no jolt), the look re-aims over 14 f, x4 by the dissolve's start, so the
// 762-769 dissolve plays on white paper ----
const PROF: V3 = tt([1.8, 0, 2.4]);
const CLIP: V3 = [PROF[0] - 0.04, 0.85, PROF[2] + 0.05]; // A4: the blank paper under the SIGN TEST tallies (0.08 m below the A3 point)
const P7C = around(PROF, 236, 2.2, 1.3);
const ORB7_A = S[6].a - 4, ORB7_B = BEAT.cialdini - 19;
const orbit7 = (f: number): Shot => {
  const t = (f - ORB7_A) / (ORB7_B - ORB7_A), u = 0.82 * glide(t) + 0.18 * clamp01(t); // a bell with a drift underneath (moving at the dissolve)
  const az = 182 + 34 * u, R = 5.2 - 0.8 * u, h = 1.12 + 0.16 * u, fov = 56 - 2 * u;
  const pos = around(PROF, az, R, h), look = aim(pos, PROF, fov, 0.7 - 0.06 * u, 1.0 + 0.04 * u); // tilted down so the MARKED CHIPS label clears the caption
  return { ...dolly(pos, look, pushK(f, ORB7_A, 0.003), { fov }), roll: 0.05 * bell(t) * (1 - 0.4 * u) };
};
const mcu7 = hold(P7C, aim(P7C, PROF, 40, 0.56, 1.08), 40, BEAT.cialdini + 14, 0.003); // tilted down: the clipboard tallies clear the caption
const FLY7 = BEAT.testedIt - 5, FLY7_R = 0.23, FLY7_RAMP = 16;
const fly7 = (f: number): Shot => {
  const c = mcu7(f), t = Math.max(0, f - FLY7), r = Math.min(1, t / FLY7_RAMP);
  const lnM = FLY7_R * (FLY7_RAMP * (r * r * r - 0.5 * r * r * r * r) + Math.max(0, t - FLY7_RAMP)); // log magnification
  const kd = Math.exp(-0.62 * lnM), kt = Math.exp(-0.38 * lnM);
  return { pos: lerp3(CLIP, c.pos, kd), look: lerp3(c.look, CLIP, glide(t / 14)), fov: (2 * Math.atan(Math.tan((40 * Math.PI) / 360) * kt) * 180) / Math.PI, roll: 0 };
};
// ---- shot 8: the team. Part 1: a long-lens MS of asst1 THROUGH the gap between Sign B and the CRYSTAL marker (the gap
// camera stands in front of the sign line, nothing within 1.5 m of the lens): the marked chip + white dot on "marked",
// the stopwatch click held; it ends in a whip pan left. Part 2 (a hidden cut inside the motion-blurred whip, the pan
// direction and speed continue): the whip settles on the 3/4 trail-heads wide from the left (JASPER, LONG LOGS and
// CRYSTAL boards all whole for "the trails", Sign A + asst3 near), then a slow push onto Sign A for "swapping"; the
// last frame = shot 9's first frame (match dissolve) ----
const GAP8: V3 = tt([0.85, 1.0, 1.55]), GAP8L: V3 = tt([1.05, 0.45, -3.4]); // A4: yawed ~7 deg right + 42 deg: asst1 at ~0.41 W, the chip hand ~0.55 W, asst2 + the stopwatch ~0.65 W
const WHIP8 = BEAT.marked + 17, CUT8 = WHIP8 + 7; // 799 -> 806: after the stopwatch click (792) is held
/** turn the view about the camera (a pan), deg + = to the right */
const yawAbout = (c: Shot, deg: number): Shot => {
  const a = (deg * Math.PI) / 180, d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  return { ...c, look: [c.pos[0] + d[0] * Math.cos(a) - d[2] * Math.sin(a), c.look[1], c.pos[2] + d[0] * Math.sin(a) + d[2] * Math.cos(a)] };
};
const gap8 = (f: number): Shot => {
  const pre = 0.45 * (1 - Math.exp(-Math.max(0, f - (S[7].a - 4)) / 18)); // the fly-through's push carries on and dies out (A4: a 25-40 f decay)
  const d = norm3([GAP8L[0] - GAP8[0], GAP8L[1] - GAP8[1], GAP8L[2] - GAP8[2]]), w = clamp01((f - WHIP8) / (CUT8 - WHIP8));
  return yawAbout(dolly(along(GAP8, d, pre), GAP8L, pushK(f, S[7].a + 6, 0.003), { fov: 42 + 10 * w * w }), -14 * w * w);
};
// A3: the wide creeps 0.3 %/f from the settle; then one bell push (PUSH8, 30 f) toward Sign A + the swapping
// assistant from the same 3/4-left side (he grows ~1.7x, peak ~2.5 %/f): JASPER and LONG LOGS stay whole at the edges,
// CRYSTAL leaves after "the trails"; the push's end framing (M8) is also shot 9's first frame (match dissolve)
const W8 = { pos: tt([-9, 2.3, 5.2]), look: tt([-2.1, 1.05, 0.3]), fov: 50 }; // A4: 2 deg tighter (JASPER whole on the left; CRYSTAL needs WORLD-EXT to come ~2 m nearer to read, see lead_requests)
const M8 = { pos: tt([-4.6, 1.58, 4.65]), look: tt([-2.9, 1.45, 0.15]), fov: 48 }; // A4: most of the way to the Sign A two-shot (shot 9 then only drifts ~1.9 m: no whip on "Please")
const PUSH8 = BEAT.swapping - 12, PUSH8D = 40, W8_SETTLE = 6;
const wide8 = (f: number): Shot => { const k = clamp01((f - CUT8) / W8_SETTLE); return yawAbout(hold(W8.pos, W8.look, W8.fov, CUT8 + W8_SETTLE, 0.003)(f), 20 * (1 - k) * (1 - k)); };
const swap8 = slide(hold(M8.pos, M8.look, M8.fov, PUSH8 + PUSH8D, -0.002), PUSH8 + PUSH8D, [0.0005, 0.006, 0]); // a slow pedestal up + pull: JASPER / LONG LOGS stay whole into the match dissolve
const S9A = { pos: tt([-2.7, 1.5, 4.75]), look: tt([-2.85, 1.5, 0]), fov: 50 }; // Sign A left-centre, its reader on the right third (100 px margin)
const S9A_L = S[8].a + 32, S9A_H = slide(hold(S9A.pos, S9A.look, S9A.fov, S9A_L, 0.003), S9A_L, [0.006, 0, 0]);
/** A3: the truck to Sign B starts 14 f later (Sign A's quote reads to its end) and lands on "Many" - 2, his head 50+ px
 *  inside the right edge */
const S9B_A = BEAT.another - 16, S9B_D = 32, S9B = { pos: tt([0.2, 1.45, 4.5]), look: tt([0.33, 1.34, 0]) }; // A4: Sign B 172 px clear of the left edge, the LONG LOGS plate above the caption, reader B's arm 70 px inside
// ---- shot 9 -> 10 match: the same 3/4 two-sign frame closes shot 9 and opens shot 10 (only light and people change) ----
const TWO: Shot = { pos: tt([-1.25, 1.1, 8.6]), look: tt([-1.2, 1.65, 0.3]), fov: 58.5 }; // A4: lens 1.75 -> 1.1 m, tilted up: both panels ~185 px (the most two signs 3.2 m apart can get in 9:16), reader B whole // the A | B diptych: both panels + LEDs whole, JASPER + CRYSTAL out; A3: tilted up (less bare ground) and reader B WHOLE on the right edge (no sliver)
const TWO_F0 = CUE.removed + 45; // A4: the pull lands here (1046): its creep runs on through the 9 -> 10 match
const two = (f: number): Shot => dolly(TWO.pos, TWO.look, pushL(f, TWO_F0, 0.003), { fov: TWO.fov });
// ---- shot 10 (A3): the Sign B crowd from lower and closer; on "8%" a 6 f front-loaded punch into the LED counter (it
// fills ~half the frame width, the crowd's happy heads soft at the bottom), held 10 f with the cha-ching kick, then the
// banked glide out to the two-sign comparison ----
// A4: the Sign B MS (panel ~46 % W, LED digit box ~140 px, two grinning flankers' faces whole beside the pictogram,
// never over it; the 0 -> 7.92 % roll reads here) and the punch (the LED in the upper third, the sign's text block above
// the caption, the flankers' faces OUT of frame rather than cut at the corners)
const S10B2: Frame = { pos: tt([0.1, 1.7, 3.9]), look: tt([0.06, 1.75, 0]), fov: 54 }; // A4 render check: 4 deg wider (the flankers frame the panel at the edges; they leave the frame on the punch)
const S10L2: Frame = { pos: tt([0.07, 2.02, 2.75]), look: tt([0.02, 1.86, 0]), fov: 46 }; // A4 render check: tilted ~4 deg down: "FROM THE PARK." (~1.52 m) above the caption, the LED in the upper third
const LEDB: V3 = tt([TT.signB.dx, TT.signB.cy + TT.led.dy, TT.signB.z]);

/** the punch's ease: front-loaded but not a 1-frame jump (~30 % of the move on its first frame) */
const punch = (u: number) => 1 - (1 - clamp01(u)) ** 2.2;
// ---- shot 11 (A3): open low and close on the visitor at the fork (face high, never under the caption); hold still-ish
// while he walks off toward the crowd (the lens does not track him); push to the floating sign landing above him
// from his LEFT (so THE RULE label sits left of the panel once BP.signFloat moves right, see lead_requests); a x1.15
// snap on "steal"; a drift; the banked reveal pull-out on "everyone" ----
const STEAL11 = PW(22, "steal");
const B11O = { pos: bp([0.3, 3.0, 6.2]), look: bp([0.1, -0.3, -1.0]) };
const B11W = { pos: bp([0.45, 2.85, 6.45]), look: bp([0.3, -0.15, -1.2]) };
const B11S = { pos: bp([-0.6, 2.8, 7.0]), look: bp([0.4, 1.35, -1.5]) };
const B11V = { pos: bp([-0.35, 2.75, 6.85]), look: bp([0.45, 1.38, -1.5]) };
// ---- shot 11 (A4): the opening creeps, cranes down 0.35 m and trucks right (the pivot is never locked); the panel lands
// on a WIDER frame that keeps THE RULE, EVERYONE ELSE and the FIG. 1 title whole (audit P1: they were cut for 5 s); then
// one 65 f orbit right + crane up round the panel (no snap: a push would cut the labels) into the reveal pull-out ----
const B11S2: Frame = { pos: bp([0.1, 2.9, 8.3]), look: bp([0.45, 1.5, -1.5]), fov: 56 };  // labels x 90 / 967, title x 86-602, his face x ~770 y ~1090
const B11D: Frame = { pos: bp([0.95, 3.15, 7.5]), look: bp([0.5, 1.5, -1.5]), fov: 56 }; // an orbit right + crane up round the panel: the far FIG. 1 title slides (parallax) while the labels stay (x 77 / 1008), his face x ~730
const open11 = glideTo(hold(bp([0.15, 3.35, 6.45]), B11O.look, 52, S[10].a - 4, 0.003), hold(B11O.pos, B11O.look, 52, S[10].a - 4, 0.003), S[10].a - 4, 40);
const drift11 = glideTo(holdL(B11S2, BEAT.manySteal + 22, 0.003), holdL(B11D, BEAT.everyone - 6, 0.003), BEAT.manySteal + 22, BEAT.everyone - BEAT.manySteal - 22);
// ---- shot 13 (A3): the final framing is centred on Sign B (the panel ~43 % of the width, the PERMISSION GRANTED mark
// whole, the two flanking thieves' faces whole above the caption once CHAR stands them beside the posts) ----
const S13F = { pos: tt([0.0, 1.3, 3.6]), look: tt([0.0, 1.45, 0]), fov: 63 }; // A4: 7 deg wider: both flankers' heads + the red cap's brim inside the edges, the mark at ~0.47 H
const S13_PRE = (2 * Math.atan(1.15 * Math.tan((S13F.fov * Math.PI) / 360)) * 180) / Math.PI; // the same lens 1.15x wider: the snap is a x1.15 punch
// A4 (audit P1 wobble): from the low backlit start straight in to the pre-snap framing (S13F at the 1.15x wider lens) in
// one 61 f smootherstep, the panel centred (x 540 +- 10) and the sun disc centred behind it the whole way
const S13A: Frame = { pos: tt([0.1, 0.95, 4.9]), look: tt([0.0, 1.47, 0]), fov: 66 };
const push13 = glideTo(hold(S13A.pos, S13A.look, S13A.fov, S[12].a - 4, 0.002), holdL({ pos: S13F.pos, look: S13F.look, fov: S13_PRE }, BEAT.permission - 3, 0.002), S[12].a - 4, BEAT.permission - 3 - (S[12].a - 4));
// ---- shot 14 (A3) ----
const S14I = { pos: sr([SR.bucket[0] + 1.6, 0.85, SR.bucket[2] + 1.3]), look: sr([SR.bucket[0] + 0.05, 0.46, SR.bucket[2]]) };
const S14P = { pos: sr([1.0, 0.95, 1.3]), look: sr([0.45, 0.9, -1.0]) };
const S14M = { pos: sr([1.1, 1.15, 1.6]), slot: sr([-0.18, 1.45, -2.6]), pile: sr([0.15, 0.95, -1.13]) };
const S14A = { pos: sr([0.6, 1.2, 2.55]), look: sr([0.7, 1.38, -1.15]) };
const S14E: Frame = { pos: sr([0.6, 1.35, 1.85]), look: sr([0.9, 1.0, -1.1]), fov: 54 }; // A4: the end MS: his head ~30 % W at ~0.7 W, head top ~0.25 H, the SORRY letter by his face above the caption, BAIT label in the lower third
// ---- shots 15-16 (A3): the dusk MCU on the tag, a x1.12 snap on "twice", then a short glide onto frame 0's own creep
// path, which shot 16 continues to the last frame (= P0 exactly) ----
const S15M = { pos: [0.15, 0.75, 3.85] as V3, look: [-0.03, 1.1, TH.tourist[2]] as V3 }; // A4: a LOW MCU tilted 0.14 m down: his eyes y ~740, the tag (~0.99 m) at y ~1095, clear above the caption
/** A4: shot 15 opens on a low 3/4 (2.7 m, right of him) and makes one push onto S15M; the snap is centred on the tag */
const S15A: Frame = { pos: [0.45, 0.82, 4.55], look: [-0.06, 1.1, TH.tourist[2]], fov: 46 };
const TAG15: V3 = [TH.tourist[0] + 0.13, 0.99, TH.tourist[2] + 0.06]; // where CHAR's tag hangs at "twice" (measured)
const S15_FOV = 48, S15_SNAP = (2 * Math.atan(Math.tan((S15_FOV * Math.PI) / 360) / 1.12) * 180) / Math.PI;
const S15S: Frame = { pos: S15M.pos, look: lerp3(S15M.look, TAG15, 0.6), fov: S15_SNAP }; // the tag near the centre, his face high (hat whole)
/** frame 0's creep run backwards from the loop frame: lands on P0 exactly at TOTAL - 1 with frame 0's velocity */
const loop16 = (f: number): Shot => dolly(P0.pos, P0.look, pushL(f, TOTAL - 1, P0_RATE), { fov: P0.fov });
const S16_IN = S[15].a - Math.floor(XFADE[16] / 2) + 2; // the glide is on the loop path by the dissolve's 3rd frame (shot 16 is at <= 30 % there)
const push15 = glideTo(hold(S15A.pos, S15A.look, S15A.fov, S[14].a - 4, 0.002), holdL({ pos: S15M.pos, look: S15M.look, fov: S15_FOV }, BEAT.twice - 3, 0.002), S[14].a - 4, BEAT.twice - 3 - (S[14].a - 4));
// ---- shot 12: from behind the back row (4-5 pupils' backs in the lower third, the nearest >= 1.2 m from the lens),
// the teacher left of the chalk text; then one 70 f crane-swing up the window side to a front-3/4 of the honest
// student, the look gliding from the board to her face and her thought bubble ----
const STU: V3 = cl([CL.student[0], 1.02, CL.student[2] + 0.36]);
const OTS12 = { pos: cl([-3.1, 2.65, 2.85]), look: cl([-0.95, 1.32, -3.45]), fov: 44 }; // high at the back-left: the nearest pupil sits low-left under the caption
// A4: the over-the-shoulder now creeps 0.25 %/f AND trucks right from its first frame while the words appear (it read
// as locked for ~50 f); the finished "HALF THIS CLASS CHEATED." holds ~16 f; then a WHIP with a hidden cut (as in shot
// 8): part 1 pans right off the board (+20 deg in 10 f, ramping); part 2 enters already panning from the seated pupils
// behind her (-36 deg yaw decaying over 18 f; ~15 %W/f at the cut) and lands on the honest student before "everybody"
const WH12A = BEAT.cheated + 14, CUT12 = WH12A + 10, LAND12 = CUT12 + 18; // 1464 -> 1474 -> 1492 ("everybody" 1494)
const ots12 = slide(hold(OTS12.pos, OTS12.look, OTS12.fov, S[11].a - 4, 0.0025), S[11].a - 4, [0.004, 0, -0.002]);
const END12 = { pos: cl([-3.0, 1.5, -1.85]), look: [STU[0], STU[1] + 0.06, STU[2]] as V3, fov: 40 };
const CHEATS12 = PW(25, "cheats");
const whip12a = (f: number): Shot => { const w = clamp01((f - WH12A) / (CUT12 - WH12A)); return yawAbout({ ...ots12(f), fov: OTS12.fov + 6 * w * w }, 20 * w * w); };
const end12 = (f: number): Shot => dolly(END12.pos, END12.look, pushL(f, LAND12, 0.0015), { fov: END12.fov });
const whip12b = (f: number): Shot => { const k = clamp01((f - CUT12) / (LAND12 - CUT12)); return yawAbout({ ...end12(f), fov: END12.fov + 5 * (1 - k) * (1 - k) }, -36 * (1 - k) * (1 - k)); };

// ---- shot 4 (A3): the wide -> the text two-shot (lands by 292) -> a long-lens insert on the split-flap counter from
// her left, her soft hat brim on the right edge (a short glide: she slides right, never across the lens) -> the "14"
// reaction from a closer, wider lens (the whole board in frame, so no line is cut mid-word) -> crane back right of him
// (the 'piece' chip left of her feet below the caption) ----
const S4W = hold([0.5, 1.5, 8.6], [0, 1.95, 0], 50, S[3].a - 4, 0.003);
const S4V = hold([-0.3, 1.62, 5.75], [0.22, 1.62, TH.board.z], 52, BEAT.your + 8, 0.0025);
const S4C_A = BEAT.vandalized - 2, S4C_D = 38;
const S4C = hold([-1.39, 1.52, 3.59], [TH.flip.x + 0.04, TH.flip.y - 0.08, TH.flip.z], 32, S4C_A + S4C_D, 0.003, -0.015); // A4: 15 % closer + tilted down: the counter ~55 % W at ~0.45 H (she is out of frame)
const S4R_A = BEAT.tons14 + 1, S4R_D = 30;
const S4R = hold([-0.3, 1.4, 4.9], [0.15, 1.5, 1.9], 60, S4R_A + S4R_D, 0.003);
const S4B = hold([1.3, 1.7, 8.2], [0.42, 1.92, TH.board.z], 50, BEAT.piece + 18, 0.003); // A4: 0.3 m right (the red-cap pocketing gag clears her hat), 0.25 m lower + ~3 deg up (the 'piece' chip rises out of the bottom UI zone)

const CAMS: Record<number, Key[]> = {
  // 1 HOOK: frame 0 = P0 creep (0.45 %/f); a banked orbit left on "kept a borrowed"; "one sign...": the whole board,
  //   pushing; the scheming MCU (face upper-middle, rock below the caption); the dive into the glinting rock on "steal"
  //   (A3: the orbit / board creeps cut to 0.2 / 0.15 %/f on a 54 deg lens, so her chin never sinks into the caption)
  1: [
    { f: 0, s: (f) => p0(f, 0) },
    { f: K2_A, dur: K2_D, s: holdL(K2_1, K2_A + K2_D, 0.003) },                 // crane up + push to the front MCU ("kept")
    { f: K3_A, dur: K3_D, s: holdL(K3_1, K3_A + K3_D, 0.0025) },                // reveal pull + arc left, down: the bubble pops mid-move
    { f: K3E_A, dur: K3E_D, s: holdL(K3E_1, K3E_A + K3E_D, 0.003) },             // drift right + in through "Then she read one sign..."
    { f: MCU1_A, dur: MCU1_D, s: mcu1 },                                  // "and wanted": crane up + push to the scheming MCU
    { f: SNAP1, dur: SNAP1_D, ease: easeOut, s: snap1 },                  // "steal": x1.2 in 4 f
    { f: DIVE0, cut: true, s: dive1 },                                    // the dive into the glinting rock
  ],
  // 2 VISTA: cut face (match) -> crane up and back to the south-west over the whole painted-badlands park
  2: [{ f: V2A, s: vista2 }],
  // 3 POCKETING: a 22 f bell (settled before "pocketing") to a wider, lower MS: the tourist on the left third, nearer the
  //   lens than the plaque (so his chip hand is never hidden behind it), hips above the caption, the plaque whole
  3: [
    { f: S[2].a - 4, s: hold(T(VISTA.pocketTourist, [-1.4, 1.13, 4.25]), T(VISTA.pocketTourist, [0.3, 0.82, -0.1]), 48, S[2].a - 4, 0.0035) }, // A4: wider, on the SAME line as the MS (no 1.85 m sideways cross)
    { f: S[2].a - 4, dur: 36, ease: (u) => 1 - (1 - clamp01(u)) ** 2, s: slide(hold(T(VISTA.pocketTourist, [-0.95, 1.0, 3.05]), T(VISTA.pocketTourist, [0.25, 0.78, 0.0]), 46, S[2].a + 19, 0.003), S[2].a + 19, [0.004, 0, 0]) }, // A4: a 36 f ease-out push from the dissolve's first frame (bible 3.2: decay 25-55 f) into the creep
  ],
  // 4 THE SIGN (A3): low wide -> the text two-shot (both heads + his shoulder whole) -> a long-lens counter insert from
  //   her left (she slides out right at <= 8 %w/f, no smear across the lens) -> the "14" reaction, the WHOLE board in
  //   frame (no line cut mid-word) -> crane back right of him (the 'piece' chip left of her feet, below the caption)
  4: [
    { f: S[3].a - 4, s: S4W },
    { f: BEAT.your - 14, dur: 22, s: S4V }, // A3: lands by 292 (caps ~40 px while "Your heritage" is read); both heads + his shoulder whole
    { f: S4C_A, cut: true, s: via(S4V, [-1.6, 1.6, 5.2], S4C, S4C_A, S4C_D, 0.12, 0.9, 0.3, 1.0) }, // A4: arcs LEFT of her first (she slides out right on the wide lens), then turns + zooms onto the counter (never through her)
    { f: S4R_A, dur: S4R_D, s: S4R }, // the "14" reaction (she slides back in from the right, <= 8 %w/f)
    { f: BEAT.piece - 18, dur: 36, s: S4B },
  ],
  // 5 WHISPER: chest-height two-shot from her left (the right post in the gap between their heads, the counter out of
  //   frame, the raven's bracket in frame), a drift as she leans, a x1.12 push on the whisper, a x1.1 snap onto him on
  //   "now" and a 20 f settle
  5: [
    { f: S[4].a - 4, s: creep5 },                                          // ONE creep-in (+29 %) with a pedestal up + a slight truck
    { f: BEAT.now - 1, dur: 4, ease: easeOut, s: holdF(S5N, BEAT.now - 1, 0.002) }, // "now": a x1.08 dolly snap toward HIM (everything stays whole)
  ],
  // 6 MYSTERY (A3): a LOW rear hero angle (lens ~0.9 m): board whole on top, both heads between it and the caption
  6: [{ f: S[5].a - 4, s: arc6 }],
  // 7 THE PROFESSOR (A3): one wide orbit from his left (CRYSTAL whole on the left third, he on the right third) -> 3/4
  //   MCU on "Cialdini" -> a dolly + zoom fly INTO the clipboard paper (the dissolve plays on white paper)
  7: [
    { f: ORB7_A, s: orbit7 },
    { f: BEAT.cialdini - 19, dur: 36, s: mcu7 },                       // A4: 36 f (peak ~4.5 %/f)
    { f: FLY7, cut: true, s: fly7 },
  ],
  // 8 THE TEAM (A3): long-lens MS through the sign gap aimed between both assistants (chip + dot, the stopwatch whole)
  //   -> whip -> the trail-heads wide settles in 6 f and creeps -> one bell push onto Sign A + the swapping assistant
  //   (= shot 9's first frame)
  8: [
    { f: S[7].a - 4, s: gap8 },
    { f: CUT8, cut: true, s: wide8 },
    { f: PUSH8, dur: PUSH8D, s: swap8 },
  ],
  // 9 THE TWO SIGNS (A3): the shot-8 frame (match) -> a 30 f glide to Sign A + its reader, held ~25 f -> a 32 f crane-
  //   truck to Sign B landing on "Many" - 2 (the LONG LOGS board rides below the caption) -> tilt to the pictogram on
  //   "removed" -> glide out to the two-sign frame that shot 10 opens on (reader B whole on the right edge)
  9: [
    { f: S[8].a - 4, s: swap8 },
    { f: S[8].a - 2, dur: 60, s: S9A_H }, // A4: ONE slow drift right onto Sign A + its reader (peak ~1.5 %W/f) that flows into the truck to B
    { f: S9B_A, cut: true, s: lift(bank(glideTo(S9A_H, hold(S9B.pos, S9B.look, 52, S9B_A + S9B_D, 0.003), S9B_A, S9B_D), S9B_A, S9B_D, 0.045), S9B_A, S9B_D, 0.9) }, // a crane arc over the whole truck: the LONG LOGS board rides BELOW the caption
    { f: CUE.removed - 14, dur: 24, s: hold(tt([0.2, 1.36, 4.25]), tt([0.33, 1.27, 0]), 50, CUE.removed + 10, 0.003) },
    { f: CUE.removed + 5, dur: 40, s: two }, // A4: a 40 f bell (peak <= 2 %/f) landing by 1046
  ],
  // 10 RESULTS (noon, A3): the two-sign frame (match) -> Sign A + the tourist who puts the chip back (level, whole) ->
  //   truck to the Sign B crowd (lower, closer, a slow pull + pedestal) -> a 6 f punch INTO the 7.92 % counter, held
  //   10 f with the cha-ching kick -> a banked glide out to the two-sign frame into the "You see," dissolve
  10: [
    { f: S[9].a - 5, s: two },
    { f: S[9].a + 2, dur: 24, s: slide(hold(tt([-2.6, 1.3, 5.2]), tt([-2.85, 1.15, 0.6]), 50, S[9].a + 26, 0.003), S[9].a + 26, [0.0025, 0, 0]) }, // A4: a 24 f bell after the dissolve (lands before the roll)
    { f: BEAT.withB - 22, dur: 30, s: holdL(S10B2, BEAT.withB + 8, 0.0025) },        // A4: the whip settles on a Sign B MS that matches A's (the 7.92 % roll readable)
    { f: BEAT.pct8 - 4, dur: 4, ease: punch, s: holdL(S10L2, BEAT.pct8, 0.002) },   // A4: x1.27 punch in 4 f, LANDED on "8%" (sharp on the cha-ching)
    { f: BEAT.pct8 + 11, dur: 28, s: bank((f) => dolly(TWO.pos, TWO.look, pushK(f, BEAT.pct8 + 39, 0.003), { fov: TWO.fov }), BEAT.pct8 + 11, 28, -0.045) },
  ],
  // 11 PIVOT (A3): low close diagram view (his face high, the fork + both paths above him) -> a drift that lets him walk
  //   off -> push to the sign landing above him (from his left) -> x1.15 snap on "steal" -> drift -> banked reveal
  //   pull-out on "everyone"
  11: [
    { f: S[10].a - 4, s: open11 },                                               // A4: a crane down + push + truck right (never locked on the pivot)
    { f: BEAT.copyEach - 6, dur: 34, s: hold(B11W.pos, B11W.look, 52, BEAT.copyEach + 28, 0.0025) }, // a slow drift that does NOT track him: he walks off toward the right third
    { f: BEAT.manySteal - 14, dur: 36, s: holdL(B11S2, BEAT.manySteal + 22, 0.003) }, // A4: the sign lands above him with BOTH labels + FIG. 1 whole
    { f: BEAT.manySteal + 22, cut: true, s: drift11 },                            // A4: one slow orbit right + crane up (labels stay >= 72 px inside)
    { f: BEAT.everyone - 6, dur: 30, s: bank(hold(bp([0.9, 3.6, 9.5]), bp([0.6, 1.0, -2.0]), 52, BEAT.everyone + 16, -0.003), BEAT.everyone - 6, 40, 0.052) }, // A3 ADD: a 3 deg bank on the reveal
  ],
  // 12 CLASSROOM: from behind the back row (teacher left of the chalk text, pupils' backs below) -> arc to the student
  12: [
    { f: S[11].a - 4, s: ots12 },                                   // A4: creep + truck right from the first frame
    { f: WH12A, cut: true, s: whip12a },                            // the whip right off the finished sentence
    { f: CUT12, cut: true, s: whip12b },                            // hidden cut inside the blur: across the seated pupils onto her
    { f: CHEATS12 - 2, dur: 8, ease: easeOut, s: (f) => dolly(END12.pos, END12.look, pushL(f, CHEATS12 + 6, 0.003) / 1.1, { fov: END12.fov }) }, // A3 ADD: x1.1 push-in on "cheats."
  ],
  // 13 PERMISSION (A3): low backlit wide -> MS on "thieves" -> ease back to the whole sign on "gave them" -> x1.15 snap
  //   on "permission" centred on Sign B (13 px kick); the hold pulls + rises gently into the dissolve
  13: [
    { f: S[12].a - 4, s: push13 },                                   // A4: ONE centred push (+22 %), no truck (the A3 out-and-back wobble is gone)
    { f: BEAT.permission - 1, dur: 4, ease: easeOut, s: slide(hold(S13F.pos, S13F.look, S13F.fov, BEAT.permission + 3, -0.0022), BEAT.permission + 3, [0, 0.003, 0]) }, // the x1.15 snap on "permission", centred on Sign B (13 px kick)
  ],
  // 14 STOREROOM (A3): BAIT bucket insert -> the CONSCIENCE PILE reveal -> MS of the pile + scoops -> tilt up to the
  //   RETURNS slot and follow the parcel down onto the pile -> the two-shot on "apology letters"
  14: [
    { f: S[13].a - 4, s: (f) => yawAbout(hold(S14I.pos, S14I.look, 36, S[13].a - 4, 0.003)(f), -5) }, // A4: yawed 5 deg left: his torso slab leaves the right edge (bucket + BAIT label stay)
    // (the south wall is at z 2.75: every lens stays at z <= 2.6, a wider lens gives the coverage)
    { f: BEAT.conscience - 22, dur: 30, s: hold(sr([1.4, 1.05, 2.55]), sr([0.58, 0.68, -1.0]), 60, BEAT.conscience + 8, 0.003) }, // the reveal: him whole + the CONSCIENCE PILE
    { f: BEAT.pieces - 15, dur: 26, s: hold(S14P.pos, S14P.look, 42, BEAT.pieces + 11, 0.003) }, // A4: lands by 1700 so the notes hold ~14 f
    { f: BEAT.mailed - 17, dur: 12, s: hold(S14M.pos, S14M.slot, 44, BEAT.mailed - 5, 0.003) },  // A4: tilt up to the RETURNS slot (starts 2 f later, 2 f longer) ...
    { f: BEAT.mailed - 8, dur: 13, s: hold(S14M.pos, S14M.pile, 44, BEAT.mailed + 5, 0.003) },   // ... and follow the parcel down, starting 3 f earlier (lands mailed + 3, the 0.8 kick)
    { f: BEAT.apology - 14, dur: 28, s: hold(S14A.pos, S14A.look, 52, BEAT.apology + 14, 0.003) }, // A3: the two-shot: him whole on the right third, the letter by his face
    { f: BEAT.apology + 12, dur: 32, s: holdL(S14E, BEAT.apology + 44, 0.002) },                  // A4: a slow push + tilt down to an MS (head ~30 % W, the ceiling out)
  ],
  // 15 DUSK (A3): MS of the tourist -> a LOW MCU on "stolen" -> x1.12 snap on "twice" -> an 11 f glide onto frame 0's
  //   own creep path (shot 16's camera), so the 15 -> 16 dissolve overlays the same board
  15: [
    { f: S[14].a - 4, s: push15 },                                         // A4: ONE gentle push (~1.3 %/f peak) from a low 3/4 onto the MCU
    { f: BEAT.twice - 3, dur: 4, ease: easeOut, s: holdL(S15S, BEAT.twice + 1, 0.002) }, // A4: x1.12 snap CENTRED ON THE TAG, landing on "twice"
    { f: S16_IN - 7, dur: 7, s: loop16 },                                  // held at MCU size >= 6 f, then a 7 f glide onto the EXACT frame-0 path
  ],
  // 16 LOOP: the backward extension of frame 0's creep: a steady 0.45 %/f push that lands EXACTLY on P0 on the last
  //   frame and carries the same velocity into frame 1 (no settle-then-go hitch at the seam)
  16: [{ f: S[15].a - 6, s: loop16 }],
};

// impact kicks: the image offset flips sign every frame and decays over n frames (stamp slam ~13 px; small mailbox clunk)
const KICKS: [number, number, number][] = [[BEAT.permission / FPS, 3.0, 10], [(BEAT.mailed + 3) / FPS, 0.8, 6], [(BEAT.pct8 + 1) / FPS, 1.0, 6]] /* parcel lands at mailed+3; a ~7 px kick on the cha-ching */;
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g, n0] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < n0) a += g * (n % 2 ? -1 : 1) * (1 - n / n0) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
// ---------------- CAM A4: the world sun stays where it was when a camera changes ----------------
// world.ts turns the sun from each shot's MEAN view direction (camAt every 3 f over [a, b)) by sunAz, so a new camera
// would swing the sun. These are the merged film's world sun headings before round A4 (deg, atan2(z, x), as printed by
// out/antitheft/cam/sun.mjs; trailhead noon -11.1 on 1/4/5/6/16 = the loop frame lights like frame 0; morning trails
// -22.4 on 7/8/9): sunAz is re-derived from the current cameras, so the LIGHT is unchanged. Shot 13 stays
// camera-relative on purpose (sunAz 0 = the backlit sun behind Sign B); 12 / 14 use world-fixed interior keys.
const SUN_WORLD: Record<number, number> = { 1: -11.1, 2: 35.2, 3: -3.0, 4: -11.1, 5: -11.1, 6: -11.1, 7: -22.4, 8: -22.4, 9: -22.4, 10: -21.8, 11: -47.7, 15: -172.2, 16: -11.1 };
const meanAxis = (id: number) => {
  const s = SHOTS[id - 1];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  return (Math.atan2(fz, fx) * 180) / Math.PI;
};
for (const [id, w] of Object.entries(SUN_WORLD)) SHOTS[+id - 1].sunAz = w - meanAxis(+id);

/** screen motion of the camera between f and f+1 (for POST's directional motion blur on the fast moves):
 *  dx, dy = mean image shift in px at 1080x1920 (subject depth and 2.5x behind it, the larger one), zoom = scale
 *  change per frame (0.1 = 10 %/f, + = pushing in). Pure function of (id, f); 0 on holds. */
export const camMotion = (id: number, f: number): { dx: number; dy: number; zoom: number } => {
  const c0 = camAt(id, f), c1 = camAt(id, f + 1);
  const basis = (c: Cam) => {
    const fw: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], n = Math.hypot(...fw);
    const F: V3 = [fw[0] / n, fw[1] / n, fw[2] / n], rh = Math.hypot(F[2], F[0]) || 1, R0: V3 = [-F[2] / rh, 0, F[0] / rh];
    const U0: V3 = [R0[1] * F[2] - R0[2] * F[1], R0[2] * F[0] - R0[0] * F[2], R0[0] * F[1] - R0[1] * F[0]];
    const cs = Math.cos(c.roll), sn = Math.sin(c.roll);
    return { F, R: R0.map((v, i) => v * cs + U0[i] * sn) as V3, U: U0.map((v, i) => -R0[i] * sn + v * cs) as V3, t: Math.tan((c.fov * Math.PI) / 360), n };
  };
  const b0 = basis(c0), b1 = basis(c1), dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const px = (c: Cam, b: ReturnType<typeof basis>, p: V3): [number, number] => {
    const d: V3 = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]], z = Math.max(1e-3, dot(d, b.F));
    return [540 + (540 * dot(d, b.R)) / (z * b.t * 0.5625), 960 - (960 * dot(d, b.U)) / (z * b.t)];
  };
  let best = { dx: 0, dy: 0, zoom: 0 }, bm = -1;
  for (const k of [1, 2.5]) {
    let sx = 0, sy = 0, r0 = 0, r1 = 0;
    const P: [number, number][] = [], Q: [number, number][] = [];
    for (const gx of [-0.5, 0, 0.5]) for (const gy of [-0.5, 0, 0.5]) {
      const z = b0.n * k, x = gx * z * b0.t * 0.5625 * 2, y = gy * z * b0.t * 2;
      const w: V3 = [0, 1, 2].map((i) => c0.pos[i] + b0.F[i] * z + b0.R[i] * x + b0.U[i] * y) as V3;
      const p = px(c0, b0, w), q = px(c1, b1, w); P.push(p); Q.push(q); sx += q[0] - p[0]; sy += q[1] - p[1];
    }
    const mx = sx / 9, my = sy / 9;
    for (let i = 0; i < 9; i++) { r0 += Math.hypot(P[i][0] - 540, P[i][1] - 960); r1 += Math.hypot(Q[i][0] - 540 - mx, Q[i][1] - 960 - my); }
    const zoom = r1 / r0 - 1, m = Math.max(Math.abs(mx) / 1080, Math.abs(my) / 1920, Math.abs(zoom));
    if (m > bm) { bm = m; best = { dx: mx, dy: my, zoom }; }
  }
  return best;
};

// ---------------- lens: depth of field per shot ----------------
// cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp. CU 12-16, MS 10-12, wides 0-3,
// sign text shots stay (almost) sharp so the words read. Entries switch at f, or ramp over dur. focus = world point.
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eyes = (p: V3, h = EYE): (() => V3) => () => [p[0], h, p[2]];
const DOFS: Record<number, Dof[]> = {
  // P0 (frames 0 and 1857) uses cInf 6 in BOTH shot 1 and shot 16 so the loop frame is identical and the board reads
  1: [{ f: 0, cInf: 6, focus: eyes(TH.woman) }, { f: K2_A, dur: K2_D, cInf: 10, focus: eyes(TH.woman) },
    { f: K3_A, dur: K3_D, cInf: 5, focus: eyes(TH.woman) }, { f: MCU1_A, dur: MCU1_D, cInf: 11, focus: eyes(TH.woman) },
    { f: DIVE0, dur: 12, cInf: 13, focus: () => ROCK }],
  2: [{ f: 0, cInf: 10, focus: () => V2F }, { f: V2B0 + 4, dur: 18, cInf: 0 }],
  3: [{ f: 0, cInf: 8, focus: eyes(VISTA.pocketTourist) }], // the plaque (4.8 m) stays within ~3 px blur: its caps read
  4: [{ f: 0, cInf: 2 }, { f: S4C_A, dur: S4C_D, cInf: 12, focus: () => [TH.flip.x, TH.flip.y, TH.flip.z] }, // her near brim goes soft (~6 px)
    { f: S4R_A, dur: S4R_D, cInf: 7, focus: () => [0.28, EYE, 1.85] }, { f: BEAT.piece - 18, dur: 36, cInf: 2 }],
  5: [{ f: 0, cInf: 10, focus: () => [0.3, EYE, 1.7] }],
  6: [{ f: 0, cInf: 6, focus: () => [0.4, EYE, 1.9] }, { f: ARC6_A + 20, dur: 45, cInf: 12, focus: () => [0, 2.9, 0.06] }], // A4: the couple in focus, then the board sharp + her hat brim soft (~6 px)
  // 7: the marker letters stay sharp in the wide (blur <= 2 px at CRYSTAL), soft in the MCU, the tallies in focus on the fly-in
  7: [{ f: 0, cInf: 6, focus: () => [PROF[0], 1.34, PROF[2]] }, { f: BEAT.cialdini - 16, dur: 30, cInf: 11, focus: () => [PROF[0], 1.34, PROF[2]] },
    { f: FLY7, dur: 10, cInf: 13, focus: () => CLIP }],
  8: [{ f: 0, cInf: 9, focus: () => tt([0.85, 0.6, -3.4]) }, { f: CUT8, cInf: 3, focus: () => tt([-2.6, 1.3, 0.4]) }, { f: PUSH8, dur: PUSH8D, cInf: 5, focus: () => tt([-2.75, 1.45, 0.3]) }],
  9: [{ f: 0, cInf: 4, focus: () => tt([-2.75, 1.45, 0.3]) }, { f: CUE.removed + 12, dur: 28, cInf: 3 }],
  10: [{ f: 0, cInf: 3 }, { f: S[9].a + 2, dur: 22, cInf: 5 }, { f: BEAT.withB - 22, dur: 30, cInf: 7, focus: () => LEDB }, { f: BEAT.pct8 - 4, dur: 4, cInf: 8, focus: () => LEDB }, { f: BEAT.pct8 + 13, dur: 18, cInf: 3 }],
  11: [{ f: 0, cInf: 0 }, { f: BEAT.manySteal + 14, dur: 12, cInf: 6, focus: () => bp(BP.signFloat) }, { f: BEAT.everyone - 6, dur: 10, cInf: 0 }],
  12: [{ f: 0, cInf: 9, focus: () => cl([CL.teacher[0], 1.5, CL.teacher[2]]) }, // A4: the teacher + board sharp, the near pupil's head soft (~20 px), not a dark disc
    { f: CUT12, cInf: 6, focus: () => STU }, { f: CUT12 + 6, dur: 10, cInf: 11, focus: () => STU }],
  13: [{ f: 0, cInf: 5 }],
  14: [{ f: 0, cInf: 10, focus: () => sr([SR.bucket[0], 0.55, SR.bucket[2]]) }, { f: BEAT.conscience - 22, dur: 30, cInf: 5 }, // the wide stays crisp (the joke notes read)
    { f: BEAT.pieces - 15, dur: 26, cInf: 10, focus: () => sr([0.45, 0.9, -1.0]) }, { f: BEAT.mailed - 17, dur: 12, cInf: 8, focus: () => sr([-0.1, 1.2, -2.0]) },
    { f: BEAT.apology - 14, dur: 28, cInf: 8, focus: () => sr([1.25, 1.3, -1.1]) }, { f: BEAT.apology + 12, dur: 30, cInf: 10, focus: () => sr([1.25, 1.3, -1.1]) }],
  // 15: background life readable before the push (cInf 5), soft behind the chip on "stolen", cInf 6 on the P0 match
  15: [{ f: 0, cInf: 5, focus: eyes(TH.tourist) }, { f: S[14].a + 6, dur: 24, cInf: 12, focus: () => TAG15 }, // A4: the board soft behind him and the tag
    { f: S16_IN - 7, dur: 7, cInf: 6, focus: eyes(TH.woman) }], // = shot 16's lens by the dissolve
  16: [{ f: 0, cInf: 6, focus: eyes(TH.woman) }],
};
export const dofAt = (id: number, f: number) => {
  const L = DOFS[id] ?? [{ f: 0, cInf: 0 }];
  const a = SHOTS[id - 1].a;
  let i = 0; while (i + 1 < L.length && f >= (L[i + 1].f || a)) i++;
  const d = L[i], p = L[Math.max(0, i - 1)];
  const k = d.dur ? clamp01((f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus ?? p.focus };
};
export { wi, WORDS, W, WE, PW, PWE };

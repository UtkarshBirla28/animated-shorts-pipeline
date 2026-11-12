// Timeline of "The Anti-Theft Sign That Made People Steal": shots, light states, cameras, lens blur and impact kicks,
// all keyed to the voice words (words.ts, generated from sound/antitheft/voice/words.json). Grammar from
// study/CHANNEL_STYLE_BIBLE.md section 13, overridden in ROUND 7 by the user's direction ("too fast"): every shot
// change is a 10-12 VIDEO f cross-dissolve; framings hold ~2.5-4 s and creep 0.15-0.3 %/f; reframes are smootherstep
// glides of 44-100 video f (zoom <= ~1.5 %/f, pan <= ~1 %W/f); exactly two comic snaps ("now", "twice"); four clean
// straight cuts inside shots 8 / 9 / 10 / 12 where no calm move fits (see the ROUND 7 CAM block above CAMS).
import { W, WE, wi, WORDS, PW, PWE } from "./words";
import { TH, TT, VISTA, CL, SR, BP, EYE, add, V3, LightName, SetName } from "./plan";
import { blendLight, LightState } from "./lights";
import { toNew, WARP, VOICE_TOTAL, VOICE_WORDS } from "./voicewarp";

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
SHOTS[3].relight = [{ f: BEAT.vandalized - 2, to: "dim", dur: 18 } /* WORLD-EXT A7: arrives with the video-clock cloud sweep */, { f: BEAT.tons14 - 2, to: "noon", dur: 16 }]  /* WORLD-INT A6: the cloud shadow clears on "14" (noon for the heap gag) */; // dims on "vandalized", lifts as the cloud shadow clears   // the sign: light dims ~20 % on "vandalized"
SHOTS[5].relight = [{ f: BEAT.but + 6, to: "late", dur: 60 }];           // mystery: noon -> late afternoon in-shot
SHOTS[12].sunAz = 0; SHOTS[12].sunEl = 6;                               // permission: backlit sunset, sun behind Sign B
// one world sun per place (CAM A3, out/antitheft/cam/sun.mjs): morning trails 7-8 share shot 9's heading (the 8 -> 9 match
// dissolve no longer jumps); every trailhead-noon shot uses frame 0's sun, so the loop frame 1857 lights like frame 0
SHOTS[6].sunAz = 22.1; SHOTS[7].sunAz = 36.1;
SHOTS[3].sunAz = 75.7; SHOTS[4].sunAz = 61.2; SHOTS[5].sunAz = 77.0; SHOTS[15].sunAz = 78.9;

/** cross-dissolve length (VIDEO frames: AntiTheft.tsx / Captions.tsx run every dissolve on the video clock, centred where
 *  the picture reaches the boundary, clamped to s.a +- 3.95 picture f) into each shot.
 *  R7 CAM (user: "too fast"): 10 video f everywhere (the LEAD's 9-12 f), 12 into the blueprint pivot ("You see,": the
 *  most important turn), 11 into the whisper and the two-sign shot. The clamp shortens 6 -> 7 (~7 f) and 15 -> 16
 *  (~7.8 f) where the picture runs fast */
export const XFADE: Record<number, number> = Object.fromEntries(SHOTS.slice(1).map((s) => [s.id, 10]));
XFADE[5] = 11; XFADE[9] = 11; XFADE[11] = 12; XFADE[15] = 11; XFADE[3] = 9; // (2 -> 3 has 9.4 f of room)

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
/** a camera key: starts at PICTURE frame f; its glide lasts `dur` picture frames (timed on the video clock between those
 *  two picture frames) or, with vd, exactly vd VIDEO frames */
type Key = { f: number; dur?: number; vd?: number; cut?: boolean; ease?: (u: number) => number; s: (f: number) => Shot };
// ---------------- CAM A5: the camera runs on the VIDEO clock ----------------
// The scene renders at picture time WARP[video frame] (voicewarp.ts), and the picture runs at 0.42-1.16x of the video
// here, so a creep or a bell timed in picture frames was slowed, stretched or bent on screen (audit A5: shot 5 'still'
// for 150 f, the shot-12 whip at 2.6 deg/f, the uneven loop seam). Every creep (pushK / pushL / slide), every key
// glide, bank, lift, DOF ramp and kick is now measured in VIDEO frames: V(f) = the video frame of picture time f. Key
// START frames stay on the picture clock (anchored to BEAT), so a re-timed voice moves them with the words.
/** the video frame of picture time f (linear past the ends, so creeps and motion probes keep their speed there) */
export const V = (f: number) => {
  const n = WARP.length - 1;
  if (f <= WARP[0]) return (f - WARP[0]) / Math.max(1e-6, WARP[1] - WARP[0]);
  if (f >= WARP[n]) return n + (f - WARP[n]) / Math.max(1e-6, WARP[n] - WARP[n - 1]);
  return toNew(f);
};
/** the picture time of video frame v (inverse of V) */
export const PV = (v: number) => {
  const n = WARP.length - 1;
  if (v <= 0) return WARP[0] + v * (WARP[1] - WARP[0]);
  if (v >= n) return WARP[n] + (v - n) * (WARP[n] - WARP[n - 1]);
  const lo = Math.floor(v);
  return WARP[lo] + (v - lo) * (WARP[lo + 1] - WARP[lo]);
};
/** how far (0 at f0, 1 at f0 + dur; unclamped) picture time f is through the picture window [f0, f0 + dur], on the video clock */
const vt = (f: number, f0: number, dur: number) => (V(f) - V(f0)) / Math.max(1e-6, V(f0 + dur) - V(f0));
/** reference camera ease: symmetric smootherstep */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const keyU = (k: Key, f: number) => (k.vd ? (V(f) - V(k.f)) / k.vd : vt(f, k.f, k.dur ?? 30));
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), (k.ease ?? glide)(keyU(k, f)));
  }
  return cur;
};
/** a key that starts at VIDEO frame v0 and glides for vd video frames */
const VK = (v0: number, vd: number, s: (f: number) => Shot, ease?: (u: number) => number): Key => ({ f: PV(v0), vd, s, ...(ease ? { ease } : {}) });
/** push-in factor since f0: the subject grows ~rate per VIDEO frame (0.002-0.004 = 0.2-0.4 %/f); negative rate = slow pull */
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, V(f) - V(f0)));
/** the same steady push, also running BEFORE f0 (k > 1 there): passes k = 1 exactly at f0 */
const pushL = (f: number, f0: number, rate: number) => Math.exp(-rate * (V(f) - V(f0)));
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
// A6 P3 (audit "the weakest kind of hook frame: symmetric, eye-level"): 0.25 m lower + tilted 3 deg up (a heroic low
// angle: her eyes y ~1023, the raven ~140 px under the frame top, the board whole, her hat just under its bottom rail)
export const P0: Cam = { pos: [0.0, 0.45, 4.4], look: [0.0, 1.88, 0.4], fov: 51, roll: 0 }; // (A5: [0, 0.7, 4.4] -> [0, 1.9, 0.4])
const P0_RATE = 0.0025; // frame 0's creep (R7 CAM: 0.25 %/f, the user's calm 0.15-0.3 %/f creep; was 0.45); shot 16 arrives on P0 with this exact push velocity
const p0 = (f: number, f0: number, r = P0_RATE): Shot => dolly(P0.pos, P0.look, pushK(f, f0, r), { fov: P0.fov });

const S = SHOTS;
/** camera-only word cues (local: BEAT is the LEAD's contract) */
const CUE = { psych: PW(12, "psychologist"), removed: PW(15, "removed") };
// ---------------- camera helpers (round A2) ----------------
/** a framing that also slides at a constant velocity d (m/f) from f0: the lateral drift on a hold */
const slide = (s: (f: number) => Shot, f0: number, d: V3) => (f: number): Shot => {
  const c = s(f), t = Math.max(0, V(f) - V(f0)); // A5: d is metres per VIDEO frame
  return { ...c, pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t], look: [c.look[0] + d[0] * t, c.look[1] + d[1] * t, c.look[2] + d[2] * t] };
};
/** A4: a bell that is 0 with ZERO velocity at both ends and 1 at the middle (16 t^2 (1-t)^2; the old sin(pi t) kept
 *  ~0.4 deg/f of roll at its end and stopped dead, a hitch) */
const bell = (t: number) => { const u = clamp01(t); return 16 * u * u * (1 - u) * (1 - u); };
/** a bank of a rad that rises and settles level over [f0, f0 + dur] (hand-guided lateral moves) */
const bank = (s: (f: number) => Shot, f0: number, dur: number, a: number) => (f: number): Shot => { const c = s(f); return { ...c, roll: (c.roll ?? 0) + a * bell(vt(f, f0, dur)) }; };
/** unit view direction from a compass bearing (deg; 0 = -z, 90 = +x) and a pitch (deg; + = up) */
const dirB = (b: number, p: number): V3 => { const B = (b * Math.PI) / 180, P = (p * Math.PI) / 180; return [Math.sin(B) * Math.cos(P), Math.sin(P), -Math.cos(B) * Math.cos(P)]; };
const along = (p: V3, d: V3, L: number): V3 => [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L];
/** a crane arc: the camera rises by h at the middle of [f0, f0 + dur] and settles back (the look rises half as much) */
const lift = (s: (f: number) => Shot, f0: number, dur: number, h: number) => (f: number): Shot => {
  const c = s(f), k = h * bell(vt(f, f0, dur));
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
const glideTo = (a: (f: number) => Shot, b: (f: number) => Shot, f0: number, dur: number) => (f: number): Shot => mix(full(a(f)), full(b(f)), glide(vt(f, f0, dur)));
/** round A3: a glide from framing a to framing b over [f0, f0 + dur] whose lens travels a quadratic curve bent through
 *  waypoint w (so it can route round an actor instead of sweeping her across the lens); the look turns on its own
 *  smootherstep over the time window [lk0, lk1] (fractions of dur) so the pan can wait until she is out of frame.
 *  Use as a cut key at f0 (it evaluates a and b itself, so both ends stay continuous with their creeps). */
const via = (a: (f: number) => Shot, w: V3, b: (f: number) => Shot, f0: number, dur: number, lk0 = 0, lk1 = 1, fv0 = 0, fv1 = 1) => (f: number): Shot => {
  const t = clamp01(vt(f, f0, dur)), u = glide(t), A = full(a(f)), Bf = full(b(f));
  if (t >= 1) return Bf;
  const p: V3 = [0, 1, 2].map((i) => (1 - u) * (1 - u) * A.pos[i] + 2 * u * (1 - u) * w[i] + u * u * Bf.pos[i]) as V3;
  const win = (x0: number, x1: number) => glide(clamp01((t - x0) / Math.max(1e-3, x1 - x0)));
  const k = win(lk0, lk1), kf = win(fv0, fv1);
  return { pos: p, look: lerp3(A.look, Bf.look, k), fov: A.fov + (Bf.fov - A.fov) * kf, roll: A.roll + (Bf.roll - A.roll) * u };
};

// ---- shot 1 (A6) ----
const ROCK: V3 = [TH.glintRock[0], 0.13, TH.glintRock[2]];
// A6 (audit P2 "the zoom pumps in and out in the first 1.7 s", "near-static for 70 f", "the dive is not a fly-through"):
//   P0 (frame 0) -> ONE continuous 50 video-f smootherstep arc left (video 3 -> 53, landing on "paperclip"; her size
//   within ~6 % of frame 0's, so frame 0's push creep carries straight through it: no zoom reversal) -> a 0.3 %/f creep
//   through "Then she read" -> "read": a 24 f bell tilt up 3 deg + a 0.1 m truck right (the lens follows her eyes up to
//   the board; all six lines + both posts whole) -> "and wanted": the crane up + push to the scheming MCU -> "steal": a
//   x1.2 snap -> the dive: a size RATE ramping on the VIDEO clock to ~9 %/f by video 199 and ~10.5 %/f on the 1 -> 2
//   dissolve's midpoint (201), still rising; 60 % dolly + 40 % zoom; the rock is steered to (0.57 W, 0.52 H) and fills
//   ~55 % of the width there, where the vista's orange jasper slice takes its place (same spot, size and colour)
const HER: V3 = [TH.woman[0], EYE, TH.woman[2]];
const K3N = orb(HER, 190, 2.52, 0.6, 52, 0.63, 0.55);      // the low 3/4 from her left: the whole board centred above her, the bubble at her upper right
/** frame 0's creep with a decaying velocity (0.45 %/f on frame 0 = the loop's arrival speed, dying out over ~8 video f
 *  while the arc takes over: the arc never has to undo an accumulated push) */
const P0_TAU = 26; // R7: the creep dies out slowly under the (slower, later) arc
const p0dec = (f: number): Shot => dolly(P0.pos, P0.look, Math.exp(-P0_RATE * P0_TAU * (1 - Math.exp(-Math.max(0, V(f)) / P0_TAU))), { fov: P0.fov });
/** a vertical camera move (crane) of m metres, look and lens together */
const pedestal = (F: Frame, m: number): Frame => ({ pos: [F.pos[0], F.pos[1] + m, F.pos[2]], look: [F.look[0], F.look[1] + m, F.look[2]], fov: F.fov });
const K1_CREEP = 0.0025;
/** a framing tilted up by deg and trucked m metres to the camera's right (look and lens move together) */
const tiltTruck = (F: Frame, deg: number, m: number): Frame => {
  const d: V3 = [F.look[0] - F.pos[0], F.look[1] - F.pos[1], F.look[2] - F.pos[2]], h = Math.hypot(d[0], d[2]), p = Math.atan2(d[1], h) + (deg * Math.PI) / 180;
  const r: V3 = [-d[2] / h, 0, d[0] / h], pos: V3 = [F.pos[0] + r[0] * m, F.pos[1], F.pos[2] + r[2] * m];
  return { pos, look: [pos[0] + d[0], pos[1] + h * Math.tan(p), pos[2] + d[2]], fov: F.fov };
};
const K3_V0 = 3, K3_VD = 50, RD1_V = V(PW(1, "read")), RD1_VD = 24;
/** 'read': a low-angle crane DOWN + tilt UP from where K3N's creep has got to (the board looms over her; she stays above
 *  the caption), creeping on at the same rate */
const K3T = (() => { const k = Math.exp(-K1_CREEP * (RD1_V + RD1_VD - (K3_V0 + K3_VD))); return tiltTruck(pedestal({ ...K3N, pos: dolly(K3N.pos, K3N.look, k).pos }, -0.2), 3, 0.04); })();
const MCU1 = orb(HER, 190, 2.5, 1.62, 42, 0.42, 0.35);   // head ~46 % W, eyes y ~672, rock x ~930 y ~1410 (clear of the caption)
const MCU1_A = BEAT.wanted - 17, MCU1_D = 26;            // 94 -> 120: lands just before the side-eye (121)
const mcu1 = holdL(MCU1, MCU1_A + MCU1_D, 0.003);                  // A4 P3: the creep runs under the glide (no 1 f stall where it lands)
const SNAP1 = BEAT.steal1 - 2, SNAP1_D = 4;              // a x1.2 snap onto the side-eye + the glinting rock (both stay in frame)
const MCU1_SNAP = (2 * Math.atan(Math.tan((MCU1.fov * Math.PI) / 360) / 1.2) * 180) / Math.PI;
const snap1 = holdL({ pos: MCU1.pos, look: lerp3(MCU1.look, ROCK, 0.16), fov: MCU1_SNAP }, MCU1_A + MCU1_D, 0.003); // the same creep as mcu1 (no pull-back inside the snap)
const DIVE0 = SNAP1 + SNAP1_D + 1;
const DV0 = V(DIVE0), DVT = V(S[1].a) - DV0, DIVE_R = 0.105;
/** the dive's log size gain: rate DIVE_R (t / T)^1.5 on the VIDEO clock (t from the dive start, T = to the dissolve midpoint) */
const diveLn = (f: number) => { const t = Math.max(0, V(f) - DV0) / DVT; return ((DIVE_R * DVT) / 2.5) * t ** 2.5; };
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** A6: the view direction that puts world point t at screen (xs, ys) for a lens at pos (exact at any pitch, also steep) */
const aimDir = (pos: V3, t: V3, fov: number, xs: number, ys: number): V3 => {
  const tv = Math.tan((fov * Math.PI) / 360), tx = (xs - 0.5) * 2 * tv * 0.5625, ty = (0.5 - ys) * 2 * tv, d = norm3(sub3(t, pos));
  let F = d;
  for (let i = 0; i < 6; i++) {
    const R = norm3(cross3(F, [0, 1, 0])), U = cross3(R, F);
    const g = norm3([F[0] + tx * R[0] + ty * U[0], F[1] + tx * R[1] + ty * U[1], F[2] + tx * R[2] + ty * U[2]]);
    F = norm3([F[0] + d[0] - g[0], F[1] + d[1] - g[1], F[2] + d[2] - g[2]]);
  }
  return F;
};
const DIVE_XS = 0.57, DIVE_YS = 0.52; // where the rock (and the vista's slice face) sits on the dissolve
const dive1 = (f: number): Shot => {
  const c = full(snap1(f)), ln = diveLn(f), s = Math.exp(-0.6 * ln), t = clamp01((V(f) - DV0) / DVT);
  const pos = lerp3(ROCK, c.pos, s), fov = (2 * Math.atan(Math.tan((c.fov * Math.PI) / 360) * Math.exp(-0.4 * ln)) * 180) / Math.PI;
  const dv = norm3(lerp3(norm3(sub3(c.look, c.pos)), aimDir(pos, ROCK, fov, DIVE_XS, DIVE_YS), glide(t)));
  return { pos, look: along(pos, dv, 2), fov, roll: 0.03 * (1 - s) };
};
// ---- shot 2 (A6, audit P2 "the dissolve doesn't match", "a huge blurred chunk", "the camera stalls"): the match is the
// FLAT slice of the west sliced log at [-22, 0, -30] (sets_ext EXTRA_LOGS, global index 13 = seed 300 + 13 * 17: slice
// 0 lies face up beside the log with an orange / red / yellow jasper face = the glint rock's palette; centre
// [-25.92, -31.91], r 0.62, top face y ~0.56; scripts/cam_logslices.mjs re-derives it if WORLD-EXT changes that list).
// The lens opens 3.4 m from it looking steeply down (72 deg, a wide 58 deg lens: the face ~58 % W at the rock's screen
// spot, nothing between), the dive's push carries on (12 %/f decaying over ~7 video f), and from 2 video f BEFORE the
// boundary ONE 54 f bell pulls up and back to the south-west while the look tilts up to the NE vista; the face shrinks
// into the lower left of the final frame (a follow-object reveal: trail + rail, sliced logs, walkers, the visitor
// centre + flag, ravens, badlands) ----
const V2F: V3 = [-25.92, 0.56, -31.91];
const V2_DIR0 = dirB(45, -72), V2_D0 = 3.4, V2_FOV0 = 58;
const V2E: V3 = [-36, 5.2, -22];
const V2END = dirB(53, -7.5);
const V2A = S[1].a - 4, V2V0 = V(V2A), V2BV = V(S[1].a) - 2, V2DV = 54;
/** the crane's path: a bell whose last ~15 % turns into a steady drift (V2W of the mean speed) that runs on through the
 *  2 -> 3 dissolve, so both cameras move across it */
const V2W = 0.4, v2path = (t: number) => (t < 1 ? (1 - V2W) * glide(t) + V2W * t : 1 + V2W * (t - 1));
const vista2 = (f: number): Shot => {
  const v = V(f), t = Math.max(0, (v - V2BV) / V2DV), u = v2path(t);
  const ln = 0.12 * 7 * (1 - Math.exp(-Math.max(0, v - V2V0) / 7)); // the dive's push carries on (12 %/f) and dies out
  const st = along(V2F, V2_DIR0, -V2_D0 * Math.exp(-0.75 * ln)), lf = 1.1 * bell(Math.min(1, t));
  const pos: V3 = [st[0] + (V2E[0] - st[0]) * u, st[1] + (V2E[1] - st[1]) * u + lf, st[2] + (V2E[2] - st[2]) * u];
  const fp = (2 * Math.atan(Math.tan((V2_FOV0 * Math.PI) / 360) * Math.exp(-0.25 * ln)) * 180) / Math.PI, fov = fp + (V2_FOV0 - fp) * glide(Math.min(1, t));
  const w = glide(clamp01((v - V2BV) / (V2DV - 6)));
  const dv = norm3(lerp3(aimDir(pos, V2F, fov, DIVE_XS, DIVE_YS), V2END, w));
  return { pos, look: along(pos, dv, 14), fov, roll: -0.035 * Math.sin(Math.PI * Math.min(1, u)) };
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
// A5 (audit P1 "near-still for 150 f, one framing over four clauses"): FOUR framings on the clauses, every hold creeping
// on the video clock. "She read it": the two-shot (lens 0.55 m further left than A4, so the 14 TONS counter separates
// from her hat; she leans clear of it on "leaned") creeping 0.28 %/f with a slow truck left -> "whispered": a 30 f bell
// push centred on the word to a tight two-head MCU (hat top ~0.36 H, chins ~0.61 H; the board keeps only its last
// lines; the counter leaves the left edge) with a 2.6 deg bank toward her that is level again by "We'd" -> a 0.25 %/f
// creep through the whispered line -> "now": a front-loaded x1.22 snap in 4 f onto HIS face (eyes 0.62 W, 0.42 H; her
// brim may leave the left edge) and a 0.2 %/f settle into the dissolve
const S5A = fr([0.45, 1.0, 7.0], -1.0, 1.4, 44);
const S5W = V(BEAT.whispered), S5NOW = V(BEAT.now);
const FI5X = TH.fiance[0] + 0.18; // where cast.ts stands him in shot 5 (FI5)
const MCU5: Frame = { pos: [0.62, 1.2, 5.15], look: [0.65, 1.33, 1.92], fov: 42 }; // A6 P3: look 0.05 m toward him (his head >= 30 px inside the right edge through the push)
const MCU5_L = PV(S5W + 15);
const creep5 = slide(hold(S5A.pos, S5A.look, S5A.fov, S[4].a - 6, 0.0028), S[4].a - 6, [-0.004, 0, 0]);
const S5N: Frame = (() => {
  const k = Math.exp(-0.0025 * (S5NOW - 1 - (S5W + 15))), c = dolly(MCU5.pos, MCU5.look, k), fov = (2 * Math.atan(Math.tan((MCU5.fov * Math.PI) / 360) / 1.22) * 180) / Math.PI;
  return { pos: c.pos, look: aimY(c.pos, [FI5X, EYE, TH.fiance[2]], fov, 0.62, 0.42), fov };
})();
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
// A6 P2 (audit "the raven snatching the chip reads at thumbnail scale"): from 10 video f before "steal?" a 22 f bell
// push + tilt up onto the board's top rail (lens 20 % nearer the raven, 4 deg tighter; render-checked): the raven
// ~165 px tall at ~0.6 W / 0.26 H as it pecks + snatches; the last lines stay in (the long lines lose their first and
// last letters, the '?' bubble goes to the left edge), creeping into the dissolve
const RAV6: V3 = [TH.ravenPerch[0] - 0.2, TH.ravenPerch[1] + 0.25, TH.ravenPerch[2]];
const S6R: Frame = (() => { const pos = dolly(S6E.pos, RAV6, 0.8).pos; return { pos, look: aimY(pos, RAV6, 44, 0.6, 0.26), fov: 44 }; })();
const RAV6_V = V(BEAT.steal2) - 10, RAV6_VD = 22;
// ---- shot 7 (A4): ONE wide orbit round the professor that now starts FRONTAL (az 182: the tarp-covered Sign B + its
// LED, the LONG LOGS marker and CRYSTAL all behind him, he on the right third, side-lit by the low sun) and swings on
// to az 216 (the sun now behind his right shoulder: a golden rim) by "Cialdini" - 16, with a 3 deg bank that settles;
// a push to the 3/4 MCU on "Cialdini"; then the fly-through INTO the blank paper under the tallies: the rate ramps
// over 16 f from 5 f before "tested" (no jolt), the look re-aims over 14 f, x4 by the dissolve's start, so the
// 762-769 dissolve plays on white paper ----
const PROF: V3 = tt([1.8, 0, 2.4]);
const CLIP: V3 = [PROF[0] - 0.11, 0.96, PROF[2] - 0.05]; // A6 P2 (render-checked on the MS at video 1015): the blank cream paper under the A column's two strokes, left of the B tallies (the 7 -> 8 blend no longer double-exposes the ##### strokes; 0.75 m was his shirt)
const P7C = around(PROF, 236, 2.2, 1.3);
const ORB7_A = S[6].a - 4, ORB7_B = BEAT.cialdini - 19;
const orbit7 = (f: number): Shot => {
  const t = vt(f, ORB7_A, ORB7_B - ORB7_A), u = 0.82 * glide(t) + 0.18 * clamp01(t); // a bell with a drift underneath (moving at the dissolve)
  const az = 182 + 34 * u, R = 4.4 - 0.4 * u, h = 1.12 + 0.16 * u, fov = 56 - 2 * u; // A6 P3: opens at 4.4 m (was 5.2): he is ~13 % of the width from the first frame
  const pos = around(PROF, az, R, h), look = aim(pos, PROF, fov, 0.7 - 0.06 * u, 1.0 + 0.04 * u); // tilted down so the MARKED CHIPS label clears the caption
  return { ...dolly(pos, look, pushK(f, ORB7_A, 0.003), { fov }), roll: 0.05 * bell(t) * (1 - 0.4 * u) };
};
// A6 P2: the push to the MS now LANDS on "psychologist" (it started 30 f later and he stayed tiny behind the clipboard
// until ~990); the MS creeps from there (pushL: no parked frames before the creep)
const MCU7_V = V(CUE.psych) - 30, MCU7_VD = 30;
const mcu7 = holdL({ pos: P7C, look: aim(P7C, PROF, 40, 0.56, 1.04), fov: 40 }, PV(MCU7_V + MCU7_VD), 0.0015); // (0.03 m higher + a 0.15 %/f creep: the longer hold no longer pushes his hair out of the frame top) // tilted down: the clipboard tallies clear the caption (A5 P3: 0.07 m lower: the bottom tally row rides above "Cialdini,")
// A5 P2: the calm nod on "tested" plays in the MS (the dive started 5 f before the word and pushed his head out of
// frame); the dive now starts 4 f after the word and ramps on the VIDEO clock to ~10 %/f by the 7 -> 8 dissolve (15 f)
// A6 P2: the dive reaches ~x10 on the blank paper by the 7 -> 8 blend's first frame (it was ~x2: tally strokes
// double-exposed): it starts 1 f after "tested" (or 23 video f before the blend) and ramps to ~18 %/f; the 7 -> 8 dissolve
// is a 5 f one (XFADE[8]) that rides the deepest frames (the paper fills the frame)
const FLY7 = Math.max(BEAT.testedIt + 1, PV(V(S[7].a) - 23)), FLY7_R = 0.17, FLY7_RAMP = 14;
const fly7 = (f: number): Shot => {
  const c = mcu7(f), t = Math.max(0, V(f) - V(FLY7)), r = Math.min(1, t / FLY7_RAMP);
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
/** turn the view about the camera (a pan), deg + = to the right */
const yawAbout = (c: Shot, deg: number): Shot => {
  const a = (deg * Math.PI) / 180, d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  return { ...c, look: [c.pos[0] + d[0] * Math.cos(a) - d[2] * Math.sin(a), c.look[1], c.pos[2] + d[0] * Math.sin(a) + d[2] * Math.cos(a)] };
};
// A5: the MS (audit P2 "both assistants in the left 260 px, the right 55 % empty"): panned 5.5 deg toward the pair (they
// centre at ~0.42 W, the bucket + log slice stay on the right third as depth); the fly-through's push carries on (0.6 m,
// a 12 f decay: ~1.2 %/f into the dissolve) with a 0.28 %/f creep and a slow truck toward them. "marked": a 24 f bell
// push (dolly + long-lens zoom, ~x3.5) centred on the word onto the chip as the brush dabs the dot (DOF on the chip).
// Then (audit P1/P2 "the whip is a 1 f jump cut"): ONE continuous crane-swing reveal, no cut: the lens pulls back, rises
// and swings left round the sign line (asst2's stopwatch click passes through the opening frames), landing on the
// trail-heads wide on "the trails"
const gap8 = (f: number): Shot => {
  const pre = 0; // R7: no fly-through carried in any more (the 7 -> 8 dissolve is a plain one): a pure creep
  const d = norm3([GAP8L[0] - GAP8[0], GAP8L[1] - GAP8[1], GAP8L[2] - GAP8[2]]);
  const c = dolly(along(GAP8, d, pre), GAP8L, pushK(f, S[7].a - 4, 0.0028), { fov: 42 }), t = Math.max(0, V(f) - V(S[7].a + 2));
  return yawAbout({ ...c, pos: [c.pos[0] - 0.003 * t, c.pos[1], c.pos[2]], look: [c.look[0] - 0.003 * t, c.look[1], c.look[2]] }, -5.5);
};
/** the marked chip on the path (cast.ts places it at asst1's chip hand: measured on the A4 frames) */
const CHIP8: V3 = tt([0.52, 0.09, -3.0]);
// A6 P1 (audit "the 'marked' CU frames two giant khaki torsos with the faces cut across the mouths"): a CLEAN insert:
// x3.2, the lens 0.15 m lower, the chip at 0.5 W / 0.45 H, so only the chip, the brush tip and the ball hands show (the
// kneeling heads sit >= 0.4 m above the frame top); the push lands 1 f before "marked" and holds ~4 f before the swing
const CU8_V = V(BEAT.marked), CU8_A = CU8_V - 19, CU8_D = 18, CU8_FOV = (2 * Math.atan(Math.tan((42 * Math.PI) / 360) / 3.2) * 180) / Math.PI;
const cu8 = (f: number): Shot => {
  const c = full(gap8(PV(CU8_A + CU8_D))), p = lerp3(c.pos, CHIP8, 0.07), pos: V3 = [p[0], p[1] - 0.15, p[2]], k = pushL(f, PV(CU8_A + CU8_D), 0.0025); // (render check: a 22 % dolly crossed the sign line; the lens now stays >= 0.6 m in front of it and zooms)
  const look = aimY(pos, CHIP8, CU8_FOV, 0.5, 0.45);
  return dolly(pos, look, k, { fov: CU8_FOV });
};
// A6 P2 (audit "the swing is still at speed on 'the trails,' (1096)"): it starts 6 f earlier and runs 34 f with a
// front-loaded ease (the x3.2 insert's zoom-out first, peak ~16 %/f radial at ~1071; the lateral swing settles by ~1090,
// so JASPER / LONG LOGS / CRYSTAL are still and sharp on "the trails" 1096)
const SW8_A = CU8_V + 2.5, SW8_D = 34;
/** a framing function run on a re-eased clock inside [f0, f0 + dur] (video-timed) */
const reease = (s: (f: number) => Shot, f0: number, dur: number, e: (u: number) => number) => (f: number): Shot => { const t = vt(f, f0, dur); return t <= 0 || t >= 1 ? s(f) : s(PV(V(f0) + e(t) * (V(f0 + dur) - V(f0)))); };
// A3: the wide creeps 0.3 %/f from the settle; then one bell push (PUSH8, 30 f) toward Sign A + the swapping
// assistant from the same 3/4-left side (he grows ~1.7x, peak ~2.5 %/f): JASPER and LONG LOGS stay whole at the edges,
// CRYSTAL leaves after "the trails"; the push's end framing (M8) is also shot 9's first frame (match dissolve)
const W8 = { pos: tt([-9, 2.3, 5.2]), look: tt([-2.1, 1.05, 0.3]), fov: 50 }; // A4: 2 deg tighter (JASPER whole on the left; CRYSTAL needs WORLD-EXT to come ~2 m nearer to read, see lead_requests)
const M8 = { pos: tt([-4.6, 1.58, 4.65]), look: tt([-2.9, 1.45, 0.15]), fov: 48 }; // A4: most of the way to the Sign A two-shot (shot 9 then only drifts ~1.9 m: no whip on "Please")
const PUSH8 = BEAT.swapping - 12, PUSH8D = 40;
// A5: the wide creeps 0.25 %/f from the swing's landing with a slow truck right (the marker posts parallax) into the push
const W8_L = PV(SW8_A + SW8_D);
const wide8 = slide(holdL(W8, W8_L, 0.0025), W8_L, [0.006, 0, 0.0085]);
/** the swing's bow: back, up and round the front of the sign line (>= 1.5 m from Sign B, the assistants and Sign A) */
const SW8W: V3 = tt([0.6, 2.4, 7.5]); // (backs away from the sign line first, then swings left)
const swap8 = slide(hold(M8.pos, M8.look, M8.fov, PUSH8 + PUSH8D, -0.002), PUSH8 + PUSH8D, [0.0005, 0.006, 0]); // a slow pedestal up + pull: JASPER / LONG LOGS stay whole into the match dissolve
// A6 P2 (audit "both sign holds are near-locked; Sign A's 'PLEASE DON'T' ~30 px cap"): Sign A's MS is 5 deg tighter
// (the panel ~43 % W at ~0.36 W, its reader at ~0.72 W) and creeps 0.35 %/f + a 2.5 mm/f truck right, both also running
// BEFORE the landing (the match glide lands on a moving camera): the text grows to ~38 px by "wood."
const S9A_P = tt([-2.7, 1.5, 4.75]), S9A = { pos: S9A_P, look: aimY(S9A_P, tt([TT.signA.dx, TT.signA.cy, TT.signA.z]), 45, 0.36, 0.47), fov: 45 };
/** a framing with a steady push (rate) and a constant drift d (m per VIDEO frame), both running before and after fL */
const creepL = (F: Frame, fL: number, rate: number, d: V3) => (f: number): Shot => { const c = dolly(F.pos, F.look, pushL(f, fL, rate), { fov: F.fov }), t = V(f) - V(fL);
  return { ...c, pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t], look: [c.look[0] + d[0] * t, c.look[1] + d[1] * t, c.look[2] + d[2] * t] }; };
const S9A_L = S[8].a + 32, S9A_H = creepL(S9A, S9A_L, 0.0035, [0.0025, 0, 0]);
/** A3: the truck to Sign B starts 14 f later (Sign A's quote reads to its end) and lands on "Many" - 2, his head 50+ px
 *  inside the right edge */
const S9B_A = BEAT.another - 16, S9B_D = 32, S9B = { pos: tt([0.2, 1.45, 4.5]), look: tt([0.33, 1.19, 0]) }; // A4: Sign B 172 px clear of the left edge, reader B's arm 70 px inside; A6 P3: look 0.15 m lower (Sign B + the LONG LOGS plate ~80 px higher: the plate's first line clears the caption)
/** A6 P2: the truck to Sign B starts as a PURE lateral truck: the crane arc and the raven lead wait 14 video f (reader A's
 *  eyes stayed under the caption band while "wood." was up), then rise over the rest of the move */
const S9B_RISE = PV(V(S9B_A) + 14), S9B_RD = S9B_A + S9B_D - S9B_RISE;
/** A5 (audit P2 "10 f of blurred desert floor in the truck"): the raven's glide from Sign A's LED to Sign B's (a copy of
 *  cast.ts signReaders: take-off 934, landing 958, 0.3 m arc) leads the truck: the look leans 45 % toward it while it
 *  flies, so it rides the top band of the frame instead of drifting off the top */
const RAVEN9 = (f: number): V3 => {
  const u = clamp01((f - 934) / 24), y = TT.signA.cy + TT.led.dy + TT.led.h / 2 + 0.12;
  return tt([TT.signA.dx + (TT.signB.dx - TT.signA.dx) * smooth(u), y + 0.3 * Math.sin(Math.PI * u), TT.signA.z + 0.01]);
};
const ravenLead = (s: (f: number) => Shot, w: number) => (f: number): Shot => {
  const c = s(f), k = w * Math.min(smooth(vt(f, S9B_RISE, 8)), smooth(1 - vt(f, 953, 8))); // A6: from S9B_RISE (was the truck's first frame)
  return k > 0 ? { ...c, look: lerp3(c.look, RAVEN9(f), k) } : c;
};
// ---- shot 9 -> 10 match: the same 3/4 two-sign frame closes shot 9 and opens shot 10 (only light and people change) ----
// A5c (audit P2 "the diptych is a thin band under 40 % empty sky"): two signs 3.2 m apart fill a 9:16 frame's WIDTH
// already (A's LED 48 px from the left edge, reader B's arm 17 px from the right), so no frontal lens can make them
// bigger; instead the pull-back now ends as a CRANE UP (lens 3.0 m, ~13 deg down): the horizon rises from 0.56 H to
// 0.29 H (sky ~25 %, was ~42 %), the chip-strewn trails run back behind the signs (the experiment's field), the
// signs sit at 0.35-0.6 H (~6 % bigger), the readers' feet above the caption band, the rope barrier along the
// bottom edge (a rack-focus start). Bigger signs need them closer together: see lead_requests
const TWO: Shot = { pos: tt([-1.22, 3.0, 8.75]), look: tt([-1.25, 1.1, 0.3]), fov: 56 };
const TWO_F0 = CUE.removed + 45; // A4: the pull lands here (1046): its creep runs on through the 9 -> 10 match
const two = (f: number): Shot => dolly(TWO.pos, TWO.look, pushL(f, TWO_F0, 0.003), { fov: TWO.fov });
/** A5: the foreground rope barrier the shot-9 rack focus starts on (A5c: the rope at TT z +5.2, ~4 m from the high
 *  diptych lens, along the frame's bottom edge) */
const NEAR9: V3 = tt([-1.3, 0.47, 5.2]);
/** A5b: the rack focus is timed from the diptych landing (video frame of TWO_F0), not literal video frames */
const R9 = V(TWO_F0);
// ---- shot 10 (A3): the Sign B crowd from lower and closer; on "8%" a 6 f front-loaded punch into the LED counter (it
// fills ~half the frame width, the crowd's happy heads soft at the bottom), held 10 f with the cha-ching kick, then the
// banked glide out to the two-sign comparison ----
// A4: the Sign B MS (panel ~46 % W, LED digit box ~140 px, two grinning flankers' faces whole beside the pictogram,
// never over it; the 0 -> 7.92 % roll reads here) and the punch (the LED in the upper third, the sign's text block above
// the caption, the flankers' faces OUT of frame rather than cut at the corners)
// A5 (audit P1 "the crowd's faces are cut by the edges and sit in the caption band; their pocketing hands fall below
// the frame"): a higher, wider crowd frame searched against cast.ts CROWD10 (out/_s10search.mjs): all five heads whole
// (>= 36 px inside both edges), eyes at 0.50-0.52 H (crouched faces still above the caption band), the hip pockets at
// ~0.62 H, the LED + panel above them; it PULLS slowly (-0.2 %/f) while they pocket, so nobody is cut, and the punch
// starts from this wider frame
const S10B2: Frame = { pos: tt([0.8, 2.2, 7.0]), look: tt([0.3, 1.2, 0]), fov: 46 };
// A6 P2 (audit "the crowd pockets with its hands on the caption band; the bottom ~40 % is empty gravel; the hold is
// locked; the LED digits ~24 px"): a higher, tighter crowd frame (lens 2.1 m, 42 deg, 5.9 m out, looking ~11 deg down):
// the standing heads at ~0.36-0.4 H, the pocketing hands at ~0.6 H, the feet at ~0.75 H, the LED + panel above; it
// creeps IN 0.3 %/f with a 1.5 deg orbit right over the hold (the lens slides 4 mm/f right, the look stays)
const S10B3: Frame = { pos: tt([0.45, 2.1, 5.9]), look: tt([0.09, 1.067, 0.6]), fov: 44 }; // (the look point sits at the crowd's depth, so the orbit turns round them) // (render-checked: 1.5 m nearer than the first A6 try, the gravel strip under their feet ~25 % instead of ~40 %)
const orbitL = (F: Frame, fL: number, rate: number, d: V3) => (f: number): Shot => { const c = dolly(F.pos, F.look, pushL(f, fL, rate), { fov: F.fov }), t = V(f) - V(fL);
  return { ...c, pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t] }; };
/** A6 P2: the shot-10 end key 0.4 m right of the shot-9 diptych (the selfie pair whole inside the right third) */
const TWO10: Shot = { pos: [TWO.pos[0] + 0.4, TWO.pos[1], TWO.pos[2]], look: [TWO.look[0] + 0.4, TWO.look[1], TWO.look[2]], fov: TWO.fov };
// A5 P1: the punch insert ~0.27 m lower on the sign: the pictogram ends ~y 1293 (above the caption band 1320-1392), the
// caption sits on the panel's bottom margin above the LONG LOGS plate, the LED at y ~260-470 under the raven
const S10L2: Frame = { pos: tt([0.04, 1.7, 3.0]), look: tt([0.02, 1.59, 0]), fov: 44 };
const LEDB: V3 = tt([TT.signB.dx, TT.signB.cy + TT.led.dy, TT.signB.z]);

/** the punch's ease: front-loaded but not a 1-frame jump (~30 % of the move on its first frame) */
const punch = (u: number) => 1 - (1 - clamp01(u)) ** 2.2;
// ---- shot 11 (A3): open low and close on the visitor at the fork (face high, never under the caption); hold still-ish
// while he walks off toward the crowd (the lens does not track him); push to the floating sign landing above him
// from his LEFT (so THE RULE label sits left of the panel once BP.signFloat moves right, see lead_requests); a x1.15
// snap on "steal"; a drift; the banked reveal pull-out on "everyone" ----
const STEAL11 = PW(22, "steal");
// A5 P2: the opening look is 0.13 m higher, so the bright centre-lane dashes and path edges run below the caption band
// (they read as '·' / '_' marks inside "You see," / "copy" / "does.")
const B11O = { pos: bp([0.3, 3.0, 6.2]), look: bp([0.1, -0.17, -1.0]) };
const B11S = { pos: bp([-0.6, 2.8, 7.0]), look: bp([0.4, 1.35, -1.5]) };
const B11V = { pos: bp([-0.35, 2.75, 6.85]), look: bp([0.45, 1.38, -1.5]) };
// ---- shot 11 (A4): the opening creeps, cranes down 0.35 m and trucks right (the pivot is never locked); the panel lands
// on a WIDER frame that keeps THE RULE, EVERYONE ELSE and the FIG. 1 title whole (audit P1: they were cut for 5 s); then
// one 65 f orbit right + crane up round the panel (no snap: a push would cut the labels) into the reveal pull-out ----
const B11S2: Frame = { pos: bp([0.1, 2.9, 8.3]), look: bp([0.45, 1.5, -1.5]), fov: 56 };  // labels x 90 / 967, title x 86-602, his face x ~770 y ~1090
const B11D: Frame = { pos: bp([0.95, 3.15, 7.5]), look: bp([0.5, 1.5, -1.5]), fov: 56 }; // an orbit right + crane up round the panel: the far FIG. 1 title slides (parallax) while the labels stay (x 77 / 1008), his face x ~730
// A5: the pivot opens close on him and PULLS (0.35 %/f, a slow truck right + crane down): the fork and both paths reveal
// themselves as they are named, and the follow below carries the same direction on (no push-then-pull reversal)
const open11 = slide(hold(B11O.pos, B11O.look, 52, S[10].a - 4, -0.0025), S[10].a - 4, [0.0022, -0.0015, 0]); // R7: -0.25 %/f (was -0.35) + a slower truck
const drift11 = glideTo(holdL(B11S2, BEAT.manySteal + 22, 0.0035), holdL(B11D, BEAT.everyone - 6, 0.0035), BEAT.manySteal + 22, BEAT.everyone - BEAT.manySteal - 22);
// A5 P2: a gentle FOLLOW of his walk: one move from the opening frame that bows right with him (a control point 0.7 m
// right of both ends, peak ~1.2 %W/f) and rises to the panel's landing frame B11S2 (labels + FIG. 1 whole on landing)
const FOL11_A = PV(V(BEAT.copyEach) - 6), // A5b: anchored to the word (was a literal video frame: the re-timed voice moves it)
  FOL11 = via(open11, bp([1.05, 3.0, 6.9]), holdL(B11S2, BEAT.manySteal + 22, 0.003), FOL11_A, BEAT.manySteal + 22 - FOL11_A, 0.0, 1.0, 0.1, 1.0);
// A5 P1: "...doesn't sound like a WARNING": one bell push (34 f, x1.45: half dolly, half zoom) onto him + the panel, so
// his skeptical face and the whole panel fill the frame for the grimace; the orbit under it carries on
const TGT11: V3 = bp([1.0, 1.5, -0.28]), W11_V = V(BEAT.warning2);
const push11 = (f: number): Shot => { const c = full(drift11(f)), p = dolly(c.pos, TGT11, pushK(f, PV(W11_V + 14), 0.002) / 1.2); return { ...p, fov: (2 * Math.atan(Math.tan((c.fov * Math.PI) / 360) / 1.21) * 180) / Math.PI, roll: c.roll }; };
// A5 P1 (the 'everyone' reveal barely registered): a 45 f ease-in-out pull-out from 4 f before the word to a HIGH wide
// over the whole sheet (crane up ~3.5 m, back ~2.5 m, looking ~30 deg down): the lone rule-follower isolated, thieves
// pouring out everywhere; peak ~-2.5 %/f, still moving into the 11 -> 12 dissolve, with the 3 deg bank
const EV11_V = V(BEAT.everyone) - 2, EV11_VD = 38; // A6 P3: 2 f before the word, 38 f, a front-loaded ease (peak ~-3.5 %/f right after the word, was -2.1 ten frames late)
const B11R: Frame = { pos: bp([0.95, 6.6, 10.0]), look: bp([0.6, -0.45, -1.7]), fov: 54 }; // (looking low enough that his face stays above the caption band through the pull)
// ---- shot 13 (A3): the final framing is centred on Sign B (the panel ~43 % of the width, the PERMISSION GRANTED mark
// whole, the two flanking thieves' faces whole above the caption once CHAR stands them beside the posts) ----
// A5 (audit P2 "one framing for 2.5 s; Sign B's text 22-26 px"): the low backlit wide creeps 0.25 %/f -> ONE bell push
// (36 f, ~x1.55) centred on "gave", aimed at the panel's lower half (sign face ~43 % W) -> a 0.25 %/f creep -> the
// x1.3 snap on "permission" (the face ~57 % W, letters ~45 px; the flankers frame the bottom corners) with the 13 px
// kick -> a gentle pull + rise into the dissolve. The lens stays on Sign B's axis the whole way (the backlit sun stays
// centred behind it)
const S13A: Frame = { pos: tt([0.1, 0.95, 4.9]), look: tt([0.0, 1.32, 0]), fov: 66 }; // A6 P3: aimed 0.15 m lower (the three pocket gestures rise off the caption band)
const S13M: Frame = { pos: tt([0.0, 1.45, 3.9]), look: tt([0.0, 1.45, 0]), fov: 52 }; // A6 P3: look 0.15 m lower (Sign B + the LONG LOGS plate ~80 px higher, the pigtail chin above the caption)
const G13_V = V(BEAT.gave);
const S13F: Frame = (() => {
  const k = Math.exp(-0.0025 * (V(BEAT.permission - 1) - (G13_V + 18))), c = dolly(S13M.pos, S13M.look, k);
  return { pos: c.pos, look: S13M.look, fov: (2 * Math.atan(Math.tan((S13M.fov * Math.PI) / 360) / 1.2) * 180) / Math.PI }; // A6 P2: x1.2 (was x1.3: both flankers' faces were half out of frame)
})();
// ---- shot 14 (A3) ----
const S14I = { pos: sr([SR.bucket[0] + 1.6, 0.85, SR.bucket[2] + 1.3]), look: sr([SR.bucket[0] + 0.05, 0.4, SR.bucket[2]]) }; // A6 P3: aimed 0.06 m lower (the BAD LUCK EVER SINCE note rises above the caption)
// A5 (audit P2 "three direction reversals with no rest; the CONSCIENCE stencil cut; he is off-frame right for 2.3 s"):
// ONE move per beat, >= 12 f of creep between moves, every framing derived from the reveal wide (where the whole
// stencil, the BAIT bucket and him read): the reveal lands by ~2201 and creeps -> a gentle x1.2 push centred on
// "pieces" between the stencil and the bucket (stencil whole, bucket + his scoop hand inside 0.9 W) -> on "mailed" ONE
// 20 f tilt up that keeps the RETURNS chute AND the pile, and stays (the parcel falls INTO the frame) -> one 24 f
// pull/truck onto him (face ~0.68 W) with the stencil whole, then a 0.3 %/f creep into the dissolve
const W14: Frame = { pos: sr([1.4, 1.05, 2.55]), look: sr([0.58, 0.68, -1.0]), fov: 60 };
const TGT14: V3 = sr([0.37, 0.7, -0.95]);
// A5b (render check A5_clip_s1314: his face sat at 0.86-1.0 W on 'mailed' and 'letters.', cut by the right edge): each
// framing pans right (stencil still whole, >= 0.06 W inside the left edge); 'mailed' tilts up only 0.08 m (the chute is
// already in the 'pieces' frame; a bigger tilt sank the stencil under the caption) and pans onto his 'o'
// A6 P2 (audit "one framing for 4.9 s while the narration names three nouns; the mail drop is 15-25 px; he is half out
// of the right edge"): THREE framings. "pieces": the pile MS, trucked 0.25 m toward him + 3 deg wider (his head >= 150
// px inside the right edge, the CONSCIENCE stencil whole) -> "mailed back": a 20 f punch-in (~x2, a dolly + zoom)
// onto the brass MAIL slot (~0.4 W, 0.44 H) with the LETTERS THIS YEAR counter above it and the chute running down to the
// pile (the envelope out of the slot and the 1,201 -> 1,202 tear-off play in it), creeping -> "apology letters": a
// 20 f pull / truck back onto him (E14), then a 28 f bell push x1.4 into the SORRY! letter in his hand, into the dissolve
const P14 = tiltTruck(yawAbout({ pos: add(dolly(W14.pos, TGT14, 1 / 1.12).pos, [0.25, 0, 0]), look: add(TGT14, [0.25, 0, 0]), fov: 59 }, 2.2) as Frame, 2.5, 0); // (+2.5 deg tilt: less of the concentric rug, the stencil still above the caption)
const SLOT14: V3 = sr([-0.15, 1.55, -2.6]);
const M14: Frame = (() => { const pos = dolly(P14.pos, SLOT14, 0.72).pos; return { pos, look: aimY(pos, SLOT14, 42, 0.4, 0.42), fov: 42 }; })();
const E14 = yawAbout({ pos: sr([1.25, 1.2, 2.5]), look: sr([0.33, 0.95, -1.05]), fov: 60 }, 6.5) as Frame; // his face ~0.7-0.82 W
const LET14: V3 = sr([1.05, 1.22, -0.95]); // the SORRY! letter he lifts on "apology" (CHAR: his near hand)
const E14L: Frame = (() => { const pos = dolly(E14.pos, LET14, 0.72).pos; return { pos, look: aimY(pos, LET14, 58, 0.48, 0.5), fov: 58 }; })();
const MAIL14_V = V(BEAT.mailed) - 10, AP14_V = V(BEAT.apology) - 5, LET14_V = AP14_V + 20;
/** A5b: the BAIT insert ORBITS the bucket (~0.1 deg per video f, left + forward: the near lantern parallaxes) instead of
 *  trucking past it (the A5 slide carried the bucket out of frame right by ~2160) */
const S14T: V3 = S14I.look;
const ins14 = (f: number): Shot => {
  const a = -0.0017 * Math.max(0, V(f) - V(S[13].a - 4)), c = Math.cos(a), s = Math.sin(a), dx = S14I.pos[0] - S14T[0], dz = S14I.pos[2] - S14T[2];
  const pos: V3 = [S14T[0] + dx * c + dz * s, S14I.pos[1], S14T[2] - dx * s + dz * c];
  return yawAbout(dolly(pos, S14T, pushK(f, S[13].a - 4, 0.003), { fov: 36 }), -5);
};
// ---- shots 15-16 (A3): the dusk MCU on the tag, a x1.12 snap on "twice", then a short glide onto frame 0's own creep
// path, which shot 16 continues to the last frame (= P0 exactly) ----
const S15M = { pos: [0.15, 0.75, 3.85] as V3, look: [0.05, 1.1, TH.tourist[2]] as V3 }; // A6 P2: look x -0.03 -> +0.05 (margin for the callback lines at the settle) // A4: a LOW MCU tilted 0.14 m down: his eyes y ~740, the tag (~0.99 m) at y ~1095, clear above the caption
/** A4: shot 15 opens on a low 3/4 (2.7 m, right of him) and makes one push onto S15M; the snap is centred on the tag */
const S15A: Frame = { pos: [0.45, 0.82, 4.55], look: [0.08, 1.1, TH.tourist[2]], fov: 46 }; // A6 P2: look x -0.26 -> +0.08 (~6.5 deg right: MOSTLY A SMALL PIECE / AT A TIME. read whole from the first frame) // A5 P3: 0.2 m further left: the callback lines MOSTLY A SMALL PIECE / AT A TIME read whole
const TAG15: V3 = [TH.tourist[0] + 0.13, 0.99, TH.tourist[2] + 0.06]; // where CHAR's tag hangs at "twice" (measured)
const S15_FOV = 48, S15_SNAP = (2 * Math.atan(Math.tan((S15_FOV * Math.PI) / 360) / 1.12) * 180) / Math.PI;
const S15S: Frame = { pos: S15M.pos, look: lerp3(S15M.look, TAG15, 0.6), fov: S15_SNAP }; // the tag near the centre, his face high (hat whole)
/** frame 0's creep run backwards on the VIDEO clock. A5 (audit P2 "the seam stalls: 2415 is ON P0, then 0 is P0
 *  again, with uneven warp steps around it"): it reaches P0 one video frame AFTER the last frame (LOOP_LAND = VOICE_TOTAL
 *  = the frame the loop plays as 0), so 2414 -> 2415 -> 0 -> 1 are four equal 0.45 %/f creep steps; frame 2415 is P0
 *  one creep step back (0.45 % scale; set LOOP_LAND = VOICE_TOTAL - 1 for a bit-identical last frame instead) */
const LOOP_LAND = VOICE_TOTAL - 1; // A5b: the LOOP SEAM RULE (frame 0 = the last frame, identical) wins over the audit's one-frame-after idea
const loop16 = (f: number): Shot => dolly(P0.pos, P0.look, Math.exp(-P0_RATE * (V(f) - LOOP_LAND)), { fov: P0.fov });
const S16_IN = S[15].a - Math.floor(XFADE[16] / 2) + 2; // the glide is on the loop path by the dissolve's 3rd frame (shot 16 is at <= 30 % there)
const push15 = glideTo(hold(S15A.pos, S15A.look, S15A.fov, S[14].a - 4, 0.002), holdL({ pos: S15M.pos, look: S15M.look, fov: S15_FOV }, BEAT.twice - 3, 0.0035), S[14].a - 4, BEAT.twice - 3 - (S[14].a - 4));
// ---- shot 12: from behind the back row (4-5 pupils' backs in the lower third, the nearest >= 1.2 m from the lens),
// the teacher left of the chalk text; then one 70 f crane-swing up the window side to a front-3/4 of the honest
// student, the look gliding from the board to her face and her thought bubble ----
const STU: V3 = cl([CL.student[0], 1.02, CL.student[2] + 0.36]);
const OTS12 = { pos: cl([-3.1, 2.65, 2.85]), look: cl([-0.95, 1.32, -3.45]), fov: 44 }; // high at the back-left: the nearest pupil sits low-left under the caption
// A4: the over-the-shoulder now creeps 0.25 %/f AND trucks right from its first frame while the words appear (it read
// as locked for ~50 f); the finished "HALF THIS CLASS CHEATED." holds ~16 f; then a WHIP with a hidden cut (as in shot
// 8): part 1 pans right off the board (+20 deg in 10 f, ramping); part 2 enters already panning from the seated pupils
// behind her (-36 deg yaw decaying over 18 f; ~15 %W/f at the cut) and lands on the honest student before "everybody"
// A5 (audit P1 "the whip + hidden cut reads as a jump cut": the warp stretched whip12a to 2.6 deg/f, then a 1 f camera
// jump): ONE continuous 32 video-f crane-swing, no cut, from the over-the-shoulder round the west (window) side and down
// to the front 3/4 of the honest student, starting 4 f after "The other half" (~1900) and landing by "hears:" (~1932);
// a 0.2 %/f creep into "everybody" and on into the x1.1 push on "cheats." (no parked frames, P3). The opening truck is
// halved (P2: the teacher stayed whole with the whole chalk sentence until the swing)
const SW12_A = V(BEAT.otherHalf) - 5, SW12_D = 52, LAND12 = PV(SW12_A + SW12_D); // ~98 deg of view turn: A5b 4 f earlier, 46 f, the look turning over the whole move: peak ~15 %W/f at ~1918, hears (1927) at ~8 %/f, landed by ~1936 (blurred, continuous)
// (P2, render-checked: the A4 0.25 %/f push crept the teacher off the left edge and "HALF THIS" off the right by ~1900;
// now a 4 deg wider lens, a 0.15 %/f creep and the halved truck keep her >= 90 px inside and the whole sentence in
// until the swing. The pencil-chewing aisle pupil stays a soft partial at the right edge: see lead_requests / CHAR)
// A6 P3 (audit "the over-the-shoulder creeps ~0.15 %/f for 3.2 s"; "add a snap push onto the board on 'cheated.'"): the
// creep is 0.25 %/f and its look glides onto the centre of the chalk sentence by "cheated." (the block centres as it is
// written); on "cheated." a x1.12 snap in 4 video f (a zoom: the near pupil's head does not balloon; the teacher stays
// inside the left edge, the sentence whole), creeping on to the swing
const TXT12: V3 = cl([-0.72, 1.72, -3.44]), CHT12_V = V(BEAT.cheated) - 1, CHT12_Z = 1.12; // (render-checked: at x1.25 the writing teacher was cut in half by the left edge)
const ots12 = (f: number): Shot => {
  const u = glide(vt(f, S[11].a - 4, PV(CHT12_V) - (S[11].a - 4))), look = lerp3(OTS12.look, TXT12, 0.55 * u);
  const c = dolly(OTS12.pos, look, pushK(f, S[11].a - 4, 0.0025)), t = Math.max(0, V(f) - V(S[11].a - 4)), k = clamp01((V(f) - CHT12_V) / 4), z = 1 + (CHT12_Z - 1) * (1 - (1 - k) ** 2);
  return { pos: [c.pos[0] + 0.001 * t, c.pos[1], c.pos[2] - 0.0005 * t], look: [c.look[0] + 0.001 * t, c.look[1], c.look[2] - 0.0005 * t], fov: (2 * Math.atan(Math.tan((48 * Math.PI) / 360) / z) * 180) / Math.PI };
};
const END12 = { pos: cl([-3.0, 1.5, -1.85]), look: [STU[0] - 0.05, STU[1] + 0.06, STU[2] + 0.11] as V3, fov: 40 }; // A6 P3: look 0.12 m to the lens' right (the crib card's right edge <= ~1000 px through the 'cheats.' push)
const CHEATS12 = PW(25, "cheats");
const end12 = (f: number): Shot => dolly(END12.pos, END12.look, pushL(f, LAND12, 0.002), { fov: END12.fov });
// A5c (the 98 deg turn peaked at ~15 %W/f, twice the references' whip peak): 52 f (1 f earlier, landing on 'hears' + 13)
// and the lens BREATHES wide through the middle of the swing (+16 deg fov at the peak: the room opens up round her for a
// moment, every frame width carries ~30 % more of the turn): peak ~9.5 %W/f, the look still turning over the whole move
const fovBell = (s: (f: number) => Shot, f0: number, dur: number, d: number) => (f: number): Shot => { const c = full(s(f)); return { ...c, fov: c.fov + d * bell(vt(f, f0, dur)) }; };
const swing12 = fovBell(via(ots12, cl([-3.95, 2.45, 0.45]), end12, PV(SW12_A), LAND12 - PV(SW12_A), 0.02, 0.97, 0.0, 1.0), PV(SW12_A), LAND12 - PV(SW12_A), 16);

// ---- shot 4 (A3): the wide -> the text two-shot (lands by 292) -> a long-lens insert on the split-flap counter from
// her left, her soft hat brim on the right edge (a short glide: she slides right, never across the lens) -> the "14"
// reaction from a closer, wider lens (the whole board in frame, so no line is cut mid-word) -> crane back right of him
// (the 'piece' chip left of her feet below the caption) ----
// A5 P3: the opening is a real LOW wide (lens 0.75 m, tilted up ~10 deg): the board towers over the couple, the raven
// against the sky
const S4W = hold([0.5, 0.75, 8.6], [0, 2.3, 0], 50, S[3].a - 4, 0.003);
const S4V = hold([-0.3, 1.62, 5.75], [0.22, 1.62, TH.board.z], 55, BEAT.your + 8, 0.0025); // A6 P3: 3 deg wider (his head + shoulder >= 40 px inside the right edge until the arc slides them out; the board whole)
// A5 P3: the move onto the counter decays over >= 16 video f (look + zoom finish at 85 %, the dolly glides to the end)
const S4C_A = BEAT.vandalized - 2, S4C_D = 42;
/** A5b: a framing whose creep also runs BEFORE its landing frame (pushL), so a glide onto it never parks (the shot-4
 *  landings had 4-6 still video frames where the glide's ease-out met a creep that only started on landing) */
const holdT = (pos: V3, look: V3, fov: number, fL: number, rate = 0.003, roll = 0) => (f: number): Shot => dolly(pos, look, pushL(f, fL, rate), { fov, roll });
const S4C = holdT([-1.39, 1.52, 3.59], [TH.flip.x + 0.04, TH.flip.y - 0.08, TH.flip.z], 32, S4C_A + S4C_D, 0.003, -0.015); // A4: 15 % closer + tilted down: the counter ~55 % W at ~0.45 H (she is out of frame)
// A5 P2: the "14" reaction comes in front-loaded (80 % of the reframe by video ~500) so her shocked 'o' is whole on
// "a year,"; P3: tilted ~1.5 deg up so the raven's head clears the frame top
// A6 (LEAD P2 "the biggest number in the setup gets no image"; plan.ts TH.heap14 / TH.pock): after the counter's "14"
// (flaps land on the word) ONE 18 f whip pan left + crane down (peak ~19 %W/f, motion-blurred) to a LOW (0.35 m) 50 deg lens
// 3.9 m in front of TH.heap14: the 2.2 m heap of rainbow chips towers over the lens (top ~0.24 H, base ~0.82 H, both
// sides out of frame) as it drops in and squashes on "tons" (WORLD-EXT: see lead_requests), creeping in through "a
// year," -> "mostly a small piece at a time." = the pocket montage, hat-to-hip framings (the hip pocket ~0.6 H, above
// the caption): a 12 f pull right + up from the heap onto TH.pock[1] -> a whip right with ONE hidden cut at its fastest
// frame (the picture frame of the "a" after "mostly"; both sides ~3 deg/f = ~15 %W/f, the motion blur covers it) onto
// a two-deep MS from the front: TH.pock[0] near-left, TH.pock[2] far-right (11 deg apart, nobody between) -> a 10 f
// pan right + push with a rack focus from pock[0]'s pocket to pock[2]'s on "piece" -> a 22 f reveal pull-out onto
// shot 5's own opening camera (creep5), so the 4 -> 5 dissolve is a TRUE match (the same board, couple and lens)
const T14V = V(BEAT.tons14), MOSTLY_V = V(PW(8, "mostly"));
const HEAP_V = T14V + 1.5, HEAP_VD = 18;                                    // the whip to the heap: 506 -> 524
const HEAPC: V3 = [TH.heap14[0], 1.15, TH.heap14[2]];
const HEAP4 = orb(HEAPC, 172, 3.9, 0.35, 50, 0.5, 0.5);                       // lens ~[-2.86, 0.35, 2.26]: pock[1] / the board / the couple all out of frame
const POCK = (i: number): V3 => [TH.pock[i][0], 1.06, TH.pock[i][2]];        // hat-to-hip framing centre (the hip pocket ~0.88 m)
const HIP = (i: number): V3 => [TH.pock[i][0], 0.95, TH.pock[i][2]];
const CU4A = orb(POCK(1), 170, 2.45, 1.0, 34, 0.5, 0.5);                      // pock[1] (the heap soft behind him, left)
/** the two-deep MS: the lens 3.5 m out from pock[0] at bearing 170 (11 deg between them, a 4 deg gap), pock[0] at
 *  ~0.3 W (near), pock[2] at ~0.7 W (far); the board's right post just out of frame left */
const PAIR4P = around(POCK(0), 170, 3.5, 1.0);
const PAIR4 = { pos: PAIR4P, look: aimY(PAIR4P, POCK(0), 44, 0.3, 0.5), fov: 44 };
const PAIR4E = { pos: lerp3(PAIR4P, POCK(2), 0.12), look: aimY(lerp3(PAIR4P, POCK(2), 0.12), POCK(2), 40, 0.6, 0.5), fov: 40 }; // ... panned + pushed onto pock[2]
const CU4A_V = MOSTLY_V - 6, CU4A_VD = 12, CU4_CUT = PW(8, "mostly") + 12;  // the hidden cut sits on the picture frame of the "a" after "mostly" (an integer: the blur never samples across it)
const CUTV4 = V(CU4_CUT), WOUT_D = 6, WIN_D = 8, WOUT_DEG = 6, WIN_DEG = (WOUT_DEG * WIN_D) / WOUT_D; // both sides of the cut at 3 x 6 / 6 = 3 deg/f
const PAIR_V = V(PW(8, "small")) + 3, PAIR_VD = 10, PULL4_V = V(PW(8, "at")) + 1, PULL4_VD = 22;
const e3i = (u: number) => clamp01(u) ** 3, e3o = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const cu4a = (f: number): Shot => yawAbout(holdL(CU4A, PV(CU4A_V + CU4A_VD), 0.003)(f), WOUT_DEG * e3i((V(f) - (CUTV4 - WOUT_D)) / WOUT_D)); // ... whipping right into the cut
const pair4 = (f: number): Shot => yawAbout(holdL(PAIR4, PV(CUTV4 + WIN_D), 0.003)(f), -WIN_DEG * (1 - e3o((V(f) - CUTV4) / WIN_D)));  // ... still whipping right out of it
/** shot 5's opening camera with its creep (and slide) also running BEFORE its start, so the pull-back lands on a moving
 *  camera; from S[4].a - 6 on it is creep5 exactly (the 4 -> 5 dissolve is a true match) */
const creep5L = (f: number): Shot => { const c = dolly(S5A.pos, S5A.look, pushL(f, S[4].a - 6, 0.0028), { fov: S5A.fov }), t = V(f) - V(S[4].a - 6);
  return { ...c, pos: [c.pos[0] - 0.004 * t, c.pos[1], c.pos[2]], look: [c.look[0] - 0.004 * t, c.look[1], c.look[2]] }; };

// ---- shot 3 (A5): the MS creep + one small symmetric bell push (x1.06, 14 f) centred on the guilty stare to the lens ----
// A6 P2 (his cap + face were carried off the left edge by the +x truck under the push + guilt bell): the look aims
// 0.15 m nearer him and the drift runs the other way (-1.5 mm/f), so his head stays >= 60 px (540) inside the left edge
const MS3 = slide(hold(T(VISTA.pocketTourist, [-0.95, 1.0, 3.05]), T(VISTA.pocketTourist, [0.3, 0.72, 0.0]), 47, S[2].a + 19, 0.0025), S[2].a + 19, [-0.0008, 0, 0]); // R7 (A7 P3): aimed 0.08 m lower (the hip pocket <= ~0.62 H, over the caption), 0.25 %/f
const GUILT3 = BEAT.pocketing + 17;

// =====================================================================================================================
// ROUND 7 CAM: CALM + READABLE (the user watched preview 7: "too fast": moves, framing changes, boards with no read time,
// shots too close). Every framing holds ~2.5-4 s with a 0.15-0.3 %/f creep; reframes are smootherstep glides of 44-100
// VIDEO f (zoom <= ~1.5 %/f, pan <= ~1 %W/f); exactly TWO comic snaps in the film ("now" in shot 5, "twice" in shot 15);
// no whips, no dives, no crash punch-ins (the old rock dive, heap whip, pocket montage, chip insert, clipboard dive, LED
// punch, classroom swing, permission snap and mail punch-in are gone). Where two story things cannot share one frame and
// no calm move fits between them in the time (the two signs 3.2 m apart = ~1.5 frame widths at a readable size; the
// chalk board vs the pupil's face, 180 deg apart) the shot makes ONE clean straight cut on the narration's clause change
// (shots 8, 9, 10, 12; integer picture frames, so the motion blur never samples across), both sides creeping.
// Every key frame here is a VIDEO frame anchored to the NEW narration (script v2) through VOICE_WORDS, so the fast
// picture-clock windows (the warp's 1.5-1.6x squeezes) never squeeze a camera move.
// =====================================================================================================================
const normW = (w: string) => w.toLowerCase().replace(/[^a-z0-9%']/g, "");
/** the VIDEO frame where the narration's word w starts (the first one at or after video frame `after`) */
const vw = (w: string, after = 0) => { const x = VOICE_WORDS.find((q) => q.f >= after && normW(q.w) === w); return x ? x.f : after; };
/** ... and where it ends */
const vwe = (w: string, after = 0) => { const x = VOICE_WORDS.find((q) => q.f >= after && normW(q.w) === w); return x ? x.fe : after; };
/** the lens zoomed by z (vertical fov) */
const fovZ = (fov: number, z: number) => (2 * Math.atan(Math.tan((fov * Math.PI) / 360) / z) * 180) / Math.PI;
/** a straight cut key at the integer picture frame of video frame v (the motion blur samples inside one picture frame) */
const CUT = (v: number, s: (f: number) => Shot): Key => ({ f: Math.round(PV(v)), cut: true, s });

// ---- shot 1: P0 (frame 0) creeping 0.25 %/f -> ONE slow arc left (62 f) onto the low 3/4 under the whole board, landed
// before "paperclip" (the bubble joke plays on a held frame) -> a 2.6 s hold creeping 0.22 %/f ("Then she read one
// sign...", the board ~85 % W: every row >= ~50 px) -> ONE 48 f crane-up glide onto her scheming MCU (a 48 deg lens:
// head ~0.57 W, hat 280 px under the frame top, the brim inside both edges, eyes ~0.32 H; the glinting rock at ~0.74 W /
// 0.65 H, above the caption band) landing 3 f before "steal." -> a 0.2 %/f creep into the 10 f dissolve (no snap, no dive)
const R1_ARC_VD = 62, R1_ARC_V = vw("paperclip") - 5 - R1_ARC_VD;          // video 18 -> 80
const MCU1B = orb(HER, 192, 2.8, 1.45, 48, 0.42, 0.32);
const R1_MCU_VD = 96, R1_MCU_V = vw("steal") - 3 - R1_MCU_VD;              // video 108 -> 204 (a slow 3.2 s crane: peak ~1 %H/f)
// ---- shot 2: a calm establishing crane: from a low lens over the sliced log (the trail, the PETRIFIED FOREST sign, the
// walkers) it rises 2.8 m and backs off onto the high vista wide (the old V2E), one 80 f bell from inside the 1 -> 2
// dissolve to the 2 -> 3 dissolve (no dive carried in: the hook ends on a creep) ----
const V2S: Frame = { pos: [-34, 2.4, -24.5], look: along([-34, 2.4, -24.5], dirB(56, -4), 14), fov: 56 };
const V2W2: Frame = { pos: V2E, look: along(V2E, V2END, 14), fov: 58 };
const R2_V0 = V(S[1].a) - 12, R2_VD = 80;
// ---- shot 4 (253 f, "So the park put up a warning: It said... Warning! 14 tons stolen every year... one small piece at
// a time."): THREE framings, two 46-56 f glides, no whips / montage. (A) the low wide (the board towers over the couple)
// creeping 0.3 %/f -> (B) a 46 f glide that lands on "Warning!" + 10 on the board-read two-shot (the board ~63 % W: the
// title ~50 px, the fact lines ~50 px, the qualifier lines ~39 px; the 14 TONS / YEAR counter whole at the left post;
// both heads whole under it), held ~45 f through "14 tons" (the counter flips in this frame) -> (C) a 52 f pull-back +
// pan left that lands on the end of "year..." on the heap wide (the board ~39 % W centre-right, the couple below it, the
// whole heap site left, TH.pock[1] in front of it): the heap's drop lands in the pause after "year..." on a HELD frame
// (WORLD-EXT re-time, lead_requests) and "one small piece at a time" plays on it (pock[1]'s 3-beat pocket gag) ----
const S4B: Frame = { pos: dolly([-0.3, 1.62, 5.75], [0.22, 1.62, TH.board.z], 1.07).pos, look: [0.22, 1.62, TH.board.z], fov: 55 }; // (the A6 S4V 7 % further back: the board ~59 % W, nearer the heap wide's scale)
const S4H: Frame = { pos: [0.3, 1.0, 9.6], look: [-1.4, 1.95, 0], fov: 54 };
const R4_B_VD = 46, R4_B_V = vw("warning", 440) + 4 - R4_B_VD;             // video 410 -> 456
const R4_C_VD = 70, R4_C_V = vwe("year") - R4_C_VD;                        // video 480 -> 550
// ---- shot 5: the two-shot (creeping 0.25 %/f, drifting 1.2 mm/f TOWARD him: A7 P2 the old slide trucked away from him)
// -> ONE 44 f glide onto the two-head MCU (A7 P1: a 48 deg lens 0.35 m further back, aimed 0.15 m toward her: her brim
// and his head both >= ~90 px inside the edges, eyes ~0.53 H) landed 2 f before "We'd", creeping 0.15 %/f through the
// whisper (with the old 2.6 deg bank toward her, level again by "now") -> COMIC SNAP #1 on "now": x1.06 in 5 f
// (front-loaded), both faces whole (her smug smirk + his goggle shock: A7 P3), then a 0.12 %/f settle ----
const MCU5B: Frame = { pos: [0.5, 1.22, 5.75], look: [0.5, 1.38, 1.92], fov: 48 };
const R5_M_VD = 44, R5_M_L = vw("we'd") - 2, R5_M_V = R5_M_L - R5_M_VD;   // video 690 -> 734
const R5_N_V = vw("now") - 1;                                               // 775: the snap
const S5NB: Frame = (() => { const k = Math.exp(-0.0015 * (R5_N_V - R5_M_L)), c = dolly(MCU5B.pos, MCU5B.look, k);
  return { pos: c.pos, look: [MCU5B.look[0] - 0.04, MCU5B.look[1] - 0.02, MCU5B.look[2]], fov: fovZ(MCU5B.fov, 1.06) }; })(); // (render-checked r7a: x1.08 put her brim tip ~40 px from the left edge)
const creep5b = slide(hold(S5A.pos, S5A.look, S5A.fov, S[4].a - 6, 0.0025), S[4].a - 6, [0.0012, 0, 0]);
// ---- shot 6 MYSTERY ("But why would a warning make an honest person want to steal?"): ONE slow 98 f push (arc right +
// crane up over her shoulder) from the low 3/4 behind the couple to the over-the-shoulder of the WHOLE board (every row
// readable, the raven + the '?' on its top rail, her hat brim soft in the foreground), landing on "steal?" + 4, then a
// 0.25 %/f creep into the dissolve. Peak ~1 %/f: the question gets the slowest, most deliberate move of the film (the
// old raven push-in is gone: the raven's head tilt plays on the whole board) ----
const S6E2: Frame = { pos: [-0.35, 1.38, 5.25], look: [-0.05, 2.75, TH.board.z], fov: 50 };
const R6_V0 = V(S[5].a) - 6, R6_L = vw("steal", 880) + 4;                  // video 802 -> 900
const arc6b = via(holdL(S6A, PV(R6_V0), 0.0015), [-0.85, 1.18, 5.85], holdL(S6E2, PV(R6_L), 0.0025), PV(R6_V0), PV(R6_L) - PV(R6_V0), 0.15, 1.0, 0, 1);
// ---- shot 7: the opening medium-wide (he on the right third, the trail heads + the tarp-covered Sign B behind) is
// already gliding in the 6 -> 7 dissolve: ONE 64 f push + 10 deg arc onto the MS (A7 P1/P3: a 44 deg lens, 5 % wider
// than the old 40, aimed 0.03 m lower so the clipboard + pen hand clear the caption) landing on "Robert", then a real
// creep: 0.25 %/f + a ~4 deg orbit (the lens slides 2.5 mm/f round him) through "Cialdini, tested it." (his nod) into
// the 10 f dissolve (no clipboard dive) ----
const OPEN7: Frame = (() => { const p = around(PROF, 213, 3.7, 1.18); return { pos: p, look: aim(p, PROF, 50, 0.6, 1.02), fov: 50 }; })();
const MS7: Frame = (() => { const p = around(PROF, 224, 2.75, 1.3); return { pos: p, look: aim(p, PROF, 44, 0.56, 1.01), fov: 44 }; })();
const R7_V0 = V(S[6].a) - 10, R7_L = vw("robert");                         // video 906 -> 975
// ---- shot 8: the kneeling pair MS (gap8: the chip + its white dot in the brush hand, the stopwatch) creeping 0.28 %/f
// through "His team hid marked wood" (A7 P1: the x3.2 insert with the headless torsos is dropped) -> a straight cut on
// "the trails," to the three trail heads wide (JASPER, LONG LOGS, CRYSTAL, Sign A + the swapping assistant), creeping in
// 0.3 %/f toward Sign A through "kept swapping the signs." (no swing, no push to a match frame: shot 9 opens on a
// different, closer picture, A7 P2) ----
const R8_CUT = vw("the", 1085);                                            // video 1090
const W8B: Frame = { pos: dolly(W8.pos, W8.look, 0.8).pos, look: W8.look, fov: W8.fov }; // (render-checked r7a: the old wide 1.25x nearer: Sign A, the swapping assistant and the JASPER / LONG LOGS markers read)
const wide8b = holdL(W8B, PV(R8_CUT), 0.003);
// ---- shot 9: Sign A's MS (the panel ~43 % W: PLEASE DON'T / TAKE THE WOOD. caps ~55 px), creeping 0.25 %/f + a 1.5
// mm/f truck right through "One sign said: Please don't take the wood." (~90 f) -> a straight cut on "The other said:" to
// Sign B's MS (A7 P2: the lens 0.4 m further left so reader B's cap clears the three-thief pictogram; aimed 0.1 m lower
// so his pocketing hip sits >= 60 px over the caption), creeping the same way through "Many visitors take the wood."
// (~100 f) into the 11 f dissolve ----
const R9_CUT = vw("the", 1250);                                            // video 1256
const S9B2: Frame = { pos: tt([-0.2, 1.42, 4.6]), look: tt([0.05, 1.1, 0]), fov: 52 }; // (render-checked r7a: 0.25 m further left again: reader B's cap ~26 px clear of the panel's right edge)
// ---- shot 10: Sign A + its LED (rolling to the 2 %) + the tourist who puts the chip back (A7 P2: aimed 0.15 m lower:
// his pick-up rides above the caption), creeping -> a straight cut on "With "many visitors"" to the Sign B crowd
// (orbiting slowly right, creeping in) -> ONE 46 f push that lands 2 f before "8%." on the LED + panel with 2-3 cheering
// faces whole along the bottom (no crash punch), then a slow settle into the 12 f pivot dissolve ----
const S10A2: Frame = { pos: tt([-2.6, 1.3, 5.2]), look: tt([-2.85, 1.0, 0.6]), fov: 50 };
const R10_CUT = vw("with", 1450);                                          // video 1456
const S10L3: Frame = { pos: tt([0.12, 2.6, 5.4]), look: tt([0.1, 1.42, 0]), fov: 52 }; // (high: the crowd heads ride under the panel text, the LED on top; render-checked r7a: 0.7 m further back, all five faces >= ~130 px inside the edges)
const R10_L_VD = 46, R10_L_V = vw("8%") - 2 - R10_L_VD;                    // video 1468 -> 1514
// ---- shot 11: the old cameras (already calm, peaks < 1.4 %/f) with the quote push 21 f earlier (A7 P2: on "steal", so
// the floating panel's letters read >= ~38 px through "doesn't sound like a warning") and the "everyone" reveal a
// slower, smaller 64 f pull-out (peak ~1.6 %/f, was 4.3) ----
const R11_P_V = vw("steal", 1700), R11_P_VD = 52;
const R11_E_V = vw("everyone") - 16, R11_E_VD = 70;
const B11R2: Frame = { pos: bp([0.85, 4.9, 9.0]), look: bp([0.6, 0.05, -1.6]), fov: 54 };
// ---- shot 12: the over-the-shoulder from behind the back row, 0.6 m further right and 3 deg wider (A7 P2: two seated
// pupils' heads fill the lower right third), creeping 0.25 %/f while "HALF THIS CLASS CHEATED." is written (no snap on
// "cheated.": A7 P1, the teacher's head stays whole) -> a straight cut on "The other half" to the front 3/4 of the
// honest student (creeping 0.25 %/f: A7 P3) -> ONE 44 f x1.1 push centred on "everybody cheats." (no 1 f jolt) ----
// (render-checked geometry: the diagonal from the back-left corner keeps the teacher's head >= ~60 px inside the left edge
// even after her step left, the whole sentence, and a front-row pupil's back low in the frame; a 0.2 %/f creep toward the
// gap between her and the text + a slow truck right, the look fixed: no glide that pushes her off the edge)
const OTS12C: Frame = { pos: cl([-3.6, 2.45, 3.0]), look: cl([-0.55, 1.3, -3.45]), fov: 56 }; // (render-checked r7a: the chalk block runs to board x ~1.1 m; now the whole sentence + the teacher after her step left)
const ots12b = slide(hold(OTS12C.pos, OTS12C.look, OTS12C.fov, S[11].a - 4, 0.0012), S[11].a - 4, [0.0006, 0, 0]);
const R12_CUT = vw("the", 1960);                                           // video 1964
const R12_P_VD = 44, R12_P_V = vw("everybody") - 12;                       // video 1994 -> 2038
// ---- shot 13: the low backlit wide creeping 0.25 %/f through "The sign didn't stop thieves." -> ONE 56 f push with a
// small arc right (the posts parallax against the mesas: A7 P3) onto Sign B, landed 4 f before "permission." on a WIDER
// payoff frame (A7 P2: x1.1 over the old MS, not x1.2-1.3: both flankers' faces whole) -> the stamp slams on a held frame
// (the kick only) -> a slow 0.15 %/f pull + rise into the dissolve ----
const S13P: Frame = (() => { const k = Math.exp(-0.0015 * 20), c = dolly(S13M.pos, S13M.look, k); return { pos: c.pos, look: [S13M.look[0] - 0.03, S13M.look[1], S13M.look[2]], fov: S13M.fov }; })(); // (projection-checked: the flankers' faces at ~0.17 / ~0.81 W)
const R13_VD = 68, R13_L = vw("permission") - 4, R13_V = R13_L - R13_VD;  // video 2089 -> 2157
// ---- shot 14: three framings, two 44-48 f glides (no punch-ins): (A) the pile MS (the BAIT bucket + his scoop hand, the
// whole CONSCIENCE PILE stencil, the joke notes) creeping 0.25 %/f through "And the bait wood? It came from the park's
// conscience pile:" -> (B) a 46 f push (x~1.35, not the old x2) onto the brass MAIL slot + the LETTERS THIS YEAR counter
// with the chute down to the pile, landed before the parcel drops on "mailed back" (A7 P2: it plays on a held frame) ->
// (C) a 44 f glide back + right onto him with the SORRY! letter ("with apology letters."), creeping into the dissolve ----
const M14B: Frame = (() => { const pos = dolly(P14.pos, SLOT14, 0.84).pos; return { pos, look: aimY(pos, SLOT14, 50, 0.42, 0.42), fov: 50 }; })();
const E14B: Frame = (() => { const pos = dolly(E14.pos, LET14, 0.86).pos; return { pos, look: aimY(pos, LET14, 58, 0.5, 0.5), fov: 58 }; })();
const R14_M_VD = 46, R14_M_V = vw("pieces", 2300) + 18 - R14_M_VD;         // video 2281 -> 2327
const R14_E_VD = 60, R14_E_V = vw("with", 2365) - 6;                       // video 2366 -> 2426 (still gliding in the 14 -> 15 dissolve)
// ---- shot 15: a true low 3/4 from his right (A7 P3: no mugshot) that arcs ~8 deg left while it pushes (one 48 f glide,
// peak ~1 %/f) onto the low MCU (re-aimed 0.06 m higher: A7 P2, the frame top no longer slices a board row) landed on
// "stolen" -> COMIC SNAP #2 on "twice.": x1.12 in 5 f centred on the tag (TIMES STOLEN: 1 -> 2), held (0.15 %/f) to the
// end of the shot; the 15 -> 16 dissolve is a plain one (A7 P1/P2: no yank onto the loop path; shot 16 = frame 0's creep) ----
const S15A2: Frame = { pos: [0.72, 0.84, 4.5], look: [-0.02, 1.2, TH.tourist[2]], fov: 48 };
// (projected on WORLD-EXT's new warnLayout rows: the look 0.1 m up + 0.08 m left: 14 TONS STOLEN / EVERY YEAR / ONE SMALL
// PIECE / AT A TIME. whole under the frame top, the flip counter whole at the left edge, the tag above the caption)
const S15M2: Frame = { pos: S15M.pos, look: [S15M.look[0] - 0.08, S15M.look[1] + 0.1, S15M.look[2]], fov: S15_FOV };
const S15S2: Frame = { pos: S15M2.pos, look: lerp3(S15M2.look, TAG15, 0.55), fov: S15_SNAP };
const R15_L = vw("stolen", 2440) + 4, R15_V0 = V(S[14].a) - 6;             // video 2414 -> 2456
const R15_S_V = vw("twice") - 2;                                           // 2473: the snap

const CAMS: Record<number, Key[]> = {
  // 1 HOOK: P0 creep -> a slow arc onto the low 3/4 (the whole board above her, the paperclip bubble) -> the MCU glide
  1: [
    { f: 0, s: p0dec },
    VK(R1_ARC_V, R1_ARC_VD, holdL(K3N, PV(R1_ARC_V + R1_ARC_VD), 0.0022)),
    VK(R1_MCU_V, R1_MCU_VD, holdL(MCU1B, PV(R1_MCU_V + R1_MCU_VD), 0.002)),
  ],
  // 2 VISTA: one calm crane up + back over the painted badlands
  2: [{ f: S[1].a - 4, s: holdL(V2S, PV(R2_V0), 0.0012) }, VK(R2_V0, R2_VD, holdL(V2W2, PV(R2_V0 + R2_VD), -0.0012))],
  // 3 POCKETING: the wider MS on the same line -> an ease-out push from the dissolve into the MS creep (aimed 0.08 m lower:
  //   A7 P3, the hip pocket over the caption) -> a small x1.07 bell on his guilty stare, the creep running under it
  3: [
    { f: S[2].a - 4, s: hold(T(VISTA.pocketTourist, [-1.4, 1.13, 4.25]), T(VISTA.pocketTourist, [0.3, 0.74, -0.1]), 48, S[2].a - 4, 0.003) },
    { f: S[2].a - 4, dur: 36, ease: (u) => 1 - (1 - clamp01(u)) ** 2, s: MS3 },
    VK(V(GUILT3) - 15, 30, (f) => { const c = MS3(f); return { ...c, ...dolly(c.pos, c.look, 1 / 1.07) }; }), // (A7 P3: x1.07 over 30 video f, the MS3 creep running under it)
  ],
  // 4 THE SIGN: low wide -> the board-read two-shot ("Warning!", the 14 counter) -> the heap wide ("one small piece...")
  4: [
    { f: S[3].a - 4, s: S4W },
    VK(R4_B_V, R4_B_VD, holdL(S4B, PV(R4_B_V + R4_B_VD), 0.002)),
    VK(R4_C_V, R4_C_VD, holdL(S4H, PV(R4_C_V + R4_C_VD), 0.002)),
  ],
  // 5 WHISPER: two-shot -> the two-head MCU on "whispered" -> COMIC SNAP #1 on "now"
  5: [
    { f: S[4].a - 6, s: creep5b },
    VK(R5_M_V, R5_M_VD, bank(holdL(MCU5B, PV(R5_M_L), 0.0015), PV(R5_M_V), PV(R5_N_V) - PV(R5_M_V), 0.03)),
    { f: PV(R5_N_V), vd: 5, ease: punch, s: holdL(S5NB, PV(R5_N_V + 5), 0.0012) },
  ],
  // 6 MYSTERY: one slow push over her shoulder onto the whole board
  6: [{ f: S[5].a - 4, s: arc6b }],
  // 7 THE PROFESSOR: the medium-wide gliding into the MS (lands on "Robert"), creeping + orbiting
  7: [
    { f: S[6].a - 4, s: holdL(OPEN7, PV(R7_V0), 0.002) },
    VK(R7_V0, R7_L - R7_V0, orbitL(MS7, PV(R7_L), 0.0025, [0.0018, 0, -0.0017])),
  ],
  // 8 THE TEAM: the kneeling pair MS -> cut on "the trails," -> the trail heads wide, creeping toward Sign A
  8: [
    { f: S[7].a - 4, s: gap8 },
    CUT(R8_CUT, wide8b),
  ],
  // 9 THE TWO SIGNS: Sign A MS -> cut on "The other said:" -> Sign B MS
  9: [
    { f: S[8].a - 4, s: creepL(S9A, PV(V(S[8].a)), 0.0025, [0.0015, 0, 0]) },
    CUT(R9_CUT, creepL(S9B2, PV(R9_CUT), 0.0025, [0.0015, 0, 0])),
  ],
  // 10 RESULTS: Sign A + the put-back -> cut on "With many visitors" -> the crowd -> one push onto the 7.92 % LED
  10: [
    { f: S[9].a - 5, s: creepL(S10A2, S[9].a, 0.0025, [0.0015, 0, 0]) },
    CUT(R10_CUT, orbitL(S10B3, PV(R10_CUT), 0.002, [0.003, 0, 0])),
    VK(R10_L_V, R10_L_VD, holdL(S10L3, PV(R10_L_V + R10_L_VD), 0.0012)),
  ],
  // 11 PIVOT: close on him, pulling slowly -> the follow of his walk up to the panel landing -> the slow orbit -> the
  //   quote push (on "steal") -> the slower "everyone" reveal
  11: [
    { f: S[10].a - 4, s: open11 },
    { f: FOL11_A, cut: true, s: FOL11 },
    { f: BEAT.manySteal + 22, cut: true, s: drift11 },
    VK(R11_P_V, R11_P_VD, push11),
    VK(R11_E_V, R11_E_VD, bank(holdL(B11R2, PV(R11_E_V + R11_E_VD), -0.0015), PV(R11_E_V), PV(R11_E_V + R11_E_VD) - PV(R11_E_V), 0.035)),
  ],
  // 12 CLASSROOM: the over-the-shoulder (no snap) -> cut on "The other half" -> the honest student -> a x1.1 push
  12: [
    { f: S[11].a - 4, s: ots12b },
    CUT(R12_CUT, end12),
    VK(R12_P_V, R12_P_VD, (f) => dolly(END12.pos, END12.look, pushL(f, PV(R12_P_V + R12_P_VD), 0.002) / 1.1, { fov: END12.fov })),
  ],
  // 13 PERMISSION: the backlit wide creeping -> one push + small arc onto Sign B before the stamp -> a slow pull + rise
  13: [
    { f: S[12].a - 4, s: holdF(S13A, S[12].a - 4, 0.0025) },
    { f: PV(R13_V), cut: true, s: via(holdF(S13A, S[12].a - 4, 0.0025), tt([0.42, 1.25, 4.45]), slide(hold(S13P.pos, S13P.look, S13P.fov, PV(R13_L), -0.0015), PV(R13_L), [0, 0.002, 0]), PV(R13_V), PV(R13_L) - PV(R13_V), 0, 1, 0, 1) },
  ],
  // 14 STOREROOM: the pile MS -> the MAIL slot + counter (the parcel drops on a held frame) -> him + the SORRY! letter
  14: [
    { f: S[13].a - 4, s: holdL(P14, PV(V(S[13].a) + 40), 0.0025) },
    VK(R14_M_V, R14_M_VD, holdL(M14B, PV(R14_M_V + R14_M_VD), 0.002)),
    VK(R14_E_V, R14_E_VD, holdL(E14B, PV(R14_E_V + R14_E_VD), 0.002)),
  ],
  // 15 DUSK: the low 3/4 -> one arc + push onto the MCU -> COMIC SNAP #2 on "twice." (held to the end)
  15: [
    { f: S[14].a - 4, s: glideTo(holdL(S15A2, PV(R15_V0), 0.002), holdL(S15M2, PV(R15_L), 0.002), PV(R15_V0), PV(R15_L) - PV(R15_V0)) },
    { f: PV(R15_S_V), vd: 5, ease: punch, s: holdL(S15S2, PV(R15_S_V + 5), 0.0015) },
  ],
  // 16 LOOP: frame 0's own creep run backwards on the VIDEO clock: a steady 0.25 %/f push that lands EXACTLY on P0 on
  //   the last frame (= frame 0)
  16: [{ f: S[15].a - 6, s: loop16 }],
};

// impact kicks: the image offset flips sign every frame and decays over n frames (stamp slam ~13 px; small mailbox clunk)
// R7 (calm): the stamp slam keeps its comic jolt (~13 px, it is an impact in the world, not a camera move); the parcel
// clunk and the cha-ching are a touch smaller
const KICKS: [number, number, number][] = [[PV(V(BEAT.permission) - 2.5) / FPS, 3.0, 10] /* LEAD A6: kick with the stamp slam (STAMP_F) */, [(BEAT.mailed + 3) / FPS, 0.6, 6], [(BEAT.pct8 + 1) / FPS, 0.7, 6]] /* parcel lands at mailed+3; a ~5 px kick on the cha-ching */;
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g, n0] of KICKS) {
    const n = Math.floor(V(t * FPS) - V(t0 * FPS) + 1e-6); // A5: the jolt flips sign every VIDEO frame (it read as a slow wobble at 0.5x)
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
const SUN_WORLD: Record<number, number> = { 1: -11.1, 2: 35.2, 3: -3.0, 4: -11.1, 5: -11.1, 6: -11.1, 7: -22.4, 8: -22.4, 9: -22.4, 10: -21.8, 11: -47.7, 15: -128, 16: -11.1 }; /* WORLD-INT A7: low dusk key behind-left of the tourist */
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
  // R7: a straight cut between f and f + 1 is not motion (no blur / shutter on the frame before a cut): measure the step
  // on the side of the cut that f belongs to
  const cutIn = (CAMS[id] ?? []).some((k) => k.cut && k.f > f && k.f <= f + 1) && !(CAMS[id] ?? []).some((k) => k.cut && k.f > f - 1 && k.f <= f);
  const c0 = camAt(id, cutIn ? f - 1 : f), c1 = camAt(id, cutIn ? f : f + 1);
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
/** A5: a rack focus: the focus point glides from a to b over the picture window [f0, f0 + dur] (video-timed smootherstep) */
const rack = (a: V3, b: V3, f0: number, dur: number) => (f: number): V3 => lerp3(a, b, glide(vt(f, f0, dur)));
/** R7: a DOF ramp over a VIDEO window (v0, vd) */
const DV = (v0: number, vd: number, cInf: number, focus?: (f: number) => V3): Dof => ({ f: PV(v0), dur: PV(v0 + vd) - PV(v0), cInf, ...(focus ? { focus } : {}) });
/** R7: a DOF switch exactly at a cut (integer picture frame of video frame v) */
const DC = (v: number, cInf: number, focus?: (f: number) => V3): Dof => ({ f: Math.round(PV(v)), cInf, ...(focus ? { focus } : {}) });
const DOFS: Record<number, Dof[]> = {
  // P0 (frame 0 and the last frame) uses cInf 6 in BOTH shot 1 and shot 16 so the loop frame is identical and the board reads
  1: [{ f: 0, cInf: 6, focus: eyes(TH.woman) }, DV(R1_ARC_V, R1_ARC_VD, 4, eyes(TH.woman)),   // the board stays sharp on the 3/4 (every row reads)
    DV(R1_MCU_V, R1_MCU_VD, 10, eyes(TH.woman))],                                              // the MCU: her face sharp, the board + rock soft-ish
  2: [{ f: 0, cInf: 2 }],                                                                       // the vista wide: sharp
  3: [{ f: 0, cInf: 8, focus: eyes(VISTA.pocketTourist) }],                                     // the plaque (4.8 m) stays within ~3 px blur: its caps read
  4: [{ f: 0, cInf: 2 }, DV(R4_B_V, R4_B_VD, 4, () => [0, 2.9, TH.board.z]),                  // the board read: the board sharp, the couple a touch soft
    DV(R4_C_V, R4_C_VD, 2, () => [-1.4, 1.2, 0.6])],                                            // the heap wide: everything nearly sharp
  // the faces in focus from the whisper glide on; the board falls soft (~7 px: A7 P3, the eye goes to the faces)
  5: [{ f: 0, cInf: 8, focus: () => [0.3, EYE, 1.7] }, DV(R5_M_V, R5_M_VD, 16, () => [0.42, EYE, 1.9])],
  6: [{ f: 0, cInf: 6, focus: () => [0.4, EYE, 1.9] }, DV(R6_V0 + 20, 50, 10, () => [0, 2.9, TH.board.z])], // the couple in focus, then the board sharp + her brim soft
  7: [{ f: 0, cInf: 5, focus: () => [PROF[0], 1.34, PROF[2]] }, DV(R7_V0, R7_L - R7_V0, 10, () => [PROF[0], 1.34, PROF[2]])],
  8: [{ f: 0, cInf: 11, focus: () => CHIP8 }, DC(R8_CUT, 3, () => tt([-2.6, 1.3, 0.4]))],    // the pair MS (the chip sharp) -> the trails wide (markers sharp)
  9: [{ f: 0, cInf: 4, focus: () => tt([TT.signA.dx, TT.signA.cy, 0.3]) }, DC(R9_CUT, 4, () => tt([TT.signB.dx, TT.signB.cy, 0.3]))],
  10: [{ f: 0, cInf: 4, focus: () => tt([TT.signA.dx, 1.3, 0.4]) }, DC(R10_CUT, 6, () => LEDB), DV(R10_L_V, R10_L_VD, 7, () => LEDB)],
  11: [{ f: 0, cInf: 0 }, { f: BEAT.manySteal + 14, dur: 12, cInf: 6, focus: () => bp(BP.signFloat) }, DV(R11_E_V, 14, 0)],
  12: [{ f: 0, cInf: 8, focus: () => cl([CL.teacher[0], 1.5, CL.teacher[2]]) },                // the teacher + board sharp, the near pupils soft
    DC(R12_CUT, 10, () => STU)],                                                                // the honest student sharp, the room soft
  13: [{ f: 0, cInf: 4 }],
  14: [{ f: 0, cInf: 7, focus: () => sr([0.45, 0.8, -1.0]) },                                  // the pile MS: the stencil, bucket and notes read
    DV(R14_M_V, R14_M_VD, 10, () => SLOT14),                                                    // the mail slot + counter sharp, the room soft
    DV(R14_E_V, R14_E_VD, 9, () => LET14)],                                                     // him + the SORRY! letter
  // 15: background life readable before the push, the board soft behind him and the tag from "stolen"
  15: [{ f: 0, cInf: 5, focus: eyes(TH.tourist) }, DV(R15_L - 14, 18, 11, () => TAG15)],
  16: [{ f: 0, cInf: 6, focus: eyes(TH.woman) }],
};
export const dofAt = (id: number, f: number) => {
  const L = DOFS[id] ?? [{ f: 0, cInf: 0 }];
  const a = SHOTS[id - 1].a;
  let i = 0; while (i + 1 < L.length && f >= (L[i + 1].f || a)) i++;
  const d = L[i], p = L[Math.max(0, i - 1)];
  const k = d.dur ? clamp01(vt(f, d.f, d.dur)) : 1; // A5: ramps on the video clock
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus ?? p.focus };
};
export { wi, WORDS, W, WE, PW, PWE };

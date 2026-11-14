// Timeline of "The Oil Tanks That Were Mostly Water" (saladoil): shots, light states, cameras, lens blur and impact kicks,
// all keyed to the FINAL voice (words.ts, generated from sound/saladoil/voice/words.json; 89.8 s since the 2026-11-14 fact-fix re-voice; the user's cut list
// applied: phrases 4 and 12 are not spoken, so PW(4, ...) / PW(12, ...) do not exist). The picture is timed directly on
// this voice: voicewarp.ts is an IDENTITY map (tools/voice_warp.py --identity), so V(f) = f and PV(v) = v, but every
// helper still goes through V / PV so a later re-voice can warp the picture without touching this file.
// Grammar: study/CHANNEL_STYLE_BIBLE.md section 13, overridden by the user's standing PACING direction: framings hold
// >= 2.5-3 s with a gentle creep (0.12-0.3 %/f), favour medium / wide, at most one gentle move per framing, no whips;
// every shot change is a ~10 video-f cross-dissolve; gestures >= 12-18 f; boards long enough on screen to read.
// FRAME 0 = THE LAST FRAME (the video loops): P0 looks (almost) straight down the open round tank hatch onto the shiny
// golden oil with the measuring tape going in; camAt(1, 0) === camAt(LAST, TOTAL - 1) exactly.
import { WORDS, W, WE, wi, PW, PWE, PWi } from "./words";
import { TK, TF, BK, TR, CU, KI, PR, ST, OF, EYE, tk, tf, bk, tr, cu, ki, pr, st, of, V3, LightName, SetName } from "./plan";
import { blendLight, LightState } from "./lights";
import { toNew, WARP, VOICE_TOTAL } from "./voicewarp";

export const FPS = 30;
export type { V3 };
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 3;

// ---------------- key frames from the words ----------------
// PW(i, word) = start frame of `word` in phrase i (voice_build.py P index). Shot boundaries sit 3 f after the first word
// of the new clause (B), so the ~10 f dissolve (centred on the boundary) starts 2 f before that word.
const B = (i: number, w?: string) => PW(i, w) + 3;
/** start frame of the n-th (0-based) `w` inside phrase i (e.g. the second "again" of phrase 26) */
const PWn = (i: number, w: string, n: number) => WORDS[wi(w, PWi(i), n)].f;
const END = WORDS[WORDS.length - 1].fe;                     // last word ends (2690 since the 2026-11-14 re-voice)
export const TAIL = 20;                                     // silent loop button after the last word (= voice_warp.py TAIL)
export const TOTAL = END + 2 + TAIL;                        // 2712 f = 90.40 s
/** every shot is alive (posed, lit, rendered) from s.a - XPAD to s.b + XPAD picture frames: a dissolve of up to
 *  2 * XPAD frames fits round each boundary (SaladOil.tsx / Captions.tsx clamp to it; owners pose every shot over it) */
export const XPAD = 6.5;
/** frames the story beats react on (cast.ts / sets_*.ts / sound read these; react 0-3 f before the word) */
export const BEAT = {
  // 1 HOOK: "By 1963, a man had borrowed over $150 million... against tanks that were mostly water."
  by: PW(0), y1963: PW(0, "1963"), borrowed: PW(0, "borrowed"), million: PW(0, "$150 million"), millionEnd: PWE(0, "$150 million"),
  against: PW(1), tanks1: PW(1, "tanks"), mostly1: PW(1, "mostly"), water1: PW(1, "water"),
  // 2 SETTING: "Meet Tino De Angelis, New Jersey's salad oil king. His giant tanks were full of cooking oil."
  meet: PW(2), tino: PW(2, "Tino"), king: PW(2, "king"), his: PW(3), giant: PW(3, "giant"), full1: PW(3, "full"), cooking: PW(3, "cooking"),
  oil1: PW(3, "oil"), oil1End: PWE(3, "oil"),
  // 3 THE BANK: "Banks lent him money against it. American Express sent inspectors to check."   (FACT FIX 2026-11-14)
  banks: PW(5), money: PW(5, "money"), againstIt: PW(5, "against"), amex: PW(6), sent: PW(6, "sent"), inspectors: PW(6, "inspectors"), check: PW(6, "check"),
  // 4 THE INSPECTION (FACT FIX 2026-11-14, TIME 1965: one of TINO'S OWN MEN climbed, dropped the tape and shouted DOWN to the
  //   American Express inspector, who stayed ON THE GROUND and believed him. The inspector NEVER climbs or shouts.)
  //   "But Tino's own men would climb up, drop a tape inside, and shout down: "Ninety percent full!"
  //    And the inspector, on the ground... believed them."
  butTinos: PW(7), tinos: PW(7, "Tino's"), men: PW(7, "men"), climb: PW(7, "climb"), up: PW(7, "up"), drop: PW(7, "drop"), tape: PW(7, "tape"),
  inside1: PW(7, "inside"), shout: PW(7, "shout"), down: PW(7, "down"),
  ninety: PW(8), fullShout: PW(8, "full"), shoutEnd: PWE(8, "full"),          // lip flaps ONLY from ninety to shoutEnd (Tino's tank man)
  andInspector: PW(35), inspectorG: PW(35, "inspector"), ground: PW(35, "ground"), believed: PW(35, "believed"), believedEnd: PWE(35, "them"),
  // 5 MORE LOANS: "So the banks lent more. And more. Soon, his papers showed more of that oil than the entire United States had."
  soBanks: PW(9), more1: PW(9, "more"), andMore: PW(10), more2: PW(10, "more"),
  soon: PW(11), papers: PW(11, "papers"), moreOf: PW(11, "more"), entire: PW(11, "entire"), united: PW(11, "United"), had: PW(11, "had"),
  // 6 MYSTERY: "But what if someone did look inside?"   (FACT FIX 2026-11-14: a LENDER in a suit peers into the hatch)
  soHow: PW(13), someone: PW(13, "someone"), look: PW(13, "look"), insideQ: PW(13, "inside"), insideQEnd: PWE(13, "inside"),
  looking: PW(13, "look"),   // legacy alias (the stand-in cast.ts reads it)
  // 7 THE CRASH: "Then, in November 1963, his big bet on oil prices crashed. His company went bust. Lenders finally checked the tanks."
  then: PW(14), november: PW(14, "November"), bet: PW(14, "bet"), prices: PW(14, "prices"), crashed1: PW(14, "crashed"),
  company: PW(15), bust: PW(15, "bust"), lenders: PW(16), checked: PW(16, "checked"), tanksEnd: PWE(16, "tanks"),
  // 8 REVEAL: "Inside... was mostly water."  (the music drops to SILENCE on "Inside", a single slosh after "water")
  inside: PW(17), was: PW(18), mostly: PW(18, "mostly"), water: PW(18, "water"), waterEnd: PWE(18, "water"),
  // 9 PIVOT: "You see, oil floats on water. Ever left salad dressing out? The oil always rises to the top."
  youSee: PW(19), floats: PW(19, "floats"), ever: PW(20), dressing: PW(20, "dressing"), theOilRises: PW(21), rises: PW(21, "rises"), top: PW(21, "top"),
  // 10 HOW IT LOOKS FULL: "Fill a tank with water, add a thin layer of oil, and from the hatch, it looks full."
  fill: PW(22), waterIn: PW(22, "water"), add: PW(22, "add"), thin: PW(22, "thin"), oilIn: PW(22, "oil"), hatch: PW(23, "hatch"), looksFull: PW(23, "full"),
  // 11 THE PIPES: "And the real oil? He pumped it through pipes, tank to tank, so the same oil got counted again and again.
  //    The hardest-working oil in America."
  realOil: PW(24), pumped: PW(25, "pumped"), pipes: PW(25, "pipes"), tankTo: PW(25, "tank"), sameOil: PW(26), counted: PW(26, "counted"),
  got: PW(26, "got"), again1: PWn(26, "again", 0), again2: PWn(26, "again", 1), hardest: PW(27), hardestW: PW(27, "hardest-working"), america: PW(27, "America"),
  // 12 FALLOUT: "When it came out, American Express shares crashed."
  whenOut: PW(28), cameOut: PW(28, "came"), amex2: PW(28, "American"), shares: PW(28, "shares"), crashed2: PW(28, "crashed"),
  // 13 THE INVESTOR: "But one young investor bought those shares cheap. He bet people still trusted the brand. His name? Warren Buffett."
  but: PW(29), investor: PW(29, "investor"), bought: PW(29, "bought"), cheap: PW(29, "cheap"), heBet: PW(30), trusted: PW(30, "trusted"), brand: PW(30, "brand"),
  hisName: PW(31), warren: PW(32), buffett: PW(32, "Buffett"),
  // 14 PAYOFF + LOOP: "The oil was fake. The trust was real."
  theOil: PW(33), fake: PW(33, "fake"), theTrust: PW(34), trust: PW(34, "trust"), real: PW(34, "real"), end: END,
};
void W; void WE;

/** the oil blob reaches tank A / B / C on these frames (the COUNTED plates tick 1 / 2 / 3): cast.ts + sets_int.ts read it */
export const COUNT_AT = [BEAT.tankTo + 6, BEAT.got, BEAT.again2];

// ---------------- shots ----------------
export type Relight = { f: number; to: LightName; dur: number };
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: LightName; relight?: Relight[]; sunAz?: number; sunEl?: number };
const bound = [
  0,          // 1  HOOK: the hatch -> pull up and out to Tino's tank man   "By 1963 ... mostly water."
  B(2),       // 2  SETTING: through the gate to Tino, arms wide           "Meet Tino ... full of cooking oil."
  B(5),       // 3  THE BANK: stamp + cash, push to the window             "Banks lent him money ... sent inspectors to check."
  B(7),       // 4  THE INSPECTION: Tino's man climbs, tape, "Ninety percent full!"; the inspector ON THE GROUND ticks his
              //    clipboard without looking up      "But Tino's own men would climb up ... full!" + "And the inspector, on the ground... believed them."
  B(9),       // 5  MORE LOANS: the cash stacks grow                       "So the banks lent more. And more."
  B(11),      // 6  THE CHART: ALL US OIL vs TINO'S OIL                    "Soon, his papers showed more ... had."
  B(13),      // 7  MYSTERY: slow push onto a LENDER peering into the hatch  "But what if someone did look inside?"
  B(14),      // 8  THE CRASH: the trading floor board dives               "Then, in November 1963 ... crashed."
  B(15),      // 9  RAIN: BANKRUPT on the gate, lenders climb the tank     "His company went bust. Lenders finally checked the tanks."
  B(17),      // 10 REVEAL: the tank cutaway, mostly water + a fish        "Inside... was mostly water."
  B(19),      // 11 PIVOT: the kitchen, a salad-dressing bottle settles    "You see, ... rises to the top."
  B(22),      // 12 HOW IT LOOKS FULL: fill, a thin pour, up to the hatch  "Fill a tank with water ... it looks full."
  B(24),      // 13 THE PIPES: Saturday night, tank to tank, COUNTED 1-3   "And the real oil? ... in America."
  B(28),      // 14 FALLOUT: the headline + SHARES board, a CLOSED door    "When it came out, American Express shares crashed."
  B(29),      // 15 THE INVESTOR: reads, writes BUY, the cafe behind him   "But one young investor ... Warren Buffett."
  B(33),      // 16 PAYOFF + LOOP: the hatch; the oil parts, then settles  "The oil was fake. The trust was real."
  TOTAL,
];
const set: SetName[] = ["tanktop", "tankfarm", "bank", "tanktop", "bank", "bank", "tanktop", "trading", "tankfarm", "cutaway",
  "kitchen", "cutaway", "pumproom", "street", "office", "tanktop"];
const light: LightName[] = ["dawn_gold", "noon", "bank_warm", "noon", "bank_warm", "bank_warm", "noon", "trading", "storm", "cutaway",
  "kitchen", "cutaway", "pump_night", "street_grey", "office_sun", "dawn_gold"];
export const SHOTS: ShotDef[] = set.map((s, i) => ({ id: i + 1, a: bound[i], b: bound[i + 1], set: s, light: light[i] }));
export const LAST = SHOTS.length;
// mystery (brief beat 6, "tank top, late afternoon"): the noon tank top relights to the low amber late sun while the
// question is asked (time passing + the light dropping a little), like antitheft's mystery beat
SHOTS[6].relight = [{ f: BEAT.soHow + 6, to: "late", dur: 70 }];
// the investor: the room warms and brightens with the music swell on "Warren Buffett"
SHOTS[14].relight = [{ f: BEAT.warren - 6, to: "office_glow", dur: 40 }];

/** cross-dissolve length (VIDEO frames) into each shot (SaladOil.tsx runs every dissolve on the video clock, centred
 *  where the picture reaches the shot boundary, clamped to s.a +- XPAD): 10 f everywhere (the user's calm pacing),
 *  12 into the pivot (a warm glow dissolve, "You see,") and into the reveal cutaway ("Inside..."). */
export const XFADE: Record<number, number> = Object.fromEntries(SHOTS.slice(1).map((s) => [s.id, 10]));
XFADE[10] = 12; XFADE[11] = 12;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at picture frame f: base shot, plus the next shot fading in during its dissolve (picture-clock
 *  version; the composer uses its own video-clock dissolves, same centre and length) */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - Math.floor(x / 2) && f < s.a - Math.floor(x / 2) + x)
      return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - Math.floor(x / 2)) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

/** the relight blend of shot `id` at frame f: light a -> b at k (0..1); lightAt and SaladOil.tsx both use it */
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
/** the blended light state of shot `id` at frame f (relights are smoothstep over dur) */
export const lightAt = (id: number, f: number): LightState => {
  const s = SHOTS[id - 1];
  let cur: LightName = s.light, st0 = blendLight(cur, cur, 0);
  for (const r of s.relight ?? []) {
    if (f < r.f) break;
    const k = smooth((f - r.f) / r.dur);
    st0 = blendLight(cur, r.to, k);
    if (k >= 1) cur = r.to;
  }
  return st0;
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
/** a camera key: starts at PICTURE frame f; its glide lasts `dur` picture frames (timed on the video clock between those
 *  two picture frames) or, with vd, exactly vd VIDEO frames */
type Key = { f: number; dur?: number; vd?: number; cut?: boolean; ease?: (u: number) => number; s: (f: number) => Shot };
// The camera runs on the VIDEO clock (antitheft CAM A5): every creep, glide, bank, DOF ramp and kick is measured in VIDEO
// frames V(f); key START frames stay on the picture clock (anchored to BEAT). With the identity map V(f) = f.
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
/** push-in factor since f0: the subject grows ~rate per VIDEO frame (0.002-0.003 = 0.2-0.3 %/f); negative rate = slow pull */
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, V(f) - V(f0)));
/** the same steady push, also running BEFORE f0 (k > 1 there): passes k = 1 exactly at f0 */
const pushL = (f: number, f0: number, rate: number) => Math.exp(-rate * (V(f) - V(f0)));
/** dolly push: camera slides toward the look point by factor k */
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const norm3 = (a: V3): V3 => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** a framing + its creep: hold(pos, look, fov, f0, rate) is a Key body */
const hold = (pos: V3, look: V3, fov: number, f0: number, rate = 0.003, roll = 0) => (f: number): Shot => dolly(pos, look, pushK(f, f0, rate), { fov, roll });
/** a framing that also slides at a constant velocity d (m per VIDEO frame) from f0: the lateral drift on a hold */
const slide = (s: (f: number) => Shot, f0: number, d: V3) => (f: number): Shot => {
  const c = s(f), t = Math.max(0, V(f) - V(f0));
  return { ...c, pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t], look: [c.look[0] + d[0] * t, c.look[1] + d[1] * t, c.look[2] + d[2] * t] };
};
/** a bell that is 0 with ZERO velocity at both ends and 1 at the middle (16 t^2 (1-t)^2) */
const bell = (t: number) => { const u = clamp01(t); return 16 * u * u * (1 - u) * (1 - u); };
/** a bank of a rad that rises and settles level over [f0, f0 + dur] (hand-guided lateral moves) */
const bank = (s: (f: number) => Shot, f0: number, dur: number, a: number) => (f: number): Shot => { const c = s(f); return { ...c, roll: (c.roll ?? 0) + a * bell(vt(f, f0, dur)) }; };
/** unit view direction from a compass bearing (deg; 0 = -z, 90 = +x) and a pitch (deg; + = up) */
const dirB = (b: number, p: number): V3 => { const Bb = (b * Math.PI) / 180, P = (p * Math.PI) / 180; return [Math.sin(Bb) * Math.cos(P), Math.sin(P), -Math.cos(Bb) * Math.cos(P)]; };
const along = (p: V3, d: V3, L: number): V3 => [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L];
/** a crane arc: the camera rises by h at the middle of [f0, f0 + dur] and settles back (the look rises half as much) */
const lift = (s: (f: number) => Shot, f0: number, dur: number, h: number) => (f: number): Shot => {
  const c = s(f), k = h * bell(vt(f, f0, dur));
  return { ...c, pos: [c.pos[0], c.pos[1] + k, c.pos[2]], look: [c.look[0], c.look[1] + 0.5 * k, c.look[2]] };
};
/** the look point that puts world point t at screen fractions (xs, ys) for a camera at pos (pitch solved too) */
const aimY = (pos: V3, t: V3, fov: number, xs: number, ys: number): V3 => {
  const dx = t[0] - pos[0], dz = t[2] - pos[2], dh = Math.hypot(dx, dz), el = Math.atan2(t[1] - pos[1], dh), tv = Math.tan((fov * Math.PI) / 360);
  const pitch = el - Math.atan((0.5 - ys) * 2 * tv), b = Math.atan2(dx, -dz), bb = b - Math.atan((xs - 0.5) * 2 * tv * 0.5625);
  return [pos[0] + dh * Math.sin(bb), pos[1] + dh * Math.tan(pitch), pos[2] - dh * Math.cos(bb)];
};
/** a framing on a circle round target t (az / R / h as around()), t placed at screen (xs, ys) */
type Frame = { pos: V3; look: V3; fov: number };
const around = (c: V3, az: number, R: number, h: number): V3 => { const a = (az * Math.PI) / 180; return [c[0] + R * Math.sin(a), h, c[2] - R * Math.cos(a)]; };
const orb = (t: V3, az: number, R: number, h: number, fov: number, xs: number, ys: number): Frame => { const p = around(t, az, R, h); return { pos: p, look: aimY(p, t, fov, xs, ys), fov }; };
const holdF = (F: Frame, f0: number, rate = 0.003, roll = 0) => hold(F.pos, F.look, F.fov, f0, rate, roll);
/** framing F EXACTLY at its landing frame fL, with a steady creep that also runs before fL (as a glide target the
 *  creep carries straight on where the glide lands: no stall, and the landing framing is the designed one) */
const holdL = (F: Frame, fL: number, rate = 0.003) => (f: number): Shot => dolly(F.pos, F.look, pushL(f, fL, rate), { fov: F.fov });
/** a framing with a steady push (rate) and a constant drift d (m per VIDEO frame), both running before and after fL */
const creepL = (F: Frame, fL: number, rate: number, d: V3) => (f: number): Shot => {
  const c = dolly(F.pos, F.look, pushL(f, fL, rate), { fov: F.fov }), t = V(f) - V(fL);
  return { ...c, pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t], look: [c.look[0] + d[0] * t, c.look[1] + d[1] * t, c.look[2] + d[2] * t] };
};
/** the plain smootherstep glide from framing a to framing b over [f0, f0 + dur] as ONE framing function */
const glideTo = (a: (f: number) => Shot, b: (f: number) => Shot, f0: number, dur: number) => (f: number): Shot => mix(full(a(f)), full(b(f)), glide(vt(f, f0, dur)));
/** a glide from a to b over [f0, f0 + dur] whose lens travels a quadratic curve bent through waypoint w; the look turns
 *  on its own smootherstep over [lk0, lk1] (fractions of dur). Use as a cut key at f0. */
const via = (a: (f: number) => Shot, w: V3, b: (f: number) => Shot, f0: number, dur: number, lk0 = 0, lk1 = 1, pe: (u: number) => number = glide) => (f: number): Shot => {
  const t = clamp01(vt(f, f0, dur)), u = pe(t), A = full(a(f)), Bf = full(b(f));
  if (t >= 1) return Bf;
  const p: V3 = [0, 1, 2].map((i) => (1 - u) * (1 - u) * A.pos[i] + 2 * u * (1 - u) * w[i] + u * u * Bf.pos[i]) as V3;
  const k = smooth((t - lk0) / Math.max(1e-3, lk1 - lk0));  // CAM r1: smoothstep (peaks 1.5x, not 1.875x) for the turn
  return { pos: p, look: lerp3(A.look, Bf.look, k), fov: A.fov + (Bf.fov - A.fov) * u, roll: A.roll + (Bf.roll - A.roll) * u };
};
/** a straight cut key on the integer picture frame of video frame v (no motion blur samples across it) */
const CUT = (v: number, s: (f: number) => Shot): Key => ({ f: Math.round(PV(v)), cut: true, s });
/** the punch ease: front-loaded but not a 1-frame jump (for the one or two comic snaps a film may have) */
const punch = (u: number) => 1 - (1 - clamp01(u)) ** 2.2;
// (helpers kept for the CAM owner: slide, bank, dirB, along, lift, orb, holdF, creepL, via, CUT, punch, norm3)
void slide; void bank; void dirB; void along; void lift; void orb; void holdF; void creepL; void via; void CUT; void punch; void norm3; void glideTo;

/** FRAME 0 = LAST FRAME (loop): ~83 deg down the open hatch onto the golden oil, the collar ring whole, the tape going in */
export const P0: Cam = { pos: [0.02, 12.78, 5.64], look: [0.0, TK.hatch.oil, 5.36], fov: 56, roll: 0 };
const P0_RATE = 0.0025; // frame 0's creep (0.25 %/f, the user's calm creep); the loop shot arrives on P0 with this exact push velocity
/** frame 0's creep with a decaying velocity (P0_RATE on frame 0 = the loop's arrival speed, dying out over ~P0_TAU
 *  video f while the pull-out takes over) */
const P0_TAU = 26;
const p0dec = (f: number): Shot => dolly(P0.pos, P0.look, Math.exp(-P0_RATE * P0_TAU * (1 - Math.exp(-Math.max(0, V(f)) / P0_TAU))), { fov: P0.fov });
/** the loop shot: frame 0's creep run backwards on the VIDEO clock: a steady push landing EXACTLY on P0 on the last
 *  frame (LOOP_LAND = VOICE_TOTAL - 1 = TOTAL - 1: the LOOP SEAM RULE, frame 0 = the last frame, bit-identical) */
const LOOP_LAND = VOICE_TOTAL - 1;
const loopCam = (f: number): Shot => dolly(P0.pos, P0.look, Math.exp(-P0_RATE * (V(f) - LOOP_LAND)), { fov: P0.fov });

const S = SHOTS;
/** a framing from a camera position and a world point placed at screen fractions (xs, ys) */
const fr = (pos: V3, t: V3, fov: number, xs = 0.5, ys = 0.5): Frame => ({ pos, look: aimY(pos, t, fov, xs, ys), fov });
/** "cruise" ease (CAM fix round 1): sine ramps in over a and out over b, a constant speed between, so a long move peaks
 *  at only 1 / (1 - a/2 - b/2) x its mean speed (smootherstep peaks at 1.875 x) */
const cruise = (a: number, b: number) => (t: number) => {
  const u = clamp01(t), Vm = 1 / (1 - a / 2 - b / 2);
  if (u < a) return (Vm / 2) * (u - (a / Math.PI) * Math.sin((Math.PI * u) / a));
  if (u > 1 - b) { const r = 1 - u; return 1 - (Vm / 2) * (r - (b / Math.PI) * Math.sin((Math.PI * r) / b)); }
  return (Vm * a) / 2 + Vm * (u - a);
};
/** a pull-out (or push) from framing a to framing b whose IMAGE SCALE changes at an even rate: the distance to the
 *  plane z = zp is interpolated on a log scale (a 5x reveal reads as one calm, steady zoom instead of a whip at the end) */
const logGlide = (a: Frame, b: Frame, zp: number, f0: number, dur: number, ease: (u: number) => number) => (f: number): Shot => {
  const s = ease(vt(f, f0, dur)), za = a.pos[2] - zp, zb = b.pos[2] - zp, w = (za * Math.pow(zb / za, s) - za) / (zb - za);
  return { pos: lerp3(a.pos, b.pos, w), look: lerp3(a.look, b.look, w), fov: a.fov + (b.fov - a.fov) * w };
};
void logGlide;
/** CAM r2: a framing as a lens ORBITING its look point: distance d (m), elevation el (deg, + = lens above the target)
 *  and bearing b (deg; 0 = lens on the +z side of the target, 90 = on its +x side) */
type Orb = { t: V3; d: number; el: number; b: number; fov: number };
const orbPos = (t: V3, d: number, el: number, b: number): V3 => {
  const E = (el * Math.PI) / 180, Bb = (b * Math.PI) / 180;
  return [t[0] + d * Math.sin(Bb) * Math.cos(E), t[1] + d * Math.sin(E), t[2] + d * Math.cos(Bb) * Math.cos(E)];
};
const orbFrame = (o: Orb): Frame => ({ pos: orbPos(o.t, o.d, o.el, o.b), look: o.t, fov: o.fov });
/** any framing as an orbit round its look point */
const toOrb = (c: Shot): Orb => {
  const dx = c.pos[0] - c.look[0], dy = c.pos[1] - c.look[1], dz = c.pos[2] - c.look[2], d = Math.hypot(dx, dy, dz) || 1e-6;
  return { t: c.look, d, el: (Math.asin(dy / d) * 180) / Math.PI, b: (Math.atan2(dx, dz) * 180) / Math.PI, fov: c.fov ?? 40 };
};
/** CAM r2 (A2 P1 shots 10 / 12, P3 shot 1): a reveal / crane between two framings (functions of f, so the move leaves a
 *  creep and lands on a creep with no velocity jump) read as orbits round their look points, whose IMAGE SCALE changes
 *  at an even rate: the lens distance is interpolated on a LOG scale (d = da (db/da)^s), the target, fov and the angles
 *  on their own eases (ang: the elevation / bearing swing, so the lens can stay far out while it swings over a cut edge
 *  and only close in, or pull out, where the geometry allows). One smooth bell of screen motion, no crash zoom. */
const orbitLog = (a: (f: number) => Shot, bF: (f: number) => Shot, f0: number, dur: number, ease: (u: number) => number,
  ang: (u: number) => number = ease, tgt: (u: number) => number = ease, fovE?: (u: number) => number) => (f: number): Shot => {
  const t = clamp01(vt(f, f0, dur));
  if (t <= 0) return full(a(f));
  if (t >= 1) return full(bF(f));
  const A = toOrb(a(f)), Bo = toOrb(bF(f)), s = ease(t), sa = ang(t), st = tgt(t);
  let db = Bo.b - A.b; if (db > 180) db -= 360; if (db < -180) db += 360;
  const d = A.d * Math.pow(Bo.d / A.d, s), el = A.el + (Bo.el - A.el) * sa, b = A.b + db * sa, T = lerp3(A.t, Bo.t, st);
  return { pos: orbPos(T, d, el, b), look: T, fov: A.fov + (Bo.fov - A.fov) * (fovE ? fovE(t) : s), roll: 0 };
};
/** CAM r2: framing F exactly at fL with a push (rate) and a drift of the LENS only (dp, m per VIDEO frame; the look stays
 *  put): a slow parallax arc round the subject on a hold (life without growing anything off the frame edges) */
const arcL = (F: Frame, fL: number, rate: number, dp: V3) => (f: number): Shot => {
  const c = dolly(F.pos, F.look, pushL(f, fL, rate), { fov: F.fov }), t = V(f) - V(fL);
  return { ...c, pos: [c.pos[0] + dp[0] * t, c.pos[1] + dp[1] * t, c.pos[2] + dp[2] * t] };
};

// ---- shot 1: hold on the hatch (frame 0's decaying creep), then ONE 96 f crane pull up and out from 20 (no stall
// before it: the push hands straight over) onto Tino's tank man kneeling at the hatch, the LOANS counter behind the
// hatch, the tank rows and the hazy harbour skyline; settled by ~110 so the whole counter roll plays on a still board.
// CAM r1: higher (14.0) and nearer the rim, so the near rail runs low across the frame (under his knees, soft in the
// DOF) instead of through the hatch and his waist; the LOANS board fully inside the frame (right edge < 1000 px) ----
// CAM r2 (A2 P2 / P3): the landing opens up toward the lens (fov 61, the hatch target at x 0.43), so the tank man's reel
// sits >= 80 px inside the left edge and the LOANS board's right edge <= 1010 px; the pull-out runs on a cruise ease
// (peak ~1.4x its mean speed instead of 1.9x) and lands ~112, before the flaps roll; the hold is a slow parallax arc
// (the lens drifts round the hatch, a 0.04 %/f push), so nothing grows off the frame edges
// CAM r3 (A3 P2 x2): the landing tilts ~2.5 deg down from 0.25 m lower on a 2 deg wider lens: the hatch's near rim
// lands ABOVE the caption band (<= 1280 at 1080), his face at y ~910, the skyline top where it was; the pull-out starts
// 12 f sooner and runs 80 f on a cruise ease (the scale change still even, peak ~18 px/f), so the tank man's whole
// head is >= 60 px inside the left edge from "a man" (56) on, and it lands ~84 (well before the flaps roll)
const W1: Frame = fr(tk([2.0, 13.75, 9.3]), tk([0.0, 11.4, 5.2]), 63, 0.43, 0.54);
const R1_V = 4, R1_VD = 80;
const R1_E = cruise(0.3, 0.42);
const W1_ARC: V3 = [-0.0016, 0.0004, 0.0004];
// ---- shot 2 (CAM r1, Tino now just inside the gate): A = from the street, the ALLIED / VEGETABLE OIL sign whole and
// readable in the top third, Tino under it (~17 % of the height) from "Meet"; ONE 68 f glide (4 m, outside the gate,
// never near a post) to B = a low medium-wide landing on "king": Tino right of centre, the giant No. 7 tank's curve
// behind him on the right, the farm and sky past its edge on the left, the dripping valve at his left ----
// CAM r2 (A2 P2 + LEAD decision): A from 6.5 m further back on a longer lens (fov 44 -> 26): Tino ~20 % of the height
// on "Meet Tino" with the whole sign still inside (~85 % W); B lower (0.7 m, a heroic "king" angle) and 2 m nearer the
// gate, so the sign's beam stays above the frame top while the lens tilts up a little (less asphalt, the No. 7 wall
// towering); the glide is a log-scale dolly (an even zoom over the 12 m), 90 f, landing just after "king"
const TINO2: V3 = add3(tf(TF.tino), [0, 0.85, 0]);
// CAM r3 (A3 P2 x2 + LEAD decision): A ~8 % tighter (the sign still whole, ~40 px margins) and the glide starts ON
// "Tino" (front-loaded cruise), so he is ~20 % of the height by "De Angelis"; B = a LOW HERO angle from just inside the
// swung-out gate leaves (lens 0.32 m up, 4.8 m from him, a wider 58 deg lens tilted up ~12 deg): the No. 7 wall and its
// rim tower behind him, his face at ~0.43 H; the right leaf / post (the grey bar on the right edge) is behind the lens
const S2A: Frame = fr(tf([-0.35, 1.6, 31.5]), TINO2, 25.2, 0.448, 0.62);
const TINO2F: V3 = add3(tf(TF.tino), [0, 1.29, 0]);
const S2B: Frame = fr(tf([1.0, 0.32, 17.3]), TINO2F, 58, 0.6, 0.43);
const R2_V = V(BEAT.tino) - 4, R2_VD = 92;
const R2_E = cruise(0.22, 0.45);
/** the lens widens LATE (the square of the move's progress): a linear fov ramp cancelled the dolly for the first ~20 f,
 *  so Tino only grew after "De Angelis"; now he grows from "Tino" on and is ~20 % of the height by "De Angelis" */
const R2_FOV = (u: number) => R2_E(u) ** 2;
// ---- shot 3: the banker MS at the desk (stamp on "money", cash slides on "against it"), the window with the far tank
// at the right -> CAM r1: ONE gentle 56 f glide (~1.2x) toward the window from 16 f before "sent": the banker's head
// stays in the left third, the whole window in the right 60 % (sill well above the captions) for the inspector's walk ----
const S3A: Frame = { pos: bk([-0.95, 1.4, 2.7]), look: bk([0.12, 1.1, -1.2]), fov: 46 };  // build r1: the whole OIL RECEIPT in frame
// CAM r2 (A2 P2): the lens trucks LEFT 0.65 m while it turns to the window (zoom 1.12x): the parallax packs the
// receipt, the banker and the window together, so the banker stays >= 400 px from the left edge, the whole receipt and the
// whole window stay in frame, and his head stays clear of the window for the inspector's walk
const S3W: Frame = fr(bk([-1.6, 1.4, 2.6]), bk([0.5, 1.2, -2.0]), 41, 0.52, 0.43);
const R3_V = V(BEAT.amex) + 10, R3_VD = 70;
// ---- shot 4 (FACT FIX 2026-11-14; CAM r1): A = a high 3/4 medium-wide from off the rim (y 14.9, so the near rail sits
// under the kneeling man, not across him): the top flight of the ladder, the hatch, the man kneeling on its FAR side
// facing us; ONE 78 f glide from just after "up," to "Ninety" (A2 = a medium of him at the rail; the tape drop plays in
// the first half of it, a medium-wide); a creep through the shout. Then ONE hard cut (the film's only one, the style
// bible's "big place jump 2-3 f before a line": 3 f before "And the inspector") DOWN to B = a slightly high two-shot on
// the ground (camera 4.5 m up, ~23 deg down, as if from his rail): heads at ~0.39 H, faces far above the captions, the
// clipboard big; a creep to the cut. (A crane over 11 m in < 80 f cannot stay under ~55 px/f.) ----
// CAM r2 (A2 P2): A frames 0.09 H lower (target at 0.41 H): the top rungs and the rim lip sit at y <= ~1120 during the
// climb (his head clears the caption band by "up"); the glide to A2 waits for the plumb to land (PLUNK = drop + 30), so
// "drop a tape inside" plays on a held frame, and lands 4 f after "Ninety" (nearly settled as the shout starts)
// CAM r3 (A3 P3): A 0.055 H lower again (target at 0.345 H): his cap clears the caption band from the first rungs
const S4A: Frame = fr(tk([4.6, 14.9, 12.6]), tk([0.4, 11.5, 5.6]), 46, 0.47, 0.345);
const S4M: Frame = fr(tk([2.9, 13.1, 11.0]), tk([0.45, 11.8, 6.5]), 42, 0.5, 0.47);
// CAM r2 (A2 P3): B 17 % tighter (fov 36 -> 31) with a 0.13 %/f creep: a medium two-shot by the end, faces >= 180 px wide
const S4B: Frame = fr(tk([2.4, 4.5, 17.2]), tk([0.92, 0.85, 10.27]), 31, 0.5, 0.56);
// CAM r3 (A3 P2 + P3): "drop a tape inside" gets its own picture: ONE slow bell push from "up," (the whole camera
// moves 1.45x closer to the tape's middle and tilts it from ~0.35 H down to 0.45 H while it grows, so the bare tank wall
// under the rim shrinks):
// the kneeling man, the yellow tape going into the hatch and the plumb's plunk read at phone size; then the glide to the
// shout medium at the rail starts 6 f before "shout" and lands 6 f after "Ninety" (a ~1.2x push instead of 1.75x)
const TAPE4: V3 = tk([-0.1, 11.2, 5.2]);
const scaleAbout = (F: Frame, c: V3, k: number): Frame => ({ pos: lerp3(c, F.pos, k), look: lerp3(c, F.look, k), fov: F.fov });
const S4T: Frame = fr(scaleAbout(S4A, TAPE4, 1 / 1.45).pos, TAPE4, 46, 0.425, 0.45);
const R4_T_V = V(BEAT.up), R4_T_VD = V(BEAT.shout) - 8 - V(BEAT.up);
const R4_M_V = V(BEAT.shout) - 6, R4_M_VD = 40;
const R4_CUT_V = V(BEAT.andInspector) - 3;
// ---- shot 5: frontal MS of the banker happily stamping (eyes closed), the cash stacks growing on "more" x2 ----
const S5: Frame = { pos: bk([0.25, 1.35, 2.5]), look: bk([0.0, 1.0, -1.0]), fov: 40 };
// ---- shot 6 (CAM r1): the easel chart ~64 % of the width, left of centre, Tino at its right edge (BK.tinoChart, head
// ~y 750); hold, then ONE gentle 45 f glide on "United" toward TINO'S OIL + Tino so his pile out-sizes ALL US OIL ----
const CH = BK.chart, CHU: V3 = [Math.cos(CH.yaw), 0, -Math.sin(CH.yaw)], CHN: V3 = [Math.sin(CH.yaw), 0, Math.cos(CH.yaw)];
/** a point in the chart's own frame: lx along its face (+ = screen right), ly up from its centre, ln out of its face */
const chartPt = (lx: number, ly: number, ln = 0): V3 => bk([CH.c[0] + CHU[0] * lx + CHN[0] * ln, CH.c[1] + ly, CH.c[2] + CHU[2] * lx + CHN[2] * ln]);
// CAM r2 (A2 P2): the chart's left edge never crosses the frame (>= 40 px through the dissolve) and Tino stays whole at
// its right: a slightly wider start (~58 % W), half the creep, and a gentler "United" glide (to ~63 % W)
const S6: Frame = fr(chartPt(0.4, 1.42 - CH.c[1], 6.6), chartPt(0.4, -0.05, 0.2), 42, 0.5, 0.42);
// CAM r3 (A3 P3): the hold creeps 0.12 %/f from 0.2 m further out; the "United" landing looks 3 cm further right (room for
// Tino moved off the pyramid, a CHAR request) on a 2 deg wider lens, so the board's left edge stays >= 40 px inside
const S6P: Frame = fr(chartPt(0.45, 1.42 - CH.c[1], 6.0), chartPt(0.39, -0.05, 0.2), 43, 0.5, 0.43);
const R6_V = V(BEAT.united) - 10, R6_VD = 45;
// ---- shot 7: MYSTERY (FACT FIX 2026-11-14): a 3/4 MS of a LENDER in a suit and fedora kneeling at the hatch and
// leaning over it -> CAM r1 (r2: 48 f, see below): ONE move from 10 f after "But": the lens arcs over the hatch while the LOOK keeps his
// face until ~1/3 of the way and only then tilts down into the hatch (his eyes stay in frame through "look"); lands
// 6 f before "inside?" ends and HOLDS ~1 s on his face reflected in the golden oil (a 0.1 %/f creep) ----
// (both cameras inside the rail ring, on the +x side: the hatch sits between the camera and the lender)
// CAM r2 (A2 P1 / P2 / P3): A starts ~21 % closer (the hatch whole ABOVE the captions, his hat ~130 px under the top), so
// the same calm speed covers the move in 48 f (lands 4 f after "inside"); the tilt into the hatch is front-loaded (done
// by ~1212, the reflection clear of the caption band on "inside?"); B is pulled back 0.6 m with a wider lens (54), so
// the landing holds BOTH faces: the real lender whole at the top (hat to chin in the top 30 %), his reflection centred
// at ~0.47 H in the gold; then a ~32 f hold with a 0.1 %/f creep
const S7A: Frame = fr(tk([2.1, 13.05, 6.0]), tk([-0.5, 11.6, 5.42]), 50, 0.5, 0.32);
const S7B: Frame = fr(tk([1.45, 13.55, 5.53]), tk(TK.reflect), 54, 0.5, 0.58);  // fix2 LEAD (A2 P1): the lender's whole head in frame
const W7: V3 = tk([1.55, 13.3, 5.85]);
const R7_V = V(BEAT.soHow) + 10, R7_VD = 48;
// ---- shot 8 (CAM r1): the trading floor from EYE level (1.3 m, ~1 deg up): every trader's eyes sit on one line at
// y ~990, far above the captions (they cross chests), the SOYBEAN OIL board ~72 % W above them, ceiling <= 15 %; hold,
// then ONE gentle 46 f push on "bet on oil" (the board to ~85 % W) that lands before "crashed" (the dive on a still frame) ----
const S8: Frame = { pos: tr([0.3, 1.3, 5.6]), look: tr([0.1, 1.5, -5.95]), fov: 58 };
// CAM r2 (A2 P1): the push lands 0.22 m further left and turns left (Tino whole, his head at x ~70-370 on HIS crash
// grimace; the right-edge trader leaves the frame cleanly instead of staying a sliver); a 0.04 %/f creep after it
// CAM r3 (A3 P3): the landing looks 4 cm less far left on a 2 deg wider lens: the phone stand on the left edge leaves the
// frame cleanly while his head keeps >= 40 px inside the left edge (the board still whole)
const S8P: Frame = { pos: tr([-0.05, 1.3, 3.9]), look: tr([-0.18, 1.5, -5.95]), fov: 60 };
const R8_V = V(BEAT.bet) - 22, R8_VD = 46;
// ---- shot 9 (CAM r1): the rain from outside the gate, slightly low and left: BANKRUPT on the sign in the upper third,
// the file of lenders walking in through the gate (faces y ~990-1130, above the captions), the No. 7 tank towering
// behind; a 0.16 %/f push toward the tank (it becomes the cutaway) ----
// CAM r2 (A2 P1 + LEAD decision, P2): the CHECK is the hero: the No. 7 stair foot sits at x ~0.63 W, y 0.5 H (the climber
// rises above the umbrella line, clear of the walking file); BANKRUPT in the upper third. The old 0.16 %/f dolly blew
// the near notice off the right edge (it is 3x nearer than the tank): the hold is now a slow truck RIGHT (0.45 cm/f,
// parallax: the gate slides left past the tank) + a 0.06 %/f push, so the notice stays whole (right edge <= ~1020)
// CAM r3 (A3 P2 + LEAD decision): the lens tilts up ~7 deg (the look target 2.6 m up the stair): the wet road shrinks to
// ~27 % of the frame (the gate line at ~0.72 H), the No. 7 roof rail and a band of storm sky enter at the top, the
// lenders' faces sit at ~0.55 H, the stair + climber at ~0.64 W, 0.44-0.6 H (BANKRUPT stays whole in the upper third)
const S9F: Frame = fr(tf([-1.0, 1.4, 23.6]), tf([TF.ladder[0], 2.6, TF.ladder[2]]), 56, 0.63, 0.5);
// ---- shot 10: REVEAL (CAM r1): it opens on what the lenders saw: straight down the open roof hatch onto the GOLDEN oil
// ("Inside...": all gold, no water anywhere in frame), a slow push-in creep; then (CAM r2: 24 f before "was", 76 f, a
// log-distance orbit, see below) ONE crane back and DOWN round the front of the tank (an arc that stays above the roof, then in front of the cut face: never
// through it) to the whole cross-section: the water appears under the thin gold on "mostly ... water" (the same move as
// shot 12's crane, in reverse: a deliberate rhyme); held ~1 s with one small fish ----
const HATCH10: V3 = [CU.hatch.c[0], CU.hatch.c[1] - 0.08, CU.hatch.c[2]];
const S10A: Frame = fr(cu([HATCH10[0], HATCH10[1] + 3.4 * Math.sin((66 * Math.PI) / 180), HATCH10[2] + 3.4 * Math.cos((66 * Math.PI) / 180)]), cu(HATCH10), 38, 0.5, 0.47);
const S10B: Frame = orbFrame({ t: cu([0, 5.2, 0]), d: 15.5, el: 8, b: 0, fov: 44 });  // CAM r2: 8 deg above, 0.75 m up (gold band ~0.25 H)
const W10: V3 = cu([-0.4, 12.6, 9.5]);
void W10;
// CAM r2 (A2 P1): the reveal is an ORBIT pull-out with the lens distance on a LOG scale (3.4 m -> 15.5 m: the image
// scale shrinks at an even rate, no crash pull at the start); the lens stays high (elevation eased late) until it is far
// out, so it never skims the roof edge and the gold layer never fills the frame as a slab; 68 f from 14 f before "was".
// After the landing a slow creep up and in toward the gold line (it drifts from ~0.19 H toward ~0.27 H, a near match for
// the bottle's gold top in shot 11) while "water." rings out
// CAM r3 (A3 P3): the reveal starts 8 f later (16 f before "was") and runs 68 f (still lands ~1626): the all-gold hatch
// holds ~15 f clear of the dissolve on its creep before the pull-out
const R10_V = V(BEAT.was) - 16, R10_VD = 68;
/** the reveal's swing: the lens first pulls straight back up the hatch axis (the gold shrinks in the collar), and only
 *  swings down in front of the cut face from a quarter of the way, once it is far out; the look leaves the hatch with it */
const R10_ANG = (u: number) => glide(clamp01((u - 0.25) / 0.75));
// ---- shot 11: PIVOT: the bottle on the kitchen table, ~40 % of the frame height, a slow creep -> CAM r1: ONE gentle
// 60 f glide on "The oil always rises" to a bottle MCU (the liquid ~46 % W, its gold top at ~0.31 H), so the gold rhymes
// with shot 12's oil band at the dissolve ----
// CAM r2 (A2 P3): the opening tilts 2.4 deg down (the gold top at ~0.32 H, near shot 10's gold band at ~0.25 H through
// the 12 f dissolve); the end MCU looks 3.5 cm higher, so the cork sits whole with ~40 px of headroom (no tangent)
// CAM r3 (A3 P3 x2): the opening looks 4.5 cm higher (less of the cloth's front drape at the bottom); the glide ends at
// ~1.45x (0.11 m further out) and starts 6 f sooner, so it is mostly done when the gold band climbs (the rise plays on
// a near-still frame)
const S11: Frame = { pos: ki([0.32, 1.02, 1.25]), look: ki([0.05, 0.855, 0.1]), fov: 38 };
const S11P: Frame = { pos: ki([0.245, 0.985, 0.85]), look: ki([0.05, 0.925, 0.1]), fov: 36 };
const R11_V = V(BEAT.theOilRises) - 10, R11_VD = 60;
// ---- shot 12 (CAM r1): the WHOLE cross-section with margins (shell, roof, hatch, floor, both red edges) while it fills
// -> ONE crane UP-AND-OVER outside the tank (CAM r2: 76 f, a log-distance orbit, see below) (the lens stays >= 9 m out until it is > 2 m above the roof; an arc
// that keeps the tank in view, no cut plane through the lens) to a high 60-deg view onto the open hatch: all gold, the
// LOOKS FULL board fully in frame above it; settled ~25 f before "full" ----
const S12A: Frame = { pos: cu([-1.2, 4.4, 17.5]), look: cu([0.1, 4.9, 0]), fov: 48 };
const HATCH12: V3 = [CU.hatch.c[0], CU.hatch.c[1] + 0.1, CU.hatch.c[2]];
// CAM r2: the hatch at 0.5 H (was 0.55): the gold oil disc sits where shot 13 opens on the gold blob (a match dissolve)
// CAM r3 (A3 P3): a 7.5 deg wider lens (the hatch still ~centred, so the gold disc still lands on shot 13's blob through
// the match dissolve) and a gentler 0.1 %/f creep: the propped lid stands whole at the left for the whole hold
const S12H: Frame = fr(cu([HATCH12[0], HATCH12[1] + 4.6 * Math.sin(Math.PI / 3), HATCH12[2] + 4.6 * Math.cos(Math.PI / 3)]), cu(HATCH12), 47.5, 0.53, 0.5);
const W12: V3 = cu([-0.6, 13.5, 12.0]);
void W12;
// CAM r2 (A2 P2 / P3 / ADD): the cross-section holds on a 0.15 %/f creep through "a thin layer" (no frozen run); the
// crane is an ORBIT that rises first (the lens swings up over the first 60 % while it is still ~17 m out, far outside the
// wall line: the gold layer stays a thin line, <= 2 % of the height) and only closes in on a log-scale distance from a
// quarter of the way: one even bell, ~30 px/f peak, 76 f from 16 f before "oil" (lands ~1979); the lens then racks
// from the collar rim to the oil in the last 10 f of the landing (the gold sharpens before "it looks full.")
// CAM r3 (A3 P2): the crane waits for the thin gold layer to settle on a near-still frame (~0.5 s on the 0.15 %/f creep)
// and starts 6 f before "oil", 72 f, landing ~1985 (16 f before "it looks full")
const R12_V = V(BEAT.oilIn) - 6, R12_VD = 72;
const R12_ANG = (u: number) => glide(clamp01(u / 0.6)), R12_DIST = (u: number) => cruise(0.3, 0.3)(clamp01((u - 0.25) / 0.75));
/** CAM r3 (A3 P3): while the cut face's gold band would slide down through the caption band, the look dips a little
 *  (a bell) so the band crosses it faster, then eases back before the landing */
const R12_DIP = (f: number) => R12_DIPK * bell((vt(f, PV(R12_V), PV(R12_V + R12_VD) - PV(R12_V)) - R12_DIPU) / R12_DIPW);
const R12_DIPK = 0.75, R12_DIPU = 0.36, R12_DIPW = 0.42;
const dipLook = (s: (f: number) => Shot, d: (f: number) => number) => (f: number): Shot => { const c = s(f), k = d(f); return { ...c, look: [c.look[0], c.look[1] + k, c.look[2]] }; };
// ---- shot 13 (CAM r1): the pump room from 0.6 m higher (over the workers' caps): tank A, worker 1 at a valve, the
// SATURDAY calendar -> ONE long follow whose LOOK rides on the oil blob itself (smoothed over ~28 f: the blob stays in
// the centre third A -> B -> C, never at the frame edge) while the lens trucks along on one cruise-eased move, easing in
// to a medium of the blob at tank C with its COUNTED: 3 plate above it; it settles ~2200, BEFORE "The hardest-working
// oil" (the sweat + brow wipe play on a still frame); peak ~45 px/f ----
const PY = PR.pipe.y;
const S13A: Frame = { pos: pr([-2.2, 3.15, 1.6]), look: pr([-3.97, 1.55, -4.2]), fov: 54 };  // CAM r2: 0.55 m higher, 0.8 m nearer (worker 0 cap passes under the blob; the yawning worker face above the captions)
const S13M: Frame = { pos: pr([1.6, 3.0, -0.4]), look: pr([2.6, 1.7, -3.8]), fov: 48 };  // CAM r2: 0.5 m higher: worker 1's cap stays UNDER the blob, COUNTED: 3 ~200 px under the top
void PY;
/** the oil blob's x on the pipe (the same path cast.ts draws: A -> B -> C, keyed to COUNT_AT) */
const blobX = (f: number) => {
  const xA = PR.tanks[0][0], xB = PR.tanks[1][0], xC = PR.blobCU[0], [tA, tB, tC] = COUNT_AT, t0 = BEAT.pumped;
  const seg = (f0: number, f1: number) => clamp01((f - f0) / (f1 - f0));
  return f < t0 ? xA - 0.8 : f < tA ? xA - 0.8 + 0.8 * smooth(seg(t0, tA)) : f < tB ? xA + (xB - xA) * smooth(seg(tA + 4, tB)) : f < tC ? xB + (xC - xB) * smooth(seg(tB + 4, tC)) : xC;
};
/** the blob's x smoothed over a 28 f window (2 f taps, centred 4 f behind): the follow's look + focus driver */
const blobXs = (f: number) => { let s = 0; for (let k = 0; k <= 14; k++) s += blobX(f - 18 + 2 * k); return s / 15; };
/** the follow: the LOOK rides on the (smoothed) blob, so it always sits near the centre; the LENS trucks along the wall
 *  on ONE cruise-eased move (sine ramps, constant speed between) from as the blob leaves tank A to ~12 f after it
 *  reaches tank C, rising a little over the workers' caps and easing in to the medium at C (mostly a truck, little pan) */
// CAM r2 (A2 P1 / P2 + carry-over): the lens rides higher over the workers' caps (their heads pass UNDER the blob, not
// across it); on the B -> C leg it frames COUNTED: 2 AND the running blob together (look on their midpoint, the lens
// eased back + wider), so plate 2 stays whole ~40 f after it flips; it catches up as the lens eases into the medium at C,
// settled ~2225, before "The hardest-working oil"; the medium holds on a slow parallax arc (no push: plate 3 stays whole
// under the top edge through "in America.")
// CAM r3 (A3 P2 x3 + LEAD decision): the follow becomes three DWELLS, so every COUNTED plate flips on a SETTLED frame and
// stays whole >= 45 f: A = the opening (tank A, the SATURDAY calendar; plate 1 flips on the held frame); from 4 f after
// that flip ONE 36 f glide back and right to AB = a high two-plate wide (plates 1 AND 2 whole, the blob running between
// them along the pipe on a still frame: plate 1 stays whole ~60 f after its flip, plate 2 flips on the settled frame);
// from 2 f after flip 2 ONE 46 f cruise glide (peak ~45 px/f) (right + in, plate 2 whole until ~2185) to C = a medium-wide of the blob's
// stop at tank C with COUNTED: 3 whole above it, settled ~2202 before flip 3 (the blob runs into the still frame); then
// the punch line holds on a gentle 0.08 %/f push centred between the blob and plate 3 (plate 3 stays whole under the
// top edge, worker 1 is out of the frame, so no head sits in the caption band)
const F13_AB: Frame = fr(pr([-1.3, 3.7, 3.1]), pr([-1.5, 2.2, -4.17]), 57, 0.5, 0.44);
const F13_C: Frame = fr(pr([1.9, 3.45, 1.3]), pr([2.55, 2.1, -3.86]), 48, 0.52, 0.44);
const R13_AB_V = V(COUNT_AT[0]) + 4, R13_AB_VD = 36, R13_C_V = V(COUNT_AT[1]) + 2, R13_C_VD = 46;
void S13M; void arcL;
// ---- shot 14 (CAM r1): the grey street from 2.7 m up and 2.3 m further back: the kerb and a strip of road along the
// bottom, the headline poster above the captions, the SHARES board, the CLOSED door; a 0.15 %/f creep + a slow 0.6 m
// truck left (parallax: the kiosk slides against the facades) ----
// CAM r2 (carry-over): a longer lens (52 -> 42) from the same spot: the headline poster ~40 % bigger (letters back above
// ~55 px), the SHARES board and the CLOSED door still whole; the hold is a slow truck RIGHT (0.3 cm/f: the nearer kiosk
// slides left past the facades) + a 0.06 %/f push, so nothing drifts off an edge
const S14: Frame = { pos: st([0.4, 2.6, 5.0]), look: st([0.15, 1.75, -4.0]), fov: 42 };
// ---- shot 15 (CAM r1): the investor MS reading (the paper whole, the BUY slip above the captions) -> on "He bet" a
// glide back and up (CAM r2: 62 f, cruise) (his face ~0.55 H, chin 130 px above the captions; the sunny window + cafe behind); the DOF
// racks to the cafe on "trusted" and back on "His name?"; then ONE slow 50 f push on "Warren" (his face ~37 % W) ----
// CAM r3 (A3 P1 + LEAD decision, P3 match): the MS moves 0.28 m right and 0.35 m back, a little lower, looking down a
// touch more: the BUY slip (OF.slip x 0.53) and his writing hand are WHOLE in frame at x ~0.73-0.9 W, y ~0.48-0.54 H
// (far above the caption band) from "bought" to "cheap.", the paper whole at the left, his face at ~0.31 H; the paper's
// OIL TANKS headline now sits within ~30 px of the street poster's through the 14 -> 15 dissolve (a true match); the
// creep is halved (0.08 %/f) so the slip never nears the right edge
const S15A: Frame = fr(of([0.5, 1.36, 1.9]), of([0.12, 0.92, -0.85]), 42, 0.47, 0.45);
// CAM r2 (A2 P2): the wide tilts ~4 deg down from 12 cm lower: the newspaper and the BUY slip sit ABOVE the caption band
// (paper 1054-1261, slip 1185-1246 at 1080), his face at ~0.47 H; the glide back runs 62 f on the cruise ease from 12 f
// before "He bet" (peak ~1.4x mean instead of 1.9x) and the wide creeps 0.15 %/f; the Warren push is a pure dolly from the wide
// toward a point under his chin (screen ~0.38 W, 0.68 H): his face grows (head ~29 % W) and rises while the paper and the
// headline stay ABOVE the caption band the whole way ('OIL' inside the left edge), so 'Warren Buffett.' never lands on it
const S15B: Frame = { pos: of([0.55, 1.38, 2.3]), look: of([0.0, 0.97, -2.5]), fov: 46 };
// CAM r3 (A3 P1 check): the Warren push looks 7 cm further right on a 3 deg wider lens: the BUY slip he taps on "Buffett." AND the paper's OIL stay whole
const S15W: Frame = { pos: of([0.37, 1.14, 1.3]), look: of([-0.11, 0.76, -3.5]), fov: 49 };
const R15_V = V(BEAT.heBet) - 12, R15_VD = 62, R15_W_V = V(BEAT.warren) - 8, R15_W_VD = 50;
function add3(a: V3, b: V3): V3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: p0dec }, { f: PV(R1_V), cut: true, s: orbitLog(p0dec, arcL(W1, PV(R1_V + R1_VD), 0.0004, W1_ARC), PV(R1_V), PV(R1_V + R1_VD) - PV(R1_V), R1_E, R1_E, R1_E) }],
  2: [{ f: S[1].a - 7, s: holdL(S2A, S[1].a, 0.0012) },
    { f: PV(R2_V), cut: true, s: orbitLog(holdL(S2A, S[1].a, 0.0012), holdL(S2B, PV(R2_V + R2_VD), 0.001), PV(R2_V), PV(R2_V + R2_VD) - PV(R2_V), R2_E, R2_E, R2_E, R2_FOV) }],
  3: [{ f: S[2].a - 7, s: holdL(S3A, S[2].a, 0.0015) }, VK(R3_V, R3_VD, holdL(S3W, PV(R3_V + R3_VD), 0.0012))],
  4: [{ f: S[3].a - 7, s: holdL(S4A, BEAT.climb, 0.0015) }, VK(R4_T_V, R4_T_VD, holdL(S4T, PV(R4_T_V + R4_T_VD), 0.0012)),
    VK(R4_M_V, R4_M_VD, holdL(S4M, PV(R4_M_V + R4_M_VD), 0.0015)),
    CUT(R4_CUT_V, holdL(S4B, BEAT.believed, 0.0013))],
  5: [{ f: S[4].a - 7, s: holdL(S5, S[4].a, 0.0025) }],
  6: [{ f: S[5].a - 7, s: holdL(S6, S[5].a, 0.0012) }, VK(R6_V, R6_VD, holdL(S6P, PV(R6_V + R6_VD), 0.0004))],
  7: [{ f: S[6].a - 7, s: holdL(S7A, S[6].a, 0.0015) },
    { f: PV(R7_V), cut: true, s: via(holdL(S7A, S[6].a, 0.0015), W7, holdL(S7B, PV(R7_V + R7_VD), 0.001), PV(R7_V), PV(R7_V + R7_VD) - PV(R7_V), 0.08, 0.74) }],
  8: [{ f: S[7].a - 7, s: holdL(S8, S[7].a, 0.0015) }, VK(R8_V, R8_VD, holdL(S8P, PV(R8_V + R8_VD), 0.0004))],
  9: [{ f: S[8].a - 7, s: creepL(S9F, (S[8].a + S[8].b) / 2, 0.0006, [0.004, 0, 0]) }],
  10: [{ f: S[9].a - 7, s: holdL(S10A, PV(R10_V), 0.0015) },
    { f: PV(R10_V), cut: true, s: orbitLog(holdL(S10A, PV(R10_V), 0.0015), holdL(S10B, PV(R10_V + R10_VD), 0.0015),
      PV(R10_V), PV(R10_V + R10_VD) - PV(R10_V), cruise(0.2, 0.55), R10_ANG, R10_ANG) }],
  11: [{ f: S[10].a - 7, s: holdL(S11, S[10].a, 0.0016) }, VK(R11_V, R11_VD, holdL(S11P, PV(R11_V + R11_VD), 0.0012))],
  12: [{ f: S[11].a - 7, s: holdL(S12A, S[11].a, 0.0015) },
    { f: PV(R12_V), cut: true, s: dipLook(orbitLog(holdL(S12A, S[11].a, 0.0015), holdL(S12H, PV(R12_V + R12_VD), 0.001), PV(R12_V), PV(R12_V + R12_VD) - PV(R12_V), R12_DIST, R12_ANG, R12_ANG), R12_DIP) }],
  13: [{ f: S[12].a - 7, s: holdL(S13A, S[12].a, 0.0018) }, VK(R13_AB_V, R13_AB_VD, holdL(F13_AB, PV(R13_AB_V + R13_AB_VD), 0.0005)),
    VK(R13_C_V, R13_C_VD, holdL(F13_C, PV(R13_C_V + R13_C_VD), 0.0008), cruise(0.3, 0.3))],
  14: [{ f: S[13].a - 7, s: creepL(S14, (S[13].a + S[13].b) / 2, 0.0006, [0.003, 0, 0]) }],
  15: [{ f: S[14].a - 7, s: holdL(S15A, S[14].a, 0.0008) }, VK(R15_V, R15_VD, holdL(S15B, PV(R15_V + R15_VD), 0.0015), cruise(0.35, 0.35)),
    VK(R15_W_V, R15_W_VD, holdL(S15W, PV(R15_W_V + R15_W_VD), 0.001))],
  16: [{ f: S[15].a - 7, s: loopCam }],
};

// impact kicks: the image offset flips sign every VIDEO frame and decays over n frames (t0 s, gain, n f): a small one on
// the bank stamp ("money") and on the trading board's crash ("crashed"); never near frame 0 / the last frame
// CAM r3 (ADD life): two more small hits: the BANKRUPT notice slapping onto the gate sign (2 f before "bust", with the
// thunder) and the SHARES arrows dropping on "crashed" (the bwomp)
const KICKS: [number, number, number][] = [[BEAT.money / FPS, 0.6, 6], [(BEAT.crashed1 + 1) / FPS, 1.0, 8], [(BEAT.bust - 2) / FPS, 0.5, 6], [(BEAT.crashed2 + 1) / FPS, 0.45, 6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g, n0] of KICKS) {
    const n = Math.floor(V(t * FPS) - V(t0 * FPS) + 1e-6);
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
// ---------------- the sun pins: one world sun per place ----------------
// world.ts turns the sun from each shot's MEAN view direction (camAt every 3 f over [a, b)) by sunAz; these are the WORLD
// headings (deg, atan2(z, x) of the direction TOWARD the sun) per exterior shot, so every shot of one place and light
// shares one sun whatever its camera does. Tank top: the dawn sun rises over the harbour (-z, a little +x: backlight,
// long shadows toward the default camera); noon / late from the +x side. World.ts lights the loop shot EXACTLY like
// shot 1 (the seam). Interiors use their lights' world-fixed `key` instead.
const SUN_WORLD: Record<number, number> = { 1: -63, 16: -63, 4: 30, 7: 30, 2: 40, 9: 40, 14: -55 };  // build r1: camera-side tank walls sun-lit (WORLD-EXT)
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
  // a straight cut between f and f + 1 is not motion: measure the step on the side of the cut that f belongs to
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
// cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp. CU 12-16, MS 8-12, wides 0-3; board
// shots stay (almost) sharp so the words read. Entries switch at f, or ramp over dur (CAM r1: a ramp now RACKS: both
// cInf and the focus point glide (smootherstep) from the previous entry's settled values, so no focus ever snaps).
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eyes = (p: V3, h = EYE): (() => V3) => () => [p[0], p[1] + h, p[2]];
/** a rack focus: the focus point glides from a to b over the picture window [f0, f0 + dur] (video-timed smootherstep) */
const rack = (a: V3, b: V3, f0: number, dur: number) => (f: number): V3 => lerp3(a, b, glide(vt(f, f0, dur)));
/** a DOF ramp over a VIDEO window (v0, vd) */
const DV = (v0: number, vd: number, cInf: number, focus?: (f: number) => V3): Dof => ({ f: PV(v0), dur: PV(v0 + vd) - PV(v0), cInf, ...(focus ? { focus } : {}) });
void rack;
const OIL0: V3 = [TK.hatch.c[0], TK.hatch.oil, TK.hatch.c[2]];
// the cafe is painted on the window view card (OF.window), so the rack focuses on the window plane, not on OF.cafe
const INV_EYE: V3 = of([OF.investor[0], 1.18, OF.investor[2]]), CAFE: V3 = of([-0.2, 1.55, -5.27]);  // build r1: the painted cafe layer 2.8 m behind the glass (WORLD-INT)
/** CAM r3: the shot-15 MS focus, between his eyes and the BUY slip */
const FOCUS15A: V3 = lerp3(INV_EYE, of([OF.slip[0], OF.slip[1] + 0.05, OF.slip[2]]), 0.45);
const DOFS: Record<number, Dof[]> = {
  // P0 (frame 0 and the last frame) uses the SAME entry in shot 1 and the loop shot, so the loop frame is identical
  // shot 1: the rack follows the crane from the oil to the tank man; the near rail falls soft (a foreground framer)
  1: [{ f: 0, cInf: 4, focus: () => OIL0 }, DV(R1_V, R1_VD, 5, eyes(tk(TK.kneel), 0.9))],
  2: [{ f: 0, cInf: 2, focus: () => tf([0, 3.5, 16]) }, DV(R2_V, R2_VD, 7, eyes(tf(TF.tino)))],
  // shot 3: a real 30 f rack from the banker to the window (the inspector's walk) with the glide; the banker stays
  // within ~4 px of blur while he is on screen
  3: [{ f: 0, cInf: 8, focus: eyes(bk(BK.banker)) }, DV(R3_V, 30, 5, () => bk(BK.window.c))],
  // shot 4: A (medium-wide on the roof) nearly sharp on the tank man, racking to him at the rail with the glide; at the
  // cut B (the ground two-shot) is sharp on the inspector, whose clipboard board must read
  4: [{ f: 0, cInf: 4, focus: () => tk([0.1, 11.6, 5.3]) }, DV(R4_M_V, R4_M_VD, 6, () => tk([TK.shout[0], TK.shout[1] + 1.2, TK.shout[2]])),
    { f: Math.round(PV(R4_CUT_V)), cInf: 6, focus: () => tk([TK.inspGround[0] + 0.15, 1.1, TK.inspGround[2] + 0.2]) }],
  5: [{ f: 0, cInf: 9, focus: () => bk([0, 1.0, -0.6]) }],
  // shot 6: the chart (and Tino at its edge) sharp, the bookcase / back wall soft; the rack follows the glide to TINO'S OIL
  6: [{ f: 0, cInf: 10, focus: () => chartPt(0.2, 0, 0.15) }, DV(R6_V, R6_VD, 10, () => chartPt(0.6, -0.1, 0.2))],
  // shot 7 (CAM r2): the landing focuses BETWEEN the real face (top) and its reflection (centre): both within ~1 px
  7: [{ f: 0, cInf: 8, focus: eyes(tk(TK.peer), 0.8) }, DV(R7_V, R7_VD, 8, () => lerp3(tk([-0.36, 11.43, 5.42]), tk(TK.reflect), 0.55))],
  // shot 8 (CAM r2, A2 P1): ONE focus between Tino, the traders and the board, a shallow lens (cInf 2): all within ~1 px,
  // no rack (Tino stays sharp on his crash grimace, the dive reads)
  8: [{ f: 0, cInf: 2, focus: () => tr([0.0, 1.55, -1.2]) }],
  9: [{ f: 0, cInf: 2, focus: () => tf([1.0, 2.0, 12.6]) }],  // CAM r2: focus between the notice (7.6 m) and the stair (21.5 m)
  10: [{ f: 0, cInf: 0 }],
  11: [{ f: 0, cInf: 12, focus: () => ki([KI.bottle.c[0], KI.bottle.c[1] + 0.16, KI.bottle.c[2]]) }],
  12: [{ f: 0, cInf: 0 }, DV(R12_V, R12_VD, 6, () => cu([HATCH12[0], CU.hatch.c[1] + 0.36, HATCH12[2] + CU.hatch.r])),
    DV(R12_V + R12_VD - 10, 12, 6, () => cu([HATCH12[0], CU.oil, HATCH12[2]]))],
  // shot 13: the lens follows the blob along the pipe, tightening as the follow lands on its medium
  13: [{ f: 0, cInf: 5, focus: (f) => pr([Math.max(-3.4, blobXs(f)), 1.6, -3.4]) },
    DV(V(COUNT_AT[1]), 50, 9, (f) => pr([blobXs(f), 1.6, -3.4]))],
  14: [{ f: 0, cInf: 4, focus: () => st(ST.poster.c) }],
  // shot 15: real racks (the focus point glides): to the cafe 8 f before "trusted" (22 f), held ~0.5 s, back to him 8 f
  // before "His name?" (20 f); the investor never passes ~6 px of blur; on "Warren" the push keeps him sharp
  // CAM r3 (A3 P1 / P2): the MS focuses between his eyes and the BUY slip (both within ~1.5 px); the cafe rack holds
  // ~1 s (2546-2576) and returns ON "Warren" (lands 2596); the Warren push deepens the lens only after that rack lands
  15: [{ f: 0, cInf: 10, focus: () => FOCUS15A }, DV(R15_V, 34, 8, () => INV_EYE),
    DV(V(BEAT.trusted) - 8, 22, 6, () => CAFE), DV(V(BEAT.hisName) + 6, 20, 8, () => INV_EYE), DV(V(BEAT.hisName) + 27, 36, 10, () => INV_EYE)],
  16: [{ f: 0, cInf: 4, focus: () => OIL0 }],
};
/** the lens of shot id at frame f: the active entry, ramping (cInf AND focus point, smootherstep on the video clock)
 *  from the previous entry's settled values; entries without a focus inherit the last one (none at all = the look point) */
export const dofAt = (id: number, f: number) => {
  const L = DOFS[id] ?? [{ f: 0, cInf: 0 }];
  const a = SHOTS[id - 1].a;
  let i = 0; while (i + 1 < L.length && f >= (L[i + 1].f || a)) i++;
  const fo = (j: number): ((f: number) => V3) | undefined => { for (let k = j; k >= 0; k--) if (L[k].focus) return L[k].focus; return undefined; };
  const d = L[i], p = L[Math.max(0, i - 1)], fb = fo(i), fa = i > 0 ? fo(i - 1) : fb;
  const k = d.dur ? glide(clamp01(vt(f, d.f, d.dur))) : 1;
  const focus = fa && fb && fa !== fb && k < 1 ? (ff: number): V3 => lerp3(fa(ff), fb(ff), k) : fb;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus };
};
export { wi, WORDS, PW, PWE };
// (TF / BK / TR / KI / ST anchors are read through the place helpers above)
void TF; void BK; void TR; void KI; void ST;

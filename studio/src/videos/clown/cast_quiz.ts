// STAGE MODULE (REBUILD v2, owner ANIMATOR A): Q1 THE COUNT, Q2 THE ANSWER, Q3 YOU SAW HIM, and through remap.ts E1-E3
// (they arrive here AS Q1 / Q2 / Q3 at the remapped picture time: the replay, the wave and the tape rewind come for free).
// ONE world on the quiz's picture clock f: every figure is a pure function of f (no state, no video clock), so E3's hold
// is exactly still and the state at TOTAL (picture time 0) IS frame 0.
//   - who walks where and when: cast_quiz_plan.ts (routes, keyed to COUNT / DUCKS / BEAT; checked by
//     out/clown/anim_quiz/p3/check3.mjs); the clown's route: plan.ts clownQ (his loop: plan.ts OVAL);
//   - the acting (this file): the five phone people chat (mouths, the free hand, laughs, nods), walk with weight, the two
//     duckers dip under bill 2 (eyes forward, still talking, never looking up); the decoys who SAW him (the pair, the
//     dog walker) look at him, point, laugh; the crowd crosses far back; the pigeons peck, hop and scatter LOW; the clown
//     honks beside the phone guy's head (frame 0 = the thumbnail), pedals off, wobbles and saves it, rides into the pigeon
//     flock on "Don't lose count.", honks at the pigeons, brakes in Q3, waves and honks.
// FIX ROUND 2 (p3) RULES kept here:
//   - NOTHING OF THE CLOWN goes toward the tree (AUDIT_test 1): his screen-LEFT arm never sticks out sideways (up, down or
//     across only), the horn and its honks are on his screen-right or over the phone guy's head on frame 0;
//   - nobody but the five has a hand above the chest (the pair only points, arm straight out, at the clown);
//   - no bird ever flies above wheel height in front of him (AUDIT_animation M8: nothing crosses the star's face);
//   - a ducker holds ONE face through the dip (the mouth keeps talking), the dip is eased (cast_quiz_plan.ts DUCK_OPT).
// E1's number badges: cast_quiz_pops.ts (EDIT's e1PopSpot rules + where every other figure stands at each hold).
import type { Eng, Stage, CamInfo, StageInfo } from "./cast";
import * as PPL from "./cast_people";
import type { Pose, Arm, ClownPose } from "./cast_people";
import * as CROWD from "./cast_crowd";
import type { CrowdId } from "./cast_crowd";
import { drawPigeon, drawDog } from "./cast_fx";
import * as VFX from "./cast_vfx";
import type { Expr, MouthK, Pen } from "./toon";
import { INK } from "./toon";
import { DUCKS, PIGEON_F, PIGEON_FLOCK, clownQ, WHEEL_R, COUNT, type V3 } from "./plan";
import { BEAT, SID, SHOTS } from "./beats";
import { camAt, quizCamAt, zoomAt } from "./story";
import { e1Hold } from "./remap";
import { setCountPopHook } from "./Overlays";
import { POP_SPOTS } from "./cast_quiz_pops";
import { QUIZ_ACTORS, routeAt, DUCK_OPT, GAG, RQ, cu, actor, P5_GO, type QuizActor } from "./cast_quiz_plan";

const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const c01 = (x: number) => clamp(x, 0, 1);
const sm = (x: number) => { const c = c01(x); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** up over [a, a + i], held, down over [b, b + o] */
const hold = (t: number, a: number, b: number, i = 8, o = 8) => sm((t - a) / i) * (1 - sm((t - b) / o));
const hh = (a: number, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

// ================================================================== WHO IS WHO
/** by PHONES index (count order, p3: red, pink, LIME, sky-blue, yellow). Ducker 1's phone was white on a white head
 *  (AUDIT_test 4): lime now, like every phone in ONE saturated colour (DESIGN's p3 phone) */
const PHONE_COL = [PPL.C.phoneRed, PPL.C.phonePink, PPL.C.phoneLime, PPL.C.phoneBlue, PPL.C.phoneYellow];
type DrawFn = (p: Pen, P: Pose) => void;
const DRAW: Partial<Record<QuizActor["who"], DrawFn>> = {
  red: PPL.drawPhoneGuy, white: PPL.drawWhite, hero: PPL.drawHero, blue: PPL.drawBlue, pink: PPL.drawPink,
  dude: PPL.drawDude, m2: PPL.drawM2, friendA: (p, P) => PPL.drawFriend(p, 0, P), friendB: (p, P) => PPL.drawFriend(p, 1, P), coffee: PPL.drawCoffee,
};
const CROWD_WHO = new Set(["dogwalker", "skater", "books", "tote", "elder", "scarf", "backpack", "runner", "beret", "parka", "cyclist"]);

/** the clown's head in the world at f (for gazes and points) */
const clownHead = (f: number): V3 => { const c = clownQ(f).p; return [c[0], 1.85, c[2]]; };

// ================================================================== THE PHONE PEOPLE
/** each one's manner on the call (CHAR v1 tics, v2 kit): the free hand's style, laugh rate, nods */
const MANNER: Record<string, { free: "talk" | "pocket" | "hip" | "flutter"; amp: number; laughExpr: Expr; listen: Expr }> = {
  p1: { free: "talk", amp: 1.25, laughExpr: "laughBig", listen: "bright" },
  p2: { free: "pocket", amp: 1, laughExpr: "laughBig", listen: "bright" },
  p3: { free: "talk", amp: 1, laughExpr: "laughBig", listen: "brightGrin" },
  p4: { free: "hip", amp: 1, laughExpr: "laughBig", listen: "brightGrin" },
  p5: { free: "flutter", amp: 1, laughExpr: "laughBig", listen: "brightGrin" },
};
/** where the three who stop to chat come to rest (p3: hair, backpack and hems swing on and settle: PPL.stopOverlap) */
const STOP_F: Record<string, number> = { p1: RQ(56), p5: RQ(82), p3: cu(0.76) };
const phonePerson = (E: Eng, out: Stage, cam: CamInfo, a: QuizActor, f: number, tanH: number) => {
  const st = routeAt(a.route, f, a.seed); if (!st.on) return;
  const sc0 = E.orientSC(cam, st.p, st.heading), M = MANNER[a.key], S = a.scale ?? 1;
  const go = c01(st.v / 0.32), chat = PPL.phoneChat(f + 37 * a.seed, a.seed), life = PPL.holdLife(f, a.seed, 1 - 0.6 * go);
  // THE DUCK (the two duckers): a dip with knee bend + torso fold + chin tuck (cast_people), hair / pack 2 f late; eyes
  // stay forward and open, the mouth keeps talking. ONE face from 4 f before the lift to 4 f after the rise (no laugh, no
  // blink, no listening face switching in: AUDIT_animation M2), the head tilted a little away from the bill at the low
  // point so a paused frame reads as a duck (AUDIT_test 14)
  const dOpt = a.duck !== undefined ? DUCK_OPT[a.duck] : null, dT = a.duck !== undefined ? DUCKS[a.duck].t + DUCK_OPT[a.duck].shift : 0;
  const duck = dOpt ? PPL.duckAt(f, dT, dOpt) : 0, dLag = dOpt ? PPL.duckLag(f, dT, dOpt) : 0, low = c01(duck);
  const inDuck = !!dOpt && f > dT - dOpt.hold / 2 - dOpt.drop - dOpt.lift - 4 && f < dT + dOpt.hold / 2 + dOpt.rise + 4;
  const laughing = chat.laughing && !inDuck;
  // standing to chat, a talker turns to face the lens a little (the phone stays at the same ear). p4: the pink one's
  // stand angle is fixed toward her exit (screen left), so the sign never flips when she starts to walk (B1)
  const sgn = a.key === "p5" ? -1 : Math.sign(sc0.s || 1);
  const face = c01(1 - go * 1.6), sc = { s: lerp(sc0.s, 0.3 * sgn, face), c: lerp(sc0.c, 0.92, face) }, back = sc.c < -0.35;
  // the free hand: talking beats / in the pocket / on the hip / a flutter; while walking fast it mostly swings.
  // p4 (AUDIT_test Q-c): the beats stay at CHEST height: the kit's "show" beat lifts an open hand beside the cheek, which
  // at phone size reads as a second phone (seen as "an extra waving an empty hand at head height" at f 222-245)
  const chestH = (A: Arm): Arm => ({ ...A, to: A.to === "show" ? "talk" : A.to, to2: A.to2 === "show" ? "talk" : A.to2 });
  let free: Arm | null;
  if (M.free === "pocket") free = { to: "pocket", front: !back };
  else if (M.free === "hip") free = chat.talking ? { ...chestH(PPL.talkHand(f, a.seed, true)), hs: 1.2 } : { to: "hip", front: !back };
  else if (M.free === "flutter") free = { ...chestH(PPL.talkHand(f, a.seed, chat.talking)), dy: -3 * Math.abs(Math.sin(TAU * f / 7)) * (chat.talking ? 1 : 0.4), hs: 1.2 };
  else free = { ...chestH(PPL.talkHand(f, a.seed, chat.talking)), hs: 1.15 * M.amp };
  if (go > 0.7 && M.free === "talk" && !chat.talking) free = null;                       // walking + listening: the arm swings
  const look = (a.key === "p1" ? -0.25 : 0.45 * sc.s) + life.look, lookY = (a.key === "p1" ? 0.3 : 0.12) + life.lookY + 0.25 * low;
  // DESIGN's p3 phone (one saturated colour, a dark keyline, in front of the head edge) with its size floor for far figures
  const depth = Math.hypot(cam.pos.x - st.p[0], cam.pos.z - st.p[2]), phone = PPL.phoneArm(PHONE_COL[a.phone!], 0, 0, PPL.phoneSizeAt(depth, tanH, S, 18));
  const P: Pose = { s: sc.s, c: sc.c, walk: PPL.walkPhase(st.s, a.route.gait), go, gait: a.route.gait,
    expr: laughing ? M.laughExpr : inDuck ? "blank" : chat.talking ? "bright" : M.listen,   /* p4 (AUDIT_animation E1-E3 1): through the dip the BLANK on-a-call stare (body ducks, mind elsewhere: the film's point), still talking */
    mouth: laughing ? "laugh" : chat.mouth ?? (chat.talking ? undefined : "smallSmile"), nod: chat.nod + 2.2 * low, look, lookY, blink: inDuck ? 0 : life.blink,
    breath: life.breath, headTilt: 0.6 * life.headTilt * (1 - low) + (laughing ? -5 : 0) + (a.duck === 0 ? -12 : 12) * low,
    /* (the body leans with the head while low, like dodging a twig: a held frame of E3's slow pass must read as a duck) */
    tilt: (go < 0.5 ? life.tilt : 0) + (a.duck === 0 ? -7 : 7) * low, shift: life.shift,
    duck, ...(dOpt ? { hairSwing: dLag, pack: 0.6 * dLag } : a.key === "p5" && f >= P5_GO - 6 ? PPL.stopOverlap(f, P5_GO, -1, 1.2) : STOP_F[a.key] !== undefined ? PPL.stopOverlap(f, STOP_F[a.key], Math.sign(sc0.s) || 1, 1) : {}), light: E.light2D(cam),   /* p4: the pink one's bob + hem swing as she sets off left */   /* NO head seed: the design sheet's heads, identical to the story sections (S1, S11, S13, S15, S20) */
    ...PPL.bodyArms(back, phone, free) };
  // p4 (RETENTION-1, the joke in one image from frame 0): the honk right at his ear BLOWS his hair and tie about (a gust
  // from each pump, decaying), while his face stays blank and bored, one slow blink, still talking: he never reacts
  if (a.key === "p1" && f < 26) {
    const env = [GAG.honk0, GAG.honk0b].reduce((m, h) => Math.max(m, f >= h ? Math.exp(-(f - h) / 5.5) : 0), 0), bt = Math.floor(f) - 6;
    P.wind = 1.6 * env; P.flutter = env * Math.sin((TAU * f) / 2.6); P.expr = "blank"; P.blink = bt >= 0 && bt < 5 ? [0.5, 1, 1, 1, 0.5][bt] : 0;
  }
  // p4 (AUDIT_test Q-a, duck 2 f 195-235): through a duck the phone hand FOLLOWS THE HEAD (its tilt, nod and the torso
  // fold), so the phone stays at the ear. The kit's "ear" target does not turn with headTilt: at the low point the phone
  // stayed up beside the background heads while her head went down (a possible sixth phone). Two correction steps from the
  // figure's own anchors keep the hand's offset from the ear what it is when upright
  if (dOpt && low > 0.005 && (a.who === "white" || a.who === "blue")) {
    const who = a.who as "white" | "blue", hi = (P.armL as Arm | null | undefined)?.prop?.k === "phone" ? 0 : 1, sd = hi === 0 ? -1 : 1;
    const col = PHONE_COL[a.phone!], size = PPL.phoneSizeAt(depth, tanH, S, 18);
    const ear = (A: PPL.Anchors): [number, number] => { const ux = A.crown[0] - A.head[0], uy = A.crown[1] - A.head[1], n = Math.hypot(ux, uy) || 1, up = [ux / n, uy / n], rv = [-up[1], up[0]];
      return [A.head[0] + sd * 1.03 * A.r * rv[0] - 0.14 * A.r * up[0], A.head[1] + sd * 1.03 * A.r * rv[1] - 0.14 * A.r * up[1]]; };
    const A0 = PPL.anchors(who, { ...P, duck: 0, nod: chat.nod, headTilt: 0, tilt: 0 }), e0 = ear(A0), h0 = A0.hands[hi];
    let dx = 0, dy = 0;
    for (let it = 0; it < 3; it++) {
      const A = PPL.anchors(who, { ...P, ...PPL.bodyArms(back, PPL.phoneArm(col, dx, dy, size), free) }), e = ear(A), h = A.hands[hi];
      dx += (e[0] - e0[0] - (h[0] - h0[0])) / A.u; dy += (e[1] - e0[1] - (h[1] - h0[1])) / A.u;
    }
    Object.assign(P, PPL.bodyArms(back, PPL.phoneArm(col, dx, dy, size), free));
  }
  E.putFig(out, cam, `q_${a.key}|${E.fkey(P)}`, st.p, (p) => DRAW[a.who]!(p, P), { scale: S });   // the two duckers are 12 % larger (the duck is needed)
};

// ================================================================== THE DECOYS (no phone; the ones who SAW him react)
const decoy = (E: Eng, out: Stage, cam: CamInfo, a: QuizActor, f: number) => {
  const st = routeAt(a.route, f, a.seed); if (!st.on) return;
  const sc = E.orientSC(cam, st.p, st.heading), back = sc.c < -0.35, go = c01(st.v / 0.3);
  if (a.who === "dogwalker") {
    /* p3 (D9, one background gag): on the pigeon scatter the far dog lunges at the birds and drags its walker
       (CROWD.crowdBit "dogPull", quiz-safe; he is far behind the gap between the sky-blue ducker and the clown) */
    const b = CROWD.crowdBit("dogPull", f, { f0: PIGEON_F - 2, s: sc.s, c: sc.c, metres: st.s, light: E.light2D(cam), seed: a.seed });
    E.putFig(out, cam, `q_${a.key}|${f}`, st.p, b.draw);
    return;
  }
  if (CROWD_WHO.has(a.who)) {
    const id = a.who as CrowdId;
    const P = CROWD.crowdPose(id, f, { s: sc.s, c: sc.c, metres: st.s, light: E.light2D(cam), seed: a.seed });
    if (a.sees) { const g = E.gaze([st.p[0], 1.4, st.p[2]], clownHead(f)); P.look = g.look; P.lookY = g.lookY; P.expr = "brightGrin"; }
    P.handK = 1.4;
    E.putFig(out, cam, `q_${a.key}|${E.fkey(P)}`, st.p, (p) => CROWD.drawCrowd(p, id, P));
    return;
  }
  const life = PPL.holdLife(f, a.seed, 1 - 0.6 * go), head: V3 = [st.p[0], 1.45, st.p[2]];
  const g = a.sees ? E.gaze(head, clownHead(f)) : { look: life.look + 0.4 * sc.s, lookY: life.lookY };
  const P: Pose = { s: sc.s, c: sc.c, walk: PPL.walkPhase(st.s, a.route.gait), go, gait: a.route.gait, expr: a.sees ? "brightGrin" : "bright",
    look: g.look, lookY: g.lookY, blink: life.blink, breath: life.breath, headTilt: life.headTilt, shift: life.shift, light: E.light2D(cam), handK: 1.45 };   /* no head seed: the dude / the pair are the S9 / S10 / S14 people */
  const yaw = E.cardYaw(cam, st.p), aim = E.onCard(cam, st.p, yaw, clownHead(f));
  /* p3 (AUDIT_test 5): NO decoy hand ever comes above the chest (an empty hand at a cheek is a sixth "phone" at phone size) */
  const down: Arm = { to: "hang" };
  if (a.who === "dude" || a.who === "m2") {
    // music (they only cross in Q2 / Q3 now: never during the count): the head bops on the beat, a low thumbs-up for the dude
    Object.assign(P, PPL.bopAt(f + 11 * a.seed, a.who === "dude" ? 104 : 96, 1));
    P.armL = { to: "pocket", front: !back }; P.armR = null;
    if (a.who === "dude") { const w0 = COUNT.b + 40; P.armR = PPL.thumbsUp(f, w0, w0 + 40); }
  } else if (a.who === "friendA" || a.who === "friendB") {
    // the pair: they chat (mouths only), and while they stop one POINTS at the clown (the arm straight out) and both laugh
    const A = a.who === "friendA", p0 = cu(0.3) + (A ? 0 : 5), p1 = cu(0.42) - 4;
    const turn = ((f + (A ? 0 : 60)) % 120) < 64, stop = hold(f, p0, p1, 6, 8);
    P.mouth = turn ? PPL.talkAt(((f % 120) + 120) % 120, 0, 64, a.seed) : undefined;
    P.expr = stop > 0.5 ? "laughBig" : turn ? "bright" : "brightGrin";
    if (stop > 0.4 && !A) P.mouth = "laugh";
    P.armL = down; P.armR = down;
    if (A) { const pt = PPL.pointArm(f, p0 + 4, aim, p1); if (sc.s >= 0) P.armR = pt; else P.armL = pt; }
  } else if (a.who === "coffee") {
    const cup: Arm = { to: "low", prop: { k: "cup" }, hand: "grip", dy: 1.5 * Math.sin(TAU * f / 15) }, pocket: Arm = { to: "pocket", front: !back };
    P.armL = back ? pocket : cup; P.armR = back ? cup : pocket;
    P.expr = "brightGrin";
  }
  E.putFig(out, cam, `q_${a.key}|${E.fkey(P)}`, st.p, (p) => DRAW[a.who]!(p, P));
};

// ================================================================== THE CLOWN
/** the toward-the-lens part of his heading through Q1's camera (plain maths; E.orientSC gives the same number in the stage) */
const clownC = (f: number) => { const C = clownQ(f), cam = camAt(SID.Q1, f), dx = cam.pos[0] - C.p[0], dz = cam.pos[2] - C.p[2], n = Math.hypot(dx, dz) || 1; return (Math.sin(C.heading) * dx + Math.cos(C.heading) * dz) / n; };
/** HIS BACK is seen twice in Q1: while he pedals off up the plaza after the opening honk (GAG.backIn .. backOut; then he
 *  turns and rides BACKWARD, face to us: a clown trick), and once on the loop's west side, where he rides away from the
 *  lens (AUDIT_animation: one clear back view per lap sells the riding). Everything else is played to the lens. */
const LOOP_BACK: [number, number] | null = (() => {
  let a = -1, b = -1;
  for (let f = DUCKS[0].t + 12; f < DUCKS[1].t - 8; f++) { if (clownC(f) < -0.5) { if (a < 0) a = f; b = f; } else if (a >= 0) break; }
  return a >= 0 && Math.min(b + 1, GAG.honkPigeons - 14) - a >= 10 ? [a, Math.min(b + 1, GAG.honkPigeons - 14)] : null;   /* p4: front again for the mischief beat before the pigeon honk */
})();
/* p4 (AUDIT_edit R5 / AUDIT_animation RETENTION-2): NO back view in the hook any more: from the honk to "phone." he rides
   BACKWARD up the plaza, face to the lens (he waves hello over his head and winks on "Count the people"); the only back
   view of Q1 is the loop's west side */
const BACK_WIN: [number, number][] = [...(LOOP_BACK ? [LOOP_BACK] : [])];
// ---- p3 POLISH (FIX2 D9): the effects kit and his bits. Everything is on his screen right or over his own head.
/** the juggle's frames (see HIS JUGGLE below) and the cheer honk after it */
const JUG = { f0: GAG.jugRel - 8, rel: GAG.jugRel, cat: GAG.jugCat, f1: GAG.jugCat + 6 }, CHEER = GAG.cheer;
/** p4: the two honks while he rides backward up the plaza: one before the phone guy walks off past him (he hid the clown
 *  for ~10 f at f 108-118, honk and all) and one right after he has gone */
const Q_HONK = [cu(0.105), cu(0.235)];
/** every honk of the quiz and its rings (VFX.honkRings, his motif). The two opening pumps send their rings UP from the bell
 *  (toward the tree they would end on the phone guy's far side, near the bills) */
const HONKS: { f0: number; dir?: number; r?: number; n?: number }[] = [{ f0: GAG.honk0, dir: -78, r: 36, n: 2 }, { f0: GAG.honk0b, dir: -78, r: 36, n: 2 },
  { f0: Q_HONK[0] }, { f0: Q_HONK[1] }, { f0: PIGEON_F + 24 }, { f0: GAG.honkPigeons }, { f0: GAG.honkPigeons + 9 }, { f0: CHEER }, { f0: GAG.honkWave }];
/** his two jaw drops (the wobble on DUCKS[0], the pigeon flock): a take (squash, pop), surprise lines and a "!" over his hat */
const SURPRISE = [GAG.wobble + 1, PIGEON_F - 1];
// ---- p4 (AUDIT_animation M1 / RETENTION-1, 2, 4): HIS FACES. The star had one face (a polite closed smile); now a range
// keyed to the honks and the words, every beat held >= 10 f with a clear change of SIZE (eyes, brows, mouth, cheeks):
//   BLAST on every honk (eyes squeezed shut, brows up, lips pressed, the cheeks PUFFED: drawn over his face, they bulge
//   past its outline), a big open grin after the opening honk, a cheeky WINK + brow waggles to the lens in the hook
//   ("Count the people"), through the count delight -> a PANIC on the wobble (white eyes, "O") -> a relieved PHEW (puffed
//   cheeks, then he blows it out) -> the flock flinch -> a PROUD grin (chest out) -> MISCHIEF (a sly side-eye at the
//   re-landed pigeons) -> BLAST -> a belly laugh -> proud again; the show-off on "Five." (eyes leave the juggle for the
//   lens, one brow up); in Q3 a cheeky half-lid on the brake, brows high + the open grin on "saw him", and on "right?" a
//   WINK, two brow waggles and a puffed-cheek honk held to the cut (E2 replays Q3 up to picture "right?": it shows the wink
//   coming in). All of it on his own card: he is on the right, away from the bills.
type CFace = { expr: Expr; mouth?: MouthK; wink?: number; brow?: [number, number]; blast?: number; look?: number; lookY?: number; tiltH?: number; noBlink?: boolean };
/** two quick brow waggles (2 f up, 2 f down, twice) from f0, amp in u */
const wag = (f: number, f0: number, amp = 9) => amp * (PPL.bump(f, f0, 2, 2) + PPL.bump(f, f0 + 5, 2, 2));
/** a honk's BLAST window (the squeeze at h): from 2 f before to 10 f after (the cheeks swell in 2 f, go in over 2 f) */
const BLAST_W: [number, number][] = (() => {
  const hs = [Q_HONK[0], Q_HONK[1], PIGEON_F + 24, GAG.honkPigeons, GAG.honkPigeons + 9, CHEER].map((h) => [h - 2, h + 10] as [number, number]).sort((a, b) => a[0] - b[0]);
  const o: [number, number][] = []; for (const w of hs) { const l = o[o.length - 1]; if (l && w[0] <= l[1] + 2) l[1] = Math.max(l[1], w[1]); else o.push([...w]); } return o;
})();
const W1 = GAG.wobble + 1, PH = { a: W1 + 13, blow: W1 + 18, b: PIGEON_F - 3 };
const clownFace = (f: number): CFace | null => {
  const win = (a: number, b: number) => f >= a && f < b, ramp = (a: number, b: number) => Math.max(0, Math.min(1, (f - a) / 2, (b - f) / 2));
  // the hook (Q1 f 0 .. "phone.")
  if (f < 11) return { expr: "inhale", blast: 1, brow: [7, 7], noBlink: true };                                            // frame 0 = the thumbnail: the BLAST
  if (win(11, 28)) return { expr: "delightB", brow: [5, 5], noBlink: f < 20 };                                             // the big open grin
  if (win(28, 46)) return { expr: "brightGrin", mouth: "grin", wink: -1, brow: [0, wag(f, 33)], look: 0, lookY: 0, tiltH: -6 * PPL.bump(f, 28, 4, 14), noBlink: true };   // "Count the people": the cheeky wink
  if (win(46, 66)) return { expr: "thrillB", look: 0, lookY: 0 };
  // the count
  for (const [a, b] of BLAST_W) if (win(a, b)) return { expr: "inhale", blast: ramp(a, b), brow: [6, 6], noBlink: true };
  if (win(W1, PH.a)) return { expr: "ohWide", brow: [6, 6], noBlink: true };                                             // PANIC on the wobble
  if (win(PH.a, PH.b)) return f < PH.blow ? { expr: "inhale", blast: 0.75 * ramp(PH.a, PH.blow + 2), brow: [-2, -2], noBlink: true } : { expr: "sigh", mouth: "o" };   // PHEW: puff ... blow
  if (win(PH.b, PIGEON_F + 13)) return { expr: "jawDrop", noBlink: true };                                              // the flock: the flinch
  if (win(PIGEON_F + 13, PIGEON_F + 22)) return { expr: "laughBig" };
  if (win(PIGEON_F + 32, PIGEON_F + 22 + 23)) return { expr: "proudB", brow: [3, 5] };                                     // (after the blast at the flock) proud
  if (win(GAG.honkPigeons - 12, GAG.honkPigeons - 2)) return { expr: "sly", look: 1.1, lookY: 0.2, brow: [0, 4 + wag(f, GAG.honkPigeons - 10, 5)] };   // MISCHIEF at the re-landed pigeons
  { const l0 = GAG.honkPigeons + 19; if (win(l0, l0 + 14)) return { expr: "laughBig", noBlink: true }; }                  // the belly laugh as they fly off
  { const p0 = GAG.honkPigeons + 33; if (win(p0, JUG.f0 + 2)) return { expr: "proudB", brow: [4, 6] }; }                  // proud, rocking on the spot
  // Q2: the show-off on "Five." (the juggle goes on without him looking), the cheer honk is a BLAST (above)
  if (win(BEAT.five - 4, BEAT.five + 10)) return { expr: "brightGrin", mouth: "grin", brow: [0, 9], look: 0, lookY: 0, tiltH: 4, noBlink: true };
  if (win(CHEER + 10, GAG.brake - 2)) return { expr: "delightB", look: 0, lookY: 0 };
  // Q3 "You saw him, right?"
  if (win(GAG.brake - 2, BEAT.sawHim - 1)) return { expr: "smugB", brow: [0, 3], look: 0, lookY: 0, noBlink: true };
  if (win(BEAT.sawHim - 1, BEAT.right - 4)) return { expr: "delightB", brow: [10, 10], look: 0, lookY: 0, noBlink: true };
  if (f >= BEAT.right - 4) { const hk = ramp(GAG.honkWave - 1, 1e9);
    return { expr: "brightGrin", mouth: hk > 0.5 ? "tight" : "grin", wink: -1, brow: [0, 3 + wag(f, BEAT.right - 1)], blast: hk, look: 0, lookY: 0, tiltH: -5, noBlink: true }; }
  return null;
};
/** the PUFFED CHEEKS of a blast (k 0..1), drawn over his face on his own card: two face-white balls with an ink edge and a
 *  blush, low on the face either side of the mouth, bulging a little past the face's outline */
const cheeks = (pen: Pen, A: PPL.ClownAnchors, k: number, facing: number) => {
  if (k <= 0.02) return;
  const ux = A.crown[0] - A.head[0], uy = A.crown[1] - A.head[1], n = Math.hypot(ux, uy) || 1, up = [ux / n, uy / n], rv = [-up[1], up[0]], r = A.r, u = A.u;
  for (const sd of [-1, 1]) {
    const ox = sd * (0.57 + 0.07 * k) * r + 0.14 * r * facing, oy = 0.45 * r, c: [number, number] = [A.head[0] + ox * rv[0] - oy * up[0], A.head[1] + ox * rv[1] - oy * up[1]];
    const rx = (0.2 + 0.12 * k) * r, ry = (0.16 + 0.09 * k) * r;
    pen.ell(c[0], c[1], rx, ry, "#fdfbf6", 1.9 * u);
    const g = pen.g; g.save(); g.globalAlpha = 0.5 * k; pen.ell(c[0] + 0.05 * rx * sd, c[1] + 0.12 * ry, rx * 0.62, ry * 0.5, "#ef8b7b", 0); g.restore();
    pen.arc(c[0] - 0.25 * rx * sd, c[1] - 0.3 * ry, rx * 0.42, ry * 0.32, 200, 300, 1.1 * u, "#ffffff");
  }
};
/** HIS BITS: a pigeon lands on his hat while he rides backward up the plaza (he goes cross-eyed, it pecks, it leaves), and he
 *  JUGGLES on the spot before "How many?" and on into Q2 as he rides at the lens (the cheer honk follows on "Five.") */
const BIT_PIGEON = GAG.pigeonHat;
/** HIS JUGGLE: two balls and HIS OWN HORN in a cascade. The horn leaves his right hand at `rel` and the same hand catches it
 *  two rounds later at `cat` (the kit's "juggle" has no horn in it: the horn would vanish for its length); the balls grow
 *  out of his hands and shrink back in over 3 f (no pop). Then the CHEER honk, a button after "Five." */
const rot2 = (c: [number, number], u: number, deg: number) => { const a = (deg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a); return (x: number, y: number): [number, number] => [c[0] + (x * cs - y * sn) * u, c[1] + (x * sn + y * cs) * u]; };
/** the horn in the air (the bulb at c, the bell toward `deg`; 0 = up) */
const hornGlyph = (pen: Pen, c: [number, number], u: number, deg: number) => {
  const R = rot2(c, u, deg), b = R(0, 0);
  pen.poly([R(-3.2, -6), R(3.2, -6), R(3.6, -24), R(11, -41), R(-11, -41), R(-3.6, -24)], "#f2b632", 1.6 * u);
  pen.dot(b[0], b[1], 9.6 * u, INK); pen.dot(b[0], b[1], 8 * u, "#3a3442");
};
const jugBall = (pen: Pen, c: [number, number], r: number, col: string) => { if (r < 0.5) return; pen.dot(c[0], c[1], 1.16 * r, INK); pen.dot(c[0], c[1], r, col); pen.dot(c[0] - 0.32 * r, c[1] - 0.35 * r, 0.26 * r, "#ffffff"); };
/** his acting on the quiz clock (the route itself is plan.ts clownQ) */
const clown = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const C = clownQ(f), v = C.v * 30;
  // he IDLES by rocking (a unicyclist cannot stand still): on the spot before "How many?" and under the wave in Q3;
  // the brake itself: 3 cm back and forth after the wheel stops
  const rk = PPL.clownRock(f), rockK = sm((f - (GAG.brake + 14)) / 10) + hold(f, DUCKS[1].t + 40, COUNT.b - 10, 8, 8);
  const tB = f - (GAG.brake + 4), stopRock = tB > 6 ? -0.03 * Math.sin((Math.PI * (tB - 6)) / 12) * Math.exp(-(tB - 6) / 14) : 0;
  const rock = stopRock + 0.6 * rockK * rk.d;
  const hd: V3 = [Math.sin(C.heading), 0, Math.cos(C.heading)], p: V3 = [C.p[0] + hd[0] * rock, 0, C.p[2] + hd[2] * rock];
  const sc = E.orientSC(cam, p, C.heading);
  let view: "front" | "back" = "front", sq = 1;
  if (f < COUNT.b) for (const [a, b] of BACK_WIN) {
    if (f >= a && f < b) view = "back";
    if (f >= a - 2 && f < a + 3) sq = PPL.flipAt(f, a, "front").sq;
    if (f >= b - 2 && f < b + 3) sq = PPL.flipAt(f, b, "back").sq;
  }
  const ride = PPL.clownRide(f, 3);
  // lean into the turn (seen as a roll when he rides toward / away from the lens), the ride's wobble on top
  const lean = PPL.circleLean(v, 1 / Math.max(0.2, Math.abs(C.curv))) * Math.sign(C.curv) * sc.c;
  let roll = clamp(lean, -16, 16) + (ride.roll ?? 0) + rockK * rk.roll, tilt = rockK * rk.tilt, hatLag = ride.hatLag ?? 0, ruff = 0, hop = 0, stretch = 1;
  let expr: Expr = "brightGrin", mouth: MouthK | undefined, look = ride.look ?? 0, lookY = ride.lookY ?? 0, blink = ride.blink ?? 0, headTilt = 0;
  // THE ARMS. The HORN is in his LEFT hand: screen-right in a front view, screen-left from behind. At rest: in a front view
  // the horn is held out on screen right and the free hand (screen LEFT, the tree's side) rides LOW by his hip; from behind
  // the horn hangs low by his side and the free hand (screen right) is out for balance
  const hornSide = view === "back" ? -1 : 1, horn0 = { k: "horn" as const, squeeze: 0 };
  /* (from behind the horn hangs straight down along his leg, the forearm a little inward: nothing sticks out on the tree's side) */
  let horn: Arm = view === "back" ? { fk: [8, -18], fkK: 1, hand: "grip", prop: horn0, front: false } : { to: "show", hand: "grip", prop: horn0, dy: 2 * Math.sin(TAU * f / 23) };
  /** the tree-side arm (screen LEFT in a front view) raised by k (0 = hanging by his side, 1 = straight up). It goes up and
   *  comes down ACROSS his chest (negative FK angles), never out to its own side: a plain blend from "down" to "up" swings
   *  the hand out sideways, toward the phone guy and the bills (seen on the first p3 stills at f 14, 64 and 100) */
  const leftUp = (k: number, w0 = 0, w1 = 0): Arm => ({ fk: [12 + 3 * Math.sin(TAU * f / 23) * (1 - k) - 192 * k + w0 * k, 6 + 5 * Math.sin(TAU * f / 19 + 1) * (1 - k) - 186 * k + w1 * k], fkK: 1, hand: "open", ang: 10, front: k > 0.06 && k < 0.94 ? k < 0.5 : undefined });   /* p4: from chest height up the across path goes BEHIND his head (in front it swept over his face for ~3 f) */
  /* (from behind too: both hands hang by his sides at rest. An arm held out sideways for balance ended up reaching toward
     the sky-blue ducker on the loop's west side: seen on the p3 clip at f 188-196) */
  let free: Arm = leftUp(0);
  /** honks at the frames `fs` (the bulb squashed on each, the body jiggles, the hat and ruff kick); between them the horn
   *  hand rests at `rest` */
  const honks = (fs: number[], rest: PPL.ArmTo = "show", extra: Partial<Arm> = {}) => {
    let sqz = 0, dy = 0, on = false;
    for (const f0 of fs) {
      if (f < f0 - 5 || f >= f0 + 16) continue;
      const H = PPL.clownHonk(f, f0, rest), J = PPL.honkJiggle(f, f0, 0.8); on = true;
      sqz = Math.max(sqz, H.squeeze); dy += H.arm.dy ?? 0; hatLag += H.hatLag; ruff += H.ruff + J.ruff; stretch *= J.stretch;
      if (f >= f0 - 3 && f < f0 + 14) { expr = "thrillB"; mouth = f >= f0 + 6 ? "laugh" : "smileWide"; }
    }
    if (on) horn = { to: rest, dy, hand: "grip", prop: { k: "horn", squeeze: sqz }, ...extra };
    return on;
  };
  if (f < COUNT.b - 8) {
    if (f < GAG.backIn) {
      // ---- FRAME 0: THE THUMBNAIL + the 8-frame lead-in before "Quick test.": two big pumps of the horn right beside the
      // phone guy's head (the bell at his ear: never across his glasses, never left of his head), the free hand straight UP
      const k = 1 - sm((f - RQ(11)) / 8);
      honks([GAG.honk0, GAG.honk0b], "show");
      horn = { ...horn, fk: [-20, -62], fkK: k, ang: -92 * k };
      /* (the free hand stays UP until he turns his back: lowering it here would sweep it out toward the tree) */
      free = { fk: [172, 176 + 5 * Math.sin(TAU * f / 9)], fkK: 1, hand: "open", ang: 12 };
      look = lerp(look, -1.1, k); lookY = lerp(lookY, 0.25, k); if (k > 0.5) blink = 0;
      if (k > 0.5 && f > GAG.honk0b + 13) { expr = "thrillB"; mouth = "smileWide"; }
    } else if (view === "back") {
      // ---- he pedals off up the plaza (his back): a big wave goodbye over his head with the free hand (screen right)
      // (the same arm that was up on frame 0: his right, on screen right now; a narrow wave straight over his head, so it stays in frame)
      { const up = hold(f, GAG.backIn - 8, GAG.backOut - 5, 4, 7), w = TAU * (f - GAG.backIn) / 11;
        free = { ...leftUp(up, 5 * Math.sin(w), 20 * Math.sin(w + 0.5)), hs: 1.15 }; }
    } else if (f < DUCKS[0].t - 12) {
      // ---- riding backward up the plaza, face to us: the horn held HIGH on screen right (a showman's ta-da) and two honks.
      // p4: from the opening honk to "people" the free hand stays UP and WAVES hello over his head (its fk is the
      // across-the-chest form of "up", the same pose as frame 0's), then it comes down ACROSS his chest by "phone."
      // (never out toward the tree); the tree-side hand stays low after that
      { const up = 1 - sm((f - 50) / 6), w = (TAU * (f - GAG.backIn)) / 11;   /* (it comes down after the wink, by "phone.", in 6 f: the across-the-chest path passes his face quickly) */
        /* (the arm stands a little OUTSIDE vertical and the forearm waves on the outside only: it never crosses his hat or his winking eye) */
        if (up > 0.002) free = { ...leftUp(up, -14 + 4 * Math.sin(w), -17 + 11 * Math.sin(w + 0.5)), hs: 1.15 };
        /* (the first 6 f blend from frame 0's raised hand, fk [172, 176] = [-188, -184] here, so nothing jumps) */
        const e = sm((f - GAG.backIn) / 6);
        if (e < 1 && free.fk) free = { ...free, fk: [lerp(-188, free.fk[0], e), lerp(-184 + 5 * Math.sin((TAU * f) / 9), free.fk[1], e)], ang: lerp(12, 10, e) }; }
      const t0 = cu(0.03), ta = hold(f, t0, t0 + 24, 8, 10);
      if (ta > 0.02) horn = { to: "show", to2: "up", k: ta, hand: "grip", prop: horn0 };
      honks([Q_HONK[0], Q_HONK[1]], "up");
      if (ta > 0.5) expr = "thrillB";
      look = 0.2 * Math.sin(TAU * f / 70);
    }
    // ---- DUCKS[0]: THE WOBBLE-AND-SAVE at the loop's far end (the tip peaks on the duck frame). The horn arm (screen right)
    // windmills; the tree-side arm flails OVER HIS HEAD, never out toward the tree
    { const W = PPL.clownWobble(f, GAG.wobble, sc.s >= 0 ? 1 : -1), t = f - GAG.wobble;
      if (t >= -2 && t < 50 && view === "front") {
        const fl = t >= 0 && t < 30 ? Math.min(1, t / 3) * (t < 26 ? 1 : 1 - (t - 26) / 4) : 0, w = (TAU * t) / 9;
        roll += W.roll; horn = { ...W.armR, prop: horn0, hand: "grip" };
        /* p4: the windmill stays OUTSIDE vertical (it swung across his panic face at f 136-141), up / down in 3-4 f */
        free = leftUp(fl, -16 + 18 * Math.sin(w), -18 + 20 * Math.sin(w + 1.1));
        expr = W.expr === "laughBig" && t > 38 ? "brightGrin" : W.expr; hatLag += W.hatLag; if (t >= 22 && t < 40) mouth = "laugh"; blink = 0; look = 0; lookY = -0.1; } }
    // ---- "Don't lose count.": he rides into the pigeon flock: a flinch (both arms UP, jaw drop), the birds scatter LOW past
    // his wheel, then a laugh and a honk after them (the horn high on screen right)
    { const t = f - PIGEON_F;
      if (t >= -4 && t < 46 && view === "front") {
        const fl = hold(f, PIGEON_F - 2, PIGEON_F + 12, 4, 10);
        free = leftUp(fl, -10, -8);   /* p4: outside vertical (never across his face) */
        if (t < 20) horn = { to: "show", to2: "guard", k: fl, hand: "grip", prop: horn0 };
        else honks([PIGEON_F + 24], "up");
        expr = t < 14 ? "jawDrop" : t < 32 ? "laughBig" : "brightGrin"; roll += 4 * fl * Math.sin((TAU * t) / 10); tilt -= 5 * fl; lookY = -0.3 * fl;
        hop = 0.06 * sm((t + 2) / 4) * (1 - sm((t - 4) / 5));
      } }
    // ---- DUCKS[1]: at the far end, riding east, he HONKS TO SCREEN RIGHT at the re-landed pigeons (AUDIT_test 8: the gag
    // faces and reaches away from the ducker and the bill); two pumps, the horn pointing right; they take off
    { const t = f - GAG.honkPigeons;
      if (t >= -8 && t < 34 && view === "front") {
        honks([GAG.honkPigeons, GAG.honkPigeons + 9], "show", { to2: "point", k: hold(f, GAG.honkPigeons - 6, GAG.honkPigeons + 22, 5, 8) });
        expr = t < 24 ? "thrillB" : "brightGrin"; look = 0.9; lookY = 0.15; headTilt += 4 * hold(f, GAG.honkPigeons - 6, GAG.honkPigeons + 22, 5, 8);
      } }
    // ---- on the spot before "How many?" he rocks and JUGGLES (the bit below; it runs on into Q2)
  } else {
    // ---- Q2 / Q3: he rides out of his spot at the lens, BRAKES (pitch forward, a squash, the hat lags, rock back), a big
    // WAVE from the elbow and a honk with the other hand, a huge happy face, eyes on the lens
    /* eyes OPEN from the brake to the end of the wave (p2 had a blink on the brake: in E2 it fell on "You saw the clown") */
    look = 0; lookY = 0; expr = "brightGrin"; blink = f >= GAG.brake - 6 ? 0 : PPL.blinkAt(f, 41);
    const Bk = PPL.clownBrake(f, GAG.brake, 1), W = PPL.waveArm(f, GAG.wave, -1, { swings: 3.5, per: 11, amp: 30 });
    tilt += 1.3 * Bk.tilt; roll += Bk.roll * 0.5;   /* p4 (AUDIT_animation Q3-2): the brake pitch 30 % bigger, so it reads at phone size */
    stretch *= 1 - 0.07 * PPL.bump(f, GAG.brake + 1, 3, 5) + 0.04 * PPL.bump(f, GAG.brake + 6, 4, 7); hatLag += 10 * PPL.bump(f, GAG.brake + 2, 3, 9);
    if (f < GAG.brake - 2) {
      // Q2: he juggles on (below), catches the horn and gives a CHEER honk, the horn high on screen RIGHT, right after "Five."
      // (the tree-side hand stays low: AUDIT_test B)
      honks([CHEER], "show", { to2: "up", k: hold(f, CHEER - 5, CHEER + 14, 5, 8) });
    }
    if (f >= GAG.brake - 2 && f < GAG.wave - 10) { free = Bk.armL; horn = { ...Bk.armR, hand: "grip", prop: horn0 }; }
    if (f >= GAG.wave - 12) {
      free = { ...W.arm, fk: W.arm.fk ? [W.arm.fk[0] + 14, W.arm.fk[1] + 20] : undefined }; headTilt += W.headTilt; tilt += W.tilt; expr = "thrillB"; mouth = "smileWide";
      honks([GAG.honkWave], "show"); if (f > GAG.honkWave + 16) { expr = "brightGrin"; mouth = "laugh"; }
    }
  }
  // ---- p3: THE JUGGLE (JUG): both hands come up from where they are (the horn hand from its rest by the Arm's own IK -> FK
  // blend), the eyes follow the things, the head sways
  const jk = view === "front" ? hold(f, JUG.f0, JUG.cat + 1, 6, 5) : 0, jw = (TAU * (f - JUG.rel)) / 12, inAir = f >= JUG.rel && f < JUG.cat;
  if (jk > 0.005) {
    free = { fk: [lerp(12, 68, jk), lerp(6, 142 + 14 * Math.sin(jw), jk)], fkK: 1, hand: "open", ang: 20 * jk };
    horn = { to: "show", fk: [68, 142 - 14 * Math.sin(jw)], fkK: jk, ang: -20 * jk, ...(inAir ? { hand: "open" as const } : { hand: "grip" as const, prop: horn0 }) };
    look = 0.6 * Math.sin(jw / 2) * jk; lookY = lerp(lookY, -0.9, jk); headTilt += 3 * Math.sin(jw / 2) * jk; if (jk > 0.5) { expr = "brightGrin"; mouth = undefined; blink = 0; }
  }
  // ---- p3: the take on a jaw drop, the tyre's squash when he lands from the hop
  let nod = 0;
  for (const s0 of SURPRISE) { const tk = PPL.takeAt(f, s0 - 3, 0.8); stretch *= tk.stretch; nod += tk.nod; }
  stretch *= PPL.landSquash(f, PIGEON_F + 8, 0.7).stretch;
  // ---- p3: his bits (front view only)
  let bit: PPL.ClownBit | null = null;
  /* (side -1: the bird comes down from the upper left of his hat and leaves to the upper RIGHT, away from the tree) */
  if (view === "front" && f >= BIT_PIGEON && f <= BIT_PIGEON + PPL.CLOWN_BITS.pigeonHat) bit = PPL.clownBit("pigeonHat", f, BIT_PIGEON, -1);
  // ---- p4: HIS FACES (clownFace above) win over everything else on a front view; a bit keeps its own look / cross-eyes
  const CF = view === "front" ? clownFace(f) : null, blastK = CF?.blast ?? 0;
  if (CF) { expr = CF.expr; mouth = CF.mouth; if (CF.look !== undefined) look = CF.look; if (CF.lookY !== undefined) lookY = CF.lookY; if (CF.noBlink) blink = 0; headTilt += CF.tiltH ?? 0; }
  const faceX = { blush: 0.6 + 0.4 * blastK, ...(CF?.wink ? { wink: CF.wink } : {}), ...(CF?.brow ? { browUp: CF.brow } : {}) };
  if (bit) bit = { ...bit, pose: { ...bit.pose, stretch: stretch * (bit.pose.stretch ?? 1), hatLag: hatLag + (bit.pose.hatLag ?? 0), headTilt: headTilt + (bit.pose.headTilt ?? 0), ...(CF ? { expr: CF.expr } : {}) } };
  const fxOn = !!bit || jk > 0.005 || blastK > 0.02 || HONKS.some((h) => f >= h.f0 && f < h.f0 + 44) || SURPRISE.some((s0) => f >= s0 - 1 && f < s0 + 30);
  const P: ClownPose = { s: sc.s, c: sc.c, view, facing: view === "front" ? (Math.abs(sc.s) > 0.3 ? (Math.sign(sc.s) as 1 | -1) : 0) : undefined,
    spin: C.spin + rock / WHEEL_R, wheelR: WHEEL_R, roll, hop, ruff, hatLag, tilt, headTilt, sq, stretch, nod,
    expr, mouth, look, lookY, blink, breath: Math.sin(TAU * f / 100), light: E.light2D(cam), face: faceX,   /* no head seed: the same clown head as the story sections */
    armL: hornSide < 0 ? horn : free, armR: hornSide < 0 ? free : horn, handK: 1.15 };
  E.putFig(out, cam, `q_clown|${E.fkey(P)}${fxOn ? `|${f}` : ""}`, p, (pen) => {
    if (bit) PPL.drawClownBit(pen, P, bit); else PPL.drawClown(pen, P);
    if (!fxOn) return;
    const A = PPL.clownAnchors(bit ? { ...P, ...bit.pose } : P), u = A.u;
    cheeks(pen, A, blastK, P.facing ?? 0);
    if (A.horn) for (const h of HONKS) VFX.honkRings(pen, f, h.f0, A.horn, { u, dir: h.dir ?? A.hornDir, r: h.r, n: h.n });
    if (f >= JUG.rel - 3 && f < JUG.cat + 3) {   // the cascade: each thing flies hand to hand in 12 f, a 112 u arc over his head
      const [L, R] = A.hands, g = clamp(Math.min((f - (JUG.rel - 3)) / 3, (JUG.cat + 3 - f) / 3), 0, 1);
      [0, 1, 2].forEach((i) => {
        const ph = ((((f - JUG.rel) / 24 + 0.5 + i / 3) % 1) + 1) % 1, fwd = ph < 0.5, q = fwd ? ph / 0.5 : (ph - 0.5) / 0.5, a = fwd ? L : R, b = fwd ? R : L;
        const c: [number, number] = [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q - 12 * u - 112 * u * 4 * q * (1 - q)];
        if (i === 0) { if (inAir) hornGlyph(pen, c, u, 14 + 360 * q * (fwd ? 1 : -1)); } else jugBall(pen, c, 9 * u * g, i === 1 ? "#e9342c" : "#36b0ff");
      });
    }
    for (const s0 of SURPRISE) { VFX.surpriseLines(pen, f, s0, A.head, { u }); VFX.bang(pen, f, s0 + 2, [A.crown[0], A.crown[1] - 14 * u], { u, ch: "!" }); }
  }, { scale: 1 / PPL.CLOWN_K, blobSc: 1.25 });
  // p4: the PHEW after the wobble: he blows out his puffed cheeks (a ghost card: the puff fades), away to screen right
  if (view === "front" && f >= PH.blow && f < PH.blow + 26) E.putGhost(out, cam, `q_phew|${f}`, p, (pen) => { const A = PPL.clownAnchors(P); VFX.puff(pen, f, PH.blow, [A.mouth[0] + 10 * A.u, A.mouth[1]], { u: A.u, dir: -15 }); }, 1 / PPL.CLOWN_K);
  // the BRAKE's dust (Q3; a ghost card at his wheel: a fading puff pops on a lit figure card)
  if (f >= GAG.brake && f < GAG.brake + 26) E.putGhost(out, cam, `q_brakeDust|${f}`, p, (pen) => { const A = PPL.clownAnchors(P); VFX.dust(pen, f, GAG.brake, [A.wheel[0], 972], { u: A.u, kind: "skid" }); }, 1 / PPL.CLOWN_K);
};

// ================================================================== THE PIGEONS
// p3 (AUDIT_animation M8, AUDIT_viewer): NO bird ever rises above wheel height near the clown: a scatter is a low burst
// along the ground (a hop-flutter <= 0.55 m), outward past his wheel, so nothing crosses his face and nothing reads as a
// juggled object. Only the flock's LAST take-off (after his honk on DUCKS[1]) climbs, and it starts on his screen right
// and goes up and away to the right.
type Bird = { home: V3; face: 1 | -1; ph: number };
/** the FLOCK he rides into on "Don't lose count." (plan.ts PIGEON_FLOCK = 0.8 m ahead of him then): it scatters low to
 *  the lens side of his loop, a little to screen right (SPOT), pecks there, and takes off on his honk at DUCKS[1].
 *  It walks in from the right edge at ~19 % of the count (see below) */
const FLOCK: Bird[] = [[-0.5, 0.1], [0.0, -0.2], [0.15, 0.28], [-0.28, 0.42], [-0.14, -0.5], [-0.65, -0.18]].map(([dx, dz], i) => ({ home: [PIGEON_FLOCK[0] + dx, 0, PIGEON_FLOCK[2] + dz] as V3, face: (i % 2 ? 1 : -1) as 1 | -1, ph: hh(i, 3) }));
const SPOT: V3[] = [[0.06, 0, 1.3], [0.34, 0, 1.0], [0.2, 0, 1.55], [0.44, 0, 1.36], [-0.06, 0, 1.64], [0.3, 0, 1.76]].map(([dx, , dz]) => [clownQ(DUCKS[1].t).p[0] + dx, 0, clownQ(DUCKS[1].t).p[2] + dz] as V3);
/** THE DOG: a small terrier bounds across the near ground in the middle of the count (low: it never crosses the bills),
 *  scattering the near pigeons */
const DOG = { f0: cu(0.47), f1: cu(0.47) + 40, from: [-1.7, 0, 10.95] as V3, to: [2.4, 0, 10.65] as V3 };
const dogAt = (f: number) => { const u = (f - DOG.f0) / (DOG.f1 - DOG.f0); return { u, p: [lerp(DOG.from[0], DOG.to[0], u), 0, lerp(DOG.from[2], DOG.to[2], u)] as V3 }; };
const dog = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const d = dogAt(f); if (d.u < -0.02 || d.u > 1.02) return;
  const m = d.u * Math.hypot(DOG.to[0] - DOG.from[0], DOG.to[2] - DOG.from[2]), cyc = m / 0.42, ph = E.q(cyc, 8), wag = E.q(f / 3, 6);
  /* a bounding run: the body rises and falls once per stride (p3: it slid on stiff legs) */
  const bound = 0.07 * Math.abs(Math.sin(Math.PI * cyc));
  E.putFig(out, cam, `q_dog|${ph}|${wag}|${E.q(bound, 40)}`, [d.p[0], bound, d.p[2]], (pen) => { drawDog(pen, 300, 1, ph, 3.4, "#d9944e", wag); }, { blobSc: 0.55 });
};
/** the near group in the foreground (the lower third's life), right of the caption's middle and low in the frame; the dog
 *  startles them (group B runs off for good), and they all scatter LOW to the sides as the clown rides at the lens in Q2 */
const NEAR: Bird[] = [[0.25, 10.35], [0.75, 10.7], [1.0, 10.25], [0.5, 10.95]].map(([x, z], i) => ({ home: [x, 0, z] as V3, face: (i % 2 ? -1 : 1) as 1 | -1, ph: hh(i + 9, 4) }));
const NEAR_B: Bird[] = [[-0.35, 11.0], [0.1, 11.25], [-0.75, 10.75]].map(([x, z], i) => ({ home: [x, 0, z] as V3, face: (i % 2 ? 1 : -1) as 1 | -1, ph: hh(i + 21, 4) }));
const putBird = (E: Eng, out: Stage, cam: CamInfo, p: V3, st: { run: number; flap: number; wing: number; peck: number; lift: number }, faceRight: boolean) => {
  const q = { run: E.q(((st.run % 1) + 1) % 1, 24), flap: E.q(st.flap, 10), wing: E.q(((st.wing % 1) + 1) % 1, 12), peck: E.q(st.peck, 6), lift: E.q(st.lift, 8) };
  E.putFig(out, cam, `q_bird|${JSON.stringify(q)}`, p, (pen) => drawPigeon(pen, q), { scale: 0.2, mirror: faceRight, blobSc: 0.3, noBlob: p[1] > 0.4 });
};
/** a pecking / hopping bird at its home (hashed slots: peck, look up, a little hop) */
const idleBird = (b: Bird, f: number, n: number) => {
  const slot = Math.floor((f + b.ph * 60) / 40), u = ((f + b.ph * 60) % 40 + 40) % 40 / 40, r = hh(n * 7 + slot, 2);
  const peck = r < 0.55 && u > 0.2 && u < 0.75 && Math.sin(u * TAU * 3) > 0 ? 1 : 0;
  const hop = r > 0.8 ? Math.max(0, Math.sin(Math.PI * c01((u - 0.3) / 0.3))) : 0;
  return { peck, hop, dx: r > 0.8 ? 0.12 * sm((u - 0.3) / 0.3) * (hh(n, slot) > 0.5 ? 1 : -1) : 0, run: hop > 0 ? u * 3 : 0 };
};
/** a flight from a to b starting at f0 over dur frames (an arc h metres high), flapping */
const flight = (a: V3, b: V3, f: number, f0: number, dur: number, h = 1.3) => {
  const u = c01((f - f0) / dur), e = 1 - (1 - u) ** 2;
  return { p: [lerp(a[0], b[0], e), h * Math.sin(Math.PI * u) + 0.02, lerp(a[2], b[2], e)] as V3, u };
};
/** a LOW scatter (the burst): a fast hop-flutter along the ground from a to b, never above `h` (wheel height) */
const scatter = (E: Eng, out: Stage, cam: CamInfo, a: V3, b: V3, f: number, f0: number, dur: number, n: number, h = 0.5) => {
  const F = flight(a, b, f, f0, dur, h);
  putBird(E, out, cam, F.p, { run: F.u * 4, flap: F.u < 0.8 ? 1 : 1 - (F.u - 0.8) / 0.2, wing: (f - f0) / 3 + n * 0.3, peck: 0, lift: F.u < 0.75 ? 0.8 : 0.3 }, b[0] > a[0]);
};
const pigeons = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  // the flock
  FLOCK.forEach((b, n) => {
    const t0 = PIGEON_F - 2 + Math.floor(hh(n, 5) * 5), spot = SPOT[n], t1 = GAG.honkPigeons + 4 + Math.floor(hh(n, 6) * 5), cl = clownQ(f).p;
    /* the flock is not there while he rides up the plaza (its ground is on his way): the birds SCURRY IN from the right
       edge after he has passed, a little parade on foot, and are pecking by the time he comes round the loop */
    const arr = cu(0.19) + 3 * n, inF = 26;
    if (f < arr) return;
    if (f < arr + inF) { const e = sm((f - arr) / inF); putBird(E, out, cam, [lerp(b.home[0] + 1.7, b.home[0], e), 0.02 + 0.03 * Math.abs(Math.sin((f - arr) / 2.2)), b.home[2]], { run: (f - arr) / 5, flap: 0, wing: 0, peck: 0, lift: 0 }, false); return; }
    if (f < t0) { const I = idleBird(b, f, n), awayK = c01(1 - Math.hypot(cl[0] - b.home[0], cl[2] - b.home[2]) / 1.2);
      putBird(E, out, cam, [b.home[0] + I.dx, 0.02 + 0.06 * I.hop, b.home[2]], { run: I.run + (awayK * f) / 5, flap: 0, wing: 0, peck: awayK > 0.3 ? 0 : I.peck, lift: 0 }, b.face > 0); return; }
    if (f < t0 + 30) { scatter(E, out, cam, b.home, spot, f, t0, 30, n, 0.45 + 0.1 * hh(n, 8)); return; }
    if (f < t1) { const I = idleBird(b, f, n + 20); putBird(E, out, cam, [spot[0] + I.dx, 0.02 + 0.06 * I.hop, spot[2]], { run: I.run, flap: 0, wing: 0, peck: I.peck, lift: 0 }, n % 2 === 0); return; }
    // the take-off on his honk: up and away to the RIGHT, over the far plaza (they start on his screen right)
    const far: V3 = [spot[0] + 2.8 + n * 0.4, 0, spot[2] - 6 - n * 0.6], F2 = flight(spot, far, f, t1, 60, 4.5);
    if (F2.u < 1) putBird(E, out, cam, [F2.p[0], 0.02 + 4.5 * Math.sin(Math.PI * Math.min(0.5, F2.u)) * 1.2 * F2.u, F2.p[2]], { run: 0, flap: 1, wing: (f - t1) / 4 + n * 0.3, peck: 0, lift: 1 }, true);
  });
  // the near group: pecking life in the foreground; a startled hop when the dog bounds past; a LOW scatter to the sides as
  // the clown starts toward the lens in Q2 (none of them is left when he brakes: nothing crosses his face in Q3 / E2)
  NEAR.forEach((b, n) => {
    const t0 = COUNT.b + 10 + n * 3, hopF = DOG.f0 + 10 + 5 * n, st = hold(f, hopF, hopF + 10, 4, 8);
    if (f < t0) { const I = idleBird(b, f, n + 40);
      putBird(E, out, cam, [b.home[0] + I.dx + 0.3 * st * (n % 2 ? 1 : -1), 0.02 + 0.06 * I.hop + 0.3 * st * Math.sin(Math.PI * c01((f - hopF) / 18)), b.home[2] + 0.15 * st], { run: I.run, flap: st > 0.1 ? 1 : 0, wing: f / 4 + n, peck: st > 0.1 ? 0 : I.peck, lift: 0.6 * st }, b.face > 0); return; }
    const to: V3 = [b.home[0] + (n % 2 ? 2.6 : -2.6), 0, b.home[2] + 0.4];
    if (f < t0 + 24) scatter(E, out, cam, b.home, to, f, t0, 24, n, 0.4);
  });
  // group B: the dog sends them off for good, low, to the two sides
  NEAR_B.forEach((b, n) => {
    const t0 = DOG.f0 + 4 + Math.round(((b.home[0] - DOG.from[0]) / (DOG.to[0] - DOG.from[0])) * (DOG.f1 - DOG.f0)) - 4 + (n % 3);
    if (f < t0) { const I = idleBird(b, f, n + 60); putBird(E, out, cam, [b.home[0] + I.dx, 0.02 + 0.06 * I.hop, b.home[2]], { run: I.run, flap: 0, wing: 0, peck: I.peck, lift: 0 }, b.face > 0); return; }
    const to: V3 = [b.home[0] - 2.4 - 0.4 * n, 0, b.home[2] + 0.5];
    if (f < t0 + 28) scatter(E, out, cam, b.home, to, f, t0, 28, n, 0.5);
  });
};

/** p3: a few FEATHERS drift down after each pigeon moment (the low scatter, the take-off on his honk, the near group's
 *  scatter in Q2): ghost cards standing where the birds were */
const feathers = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const at = (name: string, f0: number, pos: V3, n: number, w: number, sc = 1) => { if (f >= f0 && f < f0 + 78) E.putGhost(out, cam, `q_fth_${name}|${f}`, pos, (pen) => VFX.feathers(pen, f, f0, [300, 790], { n, w, ground: 972, seed: n }), sc); };
  at("scatter", PIGEON_F + 1, [PIGEON_FLOCK[0] - 0.2, 0, PIGEON_FLOCK[2]], 5, 300);
  at("takeoff", GAG.honkPigeons + 7, [SPOT[2][0], 0, SPOT[2][2]], 7, 360);
  at("near", COUNT.b + 13, [0.6, 0, 10.6], 4, 520, 0.55);   // (3 m from Q2's lens: at full size they were 60-90 px blades)
};

// ================================================================== E1: THE NUMBER BADGES (cast_quiz_pops.ts places them)
setCountPopHook((f) => {
  const h = e1Hold(f); if (h.k < 0) return null;
  const S = POP_SPOTS[h.k], s = S.at, t = S.tip, z = zoomAt(SID.E1, f);
  /* p4 (AUDIT_edit R6): + the pointer notch's target (the nearest point of the person's head), through the same zoom */
  return { n: h.k + 1, k: c01(h.u * 4), x: z.x + (s[0] - z.x) * z.k, y: z.y + (s[1] - z.y) * z.k, tx: z.x + (t[0] - z.x) * z.k, ty: z.y + (t[1] - z.y) * z.k };
});

// ================================================================== THE STAGE
export const stageQuiz = (E: Eng, out: Stage, cam: CamInfo, id: number, f: number, R: StageInfo): void => {
  void R;
  void id;
  const tanH = Math.tan((quizCamAt(f).fov * Math.PI) / 360);
  clown(E, out, cam, f);
  for (const a of QUIZ_ACTORS) { if (a.phone !== undefined) phonePerson(E, out, cam, a, f, tanH); else decoy(E, out, cam, a, f); }
  pigeons(E, out, cam, f);
  feathers(E, out, cam, f);
  dog(E, out, cam, f);
};
void actor; void SHOTS;

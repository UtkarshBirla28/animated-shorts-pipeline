// THE BACKGROUND CROWD of "The Clown Nobody Saw" (owner CHAR): 14 simple, varied campus extras so every shot has life
// (BUILD_PLAN_v2 law 3), with CHEAP walk / idle / chat cycles. Pure functions of the frame, like cast_people.ts.
//
//   import * as CROWD from "./cast_crowd";
//   const P = CROWD.crowdPose("tote", f, { s, c, metres, light, seed });      // a ready Pose (gait, blinks, the tic)
//   E.putFig(out, cam, `crowd_tote_${E.fkey(P)}`, pos, (p) => CROWD.drawCrowd(p, "tote", P));
//
// QUIZ RULE: nobody in the crowd ever holds anything near an ear or looks at a screen (only the five phone people do).
// The chatters gesture at chest height; the frisbee throw is a side-arm throw at chest height.
// Colours: cool / pale / muted against the brick; no teal (the hero's), no clown purple + yellow pair.
import { Pen, Outfit, P2, rig, mix, shade, rrect, INK, blobPts } from "./toon";
import * as PPL from "./cast_people";
import type { Pose, Arm, Gait, Extras } from "./cast_people";
import * as FX from "./cast_fx";
import * as VFX from "./cast_vfx";

const TAU = Math.PI * 2;
const UM = 1 / 0.00216;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export type CrowdId = "skater" | "cyclist" | "dogwalker" | "chatA" | "chatB" | "frisbee" | "tote" | "books" | "scarf" | "beret" | "runner" | "elder" | "parka" | "backpack";
/** extra state of the special extras: the cyclist's wheel / pedal angle (rad), the skater's push (0..1), the dog's gait
 *  phase, the frisbee throw (0..1.2 from frisbeeAt) */
export type CrowdPose = Pose & { spin?: number; push?: number; dogPh?: number; throwK?: number };
type Def = { o: Outfit; gait: Gait; tic: "walk" | "chat" | "listen" | "ride" | "skate" | "dog" | "throw" | "books" | "jog"; layer?: NonNullable<Extras["post"]>; note: string };

// ---------------- costume layers ----------------
type Lx = NonNullable<Extras["post"]>;
/** a knit BEANIE with a fold and a pompom */
const beanie = (col: string): Lx => (p, X) => {
  const { R, u } = X, H = R.H, hc = R.hc; p.rot = X.headRot;
  const dome: P2[] = []; for (let i = 0; i <= 20; i++) { const t = Math.PI + (Math.PI * i) / 20; dome.push([300 + 1.06 * H.a * Math.cos(t), hc - 0.32 * H.b + 0.86 * H.b * Math.sin(t)]); }
  p.poly(dome, col, 2.2 * u);
  p.band([[300 - 1.05 * H.a, hc - 0.36 * H.b], [300 + 1.05 * H.a, hc - 0.36 * H.b]], shade(col, 0.82), 0.18 * H.b, 1.6 * u, "round");
  for (let k = -3; k <= 3; k++) p.stroke([[300 + k * 0.26 * H.a, hc - 0.48 * H.b], [300 + k * 0.24 * H.a, hc - 0.9 * H.b + Math.abs(k) * 0.08 * H.b]], 1.1 * u, shade(col, 0.8));
  p.poly(blobPts(300, hc - 1.2 * H.b, { a: 0.2 * H.a, b: 0.19 * H.a, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: 0, noise: 0.05, seed: 3 }), mix(col, "#ffffff", 0.55), 1.8 * u);
  p.rot = null;
};
/** a bike HELMET (vents, a strap) */
const helmet = (col: string): Lx => (p, X) => {
  const { R, u } = X, H = R.H, hc = R.hc; p.rot = X.headRot;
  const dome: P2[] = []; for (let i = 0; i <= 20; i++) { const t = Math.PI + (Math.PI * i) / 20; dome.push([300 + 1.1 * H.a * Math.cos(t), hc - 0.28 * H.b + 0.95 * H.b * Math.sin(t)]); }
  dome.push([300 + 1.1 * H.a, hc - 0.2 * H.b], [300 - 1.1 * H.a, hc - 0.2 * H.b]);
  p.poly(dome, col, 2.2 * u);
  for (const k of [-0.45, 0, 0.45]) p.stroke([[300 + k * H.a, hc - 1.1 * H.b], [300 + k * 1.2 * H.a, hc - 0.5 * H.b]], 4 * u, shade(col, 0.55));
  if (!X.back) for (const sd of [-1, 1]) p.stroke([[300 + sd * 0.95 * H.a, hc - 0.25 * H.b], [300 + sd * 0.55 * H.a, hc + 0.92 * H.b]], 1.4 * u, "#2a2230");
  p.rot = null;
};
/** a BERET tilted on the head */
const beret = (col: string): Lx => (p, X) => {
  const { R, u } = X, H = R.H, hc = R.hc; p.rot = X.headRot;
  const b = blobPts(300 + 0.18 * H.a, hc - 0.82 * H.b, { a: 0.92 * H.a, b: 0.26 * H.b, nTop: 2, nBot: 2.6, egg: 0, asym: 0, rot: -0.14, noise: 0.01, seed: 5 });
  p.poly(b, col, 2.2 * u); p.stroke([[300 + 0.2 * H.a, hc - 1.06 * H.b], [300 + 0.24 * H.a, hc - 1.2 * H.b]], 2.4 * u, col);
  p.rot = null;
};
/** a striped SCARF round the neck with a hanging tail */
const scarf = (a: string, b: string): Lx => (p, X) => {
  const { R, u } = X, { tcx, chin, HH, T } = R; p.rot = X.bodyRot;
  p.band([[tcx - 0.62 * T.a, chin + 0.01 * HH], [tcx, chin + 0.08 * HH], [tcx + 0.62 * T.a, chin + 0.01 * HH]], a, 0.1 * HH, 1.5 * u, "round");
  if (!X.back) { const x0 = tcx + 0.3 * T.a; p.band([[x0, chin + 0.06 * HH], [x0 + 2 * u, chin + 0.42 * HH]], a, 9 * u, 1.4 * u, "butt");
    for (const k of [0.16, 0.28, 0.4]) p.stroke([[x0 - 4 * u, chin + k * HH], [x0 + 6 * u, chin + k * HH]], 2.6 * u, b); }
  p.rot = null;
};
/** a MESSENGER bag: a strap across the chest, the bag at the hip */
const messenger = (col: string): Lx => (p, X) => {
  const { R, u } = X, { tcx, chin, HH, T, torsoBot } = R; p.rot = X.bodyRot;
  p.band([[tcx - 0.66 * T.a, chin], [tcx + 0.95 * T.a, torsoBot - 0.18 * HH]], shade(col, 0.75), 4 * u, 1 * u, "butt");
  p.poly(rrect(tcx + 0.6 * T.a, torsoBot - 0.3 * HH, tcx + 1.35 * T.a, torsoBot + 0.04 * HH, 3 * u), col, 1.8 * u);
  p.stroke([[tcx + 0.6 * T.a, torsoBot - 0.18 * HH], [tcx + 1.35 * T.a, torsoBot - 0.18 * HH]], 1.4 * u, shade(col, 0.7));
  p.rot = null;
};
/** a small daypack (straps in front, the pack from behind) */
const daypack = (col: string): Lx => (p, X) => {
  const { R, u } = X, { tcx, chin, HH, T, torsoBot } = R; p.rot = X.bodyRot;
  if (X.back) { p.poly(rrect(tcx - 0.8 * T.a, chin + 0.1 * HH, tcx + 0.8 * T.a, torsoBot - 0.12 * HH, 12 * u), col, 2.2 * u); p.stroke([[tcx - 0.5 * T.a, chin + 0.5 * HH], [tcx + 0.5 * T.a, chin + 0.5 * HH]], 1.6 * u, shade(col, 0.7)); }
  else for (const sd of [-1, 1]) p.band([[tcx + sd * 0.62 * T.a, chin - 0.02 * HH], [tcx + sd * 0.82 * T.a, chin + 0.48 * HH]], col, 5.6 * u, 1.3 * u, "round");
  p.rot = null;
};
/** a canvas tote on the shoulder */
const tote = (col: string): Lx => (p, X) => { const { R, u } = X; p.rot = X.bodyRot; FX.drawTote(p, [R.tcx + (X.back ? -1 : 1) * 0.66 * R.T.a, R.chin + 0.02 * R.HH], u, X.back ? -1 : 1, col, 1.5 * Math.sin(TAU * (X.pose.walk ?? 0))); p.rot = null; };

// ---------------- THE CROWD ----------------
export const CROWD: Record<CrowdId, Def> = {
  skater: { o: { shirt: "#f4f4f0", pants: "#2a2a34", shoes: "#2a2a34", hair: "#3a2418", hairStyle: "messy", build: "tall" }, gait: "walk", tic: "skate", layer: beanie("#d8433a"), note: "red beanie, white tee, on a skateboard (pushes every ~2.3 s)" },
  cyclist: { o: { shirt: "#3f7d4f", pants: "#2e3442", shoes: "#e8e4da", hair: "#2a1e1a", hairStyle: "crop" }, gait: "walk", tic: "ride", layer: helmet("#f2f4f8"), note: "green jacket, white helmet, on a red bike (spin = metres / 0.34)" },
  dogwalker: { o: { shirt: "#5b6fb0", cardigan: "#7d8fd0", pants: "#3a3f52", shoes: "#5a3b2a", hair: "#b8b8c4", hairStyle: "bob", build: "small" }, gait: "stroll", tic: "dog", note: "periwinkle cardigan, grey bob, a dog on a red lead (the dog trots ahead)" },
  chatA: { o: { shirt: "#7f8fe0", pants: "#33384a", shoes: "#f4f1ea", hair: "#2a1e1a", hairStyle: "short", collar: true, collarCol: "#f4f6fb" }, gait: "stroll", tic: "chat", note: "periwinkle sweater: talks with both hands (chest height)" },
  chatB: { o: { shirt: "#f4ead6", overalls: "#2c4f80", pants: "#2c4f80", shoes: "#c8452c", hair: "#5a3b2a", hairStyle: "bun", build: "small" }, gait: "stroll", tic: "listen", note: "denim overalls, a bun: listens, nods, laughs" },
  frisbee: { o: { shirt: "#e8eef8", pants: "#4a5f8a", shoes: "#e8452c", hair: "#1a1416", hairStyle: "crop", build: "tall" }, gait: "jog", tic: "throw", note: "pale polo: a side-arm frisbee throw at chest height (frisbeeAt)" },
  tote: { o: { shirt: "#f2e6cc", dress: true, blouse: "#fbf8f2", pants: "#5579b8", shoes: "#3a2a2a", hair: "#4a2c20", hairStyle: "bob", build: "small" }, gait: "walk", tic: "walk", layer: tote("#efe3c6"), note: "cream sweater + denim skirt, a ginger bob, a canvas tote" },
  books: { o: { shirt: "#a8aeb8", cardigan: "#8a909c", pants: "#2e3442", shoes: "#3a2a20", hair: "#3a2418", hairStyle: "side", glasses: "round" }, gait: "walk", tic: "books", note: "grey cardigan, glasses, books hugged to the chest" },
  scarf: { o: { shirt: "#2b3550", pants: "#2a2f3c", shoes: "#1f1a20", hair: "#5a3b2a", hairStyle: "swept", build: "tall" }, gait: "walk", tic: "walk", layer: (p, X) => { scarf("#e0b84a", "#2b3550")(p, X); messenger("#8a6a4a")(p, X); }, note: "navy peacoat, a mustard striped scarf, a messenger bag" },
  beret: { o: { shirt: "#8f89c4", pants: "#3a3550", shoes: "#2a2226", hair: "#1c1820", hairStyle: "bob", build: "small" }, gait: "walk", tic: "walk", layer: beret("#2b3550"), note: "lilac-grey coat, a navy beret" },
  runner: { o: { shirt: "#f2f4f8", pants: "#26365e", shoes: "#36b0ff", hair: "#6a3a1e", hairStyle: "pony", build: "small" }, gait: "jog", tic: "jog", note: "white top, navy leggings, a jog" },
  elder: { o: { shirt: "#9aa0aa", cardigan: "#7a808c", pants: "#4a4a52", shoes: "#3a2a20", hair: "#d8d8de", hairStyle: "bald", hat: "flatcap", hatCol: "#5a6170", moustache: "#d8d8de", build: "round" }, gait: "stroll", tic: "walk", note: "an older man in a flat cap, a slow stroll" },
  parka: { o: { shirt: "#5b8f5a", hoodie: true, pants: "#3a3f52", shoes: "#f4f1ea", hair: "#2a1e1a", hairStyle: "curly" }, gait: "walk", tic: "walk", layer: daypack("#c94a3a"), note: "a moss-green hoodie, a red daypack" },
  backpack: { o: { shirt: "#e9d8a6", pants: "#3a4250", shoes: "#2a2226", hair: "#141018", hairStyle: "bowl" }, gait: "walk", tic: "walk", layer: daypack("#3a6fd0"), note: "a sand tee, a bowl cut, a blue daypack" },
};
export const CROWD_IDS = Object.keys(CROWD) as CrowdId[];
/** the natural speed (m/s) of an extra (use it to move them so the feet never slide) */
export const crowdSpeed = (id: CrowdId) => (CROWD[id].tic === "ride" ? 3.2 : CROWD[id].tic === "skate" ? 2.4 : PPL.gaitSpeed(CROWD[id].gait));

/** the frisbee THROW (0 -> 1.2): wind-up across the body 6 f, the side-arm throw 4 f (release at f0), follow-through 10 f.
 *  The frisbee leaves the hand at f0 (stage its flight in the world) */
export const frisbeeAt = (f: number, f0: number) => { const t = f - f0; return t < -10 ? 0 : t < -4 ? -0.6 * ((t + 10) / 6) : t < 0 ? -0.6 + 1.6 * ((t + 4) / 4) : t < 12 ? 1 + 0.2 * Math.sin((Math.PI * t) / 12) : Math.max(0, 1 - (t - 12) / 14); };

export type CrowdOpt = { s?: number; c?: number; metres?: number; light?: number; seed?: number; stand?: boolean; f0?: number };
/** a READY POSE for extra `id` at frame f: the gait from the metres walked (or in place), blinks, darts, the open-eyed
 *  friendly face, the tic (chatting hands, nods and laughs, the dog's lead hand, the frisbee arm, books hugged).
 *  stand = an idle hold instead of walking (chatting groups) */
export const crowdPose = (id: CrowdId, f: number, o: CrowdOpt = {}): CrowdPose => {
  const D = CROWD[id], seed = o.seed ?? 100 + CROWD_IDS.indexOf(id) * 7, stand = !!o.stand || D.tic === "ride";
  const walk = o.metres !== undefined ? PPL.walkPhase(o.metres, D.gait) : PPL.walkInPlace(f + seed * 3, D.gait);
  const life = PPL.holdLife(f, seed, stand ? 1 : 0.4);
  const P: CrowdPose = { s: o.s ?? 0, c: o.c ?? 1, walk, go: stand ? 0 : 1, gait: D.gait, light: o.light, seed: (seed % 9) + 1, blink: life.blink, look: life.look + 0.4 * (o.s ?? 0),
    lookY: life.lookY, breath: life.breath, expr: "bright" };
  if (stand) { P.shift = life.shift; P.tilt = life.tilt; P.headTilt = life.headTilt; }
  const side = (o.s ?? 0) >= 0 ? 1 : -1;
  switch (D.tic) {
    case "chat": { const m = PPL.talkAt(((f % 140) + 140) % 140, 0, 92, seed); P.mouth = m; P.expr = m ? "bright" : "listenB"; P.armR = PPL.talkHand(f, seed, !!m); P.armL = PPL.talkHand(f + 13, seed + 1, !!m); break; }
    case "listen": { const c = PPL.phoneChat(f, seed); P.expr = c.laughing ? "laughBig" : "listenB"; P.nod = c.nod; P.mouth = c.laughing ? "laugh" : undefined; break; }
    case "dog": P.armR = { to: "low", dx: 10 * side, dy: -4, hand: "grip", front: true }; break;
    case "books": P.armL = { to: "hug", prop: { k: "book", col: "#4a7fc4" }, hand: "grip" }; P.armR = { to: "hug", dy: 10, hand: "grip" }; break;
    case "throw": { const k = frisbeeAt(f, o.f0 ?? 1e9); P.throwK = k; if (k !== 0) { P.armR = { to: "chest", to2: "point", k: clamp(k, -0.6, 1.2), dx: -12 * Math.min(0, k), hand: k < 0.6 ? "grip" : "open", front: true }; P.go = 0; P.expr = "brightGrin"; } break; }
    case "skate": { const t = ((f + seed * 5) % 70 + 70) % 70; P.push = t < 26 ? Math.sin((Math.PI * t) / 26) : 0; P.go = 0; P.walk = 0; P.duck = 0.18; P.armL = { fk: [62, 80], hand: "open" }; P.armR = { fk: [48, 30], hand: "open" }; P.expr = "brightGrin"; break; }
    case "ride": { P.spin = (o.metres ?? f * 0.1) / 0.34; P.expr = "brightGrin"; break; }
    default: break;
  }
  return P;
};

/** the dog's lead: the walker's hand (card units) to the dog's collar */
const lead = (p: Pen, a: P2, b: P2, u: number) => { const m: P2 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 18 * u]; const pts: P2[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12, w = 1 - t; pts.push([w * w * a[0] + 2 * w * t * m[0] + t * t * b[0], w * w * a[1] + 2 * w * t * m[1] + t * t * b[1]]); } p.stroke(pts, 1.6 * u, "#c8332e"); };

/** DRAW extra `id` with its pose (crowdPose gives one). The cyclist rides a bike (P.spin), the skater stands on a board
 *  (P.push), the dog walker's dog trots ahead (P.dogPh, default from the walk) */
export const drawCrowd = (p: Pen, id: CrowdId, P: CrowdPose) => {
  const D = CROWD[id], X: Extras = D.layer ? { post: D.layer } : {};
  const u = rig(D.o, { mode: "stand" }).u, s = P.s ?? 0, dirS: 1 | -1 = s >= 0 ? 1 : -1;
  if (D.tic === "ride") { // the BIKE first, then the rider seated on its saddle, hands on the bars, legs on the pedals
    const sp = P.spin ?? 0, bike = FX.drawBike(p, Math.abs(s) < 0.15 ? 0.15 * dirS : s, sp, u);
    const R0 = rig(D.o, { mode: "stand" }), lift = (975 - bike.saddle[1] - (975 - R0.hipY) * 0.98) / UM;
    // legs: hip at the saddle, feet on the pedals (crank 0.17 m, half a turn apart), 2-bone IK
    const hip: P2 = [bike.saddle[0], bike.saddle[1] - 4 * u], th = (975 - R0.hipY) * 0.52;
    for (const k of [0, Math.PI]) {
      const a = -sp + k, ped: P2 = [bike.crank[0] + Math.cos(a) * 0.17 * UM * Math.max(0.2, Math.abs(s)), bike.crank[1] + Math.sin(a) * 0.17 * UM];
      const dx = ped[0] - hip[0], dy = ped[1] - hip[1], d = Math.min(Math.hypot(dx, dy), 1.98 * th), kk = d / 2, h = Math.sqrt(Math.max(0, th * th - kk * kk)), ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
      const knee: P2 = [hip[0] + ux * kk + dirS * uy * -h, hip[1] + uy * kk + dirS * ux * h];
      p.stroke([hip, knee, [hip[0] + ux * d, hip[1] + uy * d]], 5.6 * u, k ? shade(mix(D.o.pants, INK, 0.62), 0.85) : mix(D.o.pants, INK, 0.62));
      p.stroke([[hip[0] + ux * d - 4 * u, hip[1] + uy * d], [hip[0] + ux * d + 8 * u * dirS, hip[1] + uy * d]], 7 * u, D.o.shoes);
    }
    const bars: P2 = [bike.bars[0], bike.bars[1] + lift * UM];
    PPL.drawFig(p, D.o, { ...P, go: 0, lean: 14, armL: { to: bars, hand: "grip", front: true }, armR: { to: bars, dx: 4, hand: "grip", front: true } }, { ...X, noLegs: true, lift });
    return;
  }
  if (D.tic === "skate") { // the BOARD under the feet; a push = the back foot sweeps down and back
    const push = P.push ?? 0;
    FX.drawSkateboard(p, [300, 975], u, Math.abs(s) < 0.3 ? 0.3 * dirS : s, 0);
    PPL.drawFig(p, D.o, { ...P, go: push > 0 ? 0.8 : 0, walk: push > 0 ? 0.25 + 0.5 * push : 0 }, { ...X, lift: 0.07 });
    return;
  }
  if (D.tic === "dog") { // the DOG trots ahead on the lead
    const ph = P.dogPh ?? (P.walk ?? 0) * 2.2, dx = Math.abs(s) > 0.35 ? dirS * 0.62 * UM : 0.5 * UM;
    PPL.drawFig(p, D.o, P, X);
    const collar = FX.drawDog(p, 300 + dx, Math.abs(s) > 0.35 ? dirS : 1, ph, u * 1.6, "#e8b26a", (P.walk ?? 0) * 3);
    const R0 = rig(D.o, { mode: "stand" }); lead(p, [300 + 1.2 * R0.T.a * dirS + 10 * u * dirS, R0.chin + 0.86 * R0.HH], collar, u);
    return;
  }
  PPL.drawFig(p, D.o, P, X);
};
void (null as unknown as Arm);

// ================================================================== p3: CROWD BEHAVIOURS (no extra is a plain walker)
// Ten small bits, each ONE card:   const b = CROWD.crowdBit("highFive", f, { f0, s, c, metres, light });
//   E.putFig(out, cam, `crowd|highFive|${f}`, pos, b.draw);          (two-person bits: pos = the point between them)
// b.quiz says whether the bit may play during the quiz (Q1-Q3). The RULE: in Q1-Q3 nobody but the five phone people has a
// hand or an object near an ear, and nobody holds a camera: "filmer" and "sharedCans" are STORY shots only.
export type CrowdBitName = "filmer" | "paperChase" | "sharedCans" | "watchJog" | "dogPull" | "skateTrick" | "sandwich" | "highFive" | "pointLaugh" | "bookWalk";
/** f0 = the frame the event happens (the drop, the slap, the look up...; default 20), look = where the clown is (-1.3..1.3
 *  screen side), aim = a card point to point at, id / id2 = which extras play it */
export type CrowdBitOpt = CrowdOpt & { look?: number; aim?: P2; id?: CrowdId; id2?: CrowdId };
export const CROWD_BIT_QUIZ: Record<CrowdBitName, boolean> = { filmer: false, paperChase: true, sharedCans: false, watchJog: true, dogPull: true, skateTrick: true, sandwich: true, highFive: true, pointLaugh: true, bookWalk: true };
const eoC = (x: number) => 1 - (1 - clamp(x, 0, 1)) ** 3;
const smC = (x: number) => { const k = clamp(x, 0, 1); return k * k * (3 - 2 * k); };
const lay = (D: Def): Extras => (D.layer ? { post: D.layer } : {});
/** a pose without its arms (so a bit can give its own) */
const bare = (P: CrowdPose): CrowdPose => { const Q = { ...P }; delete Q.armL; delete Q.armR; return Q; };
export const crowdBit = (name: CrowdBitName, f: number, o: CrowdBitOpt = {}): { draw: (p: Pen) => void; quiz: boolean } => {
  const f0 = o.f0 ?? 20, t = f - f0, s = o.s ?? 0, dirS: 1 | -1 = s >= 0 ? 1 : -1, look = o.look ?? 0.9 * dirS, quiz = CROWD_BIT_QUIZ[name];
  const one = (id: CrowdId, mod: (P: CrowdPose) => CrowdPose, after?: (p: Pen, A: PPL.Anchors, P: CrowdPose) => void, X: Extras = {}, before?: (p: Pen, P: CrowdPose) => void) => ({ quiz, draw: (p: Pen) => {
    const D = CROWD[id], P = mod(crowdPose(id, f, o)), XX = { ...lay(D), ...X }; if (before) before(p, P); PPL.drawFig(p, D.o, P, XX); if (after) after(p, PPL.figAnchors(D.o, P, XX), P); } });
  switch (name) {
    case "filmer": // stops and films the clown with a little camera held at CHEST height in both hands (never at the face)
      return one(o.id ?? "beret", (P) => ({ ...P, go: 0, ...PPL.holdLife(f, 31, 0.8), look, expr: "brightGrin", armL: { to: "chest", dx: -10, dy: -3, hand: "grip" }, armR: { to: "chest", dx: 10, dy: -3, hand: "grip" } }),
        (p, A) => { const c: P2 = [(A.hands[0][0] + A.hands[1][0]) / 2 + look * 3 * A.u, (A.hands[0][1] + A.hands[1][1]) / 2 - 7 * A.u], u = A.u;
          p.poly(rrect(c[0] - 14 * u, c[1] - 9 * u, c[0] + 14 * u, c[1] + 9 * u, 3 * u), "#2a2633", 1.6 * u); p.poly(rrect(c[0] - 9 * u, c[1] - 12 * u, c[0] - 2 * u, c[1] - 8 * u, 1 * u), "#4a4658", 1 * u);
          p.dot(c[0] + 2 * u, c[1], 6.6 * u, "#8a8fa0"); p.dot(c[0] + 2 * u, c[1], 4.6 * u, "#2f6ae0"); p.dot(c[0] + 0.6 * u, c[1] - 1.4 * u, 1.4 * u, "#ffffff"); if (f % 30 < 16) p.dot(c[0] - 10 * u, c[1] - 5 * u, 1.6 * u, "#e9342c"); });
    case "paperChase": // the papers burst out of his arms; he gapes, then stoops and scurries after them
      return one(o.id ?? "books", (P) => (t < 0 ? P : t < 12 ? { ...P, go: 0, expr: "jawDrop", ...PPL.takeAt(f, f0), armL: { fk: [140, 172], hand: "open" }, armR: { fk: [132, 165], hand: "open" } }
        : { ...P, gait: "jog", go: 1, walk: PPL.walkInPlace(f, "jog"), duck: 0.72, expr: "worriedB", look: dirS, lookY: 0.9, armL: { to: "low", dx: 10 * Math.sin(f / 2.2), dy: 6, hand: "open" }, armR: { to: "low", dx: -10 * Math.sin(f / 2.2), dy: 12, hand: "open" } }),
        (p, A) => { if (t >= 0) { VFX.paperFlutter(p, f, f0, [A.chest[0], A.chest[1] - 10 * A.u], { u: A.u, n: 6, w: 240, ground: 972 }); if (t >= 12) VFX.sweat(p, f, f0 + 12, [A.head[0] + 0.8 * A.r, A.head[1] - 0.4 * A.r], { u: A.u, f1: f0 + 60 }); } });
    case "sharedCans": { // a couple shares one pair of earbuds: a cable between their heads, they bop in step (STORY only)
      const ids: [CrowdId, CrowdId] = [o.id ?? "chatB", o.id2 ?? "backpack"], gap = 0.29 * UM, bop = PPL.bopAt(f, 104, 0.8);
      return { quiz, draw: (p: Pen) => { const As: PPL.Anchors[] = [];
        ids.forEach((id, i) => { const D = CROWD[id], sd = i ? 1 : -1, P: CrowdPose = { ...crowdPose(id, f, { ...o, seed: 55 }), ...bop, expr: i ? "brightGrin" : "bright", look: -sd * 0.7, headTilt: (bop.headTilt ?? 0) - sd * 3 };
          p.g.save(); p.g.translate(sd * gap, 0); PPL.drawFig(p, D.o, P, lay(D)); p.g.restore(); const A = PPL.figAnchors(D.o, P); As.push({ ...A, head: [A.head[0] + sd * gap, A.head[1]] }); });
        const u = As[0].u, a: P2 = [As[0].head[0] + As[0].r * 0.96, As[0].head[1] + 6 * u], b: P2 = [As[1].head[0] - As[1].r * 0.96, As[1].head[1] + 6 * u], m: P2 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 46 * u + 3 * u * Math.sin(f / 4)];
        for (const e of [a, b]) { const pts: P2[] = []; for (let i = 0; i <= 10; i++) { const q = i / 10, w = 1 - q; pts.push([w * w * e[0] + 2 * w * q * e[0] + q * q * m[0], w * w * e[1] + 2 * w * q * (m[1] + 4 * u) + q * q * m[1]]); } p.stroke(pts, 2.4 * u, INK); p.stroke(pts, 1.1 * u, "#ffffff"); p.dot(e[0], e[1], 3 * u, INK); p.dot(e[0], e[1], 2 * u, "#ffffff"); }
        VFX.notes(p, f, [m[0], As[0].head[1] - As[0].r], { u }); } };
    }
    case "watchJog": { // the jogger lifts a wrist and checks the watch without breaking stride
      const k = PPL.gestureBack(f, f0, f0 + 24, { move: 5 });
      return one(o.id ?? "runner", (P) => ({ ...P, ...(k > 0.05 ? { armR: { to: "hang", fk: [36, -118] as [number, number], fkK: k, hand: "fist" as const, front: true }, lookY: 1 * clamp(k, 0, 1), look: 0.4, expr: "focusB" as const } : {}) }),
        (p, A) => { const h = A.hands[1], u = A.u; p.band([[h[0] + 3 * u, h[1] - 6 * u], [h[0] + 9 * u, h[1] - 2 * u]], "#2a2633", 4.4 * u, 0.9 * u, "round"); if (k > 0.5) p.dot(h[0] + 6 * u, h[1] - 4.4 * u, 2.4 * u, "#bff0ff"); });
    }
    case "dogPull": { // the dog lunges at the pigeons: the lead snaps taut, the walker is dragged leaning back
      const D = CROWD[o.id ?? "dogwalker"], k = clamp(PPL.gestureBack(f, f0, f0 + 34, { move: 4, over: 0.2 }), 0, 1.2);
      return { quiz, draw: (p: Pen) => { const P: CrowdPose = { ...bare(crowdPose("dogwalker", f, o)), tilt: -dirS * 11 * k, expr: k > 0.4 ? "jawDrop" : "bright", look: dirS,
          ...(dirS > 0 ? { armR: { to: "low", to2: "point", k, hand: "grip", front: true } } : { armL: { to: "low", to2: "point", k, hand: "grip", front: true } }), go: 1, walk: PPL.walkInPlace(f * (1 + 0.6 * k), "walk") };
        PPL.drawFig(p, D.o, P, lay(D)); const A = PPL.figAnchors(D.o, P), u = A.u, h = A.hands[dirS > 0 ? 1 : 0];
        const col = FX.drawDog(p, 300 + dirS * (0.62 + 0.3 * k) * UM, dirS, f / (9 - 5 * k), u * 1.6, "#e8b26a", f / 5);
        const m: P2 = [(h[0] + col[0]) / 2, (h[1] + col[1]) / 2 + 14 * u * (1 - k)]; p.stroke([h, m, col], 1.7 * u, "#c8332e");
        if (k > 0.3) VFX.dust(p, f, f0 + 2, [300 - dirS * 6 * u, 975], { u, kind: "steps", dir: dirS, f1: f0 + 30 }); } };
    }
    case "skateTrick": { // a small ollie: crouch, pop, the board flips under him, land with a puff
      const D = CROWD[o.id ?? "skater"], hp = PPL.hopAt(f, f0, 0.3, 14), air = t >= 0 && t < 14;
      return { quiz, draw: (p: Pen) => { const u = rig(D.o, { mode: "stand" }).u, P: CrowdPose = { ...crowdPose("skater", f, o), duck: t >= -5 && t < 0 ? 0.5 * eoC((t + 5) / 4) : air ? 0.35 * Math.sin((Math.PI * t) / 14) : 0.18, stretch: hp.stretch, hop: hp.hop,
          armL: { fk: [air ? 128 : 62, air ? 160 : 80], hand: "open" }, armR: { fk: [air ? 120 : 48, air ? 150 : 30], hand: "open" }, expr: air ? "thrillB" : "brightGrin", go: 0, walk: 0 };
        FX.drawSkateboard(p, [300, 975 - hp.hop * 0.82 * UM], u, Math.abs(s) < 0.3 ? 0.3 * dirS : s, air ? 360 * smC(t / 13) : 0);
        PPL.drawFig(p, D.o, P, { ...lay(D), lift: 0.07 }); VFX.dust(p, f, f0 + 14, [300, 975], { u, kind: "land" }); if (air) VFX.speedLines(p, f, [300, 760], { u, dir: dirS, n: 4, h: 120, len: 40 }); } };
    }
    case "sandwich": { // eats a sandwich: a bite every 44 f, chewing in between; a pigeon at his feet eyes it and hops closer
      const ph = (((f - f0) % 44) + 44) % 44, bite = ph < 9 ? PPL.bump(ph, 0, 4, 5) : 0, chew = ph >= 9 && ph < 34;
      return one(o.id ?? "parka", (P) => ({ ...P, go: 0, ...PPL.holdLife(f, 44, 0.7), expr: "bright", lookY: 0.2, mouth: bite > 0.5 ? "vA" : chew ? (Math.floor(ph / 4) % 2 ? "vM" : "smallSmile") : undefined,
          armR: { to: "chest", to2: "chin", k: 0.25 + 0.75 * bite, dx: 8, hand: "grip", front: true }, armL: { to: "pocket" } }),
        (p, A) => { const h = A.hands[1], u = A.u, c: P2 = [h[0] - 2 * u, h[1] - 9 * u];
          p.poly([[c[0] - 11 * u, c[1] + 6 * u], [c[0] + 11 * u, c[1] + 6 * u], [c[0] + 2 * u, c[1] - 9 * u]], "#e8c48a", 1.5 * u); p.stroke([[c[0] - 8 * u, c[1] + 2.5 * u], [c[0] + 8 * u, c[1] + 2.5 * u]], 2 * u, "#57d23a"); p.stroke([[c[0] - 6 * u, c[1] - 0.5 * u], [c[0] + 6 * u, c[1] - 0.5 * u]], 1.6 * u, "#e9342c");
          const g = p.g, k = 0.17 * u, px = 300 - 78 * u + 10 * u * smC((f - f0) / 60) + 3 * u * PPL.bump(ph, 20, 3, 3); g.save(); g.translate(px, 975 - 6 * u * PPL.bump(ph, 20, 3, 3)); g.scale(-k, k); g.translate(-300, -965);
          FX.drawPigeon(p, { run: 0, flap: 0, wing: 0, peck: 0, lift: 0.5 }); g.restore(); });
    }
    case "highFive": { // two students meet, wind up and SLAP a high five (stars), laugh and hop
      const ids: [CrowdId, CrowdId] = [o.id ?? "chatA", o.id2 ?? "parka"], gap = 0.34 * UM, up = PPL.gestureBack(f, f0 - 6, f0 + 12, { ant: 4, move: 5, over: 0.12 }), hp = PPL.hopAt(f, f0 + 2, 0.07, 8);
      return { quiz, draw: (p: Pen) => { let top = 600, u = 2.4;
        ids.forEach((id, i) => { const D = CROWD[id], sd = i ? -1 : 1, arm: PPL.Arm = { to: "hang", fk: [128, 168], fkK: up, hand: "open", hs: 1.15, front: true };
          const P: CrowdPose = { ...bare(crowdPose(id, f, { ...o, s: sd * 0.95, c: 0.3, stand: true })), ...PPL.holdLife(f, 60 + i, 0.5), s: sd * 0.95, c: 0.3, expr: t >= 0 ? "laughBig" : "brightGrin", look: sd, hop: hp.hop, stretch: hp.stretch,
            tilt: sd * 5 * clamp(up, 0, 1), ...(sd > 0 ? { armR: arm } : { armL: arm }) };
          p.g.save(); p.g.translate(-sd * gap, 0); PPL.drawFig(p, D.o, P, lay(D)); p.g.restore(); const A = PPL.figAnchors(D.o, P); top = Math.min(top, A.hands[sd > 0 ? 1 : 0][1]); u = A.u; });
        VFX.popBurst(p, f, f0, [300, top - 6 * u], { u, r: 22 }); VFX.impactStars(p, f, f0, [300, top - 6 * u], { u, n: 5 }); } };
    }
    case "pointLaugh": { // points at the clown and laughs till the tears fly
      const sh = PPL.laughShake(f, f0 + 6, f0 + 46);
      return one(o.id ?? "tote", (P) => ({ ...P, go: 0, ...PPL.holdLife(f, 71, 0.5), look, expr: t >= 4 ? "laughBig" : "brightGrin", stretch: sh.stretch, nod: sh.nod, headTilt: sh.headTilt * dirS,
          ...(look >= 0 ? { armR: PPL.pointArm(f, f0, o.aim ?? [760, 470], f0 + 50), armL: { to: "belly" as const, hand: "open" as const } } : { armL: PPL.pointArm(f, f0, o.aim ?? [-160, 470], f0 + 50), armR: { to: "belly" as const, hand: "open" as const } }) }),
        (p, A) => VFX.laughTears(p, f, f0 + 10, A.head, { u: A.u, f1: f0 + 44 }));
    }
    default: { // "bookWalk": reads a book while walking, looks up at the clown (brows up), goes back to the page
      const k = clamp(PPL.gestureBack(f, f0, f0 + 28, { move: 5 }), 0, 1.1);
      return one(o.id ?? "beret", (P) => ({ ...P, gait: "stroll", expr: k > 0.4 ? "brightO" : "focusB", lookY: 1 - 1.4 * k, look: look * k, face: { browUp: [6 * k, 6 * k] }, headTilt: 3 * k,
          armL: { to: "chest", dx: -4, dy: -6 + 10 * k, hand: "grip", prop: { k: "book", col: "#c95f8f" }, front: true }, armR: { to: "chest", dx: 10, dy: -4 + 10 * k, hand: "grip", front: true } }),
        (p, A) => { if (t >= 2 && t < 20) VFX.surpriseLines(p, f, f0 + 2, A.head, { u: A.u, n: 5, r: 58, life: 14 }); });
    }
  }
};

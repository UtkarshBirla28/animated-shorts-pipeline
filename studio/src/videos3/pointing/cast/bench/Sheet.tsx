// CAST SHEET for the owner (not part of the film): every character of "pointing" drawn with the real cast code on a 2D
// canvas: turnarounds (front / 3-4 / TRUE profile / back), key expressions, the call-out strip, the crowd, the hands.
// Pages (inputProps.page): main, others, faces, acting, crowd. COMP=PointingCastSheet ENTRY=src/videos3/pointing/cast/bench/index.ts
import React, { useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";
import { Pen, rrect, type P2, type MouthK } from "../../../../videos/clown/toon";
import * as PPL from "../../../../videos/clown/cast_people";
import { drawWho, anchorsOf, nativeCrown, SPECS, SU, type CPose, type Who } from "../people";
import { heldPose, holdingPose, LIFT } from "../lift";
import { callOut, callArm, filmTarget, type ActEnv } from "../gesture";
import { actBeats, timeBeats, hookK, type Beat, type Resolver } from "../moves";
import { drawBigHand, drawKeys, drawCallBubble, drawTick, drawChip } from "../draw_hands";

export const SW = 2400, SH = 1600;
const LIGHT = (-120 * Math.PI) / 180;
export type Cell = { label: string; who: Who; P: CPose; head?: boolean; k?: number; extra?: (p: Pen) => void; /** drawn BEFORE the figure (someone standing behind / beside) */ pre?: (p: Pen) => void };

export const backdrop = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  const hy = y + h * 0.62, sky = g.createLinearGradient(0, y, 0, hy);
  sky.addColorStop(0, "#9cc9ee"); sky.addColorStop(1, "#e4f0f6"); g.fillStyle = sky; g.fillRect(x, y, w, hy - y);
  const fl = g.createLinearGradient(0, hy, 0, y + h); fl.addColorStop(0, "#d8cdb8"); fl.addColorStop(1, "#bfb29a"); g.fillStyle = fl; g.fillRect(x, hy, w, y + h - hy);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
};
export const label = (g: CanvasRenderingContext2D, s: string, x: number, y: number, size = 22) => {
  g.font = `bold ${size}px Arial`; g.lineWidth = 4; g.strokeStyle = "#1a1420"; g.fillStyle = "#fff5c8"; g.strokeText(s, x, y); g.fillText(s, x, y);
};
export const drawCell = (g: CanvasRenderingContext2D, c: Cell, x: number, y: number, w: number, h: number) => {
  backdrop(g, x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const P: CPose = { light: LIGHT, ...c.P };
  let k: number, ox: number, oy: number;
  if (c.head) { const A = anchorsOf(c.who, P), pr = Math.abs(P.s ?? 0) > 0.8 ? Math.sign(P.s ?? 0) : 0; k = (h * (pr ? 0.33 : 0.4)) / A.r; ox = x + w / 2 - (A.head[0] + pr * 0.14 * A.r) * k; oy = y + h * 0.58 - A.head[1] * k; }
  else { k = c.k ?? (h * 0.92) / 1000; ox = x + w / 2 - 300 * k; oy = y + h - 18 - 975 * k; }
  g.setTransform(k, 0, 0, k, ox, oy);
  if (!c.head) { g.save(); g.globalAlpha = 0.25; g.fillStyle = "#3a1a40"; g.beginPath(); g.ellipse(300, 975, 110, 20, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  let err = ""; try { const p = new Pen(g); c.pre?.(p); drawWho(p, c.who, P); c.extra?.(p); } catch (e) { err = String((e as Error).stack ?? e).slice(0, 400); }
  g.setTransform(1, 0, 0, 1, 0, 0); g.restore();
  label(g, c.label, x + 10, y + 28, 20);
  if (err) { g.fillStyle = "#ff3030"; g.font = "13px Consolas"; err.match(/.{1,60}/g)!.forEach((ln, i) => g.fillText(ln, x + 6, y + 60 + 15 * i)); }
};
export const grid = (g: CanvasRenderingContext2D, cells: Cell[], cols: number, rows: number, x0 = 0, y0 = 60, w0 = SW, h0 = SH - 60) => {
  const cw = w0 / cols, ch = h0 / rows;
  cells.forEach((c, i) => drawCell(g, c, x0 + (i % cols) * cw + 3, y0 + Math.floor(i / cols) * ch + 3, cw - 6, ch - 6));
};
export const title = (g: CanvasRenderingContext2D, s: string) => { g.fillStyle = "#1c1820"; g.fillRect(0, 0, SW, 60); label(g, s, 16, 42, 30); };

// ---------------- views + poses
const V = { front: { s: 0, c: 1 }, q3: { s: 0.55, c: 0.83 }, prof: { s: 1, c: 0 }, profL: { s: -1, c: 0 }, back: { s: 0, c: -1 }, q3back: { s: 0.6, c: -0.8 } };
const life = (f: number, seed: number): Partial<CPose> => ({ ...PPL.holdLife(f, seed, 0.6), blink: 0 });
const ptAim: P2 = [620, 360];
const drvPoint = (f: number, view: { s: number; c: number }): CPose => {
  const back = view.c < -0.35;
  return { ...view, ...life(f, 4), expr: "bright", face: { browUp: [-3, -3] }, mouth: "laugh", ...PPL.bodyArms(back, { to: "hang", aim: view.s < 0 ? [-20, 360] : ptAim, k: 1, hand: "point", hs: 1.2, front: true }, { to: "hip", hand: "ball", hs: 1.1 }) };
};
const tourFilm = (view: { s: number; c: number }, expr: CPose["expr"] = "brightGrin"): CPose => {
  const back = view.c < -0.35, side: -1 | 1 = back ? -1 : 1;
  const A = anchorsOf("tourist", view);
  return { ...view, expr, film: { k: 1, side, tilt: 4 }, ...PPL.bodyArms(back, { to: "hang", hand: "ball", hs: 1.2 }, { to: filmTarget({ ...view, head: A.head, r: A.r }, side), hand: "grip", hs: 1.2, front: true }) };
};
const kidPoint = (view: { s: number; c: number }): CPose => {
  const back = view.c < -0.35;
  return { ...view, expr: "bright", face: { browUp: [-4, -4] }, tongue: 1, blush: 0.35, ...PPL.bodyArms(back, { to: "hang", aim: ptAim, k: 1, hand: "point", hs: 1.3, front: true }, { to: "hang", hand: "ball", hs: 1.2 }) };
};

/** the head anchors of a view (what the card hands the actor) */
const envOf = (who: Who, v: { s: number; c: number }, seat?: number) => { const A = anchorsOf(who, { ...v, seat }); return { s: v.s, c: v.c, head: A.head, r: A.r }; };
// ---------------- the MOVES pages: the real beat runner (moves.ts) on demo beats with plain frame numbers as cues
const NUM: Resolver = { word: () => NaN, wordEnd: () => NaN, shot: () => null, shotEnd: () => 1e9 };
export type EnvO = { aim?: P2; look?: P2; seat?: number; restL?: P2; restR?: P2; mouth?: MouthK; aimLens?: number };
export const envAt = (who: Who, v: { s: number; c: number }, f: number, o: EnvO = {}): ActEnv => {
  const A = anchorsOf(who, { ...v, seat: o.seat });
  return { t: f / 30, f, s: v.s, c: v.c, light: LIGHT, back: v.c < -0.35, aim: o.aim ?? null, look: o.look ?? null, head: A.head, r: A.r, u: A.u, chest: A.chest, restL: o.restL ?? null, restR: o.restR ?? null, seat: o.seat, aimLens: o.aimLens };
};
export const KIDK = 0.92 * 485 / 1000;
/** one cell = a character at frame f of some beats */
const beat = (label: string, who: Who, v: { s: number; c: number }, f: number, beats: Beat[], o: EnvO = {}, extra?: (p: Pen) => void): Cell =>
  ({ label, who, P: { ...v, ...actBeats(who, timeBeats(beats, NUM), envAt(who, v, f, o), o.mouth ? { mouth: o.mouth } : undefined) }, k: who === "kid" ? KIDK : undefined, extra });
/** a sketch of the yellow suitcase (the real one is TRAIN's 3D prop), wheels on the ground at card x */
const bag = (x: number, y = 975) => (p: Pen) => {
  p.stroke([[x - 20, y - 150], [x - 20, y - 196], [x + 20, y - 196], [x + 20, y - 150]], 7, "#3a3f4c");
  p.poly(rrect(x - 44, y - 152, x + 44, y - 16, 13), "#ffc21a", 5);
  for (const k of [-0.5, 0.5]) p.stroke([[x + k * 44, y - 136], [x + k * 44, y - 32]], 4, "#e0a200");
  for (const k of [-1, 1]) p.ell(x + k * 30, y - 9, 9, 9, "#2a2d36", 3);
};
const T = "tourist" as const, K = "kid" as const, D = "driver" as const, VOL = "volunteer" as const;
const Vq = { s: 0.55, c: 0.83 }, VqL = { s: -0.55, c: 0.83 }, Vf = { s: 0, c: 1 }, Vp = { s: 1, c: 0 }, Vb = { s: 0, c: -1 }, VqB = { s: 0.6, c: -0.8 };
const CALLB = (who: Who, style: "driver" | "kid" | "mock" | "plain", late?: number): Beat[] => [{ who, m: "call", name: 20, status: 52, style, late }];

const M = "kid_mum" as const;
/** the boy drawn at his own size inside another figure's cell (dx = design units to her screen side) */
const boyBeside = (dx: number, view: { s: number; c: number }, f: number, beats: Beat[] = [], o: EnvO = {}) => (p: Pen) => {
  const g = p.g, sc = (SPECS.kid.crownM / nativeCrown(SPECS.kid.fit)) / (SPECS.kid_mum.crownM / nativeCrown(SPECS.kid_mum.fit));
  g.save(); g.translate(300 + dx, 975); g.scale(sc, sc); g.translate(-300, -975);
  drawWho(new Pen(g), "kid", { light: LIGHT, ...view, ...actBeats("kid", timeBeats(beats, NUM), envAt("kid", view, f, o)) });
  g.restore();
};
/** THE LIFT in one cell (mum's design space, orthographic): view v = the way the PAIR faces. The boy is placed where
 *  lift.ts puts him (LIFT.backM in front of her, LIFT.sideM to her side, LIFT.liftM up) and drawn in front of / behind
 *  her by depth; both poses come from the film's own pose edits (heldPose / holdingPose) */
const liftCell = (label: string, v: { s: number; c: number }, f: number, kidBeats: Beat[] = [], mumBeats: Beat[] = [], o: { side?: 1 | -1; aim?: P2; k?: number } = {}): Cell => {
  const sd = o.side ?? 1, kk = o.k ?? 1, th = Math.atan2(v.s, v.c), thM = th + sd * LIFT.turn * kk, vm = { s: Math.sin(thM), c: Math.cos(thM) };
  const kM = SPECS.kid_mum.crownM / nativeCrown(SPECS.kid_mum.fit), kK = SPECS.kid.crownM / nativeCrown(SPECS.kid.fit), mU = SU * kM, sc = kK / kM;
  const dx = (LIFT.backM * v.s + sd * LIFT.sideM * v.c) / mU, dy = -(LIFT.liftM * kk) / mU, kidFront = LIFT.backM * v.c - sd * LIFT.sideM * v.s > 0;
  const wy = 975 + dy - LIFT.waistM / mU, hy = 975 + dy - 0.86 / mU, fl = (0.1 * v.c) / mU;
  const P0 = actBeats(M, timeBeats(mumBeats, NUM), envAt(M, vm, f, { look: [300 + dx, hy], aim: [300 + dx, hy], restR: [300 + dx - fl, wy], restL: [300 + dx + fl, wy] }));
  const P = holdingPose({ ...vm, ...P0 }, f / 30, kk, (vm.c >= 0 ? sd : -sd) as 1 | -1);
  const boy = (pn: Pen) => { const g = pn.g; g.save(); g.translate(300 + dx, 975 + dy); g.scale(sc, sc); g.translate(-300, -975);
    drawWho(new Pen(g), "kid", heldPose({ light: LIGHT, ...v, ...actBeats("kid", timeBeats(kidBeats, NUM), envAt("kid", v, f, { aim: o.aim })) }, f / 30, kk)); g.restore(); };
  return { label, who: M, P, pre: kidFront ? undefined : boy, extra: kidFront ? boy : undefined };
};
const PAGES: Record<string, (g: CanvasRenderingContext2D, f: number) => void> = {
  lift: (g) => {
    title(g, "POINTING · THE LIFT (s06): mum holds the boy up at the cab window: her arms round his waist, her face behind his shoulder, he is free to copy the driver");
    const call = CALLB(K, "kid"), capD: Beat[] = [{ who: K, m: "capDrop", at: 10, hold: 16 }], capP: Beat[] = [{ who: K, m: "capPush", at: 10 }];
    const cont: Beat[] = [{ who: M, m: "face", at: 0, until: 300, expr: "content" }];
    grid(g, [
      liftCell("from the cab (front)", Vf, 30), liftCell("3/4", Vq, 30), liftCell("side-on (along the glass)", Vp, 30), liftCell("3/4 from behind", VqB, 30), liftCell("from behind (lens in the car)", Vb, 30),
      liftCell("he copies: hand by his ear", Vf, 40, call, [], { aim: [300, 120] }), liftCell("the snap (6 f after the driver)", VqL, 60, call, cont, { aim: [40, 330] }),
      liftCell("the cap drops over his eyes", Vf, 22, capD), liftCell("he shoves it back up", Vq, 20, capP, cont), liftCell("from behind: he points", Vb, 60, call, [], { aim: [300, 200] }),
    ], 5, 2);
  },
  mum: (g) => {
    title(g, "POINTING · THE BOY'S MUM (beige trench, canvas tote, dark bob): all views, her living hold with her eyes on her boy, a hand on him, her faces");
    const boyL: P2 = [165, 520], boyR: P2 = [435, 520], shL: P2 = [196, 612], shR: P2 = [404, 612], bagAt: P2 = [560, 860];
    const worry: Beat[] = [{ who: M, m: "look", at: 0, until: 300, to: "aim", head: 6 }, { who: M, m: "face", at: 0, until: 300, expr: "worriedB" }];
    const H = (label: string, v: { s: number; c: number }, f: number, beats: Beat[], o: EnvO = {}): Cell => ({ ...beat(label, M, v, f, beats, o), head: true });
    grid(g, [
      beat("MUM front (eyes on her boy)", M, Vf, 30, [], { look: boyL }), beat("3/4", M, Vq, 30, [], { look: boyR }), beat("right profile", M, Vp, 30, [], { look: [560, 540] }),
      beat("left profile", M, { s: -1, c: 0 }, 30, [], { look: [40, 540] }), beat("3/4 back", M, VqB, 30, []), beat("back", M, Vb, 30, []),
      { ...beat("beside her boy, a hand on him", M, Vf, 40, [], { look: boyL, restR: shL }), pre: boyBeside(-128, Vf, 40) },
      { ...beat("3/4, he copies the driver", M, VqL, 55, [{ who: M, m: "face", at: 0, until: 300, expr: "content" }], { look: boyL, restR: shL }), pre: boyBeside(-128, VqL, 55, CALLB(K, "kid"), { aim: [40, 330] }) },
      H("eyes on him (polite)", Vf, 30, [], { look: boyL }), H("content (he copies the driver)", Vf, 30, [{ who: M, m: "face", at: 0, until: 300, expr: "content" }], { look: boyL }),
      H("the bag at the gap (worried)", Vq, 30, worry, { aim: bagAt, look: boyR }), H("proud (Bag... check!)", Vf, 30, [{ who: M, m: "face", at: 0, until: 300, expr: "brightGrin" }], { look: boyL }),
      H("profile, looking down at him", Vp, 30, [], { look: [520, 620] }), H("a blink", Vq, 4, [{ who: M, m: "take", at: 0 }], { look: boyR }),
      { ...beat("s12: looks at the bag", M, Vq, 30, [{ who: M, m: "look", at: 0, until: 300, to: "aim", head: 6 }], { aim: bagAt, look: boyR, restR: shR }), pre: boyBeside(128, Vq, 30) },
      { ...beat("s23: proud of him", M, VqL, 62, [{ who: M, m: "face", at: 0, until: 300, expr: "brightGrin" }], { look: boyL, restR: shL }), pre: boyBeside(-128, VqL, 62, [...CALLB(K, "kid", 0), { who: K, m: "proud", at: 64, until: 300, hips: false }], { aim: [40, 700] }) },
    ], 8, 2);
  },
  tourist: (g) => {
    title(g, "POINTING · THE TOURIST's moves (the beat runner): stunned · the railway point · the big laugh · the hook · lunge + grab · the wag · finger guns · walks away · 'Bag... gone.'");
    const film: Beat[] = [{ who: T, m: "film", at: -100, until: 12 }], filmOn: Beat[] = [{ who: T, m: "film", at: -100, until: 900 }, { who: T, m: "look", at: -100, until: 900, to: "phone" }];
    const stun: Beat[] = [...film, { who: T, m: "stun", at: 10, until: 300 }];
    const hook: Beat[] = [...filmOn, { who: T, m: "hook", at: 10, leg: "R", reach: [-0.04, 0.36] }];
    const hx = (f: number) => { const h = hookK(f, 10); return 300 - (0.086 + 0.36 + 0.1) * 463 + 0.36 * 0.72 * 463 * h.drag; };
    const lunge: Beat[] = [{ who: T, m: "lunge", at: 14, until: 60 }], wag: Beat[] = [{ who: T, m: "wag", at: 10, until: 60 }], guns: Beat[] = [{ who: T, m: "guns", at: 10, until: 60 }];
    const dead: Beat[] = [{ who: T, m: "deadpan", at: 10, until: 300, point: true }];
    const f0b: Beat[] = [{ who: T, m: "face", at: -30, until: 60, expr: "stare", browUp: 3 }, { who: T, m: "look", at: -30, until: 58, to: "aim", head: 8 }, { who: T, m: "stun", at: 58, until: 300 }, { who: T, m: "point", at: 6, until: 300, move: 6, hs: 1.3, noGaze: true }];
    const gone: Beat[] = [{ who: T, m: "deadpan", at: 0, until: 300 }, { who: T, m: "call", name: 20, status: 52, style: "plain", limp: true, until: 300 }];
    const kidAt: P2 = [640, 600], handle: P2 = [585, 770], bagL: P2 = [70, 860];
    grid(g, [
      beat("stunned: the take (f+3)", T, Vf, 13, stun), beat("stunned: eyes to the lens", T, Vf, 34, stun), beat("stunned 3/4: slow blink", T, Vq, 36, stun),
      beat("railway point: NAME word", T, Vq, 26, CALLB(T, "plain"), { aim: [640, 330], mouth: "vA" }), beat("hand back by the ear", T, Vq, 46, CALLB(T, "plain"), { aim: [640, 330] }),
      beat("SNAP on the status word", T, Vq, 55, CALLB(T, "plain"), { aim: [640, 330], mouth: "laugh" }),
      beat("the big laugh (a)", T, Vq, 21, [{ who: T, m: "laugh", at: 10, until: 90 }]), beat("the big laugh (b)", T, Vf, 24, [...filmOn.slice(0, 1), { who: T, m: "laugh", at: 10, until: 90 }]),
      beat("hook: foot feels out", T, Vf, 15, hook, {}, bag(hx(15))), beat("hook: toe on the wheel", T, Vf, 22, hook, {}, bag(hx(22))),
      beat("hook: dragging it in", T, Vf, 29, hook, {}, bag(hx(29))), beat("hook: never looked", T, Vf, 44, hook, {}, bag(hx(44))),
      beat("lunge: the flinch (f-2)", T, Vp, 12, lunge, { aim: handle }, bag(600)), beat("lunge (f+4)", T, Vp, 18, lunge, { aim: handle }, bag(600)), beat("GRAB (f+12)", T, Vp, 26, lunge, { aim: handle }, bag(600)),
      beat("'Bad suitcase.' the wag", T, Vq, 22, wag, { aim: [560, 840] }, bag(600)), beat("the wag (b)", T, Vq, 27, wag, { aim: [560, 840] }, bag(600)),
      beat("finger guns: draw", T, Vq, 17, guns, { look: kidAt }), beat("guns: pew + wink", T, Vq, 22, guns, { look: kidAt }), beat("guns: 2nd pew", T, Vq, 34, guns, { look: kidAt }),
      beat("looks AT the bag, sees 0", T, VqL, 20, [{ who: T, m: "look", at: 10, until: 26, to: "aim", head: 8 }], { aim: bagL }, bag(60)),
      beat("walks away from the bag", T, Vb, 24, [{ who: T, m: "walk", at: 0, until: 300 }], {}, bag(520)), beat("walking away 3/4 back", T, { s: -0.5, c: -0.87 }, 33, [{ who: T, m: "walk", at: 0, until: 300 }]),
      beat("'Bag... gone.' flat, small", T, Vf, 56, dead, { aim: [110, 860], mouth: "vO" }),
      beat("FRAME 0: stunned, arm out", T, VqL, 16, f0b, { aim: [-60, 520] }), beat("frame 0: blank, to the lens", T, VqL, 78, f0b, { aim: [-60, 520] }),
      beat("'Stay.' pat, pat", T, Vq, 21, [{ who: T, m: "pat", at: 10, n: 2 }], { aim: [520, 700] }, bag(560)), beat("pat (down)", T, Vq, 25, [{ who: T, m: "pat", at: 10, n: 2 }], { aim: [520, 700] }, bag(560)),
      beat("'Bag...' the arm comes up", T, VqL, 28, gone, { aim: [-60, 560], mouth: "vA" }), beat("...by the ear", T, VqL, 46, gone, { aim: [-60, 560] }),
      beat("'gone.' a slow limp reach", T, VqL, 66, gone, { aim: [-60, 560], mouth: "vU" }), beat("pointing AT THE LENS", T, Vf, 40, [{ who: T, m: "point", at: 10, until: 300 }], { aim: [300, 420], aimLens: 1 }),
    ], 8, 4);
  },
  kiddriver: (g) => {
    title(g, "POINTING · THE KID (urgent point, cap drop, the copy 6 f late, 'Bag... check!'), THE DRIVER's call from behind / front 3/4, + the v3 small moves");
    const urg: Beat[] = [{ who: K, m: "urgent", at: 10, until: 70 }], cap: Beat[] = [{ who: K, m: "capDrop", at: 10, hold: 16 }];
    const own: Beat[] = [...CALLB(K, "kid", 0), { who: K, m: "proud", at: 64, until: 300 }];
    const bagL: P2 = [60, 880], grown: P2 = [600, 180], sig: P2 = [660, 330], sigB: P2 = [455, 360], seat = { seat: 0.47 };
    grid(g, [
      beat("URGENT point (f+3)", K, VqL, 13, urg, { aim: bagL, look: grown }, bag(40)), beat("urgent: the stab (f+8)", K, VqL, 18, urg, { aim: bagL, look: grown }, bag(40)),
      beat("urgent: eyes to the adult", K, VqL, 26, urg, { aim: bagL, look: grown }, bag(40)),
      beat("cap drop: sliding (f+3)", K, Vf, 13, cap), beat("cap drop: blind (f+10)", K, Vf, 20, cap), beat("the push (hold+1)", K, Vf, 27, cap), beat("too high (hold+5)", K, Vf, 31, cap), beat("settled (hold+16)", K, Vq, 42, cap),
      beat("the COPY, 6 f late: name", K, Vq, 32, CALLB(K, "kid"), { aim: sig }), beat("copy: by the ear", K, Vq, 52, CALLB(K, "kid"), { aim: sig }), beat("copy: the snap", K, Vq, 61, CALLB(K, "kid"), { aim: sig }),
      beat("HIS call 'Bag...'", K, VqL, 26, own, { aim: bagL, mouth: "vA" }, bag(40)), beat("...by the ear", K, VqL, 46, own, { aim: bagL }, bag(40)), beat("'...check!'", K, VqL, 55, own, { aim: bagL, mouth: "vE" }, bag(40)),
      beat("proud (chest out, chin up)", K, VqL, 84, own, { aim: bagL }), beat("arms crossed, a frown", K, Vf, 30, [{ who: K, m: "frown", at: 10, until: 300 }]),
      beat("DRIVER from behind: NAME", D, VqB, 26, CALLB(D, "driver"), { aim: sigB, ...seat }), beat("from behind: by the ear", D, VqB, 46, CALLB(D, "driver"), { aim: sigB, ...seat }),
      beat("from behind: the wind-up", D, VqB, 49.5, CALLB(D, "driver"), { aim: sigB, ...seat }), beat("from behind: SNAP + hold", D, VqB, 57, CALLB(D, "driver"), { aim: sigB, ...seat }),
      beat("DRIVER front 3/4: NAME", D, Vq, 26, CALLB(D, "driver"), { aim: sig, ...seat, mouth: "vI" }), beat("front 3/4: by the ear", D, Vq, 46, CALLB(D, "driver"), { aim: sig, ...seat }),
      beat("front 3/4: SNAP", D, Vq, 54, CALLB(D, "driver"), { aim: sig, ...seat, mouth: "laugh" }), beat("FRONT: the glove AT THE LENS", D, Vf, 57, CALLB(D, "driver"), { aim: [300, 430], aimLens: 1, ...seat, mouth: "laugh" }),
      // the small moves the final script v3 added
      beat("cap PUSH: hand to the brim", K, Vq, 15, [{ who: K, m: "capPush", at: 10 }]), beat("cap push: shoved up, chin up", K, Vq, 20, [{ who: K, m: "capPush", at: 10 }]),
      beat("urgent, mouth SHUT (s14)", K, VqL, 18, [{ who: K, m: "urgent", at: 10, until: 70, shut: true }], { aim: bagL, look: grown }, bag(40)),
      beat("VOLUNTEER: a run of presses", VOL, Vq, 12, [{ who: VOL, m: "press", at: 0, until: 200 }], { aim: [520, 560], seat: 0.62 }), beat("press (down)", VOL, Vq, 15, [{ who: VOL, m: "press", at: 0, until: 200 }], { aim: [520, 560], seat: 0.62 }),
      beat("volunteer: point + call, the snap", VOL, Vq, 56, [{ who: VOL, m: "call", name: 20, status: 52, style: "plain", rest: "belly" }, { who: VOL, m: "face", at: 14, until: 90, expr: "brightO", mouth: "vA" }], { aim: [640, 330], seat: 0.62 }),
      beat("TOURIST: double point, no kick", T, Vq, 24, [{ who: T, m: "guns", at: 10, until: 60, recoil: false }], { look: [640, 600] }),
      beat("'gone.': the lock-out (f+18)", T, VqL, 69, [{ who: T, m: "deadpan", at: 0, until: 300 }, { who: T, m: "call", name: 20, status: 52, style: "plain", limp: true, riseMove: 14, until: 300 }], { aim: [-60, 560], mouth: "vU" }),
    ], 8, 4);
  },
  main: (g, f) => {
    title(g, "POINTING · the three heroes: front / 3-4 / TRUE profile / back (+ the driver's call, the tourist filming, the kid's point)");
    const cells: Cell[] = [];
    for (const [nm, v] of [["front", V.front], ["3/4", V.q3], ["right profile", V.prof], ["left profile", V.profL], ["3/4 back", V.q3back], ["back", V.back]] as const)
      cells.push({ label: `DRIVER ${nm}`, who: "driver", P: drvPoint(f, v) });
    for (const [nm, v] of [["front", V.front], ["3/4", V.q3], ["right profile", V.prof], ["left profile", V.profL], ["3/4 back", V.q3back], ["back", V.back]] as const)
      cells.push({ label: `TOURIST ${nm}`, who: "tourist", P: tourFilm(v, nm === "front" ? "laughBig" : "brightGrin") });
    for (const [nm, v] of [["front", V.front], ["3/4", V.q3], ["right profile", V.prof], ["left profile", V.profL], ["3/4 back", V.q3back], ["back", V.back]] as const)
      cells.push({ label: `KID ${nm}`, who: "kid", P: kidPoint(v), k: 0.92 * 485 / 1000 });
    grid(g, cells, 6, 3);
  },
  others: (g, f) => {
    title(g, "POINTING · the rest of the cast (front / 3-4 / profile)");
    const cells: Cell[] = [];
    const add = (who: Who, nm: string, P: (v: { s: number; c: number }) => CPose) => { for (const [vn, v] of [["front", V.front], ["3/4", V.q3], ["profile", V.prof]] as const) cells.push({ label: `${nm} ${vn}`, who, P: P(v) }); };
    add("ny_conductor", "NY CONDUCTOR", (v) => ({ ...v, expr: "deadpan", ...PPL.bodyArms(false, { to: "hang", aim: [640, 300], k: 1, hand: "point", hs: 1.2, front: true }, { to: "hang", hand: "ball" }) }));
    add("ny_commuter", "NY COMMUTER", (v) => ({ ...v, expr: "blank", ...PPL.bodyArms(false, { to: "chest", hand: "grip", prop: { k: "phone", col: "#e9342c" } }, { to: "raise", hand: "grip" }) }));
    add("volunteer", "VOLUNTEER (seated)", (v) => ({ ...v, seat: 0.62, expr: "focusB", ...PPL.bodyArms(false, { to: "belly", to2: [560, 520], k: 0.8, hand: "point", hs: 1.2, front: true }, { to: "seat", hand: "ball" }) }));
    add("researcher", "RESEARCHER", (v) => ({ ...v, expr: "gazeFocus", lookY: 0.7, ...PPL.bodyArms(false, PPL.writeArm(f), PPL.clipboardArm(-8)) }));
    add("kid_mum", "KID'S MUM", (v) => ({ ...v, expr: "polite", ...PPL.bodyArms(false, { to: "hang", hand: "ball" }, { to: "strap", hand: "grip" }) }));
    cells.push({ label: "DRIVER seated, T-handle", who: "driver", P: { s: 1, c: 0, seat: 0.47, expr: "listenB", ...PPL.bodyArms(false, { to: "low", hand: "ball", hs: 1.1 }, { to: "low", hand: "grip", hs: 1.1 }) } });
    grid(g, cells, 4, 4);
  },
  faces: (g) => {
    title(g, "POINTING · key expressions (front + true profile) and the talk visemes");
    const cells: Cell[] = [];
    const E = (who: Who, nm: string, P: CPose) => cells.push({ label: nm, who, P, head: true });
    E("driver", "driver callOut", { expr: "bright", face: { browUp: [-3, -3] }, mouth: "laugh" }); E("driver", "callOut profile", { s: 1, c: 0, expr: "bright", face: { browUp: [-3, -3] }, mouth: "laugh" });
    E("driver", "driver focus", { expr: "bright", face: { browUp: [-2, -2] }, mouth: "dash", look: 0.8, lookY: -0.2 }); E("driver", "focus profile", { s: 1, c: 0, expr: "bright", face: { browUp: [-2, -2] }, mouth: "dash" });
    E("driver", "driver calm", { expr: "listenB" }); E("driver", "calm profile", { s: 1, c: 0, expr: "listenB" });
    E("tourist", "tourist laughBig", { expr: "laughBig" }); E("tourist", "laughBig profile", { s: 1, c: 0, expr: "laughBig" });
    E("tourist", "brightGrin (gap tooth)", { expr: "brightGrin" }); E("tourist", "brightGrin profile", { s: -1, c: 0, expr: "brightGrin" });
    E("tourist", "smugB", { expr: "smugB" }); E("tourist", "mockStiff", { expr: "stare", face: { browUp: [-3, -3] }, mouth: "vE" });
    E("tourist", "puzzled", { expr: "puzzled" }); E("tourist", "blankDrop", { expr: "blank" }); E("tourist", "blankDrop profile", { s: 1, c: 0, expr: "blank" });
    E("kid", "kid serious + tongue", { expr: "bright", face: { browUp: [-4, -4] }, tongue: 1, blush: 0.35 }); E("kid", "serious profile", { s: 1, c: 0, expr: "bright", face: { browUp: [-4, -4] }, tongue: 1, blush: 0.35 });
    E("kid", "kid proud", { expr: "proudB", blush: 0.35 }); E("kid", "kid frownB", { expr: "stern", blush: 0.35 }); E("kid", "kid worriedB", { expr: "worriedB", blush: 0.35 });
    E("kid", "kid delight", { expr: "delightB", blush: 0.35 });
    E("ny_conductor", "conductor squint", { expr: "squint" }); E("ny_conductor", "conductor profile", { s: 1, c: 0, expr: "deadpan" });
    E("ny_commuter", "commuter profile", { s: -1, c: 0, expr: "blank" });
    for (const m of ["vA", "vE", "vI", "vO", "vU", "vM"] as const) E("driver", `viseme ${m} (profile)`, { s: 1, c: 0, expr: "bright", mouth: m });
    E("researcher", "researcher pleased", { expr: "content" }); E("volunteer", "volunteer profile", { s: 1, c: 0, expr: "brightO" });
    grid(g, cells, 8, 4);
  },
  acting: (g, f0) => {
    title(g, "POINTING · the point-and-call clock: point on the NAME word, hand back by the ear 0.4 s, wind-up, SNAP on the STATUS word; the kid 6 f late; the tourist's mock");
    const o = { name: 10, nameEnd: 20, status: 44, statusEnd: 52, rise: 0 };
    const cells: Cell[] = [];
    const frames = [0, 5, 10, 18, 24, 27, 31, 38, 41, 44, 47, 54];
    for (const f of frames) { const c = callOut(f, o, "low"); cells.push({ label: `driver f${f} ${c.phase} k${c.k.toFixed(2)}`, who: "driver",
      P: { s: 1, c: 0, seat: 0.47, expr: "bright", face: { browUp: [-3, -3] }, mouth: f >= 44 && f < 52 ? "laugh" : f >= 10 && f < 20 ? "vI" : "dash",
        ...PPL.bodyArms(false, callArm(c, ptAim, envOf("driver", { s: 1, c: 0 }, 0.47), 1.2), { to: "low", hand: "grip" }) } }); }
    for (const f of [16, 30, 37, 47, 50, 56]) { const c = callOut(f - 6, o, "hang"); cells.push({ label: `kid f${f} (6 f late) ${c.phase}`, who: "kid", k: 0.92 * 485 / 1000,
      P: { s: 1, c: 0, expr: "bright", face: { browUp: [-4, -4] }, tongue: 1, blush: 0.35, ...PPL.bodyArms(false, callArm(c, ptAim, envOf("kid", { s: 1, c: 0 }), 1.3), { to: "hang", hand: "ball" }) } }); }
    const om = { name: 6, nameEnd: 20, status: 36, statusEnd: 44, rise: 0, over: 0.16, wobble: 0.08 };
    for (const f of [8, 24, 32, 37, 40, 46]) { const c = callOut(f, om, "hang"); cells.push({ label: `tourist mock f${f} ${c.phase}`, who: "tourist",
      P: { s: 0.3, c: 0.95, expr: "stare", face: { browUp: [-3, -3] }, stretch: 1.025, nod: -1.4, film: { k: 1, side: 1, tilt: -8 }, ...PPL.bodyArms(false, { to: c.base, aim: [-60, 330], k: c.k, hand: c.hand, hs: 1.3, front: true }, { to: [420, 300], hand: "grip", hs: 1.2, front: true }) } }); }
    void f0;
    grid(g, cells, 8, 3);
  },
  crowd: (g, f) => {
    title(g, "POINTING · the crowd (Tokyo commuters: strap pose, the sleeper, students, grandma, the stroller; NY riders) + the hands + the lab pops");
    const ids: Who[] = ["salarySleep", "salaryRead", "suitA", "suitB", "officeRead", "officePhone", "officeMask", "studentA", "studentB", "grandma", "mumStroller", "lateSalary", "waitA", "waitB", "waitC", "watchTapper", "nyRiderA", "nyRiderB", "nyRiderC", "nyLeaver"];
    const cells: Cell[] = ids.map((id, i) => ({ label: id, who: id, P: { s: i % 3 === 1 ? 0.5 : 0, c: i % 3 === 1 ? 0.86 : 1, expr: id === "salarySleep" ? "calm" : "polite", blink: id === "salarySleep" ? 1 : 0, mask: id === "officeMask",
      seat: id === "grandma" ? 0.45 : undefined, ...(["salarySleep", "suitA", "suitB", "officeMask", "salaryRead"].includes(id) ? PPL.bodyArms(false, { to: "raise", dy: -14, hand: "grip", hs: 1.1 }, { to: "hang", hand: "ball" }) : {}),
      ...(id === "studentA" ? PPL.bodyArms(false, { to: "chin", hand: "flat", dy: -6 }, { to: "strap", hand: "grip" }) : {}) } }));
    grid(g, cells, 8, 3, 0, 60, SW, 1080);
    // the hands + pops
    const y = 1150, cw = SW / 4;
    for (let i = 0; i < 4; i++) backdrop(g, i * cw + 3, y, cw - 6, SH - y - 6);
    const put = (i: number, fn: (p: Pen) => void, k = 0.42) => { g.save(); g.beginPath(); g.rect(i * cw + 3, y, cw - 6, SH - y - 6); g.clip(); g.setTransform(k, 0, 0, k, i * cw + 40, y + 10); fn(new Pen(g)); g.setTransform(1, 0, 0, 1, 0, 0); g.restore(); };
    put(0, (p) => { drawBigHand(p, [470, 640], -0.35, 0.75, 0); drawKeys(p, [430, 470], 0.2 * Math.sin(f / 6)); });
    put(1, (p) => { drawBigHand(p, [470, 640], -0.35, 0.95, 0); drawKeys(p, [430, 470], -0.15); });
    put(2, (p) => drawBigHand(p, [720, 760], -0.75, 0.95, 1, "#f4f1ea", "#f2dccb"));
    put(3, (p) => { drawCallBubble(p, [300, 220], 170, 1); drawTick(p, [720, 230], 120, 1); drawChip(p, [500, 700], 130, 1); }, 0.44);
    label(g, "POV hand: grip + keys (green train charm)", 14, y + 26, 18); label(g, "POV hand: curled round the keys", cw + 14, y + 26, 18);
    label(g, "s22: the tourist's finger", 2 * cw + 14, y + 26, 18); label(g, "lab pops: call bubble, tick, -85 % chip", 3 * cw + 14, y + 26, 18);
  },
};

/** page "all": frame n renders ALL[n] (one bundle for every page) */
export const ALL = ["main", "faces", "others", "acting", "crowd", "tourist", "kiddriver", "mum", "lift"];
export const Sheet: React.FC<{ page: string }> = ({ page }) => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("cast sheet"));
  useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#2a2430"; g.fillRect(0, 0, SW, SH); const pg = page === "all" ? ALL[Math.min(ALL.length - 1, f)] : page; (PAGES[pg] ?? PAGES.main)(g, page === "all" ? 30 : f); continueRender(h); }, [f, page, h]);
  return <canvas ref={ref} width={SW} height={SH} style={{ width: SW, height: SH }} />;
};

// CHAR v2 TEST BENCH: every character of "The Clown Nobody Saw" drawn with the real cast code (cast_people / cast_crowd /
// cast_fx) on a 2D canvas at true 1080 x 1920 pixels, over a warm brick + sky backdrop (the film's worst case for
// separation). Pages (inputProps.page): act, act2 (12 actions each, animated: render every 2nd frame), turn1..turn4
// (turnarounds), clown, faces, hands, crowd, mid (medium-shot scale checks). Not part of the film.
import React, { useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";
import { Pen, P2 } from "../../videos/clown/toon";
import * as PPL from "../../videos/clown/cast_people";
import type { Pose, ClownPose, Arm } from "../../videos/clown/cast_people";
import * as CROWD from "../../videos/clown/cast_crowd";
import * as FX from "../../videos/clown/cast_fx";
import * as VFX from "../../videos/clown/cast_vfx";

type Cell = { label: string; k: number; foot: P2; draw: (p: Pen, f: number) => void; clown?: boolean; note?: (f: number) => string };
const W = 1080, H = 1920, WR = 0.31, LIGHT = (-120 * Math.PI) / 180;
const TAU = Math.PI * 2;

// ---------------- the backdrop ----------------
const backdrop = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, horizon = 0.42) => {
  const hy = y + h * horizon, sky = g.createLinearGradient(0, y, 0, hy);
  sky.addColorStop(0, "#8fc6f2"); sky.addColorStop(1, "#d6ecfb"); g.fillStyle = sky; g.fillRect(x, y, w, hy - y);
  g.fillStyle = "#b8513a"; g.fillRect(x, hy, w, y + h - hy);                       // the brick (L* ~45, hue ~15)
  g.strokeStyle = "rgba(120,40,26,0.55)"; g.lineWidth = 1.2;
  for (let yy = hy + 10, r = 0; yy < y + h; yy += 13 + r * 0.6, r++) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
    for (let xx = x + ((r % 2) * 18); xx < x + w; xx += 36) { g.beginPath(); g.moveTo(xx, yy - 13); g.lineTo(xx, yy); g.stroke(); } }
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
};
const label = (g: CanvasRenderingContext2D, s: string, x: number, y: number, size = 22) => {
  g.font = `bold ${size}px Arial`; g.lineWidth = 4; g.strokeStyle = "#1a1420"; g.fillStyle = "#fff5c8"; g.strokeText(s, x, y); g.fillText(s, x, y);
};
const drawCell = (g: CanvasRenderingContext2D, c: Cell, x: number, y: number, w: number, h: number, f: number, horizon = 0.42) => {
  backdrop(g, x, y, w, h, horizon);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const kk = c.clown ? c.k / PPL.CLOWN_K : c.k;
  g.setTransform(kk, 0, 0, kk, x + c.foot[0] - 300 * kk, y + c.foot[1] - 975 * kk);
  // a contact blob under the feet
  g.save(); g.globalAlpha = 0.28; g.fillStyle = "#3a1a40"; g.beginPath(); g.ellipse(300, 975, 120, 22, 0, 0, TAU); g.fill(); g.restore();
  let err = ""; try { c.draw(new Pen(g), f); } catch (e) { err = String((e as Error).stack ?? e).slice(0, 300); }
  g.setTransform(1, 0, 0, 1, 0, 0); g.restore();
  label(g, c.label, x + 10, y + 28);
  if (err) { g.fillStyle = "#ff3030"; g.font = "13px Consolas"; err.match(/.{1,48}/g)!.forEach((ln, i) => g.fillText(ln, x + 6, y + 60 + 15 * i)); }
  if (c.note) label(g, c.note(f), x + 10, y + h - 12, 16);
};

// ---------------- helpers ----------------
const L = LIGHT;
const life = (f: number, seed: number, amt = 1): Partial<Pose> => ({ ...PPL.holdLife(f, seed, amt) });
const ride = (f: number): Partial<ClownPose> => PPL.clownRide(f);
const clownP = (x: Partial<ClownPose>): ClownPose => ({ s: 0, c: 1, spin: 0.9, wheelR: WR, light: L, expr: "brightGrin", ...x });
const ph = (col: string) => PPL.phoneArm(col);
const C = PPL.C;

// ================================================================== ACTION PAGES (animated)
const ACT: Cell[] = [
  { label: "WAVE (clown, from the elbow)", k: 0.4, clown: true, foot: [150, 455], draw: (p, f) => {
    const r = ride(f), w = PPL.waveArm(f, 22, 1, { down: 60 });
    PPL.drawClown(p, clownP({ ...r, s: 0.3, c: 0.95, spin: f * 0.05, armR: w.arm, headTilt: w.headTilt, tilt: w.tilt, look: 0.1 }));
  } },
  { label: "POINT (interviewer)", k: 0.42, foot: [130, 455], draw: (p, f) => {
    const lk = PPL.lookAt(f, [[0, 0, 0], [19, 1.2, -0.2]]);
    PPL.drawInterviewer(p, 0, { ...life(f, 4), look: lk.look, lookY: lk.lookY, headTilt: 3 * lk.head, light: L, expr: f > 22 ? "asking" : "bright",
      armL: PPL.clipboardArm(), armR: PPL.pointArm(f, 22, [1000, 380], 58) });
  } },
  { label: "THUMBS-UP (headphones dude)", k: 0.42, foot: [175, 455], draw: (p, f) => {
    PPL.drawDude(p, { ...life(f, 6), light: L, expr: f > 20 ? "brightGrin" : "bright", armR: PPL.thumbsUp(f, 22, 56) });
  } },
  { label: "DUCK under the bill (hero)", k: 0.42, foot: [0, 455], draw: (p, f) => {
    const sp = PPL.gaitSpeed("phone"), m = f * sp / 30, x = m / 0.00216; // moves along the card x
    const g = p.g; g.save(); g.translate(x + 40, 0);
    const d = PPL.duckAt(f, 36), lag = PPL.duckLag(f, 36), ch = PPL.phoneChat(f, 9);
    PPL.drawHero(p, { s: 1, c: 0.12, walk: PPL.walkPhase(m, "phone"), go: 1, gait: "phone", duck: d, hairSwing: lag, pack: 0.6 * lag, light: L, expr: "blank", mouth: ch.mouth,
      armR: ph(C.phoneYellow), blink: PPL.blinkAt(f, 9) });
    g.restore();
    FX.drawBill(p, [300 + 40 + (36 * sp / 30) / 0.00216 + 80, 975 - 1.4 / 0.00216], 2.4, 0, 0.62, 0);
  }, note: (f) => `duck ${PPL.duckAt(f, 36).toFixed(2)}` },
  { label: "SPIN (phone guy)", k: 0.42, foot: [180, 455], draw: (p, f) => {
    const sp = PPL.spinAt(f, 26), fa = PPL.faceAt(f, [[0, "polite"], [34, "jawDrop"]]);
    PPL.drawPhoneGuy(p, { ...life(f, 2, 0.5), ...sp, light: L, expr: fa.expr, blink: Math.max(sp.blink ?? 0, fa.lid), ...PPL.bodyArms(sp.view === "back", ph(C.phoneRed), null), mouth: f < 24 ? PPL.phoneChat(f, 2).mouth : undefined });
  }, note: (f) => `angle ${PPL.spinAt(f, 26).angle.toFixed(0)}` },
  { label: "TALK (student line)", k: 0.42, foot: [180, 455], draw: (p, f) => {
    const m = PPL.talkAt(f, 8, 62, 5);
    PPL.drawStudent(p, { ...life(f, 8), light: L, expr: "brightGrin", mouth: m, armR: PPL.talkHand(f, 5, !!m) });
  }, note: (f) => `mouth ${PPL.talkAt(f, 8, 62, 5) ?? "-"}` },
  { label: "WALK with weight (friend)", k: 0.42, foot: [0, 455], draw: (p, f) => {
    const m = f * PPL.gaitSpeed("walk") / 30, g = p.g; g.save(); g.translate(m / 0.00216 + 30, 0);
    PPL.drawFriend(p, 0, { s: 1, c: 0.08, walk: PPL.walkPhase(m), go: 1, light: L, expr: "bright", blink: PPL.blinkAt(f, 3) });
    g.restore();
  } },
  { label: "PHONE WALK (hero, 19 f/step)", k: 0.42, foot: [180, 455], draw: (p, f) => {
    const ch = PPL.phoneChat(f, 13), g = p.g; g.save(); g.translate(PPL.weave(f, 13, 0.12) / 0.00216, 0);
    PPL.drawHero(p, { s: 0.35, c: 0.93, walk: PPL.walkInPlace(f, "phone"), go: 1, gait: "phone", light: L, expr: ch.laughing ? "laughBig" : "bright", mouth: ch.mouth, nod: ch.nod,
      armL: ph(C.phoneYellow), armR: PPL.talkHand(f, 13, ch.talking), blink: PPL.blinkAt(f, 13), look: 0.2 });
    g.restore();
  } },
  { label: "HORN squeeze (clown)", k: 0.4, clown: true, foot: [180, 455], draw: (p, f) => {
    const r = ride(f), h1 = PPL.clownHonk(f, 18), h2 = PPL.clownHonk(f, 46), h = f < 36 ? h1 : h2;
    PPL.drawClown(p, clownP({ ...r, s: -0.75, c: 0.6, spin: -f * 0.07, armR: h.arm, hatLag: (r.hatLag ?? 0) + h.hatLag, ruff: h.ruff, expr: "thrillB", look: -0.3 }));
  } },
  { label: "PEG CLIP (insert)", k: 0.6, foot: [180, 640], draw: (p, f) => { PPL.drawClipInsert(p, PPL.clipAt(f, 36)); } },
  { label: "TIPTOE sneak (professor)", k: 0.42, foot: [0, 455], draw: (p, f) => {
    const m = f * PPL.gaitSpeed("tiptoe") / 30, w = PPL.walkPhase(m, "tiptoe"), [aL, aR] = PPL.sneakArms(f, w), lk = PPL.lookAt(f, [[0, 0.9, 0], [22, -0.9, 0], [44, 0.9, 0]]);
    const g = p.g; g.save(); g.translate(m / 0.00216 + 30, 0);
    PPL.drawProf(p, { s: 1, c: 0.1, walk: w, go: 1, gait: "tiptoe", light: L, expr: "sly", look: lk.look, blink: lk.blink || PPL.blinkAt(f, 22), armL: aL, armR: aR });
    g.restore();
  } },
  { label: "WOBBLE + SAVE (clown)", k: 0.4, clown: true, foot: [180, 455], draw: (p, f) => {
    const r = ride(f), w = PPL.clownWobble(f, 12, 1);
    PPL.drawClown(p, clownP({ ...r, s: 0.6, c: 0.8, spin: f * 0.04, roll: w.roll, armL: w.armL, armR: w.armR, expr: w.expr, hatLag: w.hatLag }));
  } },
];
const ACT2: Cell[] = [
  { label: "BRAKE with a wobble (clown)", k: 0.4, clown: true, foot: [0, 455], draw: (p, f) => {
    const x = PPL.brakeTravel(f, 22, 2.2), b = PPL.clownBrake(f, 22, 1), g = p.g; g.save(); g.translate(x / 0.00216 + 330, 0);
    PPL.drawClown(p, clownP({ s: 0.95, c: 0.3, spin: x / WR, tilt: b.tilt, roll: b.roll, armL: b.armL, armR: b.armR, expr: f > 24 ? "delightB" : "brightGrin", blink: PPL.blinkAt(f, 4) }));
    g.restore();
  } },
  { label: "CHIN STROKE (professor)", k: 0.42, foot: [180, 455], draw: (p, f) => {
    PPL.drawProf(p, { ...life(f, 21), light: L, expr: f > 16 ? "puzzled" : "bright", headTilt: 4 * Math.min(1, Math.max(0, (f - 14) / 8)), armL: PPL.chinStroke(f, 16), look: -0.4, lookY: -0.3 });
  } },
  { label: "FLAT HAND at head height", k: 0.42, foot: [150, 455], draw: (p, f) => {
    PPL.drawProf(p, { ...life(f, 21), light: L, expr: f > 24 ? "proudB" : "bright", armR: PPL.flatHand(f, 20, 1), look: 0.8 });
  } },
  { label: "CUP OFF + THUMB BACK (dude)", k: 0.42, foot: [180, 455], draw: (p, f) => {
    const co = PPL.cupOffArm(f, 8, -1);
    PPL.drawDude(p, { ...life(f, 6), light: L, expr: f > 30 ? "brightGrin" : "bright", armL: co.arm, cupOff: co.cupOff, armR: PPL.overShoulder(f, 30), mouth: PPL.talkAt(f, 30, 66, 3) });
  } },
  { label: "PEDAL MIME (friend)", k: 0.42, foot: [180, 455], draw: (p, f) => {
    const [aL, aR] = PPL.pedalMime(f, 14);
    PPL.drawFriend(p, 1, { ...life(f, 31), light: L, expr: f > 14 ? "laughBig" : "bright", armL: aL, armR: aR, mouth: PPL.talkAt(f, 4, 40, 8) });
  } },
  { label: "GARMENT FLING (student)", k: 0.36, foot: [180, 465], draw: (p, f) => {
    const gf = PPL.garmentFling(f, 26, 1);
    PPL.drawStudent(p, { ...life(f, 8), light: L, expr: f > 28 ? "thrillB" : "brightGrin", armL: gf.hold, armR: gf.fling });
  } },
  { label: "UNICYCLE roll-in (student)", k: 0.36, foot: [0, 465], draw: (p, f) => {
    const m = f * PPL.gaitSpeed("walk") / 30, g = p.g; g.save(); g.translate(m / 0.00216 + 60, 0);
    PPL.drawStudent(p, { s: 1, c: 0.15, walk: PPL.walkPhase(m), go: 1, light: L, expr: "proudB", blink: PPL.blinkAt(f, 8),
      armR: { to: "saddle", dx: 6, hand: "grip", prop: { k: "unicycle", s: 1, spin: m / 0.27, lean: 26 } } });
    g.restore();
  } },
  { label: "WALK IN + STOP (interviewer)", k: 0.42, foot: [0, 455], draw: (p, f) => {
    const st = PPL.stopAt(f, 30), sw = PPL.stopWalk(f, 30), g = p.g; g.save(); g.translate((sw.metres + 0.85) / 0.00216 + 30, 0);
    PPL.drawInterviewer(p, 0, { s: 0.95, c: 0.3, walk: sw.walk, go: sw.go, feet: sw.feet, tilt: st.tilt * 0.95, duck: st.duck, light: L, expr: f > 32 ? "asking" : "bright", armL: PPL.clipboardArm(), blink: PPL.blinkAt(f, 4),
      mouth: PPL.talkAt(f, 38, 66, 2), armR: f > 34 ? PPL.talkHand(f, 2, true) : undefined });
    g.restore();
  } },
  { label: "JOG (runner, in place)", k: 0.42, foot: [180, 455], draw: (p, f) => {
    CROWD.drawCrowd(p, "runner", { ...CROWD.crowdPose("runner", f, { s: 1, c: 0.1 }), light: L });
  } },
  { label: "CYCLIST (crowd)", k: 0.42, foot: [180, 455], draw: (p, f) => { CROWD.drawCrowd(p, "cyclist", { ...CROWD.crowdPose("cyclist", f, { s: 0.95, c: 0.2, metres: f * 0.1 }), light: L }); } },
  { label: "SKATER (crowd)", k: 0.42, foot: [180, 455], draw: (p, f) => { CROWD.drawCrowd(p, "skater", { ...CROWD.crowdPose("skater", f, { s: 0.9, c: 0.3 }), light: L }); } },
  { label: "DOG WALKER (crowd)", k: 0.42, foot: [110, 455], draw: (p, f) => { CROWD.drawCrowd(p, "dogwalker", { ...CROWD.crowdPose("dogwalker", f, { s: 0.9, c: 0.3 }), light: L }); } },
];

// ================================================================== DESIGN PAGES (stills)
type Who = { name: string; draw: (p: Pen, P: Pose) => void; phone?: string; extra?: Partial<Pose> };
const WHO: Who[] = [
  { name: "HERO", draw: PPL.drawHero, phone: C.phoneYellow },
  { name: "PHONE GUY", draw: PPL.drawPhoneGuy, phone: C.phoneRed },
  { name: "LIME phone", draw: PPL.drawWhite, phone: C.phoneLime },
  { name: "SKY-BLUE phone", draw: PPL.drawBlue, phone: C.phoneBlue },
  { name: "PINK phone", draw: PPL.drawPink, phone: C.phonePink },
  { name: "PROFESSOR (Hyman)", draw: PPL.drawProf },
  { name: "STUDENT", draw: PPL.drawStudent },
  { name: "INTERVIEWER", draw: (p, P) => PPL.drawInterviewer(p, 0, P), extra: { armL: PPL.clipboardArm() } },
  { name: "HEADPHONES DUDE", draw: PPL.drawDude },
  { name: "FRIEND A", draw: (p, P) => PPL.drawFriend(p, 0, P) },
  { name: "FRIEND B", draw: (p, P) => PPL.drawFriend(p, 1, P) },
  { name: "MUM (bubble)", draw: PPL.drawMum, phone: "#f2f4f8" },
  { name: "TEAM B", draw: (p, P) => PPL.drawInterviewer(p, 1, P), extra: { armR: PPL.clipboardArm() } },
  { name: "M1 green cans", draw: PPL.drawM1 },
  { name: "M2 orange cans", draw: PPL.drawM2 },
  { name: "COFFEE", draw: PPL.drawCoffee, extra: { armL: { to: "low", prop: { k: "cup" } } } },
  { name: "BOOK", draw: PPL.drawBook, extra: { armL: { to: "hug", prop: { k: "book", col: "#4a7fc4" } }, armR: { to: "hug", dy: 10 } } },
];
const views = (w: Who, f: number): Cell[] => {
  const base = (x: Partial<Pose>): Pose => ({ light: L, expr: "bright", blink: 0, ...w.extra, ...x });
  const phArm = (side: "L" | "R") => (w.phone ? { [`arm${side}`]: ph(w.phone) } : {});
  return [
    { label: `${w.name}: front`, k: 0.3, foot: [135, 300], draw: (p) => w.draw(p, base({ s: 0, c: 1, ...phArm("L") })) },
    { label: "3/4 walk", k: 0.3, foot: [135, 300], draw: (p) => w.draw(p, base({ s: 0.55, c: 0.83, walk: 0.15 + f * 0, go: 1, ...phArm("L"), expr: w.phone ? "bright" : "brightGrin" })) },
    { label: "side walk", k: 0.3, foot: [135, 300], draw: (p) => w.draw(p, base({ s: 1, c: 0.05, walk: 0.6, go: 1, ...phArm("R") })) },
    { label: "back", k: 0.3, foot: [135, 300], draw: (p) => w.draw(p, base({ s: -0.2, c: -0.98, walk: 0.3, go: 1, ...phArm("R") })) },
  ];
};
const CLOWN_PAGE: Cell[] = [
  { label: "CLOWN front: open eyes", k: 0.36, clown: true, foot: [180, 470], draw: (p) => PPL.drawClown(p, clownP({ spin: 0.4, expr: "brightGrin", armL: { fk: [96, 104], hand: "open" }, armR: { to: "show", prop: { k: "horn" }, hand: "grip" } })) },
  { label: "3/4: frame-0 honk", k: 0.36, clown: true, foot: [180, 470], draw: (p) => PPL.drawClown(p, clownP({ s: 0.62, c: 0.78, spin: 1.3, roll: -8, expr: "thrillB", look: 0.6, armL: { fk: [150, 170], hand: "open" }, armR: PPL.clownHonk(20, 19).arm, ruff: 0.4, hatLag: 6 })) },
  { label: "side", k: 0.36, clown: true, foot: [180, 470], draw: (p) => PPL.drawClown(p, clownP({ s: 1, c: 0.02, spin: 2.2, expr: "brightGrin", look: 0.8, armL: { fk: [96, 104], hand: "open" }, armR: { to: "show", prop: { k: "horn" } } })) },
  { label: "back: hair ring", k: 0.36, clown: true, foot: [180, 470], draw: (p) => PPL.drawClown(p, clownP({ s: -0.3, c: -0.95, spin: 4.5, armL: { to: "show", prop: { k: "horn" } }, armR: { fk: [96, 104], hand: "open" } })) },
  { label: "WAVE (peak)", k: 0.36, clown: true, foot: [180, 470], draw: (p) => { const w = PPL.waveArm(28, 22, 1); PPL.drawClown(p, clownP({ s: 0.2, c: 0.97, spin: 0.2, expr: "brightGrin", armR: w.arm, headTilt: w.headTilt, tilt: w.tilt, armL: { fk: [70, 80], hand: "open" } })); } },
  { label: "laugh (one short beat)", k: 0.36, clown: true, foot: [180, 470], draw: (p) => PPL.drawClown(p, clownP({ s: -0.5, c: 0.86, spin: 3.1, expr: "laughBig", headTilt: -6, armL: { fk: [40, 140], hand: "fist" }, armR: { fk: [30, 150], hand: "fist" } })) },
];
const FACE_SET: [string, PPL.Pose["expr"], Partial<Pose>?][] = [
  ["bright (default)", "bright"], ["polite smile", "polite"], ["delight", "brightGrin"], ["delight + laugh", "delightB"], ["surprise", "brightO"], ["JAW DROP", "jawDrop"],
  ["puzzled", "puzzled"], ["sly smirk", "sly", { look: 0.9 }], ["smug lid", "smugB"], ["BLANK (mind away)", "blank"], ["laughing", "laughBig"], ["proud", "proudB", { nod: -1.2 }],
  ["asking", "asking"], ["worried", "worriedB"], ["focus down", "focusB", { lookY: 1 }], ["blink half", "bright", { blink: 0.5 }], ["look left", "bright", { look: -1.3 }], ["look up-right", "bright", { look: 1, lookY: -1 }],
];
const VIS = ["vA", "vE", "vO", "vU", "vI", "vM"] as const;
const faceCell = (name: string, draw: (p: Pen, P: Pose) => void, P: Pose, k = 0.82): Cell => ({ label: name, k, foot: [135, 165 + (975 - 379) * k], draw: (p) => draw(p, P) });

// ================================================================== THE PAGES
const grid = (cells: Cell[], cols: number, rows: number, f: number, g: CanvasRenderingContext2D, horizon = 0.42, top = 0) => {
  const cw = W / cols, ch = (H - top) / rows;
  cells.forEach((c, i) => { const x = (i % cols) * cw, y = top + Math.floor(i / cols) * ch; drawCell(g, c, x, y, cw, ch, f, horizon); });
};
const PAGE = (g: CanvasRenderingContext2D, page: string, f: number) => {
  g.fillStyle = "#18141c"; g.fillRect(0, 0, W, H);
  if (page === "act") return grid(ACT, 3, 4, f, g);
  if (page === "act2") return grid(ACT2, 3, 4, f, g);
  if (page.startsWith("turn")) { const n = +page.slice(4) - 1, ws = WHO.slice(n * 5, n * 5 + 5); grid(ws.flatMap((w) => views(w, f)), 4, 5, f, g, 0.38); label(g, "f" + f, 1000, 1910, 14); return; }
  if (page === "clown") return grid(CLOWN_PAGE, 2, 3, f, g, 0.5);
  if (page === "faces") {
    const cells: Cell[] = [];
    FACE_SET.forEach(([n, e, x], i) => { const who = [PPL.drawHero, PPL.drawPhoneGuy, PPL.drawProf, PPL.drawStudent, PPL.drawDude, PPL.drawBlue][i % 6]; cells.push(faceCell(n, who, { light: L, expr: e, ...(x ?? {}) })); });
    VIS.forEach((v) => cells.push(faceCell("talk " + v, PPL.drawStudent, { light: L, expr: "bright", mouth: v })));
    return grid(cells, 4, 6, f, g, 0.7);
  }
  if (page === "clownfaces") {
    const cells: Cell[] = [];
    for (const [n, e] of [["clown bright", "bright"], ["clown delight", "brightGrin"], ["clown thrill", "thrillB"], ["clown jaw drop", "jawDrop"], ["clown laugh", "laughBig"], ["clown sly", "sly"]] as const)
      cells.push({ label: n, k: 1.0, clown: true, foot: [180, 360 + 700], draw: (p) => PPL.drawClown(p, clownP({ expr: e, spin: 0.3, look: 0.3 })) });
    return grid(cells, 3, 2, f, g, 0.6);
  }
  if (page === "hands") { // the hand set at MEDIUM-shot size (a figure 45 % of the frame: k 1.15 -> u ~2.8 px)
    const kinds: PPL.HandKind[] = ["open", "point", "thumb", "pinch", "fist", "flat", "grip", "ball"];
    kinds.forEach((kd, i) => { const x = 40 + (i % 4) * 260, y = 40 + Math.floor(i / 4) * 300; backdrop(g, x - 30, y - 20, 250, 280, 0.5);
      g.setTransform(1.15, 0, 0, 1.15, x + 90, y + 200); PPL.drawHandShape(new Pen(g), kd, [0, 0], 2.44, -1, kd === "point" ? 0 : -90, 0, 1); g.setTransform(1, 0, 0, 1, 0, 0);
      label(g, kd, x - 20, y + 4); });
    // props in the hand at medium size: the phone at the ear (each colour), bills, pegs, the peg in a pinch
    const props: [string, (p: Pen, P: Pose) => void, Pose][] = [
      ["phones: yellow", PPL.drawHero, { light: L, armL: ph(C.phoneYellow), expr: "bright" }],
      ["red", PPL.drawPhoneGuy, { light: L, armL: ph(C.phoneRed), expr: "polite" }],
      ["white", PPL.drawWhite, { light: L, armL: ph(C.phoneWhite), expr: "bright" }],
      ["sky-blue", PPL.drawBlue, { light: L, armR: ph(C.phoneBlue), expr: "bright" }],
      ["pink", PPL.drawPink, { light: L, armL: ph(C.phonePink), expr: "bright" }],
      ["bills + pegs (sneakArms)", PPL.drawProf, { light: L, expr: "sly", look: 0.9, armL: PPL.sneakArms(10, 0.3)[0], armR: PPL.sneakArms(10, 0.3)[1] }],
    ];
    props.forEach(([n, d, P], i) => { const x = (i % 3) * 360, y = 660 + Math.floor(i / 3) * 630; drawCell(g, { label: n, k: 1.05, foot: [180, 360 + 700], draw: (p) => d(p, P) }, x, y, 360, 630, f, 0.5); });
    return;
  }
  if (page === "crowd") { const ids = CROWD.CROWD_IDS; grid(ids.map((id, i) => ({ label: id, k: 0.27, foot: [135, 345], draw: (p: Pen) => CROWD.drawCrowd(p, id, { ...CROWD.crowdPose(id, 20 + i * 7, { s: i % 2 ? 0.8 : -0.4, c: i % 2 ? 0.5 : 0.9 }), light: L }) })), 4, 4, f, g, 0.38); return; }
  if (page === "vfx1" || page === "vfx2" || page === "bits" || page === "crowd2") { // p3: effects, clown bits, crowd behaviours
    const K = 0.42, F: P2 = [180, 455], cell = (label: string, draw: (p: Pen, fr: number) => void, clown = false, foot: P2 = F, k = clown ? 0.4 : K): Cell => ({ label, k, foot, draw, clown });
    const who = (p: Pen, name: Parameters<typeof PPL.anchors>[0], draw: (p: Pen, P: Pose) => void, P: Pose, fx: (A: PPL.Anchors) => void) => { draw(p, P); fx(PPL.anchors(name, P)); };
    const cl = (p: Pen, P: ClownPose, fx: (A: PPL.ClownAnchors) => void) => { PPL.drawClown(p, P); fx(PPL.clownAnchors(P)); };
    let cells: Cell[] = [];
    if (page === "vfx1") cells = [
      cell("DUST skid (clown brake)", (p, fr) => { const b = PPL.clownBrake(fr, 14, 1), ls = PPL.landSquash(fr, 14, 0.5); cl(p, clownP({ s: 0.95, c: 0.3, spin: Math.min(fr, 16) * 0.2, tilt: b.tilt, roll: b.roll, armL: b.armL, armR: b.armR, stretch: ls.stretch }), (A) => VFX.dust(p, fr, 13, [A.wheel[0] - 20, A.wheel[1]], { u: A.u * 1.3, kind: "skid", dir: 1 })); }, true),
      cell("HOP + LAND + DUST, then STEPS", (p, fr) => { const h = PPL.hopAt(fr, 10, 0.22, 10); who(p, "ask0", (q, P) => PPL.drawInterviewer(q, 0, P), { light: L, expr: fr > 8 && fr < 26 ? "thrillB" : "bright", hop: h.hop, stretch: h.stretch, armL: PPL.clipboardArm(), go: fr > 34 ? 1 : 0, gait: "tiptoe", walk: PPL.walkInPlace(fr, "tiptoe"), s: fr > 34 ? 1 : 0, c: fr > 34 ? 0.1 : 1 }, (A) => { VFX.dust(p, fr, 20, A.feet, { u: A.u, kind: "land" }); VFX.dust(p, fr, 36, A.feet, { u: A.u, kind: "steps", dir: 1, f1: 58 }); }); }),
      cell("SPEED LINES + SMEAR (ride-by)", (p, fr) => { const P = clownP({ ...ride(fr), s: 0.97, c: 0.25, spin: fr * 0.3, lean: 0, tilt: 8 }); VFX.smearTrail(p, fr, [300, 560], { u: 2.4, dir: 1, len: 120, h: 170 }); PPL.drawClown(p, P); VFX.speedLines(p, fr, [300, 560], { u: 2.4, dir: 1, h: 230, len: 80, n: 8 }); }, true, [230, 455]),
      cell("POP + STARS (a hit)", (p, fr) => who(p, "dude", PPL.drawDude, { ...life(fr, 6), light: L, expr: "brightGrin", armR: PPL.thumbsUp(fr, 8, 50) }, (A) => { VFX.popBurst(p, fr, 14, [A.hands[1][0] + 10, A.hands[1][1] - 50], { u: A.u }); VFX.impactStars(p, fr, 14, [A.hands[1][0] + 10, A.hands[1][1] - 50], { u: A.u }); VFX.popBurst(p, fr, 38, [A.hands[1][0] + 10, A.hands[1][1] - 50], { u: A.u, r: 14 }); })),
      cell("TAKE + SURPRISE + !", (p, fr) => { const tk = PPL.takeAt(fr, 12); who(p, "phoneGuy", PPL.drawPhoneGuy, { light: L, expr: fr >= 16 ? "jawDrop" : "polite", stretch: tk.stretch, nod: tk.nod, armL: ph(C.phoneRed), blink: PPL.blinkAt(fr, 2) }, (A) => { VFX.surpriseLines(p, fr, 16, A.head, { u: A.u }); VFX.bang(p, fr, 17, [A.crown[0] + 40, A.crown[1] - 12 * A.u], { u: A.u }); }); }),
      cell("DOUBLE TAKE + ? + SWEAT", (p, fr) => { const d = PPL.doubleTake(fr, 8, 1); who(p, "phoneGuy", PPL.drawPhoneGuy, { light: L, expr: fr >= 25 ? "puzzled" : "polite", look: d.look, headTilt: d.headTilt, stretch: d.stretch, nod: d.nod, blink: d.blink, armL: ph(C.phoneRed) }, (A) => { VFX.bang(p, fr, 26, [A.crown[0], A.crown[1] - 12 * A.u], { u: A.u, ch: "?" }); VFX.sweat(p, fr, 30, [A.head[0] + 0.85 * A.r, A.head[1] - 0.45 * A.r], { u: A.u, n: 2, f1: 58 }); }); }),
      cell("LAUGH SHAKE + TEARS", (p, fr) => { const sh = PPL.laughShake(fr, 8, 52); who(p, "friend1", (q, P) => PPL.drawFriend(q, 1, P), { light: L, expr: fr > 6 && fr < 54 ? "laughBig" : "bright", stretch: sh.stretch, nod: sh.nod, headTilt: sh.headTilt, armL: { to: "belly", hand: "open" }, armR: { to: "chest", hand: "open" } }, (A) => VFX.laughTears(p, fr, 10, A.head, { u: A.u, f1: 50 })); }),
      cell("NOTES + BOP + CABLE", (p, fr) => { const sway = (t: number) => 10 * Math.sin(TAU * t / 34); who(p, "dude", PPL.drawDude, { light: L, expr: "brightGrin", ...PPL.bopAt(fr), ...PPL.overlapAll(sway, fr, 1.6), go: 1, walk: PPL.walkInPlace(fr, "stroll"), gait: "stroll", s: 0.3, c: 0.95 }, (A) => VFX.notes(p, fr, [A.head[0] + A.r, A.head[1] - 0.6 * A.r], { u: A.u })); }),
      cell("BLAH bubble (STORY only)", (p, fr) => { const ch = PPL.phoneChat(fr, 13); who(p, "hero", PPL.drawHero, { light: L, expr: "bright", mouth: ch.mouth, nod: ch.nod, armL: PPL.phoneArm(C.phoneYellow), armR: PPL.talkHand(fr, 13, ch.talking), s: 0.3, c: 0.95 }, (A) => VFX.blah(p, fr, [A.hands[0][0] - 12 * A.u, A.hands[0][1] - 26 * A.u], { u: A.u, side: -1, k: ch.talking ? 1 : 0.25 })); }),
      cell("SPARKLES + CHEST PUFF", (p, fr) => { const cp = PPL.chestPuff(fr, 12, 50); who(p, "prof", PPL.drawProf, { light: L, expr: fr > 12 ? "proudB" : "bright", ...cp, armL: { to: "hip" }, armR: { to: "hip" } }, (A) => VFX.sparkles(p, fr, A.head, { u: A.u, f0: 14, r: 78, k: fr < 52 ? 1 : 0 })); }),
      cell("CONFETTI + FLASH (suit reveal)", (p, fr) => { const gf = PPL.garmentFling(fr, 20, 1); who(p, "student", PPL.drawStudent, { light: L, expr: fr > 21 ? "thrillB" : "brightGrin", armL: gf.hold, armR: gf.fling }, (A) => { VFX.confetti(p, fr, 21, [A.hands[0][0], A.hands[0][1] + 30], { u: A.u, w: 260 }); VFX.sparkles(p, fr, [A.hands[0][0], A.hands[0][1] + 150], { u: A.u, f0: 22, r: 70 }); VFX.flash(p, fr, 20, [A.hands[0][0], A.hands[0][1] + 120], { u: A.u, r: 220 }); }); }, false, [215, 455], 0.36),
      cell("HONK RINGS + JIGGLE", (p, fr) => { const bit = PPL.clownBit("honk", fr, fr < 30 ? 6 : 34); PPL.drawClownBit(p, clownP({ ...ride(fr), s: -0.4, c: 0.9, spin: -fr * 0.05, ...bit.pose }), bit); }, true),
    ];
    if (page === "vfx2") cells = [
      cell("FEATHERS (after a flush)", (p, fr) => { VFX.feathers(p, fr, 6, [300, 560], { u: 2.6, n: 8, w: 220 }); VFX.dust(p, fr, 4, [300, 975], { u: 2.6, kind: "stop" }); }),
      cell("STEAM + BREATH", (p, fr) => who(p, "mum", PPL.drawMum, { ...life(fr, 9), light: L, expr: "brightGrin", armL: { to: "chest", hand: "grip", prop: { k: "mug" } } }, (A) => { VFX.puff(p, fr, 6 + 20 * Math.floor(Math.max(0, fr - 6) / 20), [A.hands[0][0], A.hands[0][1] - 20 * A.u], { u: A.u }); VFX.puff(p, fr, 30, [A.mouth[0] + 14 * A.u, A.mouth[1]], { u: A.u, dir: -20 }); })),
      cell("PAPER FLUTTER", (p, fr) => who(p, "prof", PPL.drawProf, { light: L, expr: fr > 8 && fr < 30 ? "jawDrop" : "worriedB", ...PPL.takeAt(fr, 5), armL: { fk: [130, 165], hand: "open" }, armR: { fk: [124, 160], hand: "open" } }, (A) => VFX.paperFlutter(p, fr, 8, [A.chest[0], A.chest[1] - 30], { u: A.u, n: 7, w: 260 }))),
      cell("HEARTS", (p, fr) => who(p, "friend1", (q, P) => PPL.drawFriend(q, 1, P), { ...life(fr, 31), light: L, expr: "delightB", armL: { to: "chest", dx: -4, hand: "open" }, armR: { to: "chest", dx: 4, dy: 5, hand: "open" }, headTilt: 5 }, (A) => VFX.hearts(p, fr, 8, [A.crown[0], A.crown[1] - 4 * A.u], { u: A.u * 1.3, n: 4 }))),
      cell("ANGER", (p, fr) => who(p, "coffee", PPL.drawCoffee, { ...life(fr, 20), light: L, expr: "stern", armL: { to: "low", prop: { k: "cup" } }, ...PPL.shiver(fr, 10, 40, 0.6) }, (A) => VFX.anger(p, fr, [A.head[0] + 0.62 * A.r, A.head[1] - 0.6 * A.r], { u: A.u * 1.3, k: fr > 8 ? 1 : 0 }))),
      cell("ZZZ (blank mind)", (p, fr) => who(p, "hero", PPL.drawHero, { light: L, expr: "blank", armL: PPL.phoneArm(C.phoneYellow), go: 1, gait: "phone", walk: PPL.walkInPlace(fr, "phone"), s: 0.3, c: 0.95 }, (A) => VFX.zzz(p, fr, [A.crown[0] + 20, A.crown[1] - 6], { u: A.u }))),
      cell("LIGHT BULB (the idea)", (p, fr) => who(p, "prof", PPL.drawProf, { ...life(fr, 21), light: L, expr: fr > 14 ? "brightGrin" : "puzzled", face: { browUp: PPL.browsUp(fr, 14) }, ...PPL.takeAt(fr, 10, 0.6), armR: fr > 14 ? PPL.pointArm(fr, 16, [330, 100]) : PPL.chinStroke(fr, -20) }, (A) => VFX.bulb(p, fr, 14, [A.crown[0], A.crown[1] - 12 * A.u], { u: A.u * 1.2 }))),
      cell("MULTIPLES (a whip)", (p, fr) => { const x = 110 * Math.sin(TAU * fr / 30), v = Math.cos(TAU * fr / 30); p.g.save(); p.g.translate(x, 0); VFX.multiples(p, (q) => PPL.drawStudent(q, { light: L, expr: "thrillB", tilt: 10 * v, armL: { fk: [120, 150], hand: "open" }, armR: { fk: [120, 150], hand: "open" } }), { dir: Math.sign(v) || 1, dx: 16, k: Math.abs(v) }); p.g.restore(); }),
      cell("SHIVER + SWEAT", (p, fr) => { const sh = PPL.shiver(fr, 8, 48); who(p, "phoneGuy", PPL.drawPhoneGuy, { light: L, expr: "worriedB", tilt: sh.tilt, sq: sh.sq, armL: ph(C.phoneRed) }, (A) => VFX.sweat(p, fr, 10, [A.head[0] + 0.85 * A.r, A.head[1] - 0.45 * A.r], { u: A.u, n: 2, f1: 50 })); }),
      cell("OVERLAP: hair, pack, lanyard", (p, fr) => { const sway = (t: number) => 16 * Math.sin(TAU * t / 26), o2 = PPL.overlapAll(sway, fr, 1.5); p.g.save(); p.g.translate(sway(fr) * 2.4 - 110, 0); PPL.drawHero(p, { light: L, expr: "bright", tilt: 0.3 * sway(fr), ...o2 }); p.g.translate(220, 0); PPL.drawInterviewer(p, 0, { light: L, expr: "bright", tilt: 0.3 * sway(fr), ...o2, armL: PPL.clipboardArm() }); p.g.restore(); }, false, F, 0.34),
      cell("PHONE GLOW (shade) + RIM", (p, fr) => { p.g.save(); p.g.globalAlpha = 0.45; p.g.fillStyle = "#1a1030"; p.g.fillRect(-300, 0, 1200, 1000); p.g.restore(); PPL.drawHero(p, { light: L, expr: "bright", armL: { ...PPL.phoneArm(C.phoneYellow), prop: { k: "phone", col: C.phoneYellow, glow: 0.5 + 0.3 * Math.sin(fr / 5) } } }); }, false, [180, 760], 0.95),
      cell("CLOWN detail: poms, laces, ruff", (p, fr) => { const bit = PPL.clownBit("honk", fr, 8 + 26 * Math.floor(fr / 26)); PPL.drawClownBit(p, clownP({ s: 0.5, c: 0.86, spin: fr * 0.04, ...bit.pose }), bit); }, true, [150, 560], 0.62),
    ];
    if (page === "bits") cells = (["juggle", "hatTip", "hankies", "balloon", "oneFoot", "trip", "partyHorn", "pigeonHat", "bow", "kiss", "honk"] as PPL.ClownBitName[]).map((name) =>
      cell(`${name} (${PPL.CLOWN_BITS[name]} f)`, (p, fr) => { const bit = PPL.clownBit(name, fr, 6); PPL.drawClownBit(p, clownP({ ...ride(fr), s: 0.3, c: 0.95, spin: fr * 0.05, ...bit.pose }), bit); }, true, [name === "hankies" || name === "balloon" ? 140 : 180, 455]));
    if (page === "crowd2") cells = (["filmer", "paperChase", "sharedCans", "watchJog", "dogPull", "skateTrick", "sandwich", "highFive", "pointLaugh", "bookWalk"] as CROWD.CrowdBitName[]).map((name) =>
      cell(`${name}${CROWD.CROWD_BIT_QUIZ[name] ? "" : " (STORY only)"}`, (p, fr) => CROWD.crowdBit(name, fr, { f0: 20, s: name === "paperChase" || name === "watchJog" || name === "bookWalk" ? 0.9 : name === "dogPull" || name === "skateTrick" ? 0.9 : 0.3, c: name === "paperChase" || name === "watchJog" || name === "dogPull" || name === "skateTrick" || name === "bookWalk" ? 0.4 : 0.95, light: L }).draw(p), false, [name === "dogPull" ? 110 : 180, 455], name === "sharedCans" || name === "highFive" ? 0.36 : K));
    return grid(cells, 3, 4, f, g);
  }
  if (page === "d8a") { // D8 design checks (static): phones near / far (size floor), back-of-head hair, the keyed turn
    const PH: [string, (p: Pen, P: Pose) => void, string][] = [["HERO yellow", PPL.drawHero, C.phoneYellow], ["PHONE GUY red", PPL.drawPhoneGuy, C.phoneRed], ["LIME (was white)", PPL.drawWhite, C.phoneLime], ["SKY-BLUE", PPL.drawBlue, C.phoneBlue], ["PINK", PPL.drawPink, C.phonePink]];
    const cells: Cell[] = [];
    for (const [n, d, col] of PH) cells.push({ label: n, k: 0.3, foot: [108, 330], draw: (p) => d(p, { s: 0.2, c: 0.98, light: L, expr: "bright", armL: PPL.phoneArm(col), armR: { to: "talk", hand: "open" } }) });
    for (const [n, d, col] of PH) cells.push({ label: "far: size 1 | floor", k: 0.13, foot: [108, 200], note: () => "97 px tall: x" + PPL.phoneSizeFor(97.5).toFixed(2), draw: (p) => {
      p.g.save(); p.g.translate(-330, 0); d(p, { s: 0.2, c: 0.98, light: L, expr: "bright", armL: PPL.phoneArm(col) }); p.g.translate(660, 0);
      d(p, { s: 0.2, c: 0.98, light: L, expr: "bright", armL: PPL.phoneArm(col, 0, 0, PPL.phoneSizeFor(97.5)) }); p.g.restore(); } });
    const BK: [string, (p: Pen, P: Pose) => void, Partial<Pose>][] = [["PHONE GUY back", PPL.drawPhoneGuy, { armR: PPL.phoneArm(C.phoneRed) }], ["INTERVIEWER back", (p, P) => PPL.drawInterviewer(p, 0, P), {}], ["DUDE back", PPL.drawDude, {}],
      ["HERO back", PPL.drawHero, { armR: PPL.phoneArm(C.phoneYellow) }], ["PROF back", PPL.drawProf, {}]];
    for (const [n, d, x] of BK) cells.push({ label: n, k: 0.3, foot: [108, 330], draw: (p) => d(p, { s: -0.15, c: -0.99, light: L, ...x }) });
    const guy = (t: number, lab: string, sp: ReturnType<typeof PPL.spinAround>): Cell => ({ label: lab, k: 0.3, foot: [108, 330], draw: (p) => PPL.drawPhoneGuy(p, { ...sp, go: 0, light: L, expr: t >= 3 ? "jawDrop" : "bright",
      ...PPL.bodyArms(sp.back, PPL.phoneArm(C.phoneRed), { to: "talk", hand: "open" }) }) });
    for (const t of [-2, 0, 1, 2, 3, 4, 5, 7, 14]) cells.push(guy(t, "spinAround f0" + (t < 0 ? t : "+" + t), PPL.spinAround(t, 0, { from: 180, to: 0 })));
    { const sp = PPL.spinAt(2, 0, { from: 140, to: -35, wind: 5, turn: 7, over: 22, settle: 10, windDeg: 14 }) as ReturnType<typeof PPL.spinAround>; cells.push(guy(2, "spinAt (S13 call) +2", { ...sp, back: sp.view === "back" })); }
    grid(cells, 5, 5, f, g, 0.4); return;
  }
  if (page === "d8b") { // D8 / D9 kit checks (animated): the keyed turn, the suit reveal, the pedal mime, the reach, the office bits, overlap
    const profCell = (name: PPL.ProfBitName, o: PPL.ProfBitOpt = {}): Cell => ({ label: `PROF ${name} (${PPL.PROF_BITS[name]} f)`, k: 0.4, foot: [name === "pace" ? 110 : 150, 455], draw: (p, fr) => {
      const bit = PPL.profBit(name, fr, 4, o), base: Pose = { ...life(fr, 31, 0.6), s: 0, c: 1, light: L, expr: "bright", armL: { to: "hang" }, armR: { to: "hip" } };
      p.g.save(); p.g.translate(bit.travel / 0.00216, 0); PPL.drawProfBit(p, base, bit); p.g.restore(); } });
    const cells: Cell[] = [
      { label: "spinAround 180 -> 0 (turn at f14)", k: 0.42, foot: [180, 455], draw: (p, fr) => { const sp = PPL.spinAround(fr, 14, { from: 180, to: 0 });
        PPL.drawPhoneGuy(p, { ...sp, go: 0, light: L, expr: fr >= 17 ? "jawDrop" : "bright", ...PPL.bodyArms(sp.back, PPL.phoneArm(C.phoneRed), fr > 18 ? { to: "hang", to2: "out", k: PPL.gesture(fr, 19, { move: 5, over: 0.18 }), hand: "open", hs: 1.15 } : { to: "talk", hand: "open" }) }); } },
      { label: "spinAt, the S13 call (turn at f14)", k: 0.42, foot: [180, 455], draw: (p, fr) => { const sp = PPL.spinAt(fr, 14, { from: 140, to: -35, wind: 5, turn: 7, over: 22, settle: 10, windDeg: 14 });
        PPL.drawPhoneGuy(p, { ...sp, go: 0, light: L, expr: fr >= 17 ? "jawDrop" : "bright", ...PPL.bodyArms(sp.view === "back", PPL.phoneArm(C.phoneRed), { to: "talk", hand: "open" }) }); } },
      { label: "SUIT REVEAL (flap opens at f30)", k: 0.36, foot: [215, 455], note: (fr) => { const sr = PPL.suitReveal(fr, 30, 1); return "hold hand x " + Math.round(PPL.anchors("student", { s: 0, c: 1, armL: sr.hold, armR: sr.fling }).hands[sr.hand][0]); }, draw: (p, fr) => { const sr = PPL.suitReveal(fr, 30, 1);
        const P: Pose = { ...life(fr, 8, 0.5), s: 0, c: 1, light: L, expr: fr < 30 ? "sly" : "proudB", armL: sr.hold, armR: sr.fling, tilt: sr.tilt, stretch: sr.stretch, face: { freckles: 0.85 } };
        const A = PPL.anchors("student", P), h = A.hands[sr.hand];
        p.g.save(); p.g.translate(h[0] - 300, 0); PPL.drawSuitBag(p, h[1], sr); p.g.restore(); PPL.drawStudent(p, P); } },
      { label: "PEDAL MIME (from f6, 14 f a turn)", k: 0.42, foot: [180, 455], draw: (p, fr) => { const [aL, aR] = PPL.pedalMime(fr, 6, 52);
        PPL.drawFriend(p, 0, { ...life(fr, 5, 0.4), ...PPL.pedalMimeBody(fr, 6, 52), s: 0, c: 1, light: L, expr: "brightGrin", mouth: PPL.talkAt(fr, 8, 40, 3), armL: aL, armR: aR }); } },
      { label: "REACH for the bill (f12, lets go f44)", k: 0.4, foot: [150, 462], draw: (p, fr) => { const at: P2 = [300 + 150, 292], rb = PPL.reachBill(fr, 12, at, 1, 44), u = 2.4;
        const c: P2 = [at[0] + 26 * u, at[1] - 16 * u + rb.bill.dy * u], peg: P2 = [c[0], c[1] - 14 * u];
        p.stroke([[peg[0] - 150, peg[1] - 30], [peg[0] + 150, peg[1] - 36]], 1.6 * u, "#6b4a2e");
        p.g.save(); p.g.translate(peg[0], peg[1]); p.g.rotate((rb.bill.tilt * Math.PI) / 180); p.g.translate(-peg[0], -peg[1]); FX.drawBill(p, c, u, 0, 0.6, 0.1); FX.drawPeg(p, [peg[0], peg[1] - 2 * u], u, 0, 0, 0.9); p.g.restore();
        PPL.drawCoffee(p, { ...life(fr, 9, 0.4), s: 0, c: 1, light: L, expr: rb.gaze > 0.5 ? (rb.bill.held ? "delightB" : "brightO") : "bright", look: 0.55 * rb.gaze, lookY: -0.9 * rb.gaze, nod: rb.nod, headTilt: rb.headTilt, duck: rb.duck, stretch: rb.stretch,
          face: { browUp: rb.browUp }, armR: rb.arm, armL: { to: "hang" } }); } },
      profCell("pace"), profCell("tapBoard"), profCell("crossOut"), profCell("crumpleToss", { bin: true }), profCell("takeUni", { bang: true }), profCell("idea"),
      { label: "OVERLAP: walk, stop at f30 (auto + stopOverlap)", k: 0.36, foot: [180, 455], draw: (p, fr) => { const sw = PPL.stopWalk(fr, 30, "walk"), sa = PPL.stopAt(fr, 30);
        p.g.save(); p.g.translate(sw.metres / 0.00216 - 60, 0);
        PPL.drawHero(p, { s: 0.92, c: 0.39, light: L, expr: "bright", walk: sw.walk, go: sw.go, feet: fr > 22 ? sw.feet : undefined, tilt: sa.tilt, duck: sa.duck, armR: PPL.phoneArm(C.phoneYellow), ...PPL.stopOverlap(fr, 30, 1) }); p.g.restore(); } },
    ];
    grid(cells, 3, 4, f, g); return;
  }
  if (page === "poses") { // the story cast's KEY POSES (each at its held frame)
    const K = 0.3, F: P2 = [180, 360];
    const cells: Cell[] = [
      { label: "PROF chin stroke", k: K, foot: F, draw: (p) => PPL.drawProf(p, { light: L, expr: "puzzled", headTilt: 4, armL: PPL.chinStroke(40, 16), look: -0.4, lookY: -0.3 }) },
      { label: "PROF brows up + grin", k: K, foot: F, draw: (p) => PPL.drawProf(p, { light: L, expr: "brightGrin", face: { browUp: PPL.browsUp(30, 20) } }) },
      { label: "PROF flat hand (head height)", k: K, foot: [150, 360], draw: (p) => PPL.drawProf(p, { light: L, expr: "proudB", armR: PPL.flatHand(40, 20, 1), look: 0.8 }) },
      { label: "PROF tiptoe sneak", k: K, foot: F, draw: (p) => { const [a, b] = PPL.sneakArms(10, 0.3); PPL.drawProf(p, { s: 1, c: 0.1, walk: 0.3, go: 1, gait: "tiptoe", light: L, expr: "sly", look: 0.9, armL: a, armR: b }); } },
      { label: "STUDENT lean in", k: K, foot: F, draw: (p) => PPL.drawStudent(p, { light: L, expr: "brightGrin", ...PPL.leanIn(1, 1), armR: { to: "out", dy: -10, hand: "grip" } }) },
      { label: "STUDENT garment ta-da", k: K, foot: [215, 360], draw: (p) => { const g2 = PPL.garmentFling(44, 30, 1); PPL.drawStudent(p, { light: L, expr: "thrillB", armL: g2.hold, armR: g2.fling }); } },
      { label: "INTERVIEWER asking", k: K, foot: F, draw: (p) => PPL.drawInterviewer(p, 0, { light: L, expr: "asking", mouth: "vO", face: { browUp: [5, 5] }, armL: PPL.clipboardArm(), armR: PPL.talkHand(16, 2, true) }) },
      { label: "INTERVIEWER writing", k: K, foot: F, draw: (p) => PPL.drawInterviewer(p, 0, { light: L, expr: "focusB", lookY: 1, armL: PPL.clipboardArm(-8), armR: PPL.writeArm(9) }) },
      { label: "FRIEND pedal mime", k: K, foot: F, draw: (p) => { const [a, b] = PPL.pedalMime(30, 14); PPL.drawFriend(p, 1, { light: L, expr: "laughBig", armL: a, armR: b }); } },
      { label: "DUDE cup off + thumb back", k: K, foot: F, draw: (p) => { const co = PPL.cupOffArm(40, 8, -1); PPL.drawDude(p, { light: L, expr: "brightGrin", mouth: "vA", cupOff: co.cupOff, armL: co.arm, armR: PPL.overShoulder(44, 30) }); } },
      { label: "PHONE GUY 'what clown?'", k: K, foot: F, draw: (p) => PPL.drawPhoneGuy(p, { light: L, expr: "puzzled", mouth: "vU", armL: ph(C.phoneRed), armR: { to: "talk", hand: "open", ang: 50 } }) },
      { label: "PHONE GUY jaw drop", k: K, foot: F, draw: (p) => PPL.drawPhoneGuy(p, { light: L, expr: "jawDrop", armL: { to: "ear", to2: "low", k: 0.7, prop: { k: "phone", col: C.phoneRed }, hand: "grip" } }) },
      { label: "HERO blank (mind away)", k: K, foot: F, draw: (p) => PPL.drawHero(p, { s: 0.3, c: 0.95, walk: 0.3, go: 1, gait: "phone", light: L, expr: "blank", armL: ph(C.phoneYellow) }) },
      { label: "HERO's MIND (ghost)", k: K, foot: F, draw: (p) => PPL.drawMind(p, { light: L, expr: "laughBig", mouth: "laugh", armL: ph(C.phoneYellow), armR: { to: "talk", hand: "open", ang: 40 } }, 0.62) },
      { label: "MUM on the call", k: K, foot: F, draw: (p) => PPL.drawMum(p, { light: L, expr: "brightGrin", mouth: "vE", armR: ph("#f2f4f8"), armL: { to: "chest", hand: "grip", prop: { k: "mug", steam: 1 } } }) },
    ];
    return grid(cells, 3, 5, f, g, 0.42);
  }
  if (page === "insert") { drawCell(g, { label: "PEG-CLIP INSERT (snap at f36)", k: 1.6, foot: [540, 1620], draw: (p, fr) => PPL.drawClipInsert(p, PPL.clipAt(fr, 36)) }, 0, 0, W, H, f, 0.6); return; }
  if (page === "measure") { // every action, every frame 0..70, offscreen with the probe: arm bones, stance-foot slide
    const cv = document.createElement("canvas"); cv.width = 360; cv.height = 480; const og = cv.getContext("2d")!;
    const rows: string[] = ["action: arms max |upper-fore| (head h) / upper range | stance-foot slide max px (walkers)"];
    for (const c of [...ACT, ...ACT2]) {
      let armD = 0, upMin = 9, upMax = 0, slide = 0, nArms = 0; let prev: { lr: number; heel: P2 }[] | null = null;
      for (let fr = 0; fr <= 70; fr++) {
        PPL.probe.on = true; PPL.probe.arms = []; PPL.probe.feet = [];
        const kk = c.clown ? c.k / PPL.CLOWN_K : c.k; og.setTransform(kk, 0, 0, kk, c.foot[0] - 300 * kk, c.foot[1] - 975 * kk); og.clearRect(-5000, -5000, 20000, 20000);
        c.draw(new Pen(og), fr);
        for (const a of PPL.probe.arms) { armD = Math.max(armD, Math.abs(a.up - a.fore)); upMin = Math.min(upMin, a.up); upMax = Math.max(upMax, a.up); nArms++; }
        const feet = PPL.probe.feet.map((q) => ({ lr: q.lr, heel: q.heel }));
        if (prev && feet.length === 2 && prev.length === 2) { // the planted foot = the lower heel in both frames, same leg
          const lo = (L: { lr: number; heel: P2 }[]) => (L[0].heel[1] > L[1].heel[1] ? L[0] : L[1]);
          const a = lo(prev), b = lo(feet), ga = Math.max(prev[0].heel[1], prev[1].heel[1]);
          if (a.lr === b.lr && Math.abs(a.heel[1] - ga) < 0.6 && Math.abs(b.heel[1] - Math.max(feet[0].heel[1], feet[1].heel[1])) < 0.6 && Math.abs(a.heel[1] - b.heel[1]) < 0.6) slide = Math.max(slide, Math.abs(b.heel[0] - a.heel[0]));
        }
        prev = feet;
      }
      PPL.probe.on = false;
      rows.push(`${c.label.slice(0, 30).padEnd(30)}  arms ${armD.toFixed(4)}  up ${upMin.toFixed(3)}-${upMax.toFixed(3)} (n ${nArms})  slide ${slide.toFixed(2)}`);
    }
    for (const name of ["DUCK", "WALK IN + STOP"]) { // per-frame feet of the two cells that slid
      const c = [...ACT, ...ACT2].find((q) => q.label.startsWith(name))!; let line = name + ": ";
      const prevs: Record<number, P2> = {};
      for (let fr = 18; fr <= 50; fr++) {
        PPL.probe.on = true; PPL.probe.arms = []; PPL.probe.feet = [];
        og.setTransform(c.k, 0, 0, c.k, c.foot[0] - 300 * c.k, c.foot[1] - 975 * c.k); c.draw(new Pen(og), fr); PPL.probe.on = false;
        const lo = PPL.probe.feet.length === 2 ? (PPL.probe.feet[0].heel[1] > PPL.probe.feet[1].heel[1] ? PPL.probe.feet[0] : PPL.probe.feet[1]) : null;
        if (lo) { const pv = prevs[lo.lr]; line += `${fr}:${lo.lr > 0 ? "R" : "L"}${pv ? (lo.heel[0] - pv[0]).toFixed(1) : "-"}/${lo.heel[1].toFixed(0)} `; prevs[lo.lr] = lo.heel; prevs[-lo.lr] = undefined as unknown as P2; }
        if (line.length > 120) { rows.push(line); line = "   "; }
      }
      rows.push(line);
    }
    rows.push("", "SPIN (spinAt f0 26): f: angle view facing sq smear");
    for (let fr = 18; fr <= 46; fr++) { const s = PPL.spinAt(fr, 26); rows.push(`  f${fr}: ${s.angle.toFixed(0).padStart(4)} ${s.view} ${String(s.facing).padStart(2)} sq ${(s.sq ?? 1).toFixed(2)} smear ${(s.smear ?? 0).toFixed(2)}`); }
    g.fillStyle = "#f4f0e6"; g.font = "15px Consolas, monospace"; rows.forEach((r, i) => g.fillText(r, 16, 30 + i * 19.5));
    return;
  }
  if (page === "mid") { // medium-shot scale (a figure ~45 % of the frame): the wave, the point and the thumbs-up as the shots will frame them
    const cells: Cell[] = [
      { label: "MEDIUM: clown wave", k: 0.95, clown: true, foot: [270, 1260], draw: (p) => { const w = PPL.waveArm(30, 22, 1); PPL.drawClown(p, clownP({ s: 0.25, c: 0.96, spin: 0.5, armR: w.arm, headTilt: w.headTilt, tilt: w.tilt, armL: { fk: [70, 80], hand: "open" } })); } },
      { label: "MEDIUM: point + thumbs-up", k: 1.0, foot: [270, 1260], draw: (p) => PPL.drawInterviewer(p, 0, { light: L, expr: "asking", armL: PPL.thumbsUp(40, 20), armR: PPL.pointArm(40, 20, [700, 300]) }) },
    ];
    grid(cells, 2, 1, f, g, 0.5); return;
  }
};

export const Bench: React.FC<{ page: string }> = ({ page }) => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("bench"));
  useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); PAGE(g, page, f); continueRender(h); }, [f, page, h]);
  return <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} />;
};
void (null as unknown as Arm);

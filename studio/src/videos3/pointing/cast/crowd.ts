// THE CROWDS (owner CAST): Tokyo commuters (the strap pose, the shared train sway, the sleeping salaryman, the giggling
// students, the grandma with her furoshiki, the mum with the stroller, the late salaryman on the platform) and New York
// riders (the watch-tapper), all on the kit's crowd() (one atlas, one instanced draw, far LOD). Pure in t.
import type { KitCtx, V3, Built } from "../../../kit/core/ctx";
import { crowd } from "../../../kit/cards/crowd";
import type { CardDrawInfo } from "../../../kit/cards/card";
import { Pen, mix, rrect, type P2 } from "../../../videos/clown/toon";
import * as PPL from "../../../videos/clown/cast_people";
import type { Arm } from "../../../videos/clown/cast_people";
import { drawWho, nativeCrown, SPECS, SU, type CPose, type Who } from "./people";
import { wordF, wordEnd } from "./timing";
import { CAST_LOOK, CAST_SKIN } from "./member";
import { EV } from "../timeline";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
const TAU = Math.PI * 2;

// ---------------- THE TRAIN'S ROCK (one shared signal; TRAIN swings the straps with it)
// The run windows come from THE FILM'S CLOCK (timeline.ts EV; request C-1): the train runs from the film's start to
// station A (it brakes from EV.brake and stands at EV.stopA), leaves on EV.glideA, runs through s10, stands at station B
// from EV.arriveB, and leaves again on EV.glideB. Nothing here is a typed second.
/** how hard the train rocks (1 running at speed .. 0 standing at a platform) */
export const rockAmp = (t: number) => {
  if (t < EV.brake) return 1;
  if (t < EV.stopA) return 1 - sm((t - EV.brake) / Math.max(0.2, EV.stopA - EV.brake));
  if (t < EV.glideA) return 0;
  const up = sm((t - EV.glideA) / 2.2), slow = EV.arriveB - 1.6;
  if (t < slow) return up;
  if (t < EV.arriveB) return up * (1 - sm((t - slow) / 1.6));
  if (t < EV.glideB) return 0;
  return sm((t - EV.glideB) / 2.2);
};
/** THE car's rock at film time t: roll (deg, + = toward +X) and lateral shift (m, along +X). Pure */
export const trainRock = (t: number) => {
  const a = rockAmp(t);
  const roll = a * (1.5 * Math.sin(TAU * t / 2.3) + 0.6 * Math.sin(TAU * t / 0.87 + 1.1) + 0.45 * Math.sin(TAU * t / 5.3 + 2.0));
  const lat = a * (0.018 * Math.sin(TAU * t / 2.3 - 0.5) + 0.006 * Math.sin(TAU * t / 1.13 + 0.4));
  return { roll, lat };
};
/** the rock as felt by someone (or a strap) `lag` seconds behind */
export const rockLag = (t: number, lag = 0.12) => trainRock(t - lag);

// ---------------- members
export type CrowdMemberSpec = {
  id: Who;
  /** ground point (or a path); lateSalary: the point where he STOPS (he jogs in along his yaw) */
  pos: V3 | ((t: number) => V3);
  /** the way the body faces (world yaw); default: faces the lens */
  yaw?: number | ((t: number) => number);
  /** one hand up on a strap (the ring above the shoulder) */
  strap?: boolean;
  /** seated (seat height m; true = 0.45) */
  seated?: boolean | number;
  seed?: number;
  /** the axis the train's sway pushes along (default +X) */
  swayAxis?: [number, number];
};
const W = (k: string) => wordF(k);
/** the frame the late salaryman stops short: the door leaves have just met in front of him (the plant, EV.doorsMeetA) */
const LATE_F = () => EV.doorsMeetA * 30 - 4;

/** the pose of a crowd member at film time t */
export const crowdPose = (m: CrowdMemberSpec, t: number, info: CardDrawInfo, sway: boolean): CPose => {
  const f = t * 30, seed = m.seed ?? SPECS[m.id].seed, L = PPL.holdLife(f, seed, 0.7);
  const seat = m.seated === true ? 0.45 : typeof m.seated === "number" ? m.seated : undefined;
  const lag = 0.06 + 0.12 * PPL.hash(seed, 3), rock = sway ? rockLag(t, lag).roll : 0;
  const base: CPose = { ...L, s: info.s, c: info.c, light: info.lightAng, seed, blink: PPL.blinkAt(f, seed), expr: "polite", seat, tilt: (L.tilt ?? 0) * 0.5 + rock * 1.3 * (seat ? 0.4 : 1), shift: seat ? 0 : L.shift };
  const strapArm: Arm = { to: "raise", dy: -14 + 2 * Math.sin(TAU * (t / 2.3) - lag), hand: "grip", hs: 1.1 };
  const back = info.c < -0.35;
  const arms = (right: Arm | null, left: Arm | null) => PPL.bodyArms(back, right, left);
  switch (m.id) {
    case "salarySleep": { // asleep at a strap: a slow head bob; on "thousand" the chin drops, he jerks awake, blinks, nods off
      const ft = W("thousand"), drop = sm((f - ft + 10) / 10) * (1 - sm((f - ft) / 4)), awake = PPL.bump(f, ft + 2, 3, 22);
      return { ...base, expr: awake > 0.3 ? "blank" : "calm", blink: awake > 0.3 ? 0 : 1, nod: 1.4 + 0.8 * Math.sin(TAU * t / 3.1) + 2.6 * drop - 2.2 * awake, headTilt: 6 + 3 * Math.sin(TAU * t / 3.1), ...arms(strapArm, { to: "hang", hand: "ball" }) };
    }
    case "studentA": case "studentB": { // giggle behind a hand, a glance at each other
      const g = 0.5 + 0.5 * Math.sin(TAU * t / 2.7 + (m.id === "studentB" ? 1.4 : 0)), laugh = g > 0.72;
      const hand: Arm = { to: "hang", to2: "chin", k: laugh ? 1 : 0.15, hand: "flat", hs: 1.1, dy: -6 };
      return { ...base, expr: laugh ? "laughBig" : "polite", look: m.id === "studentA" ? 0.9 : -0.9, ...PPL.laughShake(f, 0, laugh ? 1e9 : -1), ...arms(hand, { to: "strap", hand: "grip" }) };
    }
    case "grandma": { // seated, the indigo furoshiki on her lap: she pats it on "people" and smiles at the baby
      const fp = W("people"), pat = Math.abs(Math.sin((f - fp) * 0.45)) * PPL.bump(f, fp, 3, 24);
      return { ...base, seat: seat ?? 0.45, expr: f > fp ? "warm" : "polite", look: 0.8, lookY: 0.2, ...arms({ to: "belly", hand: "flat", hs: 1.1, dy: -8 * pat }, { to: "belly", hand: "ball", hs: 1.1, dx: 4 }) };
    }
    case "mumStroller": return { ...base, expr: "polite", lookY: 0.6, ...arms({ to: "low", hand: "grip", hs: 1.1, dx: 8 }, { to: "low", hand: "grip", hs: 1.1, dx: 8 }) };
    case "officeRead": return { ...base, expr: "readLow", lookY: 0.9, ...arms({ to: "chest", hand: "grip", prop: { k: "book", col: "#c8b48a" }, hs: 1.1 }, strapArm) };
    case "officePhone": return { ...base, expr: "gazeFocus", lookY: 1, ...arms({ to: "chest", to2: [300, 450], k: 1, hand: "grip", prop: { k: "phone", col: "#36b0ff" }, hs: 1.1 }, strapArm) };
    case "officeMask": return { ...base, mask: true, expr: "calm", ...arms(strapArm, { to: "hang", hand: "ball" }) };
    case "lateSalary": { // jogs in, stops short as the doors shut ("closed!"), sighs, straightens his tie, checks his watch
      const fs = LATE_F(), sw = PPL.stopWalk(f, fs, "jog");
      const tie = PPL.gestureBack(f, fs + 14, fs + 34), watch = PPL.gestureBack(f, fs + 38, fs + 70);
      const st = PPL.stopAt(f, fs);
      return { ...base, walk: sw.walk, go: sw.go, gait: "jog", feet: sw.feet, tilt: st.tilt * (info.s >= 0 ? 1 : -1), expr: PPL.faceAt(f, [[0, "focusB"], [fs + 6, "sigh"]], 12).expr, lookY: watch > 0.5 ? 1 : 0,
        ...arms({ to: "hang", to2: "chest", k: tie, hand: "pinch", hs: 1.1 }, { to: "hang", to2: "chest", k: watch, hand: "ball", hs: 1.1, dy: -4 }), hold: watch > 0.4 ? [{ k: "watch", side: back ? 1 : -1 }] : undefined };
    }
    case "watchTapper": { // taps her wristwatch twice 6 f after "doors." (s13), brows up
      const fd = W("doors#4") + 6, tap = Math.abs(Math.sin((f - fd) * 0.6)) * PPL.bump(f, fd, 3, 22), up = PPL.gestureBack(f, fd - 8, fd + 36);
      return { ...base, expr: f > fd - 4 ? "asking" : "deadpan", ...arms({ to: "hang", to2: "chest", k: up, hand: "point", hs: 1.2, dy: -5 * tap }, { to: "hang", to2: "chest", k: up, hand: "ball", hs: 1.2, dx: 10 }), hold: up > 0.5 ? [{ k: "watch", side: back ? 1 : -1 }] : undefined };
    }
    case "nyLeaver": return { ...base, walk: PPL.walkInPlace(f, "walk"), go: 1, expr: "deadpan" };
    default: return { ...base, ...(m.strap ? arms(strapArm, { to: "hang", hand: "ball" }) : {}) };
  }
};

/** the stroller beside the mum (on her card, drawn first): a pram body, a canopy, wheels, a baby hand that waves */
const drawStroller = (p: Pen, side: number, t: number) => {
  const x = 300 + side * 150, y = 975;
  p.poly(rrect(x - 70, y - 300, x + 70, y - 150, 30), "#7a8aa0", 5);
  const can: P2[] = []; for (let i = 0; i <= 14; i++) { const a = Math.PI + (Math.PI * i) / 14 * 0.8; can.push([x - side * 10 + 80 * Math.cos(a) * side, y - 290 + 80 * Math.sin(a)]); }
  p.poly([...can, [x + side * 40, y - 290]], "#5d6f86", 5);
  p.stroke([[x - side * 70, y - 290], [x - side * 120, y - 380]], 7, "#3a3f4c");
  for (const k of [-1, 1]) { p.ell(x + k * 50, y - 30, 30, 30, "#2a2d36", 5); p.ell(x + k * 50, y - 30, 12, 12, "#9aa6b4", 3); }
  p.stroke([[x - 50, y - 60], [x, y - 150], [x + 50, y - 60]], 5, "#3a3f4c");
  const wv = Math.sin(t * 7) * 18; // the baby's hand waves over the rim
  p.ell(x + side * 20 + wv, y - 318, 13, 15, "#f8f3ee", 4);
  p.stroke([[x + side * 20 + wv * 0.4, y - 300], [x + side * 20 + wv, y - 312]], 9, mix("#f2b8c8", "#2c1e2a", 0.1));
};

/** a CROWD of our cast members: one atlas, one draw. `sway` = the train rocks them (car interior) */
export const crowdCast = async (ctx: KitCtx, members: CrowdMemberSpec[], o: { sway?: boolean; cellPx?: number; fps?: number } = {}): Promise<Built> => {
  const sway = !!o.sway;
  return crowd(ctx, {
    cellPx: o.cellPx ?? 260, fps: o.fps ?? 30, look: CAST_LOOK,       // the same card light + lit skin as the heroes (member.ts)
    members: members.map((m, i) => {
      const k = SPECS[m.id].crownM / nativeCrown(SPECS[m.id].fit), canvasM = 1000 * SU * k;
      const p0 = typeof m.pos === "function" ? m.pos : () => m.pos as V3;
      const yawF = m.yaw === undefined ? undefined : typeof m.yaw === "function" ? m.yaw : () => m.yaw as number;
      const ax = m.swayAxis ?? [1, 0], lag = 0.06 + 0.12 * PPL.hash(m.seed ?? SPECS[m.id].seed, 3);
      let pos = (t: number): V3 => { const q = p0(t), l = sway ? rockLag(t, lag).lat * (m.seated ? 0.3 : 1) : 0; return [q[0] + ax[0] * l, q[1], q[2] + ax[1] * l]; };
      if (m.id === "lateSalary") { const stopP = p0(0), yw = yawF ? yawF(0) : 0, fs = LATE_F(); pos = (t) => { const mm = PPL.stopWalk(t * 30, fs, "jog").metres; return [stopP[0] + Math.sin(yw) * mm, stopP[1], stopP[2] + Math.cos(yw) * mm]; }; }
      const poseOf = (t: number, info: CardDrawInfo) => crowdPose(m, t, info, sway);
      return {
        canvasM, pos, yaw: yawF,
        key: (t: number, info: CardDrawInfo) => JSON.stringify(poseOf(t, info)) + (m.id === "mumStroller" ? Math.round(t * 15) : ""),
        draw: (c2d: CanvasRenderingContext2D, t: number, w: number, h: number, info: CardDrawInfo) => {
          c2d.save(); c2d.scale(w / 600, h / 1000); const p = new Pen(c2d);
          if (m.id === "mumStroller") drawStroller(p, info.s >= 0 ? 1 : -1, t);
          drawWho(p, m.id, { ...poseOf(t, info), skin: CAST_SKIN }); c2d.restore(); void i;
        },
      };
    }),
  });
};
/** the Tokyo crowd (car / platform) */
export const crowdJP = (ctx: KitCtx, members: CrowdMemberSpec[], o: { sway?: boolean; cellPx?: number } = {}) => crowdCast(ctx, members, o);
/** the New York riders */
export const crowdNY = (ctx: KitCtx, members: CrowdMemberSpec[], o: { cellPx?: number } = {}) => crowdCast(ctx, members, { ...o, sway: false });
void wordEnd;

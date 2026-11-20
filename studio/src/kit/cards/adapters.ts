// KIT / CARDS: adapters that turn the studio's existing cast (the clown film's drawing code, imported READ-ONLY) into
// lit cards (owner CARDS). See NOTES.md, "Adapters".
//
//   const guy = await castCard(ctx, { who: "phoneGuy", pos, pose: (t, i) => ({ ...walkPose(t, i), armR: PPL.phoneArm(PPL.C.phoneRed) }) });
//   const kid = await castCard(ctx, { who: "crowd:skater", pos, pose: (t, i) => crowdPose("skater", t, i) });
//
// Every person keeps its designed height on the cast's scale (1 design unit = 2.16 mm, soles at y 975): small builds
// ~1.45 m, standard ~1.52 m, tall ~1.57 m to the crown (LESSONS.md 52). crownM rescales a figure to another height.
import type { KitCtx, V3 } from "../core/ctx";
import { Pen } from "../../videos/clown/toon";
import * as PPL from "../../videos/clown/cast_people";
import * as CROWD from "../../videos/clown/cast_crowd";
import * as FX from "../../videos/clown/cast_fx";
import * as FIT from "../../videos/clown/cast_fits";
import { card, type CardBuilt, type CardDrawInfo, type CardOpts } from "./card";

export const SU = 0.00216;          // metres per cast design unit (cast.ts SU)
const UM = 1 / SU;

/** every drawable of the cast */
export const PEOPLE = {
  hero: { draw: PPL.drawHero, fit: FIT.HERO }, phoneGuy: { draw: PPL.drawPhoneGuy, fit: FIT.PHONE_GUY }, white: { draw: PPL.drawWhite, fit: FIT.WHITE },
  blue: { draw: PPL.drawBlue, fit: FIT.BLUE }, pink: { draw: PPL.drawPink, fit: FIT.PINK }, prof: { draw: PPL.drawProf, fit: FIT.PROF },
  student: { draw: PPL.drawStudent, fit: FIT.STUDENT }, ask0: { draw: (p: Pen, P: PPL.Pose) => PPL.drawInterviewer(p, 0, P), fit: FIT.ASK_A },
  ask1: { draw: (p: Pen, P: PPL.Pose) => PPL.drawInterviewer(p, 1, P), fit: FIT.ASK_B }, dude: { draw: PPL.drawDude, fit: FIT.DUDE },
  friend0: { draw: (p: Pen, P: PPL.Pose) => PPL.drawFriend(p, 0, P), fit: FIT.FRIEND_A }, friend1: { draw: (p: Pen, P: PPL.Pose) => PPL.drawFriend(p, 1, P), fit: FIT.FRIEND_B },
  mum: { draw: PPL.drawMum, fit: FIT.MUM }, m1: { draw: PPL.drawM1, fit: FIT.M1 }, m2: { draw: PPL.drawM2, fit: FIT.M2 },
  coffee: { draw: PPL.drawCoffee, fit: FIT.COFFEE }, book: { draw: PPL.drawBook, fit: FIT.BOOK },
} as const;
export type PersonId = keyof typeof PEOPLE;
export type CastWho = PersonId | "clown" | "pigeon" | `crowd:${CROWD.CrowdId}`;

/** the crown height (m above the soles) of a cast figure in its neutral standing pose, on the cast's own scale */
export const nativeCrownM = (who: CastWho): number => {
  if (who === "clown") return 2.08;
  if (who === "pigeon") return 0.3;
  const fit = who.startsWith("crowd:") ? CROWD.CROWD[who.slice(6) as CROWD.CrowdId].o : PEOPLE[who as PersonId].fit;
  const A = PPL.figAnchors(fit, { s: 0, c: 1, go: 0 });
  return (975 - A.crown[1]) * SU;
};

/** the sole-to-crown heights of every person (for NOTES / checks) */
export const castHeights = () => Object.fromEntries((Object.keys(PEOPLE) as PersonId[]).map((k) => [k, +nativeCrownM(k).toFixed(3)]));

/** a draw callback for card(): sets the 600 x 1000 design space on the canvas and calls the cast's own draw function */
export const castDraw = <P>(fn: (p: Pen, P: P) => void, pose: (t: number, info: CardDrawInfo) => P) =>
  (c2d: CanvasRenderingContext2D, t: number, w: number, h: number, info: CardDrawInfo) => {
    c2d.setTransform(w / 600, 0, 0, h / 1000, 0, 0);
    fn(new Pen(c2d), pose(t, info));
  };

/** the default pose fields every cast card gets from the card's own geometry (heading vs lens, the key light's angle) */
export const autoPose = (info: CardDrawInfo): Pick<PPL.Pose, "s" | "c" | "light"> => ({ s: info.s, c: info.c, light: info.lightAng });

/** a stable redraw key for a pose (cards redraw only when it changes) */
export const poseKey = (P: unknown) => JSON.stringify(P);

export type CastCardOpts = Omit<CardOpts, "draw" | "heightM" | "px"> & {
  who: CastWho;
  /** the pose at time t (s, c, light are filled from the card's geometry unless you set them) */
  pose: (t: number, info: CardDrawInfo) => PPL.Pose | PPL.ClownPose | FX.PigeonSt | CROWD.CrowdPose;
  /** canvas height in px (default 1500 = 1.5 px per design unit, the pilot's hero) */
  px?: number;
  /** rescale the figure to this crown height (m); default its native rig height */
  crownM?: number;
};

/** ANY cast member as a lit card */
export const castCard = async (ctx: KitCtx, o: CastCardOpts): Promise<CardBuilt> => {
  const who = o.who, px = o.px ?? 1500;
  const k = o.crownM ? o.crownM / nativeCrownM(who) : 1;
  let fn: (p: Pen, P: never) => void;
  let canvasM = 1000 * SU * k;
  if (who === "clown") { fn = PPL.drawClown as never; canvasM = (1000 * SU * k) / PPL.CLOWN_K; }
  else if (who === "pigeon") { fn = FX.drawPigeon as never; canvasM = 1000 * SU * 0.34 * k; }
  else if (who.startsWith("crowd:")) { const id = who.slice(6) as CROWD.CrowdId; fn = ((p: Pen, P: CROWD.CrowdPose) => CROWD.drawCrowd(p, id, P)) as never; }
  else fn = PEOPLE[who as PersonId].draw as never;
  const isPerson = who !== "pigeon";
  const poseOf = (t: number, info: CardDrawInfo) => {
    const P = o.pose(t, info) as PPL.Pose;
    return isPerson ? { ...autoPose(info), ...P } : P;
  };
  return card(ctx, {
    ...o, px, canvasM, heightM: canvasM, aspect: 0.6, soleY: 0.975,
    draw: castDraw(fn as (p: Pen, P: unknown) => void, poseOf),
    key: o.key ?? ((t, info) => poseKey(poseOf(t, info))),
    feet: o.feet ?? (isPerson && who !== "clown" ? (t, info) => PPL.feetOf(poseOf(t, info)).map((f) => ({ fwd: f.fwd * k, lat: f.lat * k, lift: f.lift })) : undefined),
    name: o.name ?? who,
  });
};

// ---------------------------------------------------------------- pose helpers for kit films
/** a walker's pose: walk phase from the metres walked (no foot slide), blinks, chatting on the phone, the free hand */
export const phoneWalkPose = (t: number, metres: number, seed = 5, phoneCol: string = PPL.C.phoneRed): PPL.Pose => {
  const f = t * 30, ch = PPL.phoneChat(f, seed);
  return { walk: PPL.walkPhase(metres, "phone"), go: 1, gait: "phone", expr: ch.laughing ? "laughBig" : "bright", mouth: ch.mouth, nod: ch.nod,
    blink: PPL.blinkAt(f, seed), look: 0.15 * Math.sin(t * 0.8), lookY: 0.05, seed: 1, handK: 1.05, armR: PPL.phoneArm(phoneCol), armL: PPL.talkHand(f, seed, ch.talking) };
};
/** a standing person's moving hold */
export const holdPose = (t: number, seed = 3, amt = 1): PPL.Pose => ({ go: 0, expr: "bright", seed: (seed % 9) + 1, ...PPL.holdLife(t * 30, seed, amt) });
/** a crowd extra's ready pose (metres walked drives the gait) */
export const crowdPoseAt = (id: CROWD.CrowdId, t: number, info: CardDrawInfo, metres?: number, seed?: number): CROWD.CrowdPose =>
  CROWD.crowdPose(id, t * 30, { s: info.s, c: info.c, metres, light: info.lightAng, seed });

/** metres walked along a sampled path by time t (for walkPhase when the path is not straight) */
export const pathMetres = (pos: (t: number) => V3, t: number, t0 = 0, dt = 1 / 60) => {
  let m = 0, a = pos(t0);
  for (let s = t0 + dt; s <= t + 1e-9; s += dt) { const b = pos(s); m += Math.hypot(b[0] - a[0], b[2] - a[2]); a = b; }
  return m;
};

// THE CARD WRAPPER (owner CAST): any character as a lit kit card, its pose from an actor (no shot table here: safe to
// import from benches without the film's shots -> cams -> sets cycle). cast.ts castMember() = this + the film's script.
import * as THREE from "three";
import type { KitCtx, V3 } from "../../../kit/core/ctx";
import { card, type CardBuilt, type CardDrawInfo } from "../../../kit/cards/card";
import type { CardLook } from "../../../kit/cards/cardlight";
import type { FootGrassOpts } from "../../../kit/cards/grass";
import { Pen, rig, type P2 } from "../../../videos/clown/toon";
import * as PPL from "../../../videos/clown/cast_people";
import { drawWho, anchorsOf, nativeCrown, lastHands, SPECS, SU, type CPose, type Who } from "./people";
import { getInputProps } from "remotion";
import type { ActEnv, Actor } from "./gesture";

const feetOfPose = (P: CPose) => PPL.feetOf(P);
/** the film frame a (sub-frame) time belongs to, as a time: the drawing changes once per frame */
const frameT = (t: number) => Math.round(t * 30) / 30;
const idle = (seed: number): Actor => (e) => ({ ...PPL.holdLife(e.f, seed, 0.8), blink: PPL.blinkAt(e.f, seed), expr: "polite", seat: e.seat });

export type CastOpts = {
  /** the ground point under the feet (seated: the floor under the seat's front edge), metres; a function of film time */
  pos: (t: number) => V3;
  /** the way the BODY faces (world yaw = atan2(dx, dz)); default: square to the lens */
  yaw?: (t: number) => number;
  /** the world point the character points at / looks at in this shot (signal, dial, lamp, board, bag, machine...) */
  aim?: (t: number) => V3 | null;
  /** eyes only (default = aim) */
  look?: (t: number) => V3 | null;
  /** world points for the resting hands (the driver's T-handle, a pole, the glass): the figure's LEFT / RIGHT hand */
  restL?: (t: number) => V3 | null;
  restR?: (t: number) => V3 | null;
  /** seated on a seat of this height (true = 0.47 m) */
  seated?: boolean | number;
  /** edit the automatic pose / replace the acting entirely */
  act?: (t: number, P: CPose) => CPose;
  pose?: (t: number, info: CardDrawInfo) => CPose;
  /** force a true profile (+1 facing screen right / -1 left / 0 never) */
  profile?: 1 | -1 | 0;
  /** nothing below this design y (0..1000) is drawn (the conductor behind his window sill) */
  cutY?: number;
  /** the kid: cheek + nose flattened on the glass (0..1) */
  glassPress?: number;
  px?: number; crownM?: number; lodM?: number; shadow?: boolean; onGrass?: boolean | FootGrassOpts; cardLook?: Partial<CardLook>; name?: string;
  /** the skin colour the card draws with (default CAST_SKIN: see there) */
  skin?: string;
  /** false = never draw the on-card hand that points at the lens (a foreground lensGlove card plays it: frame 0) */
  lensHand?: boolean;
};

/** THE CAST'S CARD LIGHT (over the cards kit's default): the golden rig's sun is orange and its grade doubles the
 *  saturation, so a pale cartoon face lit mostly by the sun goes TAN. More of the (nearly untinted) fill, less of the
 *  key, a brighter card and a higher floor keep faces the light tone of the sheet and alike between characters, in sun
 *  and in shade; the sun still models the form and the rim. Chosen side by side on the bench (PROPS look test) */
// LOOK TEST 2026-11-20 (was { gain: 0.68, keyK: 0.6, tintK: 0.22, floorK: 0.5, floorBackK: 0.7, ceilK: 1.5 }: flat,
// grey-beige faces that sat ON the light, not in it): a brighter card, more sun key (form + a real terminator), a clear
// rim on the sun side, a deeper floor (shade side reads), a little sky-blue fill colour in the shade
export const CAST_LOOK: Partial<CardLook> = { gain: 0.8, keyK: 0.85, form: 1.2, wrap: 0.3, tintK: 0.3, floorK: 0.4, floorBackK: 0.6, ceilK: 1.6, rim: 1.7, rimPx: 4.4, shadeSat: 0.45 };
/** THE LIT SKIN: what the cards draw skin with (CPose.skin). A little cooler than the sheet's off-white (#f8f3ee), so the
 *  warm key + the golden grade land it on a light cream instead of tan. The sheet keeps the house colour */
// Measured on the bench (golden rig, sun 24 deg, draft, 2026-11-19 21:35), the brightest skin patch of the same tourist:
//   cards-kit default look + #f8f3ee -> (208,164,126) tan;  CAST_LOOK + #f8f3ee -> (225,191,153);
//   CAST_LOOK gain 0.66 + #eef3fb -> (229,204,174) light cream;  gain 0.70 + #e4eefc -> (226,205,178)
export const CAST_SKIN = "#f7f5f3";   // LOOK TEST 2026-11-20: near-white light skin (the vivid rig's golden sun warms it; #fdf2e6 went peach) (was #eef3fb, cooled for warmth 0.8-1.3)
/** THE DRIVER in his cab (s03 / s03b / s06 / s21; the lead, Block 13: "flat and beige" on the one golden close-up of the
 *  title's subject): more of the windscreen sun's key, a crisp warm rim on the cap edge, cheek and glove, rounder form */
// LOOK TEST 2026-11-20: + gain 0.66 (with the brighter CAST_LOOK gain 0.8 his close-up face blew out to flat cream)
export const DRIVER_LOOK: Partial<CardLook> = { gain: 0.66, keyK: 0.95, rim: 1.8, rimPx: 4.8, form: 1.15, floorK: 0.42 };
/** THE LIT WHITE of the driver's gloves (and the frame-0 glove card): a shade cooler still, so under the golden sun the
 *  gloves stay the WHITEST thing on him (a pure #ffffff glove comes out warmer than the cooled skin) */
export const CAST_WHITE = "#c9dcff";      // the driver's GLOVE white. Measured in the cab (C-4): the light there is R/B 1.29 warm and the grade
// doubles the saturation, so #e4edff and #dbe7ff both landed on the skin's cream. This lands near neutral in the cab and a
// little cool elsewhere: a cool white reads as a glove, a cream one reads as a bare hand
const camP = new THREE.Vector3();
/** a world point -> the card's own drawing space (design units), along the ray from the lens (null: behind the lens) */
export const worldToCard = (T: V3, info: CardDrawInfo, k: number): P2 | null => {
  info.cam.updateMatrixWorld(); camP.setFromMatrixPosition(info.cam.matrixWorld);
  const P = info.pos, fy = Math.atan2(camP.x - P[0], camP.z - P[2]), nx = Math.sin(fy), nz = Math.cos(fy), rx = Math.cos(fy), rz = -Math.sin(fy);
  const den = nx * (T[0] - camP.x) + nz * (T[2] - camP.z), num = nx * (P[0] - camP.x) + nz * (P[2] - camP.z);
  if (Math.abs(den) < 1e-6) return null;
  const lam = num / den; if (lam <= 0) return null;
  const qx = camP.x + lam * (T[0] - camP.x), qy = camP.y + lam * (T[1] - camP.y), qz = camP.z + lam * (T[2] - camP.z);
  const lx = (qx - P[0]) * rx + (qz - P[2]) * rz, ly = qy - P[1];
  return [300 + lx / (SU * k), 975 - ly / (SU * k)];
};

/** WHERE AN ARM AIMED AT A WORLD POINT GOES ON THE CARD. When the lens can see the target through the card's plane
 *  (worldToCard), that point: the finger lands on the target on screen. Otherwise (the target is behind the lens, or
 *  far off to the side of a card seen side-on: the signal 60 m ahead of a driver filmed in true profile) the arm's TRUE
 *  3D direction from the shoulder, flattened onto the card: a target along the card = a full straight arm, a target
 *  toward / away from the lens = a short foreshortened one. Never "nowhere" */
export const aimToCard = (T: V3, info: CardDrawInfo, k: number, chest: P2, HH: number): P2 | null => {
  const hit = worldToCard(T, info, k);
  if (hit && Math.hypot(hit[0] - 300, hit[1] - 500) < 9000) return hit;
  const P = info.pos, fy = Math.atan2(camP.x - P[0], camP.z - P[2]), rx = Math.cos(fy), rz = -Math.sin(fy);
  const S: P2 = [chest[0], chest[1] - 0.28 * HH], sx = (S[0] - 300) * SU * k, sy = (975 - S[1]) * SU * k;
  const vx = T[0] - (P[0] + sx * rx), vy = T[1] - (P[1] + sy), vz = T[2] - (P[2] + sx * rz), n = Math.hypot(vx, vy, vz);
  if (n < 0.05) return null;
  const reach = 1.25 * 0.888 * HH;
  return [S[0] + reach * ((vx * rx + vz * rz) / n), S[1] - reach * (vy / n)];
};

/** 0..1: how much a world point lies TOWARD THE LENS as seen from the figure's shoulder (1 = it is the camera, or
 *  straight past it): the arm then points out of the picture at us */
export const lensShare = (T: V3, info: CardDrawInfo, k: number, chest: P2, HH: number): number => {
  info.cam.updateMatrixWorld(); camP.setFromMatrixPosition(info.cam.matrixWorld);
  const P = info.pos, fy = Math.atan2(camP.x - P[0], camP.z - P[2]), rx = Math.cos(fy), rz = -Math.sin(fy);
  const sx = (chest[0] - 300) * SU * k, sy = (975 - (chest[1] - 0.28 * HH)) * SU * k, ox = P[0] + sx * rx, oy = P[1] + sy, oz = P[2] + sx * rz;
  const vx = T[0] - ox, vy = T[1] - oy, vz = T[2] - oz, cx = camP.x - ox, cy = camP.y - oy, cz = camP.z - oz;
  const n = Math.hypot(vx, vy, vz) * Math.hypot(cx, cy, cz);
  return n < 1e-6 ? 0 : Math.max(0, (vx * cx + vy * cy + vz * cz) / n);
};
/** WHERE THE EYES GO for a world point: the point on the card when the lens sees it through the card's plane; else the
 *  side-on direction (far away along it), or straight into the lens when the target is toward / past the lens */
export const lookToCard = (T: V3, info: CardDrawInfo, k: number, head: P2): P2 => {
  const hit = worldToCard(T, info, k);
  if (hit && Math.hypot(hit[0] - 300, hit[1] - 500) < 9000) return hit;
  const P = info.pos, fy = Math.atan2(camP.x - P[0], camP.z - P[2]), rx = Math.cos(fy), rz = -Math.sin(fy);
  const hx = (head[0] - 300) * SU * k, hy = (975 - head[1]) * SU * k;
  const vx = T[0] - (P[0] + hx * rx), vy = T[1] - (P[1] + hy), vz = T[2] - (P[2] + hx * rz), n = Math.hypot(vx, vy, vz) || 1;
  const ux = (vx * rx + vz * rz) / n, uy = vy / n;
  return Math.hypot(ux, uy) > 0.25 ? [head[0] + 4000 * ux, head[1] - 4000 * uy] : [head[0], head[1]];
};

/** a character as a lit card driven by `actor` (cast.ts castMember passes the film's script; benches pass their own) */
export const castCardOf = async (ctx: KitCtx, who: Who, o: CastOpts, actor?: Actor): Promise<CardBuilt> => {
  const S = SPECS[who], crown = o.crownM ?? S.crownM, k = crown / nativeCrown(S.fit), canvasM = 1000 * SU * k;
  const act = actor ?? idle(S.seed);
  const R0 = rig(S.fit, { seed: S.seed }), shX = 0.8 * R0.T.a, HH = R0.HH;
  const seat = o.seated === true ? 0.47 : typeof o.seated === "number" ? o.seated : undefined;
  let memoT = NaN, memoS = NaN, memoC = NaN, memoP: CPose | null = null;
  const poseOf = (t: number, info: CardDrawInfo): CPose => {
    // ONE pose per film frame: the first sub-frame's pose is kept for the frame's other sub-frames (the lens drifts a
    // hair inside the shutter: s, c and the aim's place on the card would change the pose JSON, i.e. force a canvas
    // redraw on every sub-frame). A really different view at the same time (another camera) still gets its own pose
    if (t === memoT && memoP && Math.abs(info.s - memoS) < 0.02 && Math.abs(info.c - memoC) < 0.02) return memoP;
    let P: CPose;
    if (o.pose) P = { s: info.s, c: info.c, light: info.lightAng, ...o.pose(t, info) };
    else {
      const base: CPose = { s: info.s, c: info.c, seat };
      const A = anchorsOf(who, base);
      const aimW = o.aim?.(t) ?? null, lookW = o.look ? o.look(t) : aimW;
      const L = o.restL?.(t) ?? null, R = o.restR?.(t) ?? null;
      const env: ActEnv = { t, f: t * 30, s: info.s, c: info.c, light: info.lightAng, back: info.c < -0.35,
        aim: aimW ? aimToCard(aimW, info, k, A.chest, HH) : null, look: lookW ? lookToCard(lookW, info, k, A.head) : null, head: A.head, r: A.r, u: A.u, chest: A.chest, shX, HH, aimLens: aimW ? lensShare(aimW, info, k, A.chest, HH) : 0,
        restL: L ? worldToCard(L, info, k) : null, restR: R ? worldToCard(R, info, k) : null, seat };
      P = { s: info.s, c: info.c, light: info.lightAng, ...act(env) };
    }
    if (P.skin === undefined) P.skin = o.skin ?? CAST_SKIN;
    if (P.white === undefined) P.white = CAST_WHITE;
    if (o.lensHand === false && P.lensPoint) P.lensPoint = undefined;
    if (o.act) P = o.act(t, P);
    if (o.profile !== undefined) P.profile = o.profile;
    if (o.cutY !== undefined) P.cutY = o.cutY;
    if (o.glassPress !== undefined) P.press = o.glassPress;
    memoT = t; memoS = info.s; memoC = info.c; memoP = P;
    return P;
  };
  // the redraw key: the pose, quantised to the frame (sub-frames inside one frame reuse the drawing: the card's travel
  // stays motion-blurred, the drawing changes at 30 fps; ~8x fewer canvas redraws at final quality).
  // ROUND, never floor: the kit centres its sub-frames on the frame time (t = f +- shutter / 2), so a floor put half
  // of them on the PREVIOUS frame's drawing: every moving pose came out as a double exposure at final quality
  const keyOf = (t: number, info: CardDrawInfo) => JSON.stringify(poseOf(frameT(t), info));
  // (Block 15, s20: the boy's long point at the suitcase ran off his 0.6-wide canvas and was CUT: his canvas is wider; the
  // design space keeps its scale and its centre, only more room at the sides)
  const ASPECT = who === "kid" ? 1.1 : 0.6;
  let logHands: P2[] = [], logHead: [number, number, number] = [300, 300, 60], logArm = false, logDrawn = false;
  const built = await card(ctx, {
    // NO GHOSTS (2026-11-20, look director for the lead): the card's place and turn are read at the FRAME time, like its
    // drawing. Sampled per sub-frame, a fast-moving card plane was smeared across the shutter by the accumulation and read
    // as a see-through double exposure (f131-136, f300-312, f840-850). Characters now get no intra-frame motion (the
    // camera's own motion blur still applies to the whole picture). Was: pos: o.pos, yaw: o.yaw
    px: o.px ?? 1500, heightM: canvasM, canvasM, aspect: ASPECT, soleY: 0.975, pos: (t: number) => o.pos(frameT(t)), yaw: o.yaw ? (t: number) => o.yaw!(frameT(t)) : undefined, face: "camera",
    shadow: o.shadow, onGrass: o.onGrass, lodM: o.lodM, look: { ...CAST_LOOK, ...(who === "driver" ? DRIVER_LOOK : {}), ...(o.cardLook ?? {}) }, name: o.name ?? who,
    key: keyOf,
    draw: (c2d, t, w, h, info) => { c2d.setTransform(h / 1000, 0, 0, h / 1000, (w - 0.6 * h) / 2, 0); const P = poseOf(frameT(t), info); drawWho(new Pen(c2d), who, P);   // design x 300 stays the card centre at any aspect
      if (CAST_LOG_ON) { logDrawn = true; logHands = lastHands().slice(); const A = anchorsOf(who, P); logHead = [A.head[0], A.head[1], A.r]; logArm = armOut(P); } },
    feet: seat !== undefined
      ? () => [{ fwd: 0.45 * k, lat: 0.09 * k, lift: 0 }, { fwd: 0.45 * k, lat: -0.09 * k, lift: 0 }]
      : (t, info) => { const P = poseOf(frameT(t), info); const fo = feetOfPose(P); return fo.map((q) => ({ fwd: q.fwd * k, lat: q.lat * k, lift: q.lift })); },
  });
  if (!CAST_LOG_ON) return built;
  // v4 CAST LOG (the director's gates_v4.py): one row per drawn card per film frame, in 0..1 frame coordinates
  const upd = built.update; let lastF = -1;
  built.update = (t: number, cam: THREE.Camera) => {
    upd?.(t, cam);
    const f = Math.round(t * 30); if (f === lastF || !built.object.visible) return; lastF = f;
    const P = o.pos(frameT(t)); cam.updateMatrixWorld(); camP.setFromMatrixPosition(cam.matrixWorld);
    const fy = Math.atan2(camP.x - P[0], camP.z - P[2]), rx = Math.cos(fy), rz = -Math.sin(fy);
    const proj = (x: number, y: number): [number, number] | null => {
      const v = new THREE.Vector3(P[0] + (x - 300) * SU * k * rx, P[1] + (975 - y) * SU * k, P[2] + (x - 300) * SU * k * rz).project(cam);
      return v.z > 1 ? null : [(v.x + 1) / 2, (1 - v.y) / 2];
    };
    const [hx, hy, hr] = logHead, a = proj(hx - hr, hy - 1.05 * hr), b = proj(hx + hr, hy + 1.05 * hr);
    if (!a || !b || !logDrawn) return;
    if (Math.max(a[0], b[0]) < 0 || Math.min(a[0], b[0]) > 1 || Math.max(a[1], b[1]) < 0 || Math.min(a[1], b[1]) > 1) return;   // off the frame: no row
    const r4 = (n: number) => Math.round(n * 10000) / 10000;
    const row = { f, who, op: 1.0, head: [r4(Math.min(a[0], b[0])), r4(Math.min(a[1], b[1])), r4(Math.max(a[0], b[0])), r4(Math.max(a[1], b[1]))],
      hands: logHands.map(([x, y]) => proj(x, y)).filter((q): q is [number, number] => !!q).map(([x, y]) => [r4(x), r4(y)]), armOut: logArm };
    console.warn("CASTLOG " + JSON.stringify(row));   // (warn: the stills runner and kit_render both pass warnings through)
  };
  return built;
};
/** is an arm OUT (a point / a reach away from the body) in this pose: the gates count these frames */
const armOut = (P: CPose): boolean => [P.armL, P.armR].some((a) => !!a && ((a as { ext?: { k: number } }).ext ? (a as { ext: { k: number } }).ext.k > 0.5 : a.hand === "point" && (a.k ?? 0) > 0.5));
/** the log is on when the render passes inputProps.kit.castlog (kit_render --props '{"castlog":1}' --keep-browser-logs) */
const CAST_LOG_ON: boolean = (() => { try { return typeof window !== "undefined" && !!(getInputProps() as { kit?: { castlog?: unknown } }).kit?.castlog; } catch { return false; } })();


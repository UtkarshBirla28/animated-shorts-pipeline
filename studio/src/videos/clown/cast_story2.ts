// STAGE MODULE (REBUILD v2), owner ANIMATOR C: S12 (the clipboard 1 in 4 + the interviewer's eyebrows), S13 (the spin),
// S14 (the headphone dude + the clown waving), S15 (the hero, her mind into the call bubble), S16 (Hyman tiptoes), S17 (the
// peg), S18 (the limbo), S19 (the stopper + the A-frame board), S20 (SLOW MOTION: f arrives on S20's own picture clock).
// cast.ts calls stageStory2(E, out, cam, id, f, R): id = the shot, f = ITS picture time. Everything is keyed to BEAT words
// and shot spans (never literal frames), so a new voice re-times it. Helpers: cast_story2_kit.ts. Sound cues of these
// actions: story2Cues() (dumped to out/clown/anim_story2/sound_cues.json).
import type { Eng, Stage, CamInfo, StageInfo } from "./cast";
import type { Pen, P2, Expr, MouthK, PersonOpts } from "./toon";
import { rig, star4 } from "./toon";
import * as PPL from "./cast_people";
import type { Pose, Arm, ClownPose } from "./cast_people";
import * as FIT from "./cast_fits";
import * as FX from "./cast_fx";
import * as VFX from "./cast_vfx";
import * as CROWD from "./cast_crowd";
import { BEAT, SID, SHOTS, hasLine } from "./beats";
import { SQ, STUDY, STORY, WHEEL_R, billSway, type V3 } from "./plan";
import { pt } from "./remap";
import { S12_MARKS } from "./cams_v2";
import { billKick, billKickAt } from "./square_tree";
import * as MK2 from "./cast_story2_marks";
import * as K from "./cast_story2_kit";

const { ramp, hold, bumpN, clamp, sm, up, lerp3, add3, headingOf, turnH, TAU } = K;
const SH = (k: string) => SHOTS[SID[k] - 1];
const C = PPL.C;
/** the hero's / the professor's / ... card seeds: none (= the design sheet's heads, identical in every section) */
/** a point of bill i in the world WITH this frame's sway + kick (lx along its width from the peg, ly down from the peg
 *  line, metres): hands and eyes that must meet a swinging bill use it (three.js order YXZ, as square_tree.ts poses it) */
const billPt = (E: Eng, i: number, lx: number, ly: number, f: number): V3 => {
  const b = SQ.bills[i], sw = billSway(i, E.vf), kk = billKickAt(i, f), rx = sw.swing + kk[0], ry = b.yaw + sw.twist + kk[1];
  const y = ly * Math.cos(rx), z = ly * Math.sin(rx);
  return [b.peg[0] + lx * Math.cos(ry) + z * Math.sin(ry), b.peg[1] + y, b.peg[2] - lx * Math.sin(ry) + z * Math.cos(ry)];
};

// ================================================================== S12: THE CLIPBOARD (1 in 4) + HER EYEBROWS
// LOOK's page hangs in the world at CLIP (turned to the S12 lens); its texture shows the tick / crosses from the words.
// The interviewer holds it (her arms on her card + insert hands in FRONT of the board, mapped through the live lens),
// her pencil makes each mark on its word (a progressive ink overlay hands over to LOOK's texture on the switch frame).
// On the real voice LOOK's 4th cross lands after the shot (hadSeen - 2): the overlay draws the 4th cross itself.
const IV = STUDY.iv;
const PG0: V3 = [IV[0] - 0.18, 1.08, IV[2] - 0.2];
const PAX = (() => {
  const cm: V3 = [PG0[0] - 0.52, PG0[1] + 0.64, PG0[2] - 0.64], n = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const z = n([cm[0] - PG0[0], cm[1] - PG0[1], cm[2] - PG0[2]]), x = n([z[2], 0, -z[0]]);
  return { x, y: [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]] as V3, z };
})();
const pageW = (lx: number, ly: number, lz = 0): V3 => [0, 1, 2].map((i) => PG0[i] + PAX.x[i] * lx + PAX.y[i] * ly + PAX.z[i] * lz) as V3;
/** LOOK's page texture px (768 x 1024) -> world */
const texW = (tx: number, ty: number, lz = 0.003): V3 => pageW((tx / 768 - 0.5) * 0.22, (0.5 - ty / 1024) * 0.293 - 0.012, lz);
const S12A = SH("S12").a, S12B = SH("S12").b;
/** when LOOK's texture shows mark k (sets_square.ts poseV2) */
const LOOKMK = [BEAT.one18 - 2, BEAT.in18 - 1, BEAT.four18 - 1, Math.min(BEAT.hadSeen - 2, BEAT.four18 + 6)];
/** when each mark is FINISHED by her pencil (the 4th: ours, right after "four") */
const MK = [LOOKMK[0], LOOKMK[1], LOOKMK[2], Math.min(LOOKMK[3], LOOKMK[2] + 7)];
/** p3 (EDIT's S12: the page is the picture until the crane; her face only comes into frame at S12_MARKS.faceIn).
 *  p4 (the viewer: "face cut off or a blank -_-"): she looks up and her brows shoot up ~10 f BEFORE her face enters the
 *  frame (the swap's half-blink happens off screen), so it arrives already incredulous; a skeptical brow drop at the end */
const LOOKUP12 = Math.max(MK[3] + 2, S12_MARKS.faceIn - 15);
const DOOD: P2[] = [[230, 300], [540, 300], [230, 600], [540, 600]];
type Stroke = { f0: number; f1: number; pts: P2[]; col: string; w: number; k: number };
const STROKES: Stroke[] = [];
{ const t = DOOD[0]; STROKES.push({ f0: MK[0] - 5, f1: MK[0] - 1, pts: [[t[0] - 70, t[1] + 10], [t[0] - 20, t[1] + 70], [t[0] + 90, t[1] - 90]], col: "#1f8a3a", w: 26, k: 0 }); }
for (let k = 1; k < 4; k++) { const t = DOOD[k], E0 = MK[k];
  STROKES.push({ f0: E0 - 7, f1: E0 - 4.5, pts: [[t[0] - 85, t[1] - 120], [t[0] + 85, t[1] + 150]], col: "#d8302a", w: 24, k });
  STROKES.push({ f0: E0 - 3.5, f1: E0 - 1, pts: [[t[0] + 85, t[1] - 120], [t[0] - 85, t[1] + 150]], col: "#d8302a", w: 24, k }); }
const plen = (p: P2[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
const along = (p: P2[], u: number): P2[] => {
  const L = plen(p) * clamp(u, 0, 1), o: P2[] = [p[0]]; let acc = 0;
  for (let i = 1; i < p.length; i++) { const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (acc + d >= L) { const v = (L - acc) / (d || 1); o.push([p[i - 1][0] + (p[i][0] - p[i - 1][0]) * v, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * v]); return o; } o.push(p[i]); acc += d; }
  return o;
};
const REST12: P2 = [680, 800];
/** p3: after the last cross the pencil swings to the LEFT of the big "1 in 4" (her hand stays off the page's left edge: it
 *  never covers the number during the read), taps beside the "1" twice ("see?") and rests there, pointing at it */
const POINT12: P2 = [112, 905], PT12 = [MK[3] + 10, MK[3] + 16, MK[3] + 22];
/** p4 (audit: the 48 f hover; the film's lowest-change seconds): she DRAWS the four phone people on the words ("Even",
 *  "asked", "straight", "out,"): each a quick stick figure in DW12 f (head, body, two legs, two arms, the phone filled in
 *  its colour) in LOOK's exact strokes (square_paint.ts clipPageTex), so LOOK's texture takes over the moment one is done;
 *  until then a paper patch on an unlit card hides LOOK's doodle (cover12). On "only" she taps the first one */
const DRAW12 = [BEAT.even + 2, (BEAT.even + BEAT.straightOut) / 2 + 1.5, BEAT.straightOut + 1, BEAT.straightOut + 0.45 * (BEAT.only - BEAT.straightOut) + 1].map(Math.round);
const DW12 = clamp(Math.round(DRAW12[1] - DRAW12[0] - 1), 7, 10);
/** the strokes of a doodle in order, each [name, start, end] in the doodle's own time 0..1 */
const SEG12: [string, number, number][] = [["head", 0, 0.27], ["body", 0.3, 0.4], ["legL", 0.43, 0.51], ["legR", 0.55, 0.63], ["armL", 0.66, 0.74], ["armR", 0.77, 0.85], ["phone", 0.88, 1]];
const DCOL12 = ["#e8382f", "#3a7ad8", "#ffb81a", "#2a9a5a"];
const doodlePts = (k: number, nm: string): P2[] => {
  const [x, y] = DOOD[k];
  if (nm === "head") return Array.from({ length: 25 }, (_, i) => { const a = -Math.PI / 2 + (TAU * i) / 24; return [x + 40 * Math.cos(a), y - 70 + 40 * Math.sin(a)] as P2; });
  if (nm === "body") return [[x, y - 30], [x, y + 70]];
  if (nm === "legL") return [[x, y + 70], [x - 30, y + 140]];
  if (nm === "legR") return [[x, y + 70], [x + 30, y + 140]];
  if (nm === "armL") return [[x, y], [x - 40, y + 40]];
  if (nm === "armR") return [[x, y], [x + 34, y - 40]];
  return [[x + 26, y - 104], [x + 50, y - 104], [x + 50, y - 58], [x + 26, y - 58], [x + 26, y - 104]];
};
/** every pencil contact in order: the doodles' strokes, the tap on "only", the tick + crosses, the "see?" taps */
const PEN12: { f0: number; f1: number; pts: P2[] }[] = (() => {
  const o: { f0: number; f1: number; pts: P2[] }[] = [];
  DRAW12.forEach((d0, k) => SEG12.forEach(([nm, a, b]) => o.push({ f0: d0 + a * DW12, f1: d0 + b * DW12, pts: doodlePts(k, nm) })));
  const tapF = Math.min(STROKES[0].f0 - 4, Math.max(DRAW12[3] + DW12 + 3, BEAT.only - 1));
  o.push({ f0: tapF, f1: tapF, pts: [[DOOD[0][0] + 38, DOOD[0][1] - 80]] });
  for (const s of STROKES) o.push({ f0: s.f0, f1: s.f1, pts: s.pts });
  o.push({ f0: PT12[0], f1: PT12[0], pts: [POINT12] }, { f0: PT12[1], f1: PT12[1], pts: [[POINT12[0] + 18, POINT12[1] + 10]] }, { f0: PT12[2], f1: PT12[2], pts: [POINT12] });
  return o;
})();
/** the pencil tip on the page at frame f: texture px + lift (0 on the paper .. 1 hovering) */
const penAt = (f: number): { t: P2; lift: number } => {
  const E0 = PEN12[0];
  if (f < E0.f0) { const u = clamp((f - (E0.f0 - 10)) / 10, 0, 1), e = sm(u); return { t: [REST12[0] + (E0.pts[0][0] - REST12[0]) * e, REST12[1] + (E0.pts[0][1] - REST12[1]) * e], lift: 1 - 0.9 * e * e }; }
  for (const s of PEN12) if (f >= s.f0 && f <= s.f1) { if (s.f1 - s.f0 < 0.01) return { t: s.pts[0], lift: 0 }; const q = along(s.pts, (f - s.f0) / (s.f1 - s.f0)); return { t: q[q.length - 1], lift: 0 }; }
  let i = 0; while (i + 1 < PEN12.length && PEN12[i + 1].f0 <= f) i++;
  if (i === PEN12.length - 1) return { t: [POINT12[0] + 3 * Math.sin(f / 7), POINT12[1] + 2 * Math.sin(f / 5.3)], lift: 0.12 };   /* resting on the paper, pointing */
  const a = PEN12[i], b = PEN12[i + 1], pa = a.pts[a.pts.length - 1], pb = b.pts[0], gap = Math.max(0.01, b.f0 - a.f1), u = clamp((f - a.f1) / gap, 0, 1), e = sm(u);
  const hop = Math.min(1, Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) / 160), lift = gap < 3 ? (0.25 + 0.35 * hop) * Math.sin(Math.PI * u) : Math.min(1, Math.sin(Math.PI * u) * 2.2);
  return { t: [pa[0] + (pb[0] - pa[0]) * e, pa[1] + (pb[1] - pa[1]) * e], lift };
};
/** LOOK's page colour through its material (#fbf8ef x (0.95, 0.94, 0.92) in linear light = #f5f1e6) and the ruled lines */
const PAPER12 = "#f5f1e6";
/** the doodle area (texture px) the cover card spans */
const DBOX12: [number, number, number, number] = [150, 160, 630, 770];
/** the paper patch over doodle k (texture px) */
const patch12 = (k: number): [number, number, number, number] => { const [x, y] = DOOD[k]; return [x - 64, y - 124, x + 66, y + 152]; };
/** draws (in texture px, the canvas already transformed) the paper patches over the doodles not yet finished and the
 *  strokes drawn so far, at frame f */
const drawCover12 = (g: CanvasRenderingContext2D, f: number, affK: (k: number) => [number, number, number, number, number, number]) => {
  DOOD.forEach((_, k) => {
    const t = (f - DRAW12[k]) / DW12; if (t >= 1) return;
    const [x0, y0, x1, y1] = patch12(k);
    g.save(); g.transform(...affK(k));   /* each patch on its own affine (fitted on its own corners: no perspective drift) */
    /* a feathered edge, and paper-coloured (nearly clear) texels round it so the card's filtering never darkens the rim */
    for (const [m, a] of [[14, 0.02], [6, 0.18], [4, 0.4], [2, 0.7], [0, 1]] as const) { g.globalAlpha = a; g.fillStyle = PAPER12; g.fillRect(x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m); }
    g.globalAlpha = 1;
    g.beginPath(); g.rect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12); g.clip();
    g.strokeStyle = "rgba(118,136,182,0.33)"; g.lineWidth = 3; for (let y = 120; y < 1000; y += 52) { g.beginPath(); g.moveTo(30, y); g.lineTo(738, y); g.stroke(); }
    g.lineCap = "round"; g.lineJoin = "round";
    for (const [nm, a, b] of SEG12) { if (t <= a) break; const v = clamp((t - a) / (b - a), 0, 1), q = along(doodlePts(k, nm), v);
      if (nm === "phone" && v >= 1) { const [x, y] = DOOD[k]; g.fillStyle = DCOL12[k]; g.beginPath(); g.roundRect(x + 26, y - 104, 24, 46, 6); g.fill(); }
      if (q.length > 1) { g.strokeStyle = "#29233d"; g.lineWidth = 10; g.beginPath(); q.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); } }
    g.restore();
  });
};
const s12 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const id = SID.S12, L = E.light2D(cam);
  // ---- the insert card 0.16 m in front of the page: the pencil hand, the holding thumb, the ink
  const I = K.insertAt(E, cam, PG0, 0.16, 0.3), dIns = Math.hypot(cam.pos.x - I.pos[0], cam.pos.z - I.pos[2]), dPg = Math.hypot(cam.pos.x - PG0[0], cam.pos.z - PG0[2]);
  const u = I.u * (dIns / dPg) * 1.05;   /* her hands at the board's depth */
  const A = I.map(texW(0, 0)), Bx = I.map(texW(768, 0)), Cy = I.map(texW(0, 1024));
  const aff: [number, number, number, number, number, number] = [(Bx[0] - A[0]) / 768, (Bx[1] - A[1]) / 768, (Cy[0] - A[0]) / 1024, (Cy[1] - A[1]) / 1024, A[0], A[1]];
  const pen = penAt(f), tip = I.map(texW(pen.t[0], pen.t[1], 0.003 + 0.022 * pen.lift));
  /* p4 (audit: the glove covered "ON A CALL"): the hand holds the pencil from BELOW-left (the pencil points up-right to its
     tip), so the glove always sits under the tip, and the sleeve wraps round the board's LEFT edge (it starts outside
     the board, where her own arm meets it) */
  const pDir = 125 + 4 * Math.sin(f / 11), Lp = 30 * u, pinch: P2 = [tip[0] + Math.cos((pDir * Math.PI) / 180) * 0.34 * Lp, tip[1] + Math.sin((pDir * Math.PI) / 180) * 0.34 * Lp];
  const fDir = -35 + 6 * Math.sin(f / 9), wristP = K.wristFor("pinch", pinch, u, -1, fDir, 1.15);
  const sleeveFromP: P2 = (() => {
    const fr = (fDir * Math.PI) / 180, dB: P2 = [-Math.cos(fr), -Math.sin(fr)], ey: P2 = [aff[2], aff[3]], L0: P2 = [A[0] - 70 * aff[0], A[1] - 70 * aff[1]];
    const det = -dB[0] * ey[1] + ey[0] * dB[1], rx = L0[0] - wristP[0], ry = L0[1] - wristP[1], t = Math.abs(det) > 1e-9 ? (-rx * ey[1] + ey[0] * ry) / det : -1;
    const tt = t > 20 * u && t < 70 * u ? t : 50 * u; return [wristP[0] + dB[0] * tt, wristP[1] + dB[1] * tt];
  })();
  const edgeR = I.map(pageW(0.128, -0.03)), gDir = 192, wristG = K.wristFor("grip", edgeR, u, 1, gDir, 1.15), sleeveFromG: P2 = [wristG[0] + 60 * u, wristG[1] + 8 * u];
  const inks = STROKES.filter((s) => f >= s.f0 && f < Math.max(s.f1 + 0.5, LOOKMK[s.k]) && !(f >= LOOKMK[s.k] && s.k < 3));
  const em12 = f - MK[3];   /* p3: three red dashes flick out each side of "1 in 4" as it lands on the page (13 f) */
  const key = `s12ins|${E.fkey({ A, aff: aff.map((v) => E.q(v, 400)), tip, wristP, edgeR, inks: inks.map((s) => [s.k, E.q(clamp((f - s.f0) / (s.f1 - s.f0), 0, 1), 30)]), em: em12 >= 0 && em12 < 13 ? em12 : -1 })}`;
  K.putInsert(E, out, cam, key, I, (p: Pen) => {
    const g = p.g;
    g.save(); g.transform(...aff);
    for (const s of inks) { const q = along(s.pts, (f - s.f0) / (s.f1 - s.f0)); if (q.length > 1) { g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = s.col; g.lineWidth = s.w; g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } }
    if (em12 >= 0 && em12 < 13) { const k = Math.min(1, (em12 + 1) / 3) * (em12 < 10 ? 1 : 1 - (em12 - 9) / 4); g.lineCap = "round"; g.strokeStyle = "#d8302a"; g.lineWidth = 15;
      for (const sd of [-1, 1]) for (const a of [-0.42, 0, 0.42]) { const r0 = 296 + 12 * k, r1 = r0 + 44 * k; g.beginPath(); g.moveTo(384 + sd * r0 * Math.cos(a), 896 + r0 * Math.sin(a) * 0.5); g.lineTo(384 + sd * r1 * Math.cos(a), 896 + r1 * Math.sin(a) * 0.5); g.stroke(); } }
    g.restore();
    K.sleeveHand(p, sleeveFromG, wristG, "grip", u, 1, 0, 1.15, FIT.ASK_A.cardigan!, FIT.ASK_A.shirt, 7.4);
    K.pencil(p, tip, pDir, Lp, u);
    K.sleeveHand(p, sleeveFromP, wristP, "pinch", u, -1, -8, 1.15, FIT.ASK_A.cardigan!, FIT.ASK_A.shirt, 7.4);
  });
  // ---- p4: the doodles she is still drawing: a screen-locked UNLIT card 3 cm in front of the page (LOOK's page is an unlit
  //      basic material too), mapped through the live lens over the doodle area; gone once the fourth one is done
  if (f < DRAW12[3] + DW12 + 0.5) {
    const cn = [texW(DBOX12[0], DBOX12[1], 0), texW(DBOX12[2], DBOX12[1], 0), texW(DBOX12[0], DBOX12[3], 0), texW(DBOX12[2], DBOX12[3], 0)].map((w) => K.toPx(E, id, f, w));
    const xs = cn.map((c) => c[0]), ys = cn.map((c) => c[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const wpx = Math.max(...xs) - Math.min(...xs) + 40, hpx = Math.max(...ys) - Math.min(...ys) + 40, CW = 512, CH = 704, dP = K.toPx(E, id, f, PG0)[2] - 0.03;
    const cv = (c: [number, number, number]): P2 => [((c[0] - cx) / wpx + 0.5) * CW, ((c[1] - cy) / hpx + 0.5) * CH];
    /* texture px -> canvas px, fitted on each patch's own three corners */
    const affs = DOOD.map((_, k) => { const [x0, y0, x1, y1] = patch12(k), q0 = cv(K.toPx(E, id, f, texW(x0, y0, 0))), q1 = cv(K.toPx(E, id, f, texW(x1, y0, 0))), q2 = cv(K.toPx(E, id, f, texW(x0, y1, 0)));
      const a = (q1[0] - q0[0]) / (x1 - x0), b = (q1[1] - q0[1]) / (x1 - x0), c = (q2[0] - q0[0]) / (y1 - y0), d = (q2[1] - q0[1]) / (y1 - y0);
      return [a, b, c, d, q0[0] - a * x0 - c * y0, q0[1] - b * x0 - d * y0] as [number, number, number, number, number, number]; });
    const prog = DRAW12.map((d) => E.q(clamp((f - d) / DW12, 0, 1), 60));
    K.scrFx(E, out, id, f, `s12doo|${E.fkey({ a: affs.map((af) => af.map((v) => E.q(v, 300))), prog })}`, CW, CH, (p) => drawCover12(p.g, f, (k) => affs[k]), cx, cy, dP, wpx, hpx, 0, true);
  }
  // ---- the interviewer: her card's arms run from her shoulders to where the insert sleeves start (no hands of her own)
  const toWorld = (d: P2): V3 => { const k = E.SU * I.sc, r = (d[0] - 300) * k; return [I.pos[0] + Math.cos(I.yaw) * r, I.pos[1] + (975 - d[1]) * k, I.pos[2] - Math.sin(I.yaw) * r]; };
  const h = Math.atan2(cam.pos.x - IV[0], cam.pos.z - IV[2]), sc = E.orientSC(cam, IV, h), life = PPL.holdLife(f, 8, 0.7);
  const down = f < LOOKUP12 && f >= DRAW12[0] - 8, tipPx = K.toPx(E, id, f, texW(pen.t[0], pen.t[1])), headPx = K.toPx(E, id, f, [IV[0], 1.45, IV[2]]);
  const gz = PPL.lookAt(f, [[S12A - 20, 0.05, -0.15], [DRAW12[0] - 8, clamp((tipPx[0] - headPx[0]) / 300, -1, 1), 1.1], [LOOKUP12, 0, -0.05]]);
  /* p4: incredulous (wide eyes, brows hoisted, the "o") from before her face enters to the cut; then one brow drops (the
     skeptical "can you believe it?") with a slow head shake, eyes on us */
  const face = PPL.faceAt(f, [[S12A - 20, "asking"], [DRAW12[0] - 6, "focusB"], [LOOKUP12 + 1, "brightO"]], 12), SKEP12 = Math.min(S12B - 8, S12_MARKS.faceIn + 4);
  const bu0 = f < DRAW12[0] - 6 ? PPL.browsUp(f, S12A - 30, DRAW12[0] - 10, 4) : PPL.browsUp(f, LOOKUP12 + 1, Infinity, 11), skep = PPL.gesture(f, SKEP12, { ant: 2, move: 4, over: 0.15, settle: 6 });
  const bu: [number, number] = [bu0[0] - 9 * clamp(skep, 0, 1.1), bu0[1] + 2 * clamp(skep, 0, 1)];
  const P: Pose = { s: sc.s, c: sc.c, go: 0, ...life, expr: face.expr, look: (down ? clamp((tipPx[0] - headPx[0]) / 300, -1, 1) : gz.look) + life.look * 0.5, lookY: down ? 1.1 : gz.lookY,
    blink: Math.max(f >= LOOKUP12 + 4 ? 0 : life.blink, gz.blink, face.lid), face: { browUp: bu }, light: L,
    nod: (down ? 0.7 * Math.abs(Math.sin((f - DRAW12[0]) / 2.6)) : 0) + 0.8 * bumpN(f, MK[0] - 2, 8) + 0.8 * bumpN(f, MK[2] - 2, 8) - 1.4 * hold(f, LOOKUP12, 1e9, 6, 6),
    headTilt: life.headTilt + 5 * ramp(f, LOOKUP12 + 2, LOOKUP12 + 12) + 3.5 * Math.sin((f - SKEP12) / 2.4) * ramp(f, SKEP12 - 2, SKEP12 + 3), tilt: life.tilt - 2 * ramp(f, LOOKUP12, LOOKUP12 + 8), stretch: PPL.takeAt(f, LOOKUP12 - 3, 0.6).stretch,
    armL: { to: E.onCard(cam, IV, K.yawAt(cam, IV), toWorld(sleeveFromP)), hand: "none", front: true }, armR: { to: E.onCard(cam, IV, K.yawAt(cam, IV), toWorld(sleeveFromG)), hand: "none", front: true } };
  K.fig(E, out, cam, "s12iv", IV, P, (q, pp) => PPL.drawInterviewer(q, 0, pp));
  // ---- life behind her (soft): walkers crossing the plaza's south side, a dog walker, pigeons
  K.crowd(E, out, cam, { id: "tote", a: [7.4, 0, 12.6], b: [2.6, 0, 15.2], f0: S12A - 30, seed: 3 }, f);
  K.crowd(E, out, cam, { id: "dogwalker", a: [4.4, 0, 14.4], b: [9.2, 0, 12.2], f0: S12A - 10, seed: 5 }, f);
  K.crowd(E, out, cam, { id: "scarf", a: [6.2, 0, 15.8], b: [9.6, 0, 11.4], f0: S12A - 60, seed: 7 }, f);
  K.crowd(E, out, cam, { id: "chatA", a: [7.3, 0, 13.9], b: [6.6, 0, 13.4], f0: 0, stand: true, seed: 11 }, f);
  K.crowd(E, out, cam, { id: "chatB", a: [6.6, 0, 13.4], b: [7.3, 0, 13.9], f0: 0, stand: true, seed: 12 }, f);
  K.pigeons(E, out, cam, f, [[4.95, 11.15, 1], [4.45, 11.5, -1], [5.35, 11.6, 1], [5.9, 12.2, -1], [4.62, 10.98, -1], [4.18, 11.12, 1]], () => [], 0, "s12");
  for (let k = 0; k < 4; k++) { const ph = (((f - S12A) * 0.011 + k / 4) % 1 + 1) % 1, px = 100 + ((k * 263) % 880) + 50 * Math.sin(f / 11 + k), py = -40 + 2000 * ph, rot = (f / 9 + k * 1.7) % TAU;
    K.scrFx(E, out, id, f, `s12pet|${k}|${E.q(rot, 6)}`, 64, 48, (p) => { p.g.fillStyle = "#f6c6d4"; p.g.beginPath(); p.g.ellipse(32, 24, 26, 14, 0, 0, TAU); p.g.fill(); p.g.strokeStyle = "#c8869a"; p.g.lineWidth = 3; p.g.stroke(); }, px, py, 0.55 + 0.15 * (k % 2), 40, 28, rot, true); }
};

// ================================================================== S13: THE SPIN (HARD CUT; the line may be missing)
// The clown has just braked at the phone guy's west side; he honks; the guy (walking off, his back to us) SPINS round to
// face him (wind-up, turn, overshoot), his jaw drops (held); the clown grins, waves, honks again.
const S13A = SH("S13").a, S13B = SH("S13").b;
/** the turn starts here (the wind-up just before): on "spun", or (line dropped) right after the cut */
export const SPIN13 = hasLine("spun") ? BEAT.spun + 1 : S13A + 7;
const HONK13 = SPIN13 - 6, WAVE13 = SPIN13 + 17, HONK13B = Math.min(S13B - 6, SPIN13 + 29);
/** p3: the keyed turn (DESIGN's spinAround: 5 f, the smear frame on SPIN13 + 2) settles on "around"; then the TAKE: 4 f
 *  down, the jaw drops on the pop (TAKE13 + 4) with surprise ticks and a "!" */
const SET13 = hasLine("spun") ? clamp(Math.round(BEAT.around) - SPIN13 - 1, 8, 13) : 9, TAKE13 = SPIN13 + 5;
/** p4: the clown's payoff: eyes pop on POP13 (1 f after the guy's jaw drops), the joy face from JOY13, the hop's launch,
 *  the double honk overhead (7 f apart, with the hop), the glance at us */
const POP13 = TAKE13 + 5, JOY13 = POP13 + 4, HOP13 = POP13 + 4, HONKS13 = [HONK13, Math.min(S13B - 14, POP13 + 8), Math.min(S13B - 7, POP13 + 15)], GLANCE13 = Math.min(S13B - 12, POP13 + 19);
void WAVE13; void HONK13B;
/** p4: a RING of twinkling stars round a head (never on the face): they pop in one by one from f0 and twinkle */
const joyRing = (q: Pen, A: { head: P2; r: number; u: number }, f: number, f0: number, n = 7) => {
  for (let i = 0; i < n; i++) { const t = f - f0 - 2 * i; if (t < 0) continue;
    const a = (-200 + (220 * i) / (n - 1)) * (Math.PI / 180), rr = A.r * (1.42 + 0.12 * Math.sin(i * 2.3)), x = A.head[0] + rr * Math.cos(a), y = A.head[1] + rr * 1.05 * Math.sin(a);
    const s = A.u * (14 + 5 * Math.sin(i * 1.7)) * Math.min(1, t / 3) * (0.72 + 0.28 * Math.sin(f / 2.1 + i * 1.3)); star4(q, x, y, s, "#fff3a8", 1.6 * A.u); q.dot(x, y, 0.2 * s, "#ffffff"); }
};
const s13 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const L = E.light2D(cam), G = STUDY.stop, Cs = STUDY.clownSide;
  // ---- the phone guy: 140 deg (3/4 back, facing the plaza) -> -35 deg (3/4 front, facing the clown)
  const sp = PPL.spinAround(f, SPIN13, { from: 140, to: -35, wind: 5, over: 20, settle: SET13 });
  const back = sp.back, ch = PPL.phoneChat(f, 2), turned = f >= SPIN13 + 3;
  const startle = bumpN(f, HONK13 + 1, 7), tk = PPL.takeAt(f, TAKE13, 1);
  const fling = PPL.gesture(f, TAKE13 + 3, { ant: 2, move: 5, over: 0.18, settle: 9 });
  const free: Arm = turned ? { to: "hang", to2: "out", k: clamp(fling, -0.2, 1.2), dy: -16 * clamp(fling, 0, 1), hand: "open", hs: 1.15, ang: -30 } : PPL.talkHand(f, 2, ch.talking);
  const phone: Arm = { ...PPL.phoneArm(C.phoneRed), dy: turned ? 6 * ramp(f, TAKE13 + 4, TAKE13 + 12) : 0 };
  const face = PPL.faceAt(f, [[S13A - 10, ch.laughing ? "laughBig" : "bright"], [HONK13 + 1, "brightO"], [TAKE13 + 4, "jawDrop"]], 12);
  const P: Pose = { ...sp, go: 0, expr: face.expr, mouth: f < HONK13 + 1 ? ch.mouth : undefined, nod: (f < HONK13 ? ch.nod : 0) + tk.nod, light: L,
    look: turned ? -1.0 : 0.3, lookY: turned ? -0.35 : 0, blink: Math.max(sp.blink ?? 0, face.lid, f > SPIN13 + 4 && f < SPIN13 + 24 ? 0 : PPL.blinkAt(f, 2)),
    tilt: (sp.tilt ?? 0) - 4 * startle + (turned ? -3 * bumpN(f, TAKE13 + 4, 14) : 0), stretch: (sp.stretch ?? 1) * (1 + 0.05 * startle) * tk.stretch, headTilt: turned ? 4 : 0,
    breath: Math.sin(f / 17), ...PPL.bodyArms(back, phone, free) };
  /* p3 (D9): surprise ticks round his head + a "!" on the jaw drop (crisp, on his own card) */
  { const A = PPL.anchors("phoneGuy", P), on = f >= TAKE13 + 3 && f < TAKE13 + 34;
    K.fig(E, out, cam, "s13guy", G, P, PPL.drawPhoneGuy, on ? { fxKey: f, fx: (q) => { VFX.surpriseLines(q, f, TAKE13 + 4, A.head, { u: A.u, r: 66, n: 9, life: 16 });
      VFX.bang(q, f, TAKE13 + 4, [A.crown[0] + 4 * A.u, A.crown[1] - 12 * A.u], { u: A.u, hold: 20, size: 64 }); } } : {}); }   /* p4: the "!" ~1.6x (the look audit: ~45 px read small) */
  // ---- the clown: braked a moment before the cut (settling), honks; p4: THE PAYOFF when the guy finally sees him (below)
  const hdg = turnH(headingOf(Cs, G), -38), dvec: V3 = [Math.sin(hdg), 0, Math.cos(hdg)], bf = S13A - 9, tr = PPL.brakeTravel(f, bf, 1.3) - PPL.brakeTravel(1e4, bf, 1.3);
  const cp: V3 = [Cs[0] - 0.22 + dvec[0] * tr, 0, Cs[2] + 0.05 + dvec[2] * tr], br = PPL.clownBrake(f, bf, 1), rk = PPL.clownRock(f), sc = E.orientSC(cam, cp, hdg);
  /* the honks SUM (two 7 f apart overlap: a summed kick never jumps) */
  const hks = HONKS13.map((h) => PPL.clownHonk(f, h)), hjs = HONKS13.map((h) => PPL.honkJiggle(f, h));
  const hDy = hks.reduce((s, h) => s + (h.arm.dy ?? 0), 0), hSq = Math.max(...hks.map((h) => h.squeeze)), hHat = hks.reduce((s, h) => s + h.hatLag, 0), hRuff = hks.reduce((s, h) => s + h.ruff, 0);
  const hj13 = { stretch: hjs.reduce((s, h) => s * h.stretch, 1), pom: hjs.reduce((s, h) => s + h.pom, 0), ruff: hjs.reduce((s, h) => s + h.ruff, 0) };
  const ride0 = PPL.clownRide(f, 3), ride = { ...ride0, roll: ride0.roll ?? 0, hatLag: ride0.hatLag ?? 0, blink: ride0.blink ?? 0 };
  /* p4 (audit RETENTION-10): a 4 f squash while the guy's jaw drops, the EYES POP (goggles, 4 f), then the ecstatic open
     laugh-grin held to the cut; both arms shoot up (the horn hand 3 f late) and shake, a double honk overhead, a wheel hop
     with a land squash, sparkles round his head; in the last 12 f a beaming glance at us */
  const tk13 = PPL.takeAt(f, POP13 - 4, 0.7), hop0 = PPL.hopAt(f, HOP13, 0.13, 10), hop13 = { hop: hop0.hop, stretch: 1 + (hop0.stretch - 1) * 0.5 }, popEye = f >= POP13 && f < JOY13;   /* (a 2.1 m figure: a full-size take / hop stretch threw his head 200 px) */
  const cf = PPL.faceAt(f, [[S13A - 10, "brightGrin"], [JOY13, "delightB"]], 12);
  const upA = PPL.gestureBack(f, POP13, S13B + 3, { ant: 3, move: 5, over: 0.16, settle: 7 }), upB = PPL.gestureBack(f, POP13 + 3, S13B + 5, { ant: 3, move: 5, over: 0.16, settle: 7 });
  const shake = (ph: number) => 8 * Math.sin((TAU * (f - POP13)) / 7 + ph) * clamp(upA, 0, 1), rfk = (ride.armL as Arm).fk ?? [96, 104];
  const armUp = (k: number, a: number, b: number, from: [number, number]): [number, number] => [from[0] + (a - from[0]) * k, from[1] + (b - from[1]) * k];
  const gz13 = PPL.lookAt(f, [[S13A - 10, 0.95, -0.12], [GLANCE13, 0.05, 0.02]]);
  const CP: ClownPose = { s: sc.s, c: sc.c, spin: (tr + rk.d * ramp(f, bf + 20, bf + 34)) / WHEEL_R, wheelR: WHEEL_R, roll: br.roll + rk.roll * 0.5 + ride.roll * 0.4 + 6 * clamp(upA, 0, 1), tilt: br.tilt + rk.tilt * 0.5,   /* p4: he leans IN toward the guy (and away from the frame's left edge) as he cheers */
    hop: hop13.hop, expr: popEye ? "goggleO" : cf.expr, look: popEye ? 1.0 : gz13.look, lookY: popEye ? -0.2 : gz13.lookY, blink: popEye ? 0 : Math.max(cf.lid, ride.blink, gz13.blink * 0.5), headTilt: 3 + 5 * clamp(upA, 0, 1) * Math.sin((TAU * (f - POP13)) / 14),
    nod: tk13.nod, hatLag: hHat + ride.hatLag + PPL.lagOf((t) => 40 * PPL.hopAt(t, HOP13, 0.13, 10).hop, f, -1), ruff: hRuff + hj13.ruff, pom: hj13.pom, stretch: hj13.stretch * tk13.stretch * hop13.stretch, face: { blush: 0.6 + 0.4 * clamp(upA, 0, 1) }, light: L,
    armL: f >= POP13 - 3 ? { fk: armUp(clamp(upA, -0.2, 1.2), 160 + shake(0), 170 + shake(1), rfk as [number, number]), hand: "open", hs: 1.25, ang: 15 } : ride.armL,
    armR: { ...hks[0].arm, prop: { k: "horn", squeeze: hSq }, to: "out", to2: "show", k: Math.max(hold(f, HONK13 - 6, HONK13 + 8, 4, 8), clamp(upB, 0, 1)), dy: hDy + 8, hs: 1.1,
      ...(f >= POP13 ? { fk: [150 + shake(2), 166 + shake(3)] as [number, number], fkK: clamp(upB, -0.2, 1.15) } : {}) } };
  /* p3 (D9): honk rings out of the horn's bell on every honk (the clown's motif, DESIGN's rings on his own card); p4: sparkles of joy */
  K.clownAt(E, out, cam, "s13", cp, CP, { fxKey: f, fx: (q, Q) => { const A = PPL.clownAnchors(Q); if (A.horn) for (const hf of HONKS13) VFX.honkRings(q, f, hf, A.horn, { u: A.u, dir: A.hornDir ?? -45 });
    if (f >= JOY13) joyRing(q, A, f, JOY13); } });
  /* the dust of his brake still hangs behind the tyre as the shot opens; two feathers where the pigeons flushed on the honk */
  if (f < bf + 28) E.putGhost(out, cam, `s13sk|${f}`, cp, (q) => VFX.dust(q, f, bf + 3, [300, 975], { kind: "skid", dir: sc.s >= 0 ? 1 : -1, u: 2.2 }), 1);
  if (f >= HONK13 + 4 && f < HONK13 + 90) E.putGhost(out, cam, `s13fe|${f}`, [2.3, 0, 10.4], (q) => VFX.feathers(q, f, HONK13 + 4, [300, 790], { u: 1.8, n: 3, w: 150, seed: 5 }), 1);
  // ---- the second team member at the table writing; walkers on the far side; pigeons that flush on the honk
  { const p2: V3 = SQ.study.interviewers[1], h2s = E.orientSC(cam, p2, headingOf(p2, G)), lf = PPL.holdLife(f, 21, 1);
    const Q: Pose = { s: h2s.s, c: h2s.c, go: 0, ...lf, expr: f > SPIN13 + 8 ? "laughBig" : "focusB", lookY: f > SPIN13 + 8 ? -0.1 : 1, look: -0.6, light: L, armL: PPL.clipboardArm(-10), armR: PPL.writeArm(f), nod: f > SPIN13 + 8 ? 0.8 * Math.abs(Math.sin(f / 3)) : 0 };
    K.fig(E, out, cam, "s13ivb", p2, Q, (q, pp) => PPL.drawInterviewer(q, 1, pp)); }
  K.crowd(E, out, cam, { id: "cyclist", a: [9.0, 0, 4.0], b: [4.0, 0, 1.2], f0: S13A - 20, seed: 4 }, f);
  K.crowd(E, out, cam, { id: "backpack", a: [6.0, 0, 3.0], b: [8.8, 0, 6.5], f0: S13A - 40, seed: 6 }, f);
  K.crowd(E, out, cam, { id: "elder", a: [7.6, 0, 7.2], b: [7.0, 0, 3.0], f0: S13A - 60, seed: 8 }, f);
  K.pigeons(E, out, cam, f, [[2.3, 10.4, 1], [1.95, 9.95, -1], [2.6, 10.9, 1]], () => [], 0.95 * hold(f, HONK13 + 1, HONK13 + 40, 4, 16), "s13");
};

// ================================================================== S14: "HERE'S THE WEIRD PART" (p4 restaging, audit R3)
// A PHONE walker (the pink one) walks right under the clown's nose on "weird" while he waves in her face and honks: she
// never looks (she laughs into her call); he droops ("?") and rides off, dejected. The lens drifts back and left: the
// HEADPHONE DUDE bops in on "listening", spots him on "music" ("whoa"), waves on "noticed him": the clown's eyes pop, he
// cheers with both arms, hops, honks twice overhead and waves back. Marks + lens: cast_story2_marks.ts.
const S14A = MK2.S14A, S14B = MK2.S14B;
/** the clown at the walker: a big wave as she comes, a honk at her, a low wave right in her face, a honk over her head as
 *  she passes under him; she has gone: he gives up ("?"), turns and rides off east from MK2.GO14 */
const WAVEW14 = Math.round(BEAT.heres + 6), HONKW14 = [Math.round(BEAT.weird - 4), MK2.PASS14 + 1], LOWW14 = MK2.PASS14 - 6, GIVE14 = Math.round(BEAT.listening - 16);
const LAUGHW14 = MK2.PASS14 + 3;
/** the dude: spots him on "music" (a whoa take), raises his hand, the wave's swings start on "noticed" */
const NOTICE14 = Math.round(BEAT.music - 8), WAVE14 = Math.round(BEAT.noticed);
/** the clown's payoff (the S13 recipe): his head snaps to the dude, the eyes POP, the joy face, both arms up, a hop, two
 *  honks overhead, then he waves back with the arm nearer the dude */
const SNAP14 = WAVE14 - 3, POP14 = WAVE14 + 2, JOY14 = POP14 + 4, HOP14 = POP14 + 4, HONK14 = [Math.min(S14B - 13, POP14 + 8), Math.min(S14B - 6, POP14 + 15)], WB14 = Math.min(S14B - 10, POP14 + 13);
/** p3: the frame the dude reaches pigeon k's home (it flushes: two feathers drift down there) */
const HOMES14: [number, number, number][] = [[-1.6, -1.95, 1], [-0.7, -1.9, -1], [0.15, -1.75, 1], [0.9, -2.0, -1], [1.7, -1.85, 1]];
const FLUSH14 = HOMES14.map(([hx, hz]) => { for (let f = S14A - 10; f < S14B; f++) { const d = MK2.dude14(f); if (Math.hypot(d[0] - hx, d[2] - hz) < 0.95) return f; } return 1e9; });
/** the clown's heading on the lap's front: 3/4 right (toward the walker coming), 3/4 left (following her), 3/4 right again
 *  (riding off east); the 45 deg cheat toward the lens keeps his face in */
const HR14 = turnH(Math.PI / 2, -45), HL14 = turnH(-Math.PI / 2, 45);
const clownHd14 = (f: number) => { const a = sm((f - (MK2.PASS14 + 1)) / 8), b = sm((f - (MK2.GO14 - 5)) / 8); return HR14 + (HL14 - HR14) * a + (HR14 - HL14) * b; };
const s14 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const L = E.light2D(cam), d = MK2.dude14(f), m = MK2.dudeM14(f);
  // ---- the HEADPHONE DUDE (enters on "listening"): bopping, eyes half shut; WHOA on "music"; the big overhead wave on "noticed"
  const hd = turnH(Math.PI / 2, -32), sc = E.orientSC(cam, d, hd), bopK = 1.1 * (1 - 0.75 * hold(f, NOTICE14 - 2, WAVE14 - 4, 4, 8)), bop0 = PPL.bopAt(f, 104, bopK), bop = { nod: bop0.nod ?? 0, headTilt: bop0.headTilt ?? 0, tilt: bop0.tilt ?? 0 };
  const raise14 = PPL.gesture(f, WAVE14 - 8, { ant: 3, move: 8, over: 0.12, settle: 6 }), sw14 = 26 * Math.sin((Math.PI * (f - WAVE14)) / 9) * clamp((f - WAVE14) / 3, 0, 1);
  const hiWave: Arm = { to: "hang", fk: [158 + 0.25 * sw14, 172 + sw14], fkK: raise14, hand: "open", hs: 1.4, ang: -(sw14 * 0.6), front: true };
  const gz = PPL.lookAt(f, [[S14A - 20, 0.2, 0.1], [NOTICE14, 1.2, -0.35]]);
  const face = PPL.faceAt(f, [[S14A - 20, "smugB"], [NOTICE14 + 1, "brightO"], [WAVE14 - 5, "brightGrin"]], 12), tkD = PPL.takeAt(f, NOTICE14 - 3, 0.8);
  const per = 30 * 60 / 104, groove: MouthK | undefined = f < NOTICE14 ? (Math.floor((f + 4) / per) % 2 ? "vO" : "vU") : undefined;
  const P: Pose = { s: sc.s, c: sc.c, walk: PPL.walkPhase(m, "walk"), go: 1, gait: "walk", expr: face.expr, mouth: groove, light: L,
    look: gz.look, lookY: gz.lookY, blink: Math.max(gz.blink, face.lid, f > NOTICE14 - 4 ? 0 : PPL.blinkAt(f, 6)), nod: bop.nod + tkD.nod, headTilt: bop.headTilt + 5 * ramp(f, NOTICE14, NOTICE14 + 6), tilt: (bop.tilt ?? 0) - 3 * hold(f, NOTICE14, WAVE14, 3, 8),
    stretch: tkD.stretch, face: { browUp: PPL.browsUp(f, NOTICE14 + 1, WAVE14 + 6, 10) }, armR: f >= WAVE14 - 12 ? hiWave : undefined,
    cable: PPL.overlapAll((t) => 3 * (PPL.bopAt(t, 104, 1.1).tilt ?? 0) + 5 * Math.sin((TAU * t) / per), f).cable };   /* p3: the headphone cable swings with the bop */
  /* p3 (D9): music notes drift up from his left cup the whole shot; p4: a "!" pops on the whoa */
  { const A = PPL.anchors("dude", P);
    K.fig(E, out, cam, "s14dude", d, P, PPL.drawDude, { fx: (q) => { VFX.notes(q, f, [A.head[0] - 0.98 * A.r, A.head[1] - 0.3 * A.r], { u: A.u, side: -1 });
      VFX.bang(q, f, NOTICE14 + 1, [A.crown[0] + 10 * A.u, A.crown[1] - 10 * A.u], { u: A.u, hold: 14, size: 46 }); }, fxKey: f }); }
  // ---- the PHONE WALKER (pink phone): walks west right under his nose, chatting (blah); laughs into her call as he honks over her head
  { const w = MK2.walker14(f), whd = turnH(-Math.PI / 2, 35), wsc = E.orientSC(cam, w, whd), ch = PPL.phoneChat(f, 7), lf = PPL.holdLife(f, 13, 0.4);
    const laughing = f >= LAUGHW14 && f < LAUGHW14 + 16, ls = PPL.laughShake(f, LAUGHW14, LAUGHW14 + 14, 0.8);
    const W: Pose = { s: wsc.s, c: wsc.c, walk: PPL.walkPhase((f - S14A) * MK2.WALK14V + 7, "walk"), go: 1, gait: "walk", light: L, expr: laughing || ch.laughing ? "laughBig" : "bright", mouth: laughing ? "laugh" : ch.mouth,
      nod: (laughing ? ls.nod : ch.nod), headTilt: lf.headTilt + (laughing ? ls.headTilt : 0), stretch: laughing ? ls.stretch : 1, look: 0.15 * Math.sign(wsc.s), lookY: 0.2, blink: Math.max(lf.blink, PPL.blinkAt(f, 13)),
      ...PPL.bodyArms(false, PPL.phoneArm(C.phonePink), PPL.talkHand(f, 7, ch.talking && !laughing)) };
    if (w[0] > -4.5 && w[0] < 3.5) { const A = PPL.anchors("pink", W);
      K.fig(E, out, cam, "s14walk", w, W, PPL.drawPink, { fx: (q) => VFX.blah(q, f, [A.hands[0][0] - 14 * A.u, A.hands[0][1] - 32 * A.u], { u: A.u, side: -1 }), fxKey: f }); } }
  // ---- THE CLOWN: at the walker (wave, honk, the low wave in her face, honk), gives up, rides off east; the payoff on "noticed"
  const cx = MK2.clown14(f), rk = PPL.clownRock(f), still = 1 - ramp(f, MK2.GO14 - 2, MK2.GO14 + 6), hdg = clownHd14(f), dvec: V3 = [Math.sin(hdg), 0, Math.cos(hdg)];
  const cp: V3 = [cx[0] + dvec[0] * rk.d * still, 0, cx[2] + dvec[2] * rk.d * still], csc = E.orientSC(cam, cp, hdg);
  const ride0 = PPL.clownRide(f, 5), ride = { ...ride0, roll: ride0.roll ?? 0, hatLag: ride0.hatLag ?? 0, blink: ride0.blink ?? 0 };
  const HONKS = [...HONKW14, ...HONK14], hks = HONKS.map((h) => PPL.clownHonk(f, h)), hjs = HONKS.map((h) => PPL.honkJiggle(f, h));
  const hDy = hks.reduce((s, h) => s + (h.arm.dy ?? 0), 0), hSq = Math.max(...hks.map((h) => h.squeeze)), hHat = hks.reduce((s, h) => s + h.hatLag, 0), hRuff = hks.reduce((s, h) => s + h.ruff, 0);
  const hjS = hjs.reduce((s, h) => s * h.stretch, 1), hjP = hjs.reduce((s, h) => s + h.pom, 0), hjR = hjs.reduce((s, h) => s + h.ruff, 0);
  /* at the walker: the big wave (screen-left arm), then the LOW wave in her face as she passes under him (he leans down to her) */
  const bigW = PPL.waveArm(f, WAVEW14, -1, { swings: 2, per: 9, down: LOWW14 - 2 }), lean = hold(f, LOWW14 - 4, GIVE14 - 4, 6, 8);
  const lowK = PPL.gestureBack(f, LOWW14, GIVE14 - 2, { ant: 3, move: 6, over: 0.12, settle: 6 }), lowSw = 22 * Math.sin((TAU * (f - LOWW14)) / 8) * clamp(lowK, 0, 1);
  const lowW: Arm = { to: "hang", fk: [118 + 0.3 * lowSw, 150 + lowSw], fkK: clamp(lowK, -0.1, 1.1), hand: "open", hs: 1.3, ang: lowSw * 0.5 };
  /* he gives up: arms drop, a sag, a "?"; rides off with his head down */
  const sag = hold(f, GIVE14, POP14 - 6, 5, 8), tkG = PPL.takeAt(f, GIVE14 - 2, -0.35);
  /* the payoff */
  const tkP = PPL.takeAt(f, POP14 - 4, 0.7), hp0 = PPL.hopAt(f, HOP14, 0.12, 10), popEye = f >= POP14 && f < JOY14;
  const upA = PPL.gesture(f, POP14, { ant: 3, move: 5, over: 0.16, settle: 7 }), upB = PPL.gesture(f, POP14 + 3, { ant: 3, move: 5, over: 0.16, settle: 7 });
  const shake = (ph: number) => 8 * Math.sin((TAU * (f - POP14)) / 7 + ph) * clamp(upB, 0, 1) * (1 - ramp(f, WB14, WB14 + 5)), rfk = (ride.armL as Arm).fk ?? [96, 104];
  /* the wave back: the arm goes from "up" straight into the wave's swing (angle blend, never through the hang pose) */
  const backW = PPL.waveArm(f, WB14 + 4, -1, { swings: 3, per: 9 }), bwk = ramp(f, WB14, WB14 + 5), bfk = (backW.arm.fk ?? [128, 142]) as [number, number];
  const gzC = PPL.lookAt(f, [[S14A - 20, 0.9, 0.1], [MK2.PASS14 - 2, 0.3, 0.55], [MK2.PASS14 + 4, -0.9, 0.45], [GIVE14, -1.1, 0.3], [MK2.GO14, 0.6, 0.6], [SNAP14, -1.15, -0.1]]);
  const cf = PPL.faceAt(f, [[S14A - 20, "brightGrin"], [WAVEW14, "thrillB"], [GIVE14, "puzzled"], [MK2.GO14 + 2, "worriedB"], [JOY14, "delightB"]], 12);
  const upFK: [number, number] = [rfk[0] + (160 - rfk[0]) * clamp(upA, -0.2, 1.2) + shake(0), rfk[1] + (170 - rfk[1]) * clamp(upA, -0.2, 1.2) + shake(1)];
  const armL: Arm = f >= POP14 - 3 ? { fk: [upFK[0] + (bfk[0] - upFK[0]) * bwk, upFK[1] + (bfk[1] - upFK[1]) * bwk], hand: "open", hs: 1.25, ang: 15 * (1 - bwk) + (backW.arm.ang ?? 0) * bwk }
    : f >= LOWW14 - 6 && f < GIVE14 + 2 ? lowW : f >= WAVEW14 - 10 && f < LOWW14 - 2 ? bigW.arm : { ...(ride.armL as Arm), fk: [rfk[0] - 40 * sag, rfk[1] - 50 * sag] };
  const hornAt: Arm = { to: "out", to2: "show", k: Math.max(...HONKW14.map((h) => hold(f, h - 6, h + 8, 4, 8))), hand: "grip", prop: { k: "horn", squeeze: hSq }, dy: hDy + 8, hs: 1.1 };
  const armR: Arm = f >= POP14 ? { ...hornAt, fk: [150 + shake(2), 166 + shake(3)], fkK: clamp(upB, -0.2, 1.15) } : hornAt;
  const CP: ClownPose = { s: csc.s, c: csc.c, spin: (cx[0] - MK2.CL14[0] + rk.d * still) / WHEEL_R, wheelR: WHEEL_R, hop: hp0.hop,
    roll: ride.roll * 0.6 + rk.roll * 0.5 * still + 9 * lean * clamp(gzC.look * 1.4, -1, 1) - 4 * sag + 4 * clamp(upA, 0, 1), tilt: rk.tilt * 0.5 * still + 6 * lean + backW.tilt * bwk,
    expr: popEye ? "goggleO" : cf.expr, facing: f >= POP14 - 1 ? 0 : undefined, look: popEye ? -1.0 : gzC.look, lookY: popEye ? -0.25 : gzC.lookY,
    blink: popEye ? 0 : (f > WAVEW14 - 6 && f < GIVE14 + 4) || f > POP14 - 6 ? cf.lid : Math.max(cf.lid, ride.blink, gzC.blink * 0.5),   /* (no idle blink on the gag beats: one landed on the honk over her head) */
    nod: tkP.nod + tkG.nod + 1.6 * sag, headTilt: -4 + 5 * clamp(upA, 0, 1) * Math.sin((TAU * (f - POP14)) / 14) * (1 - bwk) + backW.headTilt * bwk + 6 * sag,
    hatLag: hHat + ride.hatLag + PPL.lagOf((t) => 40 * PPL.hopAt(t, HOP14, 0.12, 10).hop, f, -1), ruff: hRuff + hjR, pom: hjP, stretch: hjS * tkP.stretch * tkG.stretch * (1 + (hp0.stretch - 1) * 0.5) * (1 - 0.03 * sag),
    face: { blush: 0.6 + 0.4 * clamp(upB, 0, 1) }, light: L, armL, armR };
  K.clownAt(E, out, cam, "s14", cp, CP, { fxKey: f, fx: (q, Q) => { const A = PPL.clownAnchors(Q); if (A.horn) for (const hf of HONKS) VFX.honkRings(q, f, hf, A.horn, { u: A.u, dir: A.hornDir ?? -45 });
    VFX.bang(q, f, GIVE14 + 1, [A.hat[0], A.hat[1] - 22 * A.u], { ch: "?", u: A.u, hold: 16, size: 46 });
    if (f >= JOY14) joyRing(q, A, f, JOY14); } });
  // ---- life: pigeons in the dude's (and the walker's) path flush; a skater and a cyclist behind the sculpture; the frisbee
  K.pigeons(E, out, cam, f, HOMES14, (t) => [MK2.dude14(t), MK2.walker14(t)], 0, "s14");
  /* p3: a feather or two drifts down where each pigeon flushed (ghost cards: they settle on the bricks) */
  HOMES14.forEach(([hx, hz], k) => { const f0 = FLUSH14[k] + 3; if (k % 2 === 1 && f >= f0 && f < f0 + 90) E.putGhost(out, cam, `s14fe|${k}|${f}`, [hx, 0, hz], (q) => VFX.feathers(q, f, f0, [300, 800], { u: 1.7, n: 2, w: 110, seed: k + 2 }), 1); });
  /* p3 (D6): pigeons close to the dolly's track: they slide through the bottom of the frame, soft, as the lens passes */
  K.pigeons(E, out, cam, f, [[-0.9, -0.95, 1], [0.7, -0.7, -1], [2.0, -1.0, 1], [3.3, -0.75, -1]], () => [], 0, "s14n");
  K.crowd(E, out, cam, { id: "skater", a: [7.5, 0, -11.5], b: [-5.5, 0, -12.8], f0: S14A - 40, seed: 9 }, f);
  K.crowd(E, out, cam, { id: "cyclist", a: [-6.0, 0, -15.2], b: [9.5, 0, -13.8], f0: S14A - 30, seed: 10 }, f);
  K.frisbeePair(E, out, cam, f, [5.4, 0, -9.6], [7.6, 0, -8.4], 44, 7);
  K.crowd(E, out, cam, { id: "runner", a: [5.5, 0, -0.5], b: [5.0, 0, -16], f0: S14A - 10, seed: 15 }, f);
};

// ================================================================== S15: HER MIND LEAVES FOR THE CALL
const S15A = SH("S15").a, S15B = SH("S15").b;
const s15Hero = (f: number): V3 => lerp3(STORY.s15.from, STORY.s15.to, clamp((f - S15A + 6) / (S15B - S15A + 12), 0, 1));
/** her mind lifts out (tM), rides the signal, arrives in the bubble (tA); she laughs with her mum on "isn't there" */
const TM15 = BEAT.pulls - 2, TA15 = Math.max(BEAT.pulls + 22, BEAT.someone - 4), LAUGH15 = BEAT.isntThere - 2;
/** the call bubble on the screen (S15): centre px, size px */
const B15: [number, number] = [290, 552], SZ15 = 520;   /* p3: the hero sits at 0.66 of the width; p4 (look audit: the top measured y ~262, the line is 288): 37 px lower */
/** p3 (D10): the UNSEEN CLOWN rides by right behind her on "someone who isn't there": in at the left edge, behind her
 *  head on "isn't there", out at the right looking back at her */
const CL15A = Math.round(BEAT.someone - 6), CL15G = Math.round(BEAT.isntThere - 3), CL15H = [CL15A + 17, Math.min(CL15G - 4, CL15A + 29)];   /* in / gives up / his two honks */
const heroPose = (E: Eng, cam: CamInfo, p: V3, heading: number, metres: number, f: number, blankK: number, extra: Partial<Pose> = {}): Pose => {
  const sc = E.orientSC(cam, p, heading), ch = PPL.phoneChat(f, 4), life = PPL.holdLife(f, 4, 0.3), blank = blankK > 0.5;
  const BL: MouthK[] = ["vM", "vE", "vA", "vI", "vM", "vO", "vE", "vM"], mouth: MouthK | undefined = blank ? BL[((Math.floor(f / 4.5) % BL.length) + BL.length) % BL.length] : ch.mouth;
  return { s: sc.s, c: sc.c, walk: PPL.walkPhase(metres, "phone"), go: 1, gait: "phone", light: E.light2D(cam),
    expr: blank ? "blank" : ch.laughing ? "laughBig" : "bright", mouth, nod: blank ? 0 : ch.nod, look: blank ? 0 : life.look - 0.15, lookY: blank ? 0.05 : life.lookY + 0.1,
    blink: blank ? 0 : life.blink, headTilt: blank ? -3 : life.headTilt + (ch.laughing ? -5 : 0), breath: life.breath * (blank ? 0.4 : 1),
    ...PPL.bodyArms(sc.c < -0.35, PPL.phoneArm(C.phoneYellow), blank ? { to: "hang" } : PPL.talkHand(f, 4, true)), ...extra };
};
/** the bubble + the signal line + the riding mind, all screen-locked (shared by S15 and S20) */
const callFx = (E: Eng, out: Stage, id: number, f: number, phoneW: V3, headW: V3, depth: number, B: [number, number], size: number, st: { inn: number; on: number; arr: number; pop: number; laugh: number; lift: number; ride: number; inB: number; sig: number }, mindP: Pose, tm: number) => {
  if (st.inn > 0.02) { const sz = size * st.inn, lit = 0.35 + 0.65 * st.on, bst = { on: E.q(st.on, 20), arr: E.q(st.arr, 30), t: Math.floor(f * 2) / 2, pop: E.q(st.pop, 12), laugh: E.q(st.laugh, 4) };
    K.scrFx(E, out, id, f, `s2halo|${E.q(lit, 20)}`, 256, 256, (p) => K.drawHalo(p, lit), B[0], B[1] - 8, depth + 0.15, sz * 1.5, sz * 1.5, 0, true);
    K.scrFx(E, out, id, f, `s2bub|${JSON.stringify(bst)}`, 640, 640, (p) => K.drawBubble(p, bst), B[0], B[1], depth, sz, sz, 0, false); }
  const phone = K.toPx(E, id, f, phoneW), ang = Math.atan2(phone[1] - B[1], phone[0] - B[0]), edge: [number, number] = [B[0] + Math.cos(ang) * size * 0.42, B[1] + Math.sin(ang) * size * 0.42];
  const len = Math.hypot(edge[0] - phone[0], edge[1] - phone[1]), th = Math.atan2(-(edge[1] - phone[1]), edge[0] - phone[0]), ph = f / 13, thick = 104;
  if (st.sig > 0.02 && len > 30) K.scrFx(E, out, id, f, `s2sig|${E.q(st.sig, 24)}|${E.q(ph % 1, 26)}`, 512, 96, (p) => K.drawSignal(p, 512, 96, st.sig, ph, "#8cf0e4"), (phone[0] + edge[0]) / 2, (phone[1] + edge[1]) / 2, depth + 0.05, len, thick, th);
  if (f >= tm - 1 && st.inB < 0.98 && st.lift > 0.001) {
    const head = K.toPx(E, id, f, headW), top: [number, number] = [head[0] - 4, head[1] - 170 * st.lift];
    const c = K.signalAt(512, 96, st.ride, ph), ux = (edge[0] - phone[0]) / (len || 1), uy = (edge[1] - phone[1]) / (len || 1);
    const onLine: [number, number] = [phone[0] + ux * (c[0] / 512) * len - uy * ((c[1] - 48) / 96) * thick, phone[1] + uy * (c[0] / 512) * len + ux * ((c[1] - 48) / 96) * thick];
    const mx = sm(st.ride * 1.4), Q: [number, number] = [top[0] + (onLine[0] - top[0]) * mx, top[1] + (onLine[1] - top[1]) * mx], scl = 0.72 * (1 - 0.08 * st.lift) * (1 - 0.55 * st.ride), al = (0.25 + 0.6 * st.lift) * (1 - st.inB);
    const dq = depth - 0.05, hpx = (600 * E.SU * scl * 0.9) / K.mPx(E, id, f, dq), stretch = 1 + 0.15 * bumpN(st.lift, 0, 1) + 0.12 * Math.sin(Math.PI * st.ride);
    // three fading copies trail behind it on the lift
    for (let k = st.lift < 0.95 && st.ride < 0.05 ? 2 : 0; k >= 0; k--) {
      const off = k * 26 * (1 - st.lift + 0.2), a2 = al * (k ? 0.35 / k : 1), key = `s2mind|${E.fkey(mindP)}|${E.q(a2, 20)}|${E.q(stretch, 20)}|${k}`;
      K.scrFx(E, out, id, f, key, 480, 800, (p) => { p.g.save(); p.g.translate(240, 800); p.g.scale(0.8, 0.8 * stretch); p.g.translate(-300, -975); PPL.drawMind(p, mindP, a2); p.g.restore(); },
        Q[0], Q[1] + off - hpx * 0.42, dq, hpx, hpx * 1000 / 600, 0, true);
    }
  }
};
const s15 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const id = SID.S15, h0 = s15Hero(f), hd = headingOf(STORY.s15.from, STORY.s15.to), m = Math.hypot(h0[0] - STORY.s15.from[0], h0[2] - STORY.s15.from[2]);
  const w = PPL.weave(f, 4, 0.08), R = E.camR, h: V3 = [h0[0] + R.x * w, 0, h0[2] + R.z * w];
  const blankK = ramp(f, TM15 + 2, TM15 + 4);
  const P = heroPose(E, cam, h, hd, m + 2, f, blankK);
  if (blankK > 0.5) { const sag = ramp(f, TM15 + 4, TM15 + 12), sh = ramp(f, TM15 + 6, TM15 + 14); P.nod = 2.6 * sag; P.headTilt = (P.headTilt ?? 0) - 3 * sag; P.tilt = 1.5; P.stretch = 1 - 0.028 * sh; }   /* the head drops 2 f after the mind leaves, the shoulders sag 2 f after it (p4: the audit saw no sag at p3's amounts) */
  P.stretch = (P.stretch ?? 1) * (1 + 0.05 * bumpN(f, TM15 - 2, 7));   /* p3: the body is pulled up a hair as the mind leaves it */
  /* p3 (D9): the blah-blah bubble pulses beside her phone until the signal line takes over */
  { const A = PPL.anchors("hero", P), hi = (P.armL as Arm | undefined)?.prop ? 0 : 1, on = f < TM15 - 6;
    K.fig(E, out, cam, "s15hero", h, P, PPL.drawHero, on ? { fx: (q) => VFX.blah(q, f, [A.hands[hi][0] - 15 * A.u, A.hands[hi][1] - 30 * A.u], { u: A.u, side: -1 }), fxKey: f } : {}); }
  const dH = K.toPx(E, id, f, up(h, 1.2))[2];
  const st = { inn: ramp(f, TM15 - 8, TM15 + 4), on: ramp(f, TM15 - 4, TM15 + 12), arr: ramp(f, TA15 - 2, TA15 + 10), pop: bumpN(f, TA15 - 1, 9), laugh: hold(f, LAUGH15, LAUGH15 + 18, 2, 3),
    lift: ramp(f, TM15, TM15 + 10), ride: ramp(f, TM15 + 9, TA15), inB: ramp(f, TA15 - 3, TA15 + 1), sig: ramp(f, TM15 - 6, TM15 + 6) };
  const mindP: Pose = { s: -0.45, c: 0.88, go: 0, expr: "laughBig", look: -0.9, lookY: -0.4, light: E.light2D(cam), headTilt: -6 * st.lift, armL: PPL.phoneArm(C.phoneYellow), armR: { to: "hang", to2: "up", k: 0.9 * st.ride, hand: "open", ang: -20 } };
  callFx(E, out, id, f, [h[0] - R.x * 0.3, 1.3, h[2] - R.z * 0.3], up(h, 1.45), dH - 0.3, B15, SZ15, st, mindP, TM15);
  /* p3 (D9): five twinkles round the bubble's rim as her mind arrives in the kitchen */
  if (f >= TA15 - 1 && f < TA15 + 20) { const sk = 1 - ramp(f, TA15 + 12, TA15 + 20);
    K.scrFx(E, out, id, f, `s15spk|${f}`, 256, 256, (q) => { for (let i = 0; i < 5; i++) { const an = -2.5 + 1.15 * i; VFX.sparkles(q, f + 5 * i, [128 + 96 * Math.cos(an), 128 + 96 * Math.sin(an)], { u: 1, n: 1, r: 6, k: sk }); } },
      B15[0], B15[1], dH - 0.36, SZ15 * 1.12, SZ15 * 1.12, 0, true); }
  // ---- the unseen clown (D10): he rides in from the RIGHT on "someone", pulls up right behind her shoulder (facing us),
  //      waves and honks at her ear; she never turns; on "isn't there" he gives up, peels off and is gone behind her head
  if (f >= CL15A - 2) {
    const tin = sm((f - CL15A) / 15), tout = sm((f - CL15G) / 13), X = 1190 - 262 * tin - 520 * tout - 8 * Math.sin((f - CL15A) / 7) * tin * (1 - tout);
    const B = E.camB(id, f), d = dH + 3.7, kx = ((X - 540) / 540) * d * B.t * 0.5625, ky = -(B.pos[1] + B.F[1] * d) / B.U[1];
    const cp: V3 = [B.pos[0] + B.F[0] * d + B.R[0] * kx + B.U[0] * ky, 0, B.pos[2] + B.F[2] * d + B.R[2] * kx + B.U[2] * ky];
    /* heading: across the frame to the left while he comes in / leaves, WITH her (toward the lens) while he keeps pace */
    const side = Math.max(1 - tin, tout), hL = Math.atan2(-R.x, -R.z), hdg = hd + (((hL - hd + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * side, csc = E.orientSC(cam, cp, hdg), ride0 = PPL.clownRide(f, 9);
    const gone = f >= CL15G - 2, wv = PPL.waveArm(f, CL15A + 14, 1, { swings: 4.5, per: 8, amp: 30, down: CL15G - 3 });
    const hk = f < (CL15H[0] + CL15H[1]) / 2 ? PPL.clownHonk(f, CL15H[0]) : PPL.clownHonk(f, CL15H[1]);
    const cf = PPL.faceAt(f, [[CL15A - 10, "thrillB"], [CL15G - 1, "puzzled"]], 10), hop = Math.abs(Math.sin((f - CL15A) / 3.4)) * tin * (1 - tout);
    const hj = f < (CL15H[0] + CL15H[1]) / 2 ? PPL.honkJiggle(f, CL15H[0]) : PPL.honkJiggle(f, CL15H[1]), sag15 = PPL.takeAt(f, CL15G - 3, 0.6);
    const CP: ClownPose = { s: csc.s, c: csc.c, spin: ((f - CL15A) * 1.1) / 30 / WHEEL_R, wheelR: WHEEL_R, roll: (ride0.roll ?? 0) - 5 * tin * (1 - tout) - 7 * tout, hop: 0.05 * hop, tilt: gone ? 4 : -3, expr: cf.expr,
      look: -1.0, lookY: gone ? 0.35 : 0.1, facing: side < 0.5 ? -1 : undefined, blink: Math.max(cf.lid, ride0.blink ?? 0), headTilt: gone ? -9 : wv.headTilt - 4, hatLag: (ride0.hatLag ?? 0) + hk.hatLag, ruff: hk.ruff + hj.ruff, pom: hj.pom, stretch: hj.stretch * sag15.stretch, face: { blush: 0.6 },
      light: E.light2D(cam), armR: gone ? { fk: [28, 16], hand: "open" } : wv.arm, armL: { ...hk.arm, to: "show", dx: gone ? 6 : -4, dy: (hk.arm.dy ?? 0) + (gone ? 14 : 0), hs: 1.1 } };
    /* p3 (D9): a "?" pops over his hat as he gives up (she is not there) */
    K.clownAt(E, out, cam, "s15", cp, CP, f >= CL15G && f < CL15G + 24 ? { fxKey: f, fx: (q, Q) => { const A = PPL.clownAnchors(Q); VFX.bang(q, f, CL15G, [A.hat[0], A.hat[1] - 20 * A.u], { ch: "?", u: A.u, hold: 15, size: 44 }); } } : {});
    for (const hf of CL15H) { const hb = bumpN(f, hf - 1, 11); if (hb > 0.02) { const hp = K.toPx(E, id, f, [cp[0] - R.x * 0.42, 1.74, cp[2] - R.z * 0.42]);
      K.scrFx(E, out, id, f, `s15honk|${E.q(hb, 20)}`, 256, 256, (q) => { q.g.translate(256, 0); q.g.scale(-1, 1); K.drawHonk(q, 1 - hb); }, hp[0] - 50, hp[1] - 24, hp[2] - 0.2, 150, 150); } }
  }
  // ---- life (the world drains round her): walkers crossing behind, a cyclist, pigeons she walks through
  K.crowd(E, out, cam, { id: "beret", a: [1.6, 0, -6.2], b: [-4.8, 0, -7.8], f0: S15A - 40, seed: 16 }, f);
  K.crowd(E, out, cam, { id: "books", a: [-6.0, 0, -8.6], b: [3.0, 0, -9.6], f0: S15A - 20, seed: 17 }, f);
  K.crowd(E, out, cam, { id: "cyclist", a: [-5.5, 0, -11.5], b: [8.0, 0, -10.2], f0: S15A - 10, seed: 18 }, f);
  K.crowd(E, out, cam, { id: "parka", a: [-3.6, 0, 2.6], b: [-3.4, 0, -9.5], f0: S15A - 70, seed: 19 }, f);
  K.pigeons(E, out, cam, f, [[-1.2, -0.2, 1], [-2.3, 0.4, -1], [-1.0, 0.9, -1], [-2.5, -0.9, 1]], (t) => [s15Hero(t)], 0, "s15");
};

// ================================================================== S16: HYMAN TIPTOES (bills + pegs, sly looks, a FREEZE)
// p3: he tiptoes with a sly glance left; a jogger passes right behind him: he FREEZES on one leg, whips the bills and the
// pegs behind his back, looks at the sky and whistles; she is gone: a glance after her, the bills come back out, a smug
// brow waggle, he sneaks on a little faster. The lens follows his real walk (cast_story2_marks.ts) and pushes in on the freeze.
const S16A = MK2.S16A, S16B = MK2.S16B, s16Hy = MK2.hy16, FREEZE16 = MK2.FREEZE16, GO16 = MK2.GO16;
const LOOKL16 = Math.max(S16A + 5, FREEZE16 - 17), LOOKR16 = GO16 - 2, GRIN16 = GO16 + 8;
/** the walk phase offset that leaves his RIGHT foot at the top of its swing when he freezes (frozen on one leg) */
const PH16 = (() => { const mF = MK2.m16(FREEZE16 + 6); return 0.6 * (Math.ceil(mF / 0.6) + 0.775) - mF; })();
/** the jogger: right -> left right behind him (1.5 m further from the lens), level with him at JOG16 */
const JOG16 = FREEZE16 + 3;
/** p3: the frames his tiptoe feet plant (every half stride of his real travel): a small dust puff under each */
const STEPS16 = (() => { const o: number[] = [], st = PPL.GAIT.tiptoe.stride / 2; let last = Math.floor((MK2.m16(S16A - 12) + PH16) / st);
  for (let f = S16A - 11; f < S16B + 4; f++) { const n = Math.floor((MK2.m16(f) + PH16) / st); if (n !== last) { o.push(f); last = n; } } return o; })();
const s16 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const L = E.light2D(cam), h = s16Hy(f), m = MK2.m16(f), go = MK2.go16(f), sc = E.orientSC(cam, h, MK2.HEAD16);
  const walk = PPL.walkPhase(m + PH16, "tiptoe"), frz = hold(f, FREEZE16, GO16 + 2, 4, 6), [aL0, aR0] = PPL.sneakArms(f, walk);
  /* the bills and the pegs go BEHIND HIS BACK while he is frozen (the fan peeks out past his side) */
  const aL: Arm = frz > 0.02 ? { ...aL0, to2: "belly", k: frz, dx: (aL0.dx ?? 0) * (1 - frz) - 6, dy: ((aL0.dy ?? 0) + 12) * (1 - frz), front: frz > 0.45 ? false : undefined } : { ...aL0, dy: (aL0.dy ?? 0) + 12, dx: (aL0.dx ?? 0) - 6 };
  const aR: Arm = frz > 0.02 ? { ...aR0, to2: "belly", k: frz, dx: (aR0.dx ?? 0) * (1 - frz), front: frz > 0.45 ? false : undefined, prop: frz > 0.45 ? undefined : aR0.prop } : aR0;
  const gz = PPL.lookAt(f, [[S16A - 20, 0.4, 0.25], [LOOKL16, -1.25, 0.05], [FREEZE16 - 2, 1.2, 0.0], [FREEZE16 + 8, 0.55, -1.1], [LOOKR16, -1.25, 0.0], [GRIN16, -0.1, -0.05]]);
  const face = PPL.faceAt(f, [[S16A - 20, "sly"], [FREEZE16 - 1, "brightO"], [FREEZE16 + 11, "bright"], [GO16 + 2, "sly"], [GRIN16 + 4, "smugB"]], 11);
  const whistling = f >= FREEZE16 + 11 && f < GO16 + 2, waggle = 6 * bumpN(f, GRIN16 + 4, 7) + 6 * bumpN(f, GRIN16 + 12, 7), startle = bumpN(f, FREEZE16 - 1, 7);
  /* p3 (D9): a real TAKE on the freeze (down 4 f, pop 3 f, settle), a proud chest puff on the smug finish */
  const tk = PPL.takeAt(f, FREEZE16 - 4, 0.9), puff16 = PPL.chestPuff(f, GRIN16 + 2);
  const P: Pose = { s: sc.s, c: sc.c, walk, go: Math.max(0.12, go), gait: "tiptoe", duck: 0.14 * go - 0.1 * startle, lean: 5 * go - 5 * frz, expr: face.expr, mouth: whistling ? "vU" : undefined, look: gz.look, lookY: gz.lookY, light: L,
    blink: Math.max(gz.blink, face.lid), facing: gz.head < -0.55 ? -1 : gz.head > 0.55 ? 1 : (sc.s > 0.28 ? 1 : sc.s < -0.28 ? -1 : 0), stretch: tk.stretch * puff16.stretch, breath: puff16.breath,
    headTilt: 9 * gz.head - 3 + (whistling ? 5 * Math.sin((f - FREEZE16) / 3.2) : 0), tilt: 3 * gz.head - 3 * frz, nod: (whistling ? -1.2 : 0) + tk.nod + puff16.nod,
    face: { browUp: [waggle + 5 * frz, waggle + 5 * frz] }, armL: aL, armR: aR, hairSwing: 1.5 * Math.sin(TAU * walk * 2) + K.clamp(PPL.lagOf(MK2.go16, f, 9), -8, 8) };
  /* p3 (D9) on his card: surprise ticks as he freezes, one sweat drop while he whistles, a twinkle on the bills when they
     come back out */
  { const A = PPL.anchors("prof", P), fxOn = (f >= FREEZE16 - 1 && f < GO16 + 4) || (f >= GO16 + 5 && f < GO16 + 30);
    K.fig(E, out, cam, "s16hy", h, P, PPL.drawProf, fxOn ? { fxKey: f, fx: (q) => {
      VFX.surpriseLines(q, f, FREEZE16 - 1, A.head, { u: A.u, r: 60, n: 7, life: 13 });
      VFX.sweat(q, f, FREEZE16 + 6, [A.head[0] - 0.86 * A.r, A.head[1] - 0.42 * A.r], { u: A.u, side: -1, f1: GO16 - 3 });
      if (f >= GO16 + 5 && f < GO16 + 30) VFX.sparkles(q, f, [A.hands[0][0] - 10 * A.u, A.hands[0][1] - 30 * A.u], { u: A.u, n: 3, r: 30, f0: GO16 + 5 }); } } : {}); }
  /* the whistle: two or three notes float up from his lips (a soft ghost card: they fade in and out) */
  { const wk = hold(f, FREEZE16 + 10, GO16, 3, 4); if (wk > 0.02) { const A = PPL.anchors("prof", P);
      E.putGhost(out, cam, `s16wh|${f}`, h, (q) => VFX.notes(q, f, [A.head[0] + 1.0 * A.r, A.mouth[1] - 4 * A.u], { u: A.u * 0.85, side: 1, k: wk }), 1); } }
  /* a small dust puff where each tiptoe lands (left where the foot planted; none while he is frozen) */
  STEPS16.forEach((sf, i) => { if (f >= sf && f < sf + 15 && (sf < FREEZE16 - 1 || sf > GO16)) E.putGhost(out, cam, `s16du|${i}|${f}`, s16Hy(sf), (q) => VFX.dust(q, f, sf, [300 + (i % 2 ? 22 : -22), 975], { kind: "stop", u: 1.25 }), 1); });
  // ---- the jogger who nearly catches him: right -> left behind him, a curious look at his back as she passes
  { const B = E.camB(SID.S16, JOG16), hj = MK2.hy16(JOG16), o: V3 = [hj[0] + B.F[0] * 2.1, 0, hj[2] + B.F[2] * 2.1], n = Math.hypot(B.R[0], B.R[2]), d: V3 = [-B.R[0] / n, 0, -B.R[2] / n];
    const a: V3 = [o[0] - d[0] * 2.6, 0, o[2] - d[2] * 2.6], b: V3 = [o[0] + d[0] * 2.6, 0, o[2] + d[2] * 2.6], near = Math.abs(f - JOG16) < 11;
    K.crowd(E, out, cam, { id: "runner", a, b, f0: JOG16 - Math.round(2.6 / (2.4 / 30)), seed: 20 }, f, near ? { expr: "puzzled", look: -0.5, lookY: 0.2, headTilt: 6 } : {},
      { key: Math.floor(f / 2), draw: (q) => VFX.speedLines(q, f, [300, 600], { dir: -1, len: 76, n: 6, h: 200, k: 0.85 }) }); }   /* p3: speed lines trail her */
  // ---- life: pigeons on the path that he sneaks through, two friends strolling along the hedge (left), a dog walker
  //      and a walker far up the path, pigeons crossing the sky
  K.pigeons(E, out, cam, f, [[-1.3, -0.15, 1], [-1.0, 0.4, -1], [-1.55, 0.7, 1], [-0.75, -0.5, -1], [-3.3, -1.4, 1], [-3.7, -0.9, -1]], (t) => [s16Hy(t)], 0, "s16");
  /* p4 (edit audit 14, "sneakier" is a dead second): a PIGEON tiptoes after him on his own line, 0.6 m behind (camera side):
     it FREEZES when he freezes (it copies him), and sneaks on with him; its strut is his walk's rhythm */
  { const pm = m - 0.6, pp0 = MK2.hyM16(pm), B = E.camB(SID.S16, f), n = Math.hypot(B.R[0], B.R[2]), side = 0.22, pp: V3 = [pp0[0] + (B.R[0] / n) * side, 0.02 + 0.02 * Math.abs(Math.sin(TAU * walk)) * go, pp0[2] + (B.R[2] / n) * side];
    const st = { run: E.q(go > 0.15 ? (((walk * 2) % 1) + 1) % 1 : 0.25, 24), flap: 0, wing: 0, peck: 0, lift: 0 }, mir = Math.sin(MK2.HEAD16) * E.camR.x + Math.cos(MK2.HEAD16) * E.camR.z > 0;
    E.putFig(out, cam, `s16pigf|${mir ? 1 : 0}|${JSON.stringify(st)}`, pp, (q) => FX.drawPigeon(q, st), { scale: 0.2, blobSc: 0.3, mirror: mir }); }
  /* this lens sees a narrow cone past him: two friends chatting in front of the round hedge (right third, x 760-1000, clear of
     his peg hand), a dog walker who comes out from behind him on the left once the jogger has gone (x 260 -> 110) */
  K.crowd(E, out, cam, { id: "chatA", a: [-4.62, 0, -6.2], b: [-4.3, 0, -6.47], f0: 0, stand: true, seed: 23 }, f);
  K.crowd(E, out, cam, { id: "chatB", a: [-4.3, 0, -6.47], b: [-4.62, 0, -6.2], f0: 0, stand: true, seed: 24 }, f);
  K.crowd(E, out, cam, { id: "dogwalker", a: [-6.0, 0, -6.4], b: [-5.4, 0, -1.0], f0: S16A - 20, seed: 21 }, f);
  K.pigeonFly(E, out, cam, f, [-5.0, 2.5, -3.5], [1.0, 3.1, -6.0], S16A + 6, S16A + 52, "s16a");
  K.pigeonFly(E, out, cam, f, [-5.6, 2.9, -2.5], [0.6, 3.4, -5.0], S16A + 14, S16A + 62, "s16b");
  K.pigeonFly(E, out, cam, f, [1.2, 2.2, -4.0], [-5.8, 3.0, -2.0], GO16 - 6, GO16 + 40, "s16c");
};

// ================================================================== S17: THE PEG (insert hands) -> HEAD HEIGHT (flat hand)
// The set's bill already hangs at the lowest peg: in the close-up his skin hands on tweed sleeves (an insert card in front
// of the bill) pinch OUR peg drawn exactly over the set's peg (a little bigger, so the set's never shows), squeeze it,
// release: SNAP, the bill swings (billKick), the hands let go one after the other; the pull-back finds him beside the bill.
const S17A = SH("S17").a, S17B = SH("S17").b;
export const SNAP17 = Math.round((BEAT.hung + BEAT.dollarBills) / 2) + 1;
/** Hyman stands LEFT of the lowest bill, under the middle one (the camera's medium frames him + the bill) */
export const HY17: V3 = [-1.32, 0, 5.62];
const FLAT17 = BEAT.rightAt + 2, TOUCH17 = Math.min(S17B - 14, BEAT.headHeight + 2);
/** p3: he winks at the lens once the flat hand has shown the height (the shot's last half second) */
const WINK17 = Math.min(S17B - 12, TOUCH17 + 9);
/** p4: he steps into the frame and stops beside his trap here (the pat and the flat hand follow) */
const IN17 = Math.round(Math.min(FLAT17 - 11, BEAT.onABranch));
const PEG2 = SQ.bills[2].peg;
const s17 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const L = E.light2D(cam), st = PPL.clipAt(f, SNAP17);
  // ---- the insert: our peg over the set's, the two hands (until they have left the frame)
  const I = K.insertAt(E, cam, PEG2, 0.1, 0.35), dI = Math.hypot(cam.pos.x - I.pos[0], cam.pos.y - I.pos[1], cam.pos.z - I.pos[2]), dP = Math.hypot(cam.pos.x - PEG2[0], cam.pos.y - PEG2[1], cam.pos.z - PEG2[2]), u = I.u * (dI / dP);
  const coil = I.map([PEG2[0], PEG2[1] + 0.006, PEG2[2]]), down = I.map([PEG2[0], PEG2[1] - 0.094, PEG2[2]]), pegK = Math.hypot(down[0] - coil[0], down[1] - coil[1]) / (0.74 * 22 * 1.0);
  const pegFade = 1 - ramp(f, BEAT.dollarBills + 10, BEAT.dollarBills + 20);
  const relL = st.relL, relR = st.relR, hands = f < SNAP17 + 22;
  const billTL = I.map([PEG2[0] - 0.125 * Math.cos(0.25), PEG2[1] - 0.012, PEG2[2] + 0.125 * Math.sin(0.25)]);
  const tipL: P2 = [billTL[0] - 30 * u * relL, billTL[1] + 90 * u * relL ** 1.4], dL = -62 + 20 * relL, wL = K.wristFor("grip", tipL, u, -1, dL, 1.25);
  const lever = I.map([PEG2[0], PEG2[1] + 0.062, PEG2[2]]), sq = st.open * 1.5 * u;
  const tipR: P2 = [lever[0] - 1.5 * u + 50 * u * relR - sq, lever[1] - 70 * u * relR ** 1.3], dR = 58 - 50 * relR, kindR: PPL.HandKind = relR > 0.2 ? "open" : "pinch";
  const wR = K.wristFor(kindR, tipR, u, -1, dR, 1.3);
  if (pegFade > 0.01 && f < S17B + 6) {
    const key = `s17ins|${E.fkey({ coil, pegK, o: E.q(st.open, 12), sn: E.q(st.snap, 8), hands, tipL, tipR, kindR, pegFade: E.q(pegFade, 10) })}`;
    K.putInsert(E, out, cam, key, I, (p: Pen) => {
      const g = p.g;
      if (hands && relL < 1) K.sleeveHand(p, [wL[0] - Math.cos((dL * Math.PI) / 180) * 120 * u, wL[1] - Math.sin((dL * Math.PI) / 180) * 120 * u], wL, "grip", u, -1, 10, 1.25, FIT.PROF.shirt, "#f6f3ec", 13);
      g.save(); g.globalAlpha = pegFade; g.filter = "brightness(1.14) saturate(0.72)"; g.translate(coil[0], coil[1]); g.scale(0.75 * (1 + 0.05 * st.snap), 1 - 0.1 * st.snap); g.translate(-coil[0], -coil[1]);
      FX.drawPeg(p, coil, pegK, 180, 1.7 * st.open, 1.0); g.filter = "none"; g.restore();
      if (hands && relR < 1) K.sleeveHand(p, [wR[0] - Math.cos((dR * Math.PI) / 180) * 130 * u, wR[1] - Math.sin((dR * Math.PI) / 180) * 130 * u], wR, kindR, u, -1, kindR === "open" ? 25 * relR : -6, 1.3, FIT.PROF.shirt, "#f6f3ec", 13);
      if (st.snap > 0.05) for (const sd of [-1, 1]) for (const a of [-30, 0, 30]) { const r0 = (16 + 26 * (1 - st.snap)) * u, r1 = r0 + 12 * u, an = (a * Math.PI) / 180, cy = coil[1] + 18 * u;
        p.stroke([[coil[0] + sd * r0 * Math.cos(an), cy + r0 * Math.sin(an)], [coil[0] + sd * r1 * Math.cos(an), cy + r1 * Math.sin(an)]], 3.6 * u, "#2c1e2a");
        p.stroke([[coil[0] + sd * r0 * Math.cos(an), cy + r0 * Math.sin(an)], [coil[0] + sd * r1 * Math.cos(an), cy + r1 * Math.sin(an)]], 1.6 * u, "#fff6c8"); }
    });
  }
  /* p3 (D9): the SNAP pops: a comic burst behind the peg (between the bill and the hands' card) + stars flying out of it */
  /* p4 (look audit: the white burst + stars covered the bill's "1" on "dollar"): a smaller burst centred on the peg's
     spring (ABOVE the bill), the stars thrown up and out from it */
  if (f >= SNAP17 && f <= SNAP17 + 14) { const pp = K.toPx(E, SID.S17, f, [PEG2[0], PEG2[1] + 0.03, PEG2[2]]), wpx = 0.62 / K.mPx(E, SID.S17, f, pp[2]);
    K.scrFx(E, out, SID.S17, f, `s17pop|${f}`, 256, 256, (q) => VFX.popBurst(q, f, SNAP17, [128, 128], { u: 1.5, r: 15 }), pp[0], pp[1], pp[2] - 0.05, wpx, wpx, 0, true);
    K.scrFx(E, out, SID.S17, f, `s17star|${f}`, 256, 256, (q) => VFX.impactStars(q, f, SNAP17, [128, 92], { u: 1.7, n: 4 }), pp[0], pp[1], pp[2] - 0.14, wpx, wpx, 0, true); }
  // ---- Hyman: p4 (audit: his half face rose along the left edge in the pull-back) he STEPS IN from the left as the lens
  //      pulls back, stops beside his trap on "branch" and turns to us; then the pat on his head and the flat hand, proud
  const hd = Math.atan2(cam.pos.x - HY17[0], cam.pos.z - HY17[2]), life = PPL.holdLife(f, 7, 0.8);
  const Rin = E.camB(SID.S17, FLAT17).R, rn = Math.hypot(Rin[0], Rin[2]), dirIn: V3 = [Rin[0] / rn, 0, Rin[2] / rn];
  const swk = PPL.stopWalk(f, IN17, "walk"), hyP: V3 = [HY17[0] + dirIn[0] * swk.metres, 0, HY17[2] + dirIn[2] * swk.metres], stp = PPL.stopAt(f, IN17);
  const walkH = Math.atan2(dirIn[0], dirIn[2]), faceH = turnH(hd, -12), tw = sm((f - (IN17 - 4)) / 9), hdg = walkH + ((((faceH - walkH + 3 * Math.PI) % TAU) + TAU) % TAU - Math.PI) * tw;
  const sc = E.orientSC(cam, hyP, hdg), so17 = PPL.stopOverlap(f, IN17, sc.s >= 0 ? 1 : -1, 0.9);
  const flat = PPL.flatHand(f, FLAT17, 1), headTop = K.onFig(E, cam, hyP, [hyP[0], 1.7, hyP[2]]);
  const pat = PPL.gestureBack(f, FLAT17 - 10, FLAT17 - 1, { ant: 3, move: 5, over: 0.1 });
  const armR: Arm | undefined = f < IN17 - 2 ? undefined : f < FLAT17 - 1 ? { to: "hang", to2: [headTop[0] + 6, headTop[1] - 6], k: pat, hand: "flat", hs: 1.25, ang: 80 } : flat;
  const face = PPL.faceAt(f, [[S17A - 20, "brightGrin"], [FLAT17 - 14, "proudB"]], 12);
  const gz = PPL.lookAt(f, [[S17A - 20, 0.8, -0.2], [IN17 - 2, 0.2, -0.1], [FLAT17 - 4, 0.9, -0.5], [TOUCH17 + 6, 0, 0]]);
  /* p3 (D9): a proud chest puff as he steps back from his trap; a WINK at us with a twinkle after the flat hand (the extra gag) */
  const puff17 = PPL.chestPuff(f, FLAT17 - 12), wink17 = f >= WINK17 && f < WINK17 + 9;
  const squint17 = f >= WINK17 - 3 && f < WINK17 ? 0.5 : 0;   /* p4: a 3 f anticipation squint into the wink */
  const P: Pose = { s: sc.s, c: sc.c, walk: swk.walk, go: swk.go, gait: "walk", feet: f > IN17 - 8 ? swk.feet : undefined, ...life, ...so17, expr: face.expr, look: gz.look + life.look * 0.4, lookY: gz.lookY, blink: wink17 ? 0 : Math.max(life.blink, gz.blink, face.lid, squint17), light: L,
    nod: 1.2 * bumpN(f, TOUCH17, 12) + 0.6 * bumpN(f, FLAT17 + 4, 10) + puff17.nod + 0.8 * bumpN(f, WINK17 - 1, 8), headTilt: life.headTilt + 4 * ramp(f, FLAT17, FLAT17 + 10) + 4 * bumpN(f, WINK17 - 1, 10), tilt: (life.tilt ?? 0) + stp.tilt * (sc.s >= 0 ? 1 : -1),
    breath: (life.breath ?? 0) + puff17.breath, stretch: puff17.stretch, face: wink17 ? { wink: 1 } : undefined,
    armR, armL: f < IN17 - 2 ? undefined : { to: "hang", to2: "hip", k: PPL.gesture(f, FLAT17 - 10, { move: 8 }), hand: "fist" } };
  { const A = PPL.anchors("prof", P), on = f >= WINK17 && f < WINK17 + 13;
    K.fig(E, out, cam, "s17hy", hyP, P, PPL.drawProf, on ? { fxKey: f, fx: (q) => VFX.impactStars(q, f, WINK17 + 1, [A.head[0] + 0.62 * A.r, A.head[1] - 0.12 * A.r], { u: A.u * 0.8, n: 3 }) } : {}); }
  /* his footsteps' dust as he stops beside the bill */
  if (f >= IN17 && f < IN17 + 15) E.putGhost(out, cam, `s17ds|${f}`, hyP, (q) => VFX.dust(q, f, IN17, [300, 975], { kind: "stop", u: 1.2 }), 1);
  // ---- life: walkers on the far path, a cyclist, pigeons at his feet, a petal or two
  K.pigeons(E, out, cam, f, [[-1.9, 6.3, 1], [-0.6, 6.6, -1], [-1.6, 4.4, 1]], () => [], 0, "s17");
  K.crowd(E, out, cam, { id: "backpack", a: [-4.2, 0, 1.6], b: [2.0, 0, -0.4], f0: S17A - 10, seed: 25 }, f);
  K.crowd(E, out, cam, { id: "elder", a: [-3.6, 0, 1.0], b: [1.0, 0, -0.5], f0: S17A - 80, seed: 26 }, f);
  K.crowd(E, out, cam, { id: "cyclist", a: [3.5, 0, -2.0], b: [-4.5, 0, -1.2], f0: S17A + 10, seed: 27 }, f);
};

// ================================================================== S18: THE LIMBO (three walkers, three ducks)
const S18A = SH("S18").a, S18B = SH("S18").b;
type Ducker = { id: "scarf" | "parka" | "elder"; T: number; at: V3; dir: V3; amt: number; o: PPL.DuckOpt; lean: number; seed: number; expr: Expr; kick: number; v: number };
/** v2 rig head tops (heights.mjs): tall 1.57 m, standard 1.52, round + flat cap ~1.52; the lowest bill's bottom is 1.47 m:
 *  the amounts put each head ~8-14 cm under it at the lowest point (25-40 px at 540 in the S18 lens) */
const DUCKS18: Ducker[] = (() => {
  /* p3: walker 2 dips as "ducked" begins; 23 f / 20 f apart; walker 3 (a quick cap-holding dip) is up again before the cut */
  /* p4 (audit: walkers 1 and 2 head-to-head f1774-1784): walker 2 comes 5 f later and walker 1 hurries off harder (extra18) */
  const T2 = Math.round(BEAT.ducked + 4), T1 = Math.max(S18A + 8, T2 - 28), T3 = Math.min(S18B - 9, T2 + 18);
  /* at = the FEET at the lowest point: offset along the walk so the head (leaning with the duck) is under bill 2; set in s18b.
     kick < 0: the head pushes the bill's bottom edge toward the lens (they come from behind it); |0.9| = ~17 deg (the lens is low: more goes edge-on) */
  return [
    { id: "scarf", T: T1, at: [0, 0, 0], dir: [0, 0, 0], amt: 0.46, o: { lift: 2, drop: 4, hold: 6, rise: 7 }, lean: 0, seed: 31, expr: "wince", kick: -0.95, v: 1.5 },
    { id: "parka", T: T2, at: [0, 0, 0], dir: [0, 0, 0], amt: 0.25, o: { lift: 4, drop: 7, hold: 8, rise: 9 }, lean: -26, seed: 32, expr: "brightGrin", kick: -0.8, v: 1.5 },
    { id: "elder", T: T3, at: [0, 0, 0], dir: [0, 0, 0], amt: 0.55, o: { lift: 2, drop: 5, hold: 5, rise: 7 }, lean: 6, seed: 33, expr: "bright", kick: -0.9, v: 1.1 },
  ];
})();
/** extra metres: walker 1 hurries off after his dip (no bunching with walker 2) */
const extra18 = (D: Ducker, f: number) => (D.id === "scarf" ? 0.75 * ramp(f, D.T + 5, D.T + 26) : 0);
/** the head's lead (m, along the walk) at the lowest point: a profile duck folds the torso forward, a limbo leans it back */
const LEAD18: Record<string, number> = { scarf: 0.1, parka: -0.22, elder: 0.14 };
const B2H: V3 = [SQ.bills[2].peg[0], 0, SQ.bills[2].peg[2]];
/** their direction: straight across the S18 lens, right -> left (the camera's -right on the ground, mid-shot) */
const dir18 = (E: Eng): V3 => { const R = E.camB(SID.S18, (S18A + S18B) / 2).R, n = Math.hypot(R[0], R[2]); return [-R[0] / n, 0, -R[2] / n]; };
/** the three duckers drawn with their walks (crowd helper can't stride + duck, so: own draw) */
const s18b = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  for (const D of DUCKS18) {
    const d = dir18(E), v = D.v / 30, m = (f - D.T) * v + extra18(D, f), lead = LEAD18[D.id] ?? 0, p: V3 = [B2H[0] + d[0] * (m - lead), 0, B2H[2] + d[2] * (m - lead)];
    if (m < -2.4 || m > 2.8) continue;
    const dk = PPL.duckAt(f, D.T, { ...D.o, amt: D.amt }), lag = PPL.duckLag(f, D.T, { ...D.o, amt: D.amt });
    const sc = E.orientSC(cam, p, Math.atan2(d[0], d[2])), near = Math.abs(f - D.T) < 13;
    const base = K.crowdPoseOf(D.id, f, { s: sc.s, c: sc.c, metres: m + 9 * D.seed, light: E.light2D(cam), seed: D.seed }); base.walk = PPL.walkPhase(m + 9 * D.seed, D.v > 1.2 ? "walk" : "stroll");
    const P: Pose = { ...base, duck: dk, lean: D.lean * clamp(dk / D.amt, 0, 1), hairSwing: lag, pack: lag * 0.6, expr: near ? D.expr : base.expr, lookY: near ? (D.id === "parka" ? -0.7 : 0.5) : base.lookY, look: near ? 0.15 : base.look,
      mouth: near ? (D.id === "scarf" ? "teeth" : D.id === "elder" ? "vM" : "laugh") : base.mouth };
    if (D.id === "parka" && near) { const k = clamp(dk * 1.5, 0, 1); P.armL = { fk: [120, 112], fkK: k, hand: "open", hs: 1.2 }; P.armR = { fk: [120, 112], fkK: k, hand: "open", hs: 1.2 }; }
    /* p4 (audit: "give walker 3 a phone at his ear, so 'On a phone?' has its picture"): the elder is ON A CALL the whole way:
       he chats, ducks without ever looking up (the body dodges, the mind is on the call), his free hand pressing his cap down */
    if (D.id === "elder") { const k = PPL.gestureBack(f, D.T - 9, D.T + 9, { move: 5 }), ch = PPL.phoneChat(f, 33);
      Object.assign(P, PPL.bodyArms(false, PPL.phoneArm(C.phoneBlue), { to: "hang", to2: "guard", k, hand: "grip", front: true, hs: 1.15 }));
      P.expr = ch.laughing ? "laughBig" : "bright"; P.mouth = ch.mouth; P.nod = ch.nod; P.look = 0.05; P.lookY = 0.12; }
    if (D.id === "scarf" && near) { P.headTilt = -5; P.stretch = 1 - 0.04 * bumpN(f, D.T - 6, 10); }
    /* p3 (D9): everything that hangs lags the dip and settles (scarf ends, coat hems, the lanyard); the first walker's near
       miss costs him a sweat drop */
    { const ov = PPL.overlapAll((t) => 16 * PPL.duckAt(t, D.T, { ...D.o, amt: D.amt }), f); P.flutter = ov.flutter; P.cardSwing = ov.cardSwing; }
    const swOn = D.id === "scarf" && f >= D.T - 3 && f < D.T + 15, sd18 = sc.s >= 0 ? 1 : -1;
    E.putFig(out, cam, `s18d|${D.id}|${E.fkey(P)}${swOn ? `|${f}` : ""}`, p, (q) => { K.drawCrowdId(q, D.id, P);
      if (swOn) { const A = PPL.figAnchors(CROWD.CROWD[D.id].o, P); VFX.sweat(q, f, D.T - 3, [A.head[0] - sd18 * 0.84 * A.r, A.head[1] - 0.5 * A.r], { u: A.u, side: -sd18, n: 2 }); } });
  }
  // ---- life: pigeons in front of the low lens (they hop off as the walkers come), a dog walker far, a cyclist far
  K.pigeons(E, out, cam, f, [[-0.3, 7.05, 1], [0.35, 7.45, -1], [-0.9, 7.9, 1], [0.9, 6.6, -1]], (t) => DUCKS18.map((D) => { const d = dir18(E), m = (t - D.T) * D.v / 30 + extra18(D, t) - (LEAD18[D.id] ?? 0); return [B2H[0] + d[0] * m, 0, B2H[2] + d[2] * m] as V3; }), 0, "s18");
  K.crowd(E, out, cam, { id: "dogwalker", a: [3.0, 0, -2.0], b: [-4.0, 0, -0.5], f0: S18A - 40, seed: 34 }, f);
  K.crowd(E, out, cam, { id: "cyclist", a: [-5.0, 0, -4.0], b: [6.0, 0, -6.0], f0: S18A - 10, seed: 35 }, f);
  K.crowd(E, out, cam, { id: "tote", a: [1.8, 0, 0.0], b: [-3.5, 0, 2.2], f0: S18A - 60, seed: 36 }, f);
};

// ================================================================== S19: ON A PHONE? (the phone guy ducks and walks on; she STOPS)
// p3 (audit M3, D7): the PHONE GUY comes down the path at us chatting, ducks under the lowest bill without a look (it swings
// hard), peels off to the left and out. A NO-PHONE walker (navy beret, both arms swinging free) follows him down the path,
// watches him duck, looks UP, stops dead on "stopped" and HOPS to swat the bill on "money": it swings, she is delighted.
const S19A = SH("S19").a, S19B = SH("S19").b;
const PDUCK19 = Math.round(BEAT.phoneQ + 4);
const STOP19 = Math.round(BEAT.stoppedFor + 1), SEE19 = STOP19 + 2;
/** p4 (audit M3): THE GRAB. Her hand starts to rise at REACH19 (the eyes lead it, 6 f), PINCHES the bill's lower corner on
 *  "money" (DESIGN's reachBill: pinch at REACH19 + 9), TUGS it twice (+13, +24: the bill swings on billKick and her hand
 *  rides the swinging corner), sparkle eyes from the pinch, a gleeful hunch + giggle, a fist "yes!" with the free hand,
 *  and a beaming glance at us at the end, still holding the money. No hops (they dipped her head out of frame) */
const PINCH19 = Math.max(SEE19 + 10, Math.round(BEAT.theMoney25)), REACH19 = PINCH19 - 9, TUGS19 = [PINCH19 + 4, PINCH19 + 15];
const GLEE19 = PINCH19 + 7, LENS19 = Math.min(S19B - 9, PINCH19 + 17);
/** she is drawn 10 % larger in S19 only: the v2 small build cannot reach the lowest bill's corner (1.47 m) */
const K19 = 1.1;
/** the phone guy's line (LOOK's board on its crate fills x -0.85 .. 0.05 at z 6-6.6 and hides the path under the bill's
 *  middle from this lens): down the path's west edge, his head under the bill's LEFT end at G19U, 0.15 m on, then a right
 *  turn (radius 0.55 m, 75 deg) and out past the left edge of the frame, clear of the crate. s = metres past G19U */
const G19A: V3 = [-1.12, 0, 0.5], G19U: V3 = [-1.0, 0, 5.48], G19H = Math.atan2(G19U[0] - G19A[0], G19U[2] - G19A[2]), G19R = 0.55, G19TH = (75 * Math.PI) / 180, G19S0 = 0.15;
const guy19 = (s: number): { p: V3; heading: number } => {
  if (s <= G19S0) return { p: [G19U[0] + Math.sin(G19H) * s, 0, G19U[2] + Math.cos(G19H) * s], heading: G19H };
  const p0: V3 = [G19U[0] + Math.sin(G19H) * G19S0, 0, G19U[2] + Math.cos(G19H) * G19S0], a = Math.min(G19TH, (s - G19S0) / G19R), h = G19H - a, rest = Math.max(0, s - G19S0 - G19R * G19TH);
  return { p: [p0[0] + G19R * (Math.cos(h) - Math.cos(G19H)) + Math.sin(h) * rest, 0, p0[2] + G19R * (Math.sin(G19H) - Math.sin(h)) + Math.cos(h) * rest], heading: h };
};
/** she stops a step in FRONT of the bill's plane (her raised hand is drawn over the bill), left of its corner; she comes
 *  down a line a little west of his (visible beside him while he ducks) */
const STOPPER19: V3 = [-1.36, 0, 5.84], HS19 = Math.atan2(0.68, 3.34);   /* 0.4 m left of the corner: her arm goes up and OUT to it, clear of her own head */
/** two glints in her pupils (bright eyes; the geometry of toon.ts faceFront: eyes at the head centre + 7u * facing +- 13.5u,
 *  the pupil pushed by look / lookY): white 4-point stars that twinkle */
const sparkleEyes = (q: Pen, A: PPL.Anchors, facing: number, look: number, lookY: number, f: number, k: number) => {
  const u = A.u, lx = clamp(look, -1.4, 1.4) / 1.4, ly = clamp(lookY, -1.4, 1.4) / 1.4, n = Math.max(1, Math.hypot(lx, ly));
  for (const sd of [-1, 1]) { const ex = A.head[0] + 7 * u * facing + sd * 13.5 * u, ey = A.head[1] + 1.2 * u, px = ex + (lx / n) * 2.3 * u, py = ey + (ly / n) * 3.3 * u + 0.4 * u;
    const r = k * (4.6 + 1.2 * Math.sin(f / 2.2 + sd)) * u; if (r > 0.3 * u) { star4(q, px - 1.2 * u, py - 1.4 * u, r, "#ffffff", 0); star4(q, px + 2 * u, py + 1.6 * u, r * 0.45, "#fff7c0", 0); } }
};
const s19 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const L = E.light2D(cam);
  // ---- the PHONE GUY (red phone): at the lens, ducks at PDUCK19, walks on briskly to the left edge
  { const x = clamp((f - PDUCK19 - 4) / 12, 0, 1), m = (f - PDUCK19) * (0.95 / 30) + (0.35 / 30) * (6 * x * x + Math.max(0, f - PDUCK19 - 16)), s = m + 12, lp = guy19(m);
    if (m > -5.2 && m < 3.2) { const sc = E.orientSC(cam, lp.p, lp.heading), ch = PPL.phoneChat(f, 2), DO: PPL.DuckOpt = { lift: 3, drop: 6, hold: 6, rise: 9, amt: 0.46 };
      const P: Pose = { s: sc.s, c: sc.c, walk: PPL.walkPhase(s, "phone"), go: 1, gait: "phone", duck: PPL.duckAt(f, PDUCK19, DO), hairSwing: PPL.duckLag(f, PDUCK19, DO), expr: ch.laughing ? "laughBig" : "bright", mouth: ch.mouth, nod: ch.nod,
        light: L, blink: PPL.blinkAt(f, 2), look: 0.1, lookY: 0.15, ...PPL.bodyArms(sc.c < -0.35, PPL.phoneArm(C.phoneRed), PPL.talkHand(f, 2, true)) };
      K.fig(E, out, cam, "s19guy", lp.p, P, PPL.drawPhoneGuy); } }
  // ---- the STOPPER: no phone, hands free; watches him duck, looks up, stops, REACHES, pinches and tugs the bill (p4)
  { const sw = PPL.stopWalk(f, STOP19, "walk"), p: V3 = [STOPPER19[0] + Math.sin(HS19) * sw.metres, 0, STOPPER19[2] + Math.cos(HS19) * sw.metres], sc = E.orientSC(cam, p, HS19), stop = PPL.stopAt(f, STOP19);
    const base = K.crowdPoseOf("beret", f, { s: sc.s, c: sc.c, light: L, seed: 51 });
    /* the hand's target: just inside the bill's lower-left corner (the fingertips land ON the paper; reachBill aims 6 u lower) */
    const corner = billPt(E, 2, -0.2, -0.235, f), grab = billPt(E, 2, -0.185, -0.215, f), tgt = K.onFig(E, cam, p, grab, K19);
    const rb = PPL.reachBill(f, REACH19, tgt, 1);
    const gz = PPL.lookAt(f, [[S19A - 30, 0.0, 0.1], [PDUCK19 + 2, 0.15, 0.35], [PDUCK19 + 13, -1.05, 0.2], [STOP19 - 13, 1.0, -1.25], [REACH19 - 4, 1.1, -1.05], [LENS19, 0.0, -0.05]]);   /* ... UP at the bill, ON the corner as the hand goes; a beaming glance at us at the end */
    const face = PPL.faceAt(f, [[S19A - 30, "bright"], [PDUCK19 + 5, "puzzled"], [STOP19 - 11, "brightO"], [SEE19 + 5, "delightB"]], 12);
    /* p3 (D9): a take as she sees the money, her hair and bag swing on after the stop; p4: a gleeful hunch + giggle while she holds it */
    const tk19 = PPL.takeAt(f, SEE19 - 4, 0.8), ls19 = PPL.laughShake(f, GLEE19, S19B + 12, 0.55), so19 = PPL.stopOverlap(f, STOP19, sc.s >= 0 ? 1 : -1, 1.1);
    const hunch = PPL.gesture(f, GLEE19, { ant: 3, move: 5, over: 0.2, settle: 8 }), up19 = ramp(f, STOP19 - 13, STOP19 - 5), atUs = ramp(f, LENS19, LENS19 + 5);
    const pump = PPL.gestureBack(f, PINCH19 + 2, S19B + 10, { ant: 3, move: 5, over: 0.18, settle: 7 }), pumpY = -7 * bumpN(f, PINCH19 + 8, 6) - 6 * bumpN(f, PINCH19 + 16, 6);
    const P: Pose = { ...base, walk: sw.walk, go: sw.go, feet: f > STOP19 - 8 ? sw.feet : undefined, expr: face.expr, mouth: f >= GLEE19 ? "laugh" : undefined, light: L,
      look: gz.look, lookY: gz.lookY, blink: f >= PINCH19 - 2 ? 0 : Math.max(gz.blink, face.lid, f > STOP19 - 13 ? 0 : PPL.blinkAt(f, 51)),   /* (the sparkle eyes stay open) */
      ...so19, nod: -1.9 * up19 * (1 - 0.7 * atUs) + tk19.nod + ls19.nod + rb.nod * (1 - atUs) + 1.1 * hunch, headTilt: 5 * up19 * (1 - atUs) + ls19.headTilt + rb.headTilt + 6 * atUs, facing: f >= STOP19 - 11 && f < LENS19 + 3 ? 1 : base.facing,
      tilt: stop.tilt * 0.4 - 2 * hunch, duck: stop.duck + rb.duck, stretch: tk19.stretch * ls19.stretch * rb.stretch * (1 - 0.035 * clamp(hunch, 0, 1.2)),
      face: { browUp: PPL.browsUp(f, STOP19 - 11, Infinity, 8).map((v, i) => v + rb.browUp[i]) as [number, number] },
      armR: f >= REACH19 - 4 ? { ...rb.arm, hs: 1.45 } : undefined,
      armL: f >= PINCH19 - 1 ? { to: "hang", to2: "chest", k: clamp(pump, -0.1, 1.1), dx: -4, dy: pumpY, hand: "fist", front: true, hs: 1.2 } : undefined };
    const sparkK = ramp(f, PINCH19 - 1, PINCH19 + 2);
    { const fx = f >= PINCH19 - 1 ? { fxKey: f, fx: (q: Pen) => { const A = PPL.figAnchors(CROWD.CROWD.beret.o, P); sparkleEyes(q, A, P.facing ?? 1, P.look ?? 0, P.lookY ?? 0, f, sparkK); } } : {};
      K.fig(E, out, cam, "s19stop", p, P, (q, pp) => K.drawCrowdId(q, "beret", pp), { scale: K19, ...fx }); }
    /* dust: her hard stop (a ghost card on the ground where she stands) */
    const g19: V3 = [p[0], 0, p[2]];
    if (f >= STOP19 && f < STOP19 + 17) E.putGhost(out, cam, `s19ds|${f}`, g19, (q) => VFX.dust(q, f, STOP19, [300, 975], { kind: "stop", u: 1.7 }), K19);
    /* the money GLINTS where her fingers pinch it (a few twinkles at the corner, in front of the bill) */
    if (f >= PINCH19 && f <= PINCH19 + 22) { const cpx = K.toPx(E, SID.S19, f, corner), wpx = 0.9 / K.mPx(E, SID.S19, f, cpx[2]);
      K.scrFx(E, out, SID.S19, f, `s19glint|${f}`, 256, 256, (q) => VFX.sparkles(q, f, [128, 128], { u: 1.6, n: 4, r: 52, f0: PINCH19, k: 1 - ramp(f, PINCH19 + 14, PINCH19 + 22) }), cpx[0], cpx[1], cpx[2] - 0.12, wpx, wpx, 0, true); }
    /* each TUG: three little yank ticks flick off the corner (6 f), so the pull reads at phone size */
    for (const t0 of TUGS19) { const k = (f - t0 + 1) / 7; if (k > 0 && k < 1) { const cpx = K.toPx(E, SID.S19, f, corner), wpx = 0.32 / K.mPx(E, SID.S19, f, cpx[2]);
      K.scrFx(E, out, SID.S19, f, `s19yank|${E.q(k, 14)}`, 256, 128, (q) => K.drawTicks(q, k), cpx[0] - 0.2 * wpx, cpx[1] + 0.32 * wpx, cpx[2] - 0.14, wpx, wpx * 0.5, 0.5, true); } } }
  // ---- life: walkers far on the plaza, a cyclist, pigeons round the board
  K.pigeons(E, out, cam, f, [[0.6, 7.2, -1], [-0.3, 7.6, 1], [1.0, 6.8, 1]], () => [], 0, "s19");
  K.crowd(E, out, cam, { id: "scarf", a: [4.0, 0, -1.5], b: [-4.5, 0, -0.5], f0: S19A - 30, seed: 38 }, f);
  K.crowd(E, out, cam, { id: "cyclist", a: [-6.0, 0, -2.5], b: [7.0, 0, -4.0], f0: S19A + 10, seed: 39 }, f);
  K.crowd(E, out, cam, { id: "backpack", a: [4.5, 0, -6.5], b: [-4.0, 0, -5.0], f0: S19A - 70, seed: 40 }, f);
  K.crowd(E, out, cam, { id: "chatA", a: [4.6, 0, 2.6], b: [5.2, 0, 2.2], f0: 0, stand: true, seed: 41 }, f);
  K.crowd(E, out, cam, { id: "chatB", a: [5.2, 0, 2.2], b: [4.6, 0, 2.6], f0: 0, stand: true, seed: 42 }, f);
};

// ================================================================== S20: SLOW MOTION (the hero dips under the bill, her mind
// laughs in the call bubble). f = S20's picture time (remap.ts ~45 %): every motion here runs on it, so it is all slow.
// p3: the bill sits right of centre (camera) so the bubble is whole in the frame's left; her hair really drags the bill
// (it lifts toward the lens and swings on behind her head); a head tilt + shoulder tuck; the ponytail lags; then, on
// "never saw it", a petal drifts down and lands on her nose: she does not blink, the mind laughs on in the kitchen.
const S20A = SH("S20").a, S20B = SH("S20").b;
const TD20 = pt(SID.S20, BEAT.dodged), TM20 = pt(SID.S20, BEAT.minds), TA20 = pt(SID.S20, BEAT.theirMinds);
const P20A = pt(SID.S20, S20A), P20B = pt(SID.S20, S20B);
/** under bill 2 at TD20; she walks on toward the lens and a little to its right: her face ends at ~0.65 of the width,
 *  clear of the bubble, the bill swinging above / behind her hair */
const U20: V3 = [-0.77, 0, 5.5], D20: V3 = [Math.sin(0.83), 0, Math.cos(0.83)];
const V20 = 0.46 / 30, K20 = 1.15;
/** her drawn scale: 1.15 through the approach and the dip (the v2 rig's small build is 1.45 m, the bill's bottom 1.47 m),
 *  easing to 1.04 while she rises and comes toward the lens (the perspective growth hides it) */
const k20 = (f: number) => K20 - 0.11 * ramp(f, TD20 + 3, TD20 + 17);
const B20: [number, number] = [232, 535], SZ20 = 400;   /* x 64-400, y 367-703: whole, inside the safe zone, clear of bill 2 */
/** p4 (audit R1, the viewer's 64-68 s dip): on "Their minds" the lens cranes up off her blank face to the swinging bill
 *  (cams_v2.ts camS20, the same smootherstep over UP20 picture frames from TA20 - 1) and the mind bubble GROWS and comes in
 *  toward the middle with it (x 10-550, y 270-810 at the end: whole, clear of the bill's "1") */
const UP20 = 20, glide20 = (f: number) => { const x = clamp((f - (TA20 - 1)) / UP20, 0, 1); return x * x * x * (x * (6 * x - 15) + 10); };
const B20At = (f: number): [number, number] => { const e = glide20(f); return [B20[0] + (280 - B20[0]) * e, B20[1] + (540 - B20[1]) * e]; };
const SZ20At = (f: number) => SZ20 + 140 * glide20(f);
/** the mind in the bubble laughs on "Their", on "minds" and on "saw it", and chats between (never stops) */
const SAW20 = pt(SID.S20, (BEAT.neverSaw26 + BEAT.mindsEnd) / 2 - 1.5);
/** the dip (picture frames): a 2 f rise on the toes, a 5 f drop, the lowest point held 8 f round "dodged", a 9 f rise;
 *  her hair passes ~1.5 cm under the bill's edge: the kick (billKick, 2 f before) lifts the bill off it */
const DUCK20: PPL.DuckOpt = { lift: 2, drop: 5, hold: 8, rise: 9, amt: 0.47 };
/** the petal lands on her nose here (picture time), after falling for PETN picture frames */
const PET20 = pt(SID.S20, BEAT.neverSaw26) + 1, PETN = 26;
const HR20 = (() => { const R = rig(FIT.HERO, { mode: "stand", noLegs: true, seed: 1 } as PersonOpts); return { nose: (975 - R.hc - 0.14 * R.H.b) * 0.00216 }; })();
const s20 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const id = SID.S20, m = (f - TD20) * V20, h: V3 = [U20[0] + D20[0] * m, 0, U20[2] + D20[2] * m], hd = Math.atan2(D20[0], D20[2]);
  const DO = DUCK20, dk = PPL.duckAt(f, TD20, DO), dkc = clamp(dk / DO.amt!, 0, 1), lag = PPL.duckLag(f, TD20, DO, 52);
  const brush = bumpN(f, TD20 - 2, 13), KK = k20(f);
  const P = heroPose(E, cam, h, hd, m + 40, f, 1, { duck: dk, hairSwing: lag * 1.3 - 16 * brush, pack: lag * 0.6, lookY: 0.08, nod: 0.9 * dkc, tilt: 3.5 * dkc, headTilt: -3 + 11 * dkc });
  K.fig(E, out, cam, "s20hero", h, P, PPL.drawHero, { scale: KK });
  const R = E.camR, dH = K.toPx(E, id, f, up(h, 1.2))[2];
  /* p4: the mind laughs on "Their", on "minds" (a pop) and again on "saw it" (a pop), chatting with her gran between: it never stops */
  const st = { inn: 1, on: 1, arr: 1, pop: Math.max(bumpN(f, TA20 - 1, 8), bumpN(f, TM20 - 1, 8), bumpN(f, SAW20 - 1, 8)),
    laugh: Math.max(hold(f, TA20 - 2, TA20 + 2.5, 2, 1.5), hold(f, TM20 - 1, PET20 - 1, 1.5, 1.5), hold(f, SAW20 - 1, P20B + 9, 1.5, 3)), lift: 0, ride: 0, inB: 1, sig: 1 };
  const mindP: Pose = { go: 0, expr: "laughBig" };
  callFx(E, out, id, f, [h[0] - R.x * 0.3 * KK, (1.27 - 0.2 * dkc) * KK, h[2] - R.z * 0.3 * KK], up(h, 1.45 * KK), Math.min(dH - 0.3, 2.6), B20At(f), SZ20At(f), st, mindP, -1e9);
  // ---- the petal: falls through the slow air, lands on her nose at PET20, stays (it rides her walk's bob); she never blinks
  if (f >= PET20 - PETN) { const t = f - PET20, ph = PPL.walkPhase(m + 40, "phone"), sp = (((2 * ph) % 1) + 1) % 1, gd = PPL.GAIT.phone, bob = gd.bob * (0.5 + 0.5 * Math.cos(TAU * (sp - gd.low)));
    const nose = K.toPx(E, id, f, [h[0], (HR20.nose - bob) * KK, h[2]]), fall = Math.max(0, -t), upx = (E.SU * KK) / K.mPx(E, id, f, nose[2]);
    const px = nose[0] + fall * 3.2 * Math.sin(fall / 2.6) * upx, py = nose[1] - fall * 24 * upx, rot = t < 0 ? fall * 0.22 : 0.35 + 0.05 * Math.sin(f / 5);
    K.scrFx(E, out, id, f, `s20nose|${E.q(rot, 30)}|${E.q(upx, 20)}`, 96, 64, (q) => { const g = q.g; g.fillStyle = "#f9c9d8"; g.strokeStyle = "#b9728a"; g.lineWidth = 5; g.beginPath(); g.ellipse(48, 32, 38, 20, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = "#e79ab4"; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 32); g.lineTo(78, 32); g.stroke(); }, px, py, Math.max(0.4, nose[2] - 0.25), 26 * upx, 17 * upx, rot, true); }
  // ---- slow-motion life: petals drifting past the lens, a pigeon flapping slowly behind, walkers soft in the distance
  for (let k = 0; k < 6; k++) { const ph = (((f - S20A) * 0.004 + k / 6) % 1 + 1) % 1, px = 120 + ((k * 173) % 860) + 60 * Math.sin(f / 9 + k), py = -40 + 2000 * ph, rot = (f / 7 + k) % TAU;
    K.scrFx(E, out, id, f, `s20pet|${k}|${E.q(rot, 6)}`, 64, 48, (p) => { p.g.fillStyle = "#f6c6d4"; p.g.beginPath(); p.g.ellipse(32, 24, 26, 14, 0, 0, TAU); p.g.fill(); p.g.strokeStyle = "#c8869a"; p.g.lineWidth = 3; p.g.stroke(); },
      px, py, 1.1 + 0.25 * (k % 3), 36, 26, rot, true); }
  K.pigeonFly(E, out, cam, f, [2.0, 1.6, 1.5], [-3.5, 2.2, 3.0], P20A + 4, P20B + 4, "s20a");
  K.crowd(E, out, cam, { id: "tote", a: [1.5, 0, 1.0], b: [-3.0, 0, 2.5], f0: P20A - 20, seed: 43 }, f);
  K.crowd(E, out, cam, { id: "dogwalker", a: [-3.6, 0, 0.0], b: [1.0, 0, -1.6], f0: P20A - 10, seed: 44 }, f);
  K.pigeons(E, out, cam, f, [[0.4, 6.6, -1], [-0.2, 7.4, 1]], (t) => [[U20[0] + D20[0] * (t - TD20) * V20, 0, U20[2] + D20[2] * (t - TD20) * V20] as V3], 0, "s20");
};

// ================================================================== THE BILL KICKS (picture frames of the shots that show them)
billKick(2, SNAP17, 0.42);
billKick(2, TOUCH17 + 3, 0.18);
/* p3 (D7, audit M4): every head that passes under the lowest bill makes it SWING (|s| 0.8-1.5 = 15-30 deg on top of the +-10 deg idle sway;
   the p2 kicks of 0.2-0.45 never read). < 0 = the bottom edge toward the lens (a head pushing through from behind it) */
for (const D of DUCKS18) billKick(2, D.T - 1, D.kick);
billKick(2, PDUCK19 - 1, -1.0);
/* p4: S19's grab: the pinch tips the bill toward her, each tug swings it (her hand rides the swinging corner: billPt) */
billKick(2, PINCH19, -0.6); for (const t of TUGS19) billKick(2, t, -1.25);
billKick(2, TD20 - 2, -1.2);   /* the lens is low: a bill tipped toward it foreshortens fast (-2 went edge-on) */
/* p4: a gust on "never" keeps the bill swinging right over her head while the lens rises to it (S20 picture time) */
billKick(2, pt(SID.S20, BEAT.neverSaw26) - 3, -0.75);

// ================================================================== DISPATCH
export const stageStory2 = (E: Eng, out: Stage, cam: CamInfo, id: number, f: number, R: StageInfo): void => {
  void R;
  if (id === SID.S12) s12(E, out, cam, f);
  else if (id === SID.S13) s13(E, out, cam, f);
  else if (id === SID.S14) s14(E, out, cam, f);
  else if (id === SID.S15) s15(E, out, cam, f);
  else if (id === SID.S16) s16(E, out, cam, f);
  else if (id === SID.S17) s17(E, out, cam, f);
  else if (id === SID.S18) s18b(E, out, cam, f);
  else if (id === SID.S19) s19(E, out, cam, f);
  else if (id === SID.S20) s20(E, out, cam, f);
};

// ================================================================== SOUND CUES (film frames; S20 events through filmFrameOf)
export type Cue = { frame: number; name: string; what: string; pan: number; near: number };
export const story2Cues = (filmOf20: (t: number) => number): Cue[] => {
  const c: Cue[] = [];
  const add = (frame: number, name: string, what: string, pan: number, near: number) => c.push({ frame: Math.round(frame), name, what, pan, near });
  /* p4: the four stick figures drawn on "Even asked straight out," (a quick pencil scribble each, ~0.3 s) */
  DRAW12.forEach((d, k) => add(d, "pencil_scribble", `S12 her pencil quickly draws phone person ${k + 1} (head, body, legs, arms, the phone: one fast scribble, ${DW12} f)`, -0.1, 0.85));
  add(PEN12.find((s) => s.f1 - s.f0 < 0.01)!.f0, "pencil_tap", "S12 on 'only' her pencil taps the first phone person once", -0.15, 0.6);
  ["tick", "cross", "cross", "cross"].forEach((n, k) => add(MK[k] - (k ? 6 : 4), `pencil_${n}`, `S12 the interviewer's pencil ${n === "tick" ? "ticks" : "crosses"} doodle ${k + 1} (${k ? "two strokes" : "one stroke"})`, -0.1, 0.9));
  add(MK[3], "one_in_four", "S12 the big red '1 in 4' lands on the page, three dashes flick out each side (a marker squeak / soft thump)", 0, 0.8);
  PT12.slice(0, 2).forEach((t) => add(t, "pencil_tap", "S12 her pencil taps the page beside the '1' (twice: 'see?')", -0.3, 0.6));
  add(LOOKUP12, "brows_up", "S12 she looks up as the lens rises to her face, eyebrows up (incredulous): a soft 'hm!' breath only, no voice", 0, 0.5);
  add(HONK13, "honk", "S13 the clown squeezes his horn right behind the phone guy", -0.45, 0.8);
  add(SPIN13, "spin_whoosh", "S13 the phone guy spins round (5 f keyed turn, the smear frame on +2)", 0.35, 0.8);
  add(TAKE13 + 4, "jaw_drop", "S13 the take: his jaw drops with a '!' and surprise ticks, his free hand flings out (a comic 'boing' / gasp)", 0.35, 0.8);
  /* p4: the clown's payoff */
  add(POP13, "eye_pop", "S13 the clown's eyes POP (finally seen!): a cartoon 'boing' / eye-pop squeak", -0.45, 0.75);
  add(HOP13, "hop", "S13 the clown hops his unicycle for joy, both arms up (a springy boing + wheel creak; lands ~10 f later)", -0.45, 0.7);
  add(HOP13 + 10, "land", "S13 the unicycle lands (tyre thump, a squeak)", -0.45, 0.6);
  add(JOY13, "cheer", "S13 the clown's ecstatic silent cheer (a tiny 'woo!' breath or kazoo flourish, under the voice)", -0.45, 0.4);
  HONKS13.slice(1).forEach((h, k) => add(h, "honk", `S13 the clown's double honk overhead, ${k ? "second" : "first"} of two`, -0.45, 0.8));
  for (let f = S13A; f < S13B; f += 9) if (f > HONK13 && f < HONK13 + 30) { add(HONK13 + 2, "pigeon_flush", "S13 the pigeons by the clown's wheel flush on the honk", -0.5, 0.6); break; }
  /* footsteps: every half stride of the walker's real travel (the frames its feet plant) */
  const steps = (a: number, b: number, mAt: (f: number) => number, stride: number, name: string, what: string, pan: number, near: number) => {
    let last = Math.floor(mAt(a) / (stride / 2));
    for (let f = a + 1; f < b; f++) { const n = Math.floor(mAt(f) / (stride / 2)); if (n !== last) { add(f, name, what, pan, near); last = n; } } };
  /* p4: S14 restaged (the phone walker under the clown's nose, then the dude) */
  steps(Math.round(BEAT.listening - 8), S14B, (f) => MK2.dudeM14(f), PPL.GAIT.walk.stride, "footstep_bop", "S14 the headphone dude's step (bopping walk; he walks into the frame on 'listening', the camera picks him up)", -0.45, 0.6);
  steps(S14A, Math.round(BEAT.listening + 6), (f) => (f - S14A) * MK2.WALK14V + 7, PPL.GAIT.walk.stride, "footstep_phone", "S14 the phone walker's brisk step (pink phone, walking right to left under the clown's nose)", 0.1, 0.5);
  add(S14A + 1, "phone_chatter", "S14 the phone walker's muffled chatter into her call (blah-blah, under the voice) until she leaves the frame", 0.1, 0.35);
  add(WAVEW14, "wave", "S14 the clown waves big at the phone walker as she comes (cloth flap)", 0.05, 0.4);
  HONKW14.forEach((h, k) => add(h, "honk", `S14 the clown honks at the phone walker (${k ? "right over her head as she passes under him" : "as she comes"}): she never looks`, 0.0, 0.7));
  add(LAUGHW14, "phone_laugh", "S14 the phone walker laughs into her call (a short muffled laugh) right as he honks over her head", 0.0, 0.45);
  add(GIVE14, "give_up", "S14 she is gone: the clown gives up, a '?' pops over his hat (a sad little horn sag / deflating squeak)", 0.15, 0.5);
  add(MK2.GO14, "unicycle_off", "S14 he turns and rides off slowly, dejected (wheel creak)", 0.2, 0.4);
  add(NOTICE14, "notice", "S14 the dude spots the clown: a 'whoa' take, a '!' pops (a short comic 'whup' / record scratch of the music)", -0.45, 0.6);
  add(WAVE14 - 8, "wave", "S14 the dude raises his hand and waves big at the clown on 'noticed'", -0.45, 0.6);
  add(POP14, "eye_pop", "S14 the clown's eyes POP (someone sees him!): cartoon 'boing'", 0.3, 0.6);
  add(HOP14, "hop", "S14 the clown hops his unicycle for joy, both arms up (springy boing; lands ~10 f later)", 0.3, 0.55);
  HONK14.forEach((h, k) => add(h, "honk", `S14 the clown's happy honk overhead (${k ? "second" : "first"} of two)`, 0.3, 0.6));
  add(WB14 + 4, "wave_back", "S14 the clown waves back at the dude (cloth flap)", 0.3, 0.4);
  add(Math.round(BEAT.listening - 6), "pigeon_flush", "S14 pigeons in the dude's path flutter aside", -0.4, 0.5);
  add(Math.round(BEAT.listening - 8), "headphone_music", "S14 tinny music leaks from the dude's headphones as he walks in (notes float off them; duck it under the voice)", -0.45, 0.4);
  add(TM15, "mind_lift", "S15 her see-through mind lifts out of her head (a soft rising shimmer)", 0.1, 0.7);
  add(TM15 - 6, "signal_on", "S15 the wavy phone-signal line draws out toward the bubble", -0.3, 0.5);
  add(TA15, "bubble_pop", "S15 her mind arrives in the call bubble (a warm pop)", -0.5, 0.7);
  add(LAUGH15, "bubble_laugh", "S15 inside the bubble: she and her mum laugh (tiny, muffled, warm)", -0.5, 0.4);
  steps(S15A, S15B, (f) => Math.hypot(s15Hero(f)[0] - STORY.s15.from[0], s15Hero(f)[2] - STORY.s15.from[2]) + 2, PPL.GAIT.phone.stride, "footstep_phone", "S15 the hero's slow phone-walk step toward the lens", 0.15, 0.7);
  steps(S16A, S16B, (f) => MK2.m16(f) + PH16, PPL.GAIT.tiptoe.stride, "tiptoe_step", "S16 Hyman's tiptoe step (sneaky, pizzicato-friendly; none while he is frozen)", 0.0, 0.8);
  add(LOOKL16, "sly_look", "S16 Hyman glances left", 0, 0.4);
  add(JOG16 - 8, "jogger_pass", "S16 a jogger runs by right behind him (quick steps, right to left)", 0.3, 0.5);
  add(S16A + 4, "pigeon_strut", "S16 a pigeon tiptoes after Hyman, copying him (tiny claw taps on his rhythm; it freezes when he freezes)", 0.15, 0.3);
  add(FREEZE16, "freeze", "S16 Hyman FREEZES on one leg and whips the bills behind his back (a little gasp / paper rustle)", 0, 0.8);
  add(FREEZE16 + 11, "whistle", "S16 he looks at the sky and whistles innocently (two notes, notes float from his lips) until the jogger is gone", 0, 0.7);
  add(FREEZE16 + 6, "sweat_drop", "S16 one sweat drop pops at his temple (a tiny 'plip')", -0.05, 0.3);
  add(GO16 + 6, "bills_twinkle", "S16 the bills come back out with a twinkle (a small glassy 'ting')", -0.1, 0.4);
  add(GRIN16 + 4, "brow_waggle", "S16 the bills come back out: smug brow waggle, he sneaks on", 0, 0.4);
  add(CL15A + 2, "unicycle_in", "S15 the UNSEEN clown's unicycle whirrs in from the right behind her and keeps pace (wheel + pedals)", 0.6, 0.45);
  add(CL15H[0], "honk", "S15 he honks at her ear, waving (she never turns)", 0.35, 0.55);
  add(CL15H[1], "honk", "S15 he honks again, bouncing for attention", 0.35, 0.55);
  add(CL15G, "give_up", "S15 on 'isn't there' he gives up: a '?' pops over his hat, a sad little horn sag (half honk), he peels off behind her", 0.2, 0.45);
  add(TA15 + 1, "twinkle", "S15 twinkles round the bubble as her mind lands in the kitchen (soft chime, with the pop)", -0.5, 0.35);
  add(SNAP17 - 8, "peg_squeeze", "S17 the peg pinched open (a wooden creak)", 0.05, 0.9);
  add(SNAP17, "peg_snap", "S17 the peg SNAPS shut on the bill", 0.05, 1.0);
  add(SNAP17 + 1, "bill_flutter", "S17 the bill swings after the snap", 0.05, 0.9);
  /* p4: Hyman steps into the frame (two steps), stops beside his trap, pats his head */
  steps(IN17 - 26, IN17 + 1, (f) => PPL.stopWalk(f, IN17, "walk").metres + 10, PPL.GAIT.walk.stride, "footstep", "S17 Hyman's step as he walks into the frame beside his trap (leather shoe)", -0.45, 0.55);
  add(IN17, "stop", "S17 Hyman stops beside the bill (a small shoe scuff), turns to us", -0.4, 0.5);
  add(FLAT17 - 5, "pat_head", "S17 Hyman pats the top of his head (head height)", -0.4, 0.6);
  add(TOUCH17 + 3, "bill_flutter", "S17 his flat hand brushes the bill's bottom edge", -0.1, 0.6);
  add(WINK17 + 1, "wink_ting", "S17 Hyman winks at us, a twinkle at his eye (a tiny 'ting')", -0.3, 0.5);
  /* p3 (sound audit M6): S18 thinned: per walker ONE duck, ONE bill flutter and the TWO steps round the dip, one shoe and one
     pan each (+0.40 / +0.26 / +0.15: right to left) */
  DUCKS18.forEach((D, k) => { const pan = [0.4, 0.26, 0.15][k], shoe = ["leather", "sneaker", "soft"][k], stride = D.v > 1.2 ? PPL.GAIT.walk.stride : PPL.GAIT.stroll.stride, mAt = (f: number) => (f - D.T) * D.v / 30 + extra18(D, f) + 9 * D.seed;
    add(D.T - 5, "duck", `S18 ${D.id} ducks under the lowest bill (${D.id === "scarf" ? "a wince" : D.id === "parka" ? "a lean-back limbo" : "a quick dip holding his cap down, ON THE PHONE the whole way, never looking up"})`, pan, 0.7);
    if (D.id === "elder") add(D.T - 24, "phone_chatter", "S18 the third walker chats into his phone as he comes and goes under the bill (muffled, under the voice)", pan, 0.35);
    add(D.T, "bill_flutter", `S18 ${D.id}'s head pushes the bill: it swings (paper flap)`, pan, 0.7);
    const before: number[] = [], after: number[] = []; let last = Math.floor(mAt(D.T - 30) / (stride / 2));
    for (let f = D.T - 29; f < D.T + 30; f++) { const n = Math.floor(mAt(f) / (stride / 2)); if (n !== last) { (f < D.T ? before : after).push(f); last = n; } }
    if (before.length) add(before[before.length - 1], "footstep", `S18 ${D.id}'s step into the dip (${shoe} shoe)`, pan, 0.6);
    if (after.length) add(after[0], "footstep", `S18 ${D.id}'s step out of the dip (${shoe} shoe)`, pan, 0.6); });
  add(PDUCK19 - 5, "duck", "S19 the phone guy (red phone) ducks under the bill without looking, still chatting", 0.05, 0.5);
  add(PDUCK19 - 1, "bill_flutter", "S19 his head pushes the bill: it swings hard (paper flap)", 0.05, 0.6);
  add(STOP19, "stop", "S19 the no-phone walker's last step: she stops dead under the bill on 'stopped' (shoe scuff)", -0.25, 0.6);
  add(SEE19, "gasp", "S19 she stares up at the money (a little delighted gasp)", -0.25, 0.5);
  /* p4: the grab */
  add(REACH19, "reach", "S19 she reaches up on her toes for the bill (cloth swish)", -0.2, 0.5);
  add(PINCH19, "bill_pinch", "S19 her fingers PINCH the bill's corner on 'money' (a crisp paper snap) + a money glint 'ting'", -0.1, 0.75);
  TUGS19.forEach((t, k) => add(t, "bill_tug", `S19 she tugs the bill (${k ? "second" : "first"} tug: paper flap, the peg creaks)`, -0.1, 0.7));
  add(GLEE19, "giggle", "S19 she giggles, hunched with glee, holding the money (a tiny delighted giggle, no words)", -0.2, 0.45);
  add(filmOf20(TD20 - 9), "duck_slow", "S20 SLOW MOTION: the hero dips under the bill (slowed whoosh, low)", 0.0, 0.9);
  add(filmOf20(TD20 - 2), "bill_brush_slow", "S20 her hair drags the bill: it lifts and swings on behind her head (slowed paper rustle)", 0.1, 0.9);
  add(filmOf20(PET20), "petal_land", "S20 a petal lands on her nose on 'never saw it'; she does not blink (a tiny soft tick)", 0.15, 0.5);
  add(filmOf20(TD20 + 4), "rise_slow", "S20 she rises out of the dip and walks on, still chatting (cloth rustle, slowed)", 0.0, 0.6);
  add(filmOf20(TA20), "bubble_laugh", "S20 her mind laughs in the call bubble beside her (warm, muffled)", -0.5, 0.5);
  add(filmOf20(TM20), "bubble_laugh", "S20 the mind laughs again on 'minds' (oblivious)", -0.5, 0.5);
  /* p4: the lens rises and the bubble grows on "Their minds"; a gust swings the bill on "never"; the mind laughs on "saw it" */
  add(filmOf20(TA20 - 1), "bubble_swell", "S20 the call bubble swells and drifts in as the lens rises (a soft warm swell, slowed)", -0.45, 0.4);
  add(filmOf20(pt(SID.S20, BEAT.neverSaw26) - 3), "bill_flutter_slow", "S20 a gust swings the bill right over her head (slowed paper flap)", 0.1, 0.6);
  add(filmOf20(SAW20), "bubble_laugh", "S20 the mind laughs on 'saw it' (warm, muffled, oblivious)", -0.5, 0.5);
  /* only what is on screen: inside S12 .. S20 */
  return c.filter((x) => x.frame >= S12A - 3 && x.frame < S20B + 3).sort((a, b) => a.frame - b.frame);
};
void ramp; void lerp3; void FX;

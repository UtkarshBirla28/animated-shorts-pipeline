// E1's NUMBER BADGES: where each one goes (owner ANIMATOR A; pure maths, no drawing: out/clown/anim_quiz/p3/pops.mjs
// prints the spots). EDIT's story.ts e1PopSpot knows the bills and the clock; the quiz staging knows where every OTHER
// figure stands at each hold frame (plan.ts PHONES[k].t).
// p4 (AUDIT_edit R6: badge 2 sat on the pink woman's dress, badge 3 was as close to two people, badge 5 floated 144 px
// from its owner): the badge is tested as what it is, a DISC (r 74 + its 9 px keyline = 83 px), not as its 170 px box:
//   - it sits RIGHT ON / BESIDE its own person's head (a 6-30 px gap), above the head when there is room, else beside it;
//   - it never touches a bill (>= 6 px), its own face or torso, another figure (the clown included) or the button
//     column (the whole disc inside x 56-892, y >= 300);
//   - it is nearer its own head than any bill and than any other person's head (EDIT's rule: a disc in a gap between the
//     bills reads as a label on the money; a disc between two people reads as either's);
//   - it carries a POINTER NOTCH toward its own head (`tip`: Overlays.tsx draws it), so there is no doubt whose it is.
import { PHONES, SQ, clownQ, type V3 } from "./plan";
import { SID } from "./beats";
import { camAt, project, e1PopSpot } from "./story";
import { QUIZ_ACTORS, routeAt } from "./cast_quiz_plan";

export type Box = [number, number, number, number];
/** the screen box of a standing figure part: from height `top` down to `bot` (m), half width hw (m) */
const figBox = (cam: ReturnType<typeof camAt>, p: V3, top: number, bot: number, hw: number): Box | null => {
  const a = project(cam, [p[0], top, p[2]]), b = project(cam, [p[0], bot, p[2]]), g = project(cam, [p[0], 0, p[2]]);
  if (!a || !b || !g) return null;
  const k = (g[1] - a[1]) / top;
  return [a[0] - hw * k, a[1], a[0] + hw * k, b[1]];
};
/** distance from a point to a box (0 inside) */
const dBox = (x: number, y: number, B: Box) => Math.hypot(Math.max(B[0] - x, 0, x - B[2]), Math.max(B[1] - y, 0, y - B[3]));
const RD = 83, R = 85;
/** the real head tops of the cast (m, at scale 1: the rig's, as measured by out/clown/anim_quiz/p3/check3.mjs) */
const TOP: Record<string, number> = { red: 1.57, white: 1.54, blue: 1.55, hero: 1.45, pink: 1.45 };
export type PopSpot = { at: [number, number]; box: Box; tip: [number, number]; onOthers: number; onSelf: number; gap: number };
/** phone person k's badge: the ANCHOR Overlays.tsx hangs it over (the disc's centre is 125 px above it), the badge box,
 *  the notch's target (the nearest point of the head), and how deep the disc cuts into another figure / its own body */
export const popSpot = (k: number): PopSpot => {
  const ph = PHONES[k], cam = camAt(SID.Q1, ph.t), me = QUIZ_ACTORS.find((a) => a.phone === k)!, S = me.scale ?? 1, stMe = routeAt(me.route, ph.t, me.seed);
  const others: Box[] = [], heads: Box[] = [];
  for (const a of QUIZ_ACTORS) {
    if (a === me) continue;
    const st = routeAt(a.route, ph.t, a.seed); if (!st.on) continue;
    const s = a.scale ?? 1, tp = (TOP[a.who] ?? 1.55) * s, b = figBox(cam, st.p, tp, 0.45, 0.33 * s), h = figBox(cam, st.p, tp, tp - 0.5 * s, 0.28 * s);
    if (b && b[3] - b[1] > 190) { others.push(b); if (h) heads.push(h); }                                       // (the far extras, > ~13 m away, are specks at the horizon)
  }
  { const b = figBox(cam, clownQ(ph.t).p, 2.15, 0.3, 0.45), h = figBox(cam, clownQ(ph.t).p, 2.0, 1.45, 0.3); if (b) others.push(b); if (h) heads.push(h); }
  const tpMe = (TOP[me.who] ?? 1.55) * S, head = figBox(cam, stMe.p, tpMe, tpMe - 0.5 * S, 0.27 * S), torso = figBox(cam, stMe.p, tpMe - 0.5 * S, 0.5, 0.3 * S);
  const fallback = (): PopSpot => { const s = e1PopSpot(k, others); return { at: s, box: [s[0] - R, s[1] - 40 - 2 * R, s[0] + R, s[1] - 40], tip: s, onOthers: -1, onSelf: -1, gap: -1 }; };
  if (!head || !torso) return fallback();
  const bills: Box[] = SQ.bills.map((b) => { const w = SQ.bill.w / 2, c = Math.cos(b.yaw), s = Math.sin(b.yaw), q = b.peg, P = ([[q[0] - w * c, q[1], q[2] + w * s], [q[0] + w * c, q[1], q[2] - w * s], [q[0] - w * c, q[1] - SQ.bill.h, q[2] + w * s], [q[0] + w * c, q[1] - SQ.bill.h, q[2] - w * s]] as V3[]).map((v) => project(cam, v) ?? [0, 0]);
    return [Math.min(...P.map((v) => v[0])), Math.min(...P.map((v) => v[1])), Math.max(...P.map((v) => v[0])), Math.max(...P.map((v) => v[1]))]; });
  const hc: [number, number] = [(head[0] + head[2]) / 2, (head[1] + head[3]) / 2], hr = (head[2] - head[0]) / 2;
  let best: PopSpot | null = null, bc = 1e12;
  const hv = (head[3] - head[1]) / 2;
  /* p4: its own PHONE (the thing being counted) stays clear too: the phone hand is at the screen-left ear in these front
     views, ~0.26 m wide with its grip, from 0.25 m above to 0.08 m below the head's middle */
  const pm = hr / (0.27 * S), phoneB: Box = [hc[0] - hr - 0.22 * pm, hc[1] - 0.25 * pm, hc[0] - hr + 0.04 * pm, hc[1] + 0.08 * pm];
  for (let gap = 4; gap <= 40; gap += 4) for (let a = -150; a <= 150; a += 5) {
    /* round the head's ELLIPSE (half width hr, half height hv) at `gap` px from its edge */
    const sn = Math.sin((a * Math.PI) / 180), cs = Math.cos((a * Math.PI) / 180), re = (hr * hv) / Math.hypot(hv * sn, hr * cs);
    const cx = hc[0] + (re + RD + gap) * sn, cy = hc[1] - (re + RD + gap) * cs;
    if (cx - RD < 46 || cx + RD > 892 || cy - R < 300 || cy + R > 1240 || cx < 110) continue;                   // (no Shorts UI on the left edge; Overlays clamps the anchor to x >= 110)
    if (bills.some((q) => dBox(cx, cy, q) < RD + 3) || dBox(cx, cy, phoneB) < RD + 2) continue;              // never on a bill or its own phone
    if (((cx - hc[0]) / (hr + RD + 2)) ** 2 + ((cy - hc[1]) / (hv + RD + 2)) ** 2 < 1 || dBox(cx, cy, torso) < RD - 26) continue;   // never on its own face (its ellipse) / dress (it may graze the round shoulder corner)
    const own = dBox(cx, cy, head);
    if (bills.some((q) => dBox(cx, cy, q) <= own * 1.15) || heads.some((q) => dBox(cx, cy, q) <= own * 1.6)) continue;   // nearer its own head
    const onOthers = others.reduce((n, q) => n + Math.max(0, RD - dBox(cx, cy, q)), 0);
    const cost = 40 * onOthers + 2.2 * Math.abs(a) + 3 * gap;
    if (cost < bc) { bc = cost; const t: [number, number] = [Math.max(head[0], Math.min(head[2], cx)), Math.max(head[1], Math.min(head[3], cy))];
      best = { at: [cx, cy + R + 40], box: [cx - R, cy - R, cx + R, cy + R], tip: t, onOthers, onSelf: 0, gap }; }
  }
  return best ?? fallback();
};
export const POP_SPOTS = PHONES.map((_, k) => popSpot(k));

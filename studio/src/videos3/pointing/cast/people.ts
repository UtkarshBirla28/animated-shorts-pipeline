// THE PEOPLE of "pointing" (owner CAST): draw functions for every character, in the clown film's style (its drawFig /
// toon kit imported READ-ONLY) + our costume layers (the driver's uniform cap, gold buttons, tie and WHITE gloves; the
// tourist's NEW YORK tee, red cap, stubble and gap-toothed grin, red laces; the kid's toy cap, collar trim, shorts,
// socks and backpack; the conductor's glasses cord; the commuter's beanie and neck headphones; the lab coat...) and a
// TRUE PROFILE head (profile.ts) whenever a figure is seen side-on (|s| > 0.8, or forced with P.profile).
// Everything is a pure drawing of (who, pose): the acting lives in acting.ts.
import { Pen, rig, blobPts, mix, shade, mul, rrect, INK, type Outfit, type P2, type Expr, type MouthK } from "../../../videos/clown/toon";
import * as PPL from "../../../videos/clown/cast_people";
import * as F from "./fits";
import { drawProfileHead, type HatP, type HairStyleP } from "./profile";
import { drawFlatGlove, drawLensPoint, drawPointGlove } from "./draw_hands";

export const SU = 0.00216, UM = 1 / SU;
const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const ellP = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 24): P2[] => {
  const o: P2[] = []; for (let i = 0; i < n; i++) { const t = (i / n) * TAU, x = rx * Math.cos(t), y = ry * Math.sin(t); o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return o;
};
type LX = Parameters<NonNullable<PPL.Extras["post"]>>[1];
type Layer = (p: Pen, X: LX) => void;

/** a standing foot's offset: forward along the heading, toward the figure's RIGHT, up (all metres), pitch (rad, + = toe up) */
export type FootP = { fwd?: number; lat?: number; lift?: number; pitch?: number };
/** a pose of OUR cast: the clown cast's Pose + a few fields */
export type CPose = PPL.Pose & {
  /** force a TRUE profile: +1 facing screen right, -1 facing left, 0 = never; default automatic (|s| > 0.8) */
  profile?: 1 | -1 | 0;
  /** the kid's concentration tongue (0..1), a glass press of cheek + nose (0..1), cheek blush (0..1) */
  tongue?: number; press?: number; blush?: number;
  /** seated: the seat height in metres (the hips sit on it, the thighs go forward, the shins down) */
  seat?: number;
  /** nothing below this card y is drawn (a figure behind a window sill / a desk) */
  cutY?: number;
  /** the tourist's filming phone: held up in front (0 = down at his side .. 1 = up at eye height), on screen side `side` */
  film?: { k: number; side: -1 | 1; tilt?: number; rec?: boolean; /** drawn EDGE-ON (a slim strip: the forgotten phone at his side, frame 0) */ edge?: boolean };
  /** a held prop drawn in OUR layer at a hand: stopwatch / pen / keys / furoshiki (screen side) */
  hold?: { k: "stopwatch" | "pen" | "furoshiki" | "tote" | "watch" | "shovel" | "notebook"; side: -1 | 1; open?: number }[];
  /** the kid's toy cap slip (deg of tilt, + = toward screen right) */
  capTilt?: number;
  /** the kid's cap SLIDING DOWN over his eyes: 0 = on his head (a bit low, as always), 1 = over the eyes, < 0 = shoved too high */
  capDrop?: number;
  /** the SKIN colour to draw with (head, bare arms, hands): the lit cards pass a slightly cool tone that lands on a light
   *  cream under the golden sun (member.ts CAST_SKIN); default = the house off-white (the sheet) */
  skin?: string;
  /** the WHITE to draw the driver's gloves with on a lit card (member.ts CAST_WHITE); default pure white (the sheet) */
  white?: string;
  /** a hand pointing AT THE LENS (drawn front-on over the solved hand on that screen side): k = how far out (0..1.15) */
  lensPoint?: { side: -1 | 1; k: number; hs?: number };
  /** move a STANDING foot (metres from where it stands; r / l = the figure's right / left): a hook, a lunge step, a toe tap */
  foot?: { r?: FootP; l?: FootP };
  /** the late salaryman's tie straighten / a white mask on (officeMask) */
  mask?: boolean;
  /** THE LIFT (the boy): held up by his mum: her forearms round his waist, her hands clasped on his belly (k 0..1;
   *  col = her sleeve, skin = her hands). lift.ts heldPose sets it together with his dangling legs */
  held?: { k: number; col?: string; skin?: string };
};

// ================================================================== shared costume layers
/** run fn clipped to everything EXCEPT the head */
const notHead = (p: Pen, X: LX, fn: () => void) => {
  const g = p.g, R = X.R; p.rot = X.headRot as number[] | null;
  const hp = blobPts(300, R.hc, R.H).map(([x, y]) => p.P(x, y)); p.rot = null;
  g.save(); g.beginPath(); g.rect(-400, -400, 1400, 1800);
  hp.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip("evenodd");
  fn(); g.restore(); p.rot = null;
};
const torsoClip = (p: Pen, X: LX, fn: () => void) => notHead(p, X, () => { p.rot = X.bodyRot as number[] | null; p.clip(blobPts(X.R.tcx, X.R.tcy, X.R.T), fn); });
/** the profile's front edge direction: +1 the figure faces screen right */
const profD = (X: LX): 0 | 1 | -1 => { const P = X.pose as CPose; return (P.profile ?? 0) as 0 | 1 | -1; };

/** the DRIVER's peaked uniform cap (front / 3-4 / back): a flared crown over a dark band, a thin gold cord, the glossy
 *  black peak, a plain round gold badge (no symbol). k = scale (the kid's toy cap: 1.16), tilt deg, drop (head half-heights) */
const uniformCap = (col: string, k = 1, tiltDeg = 0, drop = 0): Layer => (p, X) => {
  const { R, u } = X, H = R.H, hc = R.hc, f = X.facing, back = X.back;
  if (profD(X)) return;
  const tl = (tiltDeg * Math.PI) / 180, lagD = (X.pose.hatLag ?? 0) * (Math.PI / 180);
  const base = X.headRot as number[] | null;
  p.rot = base ? [base[0] + tl + lagD, base[1], base[2], base[3] ?? 0, (base[4] ?? 0) + drop * H.b] : [tl + lagD, 300, hc, 0, drop * H.b];
  const Sx = (x: number) => 300 + (x - 300) * k, Sy = (y: number) => hc - 0.5 * H.b + (y - (hc - 0.5 * H.b)) * k;
  const S = (pts: P2[]): P2[] => pts.map(([x, y]) => [Sx(x), Sy(y)]);
  const by = hc - 0.5 * H.b, topY = hc - 1.06 * H.b, shd = mul(col, [0.7, 0.68, 0.8]);
  const crown: P2[] = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20, x = 300 - 1.2 * H.a + 2.4 * H.a * t; crown.push([x + f * 6 * u, topY - 0.06 * H.b * Math.sin(Math.PI * t) + (f ? f * 0.05 * H.b * (2 * t - 1) : 0)]); }
  crown.push([300 + 1.04 * H.a, by - 0.12 * H.b], [300 + 1.0 * H.a, by + 0.02 * H.b], [300 - 1.0 * H.a, by + 0.02 * H.b], [300 - 1.04 * H.a, by - 0.12 * H.b]);
  const cr = S(crown);
  p.gradFill(cr, mix(col, "#ffffff", 0.07), shd, X.light, 0.3); p.poly(cr, null, 3.2 * u);
  p.stroke(S([[300 - 1.12 * H.a + f * 6 * u, topY + 0.1 * H.b], [300 + f * 6 * u, topY + 0.02 * H.b], [300 + 1.12 * H.a + f * 6 * u, topY + 0.1 * H.b]]), 1.6 * u, mix(col, "#ffffff", 0.25));
  const band = S([[300 - 1.03 * H.a, by - 0.16 * H.b], [300 + 1.03 * H.a, by - 0.16 * H.b], [300 + 1.0 * H.a, by + 0.03 * H.b], [300 - 1.0 * H.a, by + 0.03 * H.b]]);
  p.poly(band, mix(col, "#000000", 0.35), 1.6 * u);
  p.stroke(S([[300 - 1.02 * H.a, by - 0.12 * H.b], [300 + 1.02 * H.a, by - 0.12 * H.b]]), 2.4 * u, F.COL.gold);
  p.stroke(S([[300 - 0.6 * H.a, by - 0.125 * H.b], [300 + 0.2 * H.a, by - 0.125 * H.b]]), 0.9 * u, F.COL.goldLite);
  if (!back) {
    // the badge (a plain round gold disc with a raised ring) and the glossy peak toward the lens / the facing side
    const bx = 300 + f * 0.34 * H.a, byy = hc - 0.8 * H.b;
    p.poly(S(ellP(bx, byy, 0.12 * H.a * (f ? 0.8 : 1), 0.12 * H.a)), F.COL.gold, 1.4 * u);
    p.poly(S(ellP(bx, byy, 0.07 * H.a * (f ? 0.8 : 1), 0.07 * H.a)), null, 1.1 * u, "#9a6e14");
    p.dot(...S([[bx - 0.03 * H.a, byy - 0.04 * H.a]])[0], 1.3 * u, F.COL.goldLite);
    const vx = 300 + f * 14 * u, vw = 0.86 * H.a, vis: P2[] = [];
    for (let i = 0; i <= 22; i++) { const t = Math.PI * (i / 22); vis.push([vx + vw * Math.cos(t), by + 0.02 * H.b + 0.15 * H.b * Math.sin(t)]); }
    p.poly(S(vis), F.COL.visor, 2.6 * u);
    p.arc(Sx(vx - 0.12 * H.a), Sy(by + 0.07 * H.b), vw * 0.55 * k, 0.05 * H.b * k, 25, 150, 1.8 * u, "#7a8098");
  }
  p.rot = null;
};

/** WHITE gloves: a cuff ring at each wrist is drawn by the hands themselves (Extras.glove); this adds the seam line */
const DRIVER_GLOVE = F.COL.glove;

/** the driver's jacket front: white shirt V, navy tie, lapels, 4 gold buttons (front / 3-4); the profile: buttons along
 *  the front edge, the lapel line; the back: a centre seam */
const driverJacket: Layer = (p, X) => {
  const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R, d = profD(X);
  torsoClip(p, X, () => {
    if (X.back) { p.stroke([[tcx, chin + 0.05 * HH], [tcx, torsoBot]], 1.4 * u, shade(F.COL.navy, 0.6)); return; }
    if (d) {
      const fx = tcx + d * 0.72 * T.a;
      p.poly([[fx + d * 0.3 * T.a, chin - 0.1 * HH], [fx + d * 0.05 * T.a, chin + 0.3 * HH], [fx + d * 0.35 * T.a, chin + 0.3 * HH]], "#f6f3ec", 0);
      p.stroke([[fx + d * 0.12 * T.a, chin + 0.02 * HH], [fx + d * 0.18 * T.a, chin + 0.28 * HH]], 4 * u, F.COL.navyLite);
      p.stroke([[fx - d * 0.2 * T.a, chin - 0.02 * HH], [fx - d * 0.02 * T.a, chin + 0.32 * HH], [fx + d * 0.1 * T.a, torsoBot]], 1.4 * u, shade(F.COL.navy, 0.55));
      for (const k of [0.36, 0.5, 0.64, 0.78]) { p.dot(fx + d * 0.04 * T.a, chin + k * HH, 2.6 * u, F.COL.gold); p.dot(fx + d * 0.04 * T.a - 0.7 * u, chin + k * HH - 0.8 * u, 0.9 * u, F.COL.goldLite); }
      return;
    }
    const f = X.facing, cx = tcx + f * 6 * u, vb = chin + 0.36 * HH;
    p.poly([[cx - 0.34 * T.a, chin - 0.08 * HH], [cx + 0.34 * T.a, chin - 0.08 * HH], [cx, vb]], "#f6f3ec", 0);
    // the navy tie: a knot + a blade inside the V
    p.poly([[cx - 4 * u, chin + 0.02 * HH], [cx + 4 * u, chin + 0.02 * HH], [cx + 3 * u, chin + 0.07 * HH], [cx - 3 * u, chin + 0.07 * HH]], F.COL.navyLite, 1.1 * u);
    p.poly([[cx - 3 * u, chin + 0.07 * HH], [cx + 3 * u, chin + 0.07 * HH], [cx + 5 * u, chin + 0.3 * HH], [cx, vb + 0.02 * HH], [cx - 5 * u, chin + 0.3 * HH]], F.COL.navyLite, 1.1 * u);
    // lapels
    for (const sd of [-1, 1]) p.stroke([[cx + sd * 0.36 * T.a, chin - 0.06 * HH], [cx + sd * 0.12 * T.a, vb - 0.02 * HH], [cx + sd * 0.02 * T.a, vb + 0.04 * HH]], 1.6 * u, shade(F.COL.navy, 0.55));
    p.stroke([[cx + 1.5 * u, vb + 0.04 * HH], [cx + 1.5 * u, torsoBot]], 1.3 * u, shade(F.COL.navy, 0.55));
    for (const k of [0.46, 0.58, 0.7, 0.82]) { p.dot(cx - 2 * u, chin + k * HH, 2.7 * u, F.COL.gold); p.dot(cx - 2.8 * u, chin + k * HH - 0.9 * u, 0.9 * u, F.COL.goldLite); }
    // the breast pocket line + a pen
    p.stroke([[cx + f * 2 * u + 0.36 * T.a, chin + 0.34 * HH], [cx + f * 2 * u + 0.66 * T.a, chin + 0.34 * HH]], 1.3 * u, shade(F.COL.navy, 0.55));
  });
};

/** LOOK TEST 2026-11-20 (look director): the tourist's REAL OUTFIT. fits.ts keeps the old palette (tee #bfc8d6 light
 *  grey = "a grey egg", rib #8591a8, jeans #4f7fc4 as a thin band, cap #6c2a27 maroon); the film now draws a saturated
 *  violet tee (the complement of the yellow suitcase, apart from the kid's sky blue and the cobalt phone), indigo denim
 *  up to the lower third of the bean, and a true red cap. Delete these two consts to restore the old look. */
const LOOK_TOURIST = { tee: "#6a3fc6", rib: "#3f2380", jeans: "#2f5a9e", cap: "#b0282a" };
const TOURIST_FIT: Outfit = { ...F.TOURIST, shirt: LOOK_TOURIST.tee, pants: LOOK_TOURIST.jeans, hatCol: LOOK_TOURIST.cap };
/** LOOK TEST: the kid's mum in a raspberry coat (fits.ts COL.trench #d8c3a0 beige = one more big beige shape beside the boy) */
const LOOK_MUM = { coat: "#b0405e" };
const MUM_FIT: Outfit = { ...F.KID_MUM, shirt: LOOK_MUM.coat };
/** LOOK TEST (2026-11-20, for the lead's audit: "back-view passers-by are faceless BLACK blobs"): the commuters' suits
 *  and coats in mid-value colours instead of near-black (fits.ts keeps #2e3340-#4a4d56), so a figure from behind is a
 *  coloured coat under (warm-lifted) hair, not a silhouette. Restore = point the specs back at F.SUIT_A etc. */
const CROWD = {
  suitA: { ...F.SUIT_A, shirt: "#3e5f96", pants: "#2c3b5a" } as Outfit,
  suitA2: { ...F.SUIT_A, shirt: "#5d6b7e", pants: "#3a4250" } as Outfit,
  suitB: { ...F.SUIT_B, shirt: "#6b6f7a", pants: "#454852" } as Outfit,
  suitC: { ...F.SUIT_C, shirt: "#2f6b6a", pants: "#26403f" } as Outfit,
  late: { ...F.LATE_SALARY, shirt: "#7a3a42", pants: "#3e2a2e" } as Outfit,
  waitC: { ...F.WAIT_C, shirt: "#4c7a3e" } as Outfit,
  studentA: { ...F.STUDENT_A, shirt: "#2f4a8a", pants: "#2f4a8a" } as Outfit,
  studentB: { ...F.STUDENT_B, shirt: "#2f4a8a" } as Outfit,
};

/** the tourist's T-SHIRT (every view): the jeans' waistband at the hips under the tee's hem, a ribbed crew collar, and
 *  (front / 3-4) NEW YORK in plain black block capitals on the chest. The torso bean itself is the tee (F.COL.tee) */
const nyTee: Layer = (p, X) => {
  const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R, d = profD(X), f = d || X.facing, rib = LOOK_TOURIST.rib;
  torsoClip(p, X, () => {
    // jeans at the hips + the tee's hem (a darker edge with a soft shadow under it)
    const hy = torsoBot - Math.max(0.2 * HH, 0.36 * (torsoBot - chin));   // LOOK TEST 2026-11-20: denim on the lower third of the bean (was 0.2 * HH: a thin "underwear" band)
    p.poly([[tcx - 2 * T.a, hy], [tcx + 2 * T.a, hy], [tcx + 2 * T.a, torsoBot + 0.3 * HH], [tcx - 2 * T.a, torsoBot + 0.3 * HH]], LOOK_TOURIST.jeans, 0);
    p.stroke([[tcx - 2 * T.a, hy + 2.2 * u], [tcx + 2 * T.a, hy + 2.2 * u]], 2.6 * u, shade(LOOK_TOURIST.jeans, 0.72));
    p.stroke([[tcx - 2 * T.a, hy], [tcx + 2 * T.a, hy]], 1.8 * u, mix(rib, INK, 0.35));
    if (!X.back && !d) p.poly(rrect(tcx + f * 5 * u - 3.4 * u, hy + 4.6 * u, tcx + f * 5 * u + 3.4 * u, hy + 9.4 * u, 1 * u), "#c9a24a", 1 * u);   // a small brass button
    // the ribbed collar
    if (X.back) p.arc(tcx, chin + 0.0 * HH, 0.4 * T.a, 0.05 * HH, 200, 340, 3.6 * u, rib);
    else if (d) { p.arc(tcx + d * 0.5 * T.a, chin, 0.36 * T.a, 0.075 * HH, 0, 180, 4.2 * u, rib); p.arc(tcx + d * 0.5 * T.a, chin + 2.6 * u, 0.36 * T.a, 0.075 * HH, 10, 170, 1.1 * u, mix(rib, INK, 0.4)); }
    else { p.arc(tcx + f * 4 * u, chin - 0.02 * HH, 0.42 * T.a, 0.1 * HH, 12, 168, 4.6 * u, rib); p.arc(tcx + f * 4 * u, chin - 0.02 * HH + 2.8 * u, 0.42 * T.a, 0.1 * HH, 16, 164, 1.1 * u, mix(rib, INK, 0.4)); }
    if (X.back || d) return;
    const cx = tcx + f * 9 * u, g = p.g;
    // C-10 (2026-11-20): smaller, HIGHER on the chest and a WASHED print (it sat in the caption band in s02 / hook B and
    // fought the captions): still reads "NEW YORK" = a tourist
    g.save(); const [px, py] = p.P(cx, chin + 0.24 * HH); g.translate(px, py); if (p.rot && p.rot[0]) g.rotate(p.rot[0]); g.scale(f ? 0.84 : 1, 1);
    g.font = `${Math.round(11.5 * u)}px Arial Black`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = mix(LOOK_TOURIST.tee, "#fffaf0", 0.82);   // LOOK TEST: a light print on the violet tee (was mix(tee, #1c1820, 0.55))
    g.fillText("NEW", 0, -6.3 * u); g.fillText("YORK", 0, 6.3 * u);
    g.restore();
  });
};
/** SHORT SLEEVES: the tee's sleeve over the upper arm with a ribbed hem, a BARE arm (skin, inked) below it */
/** THE v4 ARM (BENCHMARK 6.3, 2026-11-20): every arm is a THIN DARK INK LINE (about the outline's weight, like our
 *  anti-theft / clown films and the references), its colour a dark shade of the sleeve; the hand at its end is a small
 *  mitten (the kit) or the driver's white glove at hand size. No tube arms, no sleeve bands */
export const INK_ARM_W = 5.0;
const inkArm = (col: string): NonNullable<PPL.Extras["sleeve"]> => (p, pts, _s, X) => { p.stroke(pts, INK_ARM_W * X.u, mix(col, INK, 0.78)); };
const teeSleeve = (tee: string, _rib: string): NonNullable<PPL.Extras["sleeve"]> => inkArm(tee);
/** A BOWLER HAT (the boss; the kit has none): a round black dome on the crown, a short curled brim, a dark band */
const bowler: Layer = (p, X) => {
  const { R, u } = X, H = R.H, hc = R.hc; p.rot = X.headRot as number[] | null;
  const top = hc - 0.98 * H.b, cx = 300 + (profD(X) || 0) * -0.05 * H.a;
  p.poly(ellP(cx, top + 0.1 * H.b, 0.62 * H.a, 0.42 * H.b), "#1a1618", 1.6 * u);                 // the dome
  p.poly(ellP(cx, top + 0.42 * H.b, 0.95 * H.a, 0.12 * H.b), "#1a1618", 1.6 * u);                 // the brim
  p.band([[cx - 0.6 * H.a, top + 0.3 * H.b], [cx + 0.6 * H.a, top + 0.3 * H.b]], "#3a3440", 4 * u, 0.8 * u, "butt");   // the band
  p.arc(cx - 0.18 * H.a, top - 0.02 * H.b, 0.25 * H.a, 0.18 * H.b, 200, 260, 1.6 * u, "#6a6070");   // a gloss
};
/** SOOT on the fireman's face (front / 3-4 views): dark smudges on a cheek and the brow */
const soot: Layer = (p, X) => {
  if (X.back) return; const { R, u } = X, H = R.H, hc = R.hc, f = X.facing || 1; p.rot = X.headRot as number[] | null;
  p.clip(blobPts(300, hc, H), () => { const g = p.g; g.save(); g.globalAlpha = 0.35;
    p.poly(ellP(300 - f * 0.42 * H.a, hc + 0.32 * H.b, 0.22 * H.a, 0.12 * H.b, 0.3), "#3a3238", 0);
    p.poly(ellP(300 + f * 0.35 * H.a, hc - 0.28 * H.b, 0.2 * H.a, 0.08 * H.b, -0.2), "#3a3238", 0); g.restore(); });
};
/** stubble on the jaw (front views): a soft lavender-grey tint + flecks under the mouth */
const stubble = (amt: number): Layer => (p, X) => {
  if (X.back || profD(X)) return;
  const { R, u } = X, H = R.H, hc = R.hc, f = X.facing; p.rot = X.headRot as number[] | null;
  p.clip(blobPts(300, hc, H), () => {
    const g = p.g; g.save(); g.globalAlpha = 0.2 * amt;
    p.poly(ellP(300 + f * 8 * u, hc + 0.62 * H.b, 0.74 * H.a, 0.42 * H.b), "#8a7a96", 0); g.restore();
    g.save(); g.globalAlpha = 0.5 * amt;
    for (let i = 0; i < 22; i++) { const a = Math.PI * (0.12 + 0.76 * ((i * 0.618) % 1)), r = 0.5 + 0.4 * ((i * 0.377) % 1); p.dot(300 + f * 8 * u + Math.cos(a) * r * 0.66 * H.a, hc + 0.5 * H.b + Math.sin(a) * r * 0.42 * H.b, 0.7 * u, "#7a6a86"); }
    g.restore();
  });
  p.rot = null;
};
/** BACK OF THE HEAD (2026-11-20, look director for the lead: f137-139 the tourist's head from behind read as a blank
 *  skin face with a brown beard): from behind, short hair covers the head from under the cap / crown down to the nape,
 *  with a soft gradient, a few strand lines and a pale neck strip at the very bottom. `top` = where the hair starts
 *  (head half-heights above hc; a cap covers what is above) */
const backHairLayer = (col: string, top = 0.12): Layer => (p, X) => {
  if (!X.back || profD(X)) return;
  const { R, u } = X, H = R.H, hc = R.hc; p.rot = X.headRot as number[] | null;
  p.clip(blobPts(300, hc, H), () => {
    const y0 = hc - top * H.b, y1 = hc + 0.84 * H.b, w = 1.4 * H.a;
    const nape: P2[] = [[300 - w, y0], [300 + w, y0], [300 + w, y1 - 0.1 * H.b], [300 + 0.5 * H.a, y1 - 0.02 * H.b], [300, y1 + 0.04 * H.b], [300 - 0.5 * H.a, y1 - 0.02 * H.b], [300 - w, y1 - 0.1 * H.b]];
    p.gradFill(nape, mix(col, "#ffffff", 0.08), shade(col, 0.7), X.light, 0.4); p.poly(nape, null, 0);
    for (let i = -3; i <= 3; i++) p.stroke([[300 + i * 0.26 * H.a, y0 + 0.1 * H.b], [300 + i * 0.24 * H.a + (i >= 0 ? 1 : -1) * 2 * u, y1 - 0.2 * H.b]], 1.1 * u, shade(col, 0.55));
  });
  p.rot = null;
};
/** the tourist's GAP-TOOTHED grin (front views): a dark gap in the top teeth on every open grin / laugh / talk shape */
const GAP_MOUTH: Partial<Record<MouthK, number>> = { grin: -1, laugh: -2, vA: -1.5, vE: -3.4, vI: -1.6 };
const GAP_EXPR: Partial<Record<Expr, MouthK>> = { brightGrin: "grin", laughBig: "laugh", delightB: "laugh", thrillB: "grin", grin: "grin", beam: "grin", laugh: "grin", sideGrin: "grin", gazeGrin: "grin" };
const gapTooth: Layer = (p, X) => {
  if (X.back || profD(X)) return;
  const P = X.pose, mk = P.mouth ?? GAP_EXPR[P.expr ?? "bright"]; if (!mk || GAP_MOUTH[mk] === undefined) return;
  const { R, u } = X, f = X.facing, mx = 300 + 8 * u * f + (P.face?.fdx ?? 0) * u + (mk === "vA" ? 0.5 * u : 0), my = R.hc + 22 * u + (P.face?.fdy ?? 0) * u * 0.8 + GAP_MOUTH[mk]! * u;
  p.rot = X.headRot as number[] | null;
  p.poly(rrect(mx - 0.9 * u, my, mx + 0.9 * u, my + 3.2 * u, 0.4 * u), "#40101c", 0);
  p.rot = null;
};
/** white sneakers with red laces / the kid's white socks over small red sneakers */
const sneaker = (body: string, lace: string, sock?: string) => (p: Pen, heel: P2, toe: P2, u: number) => {
  if (sock) { const dx = toe[0] - heel[0], dy = toe[1] - heel[1], l = Math.hypot(dx, dy) || 1; p.band([[heel[0] + (dx / l) * 2 * u, heel[1] - 6.5 * u], [heel[0] + (dx / l) * 2 * u, heel[1] - 1.5 * u]], sock, 6.4 * u, 1 * u, "round"); }
  p.stroke([heel, toe], 7.6 * u + 2.6, INK); p.stroke([heel, toe], 7.6 * u, body);
  const m: P2 = [heel[0] * 0.45 + toe[0] * 0.55, heel[1] * 0.45 + toe[1] * 0.55 - 1.6 * u];
  p.stroke([[m[0] - 2.2 * u, m[1] - 0.6 * u], [m[0] + 2.2 * u, m[1] + 0.6 * u]], 1.3 * u, lace);
  p.stroke([[heel[0], heel[1] + 2.4 * u], [toe[0], toe[1] + 2.4 * u]], 1.4 * u, shade(body, 0.8));
};
/** the kid's shorts (the lower torso in navy + two short legs of the shorts) and his white collar trim */
const kidShorts: Layer = (p, X) => {
  const { R, u } = X, { tcx, torsoBot, HH, T } = R;
  torsoClip(p, X, () => { p.poly([[tcx - 2 * T.a, torsoBot - 0.2 * HH], [tcx + 2 * T.a, torsoBot - 0.2 * HH], [tcx + 2 * T.a, torsoBot + 0.3 * HH], [tcx - 2 * T.a, torsoBot + 0.3 * HH]], F.COL.kidShorts, 0);
    p.stroke([[tcx - 2 * T.a, torsoBot - 0.2 * HH], [tcx + 2 * T.a, torsoBot - 0.2 * HH]], 1.4 * u, shade(F.COL.kidShorts, 0.6)); });
  p.rot = X.bodyRot as number[] | null;
  for (const sd of [-1, 1]) p.poly(rrect(tcx + sd * 0.5 * T.a - 9 * u, torsoBot - 0.04 * HH, tcx + sd * 0.5 * T.a + 9 * u, torsoBot + 0.1 * HH, 3 * u), F.COL.kidShorts, 1.6 * u);
  p.rot = null;
  if (!X.back) torsoClip(p, X, () => p.arc(tcx + (profD(X) || X.facing) * 0.3 * T.a * (profD(X) ? 2 : 1), R.chin - 0.02 * HH, 0.42 * T.a, 0.09 * HH, 15, 165, 3.4 * u, "#fbf8f2"));
};
/** a small plain backpack (the kid: green): straps in front, the pack from behind / in profile */
const backpack = (col: string): { pre: Layer; post: Layer } => ({
  pre: (p, X) => { if (X.back) return; const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R, d = profD(X); p.rot = X.bodyRot as number[] | null;
    if (d) p.poly(rrect(tcx - d * 1.25 * T.a - 0.4 * T.a, chin + 0.05 * HH, tcx - d * 1.25 * T.a + 0.4 * T.a, torsoBot - 0.18 * HH, 10 * u), col, 2 * u);
    else p.poly(rrect(tcx - 1.12 * T.a, chin + 0.04 * HH, tcx + 1.12 * T.a, torsoBot - 0.2 * HH, 12 * u), col, 2 * u);
    p.rot = null; },
  post: (p, X) => { const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R;
    if (X.back) { p.rot = X.bodyRot as number[] | null; const pk = rrect(tcx - 0.8 * T.a, chin + 0.08 * HH, tcx + 0.8 * T.a, torsoBot - 0.14 * HH, 12 * u);
      p.gradFill(pk, col, shade(col, 0.78), X.light, 0.3); p.poly(pk, null, 2.2 * u); p.poly(rrect(tcx - 0.5 * T.a, chin + 0.45 * HH, tcx + 0.5 * T.a, torsoBot - 0.2 * HH, 6 * u), shade(col, 0.86), 1.5 * u); p.rot = null; return; }
    if (profD(X)) { notHead(p, X, () => { p.rot = X.bodyRot as number[] | null; const d = profD(X); p.band([[tcx - d * 0.2 * T.a, chin - 0.04 * HH], [tcx + d * 0.1 * T.a, chin + 0.3 * HH], [tcx - d * 0.4 * T.a, chin + 0.52 * HH]], col, 5 * u, 1.2 * u, "round"); }); return; }
    notHead(p, X, () => { p.rot = X.bodyRot as number[] | null; for (const sd of [-1, 1]) p.band([[tcx + sd * 0.62 * T.a, chin - 0.04 * HH], [tcx + sd * 0.7 * T.a, chin + 0.2 * HH], [tcx + sd * 0.86 * T.a, chin + 0.48 * HH]], col, 5.6 * u, 1.3 * u, "round"); });
  },
});
/** the commuter's knit beanie (front / back views) and his headphones round the neck */
const beanie = (col: string): Layer => (p, X) => {
  if (profD(X)) return;
  const { R, u } = X, H = R.H, hc = R.hc; p.rot = X.headRot as number[] | null;
  const dome: P2[] = []; for (let i = 0; i <= 22; i++) { const t = Math.PI + (Math.PI * i) / 22; dome.push([300 + 1.08 * H.a * Math.cos(t), hc - 0.36 * H.b + 0.78 * H.b * Math.sin(t)]); }
  const shd = mul(col, [0.7, 0.68, 0.8]);
  p.shadedFill(dome, col, shd, X.light, H.a, 0.4); p.poly(dome, null, 3.2 * u);
  p.clip(dome, () => { for (let k = -5; k <= 5; k++) p.stroke([[300 + k * 0.19 * H.a, hc - 1.2 * H.b], [300 + k * 0.2 * H.a, hc - 0.4 * H.b]], 1 * u, shd); });
  const cuff = rrect(300 - 1.1 * H.a, hc - 0.56 * H.b, 300 + 1.1 * H.a, hc - 0.32 * H.b, 5 * u);
  p.poly(cuff, mix(col, "#000000", 0.12), 2 * u);
  p.clip(cuff, () => { for (let k = -8; k <= 8; k++) p.stroke([[300 + k * 0.13 * H.a, hc - 0.6 * H.b], [300 + k * 0.13 * H.a, hc - 0.28 * H.b]], 1.1 * u, mix(col, "#000000", 0.3)); });
  p.rot = null;
};
const neckCans = (col: string): Layer => (p, X) => {
  const { R, u } = X, d = profD(X); p.rot = X.bodyRot as number[] | null;
  const y = R.chin + 0.04 * R.HH;
  if (d) { p.poly(ellP(R.tcx + d * 0.1 * R.T.a, y, 9 * u, 12 * u, 0.2 * d), col, 2 * u); p.stroke([[R.tcx + d * 0.1 * R.T.a - 3 * u, y - 8 * u], [R.tcx - d * 0.3 * R.T.a, y - 12 * u]], 4 * u, shade(col, 0.6)); }
  else { if (!X.back) p.arc(R.tcx, y - 4 * u, 0.52 * R.T.a, 0.08 * R.HH, 0, 180, 4.6 * u, shade(col, 0.6));
    for (const sd of [-1, 1]) { p.poly(ellP(R.tcx + sd * 0.56 * R.T.a, y + 2 * u, 9 * u, 11 * u, sd * 0.4), col, 2 * u); p.stroke([[R.tcx + sd * 0.56 * R.T.a - 3 * u, y - 4 * u], [R.tcx + sd * 0.56 * R.T.a - 1 * u, y + 7 * u]], 1.5 * u, mix(col, "#ffffff", 0.5)); } }
  p.rot = null;
};
/** the researcher's white LAB COAT over the torso (open at the front: the brick shirt shows), longer than the torso */
const labCoat: Layer = (p, X) => notHead(p, X, () => {
  const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R, d = profD(X), f = d || X.facing; p.rot = X.bodyRot as number[] | null;
  const w = 1.14 * T.a, bot = torsoBot + 0.34 * HH, cx = tcx + f * 3 * u;
  const coat: P2[] = [[cx - w * 0.82, chin - 0.04 * HH], [cx + w * 0.82, chin - 0.04 * HH], [cx + w, chin + 0.3 * HH], [cx + w * 1.04, bot], [cx - w * 1.04, bot], [cx - w, chin + 0.3 * HH]];
  p.gradFill(coat, F.COL.labCoat, mul(F.COL.labCoat, [0.78, 0.76, 0.86]), X.light, 0.3); p.poly(coat, null, 2.4 * u);
  if (!X.back) {
    const ox = d ? cx + d * 0.55 * w : cx;
    p.poly([[ox - 0.36 * w, chin - 0.04 * HH], [ox + 0.36 * w, chin - 0.04 * HH], [ox + 0.16 * w, bot], [ox - 0.16 * w, bot]], F.COL.brick, 1.6 * u);
    for (const sd of [-1, 1]) p.stroke([[ox + sd * 0.4 * w, chin - 0.04 * HH], [ox + sd * 0.16 * w, chin + 0.36 * HH], [ox + sd * 0.18 * w, bot]], 1.5 * u, "#b9b8c4");
    if (!d) { p.poly(rrect(cx + 0.4 * w, chin + 0.24 * HH, cx + 0.8 * w, chin + 0.36 * HH, 1 * u), null, 1.2 * u, "#b9b8c4"); p.stroke([[cx + 0.55 * w, chin + 0.22 * HH], [cx + 0.55 * w, chin + 0.31 * HH]], 1.6 * u, "#2f6fe0");
      for (const sd of [-1, 1]) p.poly(rrect(cx + sd * 0.62 * w - 11 * u, torsoBot + 0.08 * HH, cx + sd * 0.62 * w + 11 * u, torsoBot + 0.2 * HH, 1 * u), null, 1.2 * u, "#b9b8c4"); }
  } else p.stroke([[cx, chin + 0.1 * HH], [cx, bot]], 1.3 * u, "#b9b8c4");
  p.rot = null;
});
const coatSleeve: NonNullable<PPL.Extras["sleeve"]> = inkArm(F.COL.labCoat);
const navySleeve: NonNullable<PPL.Extras["sleeve"]> = (p, pts, _s, X) => {
  const u = X.u, n = pts.length, white = (X.pose as CPose).white ?? "#ffffff"; p.stroke(pts, INK_ARM_W * u, mix(F.COL.navy, INK, 0.5));
  // the glove's small white cuff at the wrist (inked), so the white hand never floats on a thin line
  const a = pts[n - 1], b = pts[Math.max(0, n - 3)], dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1, cx = dx / l, cy = dy / l;
  p.band([[a[0] - cx * 4.2 * u, a[1] - cy * 4.2 * u], [a[0] - cx * 0.4 * u, a[1] - cy * 0.4 * u]], white, 6.4 * u, 1.2 * u, "butt");
};
/** THE MUM'S TRENCH COAT (every view): a belted beige coat that runs past the hips (the torso bean is its top), a cream
 *  collar with notched lapels, two rows of horn buttons, a belt with a brass buckle; from behind a yoke line, the belt
 *  and a centre vent; in profile the front edge, the belt and one row of buttons */
const trench: Layer = (p, X) => notHead(p, X, () => {
  const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R, d = profD(X), f = d || X.facing, col = LOOK_MUM.coat, dk = shade(col, 0.62); p.rot = X.bodyRot as number[] | null;
  const w = 1.1 * T.a, bot = torsoBot + 0.3 * HH, cx = tcx + f * 2 * u, by = torsoBot - 0.34 * HH;
  // the skirt of the coat under the torso (a soft A-line), with the hem
  const skirt: P2[] = [[cx - w * 0.9, torsoBot - 0.42 * HH], [cx + w * 0.9, torsoBot - 0.42 * HH], [cx + w * 1.08, bot], [cx - w * 1.08, bot]];
  p.gradFill(skirt, col, mul(col, [0.8, 0.77, 0.84]), X.light, 0.3); p.poly(skirt, null, 2.3 * u);
  p.stroke([[cx - w * 1.05, bot - 2.4 * u], [cx + w * 1.05, bot - 2.4 * u]], 1.2 * u, dk);
  // the belt (over the waist) + its buckle
  const belt = rrect(cx - w * 0.98, by - 0.035 * HH, cx + w * 0.98, by + 0.035 * HH, 1.6 * u);
  p.poly(belt, shade(col, 0.8), 1.5 * u);
  if (X.back) { p.stroke([[cx, chin + 0.2 * HH], [cx, by - 0.04 * HH]], 1.2 * u, dk); p.stroke([[cx, by + 0.05 * HH], [cx, bot]], 1.4 * u, dk);
    p.arc(cx, chin + 0.16 * HH, 0.8 * T.a, 0.07 * HH, 20, 160, 1.3 * u, dk); p.rot = null; return; }
  const bx = d ? cx + d * 0.72 * w : cx + f * 3 * u;
  p.poly(rrect(bx - 4.6 * u, by - 0.05 * HH, bx + 4.6 * u, by + 0.05 * HH, 1.2 * u), "#c9a24a", 1.3 * u); p.poly(rrect(bx - 2.2 * u, by - 0.026 * HH, bx + 2.2 * u, by + 0.026 * HH, 0.6 * u), shade(col, 0.8), 0.9 * u);
  if (d) { // profile: the front edge, a lapel, one row of buttons
    const fx = tcx + d * 0.74 * T.a;
    p.poly([[fx + d * 0.28 * T.a, chin - 0.1 * HH], [fx + d * 0.04 * T.a, chin + 0.26 * HH], [fx + d * 0.34 * T.a, chin + 0.26 * HH]], "#efe3c8", 1.2 * u);
    p.stroke([[fx - d * 0.16 * T.a, chin - 0.02 * HH], [fx, chin + 0.3 * HH], [fx + d * 0.06 * T.a, bot]], 1.4 * u, dk);
    for (const k of [0.36, 0.56, 0.98, 1.16]) p.dot(fx - d * 0.14 * T.a, chin + k * HH, 2.3 * u, "#6a5140");
    p.rot = null; return;
  }
  // front / 3-4: the cream collar + the lapels' V, the front edge, two rows of buttons, a storm flap line
  const vb = chin + 0.34 * HH;
  p.poly([[cx - 0.36 * T.a, chin - 0.08 * HH], [cx + 0.36 * T.a, chin - 0.08 * HH], [cx, vb]], "#efe3c8", 0);
  for (const sd of [-1, 1]) { p.poly([[cx + sd * 0.42 * T.a, chin - 0.07 * HH], [cx + sd * 0.72 * T.a, chin + 0.12 * HH], [cx + sd * 0.3 * T.a, chin + 0.24 * HH], [cx + sd * 0.02 * T.a, vb]], mix(col, "#ffffff", 0.12), 1.5 * u);
    p.stroke([[cx + sd * 0.62 * T.a, chin + 0.07 * HH], [cx + sd * 0.74 * T.a, chin + 0.02 * HH]], 1.2 * u, dk); }
  p.stroke([[cx + f * 2 * u, vb], [cx + f * 2 * u, bot]], 1.4 * u, dk);
  for (const k of [0.46, 0.62, 1.0, 1.18]) for (const sd of [-1, 1]) p.dot(cx + f * 2 * u + sd * 0.26 * T.a, chin + k * HH, 2.4 * u, "#6a5140");
  p.rot = null;
});
/** the trench's sleeve: a cloth band with a strap near the cuff */
const trenchSleeve: NonNullable<PPL.Extras["sleeve"]> = (p, pts, _s, X) => inkArm(LOOK_MUM.coat)(p, pts, _s, X);
const toteStrap: Layer = (p, X) => { if (X.back) return; const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R; notHead(p, X, () => { p.rot = X.bodyRot as number[] | null;
  p.band([[tcx - 0.62 * T.a, chin - 0.03 * HH], [tcx - 0.78 * T.a, torsoBot - 0.3 * HH]], F.COL.tote, 3.6 * u, 1 * u, "round");
  p.poly(rrect(tcx - 1.45 * T.a, torsoBot - 0.36 * HH, tcx - 0.55 * T.a, torsoBot + 0.04 * HH, 3 * u), F.COL.tote, 2 * u); }); };
/** a BOB's top (front views): the kit draws a bob only at the sides (it was made for a hat), so a bob-haired head reads
 *  bald on top: this adds the hair cap with a soft fringe (the clown cast's own bobTop is not exported) */
const bobTopL: Layer = (p, X) => {
  if (X.back || profD(X)) return;
  const { R, u } = X, H = R.H, hc = R.hc, col = X.o.hair ?? "#5a3b2a"; p.rot = X.headRot as number[] | null;
  const cut = hc - 0.5 * H.b, top = blobPts(300, hc, H).filter(([, y]) => y < cut).map(([x, y]) => [300 + (x - 300) * 1.04, hc + (y - hc) * 1.04] as P2);
  top.sort((a, b) => Math.atan2(a[1] - hc, a[0] - 300) - Math.atan2(b[1] - hc, b[0] - 300));
  const x0 = top[0][0], x1 = top[top.length - 1][0], fr: P2[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; fr.push([x1 + (x0 - x1) * t, cut + 5 * u * Math.sin(Math.PI * t) + (i % 2 ? 2.2 * u : 0)]); }
  const cap = [...top, ...fr];
  p.gradFill(cap, col, shade(col, 0.8), X.light, 0.4); p.poly(cap, null, 3.2 * u);
  p.arc(300 - 0.3 * H.a, hc - 0.72 * H.b, 16 * u, 7 * u, 200, 290, 2.6 * u, mix(col, "#ffffff", 0.5));
  p.rot = null;
};
const maskL: Layer = (p, X) => { if (X.back || profD(X)) return; const { R, u } = X, H = R.H, f = X.facing; p.rot = X.headRot as number[] | null;
  p.poly(rrect(300 + f * 8 * u - 0.5 * H.a, R.hc + 0.2 * H.b, 300 + f * 8 * u + 0.5 * H.a, R.hc + 0.72 * H.b, 9 * u), "#fbfbf8", 1.8 * u);
  for (const k of [0.36, 0.5]) p.stroke([[300 + f * 8 * u - 0.42 * H.a, R.hc + k * H.b], [300 + f * 8 * u + 0.42 * H.a, R.hc + k * H.b]], 1 * u, "#d6d6dc"); p.rot = null; };
const furoshiki: Layer = (p, X) => { const { R, u } = X, { tcx, torsoBot, HH, T } = R; p.rot = X.bodyRot as number[] | null;
  const b = ellP(tcx, torsoBot - 0.1 * HH, 0.95 * T.a, 0.2 * HH); p.poly(b, F.COL.furoshiki, 2 * u);
  p.clip(b, () => { for (let k = -4; k <= 4; k++) p.dot(tcx + k * 0.22 * T.a, torsoBot - 0.1 * HH + (k % 2) * 6 * u, 2.2 * u, "#e9e4f2"); });
  p.poly([[tcx - 8 * u, torsoBot - 0.28 * HH], [tcx + 8 * u, torsoBot - 0.28 * HH], [tcx + 12 * u, torsoBot - 0.36 * HH], [tcx - 12 * u, torsoBot - 0.36 * HH]], F.COL.furoshiki, 1.6 * u); p.rot = null; };

/** the tourist's FILMING phone, held up in front (cobalt case): the back with the camera block toward the lens in a front
 *  view, the glowing screen (+ a tiny REC dot) in a back view, a thin slab in profile */
const filmPhone: Layer = (p, X) => {
  const P = X.pose as CPose, fm = P.film; if (!fm || fm.k < 0.05) return;
  const hand = X.hands.find((h) => h.side === fm.side); if (!hand) return;
  const u = X.u, [hx, hy] = hand.h, d = profD(X) || (fm.edge ? (X.facing || 1) : 0), col = F.COL.phoneCobalt, a = ((fm.tilt ?? 0) * Math.PI) / 180;
  const R = (pts: P2[]) => pts.map(([x, y]) => [hx + (x - hx) * Math.cos(a) - (y - hy) * Math.sin(a), hy + (x - hx) * Math.sin(a) + (y - hy) * Math.cos(a)] as P2);
  if (d) { // edge-on: the lit screen faces HIM (a pale strip on his side), the camera bump faces away
    p.poly(R(rrect(hx - 3.6 * u, hy - 44 * u, hx + 3.6 * u, hy + 6 * u, 1.8 * u)), col, 2.4 * u, "#15111d");
    p.stroke(R([[hx - d * 3.4 * u, hy - 40 * u], [hx - d * 3.4 * u, hy + 2 * u]]), 1.7 * u, "#bfe6ff");
    p.poly(R(rrect(hx + d * 3.6 * u - (d < 0 ? 3 * u : 0), hy - 40 * u, hx + d * 3.6 * u + (d > 0 ? 3 * u : 0), hy - 29 * u, 1 * u)), "#221d2c", 0.9 * u);
    return;
  }
  const w = 14 * u, t = 25 * u, cx = hx, cy = hy - 14 * u;
  p.poly(R(rrect(cx - w, cy - t, cx + w, cy + t, 5 * u)), X.back ? "#15111d" : col, 3 * u, "#15111d");
  if (X.back) { // the screen: a bright clip of what he films + REC
    p.poly(R(rrect(cx - w + 2.6 * u, cy - t + 2.6 * u, cx + w - 2.6 * u, cy + t - 2.6 * u, 3 * u)), "#9fd4f0", 0);
    p.poly(R(rrect(cx - w + 2.6 * u, cy + 2 * u, cx + w - 2.6 * u, cy + t - 2.6 * u, 3 * u)), "#5f8a6a", 0);
    if (fm.rec !== false) p.dot(...R([[cx - w + 6 * u, cy - t + 6 * u]])[0], 2.2 * u, "#ff2a2a");
  } else {
    p.poly(R(rrect(cx + w - 13 * u, cy - t + 4 * u, cx + w - 3.5 * u, cy - t + 16 * u, 2.4 * u)), "#221d2c", 1 * u);
    p.dot(...R([[cx + w - 8.2 * u, cy - t + 7.6 * u]])[0], 2 * u, "#93a9d0"); p.dot(...R([[cx + w - 8.2 * u, cy - t + 12.6 * u]])[0], 1.6 * u, "#93a9d0");
    p.stroke(R([[cx - 6 * u, cy - 6 * u], [cx - 1 * u, cy + 6 * u]]), 2 * u, mix(col, "#ffffff", 0.6));
  }
  // the fingers wrap the sides
  for (const sd of [-1, 1]) p.poly(R(ellP(cx + sd * (w + 0.5 * u), cy + 10 * u, 3 * u, 5 * u)), P.skin ?? F.COL.skin, 1.2 * u);
};
/** small held props drawn at a hand: a stopwatch, a pen, the furoshiki knot... */
const heldProps: Layer = (p, X) => {
  const P = X.pose as CPose; if (!P.hold) return; const u = X.u;
  for (const h of P.hold) {
    const hand = X.hands.find((q) => q.side === h.side); if (!hand) continue; const [x, y] = hand.h;
    if (h.k === "stopwatch") { p.poly(ellP(x, y - 9 * u, 9 * u, 9 * u), "#d9dbe2", 2 * u); p.poly(ellP(x, y - 9 * u, 6.4 * u, 6.4 * u), "#fbfbf8", 1 * u); p.stroke([[x, y - 9 * u], [x + 3 * u * Math.sin(h.open ?? 0), y - 9 * u - 5 * u * Math.cos(h.open ?? 0)]], 1.2 * u, "#c8332e"); p.poly(rrect(x - 2 * u, y - 22 * u, x + 2 * u, y - 18 * u, 1 * u), "#b9bcc8", 1 * u); }
    else if (h.k === "pen") p.band([[x - 2 * u, y + 2 * u], [x + 4 * u, y - 16 * u]], "#2f6fe0", 2.8 * u, 0.9 * u, "round");
    else if (h.k === "watch") p.band([[x - 4 * u, y + 6 * u], [x + 4 * u, y + 6 * u]], "#c9ced8", 4 * u, 1 * u, "round");
    else if (h.k === "shovel") { // v4 fireman: a long wooden handle down through the hand, the blade at the floor end
      p.stroke([[x - 6 * u, y - 26 * u], [x + 10 * u, y + 62 * u]], 3.4 * u, "#8a5a32"); p.stroke([[x - 6 * u, y - 26 * u], [x + 10 * u, y + 62 * u]], 1 * u, INK);
      p.poly([[x + 2 * u, y + 60 * u], [x + 22 * u, y + 64 * u], [x + 20 * u, y + 82 * u], [x + 2 * u, y + 80 * u]], "#5a5f6a", 1.6 * u);
      p.poly([[x + 5 * u, y + 66 * u], [x + 18 * u, y + 68 * u], [x + 17 * u, y + 76 * u], [x + 6 * u, y + 75 * u]], "#1c1a1e", 0);   // coal on it
    } else if (h.k === "notebook") { p.poly(rrect(x - 7 * u, y - 16 * u, x + 7 * u, y + 2 * u, 1.2 * u), "#f2ead6", 1.4 * u); p.band([[x - 7 * u, y - 16 * u], [x - 7 * u, y + 2 * u]], "#8a2a2a", 2.2 * u, 0.8 * u, "butt"); }
  }
};

/** the hand that points AT THE LENS (CPose.lensPoint): a front-on fist + the fingertip coming at us, bigger the further out */
const lensHand = (glove?: string, arm?: { col: string; cuff?: string }): Layer => (p, X) => {
  const lp = (X.pose as CPose).lensPoint; if (!lp || lp.k < 0.03) return;
  const hand = X.hands.find((h) => h.side === lp.side); if (!hand) return;
  const k = clamp(lp.k, 0, 1.2), s = 15 * X.u * (lp.hs ?? 1.2) * (1 + 1.25 * k);
  drawLensPoint(p, [hand.h[0], hand.h[1] - 0.2 * s], s, { fill: glove ?? (X.pose as CPose).skin ?? F.COL.skin, line: glove ? "#c6bfd2" : "#b3a2c0", side: lp.side < 0 ? 1 : -1, thrust: k, glove: !!glove, ow: 1.5 * X.u * Math.sqrt(1 + k),
    arm: arm ? { col: arm.col, cuff: arm.cuff, from: lp.side < 0 ? -0.45 : 0.45, len: 0.75 } : undefined });
};

/** OUR ARMS FOR AIMED POINTING (gesture.ts aimArm marks the arm with `ext`; C-4). The kit solves where the hand is; we
 *  draw the arm: blended from the kit's bent arm to ONE STRAIGHT LINE shoulder -> wrist by ext.straight (at the ear the
 *  elbow is out, on the point the arm is a ruler), run on by ext.by when the target is further than the arm, and the
 *  hand ALONG THAT LINE: the index finger continues the forearm toward the target (never an upright hand on a
 *  diagonal forearm). Seen from behind the arm goes INTO the picture: it tapers and the hand is smaller (foreshortened) */
type ArmExt = { by: P2; k: number; hand: PPL.HandKind; straight: number };
const armWrap = (base: PPL.Extras["sleeve"] | undefined, o: Outfit, glove: string | undefined, taper?: { col: string; cuff?: string }, skinPoint?: string): NonNullable<PPL.Extras["sleeve"]> => (p, pts, side, X) => {
  const P = X.pose as CPose, A = (side < 0 ? P.armL : P.armR) as (PPL.Arm & { ext?: ArmExt }) | null | undefined, ext = A?.ext, u = X.u;
  const plain = (q: P2[]) => { if (base) base(p, q, side, X); else p.stroke(q, 5.6 * u, mix(o.cardigan ?? o.shirt, INK, 0.88)); };
  if (!ext) { plain(pts); return; }
  const n = pts.length, S = pts[0], q1 = clamp(ext.k, 0, 1.12), bx = ext.by[0] * q1, by = ext.by[1] * q1, W: P2 = [pts[n - 1][0] + bx, pts[n - 1][1] + by], sK = clamp(ext.straight, 0, 1);
  const Q = pts.map(([x, y], i) => { const t = i / (n - 1), ex = x + bx * t, ey = y + by * t, lx = S[0] + (W[0] - S[0]) * t, ly = S[1] + (W[1] - S[1]) * t; return [ex + (lx - ex) * sK, ey + (ly - ey) * sK] as P2; });
  const a = Q[n - 1], b = Q[Math.max(0, n - 4)], dir = Math.atan2(a[1] - b[1], a[0] - b[0]), far = clamp((-(P.c ?? 1) - 0.2) / 0.45, 0, 1) * sK, kind0 = ext.hand;   // seen from behind: the arm goes INTO the picture
  const gloved = !!taper && kind0 === "point";            // the driver: OUR glove, long along the arm (never a fist with a finger up)
  if (taper && far > 0.3) { // from behind, into the picture: a wide near end at the shoulder, a slim far end at the wrist
    const L = Math.hypot(a[0] - S[0], a[1] - S[1]) || 1, nx = -(a[1] - S[1]) / L, ny = (a[0] - S[0]) / L, w0 = (3.8 + 5.4 * far) * u, w1 = (3.8 - 1.2 * far) * u;
    void L; void nx; void ny; void w0; void w1; p.stroke([S, a], INK_ARM_W * u, mix(taper.col, INK, 0.5));   // v4: a thin ink line into the picture too
  } else if (gloved) p.stroke(Q, INK_ARM_W * u, mix(taper!.col, INK, 0.5));      // v4: the thin ink arm (the glove brings its own cuff)
  else plain(Q);
  const z0 = (A!.hs ?? 1) * (P.handK ?? 1);
  // (the wrist's accent is all but dropped: hand and forearm stay ONE line; the hand is smaller than the sleeve's near end)
  if (gloved) { drawPointGlove(p, a, dir + (0.2 * (A!.ang ?? 0) * Math.PI) / 180, u * z0 * (1 - 0.36 * far), { fill: glove ?? taper!.cuff, far, cuff: true, ow: 1.5 * u }); return; }
  // C-9: the driver's NON-pointing hand on an aimed arm (by his ear between the words, the wind-up): a flat glove with
  // fingers + cuff, never the kit's white fist (it read as a white ball)
  if (taper && kind0 !== "none") { drawFlatGlove(p, a, dir, u * z0 * (1 - 0.3 * far), { fill: glove ?? taper.cuff, far, cuff: true, ow: 1.5 * u }); return; }
  // (the final's s20: the kit's pointing hand on a long straight arm read as a FIST / a ball: the boy's straight points use
  // the long-along-the-arm pointing hand in skin: the index finger continues the forearm, curled fingers under it)
  if (skinPoint && kind0 === "point" && sK > 0.6) { drawPointGlove(p, a, dir + (0.2 * (A!.ang ?? 0) * Math.PI) / 180, u * z0 * 1.05 * (1 - 0.36 * far), { fill: skinPoint, line: "#c49a8a", far, ow: 1.5 * u }); return; }
  PPL.drawHandShape(p, kind0, a, u, side, (dir * 180) / Math.PI, A!.ang ?? 0, kind0 === "ball" ? Math.max(1, z0 * 0.9) : z0, glove);
};

/** THE LIFT (CPose.held, the boy): his mum's forearms round his waist from behind, her hands clasped on his belly.
 *  Front: both forearms come round his sides to the clasp; side-on: the near forearm crosses his side to his belly;
 *  from behind: her forearms lie along his flanks (her hands are on his belly, out of sight) */
const heldArms: Layer = (p, X) => {
  const P = X.pose as CPose, h = P.held; if (!h || h.k < 0.05) return;
  const { R, u } = X, { T, tcx, tcy, torsoBot } = R, s = P.s ?? 0, col0 = h.col ?? LOOK_MUM.coat, skin = h.skin ?? P.skin ?? F.COL.skin;
  // 2026-11-20 (lead, s06 stills): the forearms were thick skin-coloured tubes. Now: SLIM trench SLEEVES (a shade deeper
  // than the coat so they never land on the skin's cream), a fold line along each, a darker cuff band with its strap,
  // and real HANDS (a palm + four finger lines) spread on his belly
  const col = shade(col0, 0.86), dk = shade(col0, 0.6), cuffC = shade(col0, 0.72);
  const a = T.a, yw = tcy + 0.5 * (torsoBot - tcy), w = 0.4 * a;
  notHead(p, X, () => { p.rot = X.bodyRot as number[] | null;
    if (X.back) { for (const i of [-1, 1]) p.band([[tcx + i * 1.6 * a, yw + 0.5 * w], [tcx + i * 0.98 * a, yw + 0.1 * w]], col, w, 1.4 * u, "round"); return; }
    const pr = clamp((Math.abs(s) - 0.35) / 0.5, 0, 1), d = Math.sign(s) || 1;      // 0 front .. 1 side-on, facing screen side d
    const C: P2 = [tcx + d * pr * 0.72 * a, yw + 0.1 * w];
    for (const i of [-1, 1]) {
      if (pr > 0.6 && i === d) continue;                                              // side-on: only the near forearm shows
      const src: P2 = [tcx + i * 1.55 * a * (1 - pr) - d * pr * 1.7 * a, yw - 0.1 * w], hnd: P2 = [C[0] + i * 0.24 * a * (1 - pr), C[1] + 0.02 * a];
      const end: P2 = [hnd[0] + (src[0] - hnd[0]) * 0.24, hnd[1] + (src[1] - hnd[1]) * 0.24];
      const dx = end[0] - src[0], dy = end[1] - src[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
      // the sleeve: tapering a little toward the wrist, a fold line along it
      const w0 = 0.55 * w, w1 = 0.42 * w;
      p.poly([[src[0] + nx * w0, src[1] + ny * w0], [end[0] + nx * w1, end[1] + ny * w1], [end[0] - nx * w1, end[1] - ny * w1], [src[0] - nx * w0, src[1] - ny * w0]], col, 1.4 * u);
      p.stroke([[src[0] + ux * 0.2 * l - nx * 0.15 * w, src[1] + uy * 0.2 * l - ny * 0.15 * w], [src[0] + ux * 0.7 * l - nx * 0.1 * w, src[1] + uy * 0.7 * l - ny * 0.1 * w]], 0.9 * u, dk);
      // the cuff band + its strap
      const c0: P2 = [end[0] - ux * 0.17 * a, end[1] - uy * 0.17 * a];
      p.poly([[c0[0] + nx * w1 * 1.08, c0[1] + ny * w1 * 1.08], [end[0] + nx * w1 * 1.08, end[1] + ny * w1 * 1.08], [end[0] - nx * w1 * 1.08, end[1] - ny * w1 * 1.08], [c0[0] - nx * w1 * 1.08, c0[1] - ny * w1 * 1.08]], cuffC, 1.2 * u);
      p.stroke([[c0[0] + ux * 0.07 * a + nx * w1, c0[1] + uy * 0.07 * a + ny * w1], [c0[0] + ux * 0.07 * a - nx * w1 * 0.3, c0[1] + uy * 0.07 * a - ny * w1 * 0.3]], 1.1 * u, dk);
      // the hand: a palm along the forearm's line, four finger lines curling over his belly
      const hc: P2 = [end[0] + ux * 0.16 * a, end[1] + uy * 0.16 * a];
      p.poly(ellP(hc[0], hc[1], 0.2 * a, 0.15 * a, Math.atan2(uy, ux)), skin, 1.2 * u);
      for (const k of [-1.5, -0.5, 0.5, 1.5]) { const fx = hc[0] + ux * 0.1 * a + nx * k * 0.055 * a, fy = hc[1] + uy * 0.1 * a + ny * k * 0.055 * a; p.stroke([[fx - ux * 0.07 * a, fy - uy * 0.07 * a], [fx + ux * 0.05 * a, fy + uy * 0.05 * a]], 0.7 * u, "#b3a2c0"); }
    }
  });
  p.rot = null;
};

// ================================================================== the cast table
type Spec = {
  fit: Outfit; crownM: number; seed: number;
  x?: (P: CPose) => PPL.Extras;
  /** profile head extras */
  pro: (P: CPose) => { hair: HairStyleP; hat?: HatP | null; glasses?: "round" | "half" | "rect" | null; cord?: string; moustache?: string; stubble?: number; pencil?: string };
  /** face defaults (front views) */
  face?: PPL.Pose["face"];
};
const cmb = (...ls: (Layer | undefined)[]): Layer => (p, X) => { for (const l of ls) if (l) { l(p, X); p.rot = null; } };
const KIDPACK = backpack(F.COL.kidPack);
export const SPECS = {
  driver: { fit: F.DRIVER, crownM: 1.52, seed: 4, face: { browGap: 14, browMin: -18.5, browHalo: F.COL.skin },
    x: (P: CPose) => ({ post: cmb(driverJacket, uniformCap(F.COL.navy, 1, 0, 0)), glove: P.white ?? DRIVER_GLOVE, sleeve: navySleeve, top: cmb(heldProps, lensHand(P.white ?? DRIVER_GLOVE, { col: F.COL.navy, cuff: P.white ?? DRIVER_GLOVE })) }),
    pro: () => ({ hair: "short" as HairStyleP, hat: { k: "uniform", col: F.COL.navy } as HatP }) },
  tourist: { fit: TOURIST_FIT, crownM: 1.57, seed: 7,
    x: () => ({ post: cmb(nyTee, stubble(0.9), gapTooth, backHairLayer("#5a3b2a", 0.05)), shoe: sneaker("#fbfaf6", F.COL.lace), sleeve: teeSleeve(LOOK_TOURIST.tee, LOOK_TOURIST.rib), top: cmb(filmPhone, lensHand()) }),
    pro: () => ({ hair: "short" as HairStyleP, hat: { k: "ball", col: LOOK_TOURIST.cap } as HatP, stubble: 0.9 }) },
  kid: { fit: F.KID, crownM: 1.12, seed: 2, face: { browGap: 14, browMin: -20, browHalo: F.COL.skin, blush: 0.35 },
    x: (P: CPose) => ({ pre: KIDPACK.pre, post: cmb(kidShorts, KIDPACK.post, uniformCap(F.COL.toyCap, 1.16, P.capTilt ?? -7, 0.07 + 0.5 * (P.capDrop ?? 0))), legCol: ["#f1ddd0", "#f1ddd0"] as [string, string], legW: 6.6 * 2.4,
      shoe: sneaker(F.COL.kidShoe, "#fbf8f2", F.COL.kidSock), sleeve: teeSleeve(F.COL.kidTee, "#fbf8f2"), top: cmb(heldArms, lensHand()) }),
    pro: (P: CPose) => ({ hair: "short" as HairStyleP, hat: { k: "uniform", col: F.COL.toyCap, scale: 1.16, tilt: P.capTilt ?? -7, drop: 0.07 + 0.5 * (P.capDrop ?? 0) } as HatP }) },
  kid_mum: { fit: MUM_FIT, crownM: 1.52, seed: 5, face: { blush: 0.22 },
    x: () => ({ post: cmb(trench, toteStrap, bobTopL), sleeve: trenchSleeve }), pro: () => ({ hair: "bob" as HairStyleP }) },
  // ---- the v4 cast (the true story)
  lab_woman: { fit: F.LAB_WOMAN, crownM: 1.55, seed: 41, face: { blush: 0.25, browGap: 14 }, x: () => ({ sleeve: inkArm(F.LAB_WOMAN.shirt), top: heldProps }),
    pro: () => ({ hair: "pony" as HairStyleP }) },
  lab_a: { fit: F.LAB_MAN_A, crownM: 1.6, seed: 42, x: () => ({ sleeve: inkArm(F.LAB_MAN_A.shirt) }), pro: () => ({ hair: "short" as HairStyleP }) },
  lab_b: { fit: F.LAB_MAN_B, crownM: 1.6, seed: 43, x: () => ({ sleeve: inkArm(F.LAB_MAN_B.shirt) }), pro: () => ({ hair: "side" as HairStyleP }) },
  lab_c: { fit: F.LAB_MAN_C, crownM: 1.6, seed: 44, x: () => ({ sleeve: inkArm(F.LAB_MAN_C.shirt) }), pro: () => ({ hair: "crop" as HairStyleP }) },
  lab_d: { fit: F.LAB_WOMAN_B, crownM: 1.52, seed: 45, x: () => ({ sleeve: inkArm(F.LAB_WOMAN_B.shirt), post: bobTopL }), pro: () => ({ hair: "bob" as HairStyleP }) },
  researcher_v4: { fit: F.RESEARCHER_V4, crownM: 1.6, seed: 46, x: () => ({ post: labCoat, sleeve: inkArm("#e8e8e4"), top: heldProps }), pro: () => ({ hair: "swept" as HairStyleP, glasses: "round" as const }) },
  pyjamas: { fit: F.PYJAMAS, crownM: 1.58, seed: 47, x: () => ({ sleeve: inkArm(F.PYJAMAS.shirt) }), pro: () => ({ hair: "messy" as HairStyleP }) },
  hori: { fit: F.HORI, crownM: 1.55, seed: 31, face: { browGap: 14, browMin: -18.5, browHalo: F.COL.skin },
    x: () => ({ post: uniformCap("#1c1a24", 1.04, 0, 0.02), sleeve: inkArm(F.HORI.shirt), top: heldProps }),
    pro: () => ({ hair: "short" as HairStyleP, hat: { k: "uniform", col: "#1c1a24" } as HatP, glasses: "round" as const, moustache: "#241a1a" }) },
  fireman: { fit: F.FIREMAN, crownM: 1.6, seed: 32, x: () => ({ post: soot, sleeve: inkArm(F.FIREMAN.shirt), top: heldProps }),
    pro: () => ({ hair: "crop" as HairStyleP, hat: { k: "beanie", col: "#3a3a44" } as HatP }) },
  official: { fit: F.OFFICIAL, crownM: 1.6, seed: 33, x: () => ({ post: bowler, sleeve: inkArm(F.OFFICIAL.shirt), top: heldProps }),
    pro: () => ({ hair: "side" as HairStyleP, hat: { k: "beanie", col: "#1a1618" } as HatP, moustache: "#3a2a24" }) },
  cook: { fit: F.COOK, crownM: 1.5, seed: 34, x: () => ({ sleeve: inkArm(F.COOK.shirt), top: heldProps }), pro: () => ({ hair: "bun" as HairStyleP }) },
  prankA: { fit: F.PRANK_A, crownM: 1.55, seed: 35, x: () => ({ sleeve: inkArm(F.PRANK_A.shirt) }), pro: () => ({ hair: "messy" as HairStyleP }) },
  prankB: { fit: F.PRANK_B, crownM: 1.5, seed: 36, x: () => ({ sleeve: inkArm(F.PRANK_B.shirt) }), pro: () => ({ hair: "pony" as HairStyleP }) },
  ny_conductor: { fit: F.NY_CONDUCTOR, crownM: 1.52, seed: 8, pro: () => ({ hair: "crop" as HairStyleP, glasses: "half" as const, moustache: F.NY_CONDUCTOR.moustache }) },
  ny_commuter: { fit: F.NY_COMMUTER, crownM: 1.52, seed: 3, face: { browGap: 15, browMin: -16, browHalo: F.COL.skin },
    x: () => ({ post: cmb(neckCans(F.COL.cans), beanie(F.COL.beanie)) }), pro: () => ({ hair: "crop" as HairStyleP, hat: { k: "beanie", col: F.COL.beanie } as HatP }) },
  volunteer: { fit: F.VOLUNTEER, crownM: 1.52, seed: 6, pro: () => ({ hair: "pony" as HairStyleP }) },
  researcher: { fit: F.RESEARCHER, crownM: 1.57, seed: 9, x: () => ({ post: labCoat, sleeve: coatSleeve, top: heldProps }),
    pro: () => ({ hair: "swept" as HairStyleP, glasses: "round" as const, pencil: "#2f6fe0" }) },
  // ---- crowd members (also drawn by crowd.ts into the atlas)
  salarySleep: { fit: CROWD.suitA, crownM: 1.52, seed: 11, pro: () => ({ hair: "side" as HairStyleP }) },
  salaryRead: { fit: CROWD.suitB, crownM: 1.52, seed: 12, pro: () => ({ hair: "short" as HairStyleP, glasses: "rect" as const }) },
  suitA: { fit: CROWD.suitC, crownM: 1.57, seed: 13, pro: () => ({ hair: "crop" as HairStyleP }) },
  suitB: { fit: CROWD.suitA2, crownM: 1.52, seed: 14, pro: () => ({ hair: "side" as HairStyleP }) },
  officeRead: { fit: F.OFFICE_W, crownM: 1.45, seed: 15, x: () => ({ post: bobTopL }), pro: () => ({ hair: "bob" as HairStyleP }) },
  officePhone: { fit: F.WAIT_C, crownM: 1.52, seed: 16, pro: () => ({ hair: "messy" as HairStyleP }) },
  officeMask: { fit: F.OFFICE_MASK, crownM: 1.52, seed: 17, x: () => ({ post: maskL }), pro: () => ({ hair: "crop" as HairStyleP }) },
  studentA: { fit: CROWD.studentA, crownM: 1.45, seed: 18, x: () => ({ post: bobTopL }), pro: () => ({ hair: "bob" as HairStyleP }) },
  studentB: { fit: CROWD.studentB, crownM: 1.45, seed: 19, pro: () => ({ hair: "pony" as HairStyleP }) },
  grandma: { fit: F.GRANDMA, crownM: 1.42, seed: 20, x: () => ({ post: furoshiki }), pro: () => ({ hair: "bun" as HairStyleP }) },
  mumStroller: { fit: F.MUM_STROLLER, crownM: 1.52, seed: 21, pro: () => ({ hair: "pony" as HairStyleP }) },
  lateSalary: { fit: CROWD.late, crownM: 1.57, seed: 22, pro: () => ({ hair: "side" as HairStyleP }) },
  waitA: { fit: F.WAIT_A, crownM: 1.52, seed: 23, pro: () => ({ hair: "short" as HairStyleP }) },
  waitB: { fit: F.WAIT_B, crownM: 1.45, seed: 24, pro: () => ({ hair: "bun" as HairStyleP }) },
  waitC: { fit: CROWD.waitC, crownM: 1.52, seed: 25, pro: () => ({ hair: "messy" as HairStyleP }) },
  watchTapper: { fit: F.WATCH_TAPPER, crownM: 1.52, seed: 26, x: () => ({ post: bobTopL, top: heldProps }), pro: () => ({ hair: "bob" as HairStyleP }) },
  nyRiderA: { fit: F.NY_RIDER_A, crownM: 1.52, seed: 27, pro: () => ({ hair: "crop" as HairStyleP, hat: { k: "ball", col: "#3a4a6a" } as HatP }) },
  nyRiderB: { fit: F.NY_RIDER_B, crownM: 1.45, seed: 28, pro: () => ({ hair: "curly" as HairStyleP }) },
  nyRiderC: { fit: F.NY_RIDER_C, crownM: 1.5, seed: 29, pro: () => ({ hair: "bald" as HairStyleP, moustache: "#a9a9b4" }) },
  nyLeaver: { fit: F.NY_LEAVER, crownM: 1.57, seed: 30, pro: () => ({ hair: "curly" as HairStyleP }) },
} satisfies Record<string, Spec>;
export type Who = keyof typeof SPECS;
export const WHO_LIST = Object.keys(SPECS) as Who[];

// ================================================================== drawing one person
/** the standing hip height (m) of an outfit on the cast rig */
export const hipM = (o: Outfit, seed: number) => (975 - rig(o, { seed }).hipY) * SU;
/** the native crown height (m) of an outfit (neutral standing pose) */
export const nativeCrown = (o: Outfit) => (975 - PPL.figAnchors(o, { s: 0, c: 1, go: 0 }).crown[1]) * SU;
/** is this pose drawn as a true profile, and which way does it face (+1 screen right) */
export const profileOf = (P: CPose): 0 | 1 | -1 => {
  if (P.profile !== undefined) return P.profile;
  const s = P.s ?? 0; return Math.abs(s) > 0.8 ? (Math.sign(s) as 1 | -1) : 0;
};
/** seated legs (drawn first, behind the body): thighs forward along the heading, shins down to the floor */
const seatedLegs = (p: Pen, o: Outfit, P: CPose, seat: number, u: number) => {
  const s = P.s ?? 0, c = P.c ?? 1, back = (P.view ?? (c < -0.35 ? "back" : "front")) === "back";
  const proj = (f: number, up: number, lat: number): P2 => [300 + (f * s - lat * c) * UM, 975 - up * UM + f * c * 0.11 * UM];
  const col = mix(o.pants, INK, 0.62), hipUp = seat + 0.07, thigh = 0.42, shin = seat - 0.02;
  const legs = ([1, -1] as const).map((lr) => {
    const lat = 0.085 * lr, kneeF = thigh * (1 + 0.04 * lr * (P.shift ?? 0));
    const H = proj(0.02, hipUp, lat), K = proj(kneeF, hipUp - 0.02, lat * 1.1), A = proj(kneeF + 0.03, 0.06, lat * 1.1), T = proj(kneeF + 0.16, 0.015, lat * 1.15), Hl = proj(kneeF - 0.03, 0.02, lat * 1.1);
    return { lr, H, K, A, T, Hl, depth: lr * s };
  }).sort((a, b) => a.depth - b.depth);
  if (back && Math.abs(s) < 0.5) return; // from behind the seat hides them
  for (const g of legs) {
    p.band([g.H, g.K], col, 6 * u, 1.4 * u, "round"); p.band([g.K, g.A], col, 5.4 * u, 1.3 * u, "round");
    p.stroke([g.Hl, g.T], 7.2 * u + 2.6, INK); p.stroke([g.Hl, g.T], 7.2 * u, o.shoes);
  }
  void shin;
};

const sm01 = (x: number) => { const k = clamp(x, 0, 1); return k * k * (3 - 2 * k); };
const L2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** a limb as a soft curve through its joint (the kit's own `bent`) */
const bent = (a: P2, e: P2, b: P2, r = 0.3): P2[] => {
  const p1 = L2(e, a, r), p2 = L2(e, b, r), o: P2[] = [a, p1];
  for (let i = 1; i < 6; i++) { const t = i / 6, w = 1 - t; o.push([w * w * p1[0] + 2 * w * t * e[0] + t * t * p2[0], w * w * p1[1] + 2 * w * t * e[1] + t * t * p2[1]]); }
  o.push(p2, b); return o;
};
/** STANDING LEGS (ours, instead of the kit's walk-cycle legs, whenever a figure stands still). The kit's standing legs
 *  are its walk pose at phase 0: one toe up, one heel up, the knees ~17 cm forward. From the front that is the house
 *  "noodle leg"; in a TRUE PROFILE it is a curtsy with crossed feet. Same maths and the same look from the front (flat
 *  feet); toward a profile the knees straighten, the feet stand a little apart (one ahead, one behind) and the free
 *  leg's knee gives with the weight shift. Follows the figure's hop / stretch / squeeze exactly like the kit's legs */
const standLegs = (p: Pen, o: Outfit, P: CPose, X: PPL.Extras) => {
  const seed = P.seed ?? 1, u = rig(o, { seed }).u, s = P.s ?? 0, c = P.c ?? 1, g = p.g;
  const kitHip = hipM(o, seed), prof = sm01((Math.abs(s) - 0.35) / 0.45), shift = clamp(P.shift ?? 0, -1, 1), duck = clamp(P.duck ?? 0, 0, 1);
  const tall = o.build === "tall" || o.build === "lanky" ? 0.01 : 0, hipX = shift * 0.035 * Math.abs(c), ank = 0.045, hipH = kitHip - 0.15 * duck;
  const proj = (f: number, up: number, lat: number, hx = 0): P2 => [300 + (f * s - lat * c + hx) * UM, 975 - up * UM + f * c * 0.11 * UM];
  const cols = X.legCol ?? [mix(o.pants, INK, 0.62), mix(o.pants, INK, 0.62)], w = X.legW ?? 5.4 * u;
  const legs = ([1, -1] as const).map((lr) => {
    const free = Math.max(0, -shift * lr * Math.sign(c || 1)), F = (lr > 0 ? P.foot?.r : P.foot?.l) ?? {}, moved = !!(F.fwd || F.lat || F.lift);
    // the leg's LENGTH is fixed by the neutral stance (so a foot that reaches out really straightens the knee, and a
    // duck really bends it); from the front it is the kit's length, toward a profile nearly straight
    const d0 = kitHip - ank, len = (kitHip + 0.064 + tall) * (1 - prof) + (d0 + 0.012 + 0.03 * free) * prof + (moved ? 0.02 : 0);
    let dx = 0.05 * prof * lr + (F.fwd ?? 0), dy = 0.025 * free + (F.lift ?? 0) + ank - hipH, d = Math.hypot(dx, dy), lat = F.lat ?? 0;
    // a sideways reach also uses up leg: fold it into the length test (the knee straightens as the foot goes out; a
    // cartoon leg may stretch 10 %, no more: past that the foot simply does not get there)
    const mx = 1.1 * len, dd = Math.hypot(d, lat);
    if (dd > mx) { const q = mx / dd; lat *= q; dx *= q; if (Math.hypot(dx, dy, lat) > mx) dy *= q; d = Math.hypot(dx, dy); }
    const le = Math.sqrt(Math.max(d * d, len * len - lat * lat)), th = le / 2, k = d / 2, h = Math.sqrt(Math.max(0, th * th - k * k)), ux = dx / d, uy = dy / d;
    const knee: P2 = [ux * k - uy * h, hipH + uy * k + ux * h];
    const bend = h / th, latH = 0.074 * lr, latF = 0.086 * lr - lr * 0.012 * free + lat, latK = (0.08 + 0.085 * bend) * lr + 0.5 * lat;
    const pt = F.pitch ?? 0, cp = Math.cos(pt), sp = Math.sin(pt), fy = hipH + dy - ank + 0.012;
    return { lr, P0: proj(0, hipH, latH, hipX), PK: proj(knee[0], knee[1], latK, hipX * 0.5), PA: proj(dx, hipH + dy, latF),
      heel: proj(dx - 0.04 * cp, fy - 0.04 * sp, latF), toe: proj(dx + 0.11 * cp, fy + 0.11 * sp, latF + 0.075 * lr * Math.abs(c)), depth: lr * s + 0.3 * dx * c };
  }).sort((a, b) => a.depth - b.depth);
  const st = P.stretch ?? 1, sqAuto = P.view ? 1 : 1 - 0.32 * Math.exp(-(((c + 0.35) / 0.08) ** 2));
  g.save(); g.translate(300, 975 - (P.hop ?? 0) * UM); g.scale((sqAuto * (P.sq ?? 1)) / Math.sqrt(st), st); g.translate(-300, -975);
  if (X.lift) g.translate(0, -X.lift * UM);
  legs.forEach((q, i) => {
    const col = q.lr > 0 ? cols[0] : cols[1], pts = bent(q.P0, q.PK, q.PA, 0.3);
    if (w > 6.5 * u) p.band(pts, col, w, 1.5 * u, "round"); else p.stroke(pts, w, col);
    if (X.shoe) X.shoe(p, q.heel, q.toe, u, i === 1);
    else { if (o.shoes !== INK) p.stroke([q.heel, q.toe], 7.2 * u + 2.6, INK); p.stroke([q.heel, q.toe], 7.2 * u, o.shoes); }
  });
  g.restore();
};

/** THE DRAW CALL: any character in any pose (600 x 1000 design units, soles at y 975) */
let LAST_HANDS: P2[] = [];
/** the hands of the figure drawn last (design units), for the cast log */
export const lastHands = (): P2[] => LAST_HANDS;
export const drawWho = (p: Pen, who: Who, P0: CPose) => {
  const S: Spec = SPECS[who], g = p.g;
  const d = profileOf(P0);
  const P: CPose = { seed: S.seed, ...P0, face: { ...(S.face ?? {}), ...(P0.face ?? {}) } };
  if (d) { P.facing = d; P.profile = d; }
  let o = S.fit;
  const skin = P.skin ?? S.fit.skin ?? F.COL.skin;
  if (P.skin) { o = { ...o, skin: P.skin }; if (P.face?.browHalo) P.face = { ...P.face, browHalo: P.skin }; }
  if (d) o = { ...o, hat: null, hairStyle: "none", glasses: null, moustache: undefined, glassChain: undefined, pencil: false };
  const X0: PPL.Extras = S.x ? S.x(P) : {};
  const X: PPL.Extras = { ...X0 };
  if (P.skin && !X.glove) X.glove = P.skin;          // the bare hands take the same tone (the kit's hand fill)
  X.sleeve = armWrap(X0.sleeve, o, X.glove, who === "driver" ? { col: F.COL.navy, cuff: P.white ?? DRIVER_GLOVE } : undefined, who === "kid" ? (P.skin ?? F.COL.skin) : undefined);   // aimed pointing arms are ours (C-4)
  const seat = P.seat;
  if (seat !== undefined) { X.noLegs = true; X.lift = seat + 0.07 - hipM(o, P.seed ?? 1) + (X.lift ?? 0); }
  // standing still (no walk, no explicit feet, no duck): our own standing legs (see standLegs)
  const standing = seat === undefined && (P.go ?? 0) < 0.02 && !P.feet && !((P.smear ?? 0) > 0.04);
  // (the kit keeps the hips at standing height without its own legs: a duck lowers the body here)
  if (standing) { X.noLegs = true; if (P.duck) X.lift = (X.lift ?? 0) - 0.15 * clamp(P.duck, 0, 1); }
  if (d) {
    const pro = S.pro(P), post0 = X.post;
    X.post = (q, L) => {
      if (post0) { post0(q, L); q.rot = null; }
      q.rot = L.headRot as number[] | null;
      const lid = P.blink ?? 0;
      drawProfileHead(q, { d, cx: 300, hc: L.R.hc, H: L.R.H, u: L.u, skin, light: L.light,
        expr: P.expr ?? "bright", mouth: P.mouth ?? P.face?.mouth, look: P.look ?? 0, lookY: P.lookY ?? 0, blink: lid, browUp: P.face?.browUp, browCol: S.fit.browCol,
        hair: { col: S.fit.hair ?? "#2a1e1a", style: pro.hair, swing: P.hairSwing }, hat: pro.hat ? { ...pro.hat, lag: P.hatLag } : null, glasses: pro.glasses, cord: pro.cord,
        moustache: pro.moustache, stubble: pro.stubble, blush: P.blush ?? P.face?.blush, tongue: P.tongue, pencil: pro.pencil, press: P.press });
      q.rot = null;
    };
  } else if (P.tongue && P.tongue > 0.05) { // the front-view tongue at the mouth corner
    const post0 = X.post;
    X.post = (q, L) => { if (post0) { post0(q, L); q.rot = null; } if (L.back) return; q.rot = L.headRot as number[] | null; const u = L.u, f = L.facing;
      q.poly(ellP(300 + 8 * u * f + 6 * u, L.R.hc + 25 * u, 3.4 * u * P.tongue!, 2.6 * u, 0.4), "#e86e78", 1.2 * u); q.rot = null; };
  }
  if (P.cutY !== undefined) { g.save(); g.beginPath(); g.rect(-3000, -3000, 6600, P.cutY + 3000); g.clip(); }
  if (seat !== undefined) seatedLegs(p, o, P, seat, rig(o, { seed: P.seed ?? 1 }).u);
  else if (standing) standLegs(p, o, P, X);
  if (P.mask && !d) { const post0 = X.post; X.post = cmb(post0, maskL); }
  // v4 CAST LOG: remember where the hands were drawn (design units) for the director's card gates (member.ts)
  { const top0 = X.top; X.top = (q, L) => { if (top0) { top0(q, L); q.rot = null; } LAST_HANDS = L.hands.map((h) => [h.h[0], h.h[1]] as P2); }; }
  PPL.drawFig(p, o, P, X);
  if (P.cutY !== undefined) g.restore();
};

/** the anchors (head, crown, mouth, chin, chest, hands, u, r) of a character in a pose, as drawn (seated lift included) */
export const anchorsOf = (who: Who, P: CPose) => {
  const S: Spec = SPECS[who], o = S.fit, seed = P.seed ?? S.seed;
  const lift = P.seat !== undefined ? P.seat + 0.07 - hipM(o, seed) : 0;
  return PPL.figAnchors(o, { seed, ...P }, P.seat !== undefined ? { lift, noLegs: true } : {});
};

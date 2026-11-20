// TRUE PROFILE HEADS (K-C11; owner CAST). The clown cast has no profile face (a 3/4 face slid to the edge); this draws a
// real side view in the same style: the bean skull (it covers the kit's head exactly: the kit draws its own head first,
// bald and hatless, then this paints over it), a soft cartoon NOSE bump, ONE eye seen from the side (the pupil at the
// front of the almond), the brow over it, the MOUTH at the front edge (closed lines, open wedges with teeth / tongue, a
// jaw that drops on open shapes), an ear, the hair mass round the back with a hairline + sideburn, and the head-wear in
// profile (the driver's uniform cap with its glossy peak, gold cord and edge-on badge; a ball cap with its bill; a knit
// beanie), glasses edge-on with the temple arm (and a cord), a moustache, stubble, blush, a tongue poking out.
// Pure drawing: everything in the cast's 600 x 1000 design space, the pen's rotation = the kit's head rotation.
import { Pen, blobPts, thickAngle, mix, mul, INK, type Blob, type P2, type Expr, type MouthK } from "../../../videos/clown/toon";

const MOUTHC = "#2a0b16", TONGUE = "#c95466", EYE = "#2a2030", WHITE = "#ffffff";
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };

export type HairStyleP = "short" | "crop" | "pony" | "bob" | "swept" | "bun" | "bald" | "side" | "messy" | "curly" | "none";
export type HatP = { k: "uniform" | "ball" | "beanie"; col: string; scale?: number; tilt?: number; drop?: number; band?: string; badge?: string; visor?: string; lag?: number };
export type ProfileSpec = {
  /** +1 = facing screen right, -1 = facing screen left */
  d: 1 | -1;
  cx: number; hc: number; H: Blob; u: number;
  skin: string; light: number;
  expr: Expr; mouth?: MouthK; look: number; lookY: number; blink: number;
  browUp?: [number, number]; browCol?: string;
  hair: { col: string; style: HairStyleP; swing?: number };
  hat?: HatP | null;
  glasses?: "round" | "half" | "rect" | null; cord?: string;
  moustache?: string; stubble?: number; blush?: number; tongue?: number;
  /** a pencil behind the ear (colour) */
  pencil?: string;
  /** cheek / nose flattened on a glass pane in front (0..1) */
  press?: number;
};

// ---------------- the side-view face table (eye kind, brows [front, back] in u (+ = down), the resting mouth)
type EyeP = "bright" | "lid" | "happy" | "glaze" | "wide" | "squeeze" | "low" | "closed" | "side";
const PF: Partial<Record<Expr, { eye: EyeP; brow: [number, number]; mouth: MouthK }>> = {
  bright: { eye: "bright", brow: [-2.5, -3.5], mouth: "smile" }, polite: { eye: "bright", brow: [-3, -2.5], mouth: "smallSmile" },
  brightGrin: { eye: "bright", brow: [-7, -6], mouth: "grin" }, delightB: { eye: "bright", brow: [-9, -8], mouth: "laugh" },
  thrillB: { eye: "bright", brow: [-10, -9], mouth: "grin" }, brightO: { eye: "bright", brow: [-9, -8], mouth: "o" },
  jawDrop: { eye: "wide", brow: [-13, -12], mouth: "jaw" }, puzzled: { eye: "bright", brow: [2, -8], mouth: "wave" },
  sly: { eye: "side", brow: [3, -2], mouth: "smirk1" }, smugB: { eye: "side", brow: [1, -5], mouth: "smirk1" },
  blank: { eye: "glaze", brow: [-1.5, -1.5], mouth: "dash" }, laughBig: { eye: "happy", brow: [-6, -5], mouth: "laugh" },
  proudB: { eye: "bright", brow: [-5, -7], mouth: "smileWide" }, asking: { eye: "bright", brow: [-8, -5], mouth: "smallSmile" },
  listenB: { eye: "bright", brow: [-3, -3], mouth: "smallSmile" }, worriedB: { eye: "bright", brow: [-6, 2], mouth: "wave" },
  focusB: { eye: "low", brow: [2, 0], mouth: "pout" }, stare: { eye: "wide", brow: [-1, -1], mouth: "dash" },
  stern: { eye: "lid", brow: [4, -2], mouth: "frown" }, deadpan: { eye: "lid", brow: [1.5, 1.5], mouth: "dash" },
  squint: { eye: "lid", brow: [4, 1], mouth: "tight" }, grimace: { eye: "bright", brow: [-5, 3], mouth: "teeth" },
  content: { eye: "happy", brow: [-1, -1], mouth: "smile" }, warm: { eye: "happy", brow: [-2, -4], mouth: "smile" },
  sigh: { eye: "lid", brow: [-3, 3], mouth: "wave" }, calm: { eye: "lid", brow: [0, -2], mouth: "smile" },
  tired: { eye: "lid", brow: [-2, 4], mouth: "dash" }, skeptic: { eye: "lid", brow: [3, -9], mouth: "dash" },
  gazeFocus: { eye: "low", brow: [2, -1], mouth: "pout" }, wince: { eye: "squeeze", brow: [-3, 2], mouth: "teeth" },
  smile: { eye: "bright", brow: [-1, -2], mouth: "smile" }, alert: { eye: "wide", brow: [-7, -6], mouth: "dash" },
  shout: { eye: "wide", brow: [8, -5], mouth: "O" }, readLow: { eye: "low", brow: [2.5, 2.5], mouth: "dash" },
  gazeCalm: { eye: "low", brow: [-1, -2], mouth: "smile" }, readDown: { eye: "low", brow: [2.5, 2.5], mouth: "smile" }, gazeSmile: { eye: "bright", brow: [-2, -3], mouth: "smile" },
};
const pf = (e: Expr) => PF[e] ?? PF.bright!;

/** the face curve of the profile, local normalised coords (X forward in head half-widths, Y down in head half-heights),
 *  top (forehead) to bottom (chin). `jaw` drops the lower lip + chin (open mouths: the jaw swings down about a hinge near
 *  the ear, so the chin also goes back a little). `notch` cuts the OPEN MOUTH into the silhouette (a flat upper edge = the
 *  top teeth line, a slanted lower edge = the dropped jaw; `round` = an O). Returns the curve and the mouth cavity */
type Notch = { dep: number; round: boolean };
const faceCurve = (jaw: number, press: number, notch?: Notch): { pts: P2[]; cav: P2[] | null } => {
  const top: P2[] = [[0.62, -0.88], [0.84, -0.66], [0.96, -0.4], [1.0, -0.22], [0.985, -0.09], [1.06, 0.03], [1.135, 0.13], [1.115, 0.2], [1.03, 0.245], [0.995, 0.31], [1.015, 0.4]];
  const low: P2[] = ([[1.0, 0.53], [0.955, 0.66], [0.87, 0.8], [0.72, 0.9]] as P2[]).map(([x, y]) => [x - jaw * 0.32 * (y - 0.42), y + jaw] as P2);
  let mid: P2[] = [[0.99, 0.46]], cav: P2[] | null = null;
  if (notch && jaw > 0.005) {
    const pk = notch.round ? 0.03 : 0, U: P2 = [1.008 + pk, 0.432], L: P2 = [1.0 + pk - jaw * 0.03, 0.482 + jaw], inner: P2[] = [];
    if (notch.round) {
      const cy = (U[1] + L[1]) / 2, ry = (L[1] - U[1]) / 2;
      for (let i = 1; i <= 7; i++) { const th = (Math.PI * i) / 8; inner.push([1.0 - notch.dep * Math.sin(th) ** 0.8, cy - ry * Math.cos(th)]); }
    } else {
      const K: P2 = [1.0 - notch.dep, 0.45 + jaw * 0.1];
      inner.push([K[0] + 0.1 * (U[0] - K[0]), K[1] + 0.1 * (U[1] - K[1])], [K[0] + 0.012, K[1] + 0.012], [K[0] + 0.12 * (L[0] - K[0]), K[1] + 0.12 * (L[1] - K[1])]);
    }
    mid = [U, ...inner, L]; cav = mid;
  }
  const fix = ([x, y]: P2): P2 => (press > 0 ? [Math.min(x, 1.0 - 0.06 * press + 0.04 * Math.abs(y - 0.1)), y] : [x, y]);
  return { pts: [...top, ...mid, ...low].map(fix), cav: cav ? cav.map(fix) : null };
};
/** closed polygon: the bean (x1.045, covering the kit head + its rim light) behind X < 0.55, the face curve in front */
const outline = (S: ProfileSpec, jaw: number, notch?: Notch): { poly: P2[]; cav: P2[] | null } => {
  const { cx, hc, H, d } = S, a = H.a, b = H.b, k = 1.045;
  const bean = blobPts(cx, hc, H, 96).map(([x, y]) => [(d * (x - cx)) / a * k, ((y - hc) / b) * k] as P2);
  const keep = (q: P2) => q[0] < 0.55, n = bean.length;
  const s = bean.findIndex((q, i) => keep(q) && !keep(bean[(i + n - 1) % n]));
  const run = [...bean.slice(s), ...bean.slice(0, s)].filter(keep).map(([X, Y]) => {
    // the jaw drop also lowers the bottom-front of the skull a little (no kink at the join)
    const w = sm((X + 0.35) / 0.9) * sm((Y - 0.4) / 0.4); return [X, Y + jaw * w] as P2;
  });
  const fc = faceCurve(jaw, S.press ?? 0, notch);
  const startsLow = run[0][1] > 0;
  return { poly: startsLow ? [...run, ...fc.pts] : [...run, ...fc.pts.slice().reverse()], cav: fc.cav };
};
const toCard = (S: ProfileSpec) => (q: P2): P2 => [S.cx + S.d * q[0] * S.H.a, S.hc + q[1] * S.H.b];
const ellPts = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 26): P2[] => {
  const o: P2[] = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, x = rx * Math.cos(t), y = ry * Math.sin(t); o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return o;
};
/** a closed Catmull-Rom spline through local points (smooth caps / hair shapes) */
const spline = (pts: P2[], per = 5, closed = true): P2[] => {
  const n = pts.length, o: P2[] = [];
  const P = (i: number) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t;
      o.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  if (!closed) o.push(pts[n - 1]);
  return o;
};

// ---------------- OPEN mouth shapes in profile: [opening height u, depth into the face u, teeth, tongue, round]
// (u = 1 % of the head width; the front view's laugh is 26 x 11.5 u, its talk A 17 x 8 u: the same heights here, so a
// shout reads in a true profile at phone size; the depth is the mouth's width seen from the side)
const OPEN: Partial<Record<MouthK, [number, number, boolean, boolean, boolean]>> = {
  vA: [10, 13, true, true, false], vE: [5.5, 14, true, false, false], vI: [4.5, 11.5, true, false, false],
  vO: [8.5, 8, false, false, true], vU: [4.6, 5, false, false, true], grin: [7, 15.5, true, false, false],
  laugh: [14, 17, true, true, false], O: [12.5, 9.5, false, true, true], o: [5.6, 5.4, false, false, true],
  jaw: [18, 12, false, true, true], teeth: [6, 14, true, false, false], pant: [8, 11, true, true, false],
  t1: [6, 10, true, false, false], t2: [6.5, 6.5, false, false, true], y0: [10, 12.5, true, false, false], y1: [14.5, 15, true, true, false], y2: [12.5, 9.5, false, true, true],
};

/** THE PROFILE HEAD. Call with the pen rotated like the kit's head (p.rot = the figure's head rotation) */
export const drawProfileHead = (p: Pen, S: ProfileSpec) => {
  const { d, u, skin, light } = S, F = pf(S.expr), ow = 4 * u, thick = thickAngle(light);
  const mk = S.mouth ?? F.mouth, op = OPEN[mk];
  const jaw = op ? (op[0] * u) / S.H.b : 0;
  const C = toCard(S), Cs = (pts: P2[]) => pts.map(C);
  const O = outline(S, jaw, op ? { dep: (op[1] * u) / S.H.a, round: op[4] } : undefined);
  const head = Cs(O.poly), cav = O.cav ? Cs(O.cav) : null;
  const g = p.g;
  const hairCol = S.hair.col, hs = S.hair.style;
  // ---- behind the head: the ponytail / the bun / the bob's back mass, the hat's far side
  if (hs === "pony") {
    const sw = (S.hair.swing ?? 0) * 0.012;
    const pony = Cs(spline([[-0.55, -0.82], [-0.95, -0.7], [-1.38 - sw, -0.2], [-1.32 - sw, 0.42], [-1.12 - sw * 0.6, 0.62], [-1.0, 0.1], [-0.82, -0.36]], 5));
    p.shadedFill(pony, hairCol, mul(hairCol, [0.7, 0.68, 0.8]), light, S.H.a * 0.5); p.inkRing(pony, ow * 0.8, thick);
    p.stroke(Cs([[-0.98, -0.52], [-1.22 - sw, 0.0], [-1.18 - sw, 0.38]]), 1.4 * u, mix(hairCol, "#ffffff", 0.3));
    p.poly(Cs(ellPts(-0.82, -0.66, 0.1, 0.14, 0.5)), "#e8506a", 1.4 * u);           // the hair tie
  } else if (hs === "bun") {
    const bun = Cs(ellPts(-0.82, -0.62, 0.3, 0.3)); p.shadedFill(bun, hairCol, mul(hairCol, [0.7, 0.68, 0.8]), light, S.H.a * 0.3); p.inkRing(bun, ow * 0.8, thick);
    p.arc(...C([-0.82, -0.62]), 0.18 * S.H.a, 0.14 * S.H.b, 200, 330, 1.3 * u, mix(hairCol, "#ffffff", 0.35));
  } else if (hs === "bob") {
    const back = Cs(spline([[0.2, -1.0], [-0.6, -1.03], [-1.02, -0.5], [-1.04, 0.4], [-0.92, 0.9], [-0.4, 0.96], [-0.06, 0.92], [0.02, 0.3]], 5));
    p.shadedFill(back, hairCol, mul(hairCol, [0.7, 0.68, 0.8]), light, S.H.a); p.inkRing(back, ow * 0.8, thick);
  }
  // ---- the skull + face
  p.shadedFill(head, skin, mul(skin, [0.95, 0.92, 0.97]), light, S.H.a);
  // stubble (the tourist): a soft lavender-grey jaw + a few dots
  // (FINAL v1 audit: in profile the stubble jaw read as a dark GOATEE / sideburn, "a different man": a faint shadow only)
  if (S.stubble) p.clip(head, () => {
    g.save(); g.globalAlpha = 0.05 * S.stubble!;
    p.poly(Cs(spline([[0.12, 0.5], [0.55, 0.38], [0.9, 0.56], [0.98, 0.72], [0.82, 1.0], [0.2, 1.05], [0.05, 0.75]], 4)), "#8a7a96", 0);
    g.restore();
    g.save(); g.globalAlpha = 0.18 * S.stubble!;
    for (let i = 0; i < 16; i++) { const X = 0.28 + 0.62 * ((i * 0.618) % 1), Y = 0.58 + 0.3 * ((i * 0.377) % 1); if (X > 0.84 && Y < 0.6) continue; p.dot(...C([X, Y]), 0.75 * u, "#7a6a86"); }
    g.restore();
  });
  if (S.blush) { g.save(); g.globalAlpha = 0.34 * clamp(S.blush, 0, 1); p.poly(Cs(ellPts(0.52, 0.3, 0.16, 0.09)), "#ef8b7b", 0); g.restore(); }
  // ---- hair on the head (clipped to a slightly fuller skull), hairline + sideburn
  const hatted = !!S.hat;
  const hairRegion = (): P2[] | null => {
    if (hs === "none") return null;
    if (hs === "bald") return [[0.05, -0.2], [-0.32, -0.32], [-0.7, -0.12], [-0.64, 0.66], [-1.6, 0.9], [-1.6, -0.2]];
    // the bob in profile: a fringe that stops ABOVE the eye, tucked back behind the cheek (it used to hang to x 0.66 at
    // eye height and hid the face: mum's profile was a hair ball with an eye; 2026-11-20)
    const front = hs === "swept" ? [0.48, -0.8] : hs === "crop" ? [0.6, -0.74] : hs === "bob" ? [0.84, -0.58] : [0.64, -0.7];
    const temple: P2 = hs === "bob" ? [0.44, -0.4] : [0.36, -0.42];
    const side: P2[] = hs === "bob" ? [[0.12, -0.14], [0.04, 0.4], [-0.1, 0.86]] : [[0.27, -0.2], [0.245, -0.03], [0.13, -0.01], [0.075, -0.17], [-0.24, -0.13]];   /* a short neat sideburn ending above the ear's middle */
    const nape: P2[] = hs === "bob" ? [[-0.4, 0.98], [-1.6, 1.0]] : hs === "crop" ? [[-0.46, 0.5], [-0.8, 0.64], [-1.6, 0.66]] : [[-0.48, 0.62], [-0.82, 0.74], [-1.6, 0.76]];
    return [front as P2, temple, ...side, ...nape, [-1.6, -1.6], [0.9, -1.6], [0.9, (front as P2)[1] - 0.25]];
  };
  const HR = hairRegion();
  const vol = hs === "short" || hs === "side" ? 1.07 : hs === "swept" ? 1.06 : hs === "messy" || hs === "curly" ? 1.1 : 1.05;
  // the hair volume grows round the top and the back, never in front of the face
  const skullV = Cs(outline(S, 0).poly.map(([x, y]) => (x < 0.55 ? [x * vol, y * vol - (vol - 1) * 0.15] : [x, y]) as P2));
  // the OPEN MOUTH: a dark notch in the silhouette (it also hides the kit's own bean head there), the top teeth along
  // its flat upper edge, the tongue low at the back; the head's ink ring then outlines the lips
  if (cav && op) {
    const xs = cav.map((q) => q[0]), ys = cav.map((q) => q[1]), xf = d > 0 ? Math.max(...xs) : Math.min(...xs), xb = d > 0 ? Math.min(...xs) : Math.max(...xs);
    const y0 = cav[0][1], y1 = Math.max(...ys), th = Math.min(3.4 * u, 0.42 * (y1 - y0));
    p.poly(cav, MOUTHC, 0);
    p.clip(cav, () => {
      if (op[2]) p.poly([[xf + d * 3 * u, y0 - 3 * u], [xb, y0 - 3 * u], [xb, y0 + th], [xf + d * 3 * u, y0 + th]], WHITE, 0);
      if (op[3]) p.poly(ellPts(xb + (xf - xb) * 0.52, y1 - 0.04 * (y1 - y0), Math.abs(xf - xb) * 0.34, 0.24 * (y1 - y0), 0.2 * d), TONGUE, 0);   // low and small: the cavity must stay DARK
    });
  }
  // the skin outline goes UNDER the hair (the hair mass covers it round the back)
  p.inkRing(head, ow, thick);
  if (HR) {
    const hr = Cs(HR);
    g.save(); p.path(hr, true); g.clip();
    p.shadedFill(skullV, hairCol, mul(hairCol, [0.7, 0.68, 0.8]), light, S.H.a, 0.35);
    p.inkRing(skullV, ow * 0.85, thick);
    // strands + gloss
    const sc = mix(hairCol, "#000000", 0.25), gl = mix(hairCol, "#ffffff", hairCol < "#444444" ? 0.32 : 0.45);
    for (const k of [0, 1, 2]) p.stroke(Cs(spline([[0.5 - 0.3 * k, -0.86 + 0.02 * k], [0.05 - 0.3 * k, -0.84], [-0.55 - 0.15 * k, -0.4 + 0.2 * k], [-0.75 - 0.1 * k, 0.1 + 0.2 * k]], 4, false)), 1.3 * u, sc);
    p.stroke(Cs(spline([[0.3, -0.9], [-0.2, -0.95], [-0.6, -0.72]], 5, false)), 2.6 * u, gl);
    if (hs === "messy" || hs === "curly") for (let i = 0; i < 6; i++) p.dot(...C([-0.6 + 0.22 * i, -0.98 + 0.04 * (i % 2)]), 4 * u, hairCol);
    g.restore();
    // the hairline (inside the face)
    p.clip(head, () => p.stroke(Cs(spline(HR.slice(0, hs === "bob" ? 5 : 7), 4, false)), 1.8 * u, mix(hairCol, INK, 0.5)));
  }
  // ---- a pencil behind the ear, the ear
  if (S.pencil) {
    const pen = Cs([[-0.3, -0.42], [-0.24, -0.47], [0.36, -0.06], [0.3, -0.01]]);
    p.poly(pen, S.pencil, 1.3 * u); p.poly(Cs([[0.3, -0.01], [0.36, -0.06], [0.44, -0.02], [0.4, 0.02]]), "#f4dfb0", 1.1 * u);
  }
  const earHidden = hs === "bob" || (S.hat && S.hat.k === "beanie");
  if (!earHidden) {
    // the ear: a C-shaped shell, a touch darker than the face (it must never read as a second eye)
    const ear = Cs(spline([[-0.06, -0.1], [-0.2, -0.12], [-0.27, 0.04], [-0.22, 0.24], [-0.1, 0.27], [-0.05, 0.12]], 5));
    p.shadedFill(ear, mul(skin, [0.93, 0.88, 0.9]), mul(skin, [0.82, 0.76, 0.86]), light, S.H.a * 0.2); p.poly(ear, null, 1.6 * u);
    p.stroke(Cs(spline([[-0.1, -0.04], [-0.19, -0.03], [-0.2, 0.12], [-0.12, 0.2]], 4, false)), 1.5 * u, "#a8869a");
    p.dot(...C([-0.13, 0.08]), 1.6 * u, "#b993a6");
  }
  // ---- the eye (one, seen from the side): the pupil sits at the FRONT of the almond and follows look / lookY
  const [ex, ey] = C([0.64, -0.03]), lk = clamp(S.look * d, -1, 1), lkY = clamp(S.lookY, -1.3, 1.3);
  let ek: EyeP = F.eye;
  if (S.blink >= 0.85) ek = "closed"; else if (S.blink > 0.3 && (ek === "bright" || ek === "wide" || ek === "glaze")) ek = "lid";
  const lw = 3.2 * u;
  const almond = (rx: number, ry: number) => ellPts(ex + d * 0.4 * u, ey - 0.6 * u, rx, ry, 0, 26);
  switch (ek) {
    case "bright": case "wide": case "glaze": case "side": case "lid": case "low": {
      // the same eye as the front view's "bright" (a white disc in a THICK dark ring, a big pupil with a highlight), seen
      // from the side: a tall oval, the pupil at its front. No lashes (they read as mascara on the driver)
      const wide = ek === "wide", rx = (wide ? 7.4 : 6.4) * u, ry = (wide ? 12 : 10.6) * u, al = almond(rx, ry);
      const pr = (ek === "glaze" ? 3 : wide ? 3.8 : 4.7) * u;
      const px = ex + d * (ek === "glaze" ? 1.4 : 2.2 + 0.9 * Math.max(0, lk)) * u - d * Math.max(0, -lk) * 1.8 * u, py = ey - 0.4 * u + lkY * 3.8 * u + (ek === "low" ? 3.6 * u : 0);
      p.poly(al, WHITE, 0);
      const lidY = ek === "lid" || ek === "side" ? ey - 1.6 * u : ek === "low" ? ey + 0.4 * u : ek === "glaze" ? ey - 5.4 * u : -1e9;
      p.clip(al, () => {
        p.dot(px, py, pr, EYE);
        if (ek !== "glaze") { p.dot(px - d * 0.3 * pr, py - 0.4 * pr, 0.32 * pr, WHITE); }
        if (lidY > -1e8) p.poly([[ex - 14 * u, ey - 16 * u], [ex + 14 * u, ey - 16 * u], [ex + 14 * u, lidY], [ex - 14 * u, lidY]], skin, 0);
      });
      p.poly(al, null, 2.7 * u, EYE);
      // a heavy lid: the lid's edge as a straight thick line across the oval
      if (lidY > -1e8) p.stroke([[ex - d * 6 * u, lidY + 0.5 * u], [ex + d * 7 * u, lidY - 0.3 * u]], lw * 1.05, EYE);
      break;
    }
    case "happy": p.arc(ex, ey + 2.6 * u, 6.6 * u, 5.8 * u, 200, 340, lw * 1.1, EYE); break;
    case "squeeze": p.stroke([[ex + d * 5 * u, ey - 5.4 * u], [ex - d * 5 * u, ey], [ex + d * 5 * u, ey + 4.4 * u]], lw * 1.1, EYE); break;
    case "closed": p.arc(ex, ey - 1.5 * u, 6.6 * u, 3.4 * u, 20, 160, lw * 1.1, EYE); break;
  }
  // ---- the brow (front end = inner)
  { const [dI, dO] = F.brow, up = S.browUp ? (S.browUp[0] + S.browUp[1]) / 2 : 0, by = ey - 14.5 * u - up * u + Math.min(0, lkY) * 1.4 * u, bc = S.browCol ?? INK;
    const a: P2 = [ex + d * 7 * u, by + dI * u], b: P2 = [ex - d * 6.5 * u, by + dO * u];
    p.stroke([a, b], 4.4 * u, bc); p.dot(a[0], a[1], 2.4 * u, bc); }
  // ---- the CLOSED mouths: a line from the front edge into the cheek (the open ones are the notch above)
  const mFront = C([0.985, 0.455]);
  const back = (du: number, dv: number): P2 => [mFront[0] - d * du * u, mFront[1] + dv * u];
  if (!op) {
    const mw = 3.6 * u;
    switch (mk) {
      case "smile": case "smirk1": case "smirk": p.stroke([mFront, back(6, 0.8), back(11.5, -2.8)], mw); break;
      case "smallSmile": p.stroke([mFront, back(4.5, 0.5), back(8.5, -1.8)], mw * 0.95); break;
      case "smileWide": p.stroke([mFront, back(7, 1), back(14, -4)], mw); p.arc(back(14.6, -5.8)[0], back(14.6, -5.8)[1], 2.6 * u, 3.4 * u, d > 0 ? 100 : -80, d > 0 ? 260 : 80, 1.5 * u); break;
      case "frown": p.stroke([mFront, back(6, -0.6), back(11, 2.8)], mw); break;
      case "wave": p.stroke([mFront, back(3, 1.2), back(6, -0.8), back(9, 1), back(11.5, -0.4)], mw * 0.9); break;
      case "pout": case "purse": p.stroke([[mFront[0] + d * 1.4 * u, mFront[1] + 0.8 * u], back(5.5, 1)], mw); break;
      case "tight": p.stroke([mFront, back(8, 0.2)], mw * 1.05); p.stroke([back(8, -1.4), back(9.6, 1.6)], mw * 0.55); break;
      case "vM": p.stroke([mFront, back(8.5, 0.2)], mw * 1.05); break;
      default: p.stroke([mFront, back(8, 0.3)], mw); break;
    }
  } else if (mk === "grin" || mk === "laugh") { // the cheek pushed up by the grin: a short crease behind the mouth corner
    const q = back(op[1] + 4.5, -1.5); p.arc(q[0], q[1], 2.6 * u, 4.2 * u, d > 0 ? 110 : -70, d > 0 ? 250 : 70, 1.5 * u, INK);
  }
  if (S.tongue && S.tongue > 0.05) { // concentration: the tongue tip poking out at the front corner
    const k = clamp(S.tongue, 0, 1), q = C([1.0, 0.49 + jaw * 0.5]);
    p.poly(ellPts(q[0] + d * 2.2 * u * k, q[1] + 1.2 * u, 3.2 * u * k, 2.4 * u * Math.max(0.4, k), 0.3 * d), TONGUE, 1.2 * u);
  }
  if (S.moustache) {
    const m = Cs(spline([[1.03, 0.29], [0.98, 0.38], [0.86, 0.44], [0.74, 0.43], [0.7, 0.36], [0.82, 0.3]], 4));
    p.poly(m, S.moustache, 1.6 * u); p.stroke(Cs([[0.98, 0.33], [0.78, 0.36]]), 0.9 * u, mix(S.moustache, "#ffffff", 0.45));
  }
  // ---- glasses edge-on + the temple arm (+ a cord)
  if (S.glasses) {
    const half = S.glasses === "half", gy = half ? 0.07 : -0.03, gx = 0.9;
    const lens = Cs(half ? ellPts(gx, gy, 0.035, 0.1) : ellPts(gx, gy, 0.035, 0.17));
    g.save(); g.globalAlpha = 0.25; p.poly(lens, "#cfe6ff", 0); g.restore();
    p.poly(lens, null, 2.1 * u, S.glasses === "round" ? "#3a2a20" : "#2a2230");
    p.stroke(Cs([[gx - 0.02, gy - (half ? 0.06 : 0.12)], [0.36, -0.1], [-0.02, -0.06], [-0.12, 0.05]]), 1.9 * u, S.glasses === "round" ? "#3a2a20" : "#2a2230");
    if (S.cord) { const ch = Cs(spline([[-0.1, 0.04], [-0.28, 0.5], [-0.2, 1.05], [0.05, 1.32]], 4, false)); p.stroke(ch, 1.3 * u, S.cord); for (let i = 1; i < ch.length; i += 2) p.dot(ch[i][0], ch[i][1], 1.2 * u, S.cord); }
  }
  // ---- head-wear in profile
  if (S.hat) drawProfileHat(p, S, S.hat);
  void hatted;
};

/** the hats in profile */
export const drawProfileHat = (p: Pen, S: ProfileSpec, h: HatP) => {
  const { u, light, d } = S, sc = h.scale ?? 1, dr = h.drop ?? 0, tl = ((h.tilt ?? 0) + (h.lag ?? 0)) * (Math.PI / 180) * d;
  const ow = 4 * u, thick = thickAngle(light);
  const R = (pts: P2[]): P2[] => {
    const c = toCard(S), o = pts.map(([x, y]) => c([x * sc, (y + dr) * sc - (sc - 1) * 0.55]));
    const [px, py] = toCard(S)([0, -0.5]), cs = Math.cos(tl), sn = Math.sin(tl);
    return o.map(([x, y]) => [px + (x - px) * cs - (y - py) * sn, py + (x - px) * sn + (y - py) * cs] as P2);
  };
  const col = h.col, shd = mul(col, [0.7, 0.68, 0.8]);
  if (h.k === "uniform") {
    // the crown flares above a straight band, a slightly forward-tilted top, the glossy black peak, the gold cord, the
    // plain round gold badge seen edge-on
    const crown = R(spline([[-1.04, -0.42], [-1.1, -0.72], [-1.2, -1.08], [-0.6, -1.2], [0.4, -1.22], [1.02, -1.16], [0.98, -0.86], [0.9, -0.5], [0.0, -0.44]], 4));
    p.gradFill(crown, mix(col, "#ffffff", 0.06), shd, light, 0.3); p.inkRing(crown, ow * 0.8, thick);
    const band = R([[-1.04, -0.43], [-1.08, -0.66], [0.94, -0.72], [0.9, -0.5]]);
    p.poly(band, mix(col, "#000000", 0.35), 1.2 * u);
    p.stroke(R([[-1.06, -0.63], [0.93, -0.69]]), 2.2 * u, h.band ?? "#d9a92e");
    p.stroke(R([[-0.6, -0.64], [0.4, -0.67]]), 0.9 * u, "#fff0b0");
    p.stroke(R(spline([[-1.0, -1.04], [0.1, -1.14], [0.9, -1.1]], 4, false)), 1.6 * u, mix(col, "#ffffff", 0.28));
    const visor = R(spline([[0.84, -0.5], [1.08, -0.5], [1.34, -0.44], [1.36, -0.38], [1.12, -0.37], [0.86, -0.41]], 3));
    p.poly(visor, h.visor ?? "#14121a", 1.8 * u);
    p.stroke(R([[0.95, -0.47], [1.28, -0.43]]), 1.5 * u, "#8e93a6");
    p.poly(R(ellPts(0.99, -0.9, 0.035, 0.1)), h.badge ?? "#d9a92e", 1.1 * u);
    p.stroke(R([[0.985, -0.96], [0.985, -0.86]]), 0.8 * u, "#fff0b0");
  } else if (h.k === "ball") {
    const crown = R(spline([[-1.02, -0.4], [-0.9, -0.86], [-0.3, -1.14], [0.3, -1.12], [0.76, -0.9], [0.94, -0.48], [0.0, -0.38]], 4));
    p.shadedFill(crown, col, shd, light, S.H.a, 0.4); p.inkRing(crown, ow * 0.8, thick);
    p.stroke(R(spline([[-0.2, -1.12], [0.25, -0.82], [0.5, -0.45]], 4, false)), 1.2 * u, shd);
    p.dot(...R([[-0.02, -1.15]])[0], 3 * u, shd);
    p.stroke(R(spline([[-0.6, -0.95], [-0.2, -1.06], [0.25, -1.04]], 4, false)), 2 * u, mix(col, "#ffffff", 0.35));
    const bill = R(spline([[0.82, -0.48], [1.2, -0.48], [1.5, -0.38], [1.48, -0.31], [1.18, -0.36], [0.84, -0.39]], 3));
    p.poly(bill, mix(col, "#5a1010", 0.25), 1.8 * u);
    p.stroke(R([[0.9, -0.44], [1.42, -0.37]]), 1.2 * u, mix(col, "#ffffff", 0.35));
  } else if (h.k === "beanie") {
    const dome = R(spline([[-1.06, -0.3], [-1.02, -0.86], [-0.4, -1.2], [0.4, -1.18], [0.94, -0.8], [1.0, -0.36], [0.0, -0.26]], 4));
    p.shadedFill(dome, col, shd, light, S.H.a, 0.4); p.inkRing(dome, ow * 0.8, thick);
    p.clip(dome, () => { for (let k = -5; k <= 5; k++) p.stroke(R([[k * 0.18, -1.2], [k * 0.2, -0.4]]), 1 * u, shd); });
    const cuff = R([[-1.08, -0.24], [-1.08, -0.5], [1.02, -0.55], [1.03, -0.3]]);
    p.poly(cuff, mix(col, "#000000", 0.12), 1.6 * u);
    p.clip(cuff, () => { for (let k = -6; k <= 6; k++) p.stroke(R([[k * 0.17, -0.6], [k * 0.17, -0.2]]), 1.1 * u, mix(col, "#000000", 0.3)); });
  }
};

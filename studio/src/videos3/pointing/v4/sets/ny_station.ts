// v4 SET ENTRY 'ny_station' (STATION owner, 2026-11-20): the New York lines of SCRIPT_v4 (locked):
//   BOARD line  "New York copied the pointing: conductors must point at this board before the doors open."
//   SIGN line   "So two New Yorkers held up a sign: 'Point here if you are dead sexy.'"
//   PAYOFF line "And the conductors had to point."
// The lines are found by their WORDS on the v4 clock (`TOKS`), not by line ids or typed seconds: the board line = the one
// with "conductors" + "board", the sign line = the one with "sexy", the payoff = the next line with "point". Every
// event (the point, the doors, the grin, the hop) is a word of those lines, so the staging follows any re-time.
// Cameras: one camera per PICTURE, chosen by the time a shot starts (any shot id on this set gets the picture its start
// falls in): the station WIDE (board line, first shot), the conductor + board MEDIUM (a second board-line shot), the SIGN
// (frontal from the train side: the sign big, the joke readable in a quarter second), the PAYOFF two-shot. One glide,
// then a rest (camkit.glideRest).
// Geometry: kit/subway (the station + the R-type train + the zebra board: tracks along X, platform top y 0, edge z 0,
// the conductor's window stops at x 0, the board hangs at (0, 2.35, 0.95) facing the train). Light: the LOOK
// director's budget in kit/subway/station.ts (glow-only fixtures + one long rect per row + 2 key spots) + ONE window-spill
// rect here. People: CAST (`ny_conductor`, `prankA` the man, `prankB` the woman, NY crowd ids as commuters).
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../../kit/core/ctx";
import { nyStation } from "../../../../kit/subway/station";
import { nyTrain, CAR } from "../../../../kit/subway/train";
import { stutter, drips } from "../../../../kit/subway/life";
import { LocalEnv } from "../../../../kit/subway/mats";
import { prop } from "../../../../kit/props/catalog";
import { castCard } from "../../../../kit/cards/adapters";
import { castCardOf } from "../../cast/member";
import { actBeats, timeBeats, type Beat } from "../../cast/moves";
import { R_V4 } from "../resolver";
import { FPS, FRAMES, TOKS, type Tok } from "../timeline";
import { SHOT_PLAN } from "../shot_plan";
import { glideRest, easeGlide, type ShotCam, type View } from "../camkit";
import { nyLook, NY_LIGHT, NY_RIG } from "../look";

// ---------------------------------------------------------------- THE LINES, found by their words
const lineToks = (pred: (ws: string[]) => boolean): Tok[] => {
  const ids = [...new Set(TOKS.map((t) => t.line))];
  for (const id of ids) { const ts = TOKS.filter((t) => t.line === id); if (pred(ts.map((t) => t.key.split("#")[0]))) return ts; }
  return [];
};
const BOARD = lineToks((ws) => ws.includes("conductors") && ws.includes("board"));
const SIGN = lineToks((ws) => ws.includes("sexy"));
const PAY = (() => { const after = SIGN.length ? SIGN[SIGN.length - 1].e : 0; const ids = [...new Set(TOKS.filter((t) => t.s > after).map((t) => t.line))];
  for (const id of ids) { const ts = TOKS.filter((t) => t.line === id); if (ts.some((t) => t.key.startsWith("point#")) && ts.some((t) => t.key.startsWith("conductors#"))) return ts; } return [] as Tok[]; })();
/** a word of a line (the first token whose bare word is w), start or end in film seconds; fallback = the line start + fb */
const wordT = (ts: Tok[], w: string, fb: number, end = false) => { const k = ts.find((t) => t.key.split("#")[0] === w); return k ? (end ? k.e : k.s) : (ts[0]?.s ?? 0) + fb; };
const span = (ts: Tok[]): [number, number] => (ts.length ? [ts[0].s, ts[ts.length - 1].e] : [-10, -9]);
// the events (film seconds)
const B0 = span(BOARD)[0] - 0.4, B1 = span(BOARD)[1] + 0.6;                    // the board line's picture window
/** V5 (lead 22:20: "the striped board and the conductor's point must read in one glance in the FIRST New York shot"):
 *  the train stops at the board, he points on "pointing" (v31), the point HOLDS across the cut into v32 (a match on
 *  action) through "...must point", the arm drops, and ONLY THEN the doors open (on "striped board") */
/** FIX ROUND 1 (lead 04:00, arm-out 22 % vs 16 %: the point held ~84 f across v31-v32): the point now snaps on
 *  "conductors" (v32, ~f1655) and the arm comes down as "striped board" begins (~f1709): ~54 f; the doors open on the
 *  lowered arm during "striped board". v31 = the train stops at the board, he leans out and looks at it */
/** AUDIT ROUND 1 (lead 04:30: "v31 wide: the train stops, the conductor leans out and points at the board; v32 close on
 *  the board and his pointing hand, then the doors opening behind"): the point snaps on "pointing" (v31), holds across
 *  the cut, drops right after the word "point" (~f1700); the doors open on the lowered arm as "striped board" begins */
// (lead 06:15, arm-out 19.7 % vs 16 %: "trim the board point as planned, it drops as striped board begins": the point
//  snaps on "conductors" (v32 only, v31 he leans out and LOOKS at the board), ~54 f instead of ~81)
const T_POINT = wordT(BOARD, "conductors", 0.6) - 0.1;
// (AUDIT ROUND 2, lead: "the doors slide open about 0.7 s after his point"): the point holds 25 f (>= 12), the doors
//  start 0.75 s after it lands, the arm drops as they slide (arm-out ~26 f instead of ~54)
const T_DROP = T_POINT + 25 / 30;
const T_HOLD = T_DROP - T_POINT, T_OPEN = T_POINT + 0.75, T_DOORS = 0.6;
/** the payoff point holds ~25 f (deadpan), then drops before the grin */
const T_PHOLD = 25 / 30;
const S0 = span(SIGN)[0] - 0.4, S1 = span(SIGN)[1] + 0.3;
/** they walk in under the board at the start of the sign line, arriving 1.0 s in */
const T_IN0 = S0 + 0.3, T_IN1 = S0 + 1.15;   // (round 2: they start nearer: 1.4 m to walk)
const P0 = span(PAY)[0] - 0.4, P1 = span(PAY)[1] + 1.0;
/** STATE SWITCHES SIT ON THE CUTS (never on word times: switched 0.1 s before the v33 cut, the riders vanished and the
 *  doors snapped shut in v32's last frames; switched 0.4 s before the payoff's first word, the sign swung 52 degrees in
 *  v34's last 9 frames; cold read 2026-11-20). A line's cut = the first NY shot that starts at most 0.6 s before its
 *  first word; the switch is half a frame before it (the shutter's sub-frames of the cut frame are all on the new side) */
const NY_STARTS = SHOT_PLAN.filter((p) => p.set === "ny_station").map((p) => FRAMES[p.id][0] / FPS).sort((a, b) => a - b);
const cutOf = (s: number, fb: number) => (NY_STARTS.find((x) => x >= s - 0.6) ?? fb) - 0.5 / FPS;
/** board picture until BS, the prank day from BS (the sign line's cut) */
const BS = SIGN.length ? cutOf(SIGN[0].s, SIGN[0].s - 0.2) : B1;
const inBoard = (t: number) => t >= B0 - 5 && t < BS, inPrank = (t: number) => t >= BS && t < P1 + 5;
const T_PPOINT = wordT(PAY, "conductors", 0.2);                                   // the payoff: he points at the sign
const T_GRIN = Math.max(T_PPOINT + 0.6, wordT(PAY, "point", 1.2));                // deadpan, held ... then the grin
const inW = (t: number, a: number, b: number) => t >= a && t < b;
const F = (s: number) => Math.round(s * FPS);
const ease = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

// ---------------------------------------------------------------- marks (station frame)
/** LAYOUT v5 (STATION #3, 2026-11-20 22:50; v5a stills: the side lenses saw the board as a blurred far wall feature, the
 *  door as a white panel at the edge, and the payoff conductor cut by the frame edge). EVERY lens now stands on the
 *  platform in FRONT of the train, down-train (+x) and out (+z), looking back up the train at ~35-50 deg:
 *  he leans from his window centre-right, the zebra board hangs out over the platform edge 0.75 m up-train of him (left)
 *  a little above his head, his car's door (x 1.69) is to his right. He points SIDEWAYS (screen-left, a little up) at the
 *  board: one glance reads board + arm + face. The sign stands right UNDER the board, facing him (and 3/4 to the lenses).
 *  The board's two faces are both striped (double-sided box). */
/** LAYOUT v6 (AUDIT ROUND 1, 04:40): v32-v35 now look UP-TRAIN from down-train (+x) near the platform edge (the "side"
 *  family, S_LENS): behind the action is the platform in depth (columns, benches, posters, tile wall, walkers), not the
 *  train side; the board and the sign turn toward that family (and still toward him). v31 keeps the platform wide. */
const S_LENS: [number, number] = [2.4, 0.85];
const BOARD_AT: V3 = [-0.75, 1.52, 0.45];
/** the board line's day: the board hangs further OUT over the platform (z 1.0) so the previous car's door (x -3.56) shows
 *  BESIDE it in v32 (at z 0.45 the door sat right behind the board from the edge lenses, a2) */
const BOARD_DAY: V3 = [BOARD_AT[0], BOARD_AT[1], 1.0];   // (y 1.72 -> 1.52: pointing 29 deg up his finger stood vertical, a raised finger more than a point, v5c f1625)
/** the prank day: the board hangs 0.4 m higher (its rods slide up into the ceiling) so the two faces fit under it */
const BOARD_UP = 0.4;
/** a unit facing (x, z) of a mark between two points (him + the lenses), wa = the share toward a */
const facing = (at: V3, a: [number, number], b: [number, number], wa = 0.5): [number, number] => {
  const u = (p: [number, number]) => { const dx = p[0] - at[0], dz = p[1] - at[2], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  const p = u(a), q = u(b), s = [wa * p[0] + (1 - wa) * q[0], wa * p[1] + (1 - wa) * q[1]], l = Math.hypot(s[0], s[1]) || 1; return [s[0] / l, s[1] / l];
};
const HIM: [number, number] = [0.02, -0.06];
const BN = facing(BOARD_DAY, HIM, S_LENS);
/** the board box faces local +-z: its yaw turns local +z onto BN */
export const BOARD_YAW = Math.atan2(BN[0], BN[1]), BOARD_SCALE = 1.0;
/** the sign: right under the board, chest height (CAST 18:40: held at 1.0 their hands sat inside their own heads) */
const SC: V3 = [-0.5, 0.8, 0.5];   // (round 2: 0.12 m nearer him: the group must fit inside the safe frame with him big)   // (lead 00:55: the sign bigger in v33 / v35: 0.96 x 0.70 m, its top still under their chins)
/** turned 2/3 toward the lenses (v5b f1800 / f1935: turned half-way the two stood in profile, her face behind his head):
 *  he still sees its face at ~60 deg, the lenses at ~25 deg, and the two stand side by side across the lens line */
const SN = facing(SC, HIM, S_LENS, 0.35);
/** the sign group's front plane faces local -z: its yaw turns local -z onto SN */
const SIGN_YAW = Math.atan2(-SN[0], -SN[1]);
const SX = { lx: [Math.cos(SIGN_YAW), 0, -Math.sin(SIGN_YAW)] as V3, back: [Math.sin(SIGN_YAW), 0, Math.cos(SIGN_YAW)] as V3 };
const behind = (along: number, back: number): V3 => [SC[0] + along * SX.lx[0] + back * SX.back[0], 0, SC[2] + along * SX.lx[2] + back * SX.back[2]];
/** the two face where the sign faces (3/4 to the lenses) */
const FACE_YAW = Math.atan2(SN[0], SN[1]);
export const NYV4 = {
  board: [BOARD_AT[0], BOARD_AT[1] + BOARD_UP, BOARD_AT[2]] as V3,                // (the prank day's board)
  /** the conductor leans from the middle cab window (window at x 0, car side z -0.12) */
  cond: [0.02, 0, -0.06] as V3,
  /** the man at the sign's -x end, the woman at its +x end, a step behind it */
  man: behind(-0.22, 0.27), woman: behind(0.3, 0.2),   // (lead round 2: their card edges met the tilted sign and drew a line across "IF" / "DEAD" in v34: both 7 cm further back)   // (a2: at the near end the man's face sat right above the conductor's hand)   // (she stands at its far end, not behind it: her face sank behind its top, v5d f1940; he stays clear of the conductor's hand)
  sign: { c: SC, w: 0.96, h: 0.7 },
  /** the door the riders use: HIS car's door (x 1.69), beside the side lenses and out of their frame (riders waiting at
   *  the far door stood on his point line, f1725 r7); the v31 wide sees them */
  door: -CAR.condX + CAR.doors[0],
};
const AWAY: V3 = [-60, -20, -60];

// ---------------------------------------------------------------- THE ACTING (CAST's moves, cued in frames of the words)
const BEATS: Beat[] = [
  // board line: leaning out, eyes on the board -> the point SNAPS on "pointing" (v31) and holds across the cut (v32)
  { who: "ny_conductor", m: "face", at: F(B0), until: F(T_POINT), expr: "focusB", still: true },
  // (auto: the arm on the board's side of his head, never across his face; gap: the hand stops in the clear, short of
  //  the board, lead 19:15)
  { who: "ny_conductor", m: "point", at: F(T_POINT), until: F(T_DROP), still: true, auto: true, gap: 0.55 },
  { who: "ny_conductor", m: "face", at: F(T_DROP), until: F(BS), expr: "focusB", still: true },
  // sign line: he stares at the sign (deadpan, held)
  { who: "ny_conductor", m: "face", at: F(BS + 0.5 / FPS), until: F(S1), expr: "deadpan", still: true },
  // payoff: points at the sign, deadpan, held ... one face swap to a grin
  { who: "ny_conductor", m: "point", at: F(T_PPOINT), until: F(T_PPOINT + T_PHOLD), still: true, auto: true, gap: 0.9 },   // (gap: the hand in the clear before the sign, not on its edge, r11)
  { who: "ny_conductor", m: "face", at: F(P0), until: F(T_GRIN), expr: "deadpan", still: true },
  { who: "ny_conductor", m: "face", at: F(T_GRIN), until: F(P1), expr: "brightGrin", still: true },
  // the two New Yorkers: grinning behind their sign (sign line) -> a small cheer (a hop) on the payoff's "point"
  { who: "prankA", m: "walk", at: F(T_IN0), until: F(T_IN1) },
  { who: "prankB", m: "walk", at: F(T_IN0) + 2, until: F(T_IN1) },
  { who: "prankA", m: "face", at: F(S0), until: F(P1), expr: "brightGrin", still: true },
  { who: "prankB", m: "face", at: F(S0), until: F(P1), expr: "brightGrin", still: true },
  { who: "prankA", m: "hop", at: F(T_GRIN), until: F(T_GRIN) + 14 },
  // (she grins, no hop: in its landing crouch her face sank behind the sign top, v5c f1940)
  // (AUDIT ROUND 2: mouths must stay SHUT under the narrator: the open-mouth laugh beats are out; they keep their grin
  //  + the man's hop until CAST gives a silent laugh, see FOR CAST 5)
];
const TIMED = timeBeats(BEATS, R_V4);

/** the train: stopped at the platform in every picture; doors shut until T_OPEN in the board line (shut again on the
 *  prank day: sign + payoff) */
/** THE TRAIN IN (v31): it glides the last metres and stops ~1 s after the board picture starts (braking 3 m/s^2, from
 *  +x toward the wide lens); the conductor rides with it. Metres still to go at time t */
// (AUDIT ROUND 2: "the train is arriving on the first frame", not 2 s of empty platform: his window is IN frame from
//  v31's first frame and glides the last ~0.6 m, stopping 0.65 s in)
const T_STOP = B0 + 0.95, DEC = 3.0;
const slideIn = (t: number) => (inBoard(t) && t < T_STOP ? 0.5 * DEC * (T_STOP - t) ** 2 : 0);
/** THE TRAIN IS ALIVE (lead 04:00, "the world must move"): it rocks a little on its springs while it glides in, settles
 *  with a damped bounce after the stop, dips as the doors open, and breathes ~5 mm while it stands (metres, up) */
const trainBob = (t: number) => {
  const roll = inBoard(t) && t < T_STOP ? 0.007 * Math.sin(t * 11.0) + 0.004 * Math.sin(t * 17.3) : 0;
  const d = t - T_STOP, settle = inBoard(t) && d > 0 && d < 3 ? -0.028 * Math.exp(-2.4 * d) * Math.sin(9.0 * d) : 0;
  const dip = inBoard(t) ? -0.012 * Math.exp(-(((t - T_OPEN - 0.25) / 0.3) ** 2)) : 0;
  return roll + settle + dip + 0.0025 * Math.sin(t * 2.1);
};
const doorsAt = (t: number) => (inBoard(t) ? ease((t - T_OPEN) / T_DOORS) : 0);
/** the sign: carried flat and low while they walk in from the back of the platform, SNAPS up (4 f) once they stand in
 *  front of his window; it keeps one yaw (SIGN_YAW) from then on (no turn on the payoff: the side lens reads it) */
const T_UP = T_IN1 + 0.1;
/** AUDIT ROUND 2 ("a head in a hole"): he stands 0.15 m higher in the cab so his navy SHOULDERS show above the sill;
 *  the card is still cut at the sill (world y 1.0) */
const COND_UP = 0.15;
/** they walk in ALONG the platform from up-train (-x: the left of every lens), side-on, carrying the sign flat (v5: walking
 *  in from the back of the platform they showed the lenses their backs) */
const WALK_IN = 1.4;

/** the cardboard sign: brown board, black marker capitals, a hand-drawn underline (the joke: readable at phone size) */
const signTex = () => {
  const W = 960, H = 726, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d")!;
  c.fillStyle = "#c79a5b"; c.fillRect(0, 0, W, H);
  let r = 7; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${90 + rnd() * 60},${60 + rnd() * 40},${30 + rnd() * 20},${0.05 + rnd() * 0.08})`; c.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 60, 1 + rnd() * 3); }   // corrugation streaks
  c.strokeStyle = "rgba(80,50,20,0.55)"; c.lineWidth = 6; c.strokeRect(8, 8, W - 16, H - 16);
  c.fillStyle = "#111111"; c.textAlign = "center"; c.textBaseline = "middle";
  // three lines, each sized to fill 88 % of the width (fits whatever font the page has), a marker underline
  const lines = ["POINT HERE", "IF YOU ARE", "DEAD SEXY"], rowH = [180, 180, 215];   // (round 1: CAST draws the hands in front: the words keep a margin for the four hands at the top corners)
  let y = 78;
  for (let i = 0; i < lines.length; i++) {
    let px = rowH[i] * 0.86; c.font = `900 ${px}px "Arial Black", Impact, sans-serif`;
    const w = c.measureText(lines[i]).width; if (w > W * 0.76) { px *= (W * 0.76) / w; c.font = `900 ${px}px "Arial Black", Impact, sans-serif`; }
    c.save(); c.translate(W / 2, y + rowH[i] / 2); c.rotate((i % 2 ? 1 : -1) * 0.012); c.fillText(lines[i], 0, 0); c.restore(); y += rowH[i];
  }
  c.lineWidth = 12; c.strokeStyle = "#111111"; c.beginPath(); c.moveTo(170, y + 20); c.quadraticCurveTo(W / 2, y + 40, W - 170, y + 14); c.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

export const build = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group(); g.name = "set:ny_station_v4";
  const t0 = performance.now();
  const { castMember, crowdNY } = await import("../../cast");
  // (the floor is fine near every lens: one point per lens position of NY_VIEWS)
  const lens = { points: Object.values(NY_VIEWS).flatMap(([a, b]) => [[a.pos[0], a.pos[2]], [b.pos[0], b.pos[2]]] as [number, number][]).concat([[0.0, 0.6], [-0.75, 1.2]]) };
  const st = await nyStation(ctx, { focus: [-14, 10], board: { x: BOARD_AT[0], z: BOARD_AT[2], y: BOARD_AT[1] }, lens, lumens: NY_LIGHT.lumens, kelvin: NY_LIGHT.kelvin });   // LOOK 19:00
  // LOOK (2026-11-20): warm red quarry-tile floor + sea-green ceiling instead of grey concrete / brown slab
  nyLook(st.mats, st.object);                                                                   // (+ the lower walls, found in the object)
  if (st.board) st.board.scale.setScalar(BOARD_SCALE);                                          // the kit board: 0.9 x 0.45 m
  const boardPivotY = st.board ? st.board.position.y : 0;
  // a black rim round the striped face (v5clips v31: in the wide its stripes melted into the white-and-dark window band
  // of the car behind it): a thin dark plate 4 cm bigger, inside the board's thickness, so only the rim shows
  if (st.board) { const face = st.board.children.find((o) => (o as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
    if (face) { const rim = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.53, 0.02), new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.6 }));
      rim.position.copy(face.position); rim.castShadow = true; rim.name = "v4_ny_board_rim"; st.board.add(rim); } }
  g.add(st.object);
  // the LOOK director's posters (text-free, strong colours) on the back wall, as in the v3 set
  {
    const posterTex = (seed: number) => {
      const cv = document.createElement("canvas"); cv.width = 256; cv.height = 360; const c = cv.getContext("2d")!;
      const BG = ["#c8263c", "#1d3f8a", "#f07a1a", "#5b2fa8", "#0f7a5c", "#d23f8f"], PAL = ["#f4f1ea", "#2bb37a", "#1f8fd6", "#e8452c", "#ffd23a", "#11a3a3"];
      c.fillStyle = BG[seed % BG.length]; c.fillRect(0, 0, 256, 360);
      let r = seed * 7919 + 104729; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
      for (let i = 0; i < 4; i++) { c.fillStyle = PAL[(seed + i) % PAL.length]; const x = rnd() * 256, y = rnd() * 250, d = 50 + rnd() * 100; if (i % 2) { c.beginPath(); c.arc(x, y, d / 2, 0, 7); c.fill(); } else c.fillRect(x - d / 2, y - d / 3, d, d * 0.66); }
      c.fillStyle = "rgba(255,255,255,0.9)"; c.fillRect(22, 286, 160, 16); c.fillRect(22, 312, 110, 11);
      c.strokeStyle = "#111111"; c.lineWidth = 12; c.strokeRect(6, 6, 244, 348);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    for (let k = -4; k <= 4; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshStandardMaterial({ map: posterTex(k + 5), roughness: 0.45 }));
      m.position.set(k * 4.57, 1.35, 5.6 - 0.015); m.rotation.y = Math.PI; m.receiveShadow = true; g.add(m); }
  }
  // AUDIT ROUND 1 ("bare, flat planes"): DRESSING in the strip the up-train lenses see behind the action (z 1.2-1.7,
  // x -3 .. -10, probe): a bench, bins, a utility cabinet and a coffee cart (no text, no brand), small in depth
  // (AUDIT ROUND 2: + a FOREGROUND layer for the wides, low in v31 / v33: a bench and a cardboard box (a bag stand-in))
  // (lead 09:30: the foreground bench + box read as an odd red block + cream box in v31 / v33: taken out)
  for (const [id, x, z, r] of [["bench_slats", -4.9, 1.55, -Math.PI / 2], ["bin", -3.3, 1.4, 0.4], ["utility_box", -6.6, 1.6, -Math.PI / 2], ["coffee_cart", -8.6, 1.7, -Math.PI / 2], ["bin_rusty", -10.2, 1.45, 1.1]] as [string, number, number, number][]) {
    try { const p = await prop(ctx, id as never, { pos: [x, 0, z], rotY: r }); g.add(p.object); } catch (e) { console.warn("ny_station v4: prop", id, e); }
  }
  // ---------------- the train (stopped: the conductor's window at x 0) + coloured LINE BULLETS (plain discs, no letters)
  const train = await nyTrain(ctx, { cars: 4, condCar: 1, z: -0.12 - CAR.HW, y: 0.0, selfLit: NY_LIGHT.trainSelfLit, nearCars: 1 });   // brushed-steel cars (NOT nyTrainLook: Redbirds left service in 2003, lead)
  g.add(train.object); train.place(0);
  // (the discs ride in their own group, moved with the train in update(): fixed to the set they stayed behind while the
  //  train glided in on v31; cold read 2026-11-20)
  const bullets = new THREE.Group(); bullets.name = "v4_ny_line_bullets"; g.add(bullets);
  {
    const disc = (col: string) => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const c = cv.getContext("2d")!;
      c.fillStyle = "#f4f4f0"; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.fill();
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: true }); };
    const mats = [disc("#f06a1f"), disc("#1f7fd8"), disc("#20a34f")], geo = new THREE.CircleGeometry(0.16, 32);
    for (let ci = -1; ci <= 2; ci++) for (const [k, dx0] of CAR.doors.entries()) {
      const m = new THREE.Mesh(geo, mats[(k + ci + 3) % 3]); m.position.set(ci * (CAR.L + CAR.gap) + dx0 - CAR.condX + 0.95, 2.02, -0.12 + 0.014); void m;   // (AUDIT ROUND 1, facts: the coloured disc read like a real route bullet: not added)
    }
  }
  // a small warm light on his face (LOOK 19:00: not a grey head in a dark window): just outside the window in front of his
  // face, toward the side lenses; it rides with the train (in the bullets group, moved in update())
  if (ctx.practical) { const p = ctx.practical({ kind: "point", pos: [0.32, 1.28, 0.22], kelvin: NY_LIGHT.condKelvin, lumens: NY_LIGHT.condLumens, bulb: false, seed: 4 }); bullets.add(p.object); }
  // THE DOOR READS (lead 19:15): a warm lit box inside his car behind its door (x 1.69): dim while shut, warm and bright
  // as the leaves slide (BackSide: seen only through the opening / door glass); rides with the train in `bullets`
  const doorGlowM = new THREE.MeshBasicMaterial({ color: 0x2a2018, side: THREE.BackSide, toneMapped: true });
  { const m = new THREE.Mesh(new THREE.BoxGeometry(CAR.DW - 0.04, CAR.DH - 0.04, 1.2), doorGlowM); m.position.set(NYV4.door, CAR.DH / 2, -0.12 - 0.66); m.name = "v4_ny_door_glow"; void m; }   // (AUDIT ROUND 1: this glow box read as a blank white rectangle; the car's own lit interior shows now)
  const GLOW_OFF = new THREE.Color(0x2a2018), GLOW_ON = new THREE.Color(1.0, 0.72, 0.36).multiplyScalar(1.6);
  // (lead 09:30, v32: "the doors opening must read: leaves sliding apart to a DARK doorway with WARM light and a passenger
  //  shape inside"): the door v32 sees beside the board (the previous car's, x -3.56) gets a deep warm interior box
  //  behind its leaves (dark while shut, a warm amber, never white) and a rider standing inside (crowd, below)
  const DOOR_P = -CAR.L - CAR.gap - CAR.condX + CAR.doors[3];
  const doorGlowP = new THREE.MeshBasicMaterial({ color: 0x140e08, side: THREE.BackSide, toneMapped: true });
  { const m = new THREE.Mesh(new THREE.BoxGeometry(CAR.DW - 0.04, CAR.DH - 0.04, 1.4), doorGlowP); m.position.set(DOOR_P, CAR.DH / 2, -0.12 - 0.76); m.name = "v4_ny_doorP_glow"; bullets.add(m); }
  const GLOWP_OFF = new THREE.Color(0x140e08), GLOWP_ON = new THREE.Color(0.62, 0.36, 0.14);
  // THE LIVERY (lead 00:55: "the steel car fills half of every frame"; LOOK's steel tints read olive): an INVENTED
  // livery (no real transit scheme): the lower body painted cobalt (over the grey fluted panels, between the doors), a
  // warm-yellow belt stripe, warm-yellow surrounds round every door and round the conductor's window (the hero's frame).
  // Thin boxes 1-2.5 cm proud of side A (z -0.12), riding with the train in `bullets`.
  {
    const cob = new THREE.MeshStandardMaterial({ color: new THREE.Color("#1d47c9"), roughness: 0.45, metalness: 0.0 });
    const yel = new THREE.MeshStandardMaterial({ color: new THREE.Color("#ffbf1f"), roughness: 0.45, metalness: 0.0 });
    const zA = -0.12, slab = (m: THREE.Material, x0: number, x1: number, y0: number, y1: number, dz: number, name: string) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.012), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, zA + dz); b.name = name; b.receiveShadow = true; bullets.add(b); };
    const half = CAR.L / 2, DW2 = CAR.DW / 2;
    for (let ci = -1; ci <= 2; ci++) {
      const cx = ci * (CAR.L + CAR.gap) - CAR.condX;                       // the car's centre (world x, train at rest)
      // AUDIT ROUND 1 ("a silver car with a stripe"): the steel stays bare; ONE cobalt stripe under the windows, broken at
      // the doors (the yellow belt above it, the yellow door + window surrounds)
      let a = cx - half + 0.12;
      for (const d of CAR.doors) { const b = cx + d - DW2 - 0.1; slab(cob, a, b, 0.5, 0.76, 0.016, "v4_ny_livery_low"); a = cx + d + DW2 + 0.1; }
      slab(cob, a, cx + half - 0.12, 0.5, 0.76, 0.016, "v4_ny_livery_low");
      // the belt stripe (in front of the belt rail), broken at the doors
      a = cx - half + 0.08;
      for (const d of CAR.doors) { slab(yel, a, cx + d - DW2 - 0.1, 0.77, 0.87, 0.026, "v4_ny_livery_belt"); a = cx + d + DW2 + 0.1; }
      slab(yel, a, cx + half - 0.08, 0.77, 0.87, 0.026, "v4_ny_livery_belt");
      // door surrounds: two posts + a header
      for (const d of CAR.doors) { const x = cx + d;
        slab(yel, x - DW2 - 0.1, x - DW2 - 0.01, 0.0, CAR.DH + 0.09, 0.02, "v4_ny_livery_door"); slab(yel, x + DW2 + 0.01, x + DW2 + 0.1, 0.0, CAR.DH + 0.09, 0.02, "v4_ny_livery_door");
        slab(yel, x - DW2 - 0.1, x + DW2 + 0.1, CAR.DH + 0.01, CAR.DH + 0.09, 0.02, "v4_ny_livery_door"); }
    }
    // the conductor's window surround (his car only: window x -0.31..0.31, y 1.0..1.78 at rest)
    slab(yel, -0.4, -0.32, 0.92, 1.86, 0.02, "v4_ny_livery_cab"); slab(yel, 0.32, 0.4, 0.92, 1.86, 0.02, "v4_ny_livery_cab");
    slab(yel, -0.4, 0.4, 1.79, 1.86, 0.02, "v4_ny_livery_cab"); slab(yel, -0.4, 0.4, 0.92, 0.99, 0.02, "v4_ny_livery_cab");
  }
  // the window spill: ONE rect light along the conductor's car, facing the platform (the light budget)
  if (ctx.practical) { const p = ctx.practical({ kind: "rect", pos: [3.0, 1.32, -0.08], target: [3.0, 1.32, 4], size: [8, 0.85], kelvin: 3800, lumens: 2400, bulb: false, seed: 9 }); g.add(p.object); }
  const env = new LocalEnv(ctx.gl, new THREE.Vector3(0, 1.45, 1.0), ctx.quality === "draft" ? 64 : 128);
  env.apply(...train.envMats, ...st.envMats);
  const noCapture: THREE.Object3D[] = [train.object];
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  const inNY = (t: number) => inW(t, B0 - 5, P1 + 5);

  // ---------------- the conductor (CAST), leaning from the middle cab window
  // (the board's centre; the sign's top line: aimed at the centre of the chest-high sign the arm fell below the sill, f1910)
  // (AUDIT ROUND 1, a1 f1910: aimed at the sign's centre the hand landed ON "HERE": now at its NEAR edge (his side), the
  //  hand stops just short of it, the words clear)
  // (a5: "outside the edge" along the sign's width ran INTO the car wall (z -0.3) and the arm vanished: now the near top
  //  corner pulled 0.2 m toward him along the platform, still in the open)
  // (round 2, r3c: with him raised the aim (y 0.92) sat BELOW the window sill (1.0): the arm was cut with the body at the
  //  sill and vanished: now the sign's near TOP corner (y 1.13, above the words), pulled 0.15 m toward him)
  // (lead 09:30: the fingertip AIMS at the word "HERE" (top row, near half) and STOPS a hand-width short of the sign:
  //  the large `gap` on the beat does the stopping; a hand on the sign read as him holding it)
  const SIGN_NEAR: V3 = [SC[0] - SX.lx[0] * 0.2, SC[1] + 0.22, SC[2] - SX.lx[2] * 0.2];
  const aim = (t: number): V3 | null => (inBoard(t) ? BOARD_DAY : SIGN_NEAR);
  const cond = await castCardOf(ctx, "ny_conductor", { pos: (t) => (inNY(t) ? [NYV4.cond[0] + slideIn(t), NYV4.cond[1] + COND_UP + trainBob(t), NYV4.cond[2]] : AWAY), yaw: () => 0, aim, look: aim,
    cutY: 975 - Math.round((1.0 - COND_UP) / 0.00216), px: 1300, name: "v4_ny_conductor" }, (e) => actBeats("ny_conductor", TIMED, e));
  g.add(cond.object); noCapture.push(cond.object); if (cond.update) ups.push(cond.update);
  // ---------------- the two New Yorkers + their sign (sign line + payoff only)
  const prank = (t: number) => inPrank(t);
  /** THE SIGN'S POSE (one function for the sign and the hands that hold it): carried flat, face DOWN, at waist height
   *  while they walk in from the back of the platform -> SNAPS up (4 f) at T_UP, one yaw (SIGN_YAW) throughout */
  const signPose = (t: number) => {
    // AUDIT ROUND 1 ("the sign swings up on a hinge and floats"): carried low and tipped back at hip height while they walk
    // in, then LIFTED: up 0.27 m and tipped upright over 9 f with a small overshoot (their hands ride on its edges)
    const S = NYV4.sign, k = ease((t - T_IN0) / (T_IN1 - T_IN0)), up = ease((t - T_UP) / (11 / FPS)), over = 0.035 * Math.sin(Math.PI * up);
    const bob = 0;   // (no lift on the grin: it covered her face, v5c f1940)
    // held in two pairs of hands: it trembles a little (life in the camera's rest), never on the frame of the snap
    const tr = up >= 1 ? 1 : 0, wob = tr * (0.006 * Math.sin(t * 7.3) + 0.004 * Math.sin(t * 11.9 + 1.3));
    return { x: S.c[0] - WALK_IN * (1 - k), y: S.c[1] - 0.27 * (1 - up) + over + bob + 0.004 * tr * Math.sin(t * 5.1) + 0.012 * (1 - up) * Math.sin(t * 11), z: S.c[2], yaw: SIGN_YAW + wob, tilt: -0.85 * (1 - up) + tr * 0.012 * Math.sin(t * 4.3 + 0.7) };
  };
  /** a point on the sign (local metres from its centre; dz + = behind it, the side they hold) in the world */
  const onSign = (t: number, dx: number, dy: number, dz = 0.03): V3 => {
    const q = signPose(t), cy = Math.cos(q.tilt), sy = Math.sin(q.tilt), ly = dy * cy - dz * sy, lz = dy * sy + dz * cy;
    const cw = Math.cos(q.yaw), sw = Math.sin(q.yaw); return [q.x + dx * cw + lz * sw, q.y + ly, q.z - dx * sw + lz * cw];
  };
  // their hands on the sign's back, at its ends (CAST: "both arms raised to the sign's edges: the set's restL / restR")
  const HANDS: Record<"prankA" | "prankB", { L?: [number, number]; R?: [number, number] }> = {
    // AUDIT ROUND 1 + CAST 05:45: their cards stand BEHIND the sign, so hands on its side edges were hidden: now both hands of
    // each grip the TOP edge (fingers just over it, visible): the man at its middle + near corner, the woman at the far
    // corner + inboard (right hand = screen-left for a person facing the lens)
    // (a8 f1843: a second hand reaching the same corner crossed the body and the words: ONE hand each on its OWN side
    //  top corner (the man at the near end with his left hand, the woman at the far end with her right), as the facts audit asked)
    prankA: { L: [-0.46, 0.42] }, prankB: { R: [0.46, 0.42] } };
  for (const [who, p] of [["prankA", NYV4.man], ["prankB", NYV4.woman]] as const) {
    // they walk in along the platform from up-train (-x), side-on, then stand turned with the sign
    const walkIn = (t: number): V3 => { const k = ease((t - T_IN0) / (T_IN1 - T_IN0)); return [p[0] - WALK_IN * (1 - k), 0, p[2]]; };
    const c = await castCardOf(ctx, who, { pos: (t) => (prank(t) ? walkIn(t) : AWAY), yaw: (t) => (t < T_IN1 - 0.1 ? Math.PI / 2 : FACE_YAW), aim: () => NYV4.board, look: () => [NYV4.cond[0], 1.4, NYV4.cond[2]], px: 1100, name: `v4_${who}`,
      restL: (t) => { const h = HANDS[who].L; return prank(t) && h ? onSign(t, h[0], h[1]) : null; }, restR: (t) => { const h = HANDS[who].R; return prank(t) && h ? onSign(t, h[0], h[1]) : null; } },
      (e) => actBeats(who, TIMED, e));
    g.add(c.object); noCapture.push(c.object); if (c.update) ups.push(c.update);
  }
  const sign = new THREE.Group();
  {
    const S = NYV4.sign, front = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.h), new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.9 }));
    front.rotation.y = Math.PI; sign.add(front);                                                     // faces -z: the train (and the conductor)
    const edge = new THREE.Mesh(new THREE.BoxGeometry(S.w, S.h, 0.008), new THREE.MeshStandardMaterial({ color: 0xa47a43, roughness: 0.95 }));
    edge.position.z = 0.005; sign.add(edge);                                                         // the plain back + the corrugated edge
    sign.position.set(...S.c); sign.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
    g.add(sign); noCapture.push(sign);
    sign.rotation.order = "YXZ";                                                                     // yaw, then the tilt about its own width
    ups.push((t) => { sign.visible = prank(t); const q = signPose(t); sign.position.set(q.x, q.y, q.z); sign.rotation.set(q.tilt, q.yaw, 0); });
  }
  // ---------------- commuters: one waits far up-train (board day); two walk the platform in depth (both ways); pigeons peck
  // the shot a time belongs to (by the shot plan, never typed frames) and the PICTURE it shows (one lens per picture)
  const starts = SHOT_PLAN.filter((p) => p.set === "ny_station").map((p) => FRAMES[p.id][0] / FPS);
  // by FRAME, not raw time: the shutter's sub-frames of a cut frame sample times just before it (no ghost of the last
  // picture's walkers in the first frame of the next)
  const shotK = (t: number) => { const tq = Math.round(t * FPS) / FPS; let k = 0; for (let j = 0; j < starts.length; j++) if (tq >= starts[j] - 1e-6) k = j; return k; };
  const picAt = (t: number) => pictureOf(Math.round((starts[shotK(t)] ?? 0) * FPS));
  let riders: Built | null = null;
  try {
    riders = await crowdNY(ctx, [
      // (lead 00:55 + cold7 f1735: the boarding riders read as a dark blurred blob at the right edge of v32: removed;
      //  the doors sliding open on a warm lit car carry the beat)
      // waits for the next train far down the platform (in the v33 picture he stood dark in the middle of the frame where
      // the two arrive, final pass f1736: moved out)
      // (v5: up-train, the background left of the board in every lens; out of the prank pictures, where the two walk in)
      { id: "nyRiderC", pos: (t) => (!inNY(t) || inPrank(t) || picAt(t) !== "wide" ? AWAY : [-5.6, 0, 1.1]), yaw: Math.PI / 2 + 0.5, seed: 11 },
      // (v32: a passenger standing just inside the previous car's door, seen as the leaves slide apart, then stepping to it)
      { id: "nyRiderA", pos: (t) => (inBoard(t) && picAt(t) === "side" && doorsAt(t) > 0.02 ? [DOOR_P + 0.12 + slideIn(t), 0, -0.85 + 0.35 * ease((t - T_OPEN - 0.4) / 0.6)] : AWAY), yaw: 0, seed: 3 },   // (a3: in v32 he stood as a dark back under the board)
    ]);
    g.add(riders.object); noCapture.push(riders.object);
  } catch (e) { console.warn("ny_station v4: crowdNY failed", e); }
  const walkers: { who: "nyRiderB" | "nyLeaver"; dir: 1 | -1; v: number }[] = [
    { who: "nyRiderB", dir: 1, v: 1.25 }, { who: "nyLeaver", dir: -1, v: 1.15 },
  ];
  // each PICTURE deals where they start (a cut hides it), chosen per lens so they cross in depth and never pass in front
  // of the lens or the action (a looping walker popped across v32 / v33 and filled a quarter of the v33 frame, f1660);
  // they never wrap inside a shot (at most ~4.4 m walked per shot).
  // [x, z] where each walker starts per picture: the side lenses are narrow, so their lanes run close to the edge (z 1.4-2.1)
  // and far down the platform (never between the lens and the action)
  // (v5 lenses all look up-train from +x +z: the lanes run in the background up-train, left of / behind the board, never
  //  between a lens and the action)
  // (AUDIT ROUND 1 lenses look up-train along the platform edge: the visible depth is the strip z 0.8-1.6 up-train (probe))
  const START: Record<keyof typeof NY_VIEWS, [[number, number], [number, number]]> = { wide: [[-4.9, 1.15], [-1.9, 1.5]], side: [[-11.0, 0.95], [-4.6, 1.15]],
    arrive: [[-7.8, 1.5], [-3.4, 1.75]], sign: [[-9.0, 1.35], [-4.0, 1.5]], payoff: [[-12.0, 1.15], [-4.8, 1.25]] };
  for (const [i, w] of walkers.entries()) {
    const x = (t: number) => START[picAt(t)][i][0] + w.dir * w.v * (t - (starts[shotK(t)] ?? 0));
    const wk = await castMember(ctx, w.who, { pos: (t) => (inNY(t) ? [x(t), 0, START[picAt(t)][i][1]] : AWAY), yaw: () => (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2), px: 700, name: "v4_ny_walker" + i,
      act: (t, Pz) => ({ ...Pz, walk: (w.v * t + i * 0.37) / 1.3, go: 1 }) });
    g.add(wk.object); noCapture.push(wk.object); if (wk.update) ups.push(wk.update);
  }
  // (FIX ROUND 1 had a rider stepping out of the previous car after the doors open: in v32 he crossed the conductor's
  //  face, a3: removed; the opening doors + the lit car carry the beat)
  // pigeons: near the bench; on the prank day one pecks just behind the woman (in the v33 frame, low right)
  // (a third one pecks at the man's feet on the prank day: two pigeons in the narrow v33 lens)
  // (v5: on the floor in front of the action, low in every lens; on the prank day two peck by the two's feet)
  // FIX ROUND 1 ("the world must move"): they HOP now and then (a 0.25 s hop, wings half open), and on the prank day the
  // two in the couple's path TAKE OFF as the two walk in (wings beating, up and away up-train), the one by their feet
  // hops clear when they arrive
  type Pg = { day: V3 | null; prank: V3 | null; fly?: number; dodge?: boolean };
  const PIGS: Pg[] = [
    { day: [-1.6, 0, 1.3], prank: [-2.05, 0, 0.8], fly: T_IN0 + 0.35 },
    { day: [-0.5, 0, 0.9], prank: [-1.15, 0, 1.25], dodge: true },
    { day: null, prank: [-0.3, 0, 1.75] },
    { day: null, prank: [-2.5, 0, 1.25], fly: T_IN0 + 0.15 },
  ];
  const FLY_DIR: V3 = [-0.8, 0, 0.6], FLY_T = 1.5;
  for (const [i, P] of PIGS.entries()) {
    const baseAt = (t: number): V3 | null => (!inNY(t) ? null : inPrank(t) ? P.prank : P.day);
    /** a hop every ~2.6 s (each its own phase): 0..1 inside the hop */
    const hopK = (t: number) => { const ph = ((t + i * 0.83) % 2.6) / 0.25; return ph < 1 ? Math.sin(ph * Math.PI) : 0; };
    const flyU = (t: number) => (P.fly !== undefined && inPrank(t) && t >= P.fly ? t - P.fly : -1);
    const dodgeK = (t: number) => (P.dodge && inPrank(t) ? ease((t - (T_IN1 - 0.25)) / 0.35) : 0);
    const pos = (t: number): V3 => {
      const b = baseAt(t); if (!b) return AWAY;
      const u = flyU(t); if (u > FLY_T) return AWAY;
      const walk: V3 = [b[0] + 0.05 * Math.sin(t * 0.6 + i) + 0.45 * dodgeK(t), 0, b[2] - 0.08 * Math.floor(((t * 0.8 + i * 0.4) % 6) / 1.5)];
      if (u >= 0) return [walk[0] + FLY_DIR[0] * 2.8 * u, 0.9 * u + 0.9 * u * u, walk[2] + FLY_DIR[2] * 2.8 * u];
      const hop = hopK(t) + (P.dodge ? Math.sin(Math.PI * Math.max(0, Math.min(1, ((t - (T_IN1 - 0.25)) / 0.35)))) * (inPrank(t) ? 1.6 : 0) : 0);
      return [walk[0], 0.05 * hop, walk[2]];
    };
    const pg = await castCard(ctx, { who: "pigeon", pos,
      yaw: (t) => (flyU(t) >= 0 ? -0.9 : 0.6 * Math.sin(t * 0.5 + i * 2) + (i % 2 ? 2.4 : -0.8)),
      pose: (t) => { const u = flyU(t), ph = (t * 1.7 + i * 0.31) % 1, h = hopK(t);
        if (u >= 0) return { run: 0, flap: 1, wing: t * 7.5, peck: 0, lift: Math.min(1, u * 3) };
        return { run: ph, flap: h > 0 ? 0.5 : 0, wing: t * 7.5, peck: h > 0 ? 0 : Math.max(0, Math.sin((t + i) * 5.0)) ** 6, lift: 0.4 * h }; }, px: 260 });
    g.add(pg.object); noCapture.push(pg.object); if (pg.update) ups.push(pg.update);
  }
  const drip = drips(ctx, [{ at: [2.6, st.CY - 0.01, 3.0], floorY: 0.0, period: 1.7, phase: 0.3 }]);
  g.add(drip.object); noCapture.push(drip.object);

  console.warn(`ny_station v4 built in ${(performance.now() - t0).toFixed(0)} ms | board line ${B0.toFixed(2)}-${B1.toFixed(2)} (point ${T_POINT.toFixed(2)}, doors ${T_OPEN.toFixed(2)}) | sign ${S0.toFixed(2)}-${S1.toFixed(2)} | payoff ${P0.toFixed(2)}-${P1.toFixed(2)} (grin ${T_GRIN.toFixed(2)})`);
  return {
    object: g,
    hints: { shadowCenter: [0, 0, 0], shadowExt: 34, probe: [0, 1.6, 1.9], groundAlbedo: [0.3, 0.28, 0.26], rigOpts: { ...NY_RIG } },   // LOOK 19:00: bright warm room fill, thin fog, more bounce
    update: (t, cam) => {
      const dr = doorsAt(t);
      const run = slideIn(t), bob = trainBob(t); train.place(run); train.object.position.y = bob; bullets.position.x = run; bullets.position.y = bob; train.cond.setWindow(1);
      for (const c of train.cars) { c.setDoors(dr); c.setIndicator(dr > 0.05 ? 1 : 0); }
      doorGlowM.color.copy(GLOW_OFF).lerp(GLOW_ON, dr); doorGlowP.color.copy(GLOWP_OFF).lerp(GLOWP_ON, dr);
      // (the prank day raises it: the rods slide up into the ceiling)
      if (st.board) { st.board.position.x = BOARD_AT[0]; st.board.position.z = inBoard(t) ? BOARD_DAY[2] : BOARD_AT[2]; st.board.position.y = boardPivotY + (inBoard(t) ? 0 : BOARD_UP); st.board.rotation.y = BOARD_YAW; st.board.rotation.x = 0.004 * Math.sin(t * 2.1) + 0.0025 * Math.sin(t * 3.7 + 1); st.board.rotation.z = 0.002 * Math.sin(t * 1.3 + 0.5); }
      if (st.flicker) st.flicker.set(stutter(t, 3));
      if (!env.done) { for (const p of st.lamps) p.update(t); st.flicker?.set(1); st.flicker?.update(t); env.capture(ctx.scene, noCapture); if (st.flicker) st.flicker.set(stutter(t, 3)); }
      for (const u of ups) u(t, cam);
      riders?.update?.(t, cam); drip.update?.(t, cam);
    },
    dispose: () => env.dispose(),
  };
};

// ---------------------------------------------------------------- THE CAMERAS (one per picture; glide, then rest)
/** the five pictures (LAYOUT v5): every lens stands on the platform down-train (+x) and out (+z), looking back up the
 *  train: the board / sign at the left, him centre-right in his window, his car's door at the right. Each picture is ONE
 *  glide (>= 0.25 % of the frame per frame, DIRECTOR 2026-11-20), then a 20 f rest (glideRest). */
export const NY_VIEWS: Record<"wide" | "side" | "arrive" | "sign" | "payoff", [View, View]> = {
  // v31 the station wide: the train glides in from the right and stops at the board; he leans out and points at it on
  // "pointing"; riders by his car's door, a pigeon; a push in from the back of the platform
  wide: [{ pos: [3.6, 1.8, 4.3], look: [-0.3, 1.35, 0.45], fov: 54 }, { pos: [2.3, 1.6, 3.4], look: [-0.35, 1.38, 0.45], fov: 56 }],
  // v32 THE POINT, then THE DOOR: tight on board + arm + face (head ~1/7), then ONE glide back and right so his car's
  // door (x 1.69) comes in at the right as the arm drops and the doors open (the rest holds the open door, riders in)
  side: [{ pos: [2.75, 1.55, 1.45], look: [-0.9, 1.35, 0.42], fov: 70 }, { pos: [2.05, 1.42, 0.48], look: [-1.05, 1.3, 0.34], fov: 72 }],
  // v33 the two walk in from up-train (left), side-on, carrying the sign flat, and snap it up under the board; him at the
  // right in his window; a slow arc
  arrive: [{ pos: [2.0, 2.45, 2.0], look: [-0.36, 0.78, 0.08], fov: 78 }, { pos: [1.7, 2.15, 1.5], look: [-0.32, 0.78, 0.06], fov: 76 }],
  // v34 THE SIGN, from his side of it (nearly square to its face): big, the grinning faces above it, the board's lower
  // edge at the top; a push
  sign: [{ pos: [1.6, 1.24, 2.05], look: [-0.92, 0.64, 0.75], fov: 64 }, { pos: [0.95, 1.12, 1.4], look: [-0.58, 0.64, 0.5], fov: 66 }],
  // v35 THE PAYOFF: him WHOLE in his window at the right, his arm a clear line down-left to the sign, the two grinning
  // behind it, the board above them; all above 64 %
  payoff: [{ pos: [2.2, 1.22, 2.0], look: [-0.22, 0.95, 0.22], fov: 68 }, { pos: [1.6, 1.2, 1.65], look: [-0.3, 0.94, 0.28], fov: 64 }],   // (lead 09:30: B = a ~1.5x push toward the gap between his hand and the sign; x <= 2.2: the column at x 2.29)
};
/** PROBE ONLY (scratchpad nyproj.mjs): key world points at time t (no render) */
export const NY_PTS = (t: number): Record<string, V3> => {
  const s = slideIn(t), cx = NYV4.cond[0] + s, by = BOARD_AT[1] + (inBoard(t) ? 0 : BOARD_UP), bz = inBoard(t) ? BOARD_DAY[2] : BOARD_AT[2];
  const bl: V3 = [Math.cos(BOARD_YAW) * 0.45, 0, -Math.sin(BOARD_YAW) * 0.45];
  const aimP: V3 = inBoard(t) ? BOARD_AT : [SC[0], SC[1] + 0.2, SC[2]];
  const sh: V3 = [cx, 1.05 + COND_UP, 0.05], d = [aimP[0] - sh[0], aimP[1] - sh[1], aimP[2] - sh[2]], l = Math.hypot(d[0], d[1], d[2]);
  return { head: [cx, 1.32 + COND_UP, -0.02], crown: [cx, 1.55 + COND_UP, -0.02], sill: [cx, 0.86, -0.12], hand: [sh[0] + (0.6 * d[0]) / l, sh[1] + (0.6 * d[1]) / l, sh[2] + (0.6 * d[2]) / l],
    boardL: [BOARD_AT[0] - bl[0], by, bz - bl[2]], boardR: [BOARD_AT[0] + bl[0], by, bz + bl[2]], boardBot: [BOARD_AT[0], by - 0.225, bz],
    signL: [SC[0] - SX.lx[0] * 0.48, SC[1] + 0.35, SC[2] - SX.lx[2] * 0.48], signR: [SC[0] + SX.lx[0] * 0.48, SC[1] - 0.35, SC[2] + SX.lx[2] * 0.48],
    manHead: [NYV4.man[0], 1.36, NYV4.man[2]], womHead: [NYV4.woman[0], 1.32, NYV4.woman[2]], manFeet: [NYV4.man[0], 0, NYV4.man[2]],
    doorC: [1.69 + s, 1.0, -0.12], doorP: [-3.56 + s, 1.0, -0.12], doorL: [1.06 + s, 1.9, -0.12], doorR: [2.33 + s, 0.0, -0.12] };
};
/** which picture a shot shows: by the LINE its start falls in and its ORDER inside that line (never by a word inside the
 *  line: the story revision moved v32's cut from "conductors" to "subway" and the old word test gave v32 the wide, f1585).
 *  Board line: 1st shot = wide, later = side. Sign line: 1st = arrive (the two turn it up), later = sign. Payoff: payoff. */
const NY_FROMS = SHOT_PLAN.filter((p) => p.set === "ny_station").map((p) => FRAMES[p.id][0]).sort((a, b) => a - b);
const pictureOf = (from: number): keyof typeof NY_VIEWS => {
  const t = from / FPS + 0.05, lineOf = (s: number) => (s >= P0 - 0.05 ? 2 : s >= S0 - 0.05 ? 1 : 0);
  const line = lineOf(t), first = NY_FROMS.filter((f) => lineOf(f / FPS + 0.05) === line)[0] ?? from;
  if (line === 2) return "payoff";
  if (line === 1) return from <= first ? "arrive" : "sign";
  return from <= first ? "wide" : "side";
};
/** v35 (lead 09:30): the PUSH-IN (~1.5x toward the gap between his hand and the sign) ENDS as his point lands, then the
 *  frame HOLDS through the deadpan and the grin (push, then hold, then grin); every other picture: one glide + rest */
const payoffCam: ShotCam = (from, to) => { const [a, b] = NY_VIEWS.payoff, t0 = from / FPS, t1 = Math.min((to - 15) / FPS, T_PPOINT + 4 / FPS);
  const l3 = (p: V3, q: V3, u: number): V3 => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
  return (t: number) => { const u = easeGlide((t - t0) / Math.max(1e-3, t1 - t0)), pos = l3(a.pos, b.pos, u), look = l3(a.look, b.look, u);
    return { pos, look, fov: a.fov + (b.fov - a.fov) * u, fnum: b.fnum ?? 8, focus: Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]) }; }; };
const nyCam: ShotCam = (from, to) => { const pic = pictureOf(from); if (pic === "payoff") return payoffCam(from, to); const [a, b] = NY_VIEWS[pic]; return glideRest(a, b, 20)(from, to); };
/** every shot of the v4 plan on this set gets the dispatcher (keyed by its id, both forms) */
export const CAMS: Record<string, ShotCam> = Object.fromEntries(SHOT_PLAN.filter((p) => p.set === "ny_station").flatMap((p) => [[p.id, nyCam], ["v4_" + p.id, nyCam]]));

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
import { castCard } from "../../../../kit/cards/adapters";
import { castCardOf } from "../../cast/member";
import { actBeats, timeBeats, type Beat } from "../../cast/moves";
import { R_V4 } from "../resolver";
import { FPS, TOKS, type Tok } from "../timeline";
import { SHOT_PLAN } from "../shot_plan";
import { glideRest, type ShotCam, type View } from "../camkit";

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
const T_POINT = wordT(BOARD, "point", 1.6);                                       // he points at the board on "point"
const T_OPEN = Math.max(T_POINT + 0.7, wordT(BOARD, "open", 3.2) - 0.15);         // ONLY THEN the doors open
const S0 = span(SIGN)[0] - 0.4, S1 = span(SIGN)[1] + 0.3;
/** the sign's own words start ("Point here..."): before them the two walk in under the board (sign edge-on), from them the sign is big */
const T_SIGNTXT = (() => { const k = SIGN.findIndex((t) => t.key.split("#")[0] === "sign"); return k >= 0 && SIGN[k + 1] ? SIGN[k + 1].s : wordT(SIGN, "point", 1.6); })();
/** they walk in under the board at the start of the sign line, arriving 0.9 s in */
const T_IN0 = S0 + 0.25, T_IN1 = S0 + 1.05;
const P0 = span(PAY)[0] - 0.4, P1 = span(PAY)[1] + 1.0;
/** the picture boundaries (a shot cuts 0.1 s before its line): board picture until BS, the prank day from BS */
const BS = SIGN.length ? SIGN[0].s - 0.2 : B1;
const inBoard = (t: number) => t >= B0 - 5 && t < BS, inPrank = (t: number) => t >= BS && t < P1 + 5;
const T_PPOINT = wordT(PAY, "conductors", 0.2);                                   // the payoff: he points at the sign
const T_GRIN = Math.max(T_PPOINT + 0.6, wordT(PAY, "point", 1.2));                // deadpan, held ... then the grin
const inW = (t: number, a: number, b: number) => t >= a && t < b;
const F = (s: number) => Math.round(s * FPS);
const ease = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

// ---------------------------------------------------------------- marks (station frame)
export const NYV4 = {
  board: [0, 2.35, 0.95] as V3,
  /** the conductor leans from the middle cab window (window at x 0, car side z -0.12) */
  cond: [0.02, 0, -0.06] as V3,
  /** the two New Yorkers stand right under the board, facing the train; the sign is held in front of their chests */
  man: [-0.3, 0, 1.24] as V3, woman: [0.31, 0, 1.22] as V3,
  sign: { c: [0.0, 0.97, 1.0] as V3, w: 0.74, h: 0.56 },
  /** the conductor's own car: its door nearest his window (world x) */
  door: -CAR.condX + CAR.doors[0],
};
const AWAY: V3 = [-60, -20, -60];

// ---------------------------------------------------------------- THE ACTING (CAST's moves, cued in frames of the words)
const BEATS: Beat[] = [
  // board line: leaning out, eyes on the board -> the point SNAPS on "point" and holds past the doors opening
  { who: "ny_conductor", m: "face", at: F(B0), until: F(T_POINT), expr: "focusB", still: true },
  { who: "ny_conductor", m: "point", at: F(T_POINT), until: F(B1), still: true },
  // sign line: he stares at the sign (deadpan, held)
  { who: "ny_conductor", m: "face", at: F(S0), until: F(S1), expr: "deadpan", still: true },
  // payoff: points at the sign, deadpan, held ... one face swap to a grin
  { who: "ny_conductor", m: "point", at: F(T_PPOINT), until: F(P1), still: true },
  { who: "ny_conductor", m: "face", at: F(P0), until: F(T_GRIN), expr: "deadpan", still: true },
  { who: "ny_conductor", m: "face", at: F(T_GRIN), until: F(P1), expr: "brightGrin", still: true },
  // the two New Yorkers: grinning behind their sign (sign line) -> a small cheer (a hop) on the payoff's "point"
  { who: "prankA", m: "walk", at: F(T_IN0), until: F(T_IN1) },
  { who: "prankB", m: "walk", at: F(T_IN0) + 2, until: F(T_IN1) },
  { who: "prankA", m: "face", at: F(S0), until: F(P1), expr: "brightGrin", still: true },
  { who: "prankB", m: "face", at: F(S0), until: F(P1), expr: "brightGrin", still: true },
  { who: "prankA", m: "hop", at: F(T_GRIN), until: F(T_GRIN) + 14 },
  { who: "prankB", m: "hop", at: F(T_GRIN) + 3, until: F(T_GRIN) + 17 },
];
const TIMED = timeBeats(BEATS, R_V4);

/** the train: stopped at the platform in every picture; doors shut until T_OPEN in the board line (shut again on the
 *  prank day: sign + payoff) */
const doorsAt = (t: number) => (inBoard(t) ? ease((t - T_OPEN) / 0.9) : 0);

/** the cardboard sign: brown board, black marker capitals, a hand-drawn underline (the joke: readable at phone size) */
const signTex = () => {
  const W = 960, H = 726, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d")!;
  c.fillStyle = "#c79a5b"; c.fillRect(0, 0, W, H);
  let r = 7; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${90 + rnd() * 60},${60 + rnd() * 40},${30 + rnd() * 20},${0.05 + rnd() * 0.08})`; c.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 60, 1 + rnd() * 3); }   // corrugation streaks
  c.strokeStyle = "rgba(80,50,20,0.55)"; c.lineWidth = 6; c.strokeRect(8, 8, W - 16, H - 16);
  c.fillStyle = "#111111"; c.textAlign = "center"; c.textBaseline = "middle";
  // three lines, each sized to fill 88 % of the width (fits whatever font the page has), a marker underline
  const lines = ["POINT HERE", "IF YOU ARE", "DEAD SEXY"], rowH = [190, 190, 230];
  let y = 40;
  for (let i = 0; i < lines.length; i++) {
    let px = rowH[i] * 0.86; c.font = `900 ${px}px "Arial Black", Impact, sans-serif`;
    const w = c.measureText(lines[i]).width; if (w > W * 0.88) { px *= (W * 0.88) / w; c.font = `900 ${px}px "Arial Black", Impact, sans-serif`; }
    c.save(); c.translate(W / 2, y + rowH[i] / 2); c.rotate((i % 2 ? 1 : -1) * 0.012); c.fillText(lines[i], 0, 0); c.restore(); y += rowH[i];
  }
  c.lineWidth = 12; c.strokeStyle = "#111111"; c.beginPath(); c.moveTo(170, y + 20); c.quadraticCurveTo(W / 2, y + 40, W - 170, y + 14); c.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

export const build = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group(); g.name = "set:ny_station_v4";
  const t0 = performance.now();
  const { castMember, crowdNY } = await import("../../cast");
  const lens = { points: [[-2.9, 2.7], [-1.4, 2.8], [-2.6, 2.9], [0.0, 0.3], [-0.6, 1.45], [-1.95, 3.34]] as [number, number][] };
  const st = await nyStation(ctx, { focus: [-14, 10], board: { x: NYV4.board[0], z: NYV4.board[2], y: NYV4.board[1] }, lens, lumens: 2000, kelvin: 3200 });
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
  // ---------------- the train (stopped: the conductor's window at x 0) + coloured LINE BULLETS (plain discs, no letters)
  const train = await nyTrain(ctx, { cars: 4, condCar: 1, z: -0.12 - CAR.HW, y: 0.0, selfLit: 0.6, nearCars: 1 });
  g.add(train.object); train.place(0);
  {
    const disc = (col: string) => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const c = cv.getContext("2d")!;
      c.fillStyle = "#f4f4f0"; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.fill();
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: true }); };
    const mats = [disc("#f06a1f"), disc("#1f7fd8"), disc("#20a34f")], geo = new THREE.CircleGeometry(0.16, 32);
    for (let ci = -1; ci <= 2; ci++) for (const [k, dx0] of CAR.doors.entries()) {
      const m = new THREE.Mesh(geo, mats[(k + ci + 3) % 3]); m.position.set(ci * (CAR.L + CAR.gap) + dx0 - CAR.condX + 0.95, 2.02, -0.12 + 0.014); g.add(m);
    }
  }
  // the window spill: ONE rect light along the conductor's car, facing the platform (the light budget)
  if (ctx.practical) { const p = ctx.practical({ kind: "rect", pos: [3.0, 1.32, -0.08], target: [3.0, 1.32, 4], size: [8, 0.85], kelvin: 3800, lumens: 2400, bulb: false, seed: 9 }); g.add(p.object); }
  const env = new LocalEnv(ctx.gl, new THREE.Vector3(0, 1.45, 1.0), ctx.quality === "draft" ? 64 : 128);
  env.apply(...train.envMats, ...st.envMats);
  const noCapture: THREE.Object3D[] = [train.object];
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  const inNY = (t: number) => inW(t, B0 - 5, P1 + 5);

  // ---------------- the conductor (CAST), leaning from the middle cab window
  const aim = (t: number): V3 | null => (inBoard(t) ? [NYV4.board[0], NYV4.board[1] - 0.12, NYV4.board[2]] : [NYV4.sign.c[0] - 0.05, NYV4.sign.c[1] + 0.32, NYV4.sign.c[2]]);
  const cond = await castCardOf(ctx, "ny_conductor", { pos: (t) => (inNY(t) ? NYV4.cond : AWAY), yaw: () => 0, aim, look: aim,
    cutY: 975 - Math.round(1.0 / 0.00216), px: 1300, name: "v4_ny_conductor" }, (e) => actBeats("ny_conductor", TIMED, e));
  g.add(cond.object); noCapture.push(cond.object); if (cond.update) ups.push(cond.update);
  // ---------------- the two New Yorkers + their sign (sign line + payoff only)
  const prank = (t: number) => inPrank(t);
  for (const [who, p] of [["prankA", NYV4.man], ["prankB", NYV4.woman]] as const) {
    const walkIn = (t: number): V3 => { const k = ease((t - T_IN0) / (T_IN1 - T_IN0)); return [p[0] - 1.6 * (1 - k), 0, p[2] + 0.5 * (1 - k)]; };
    const c = await castCardOf(ctx, who, { pos: (t) => (prank(t) ? walkIn(t) : AWAY), yaw: (t) => (t < T_IN1 - 0.1 ? Math.PI / 2 + 0.3 : Math.PI), aim: () => NYV4.board, look: () => [NYV4.cond[0], 1.7, NYV4.cond[2]], px: 1100, name: `v4_${who}` },
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
    ups.push((t) => { sign.visible = prank(t); const k = ease((t - T_IN0) / (T_IN1 - T_IN0)); sign.position.x = S.c[0] - 1.6 * (1 - k); sign.position.z = S.c[2] + 0.5 * (1 - k); sign.position.y = S.c[1] + (inW(t, F(T_GRIN) / FPS, F(T_GRIN) / FPS + 0.5) ? 0.04 * Math.sin(((t - T_GRIN) / 0.5) * Math.PI) : 0); });
  }
  // ---------------- commuters: two wait beside the conductor's car door, step aside, then board after the doors open;
  // two walk the platform in depth (both ways); two pigeons peck near the bench
  const D = NYV4.door;
  const boardPath = (side: -1 | 1, delay: number) => (t: number): V3 => {
    const wait: V3 = [D + side * 0.95, 0, 0.75], k = inBoard(t) ? ease((t - T_OPEN - 0.45 - delay) / 1.1) : 0;
    return k < 0.5 ? [wait[0] - side * 0.95 * (k / 0.5), 0, wait[2]] : [D, k > 0.95 ? 0.03 : 0, wait[2] - 1.6 * ((k - 0.5) / 0.5)];
  };
  let riders: Built | null = null;
  try {
    riders = await crowdNY(ctx, [
      { id: "nyRiderA", pos: (t) => (inBoard(t) ? boardPath(-1, 0)(t) : AWAY), yaw: -Math.PI / 2 - 0.4, seed: 3 },
      { id: "watchTapper", pos: (t) => (inBoard(t) ? boardPath(1, 0.35)(t) : AWAY), yaw: Math.PI / 2 + 0.4, seed: 9 },
      { id: "nyRiderC", pos: (t) => (inNY(t) ? [6.3, 0, 1.0] : AWAY), yaw: Math.PI, seed: 11 },
    ]);
    g.add(riders.object); noCapture.push(riders.object);
  } catch (e) { console.warn("ny_station v4: crowdNY failed", e); }
  const walkers: { who: "nyRiderB" | "nyLeaver"; z: number; dir: 1 | -1; x0: number; v: number }[] = [
    { who: "nyRiderB", z: 2.7, dir: 1, x0: -3.2, v: 1.25 }, { who: "nyLeaver", z: 4.0, dir: -1, x0: 10.0, v: 1.15 },
  ];
  for (const [i, w] of walkers.entries()) {
    const x = (t: number) => { const cyc = 13 / w.v; const u = ((((t + i * 3.1) % cyc) + cyc) % cyc) * w.v; return w.x0 + w.dir * u; };
    const wk = await castMember(ctx, w.who, { pos: (t) => (inNY(t) ? [x(t), 0, w.z] : AWAY), yaw: () => (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2), px: 700, name: "v4_ny_walker" + i,
      act: (t, Pz) => ({ ...Pz, walk: (w.v * t + i * 0.37) / 1.3, go: 1 }) });
    g.add(wk.object); noCapture.push(wk.object); if (wk.update) ups.push(wk.update);
  }
  for (const [i, p] of ([[-1.9, 0, 2.6], [2.4, 0, 3.0]] as V3[]).entries()) {
    const pg = await castCard(ctx, { who: "pigeon", pos: (t) => (inNY(t) ? [p[0] + 0.05 * Math.sin(t * 0.6 + i), 0, p[2] - 0.08 * Math.floor(((t * 0.8 + i * 0.4) % 6) / 1.5)] : AWAY),
      yaw: (t) => 0.6 * Math.sin(t * 0.5 + i * 2) + (i ? 2.4 : -0.8), pose: (t) => { const ph = (t * 1.7 + i * 0.31) % 1; return { run: ph, flap: 0, wing: 0, peck: Math.max(0, Math.sin((t + i) * 5.0)) ** 6, lift: 0 }; }, px: 260 });
    g.add(pg.object); noCapture.push(pg.object); if (pg.update) ups.push(pg.update);
  }
  const drip = drips(ctx, [{ at: [2.6, st.CY - 0.01, 3.0], floorY: 0.0, period: 1.7, phase: 0.3 }]);
  g.add(drip.object); noCapture.push(drip.object);

  console.warn(`ny_station v4 built in ${(performance.now() - t0).toFixed(0)} ms | board line ${B0.toFixed(2)}-${B1.toFixed(2)} (point ${T_POINT.toFixed(2)}, doors ${T_OPEN.toFixed(2)}) | sign ${S0.toFixed(2)}-${S1.toFixed(2)} | payoff ${P0.toFixed(2)}-${P1.toFixed(2)} (grin ${T_GRIN.toFixed(2)})`);
  return {
    object: g,
    hints: { shadowCenter: [0, 0, 0], shadowExt: 34, probe: [0, 1.6, 1.9], groundAlbedo: [0.3, 0.28, 0.26], rigOpts: { sat: 1.85, shadowSat: 1.5, contrast: 0.34, exposure: 3.3, warmth: 0.25 } },
    update: (t, cam) => {
      const dr = doorsAt(t);
      train.place(0); train.cond.setWindow(1);
      for (const c of train.cars) { c.setDoors(dr); c.setIndicator(dr > 0.05 ? 1 : 0); }
      if (st.board) { st.board.rotation.x = 0.004 * Math.sin(t * 2.1) + 0.0025 * Math.sin(t * 3.7 + 1); st.board.rotation.z = 0.002 * Math.sin(t * 1.3 + 0.5); }
      if (st.flicker) st.flicker.set(stutter(t, 3));
      if (!env.done) { for (const p of st.lamps) p.update(t); st.flicker?.set(1); st.flicker?.update(t); env.capture(ctx.scene, noCapture); if (st.flicker) st.flicker.set(stutter(t, 3)); }
      for (const u of ups) u(t, cam);
      riders?.update?.(t, cam); drip.update?.(t, cam);
    },
    dispose: () => env.dispose(),
  };
};

// ---------------------------------------------------------------- THE CAMERAS (one per picture; glide, then rest)
/** the four pictures. Station frame: the lens on the platform (+z) looks back at the train (-z); the SIGN lens stands at
 *  the platform edge on the train side (z -0.08) and looks straight at the sign (what the conductor reads) */
export const NY_VIEWS: Record<"wide" | "medium" | "under" | "sign" | "payoff", [View, View]> = {
  // the station wide: the stopped train receding, the conductor small at his window, the board over the platform,
  // commuters at the door; a slow push along the platform
  wide: [{ pos: [-6.6, 1.8, 4.3], look: [0.6, 1.45, 0.2], fov: 50 }, { pos: [-5.9, 1.72, 3.85], look: [0.55, 1.5, 0.25], fov: 50 }],
  // the conductor + the board in one frame (he points UP at it, side-on to the lens), a short slide
  medium: [{ pos: [-3.3, 1.5, 0.95], look: [0.1, 1.85, 0.55], fov: 48 }, { pos: [-2.95, 1.52, 0.8], look: [0.1, 1.88, 0.55], fov: 48 }],
  // the two walk in under the board with the sign (edge-on to us), the board above them, the conductor beyond: a slide
  under: [{ pos: [-1.55, 1.5, 3.25], look: [-0.25, 1.55, 1.0], fov: 52 }, { pos: [-1.3, 1.5, 3.0], look: [-0.2, 1.57, 1.0], fov: 52 }],
  // THE SIGN: frontal, big (about 80 % of the frame width), their two grinning faces above it; a small push in
  sign: [{ pos: [0.02, 1.02, -0.08], look: [0.0, 0.88, 1.05], fov: 74 }, { pos: [0.02, 1.02, -0.08], look: [0.0, 0.88, 1.05], fov: 70 }],
  // the payoff: from the platform behind the two, the conductor in his window pointing at the sign (his face to us)
  payoff: [{ pos: [-3.35, 1.45, 0.95], look: [0.05, 1.5, 0.6], fov: 46 }, { pos: [-3.05, 1.47, 0.85], look: [0.05, 1.52, 0.6], fov: 46 }],
};
/** which picture a shot shows, from the time it starts (board line: the first shot is the wide, a later one the medium) */
const pictureOf = (from: number): keyof typeof NY_VIEWS => {
  const t = from / FPS + 0.05;
  if (t >= P0 - 0.05) return "payoff";
  if (t >= T_SIGNTXT - 0.3) return "sign";
  if (t >= S0 - 0.05) return "under";
  const firstBoard = SHOT_PLAN.filter((p) => p.set === "ny_station").length;   // (any count: the first board-line shot starts before "conductors")
  void firstBoard;
  return t < wordT(BOARD, "conductors", 0.8) - 0.15 ? "wide" : "medium";
};
const nyCam: ShotCam = (from, to) => { const [a, b] = NY_VIEWS[pictureOf(from)]; return glideRest(a, b, 20)(from, to); };
/** every shot of the v4 plan on this set gets the dispatcher (keyed by its id, both forms) */
export const CAMS: Record<string, ShotCam> = Object.fromEntries(SHOT_PLAN.filter((p) => p.set === "ny_station").flatMap((p) => [[p.id, nyCam], ["v4_" + p.id, nyCam]]));

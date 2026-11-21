// kit/vehicles (TRAIN owner): K-P1, a generic Tokyo 4-door commuter EMU (E231 / E233 / E235-like wide-body stainless
// car on 1,067 mm gauge) and the consist builder `trainJP(ctx, opts)`. Made-up emerald band (or any colour: the passing
// orange train), NO logos, no kana, blank destination displays. Per car: a stainless body in panels (each panel its own
// sheen, brushed maps, beads, spot-weld rows, hair-line seams), 4 double-leaf sliding doors per side (instanced leaves
// with TALL clear windows, finger grips, rubber edges, sliding into the wall pockets), two-pane side windows in black
// gaskets, the emerald waist band + a thin header band, the RED car-side pilot lamp in the fascia mid-car (lit while
// that car's doors on that side are open, out "car by car" after they meet) with two small unlit indicator lenses, a
// blank side destination panel, rain drips over the doors, ribbed aluminium step plates, a ribbed grey roof with the
// air-con unit (grilles, fans), hatches and a cable duct, a single-arm pantograph on chosen cars, bolsterless bogies
// (side frames, air springs, axle boxes with coil springs, yaw dampers, brake units, brake-dust grime) with turning
// wheels, under-floor equipment boxes with grilles and air tanks, gangway bellows + anti-fall plates between the cars.
// Cab cars (both ends): a flat face between rounded corner posts: a silver lower face with the band across, a black
// glass panel with three windscreen panes (the middle one in the emergency door) inside an emerald surround + brow,
// parked wipers, a blank destination window, head / tail light clusters, handrails + steps, anticlimber ribs, an
// obstacle deflector, the coupler with its electric head and air hoses, roof antennas. Near / far LOD per car (auto by
// camera distance), a simple lit interior in far cars, an optional hero interior (interior_jp.ts) and hero cab
// (cab_jp.ts) in car 1. Pure function of t: `run(t)` metres, `doors(t)` state.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";
import { D, FACE, DOORS_CAB, DOORS_MID, BOGIES_CAB, BOGIES_MID, windowsOf } from "./dims";
import { parts, rbox, box, cyl, ring, disc, quad, quadB, quadN, arcWall, tube, meshes, mergeParts, dirtKey, tint, gridHoles, rng, sstep, type Parts } from "./geo";
import { vmat, glass, lamp, smudgeMap, carEnv, underEnv, skyEnv, aimSkyEnv, PAL } from "./mats";
import { interiorJP, type InteriorJPOpts } from "./interior_jp";
import { cabJP, type CabJPOpts } from "./cab_jp";

export type DoorSide = "left" | "right";
export type TrainDoors = (t: number) => { side: DoorSide | "both" | "none"; open: number };
export type TrainJPOpts = {
  /** number of cars (default 10; car 1 and the last are cab cars) */
  cars?: number;
  /** the band colour (default the film's emerald; the second line uses PAL.orange) and its darker line */
  band?: THREE.ColorRepresentation; bandDark?: THREE.ColorRepresentation;
  /** 1-based car numbers with a raised pantograph (default [2, 4, 7, 9] of 10) */
  pantographs?: number[];
  /** metres the train has moved toward -Z (its heading) at film time t (default 0) */
  run?: (t: number) => number;
  /** the cab's crew window [z0, z1] (car-local z, default [0.55, 1.30]): a film may widen it into one big clear pane
   *  (the v4 film's side-on v20). Passed to the hero cab too (cabJP crewWindow) */
  crewWindow?: [number, number] | [number, number, number];   // [z0, z1, sill above the floor (default 0.98)]
  /** door state at t: which side and how open (0 closed .. 1 open) */
  doors?: TrainDoors;
  /** the car-side lamps go out `lampDelay` s (default 0.3, script v3) after the leaves meet, plus `doorDelay` s per
   *  car (default 0.03: a quick ripple down the train); the cab's pilot lamp lights 0.15 s after the LAST one */
  doorDelay?: number; lampDelay?: number;
  /** "auto" (default): near LOD within nearM of the lens (else far); or force one */
  lod?: "auto" | "near" | "far";
  nearM?: number;
  /** interiors seen through the windows: "auto" (simple everywhere, hero in `heroCars`), "simple", "none" */
  interior?: "auto" | "simple" | "none";
  /** 1-based cars that get the hero interior (interior_jp.ts) when interior is auto (default [1]) */
  heroCars?: number[];
  /** build the hero cab in car 1 (cab_jp.ts; default true when car 1 has the hero interior) */
  heroCab?: boolean;
  /** options for the hero cab (speedometer, pilot lamp, breath fog...) and the hero interior (sway, blinds...) */
  cab?: CabJPOpts;
  interiorOpts?: Partial<InteriorJPOpts>;
  /** headlights on at the front / tail lights at the rear (default true) */
  lights?: boolean;
  seed?: number;
};
/** a ready-made door cycle: starts to open at `openAt` (s), starts to close at `closeAt`; the leaves take `dur` s to
 *  open and `closeDur` s to close (default dur x 1.1; script v3: ONE door speed, closeDur 1.3); pure */
export const doorCycle = (o: { side: DoorSide; openAt: number; closeAt: number; dur?: number; closeDur?: number; startOpen?: boolean }): TrainDoors => {
  const dur = o.dur ?? 1.6;
  return (t) => {
    const k = o.startOpen ? 1 : sstep(o.openAt, o.openAt + dur, t);
    const c = sstep(o.closeAt, o.closeAt + (o.closeDur ?? dur * 1.1), t);
    return { side: o.side, open: Math.max(0, Math.min(1, k * (1 - c))) };
  };
};
/** a ready-made departure: standing until t0, then accelerating at `acc` m/s^2 up to `vmax` (pure) */
export const departRun = (t0: number, acc = 0.8, vmax = 22): ((t: number) => number) => (t) => {
  const u = Math.max(0, t - t0), tv = vmax / acc;
  return u < tv ? 0.5 * acc * u * u : 0.5 * acc * tv * tv + vmax * (u - tv);
};
/** an arrival: decelerating at `dec` to a stop at t1 (pure) */
export const arriveRun = (t1: number, dec = 0.9, v0 = 18): ((t: number) => number) => (t) => {
  const tb = v0 / dec, u = Math.min(t, t1) - (t1 - tb);
  const stopAt = 0.5 * v0 * tb;
  if (u <= 0) return stopAt + v0 * u - stopAt;      // before braking: constant speed (negative = still coming)
  return v0 * u - 0.5 * dec * u * u - stopAt;
};

// ---------------------------------------------------------------- materials of the exterior
// Colours are chosen FOR the golden rig: a sunlit diffuse grey turns yellow-orange there (warm sun x grade sat 1.9), so
// greys lean cool and dirt is dark and nearly neutral.
const exteriorMats = (ctx: KitCtx, band: THREE.ColorRepresentation, bandDark: THREE.ColorRepresentation) => {
  const env = carEnv(ctx, 1, 0), uenv = underEnv(ctx, 1), UE = { envMap: uenv, env: 1, giK: 0.5 }, SE = { envMap: skyEnv(ctx), env: 1 };
  return {
    // LOOK v2 (2026-11-20, look director): a GLOSSY PAINTED body (pearl white clear coat) instead of brushed stainless.
    // Stainless shows whatever it mirrors (blue at one angle, grey or cream in the sun at another): the colour jumped from
    // shot to shot. Paint keeps one colour identity (white upper body + the wide emerald lower body, dims.ts band) and its
    // clear coat still mirrors the sky at grazing angles. Was: { color: PAL.stainless, rough: 0.8, metal: 1, map: "brush",
    // tile: 0.7, normalScale: 0.07, ... } (0.45 in the first look test)
    steel: vmat("stainless", { color: "#f3f5f7", rough: 0.16, metal: 0, dirtColor: "#2d2b28", dirtRough: 0.78, tintK: 0.04, tintRough: 0.2, envMap: skyEnv(ctx), env: 1.3 }),
    sill: vmat("side-sill", { color: "#5b5e62", rough: 0.7, map: "peel", tile: 0.25, normalScale: 0.25, dirtColor: "#2b2724", dirtRough: 0.9, ...UE }),
    steelDull: vmat("stainless-dull", { color: "#aeb1b5", rough: 0.82, metal: 1, map: "brush", tile: 0.4, normalScale: 0.1, dirtColor: "#2d2b28", dirtRough: 0.78, ...SE }),
    face: vmat("face-paint", { color: PAL.facePaint, rough: 0.36, metal: 0.6, map: "peel", tile: 0.35, normalScale: 0.1, dirtColor: "#2d2b28", dirtRough: 0.7, ...SE }),
    band: vmat("band", { color: band, rough: 0.4, metal: 0.0, map: "peel", tile: 0.3, normalScale: 0.12, dirtColor: "#22241f", dirtRough: 0.7 }),
    bandDark: vmat("bandDark", { color: bandDark, rough: 0.42, metal: 0.0, map: "peel", tile: 0.3, normalScale: 0.12, dirtColor: "#22241f" }),
    rubber: vmat("rubber", { color: PAL.rubber, rough: 0.62, map: "peel", tile: 0.1, normalScale: 0.25, dirtColor: "#2a2927" }),
    black: vmat("blackGloss", { color: "#08090a", rough: 0.1, metal: 0, dirtColor: "#2a2927", dirtRough: 0.6 }),
    roof: vmat("roof", { color: PAL.roofGrey, rough: 0.72, map: "peel", tile: 0.2, normalScale: 0.35, dirtColor: "#3a3a3b", dirtRough: 0.92 }),
    ac: vmat("aircon", { color: "#a3a7ab", rough: 0.5, metal: 0.7, map: "brush", tile: 0.3, normalScale: 0.15, dirtColor: "#3a3a3b", ...SE }),
    bogie: vmat("bogie", { color: PAL.bogie, rough: 0.62, metal: 0.25, map: "peel", tile: 0.15, normalScale: 0.4, dirtColor: "#2b2521", dirtRough: 0.88, ...UE }),
    under: vmat("under", { color: PAL.under, rough: 0.66, metal: 0.15, map: "peel", tile: 0.2, normalScale: 0.4, dirtColor: "#2a2521", dirtRough: 0.9, ...UE }),
    roofKit: vmat("roof-kit", { color: "#3a3c3f", rough: 0.6, metal: 0.3, map: "peel", tile: 0.2, normalScale: 0.3, dirtColor: "#3a3a3b", dirtRough: 0.9 }),
    skirt: vmat("skirt", { color: "#84888c", rough: 0.5, metal: 0.25, map: "peel", tile: 0.25, normalScale: 0.2, dirtColor: "#2b2724", dirtRough: 0.85 }),
    alu: vmat("alu-step", { color: "#a6a9ab", rough: 0.42, metal: 1, map: "ribs", tile: 0.12, normalScale: 0.6, dirtColor: "#34322e", ...SE }),
    chrome: vmat("ext-chrome", { color: PAL.chrome, rough: 0.2, metal: 1, useDirt: false, ...SE }),
    wheel: vmat("wheel", { color: "#26272a", rough: 0.6, metal: 0.6, dirtColor: "#32261f", dirtRough: 0.9, ...UE }),
    tread: vmat("tread", { color: "#a9abad", rough: 0.3, metal: 1, useDirt: false, ...UE }),
    brake: vmat("brake-disc", { color: "#6d6f72", rough: 0.45, metal: 0.9, dirtColor: "#32261f", dirtRough: 0.9, ...UE }),
    dest: vmat("dest-blank", { color: "#050606", rough: 0.32, metal: 0, useDirt: false, ...SE }),
    lensA: vmat("lens-amber", { color: "#8a4a10", rough: 0.15, useDirt: false }),
    lensW: vmat("lens-white", { color: "#b9bcbf", rough: 0.15, useDirt: false }),
    // the inner faces of the door leaves + the simple far interior live in the car's own environment
    leafIn: vmat("leaf-inner", { color: "#b9bcbf", rough: 0.6, metal: 0.9, map: "brush", tile: 0.4, normalScale: 0.08, envMap: env, env: 1, dirtColor: "#3a3835" }),
    yellowIn: vmat("leaf-edge-strip", { color: PAL.ochre, rough: 0.6, envMap: env, env: 1, useDirt: false }),
    inside: vmat("far-inside", { color: "#d8d5cc", rough: 0.8, useDirt: false, envMap: env, env: 1 }),
    insideSeat: vmat("far-seat", { color: PAL.moquette, rough: 0.9, useDirt: false, envMap: env, env: 1 }),
    insideFloor: vmat("far-floor", { color: PAL.floor, rough: 0.6, useDirt: false, envMap: env, env: 1 }),
    insideLight: vmat("far-light", { color: "#ffffff", rough: 0.5, useDirt: false, emissive: "#fff4e4", emissiveIntensity: 1.6 }),
    glass: glass("side", { tint: 0x0b0f0e, opacity: 0.16 }),
    // the door glass: almost no reflection (its own soft sky at 0.35): the suitcase must read behind it from the platform
    glassDoor: glass("door", { tint: 0x08090a, opacity: 0.03, envMap: skyEnv(ctx), env: 0.15 }),   // clear: the yellow behind it must keep its chroma
    screen: glass("windscreen", { tint: 0x0a0d0c, opacity: 0.12, smudge: smudgeMap(41, { wiper: true, bugs: 14, dust: 0.3 }) }),
  };
};

// ---------------------------------------------------------------- side wall (one side, s = +1 right / -1 left)
const sideQuad = (P: Parts, k: string, x: number, s: number, u0: number, y0: number, u1: number, y1: number) => {
  if (s > 0) return quad(P, k, [x, y0, u1], [x, y0, u0], [x, y1, u0], [x, y1, u1]);
  return quad(P, k, [x, y0, u0], [x, y0, u1], [x, y1, u1], [x, y1, u0]);
};
type Hole = { u0: number; u1: number; y0: number; y1: number; kind: "door" | "win" | "crew" | "crewDoor" };
/** the roof + eave profile (x, y above rail) from the right side wall top over the crown to the left */
const roofProfile = (): [number, number][] => {
  const prof: [number, number][] = [];
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); prof.push([D.eaveHW + (D.hw - D.eaveHW) * Math.cos(a), D.sideY1 + (D.eaveY - D.sideY1) * Math.sin(a)]); }
  for (let i = 1; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2); prof.push([D.eaveHW * Math.cos(a), D.eaveY + (D.roofY - D.eaveY) * Math.sin(a)]); }
  return [...prof, ...[...prof].reverse().slice(1).map(([x, y]) => [-x, y] as [number, number])];
};
/** sweep a profile along z (faces look outward / upward); `f(p)` maps a profile point at each end (shrunk brows) */
const sweep = (P: Parts, prof: [number, number][], za: number, zb: number, key: (ya: number, yb: number) => string,
  fa: (p: [number, number]) => [number, number] = (p) => p, fb: (p: [number, number]) => [number, number] = (p) => p) => {
  for (let i = 0; i < prof.length - 1; i++) {
    const [xa0, ya0] = prof[i], [xb0, yb0] = prof[i + 1];
    const [xa, ya] = fb(prof[i]), [xb, yb] = fb(prof[i + 1]), [xc, yc] = fa(prof[i]), [xd, yd] = fa(prof[i + 1]);
    quad(P, key(ya0, yb0), [xa, ya, zb], [xc, yc, za], [xd, yd, za], [xb, yb, zb]);
  }
};

const bodyParts = (cab: boolean, near: boolean, seed: number, crew: [number, number] | [number, number, number] = [0.55, 1.3]) => {
  const P = parts(), R = rng(seed), rivets: V3[] = [];
  const z0 = cab ? FACE.zB : D.body0, z1 = D.body1, F = D.floor, HW = D.hw;
  const doors = cab ? DOORS_CAB : DOORS_MID, wins = windowsOf(doors, (cab ? 0.2 : D.body0) + 0.3, z1 - 0.3, cab);
  const dzMid = (doors[1] + doors[2]) / 2;
  const holes: Hole[] = [];
  for (const dz of doors) holes.push({ u0: dz - D.doorW / 2, u1: dz + D.doorW / 2, y0: F, y1: F + D.doorH, kind: "door" });
  for (const [a, b] of wins) holes.push({ u0: a, u1: b, y0: F + D.winY0, y1: F + D.winY1, kind: "win" });
  if (cab) { holes.push({ u0: crew[0], u1: crew[1], y0: F + (crew[2] ?? 0.98), y1: F + 1.86, kind: "crew" }); holes.push({ u0: 1.42, u1: 2.02, y0: F + 0.02, y1: F + 1.86, kind: "crewDoor" }); }
  /** a rounded box standing on the skin of side s: from `a` to `b` metres outward of the skin (negative = inward) */
  const sb = (k: string, s: number, a: number, b: number, y0: number, y1: number, u0: number, u1: number, r = 0.004) =>
    rbox(P, k, s > 0 ? HW + a : -HW - b, y0, u0, s > 0 ? HW + b : -HW - a, y1, u1, r);
  for (const s of [1, -1]) {
    const x = s * HW;
    // the skin in panels: wainscot / window band / fascia, every panel with its own slight sheen (stainless cars do)
    gridHoles(z0, z1, D.sideY0, D.sideY1, holes, (u0, y0, u1, y1) => {
      const cy = (y0 + y1) / 2, row = cy < F + D.winY0 ? -0.35 : cy < F + D.doorH ? 0.25 : -0.1;
      tint(sideQuad(P, "steel", x, s, u0, y0, u1, y1), row + (R() - 0.5) * 0.9);
    });
    // the tapered skirt below the floor line
    const xs = s * D.sillHW;
    quadN(P, "sill", [x, D.sideY0, z1], [x, D.sideY0, z0], [xs, D.sillY, z0], [xs, D.sillY, z1], [s, -0.3, 0]);
    for (const h of holes) {
      const xi = s * (HW - D.wall), xo = s * (HW - 0.001);
      const xa = Math.min(xi, xo), xb = Math.max(xi, xo);
      // reveals (jambs) in the wall thickness
      box(P, "steelDull", xa, h.y1, h.u0, xb, h.y1 + 0.012, h.u1);
      if (h.kind !== "door" && h.kind !== "crewDoor") box(P, "steelDull", xa, h.y0 - 0.012, h.u0, xb, h.y0, h.u1);
      box(P, "steelDull", xa, h.y0, h.u0 - 0.012, xb, h.y1, h.u0); box(P, "steelDull", xa, h.y0, h.u1, xb, h.y1, h.u1 + 0.012);
      if (h.kind === "win" || h.kind === "crew") {
        // the glass 16 mm back in a black gasket (3 cm, 4 mm proud), a black mullion for two-pane windows
        const xg = s * (HW - 0.016), L = h.u1 - h.u0, panes = L > 1.6 ? 2 : 1, gw = 0.03;
        for (let p = 0; p < panes; p++) {
          const a = h.u0 + (p * L) / panes + (p ? 0.035 : 0), b = h.u0 + ((p + 1) * L) / panes - (p < panes - 1 ? 0.035 : 0);
          sideQuad(P, "glass", xg, s, a, h.y0, b, h.y1);
          sb("rubber", s, -0.02, 0.004, h.y0, h.y0 + gw, a, b, 0.006); sb("rubber", s, -0.02, 0.004, h.y1 - gw, h.y1, a, b, 0.006);
          sb("rubber", s, -0.02, 0.004, h.y0, h.y1, a, a + gw, 0.006); sb("rubber", s, -0.02, 0.004, h.y0, h.y1, b - gw, b, 0.006);
        }
        if (panes === 2) { const m = (h.u0 + h.u1) / 2; sb("rubber", s, -0.05, 0.003, h.y0, h.y1, m - 0.04, m + 0.04, 0.008); }
      } else if (h.kind === "door") {
        // the door frame lip (proud 6 mm), a rain drip above, the ribbed aluminium step plate + its nosing
        sb("steelDull", s, -0.002, 0.006, h.y0, h.y1 + 0.03, h.u0 - 0.035, h.u0, 0.003);
        sb("steelDull", s, -0.002, 0.006, h.y0, h.y1 + 0.03, h.u1, h.u1 + 0.035, 0.003);
        sb("steelDull", s, -0.002, 0.006, h.y1, h.y1 + 0.03, h.u0 - 0.035, h.u1 + 0.035, 0.003);
        sb("steelDull", s, 0, 0.03, h.y1 + 0.07, h.y1 + 0.085, h.u0 - 0.12, h.u1 + 0.12, 0.005);
        rbox(P, "alu", s > 0 ? HW - 0.16 : -HW - 0.022, F - 0.03, h.u0, s > 0 ? HW + 0.022 : -HW + 0.16, F + 0.004, h.u1, 0.004);
        sb("steelDull", s, 0.0, 0.026, F - 0.075, F - 0.03, h.u0 - 0.02, h.u1 + 0.02, 0.006);
      } else {
        // the crew door: a recessed panel with a window, a grab handle each side, a step below
        const xp = s * (HW - 0.025);
        gridHoles(h.u0, h.u1, h.y0, h.y1, [{ u0: h.u0 + 0.12, u1: h.u1 - 0.12, y0: h.y0 + 1.0, y1: h.y1 - 0.1 }], (a, b, c, d) => tint(sideQuad(P, "steel", xp, s, a, b, c, d), 0.5));
        sideQuad(P, "glassDoor", s * (HW - 0.03), s, h.u0 + 0.12, h.y0 + 1.0, h.u1 - 0.12, h.y1 - 0.1);
        for (const [a, b] of [[h.u0 + 0.09, h.u0 + 0.12], [h.u1 - 0.12, h.u1 - 0.09]]) sb("rubber", s, -0.03, -0.022, h.y0 + 0.97, h.y1 - 0.07, a, b, 0.004);
        sb("rubber", s, -0.03, -0.022, h.y0 + 0.97, h.y0 + 1.0, h.u0 + 0.09, h.u1 - 0.09, 0.004); sb("rubber", s, -0.03, -0.022, h.y1 - 0.1, h.y1 - 0.07, h.u0 + 0.09, h.u1 - 0.09, 0.004);
        for (const u of [h.u0 - 0.07, h.u1 + 0.07]) { cyl(P, "chrome", [s * (HW + 0.035), h.y0 + 0.7, u], [s * (HW + 0.035), h.y0 + 1.6, u], 0.011, 10); for (const yy of [h.y0 + 0.72, h.y0 + 1.58]) cyl(P, "chrome", [s * HW, yy, u], [s * (HW + 0.035), yy, u], 0.008, 8); }
        sb("rubber", s, -0.03, 0.004, h.y0, h.y1, h.u0, h.u0 + 0.02, 0.005);
        sb("rubber", s, -0.028, -0.02, h.y0 + 0.9, h.y0 + 1.0, h.u1 - 0.07, h.u1 - 0.04, 0.004);          // the recessed handle
        sb("alu", s, -0.02, 0.05, D.sillY - 0.05, D.sillY - 0.02, h.u0 + 0.05, h.u1 - 0.05, 0.006);      // the step
      }
    }
    // the waist band (proud 1.5 mm) + the thin darker line, broken at the door openings; the header band runs through
    const runs: [number, number][] = []; let a = z0;
    for (const h of holes.filter((q) => q.kind === "door" || q.kind === "crewDoor").sort((p, q) => p.u0 - q.u0)) { runs.push([a, h.u0 - 0.04]); a = h.u1 + 0.04; }
    runs.push([a, z1]);
    const bx0 = s > 0 ? HW : -HW - 0.0015, bx1 = s > 0 ? HW + 0.0015 : -HW;
    for (const [p, q] of runs) if (q - p > 0.05) {
      box(P, "band", bx0, F + D.bandY0, p, bx1, F + D.bandY1, q);
      box(P, "bandDark", bx0, F + D.lineY0, p, bx1, F + D.lineY1, q);
    }
    box(P, "band", bx0, F + D.headY0, z0, bx1, F + D.headY1, z1);
    // beads: one over the skirt line, one under the eave, one under the window sills
    for (const by of [D.sideY0 + 0.05, D.sideY1 - 0.012]) cyl(P, "steelDull", [s * (HW + 0.002), by, z0 + 0.02], [s * (HW + 0.002), by, z1 - 0.02], 0.0045, 6);
    for (const [p, q] of runs) if (q - p > 0.3) cyl(P, "steelDull", [s * (HW + 0.0015), F + D.winY0 - 0.014, p + 0.04], [s * (HW + 0.0015), F + D.winY0 - 0.014, q - 0.04], 0.003, 5);
    // the blank side destination panel in the fascia mid-car; beside it the car-side lamp's bezel + two unlit lenses
    sb("black", s, -0.002, 0.012, F + 1.9, F + 2.04, dzMid - 0.5, dzMid + 0.5, 0.008);
    sb("dest", s, 0.012, 0.0135, F + 1.918, F + 2.022, dzMid - 0.47, dzMid + 0.47, 0.002);
    const lz = dzMid + D.lampDZ;
    ring(P, "chrome", [s * (HW + 0.006), F + D.lampY, lz], [s, 0, 0], 0.044, 0.007, 24, 8);
    for (const [k, dz] of [["lensA", 0.13], ["lensW", 0.23]] as const) { disc(P, k, [s * (HW + 0.006), F + D.lampY, lz + dz], [s, 0, 0], 0.022, 0.012, 16); ring(P, "steelDull", [s * (HW + 0.004), F + D.lampY, lz + dz], [s, 0, 0], 0.025, 0.004, 16, 6); }
    // spot-weld rows (near LOD): vertical rows beside each door and window pier, rows under the eave and over the skirt
    if (near) {
      const dots: V3[] = [];
      for (const h of holes) for (const u of [h.u0 - 0.06, h.u1 + 0.06]) for (let y = D.sideY0 + 0.12; y < D.sideY1 - 0.08; y += 0.05) dots.push([s * (HW + 0.0005), y, u]);
      for (let u = z0 + 0.1; u < z1 - 0.1; u += 0.05) { dots.push([s * (HW + 0.0005), D.sideY1 - 0.16, u]); dots.push([s * (HW + 0.0005), D.sideY0 + 0.1, u]); }
      for (const d of dots) if (!holes.some((h) => d[2] > h.u0 - 0.04 && d[2] < h.u1 + 0.04 && d[1] > h.y0 - 0.02 && d[1] < h.y1 + 0.02)) rivets.push(d);
      // vertical panel seams (a hair-line gap) beside every door
      for (const h of holes) { if (h.kind !== "door") continue; for (const u of [h.u0 - 0.3, h.u1 + 0.3]) box(P, "rubber", s * (HW + 0.0004) - 0.0004, D.sideY0 + 0.02, u, s * (HW + 0.0008), D.sideY1 - 0.02, u + 0.0025); }
    }
  }
  // ---- eave + roof (a profile swept along z); cab cars: a short shrunk brow up to the face plane + its cap
  const full = roofProfile(), zr0 = cab ? FACE.zF + 0.04 : z0;
  const rkey = (ya: number, yb: number) => (ya > D.eaveY - 0.02 && yb > D.eaveY - 0.02 ? "roof" : "steel");
  sweep(P, full, zr0, z1, rkey);
  if (cab) {
    const brow = ([x, y]: [number, number]): [number, number] => [x * 0.985, D.sideY1 + (y - D.sideY1) * 0.94];
    sweep(P, full, FACE.zF, zr0, () => "band", brow);
    for (let i = 0; i < full.length - 1; i++) { const a = brow(full[i]), b = brow(full[i + 1]); quadN(P, "band", [a[0], a[1], FACE.zF], [0, D.sideY1, FACE.zF], [b[0], b[1], FACE.zF], [b[0], b[1], FACE.zF], [0, 0, -1]); }
    // the eave side strips over the corner posts are band-coloured too (the surround runs up into the brow)
    for (const s of [1, -1]) quadN(P, "band", [s * (HW - FACE.rc), D.sideY1, FACE.zF], [s * HW, D.sideY1, FACE.zF], [s * HW, D.sideY1, FACE.zB], [s * (HW - FACE.rc), D.sideY1, FACE.zB], [0, -1, 0]);
  }
  for (const s of [1, -1]) cyl(P, "steelDull", [s * (D.eaveHW + 0.02), D.eaveY - 0.01, zr0], [s * (D.eaveHW + 0.02), D.eaveY - 0.01, z1], 0.012, 8);   // rain gutter
  // roof ribs every 1.15 m (following the crown), near LOD
  if (near) {
    const crown = full.filter(([, y]) => y > D.eaveY + 0.01), up = (g: number) => ([x, y]: [number, number]): [number, number] => [x, y + g];
    for (let z = z0 + 0.9; z < z1 - 0.5; z += 1.15) { if (z > 7.9 && z < 12.1) continue; sweep(P, crown, z, z + 0.035, () => "roof", up(0.012), up(0.012)); }
  }
  // underside plate
  quadB(P, "under", [D.sillHW, D.sillY, z1], [D.sillHW, D.sillY, z0], [-D.sillHW, D.sillY, z0], [-D.sillHW, D.sillY, z1]);
  // ---- roof air-con unit (grille slats + two fans)
  const ac0 = 8.15, ac1 = 11.85;
  rbox(P, "ac", -0.86, D.roofY - 0.04, ac0, 0.86, D.roofY + 0.3, ac1, 0.04, 3);
  rbox(P, "ac", -0.9, D.roofY - 0.06, ac0 - 0.04, 0.9, D.roofY + 0.02, ac1 + 0.04, 0.015);
  for (let z = ac0 + 0.12; z < ac1 - 0.1; z += near ? 0.07 : 0.21) for (const s of [1, -1]) rbox(P, "roofKit", s > 0 ? 0.862 : -0.872, D.roofY + 0.04, z, s > 0 ? 0.872 : -0.862, D.roofY + 0.24, z + (near ? 0.035 : 0.1), 0.004, 1);
  for (const zc of [ac0 + 0.75, ac1 - 0.75]) {
    disc(P, "roofKit", [0, D.roofY + 0.302, zc], [0, 1, 0], 0.32, 0.01, 28); ring(P, "ac", [0, D.roofY + 0.31, zc], [0, 1, 0], 0.32, 0.018, 32, 6);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI, c = Math.cos(a) * 0.3, sn = Math.sin(a) * 0.3; cyl(P, "ac", [-c, D.roofY + 0.312, zc - sn], [c, D.roofY + 0.312, zc + sn], 0.006, 6); }
    disc(P, "ac", [0, D.roofY + 0.314, zc], [0, 1, 0], 0.06, 0.012, 16);
  }
  // roof equipment hatches + a cable duct with clamps
  for (const zc of [3.2, 16.8]) { rbox(P, "roof", -0.45, D.roofY - 0.03, zc - 0.5, 0.45, D.roofY + 0.05, zc + 0.5, 0.02); for (const sx of [-0.38, 0.38]) for (const sz of [-0.43, 0.43]) cyl(P, "steelDull", [sx, D.roofY + 0.05, zc + sz], [sx, D.roofY + 0.056, zc + sz], 0.012, 8); }
  cyl(P, "roofKit", [0.55, D.roofY + 0.0, z0 + 1], [0.55, D.roofY + 0.0, z1 - 1], 0.022, 6);
  if (near) for (let z = z0 + 1.2; z < z1 - 1; z += 1.5) rbox(P, "steelDull", 0.52, D.roofY - 0.03, z, 0.58, D.roofY + 0.026, z + 0.03, 0.004, 1);
  if (cab) {
    // roof antennas over the cab: a blade + a short whip on a dome
    rbox(P, "roof", 0.26, D.roofY - 0.02, 1.0, 0.36, D.roofY + 0.03, 1.22, 0.012); rbox(P, "roofKit", 0.3, D.roofY + 0.02, 1.04, 0.32, D.roofY + 0.27, 1.18, 0.008);
    disc(P, "roof", [-0.42, D.roofY - 0.005, 1.4], [0, 1, 0], 0.07, 0.05, 16); cyl(P, "roofKit", [-0.42, D.roofY, 1.4], [-0.42, D.roofY + 0.42, 1.4], 0.006, 6);
  }
  // ---- ends: end walls with the gangway opening + bellows frames (mid cars both ends, cab cars the rear)
  const endWall = (z: number, dir: number) => {
    const g = 0.45, top = F + 1.95;
    gridHoles(-HW, HW, D.sillY, D.eaveY, [{ u0: -g, u1: g, y0: F, y1: top }], (u0, y0, u1, y1) => {
      const cx = Math.min(Math.abs(u0), Math.abs(u1)); if (y0 >= D.sideY1 && cx > D.eaveHW - 0.05) return;
      tint(quadN(P, "steel", [u0, y0, z], [u1, y0, z], [u1, y1, z], [u0, y1, z], [0, 0, dir]), -0.4);
    });
    rbox(P, "rubber", -g - 0.06, F - 0.02, z - 0.04 * dir - 0.02, g + 0.06, top + 0.06, z + 0.02 - 0.04 * dir, 0.02);
    // the end roof cap
    for (let i = 0; i < full.length - 1; i++) { const [xa, ya] = full[i], [xb, yb] = full[i + 1]; if (ya < D.sideY1 + 0.001 && yb < D.sideY1 + 0.001) continue; quadB(P, "roof", [xa, ya, z], [0, D.sideY1, z], [xb, yb, z], [xb, yb, z]); }
    // anti-fall plates: tall rubber fins at the end corners (they almost close the gap between two cars)
    for (const s of [1, -1]) rbox(P, "rubber", s * (HW - 0.045) - 0.012, F + 0.15, Math.min(z, z + dir * 0.21), s * (HW - 0.045) + 0.012, F + 1.95, Math.max(z, z + dir * 0.21), 0.01);
    // end-wall details: a ladder rung column + a jumper box (near LOD)
    if (near) { for (let y = F + 0.3; y < F + 1.9; y += 0.32) cyl(P, "steelDull", [0.72, y, z + dir * 0.05], [1.0, y, z + dir * 0.05], 0.009, 6); rbox(P, "under", -1.15, F + 0.2, Math.min(z, z + dir * 0.1), -0.75, F + 0.6, Math.max(z, z + dir * 0.1), 0.015); }
  };
  if (!cab) endWall(z0, -1);
  endWall(z1, 1);
  // ---- under-floor equipment between the bogies (seeded boxes with grilles / lids, air tanks, a cable duct)
  const bog = cab ? BOGIES_CAB : BOGIES_MID;
  for (let z = bog[0] + 1.9; z < bog[1] - 2.0;) {
    const L = 0.6 + R() * 1.6, s = R() < 0.5 ? 1 : -1, w = 0.5 + R() * 0.55, h = 0.3 + R() * 0.32;
    if (R() < 0.22) {
      cyl(P, "under", [s * 0.75, D.sillY - 0.22, z], [s * 0.75, D.sillY - 0.22, z + L], 0.2, 16);
      for (const zz of [z + 0.12, z + L - 0.12]) rbox(P, "bogie", s * 0.75 - 0.22, D.sillY - 0.3, zz - 0.02, s * 0.75 + 0.22, D.sillY, zz + 0.02, 0.006, 1);
    } else {
      rbox(P, "under", s > 0 ? 1.3 - w : -1.3, D.sillY - h, z, s > 0 ? 1.3 : -1.3 + w, D.sillY, z + L, 0.02);
      if (near) {
        // the lid frame, latches, and grille slats on every other box
        rbox(P, "bogie", s > 0 ? 1.3 : -1.31, D.sillY - h + 0.03, z + 0.03, s > 0 ? 1.31 : -1.3, D.sillY - 0.03, z + L - 0.03, 0.004, 1);
        if (R() < 0.55) for (let y = D.sillY - h + 0.07; y < D.sillY - 0.07; y += 0.035) rbox(P, "under", s > 0 ? 1.308 : -1.316, y, z + 0.08, s > 0 ? 1.316 : -1.308, y + 0.014, z + L - 0.08, 0.002, 1);
        else for (const zz of [z + 0.12, z + L - 0.12]) rbox(P, "steelDull", s > 0 ? 1.31 : -1.322, D.sillY - h * 0.55, zz - 0.02, s > 0 ? 1.322 : -1.31, D.sillY - h * 0.55 + 0.05, zz + 0.02, 0.004, 1);
      }
    }
    if (R() < 0.5) rbox(P, "under", s > 0 ? -1.25 : 1.25 - 0.6, D.sillY - 0.25, z, s > 0 ? -0.65 : 1.25, D.sillY, z + L * 0.7, 0.02);
    z += L + 0.15 + R() * 0.4;
  }
  for (const s of [1, -1]) cyl(P, "under", [s * 1.22, D.sillY - 0.05, bog[0] + 1.7], [s * 1.22, D.sillY - 0.05, bog[1] - 1.7], 0.03, 6);
  // ---- bogies (side frames, air springs, axle boxes + coil springs, yaw dampers, brake units); wheels are instanced
  for (const bc of bog) {
    for (const s of [1, -1]) {
      rbox(P, "bogie", s * 1.02 - 0.09, 0.42, bc - 1.55, s * 1.02 + 0.09, 0.66, bc + 1.55, 0.03);
      for (const a of [-1, 1]) {
        const az = bc + (a * D.wheelbase) / 2;
        rbox(P, "bogie", s * 1.02 - 0.13, 0.3, az - 0.16, s * 1.02 + 0.13, 0.56, az + 0.16, 0.02);
        cyl(P, "under", [s * 1.02, 0.56, az], [s * 1.02, 0.7, az], 0.085, 12);                               // the coil spring over the axle box
        for (let i = 0; i < 4; i++) ring(P, "bogie", [s * 1.02, 0.58 + i * 0.033, az], [0, 1, 0], 0.085, 0.012, 14, 5);
        rbox(P, "under", s * 0.78 - 0.08, 0.36, bc + a * 0.62 - 0.12, s * 0.78 + 0.08, 0.58, bc + a * 0.62 + 0.12, 0.02);   // brake unit
      }
      cyl(P, "rubber", [s * 1.0, 0.66, bc], [s * 1.0, 0.86, bc], 0.25, 20);                                    // the air spring
      for (const yy of [0.7, 0.76, 0.82]) ring(P, "rubber", [s * 1.0, yy, bc], [0, 1, 0], 0.25, 0.018, 20, 5);
      rbox(P, "bogie", s * 1.0 - 0.22, 0.86, bc - 0.22, s * 1.0 + 0.22, D.sillY, bc + 0.22, 0.02);
      cyl(P, "steelDull", [s * 1.14, 0.74, bc - 0.75], [s * 1.14, 0.78, bc + 0.2], 0.03, 10);                  // the yaw damper
      cyl(P, "under", [s * 1.14, 0.74, bc - 0.9], [s * 1.14, 0.745, bc - 0.4], 0.042, 10);
    }
    rbox(P, "bogie", -1.0, 0.46, bc - 0.18, 1.0, 0.64, bc + 0.18, 0.03);
    for (const a of [-1, 1]) cyl(P, "bogie", [-0.38, 0.43, bc + a * 0.55], [0.38, 0.43, bc + a * 0.55], 0.2, 16);   // traction motors
  }
  // ---- dirt: brake dust + road grime: strongest on the bogies, the skirt and the lower body near the bogies
  const nearBogie = (z: number) => Math.max(0, ...bog.map((b) => 1 - Math.abs(z - b) / 3.2));
  for (const k of ["steel", "steelDull", "band", "bandDark", "alu"]) dirtKey(P, k, (_x, y, z) => sstep(1.6, 0.95, y) * (0.05 + 0.3 * nearBogie(z)) + sstep(1.14, 0.95, y) * 0.16);
  dirtKey(P, "roof", (x, _y, z) => 0.2 + 0.25 * sstep(0.9, 1.4, Math.abs(x)) + 0.12 * Math.sin(z * 1.3) * Math.sin(z * 0.37));
  for (const k of ["bogie", "under"]) dirtKey(P, k, (_x, y) => 0.35 + 0.4 * sstep(0.9, 0.3, y));
  dirtKey(P, "sill", (_x, _y, z) => 0.3 + 0.45 * nearBogie(z));
  dirtKey(P, "roofKit", () => 0.25);
  dirtKey(P, "rubber", (_x, y) => sstep(1.6, 1.0, y) * 0.4);
  return { P, doors, holes, z0, z1, bog, rivets, full, dzMid };
};

// ---------------------------------------------------------------- the cab car's face (see dims.ts FACE)
const faceParts = (P: Parts, near: boolean) => {
  const F = D.floor, HW = D.hw, zF = FACE.zF, rc = FACE.rc, waist = F + FACE.waist, top = D.sideY1, fw = HW - rc;
  const N: V3 = [0, 0, -1];
  // ---- corner posts: quarter shells from the side wall round to the face; silver below the waist, band colour above
  for (const s of [1, -1]) {
    const cx = s * fw, cz = zF + rc, a0 = s > 0 ? 0 : Math.PI, a1 = s > 0 ? -Math.PI / 2 : Math.PI * 1.5;
    arcWall(P, "face", cx, cz, rc, a0, a1, D.sideY0, waist, 8);
    arcWall(P, "sill", s * (D.sillHW - rc), cz, rc, a0, a1, D.sillY, D.sideY0, 8);
    arcWall(P, "band", cx, cz, rc, a0, a1, waist, top, 8);
    arcWall(P, "band", cx, cz, rc + 0.0015, a0, a1, F + D.bandY0, F + D.bandY1, 8);
    arcWall(P, "bandDark", cx, cz, rc + 0.0015, a0, a1, F + D.lineY0, F + D.lineY1, 8);
  }
  // ---- the lower face (silver paint) with the band across
  quadN(P, "face", [-fw, D.sideY0, zF], [fw, D.sideY0, zF], [fw, waist, zF], [-fw, waist, zF], N);
  { const fs = D.sillHW - rc; quadN(P, "sill", [-fs, D.sillY, zF], [fs, D.sillY, zF], [fw, D.sideY0, zF], [-fw, D.sideY0, zF], N); }
  quadN(P, "band", [-fw, F + D.bandY0, zF - 0.0015], [fw, F + D.bandY0, zF - 0.0015], [fw, F + D.bandY1, zF - 0.0015], [-fw, F + D.bandY1, zF - 0.0015], N);
  quadN(P, "bandDark", [-fw, F + D.lineY0, zF - 0.0015], [fw, F + D.lineY0, zF - 0.0015], [fw, F + D.lineY1, zF - 0.0015], [-fw, F + D.lineY1, zF - 0.0015], N);
  // the sill strip under the black panel (band colour: the surround's bottom edge)
  rbox(P, "band", -fw, waist - 0.012, zF - 0.012, fw, waist + 0.03, zF + 0.01, 0.006);
  // ---- the black glass panel with the three panes + the blank destination window (3 mm proud of the face plane)
  const zp = zF - 0.003, y0 = waist + 0.03, y1 = F + FACE.panelTop, wy0 = F + FACE.wy0, wy1 = F + FACE.wy1, Dd = FACE.dest;
  const holes = [...FACE.panes.map(([a, b]) => ({ u0: a, u1: b, y0: wy0, y1: wy1 })), { u0: Dd.x0, u1: Dd.x1, y0: F + Dd.y0, y1: F + Dd.y1 }];
  gridHoles(-fw, fw, y0, y1, holes, (u0, a, u1, b) => quadN(P, "black", [u0, a, zp], [u1, a, zp], [u1, b, zp], [u0, b, zp], N));
  for (const [a, b] of FACE.panes) {
    quadN(P, "screen", [a, wy0, zF + 0.004], [b, wy0, zF + 0.004], [b, wy1, zF + 0.004], [a, wy1, zF + 0.004], N);
    // gaskets (2 cm, 5 mm proud)
    rbox(P, "rubber", a - 0.02, wy0 - 0.02, zF - 0.008, b + 0.02, wy0 + 0.004, zF + 0.012, 0.005); rbox(P, "rubber", a - 0.02, wy1 - 0.004, zF - 0.008, b + 0.02, wy1 + 0.02, zF + 0.012, 0.005);
    rbox(P, "rubber", a - 0.02, wy0, zF - 0.008, a + 0.004, wy1, zF + 0.012, 0.005); rbox(P, "rubber", b - 0.004, wy0, zF - 0.008, b + 0.02, wy1, zF + 0.012, 0.005);
  }
  quadN(P, "dest", [Dd.x0, F + Dd.y0, zF - 0.0015], [Dd.x1, F + Dd.y0, zF - 0.0015], [Dd.x1, F + Dd.y1, zF - 0.0015], [Dd.x0, F + Dd.y1, zF - 0.0015], N);
  rbox(P, "rubber", Dd.x0 - 0.012, F + Dd.y0 - 0.012, zF - 0.006, Dd.x1 + 0.012, F + Dd.y0, zF + 0.008, 0.004); rbox(P, "rubber", Dd.x0 - 0.012, F + Dd.y1, zF - 0.006, Dd.x1 + 0.012, F + Dd.y1 + 0.012, zF + 0.008, 0.004);
  // ---- the emergency door in the middle: seams, hinges, a handle, a kick step
  for (const x of [FACE.door.x0, FACE.door.x1]) box(P, "rubber", x - 0.003, F + 0.06, zF - 0.0045, x + 0.003, y1 - 0.02, zF - 0.0005);
  box(P, "rubber", FACE.door.x0, F + 0.06, zF - 0.0045, FACE.door.x1, F + 0.066, zF - 0.0005);
  for (const y of [F + 0.3, F + 1.2, F + 2.05]) rbox(P, "steelDull", FACE.door.x1 - 0.004, y, zF - 0.014, FACE.door.x1 + 0.03, y + 0.09, zF, 0.004);
  rbox(P, "steelDull", FACE.door.x0 + 0.04, F + 0.76, zF - 0.02, FACE.door.x0 + 0.07, F + 0.9, zF, 0.006); rbox(P, "rubber", FACE.door.x0 + 0.03, F + 0.74, zF - 0.004, FACE.door.x0 + 0.08, F + 0.92, zF - 0.001, 0.004);
  rbox(P, "alu", -0.34, F + 0.0, zF - 0.09, 0.34, F + 0.03, zF + 0.0, 0.006);
  // ---- parked wipers on the driver's and the right pane: pivot, arm, blade
  for (const [a, b] of [FACE.panes[0], FACE.panes[2]]) {
    const px = b - 0.1, x0 = a + 0.1;
    cyl(P, "rubber", [px, wy0 - 0.05, zF - 0.004], [px, wy0 - 0.05, zF - 0.03], 0.016, 10);
    cyl(P, "rubber", [px, wy0 - 0.05, zF - 0.024], [(px + x0) / 2, wy0 + 0.045, zF - 0.02], 0.005, 6);
    rbox(P, "rubber", x0, wy0 + 0.035, zF - 0.022, px - 0.03, wy0 + 0.052, zF - 0.004, 0.004);
  }
  // ---- light clusters (black housings; the lit lenses are separate meshes), chrome rims
  for (const s of [1, -1]) {
    rbox(P, "black", s > 0 ? 0.76 : -1.22, F + 0.29, zF - 0.014, s > 0 ? 1.22 : -0.76, F + 0.53, zF + 0.02, 0.03, 3);
    ring(P, "chrome", [s * 1.07, F + 0.41, zF - 0.016], [0, 0, -1], 0.08, 0.008, 28, 8); ring(P, "chrome", [s * 0.88, F + 0.41, zF - 0.016], [0, 0, -1], 0.054, 0.006, 24, 8);
  }
  // ---- handrails + toe steps for the shunter, anticlimber ribs
  for (const s of [1, -1]) {
    cyl(P, "chrome", [s * 0.6, F + 0.12, zF - 0.045], [s * 0.6, F + 0.56, zF - 0.045], 0.011, 10);
    for (const y of [F + 0.14, F + 0.54]) cyl(P, "chrome", [s * 0.6, y, zF], [s * 0.6, y, zF - 0.045], 0.008, 8);
    rbox(P, "alu", s * 0.6 - 0.11, D.sillY - 0.01, zF - 0.1, s * 0.6 + 0.11, D.sillY + 0.015, zF, 0.006);
  }
  for (const y of [D.sillY - 0.012, D.sillY + 0.03, D.sillY + 0.072]) rbox(P, "under", -0.95, y, zF - 0.045, 0.95, y + 0.02, zF + 0.01, 0.006, 1);
  // ---- the obstacle deflector (grey skirt): two front plates leaning forward + side returns; the coupler between
  for (const s of [1, -1]) {
    const xi = s * 0.27, xo = s * 1.27;
    quadB(P, "skirt", [xi, D.sillY - 0.03, zF - 0.01], [xo, D.sillY - 0.03, zF - 0.01], [xo, 0.3, zF - 0.16], [xi, 0.3, zF - 0.16]);
    quadB(P, "skirt", [xo, D.sillY - 0.03, zF - 0.01], [s * 1.38, D.sillY - 0.03, zF + 0.3], [s * 1.38, 0.3, zF + 0.3], [xo, 0.3, zF - 0.16]);
    quadB(P, "skirt", [s * 1.38, D.sillY - 0.03, zF + 0.3], [s * 1.38, D.sillY - 0.03, 1.55], [s * 1.38, 0.34, 1.55], [s * 1.38, 0.3, zF + 0.3]);
    rbox(P, "skirt", Math.min(xi, xo), 0.28, zF - 0.175, Math.max(xi, xo), 0.31, zF - 0.15, 0.008);
    if (near) for (const u of [0.45, 0.8]) rbox(P, "under", s * u * 1.27 - 0.006, 0.34, zF - 0.14, s * u * 1.27 + 0.006, D.sillY - 0.06, zF - 0.02, 0.003, 1);
  }
  // the coupler: shank, head with its guide horn + pocket, the electric head below, two air hoses
  rbox(P, "bogie", -0.11, 0.72, zF - 0.3, 0.11, 0.9, zF + 0.3, 0.03);
  rbox(P, "under", -0.16, 0.68, zF - 0.42, 0.16, 0.94, zF - 0.3, 0.025, 3);
  cyl(P, "bogie", [-0.07, 0.81, zF - 0.42], [-0.07, 0.81, zF - 0.52], 0.045, 14, 0.02);
  disc(P, "rubber", [0.075, 0.81, zF - 0.421], [0, 0, 1], 0.045, 0.004, 14);
  rbox(P, "under", -0.18, 0.5, zF - 0.38, 0.18, 0.66, zF - 0.1, 0.02); rbox(P, "steelDull", -0.165, 0.515, zF - 0.39, 0.165, 0.645, zF - 0.375, 0.008);
  for (const s of [1, -1]) tube(P, "rubber", [[s * 0.42, 0.9, zF + 0.02], [s * 0.42, 0.74, zF - 0.06], [s * 0.4, 0.56, zF - 0.12], [s * 0.36, 0.5, zF - 0.2]], 0.017, 8);
  dirtKey(P, "skirt", (_x, y) => 0.15 + 0.4 * sstep(0.75, 0.3, y));
  dirtKey(P, "face", (_x, y) => sstep(1.5, 0.95, y) * 0.22);
};

// ---------------------------------------------------------------- door leaves (one leaf: outer face at x = 0 facing +X)
const leafParts = (edge: 1 | -1) => {
  const P = parts(), w = D.leafW, h = D.doorH, t = 0.03, wy0 = D.dwinY0, wy1 = D.dwinY1, ww = D.dwinW, wc = -edge * 0.035;
  const hole = { u0: wc - ww / 2, u1: wc + ww / 2, y0: wy0, y1: wy1 };
  gridHoles(-w / 2, w / 2, 0, h, [hole], (u0, y0, u1, y1) => { tint(sideQuad(P, "steel", 0, 1, u0, y0, u1, y1), 0.55); sideQuad(P, "leafIn", -t, -1, u0, y0, u1, y1); });
  sideQuad(P, "glassDoor", -t / 2, 1, hole.u0, hole.y0, hole.u1, hole.y1);
  // the glass's black frit border / gasket, both faces (2.2 cm)
  const g = 0.022;
  rbox(P, "rubber", -t - 0.003, hole.y0 - g, hole.u0 - g, 0.003, hole.y0, hole.u1 + g, 0.005); rbox(P, "rubber", -t - 0.003, hole.y1, hole.u0 - g, 0.003, hole.y1 + g, hole.u1 + g, 0.005);
  rbox(P, "rubber", -t - 0.003, hole.y0, hole.u0 - g, 0.003, hole.y1, hole.u0, 0.005); rbox(P, "rubber", -t - 0.003, hole.y0, hole.u1, 0.003, hole.y1, hole.u1 + g, 0.005);
  box(P, "steelDull", -t, h - 0.004, -w / 2, 0, h, w / 2); box(P, "steelDull", -t, 0, -w / 2, 0, 0.004, w / 2);
  // the leading-edge rubber (meets the other leaf), the bands, the finger grip, a scuff strip at the foot
  rbox(P, "rubber", -t - 0.004, 0, edge * (w / 2) - (edge > 0 ? 0.02 : 0), 0.008, h, edge * (w / 2) + (edge > 0 ? 0 : 0.02), 0.008);
  // (no band on the door leaves: the waist band is broken at the doors, so nothing green sits right beside the yellow
  // suitcase behind the door glass in frame 0; the director's T-6 / STATION's frame-0 report)
  const gz = edge * (w / 2 - 0.062);
  rbox(P, "rubber", -0.006, 0.98, gz - 0.016, 0.0015, 1.13, gz + 0.016, 0.006);
  box(P, "steelDull", 0, 0.004, -w / 2 + 0.01, 0.002, 0.07, w / 2 - 0.025);
  // inside: the warning strip along the meeting edge (a worn ochre, not a clean yellow), a grip recess
  box(P, "yellowIn", -t - 0.0015, 0.02, edge * (w / 2 - 0.04) - 0.011, -t, h - 0.02, edge * (w / 2 - 0.04) + 0.011);
  rbox(P, "rubber", -t - 0.0015, 0.98, gz - 0.016 - edge * 0.05, -t + 0.006, 1.13, gz + 0.016 - edge * 0.05, 0.006);
  dirtKey(P, "steel", (_x, y) => sstep(0.5, 0.0, y) * 0.25);
  dirtKey(P, "leafIn", (_x, y) => sstep(0.4, 0.0, y) * 0.35);
  return P;
};

// ---------------------------------------------------------------- the pantograph (single arm, raised to `wireY`)
const pantoParts = (P: Parts, zc: number, wireY: number) => {
  const yb = D.roofY + 0.02;
  for (const s of [1, -1]) for (const a of [-1, 1]) {
    cyl(P, "roofKit", [s * 0.4, yb, zc + a * 0.5], [s * 0.4, yb + 0.06, zc + a * 0.5], 0.06, 10);
    for (let i = 0; i < 3; i++) disc(P, "rubber", [s * 0.4, yb + 0.085 + i * 0.045, zc + a * 0.5], [0, 1, 0], 0.075 - i * 0.008, 0.03, 12);   // insulator sheds
    cyl(P, "roofKit", [s * 0.4, yb + 0.06, zc + a * 0.5], [s * 0.4, yb + 0.22, zc + a * 0.5], 0.03, 8);
  }
  rbox(P, "roofKit", -0.5, yb + 0.22, zc - 0.6, 0.5, yb + 0.28, zc + 0.6, 0.02);
  const hinge: V3 = [0, yb + 0.32, zc + 0.5], head: V3 = [0, wireY - 0.04, zc - 0.05];
  const knee: V3 = [0, (hinge[1] + head[1]) / 2 - 0.05, zc - 1.05];
  rbox(P, "roofKit", -0.24, yb + 0.26, hinge[2] - 0.08, 0.24, yb + 0.38, hinge[2] + 0.08, 0.02);
  for (const s of [1, -1]) cyl(P, "ac", [s * 0.18, hinge[1], hinge[2]], [s * 0.05, knee[1], knee[2]], 0.035, 10);
  cyl(P, "ac", knee, head, 0.025, 10);
  disc(P, "roofKit", knee, [1, 0, 0], 0.05, 0.14, 12);
  cyl(P, "ac", [0, hinge[1] - 0.05, hinge[2] - 0.2], [0, knee[1] - 0.15, knee[2] + 0.35], 0.012, 8);
  cyl(P, "roofKit", [0.12, yb + 0.3, zc - 0.3], [0.12, yb + 0.3, zc + 0.35], 0.045, 10);                     // the raising spring / cylinder
  for (const dz of [-0.14, 0.14]) {
    rbox(P, "ac", -0.75, head[1], head[2] + dz - 0.03, 0.75, head[1] + 0.045, head[2] + dz + 0.03, 0.012);
    for (const s of [1, -1]) cyl(P, "ac", [s * 0.75, head[1] + 0.02, head[2] + dz], [s * 0.98, head[1] - 0.12, head[2] + dz], 0.014, 8);
    rbox(P, "rubber", -0.7, head[1] + 0.045, head[2] + dz - 0.022, 0.7, head[1] + 0.06, head[2] + dz + 0.022, 0.004);   // carbon strips
  }
  for (const s of [1, -1]) cyl(P, "ac", [s * 0.4, head[1] + 0.02, head[2] - 0.14], [s * 0.4, head[1] + 0.02, head[2] + 0.14], 0.012, 6);
};

/** the consist */
export const trainJP = async (ctx: KitCtx, o: TrainJPOpts = {}): Promise<Built & {
  /** car k (0-based) front z in the train frame */ carZ: (k: number) => number;
  /** the door centre on the FLOOR at the outer skin (train frame) of car k, door i, side */ doorAt: (k: number, i: number, side: DoorSide) => V3;
  /** the door open fraction (0..1) of car k, side, at t (what the leaves show) */ doorOpen: (k: number, side: DoorSide, t: number) => number;
  /** 1 while car k's red car-side lamp on `side` is lit at t */ lampOn: (k: number, side: DoorSide, t: number) => number;
  /** 1 once every car-side lamp is out (the cab's door-closed pilot lamp; the hero cab uses it by default) */ pilot: (t: number) => number;
  /** the train frame offset at t (z of the nose, moving toward -Z) */ noseZ: (t: number) => number;
  /** a group riding with car k whose origin is that car's front end ON THE FLOOR (car-local: y up from the floor, z'
   *  along the car): add props / cards that travel with the train (the suitcase behind a door) */ carFloor: (k: number) => THREE.Group;
  /** the hero interior / cab Built of car 1 (when built) */ hero: { interior?: Built & Record<string, unknown>; cab?: Built & Record<string, unknown> };
  cars: THREE.Group[];
}> => {
  const N = o.cars ?? 10, band = o.band ?? PAL.emerald, bandDark = o.bandDark ?? PAL.emeraldDark;
  const doorsFn = o.doors ?? (() => ({ side: "none" as const, open: 0 }));
  const delay = o.doorDelay ?? 0.03, lampDelay = o.lampDelay ?? 0.3, pilotDelay = 0.15;

  const M = exteriorMats(ctx, band, bandDark), Mrec = M as unknown as Record<string, THREE.Material>;
  const pantos = new Set(o.pantographs ?? (N >= 10 ? [2, 4, 7, 9] : N >= 4 ? [2] : []));
  const root = new THREE.Group(); root.name = "trainJP";
  const moving = new THREE.Group(); root.add(moving);
  // ---- shared car geometry: mid / cab, near / far
  const lodMode = o.lod ?? "auto";
  const build = (cab: boolean, near: boolean) => { const b = bodyParts(cab, near, (o.seed ?? 3) + (cab ? 11 : 0), o.crewWindow); if (cab) faceParts(b.P, near); return b; };
  const want = (near: boolean) => lodMode === "auto" || (lodMode === "near") === near;
  const G: Record<string, { grp: THREE.Group; meta: ReturnType<typeof bodyParts> } | null> = {};
  for (const cab of [false, true]) for (const near of [true, false]) {
    const key = `${cab ? "cab" : "mid"}-${near ? "near" : "far"}`;
    if (!want(near)) { G[key] = null; continue; }
    if (!cab && N <= 2) { G[key] = null; continue; }          // no mid cars in a 1-2 car train
    const meta = build(cab, near);
    const grp = meshes(meta.P, Mrec, { name: key, noCast: ["glass", "glassDoor", "screen"] });
    if (meta.rivets.length) {
      // spot-weld dots: ONE instanced dome (a flattened sphere) for every dot of the car side
      const rg = new THREE.SphereGeometry(0.0042, 6, 4); rg.scale(0.35, 1, 1);
      const im = new THREE.InstancedMesh(rg, M.steelDull, meta.rivets.length); im.name = "spot-welds"; im.castShadow = false; im.receiveShadow = true;
      const mm = new THREE.Matrix4(); meta.rivets.forEach((d, i) => { mm.makeTranslation(d[0], d[1], d[2]); im.setMatrixAt(i, mm); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); grp.add(im);
    }
    G[key] = { grp, meta };
  }
  // pantograph geometry (one, cloned per car)
  const pP = parts(); pantoParts(pP, 3.0, 5.15 - 0.0); const pantoGrp = meshes(pP, Mrec, { name: "panto" });
  // simple far interior: floor, benches, ceiling glow (seen through the windows of the far cars)
  const sP = parts();
  sP.set("inside", []);
  box(sP, "insideFloor", -1.4, D.floor - 0.01, 0.3, 1.4, D.floor, 19.7);
  for (const s of [1, -1]) { rbox(sP, "insideSeat", s > 0 ? 0.88 : -1.4, D.floor + 0.3, 0.4, s > 0 ? 1.4 : -0.88, D.floor + 0.45, 19.6, 0.03); rbox(sP, "insideSeat", s > 0 ? 1.3 : -1.4, D.floor + 0.45, 0.4, s > 0 ? 1.4 : -1.3, D.floor + 0.95, 19.6, 0.03); rbox(sP, "inside", s > 0 ? 1.12 : -1.4, D.floor + 1.75, 0.4, s > 0 ? 1.4 : -1.12, D.floor + 1.78, 19.6, 0.01); }
  box(sP, "inside", -1.4, D.floor + D.ceilC, 0.3, 1.4, D.floor + D.ceilC + 0.02, 19.7);
  for (const s of [1, -1]) box(sP, "insideLight", s * 0.55 - 0.05, D.floor + D.ceilC - 0.02, 0.6, s * 0.55 + 0.05, D.floor + D.ceilC, 19.4);
  for (let z = 1.5; z < 19; z += 1.3) for (const s of [1, -1]) cyl(sP, "inside", [s * 0.75, D.floor + 1.95, z], [s * 0.75, D.floor + 1.72, z], 0.02, 6);
  const simpleIn = meshes(sP, Mrec, { name: "simple-interior", cast: false });
  // ---- cars
  const cars: THREE.Group[] = [], floors: THREE.Group[] = [], lampsL: { m: THREE.MeshStandardMaterial; k: number; side: DoorSide }[] = [];
  const lodPairs: { near: THREE.Object3D | null; far: THREE.Object3D | null; inSimple: THREE.Object3D | null; inHero: THREE.Object3D | null; zc: number }[] = [];
  const heroCars = new Set(o.interior === "simple" || o.interior === "none" ? [] : o.heroCars ?? [1]);
  const hero: { interior?: Built & Record<string, unknown>; cab?: Built & Record<string, unknown> } = {};
  const updates: ((t: number, cam: THREE.Camera) => void)[] = [];
  const lampGeo = new THREE.SphereGeometry(0.038, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let k = 0; k < N; k++) {
    const cab = k === 0 || k === N - 1, rear = k === N - 1 && N > 1;
    const car = new THREE.Group(); car.name = `car${k + 1}`;
    const inner = new THREE.Group(); car.add(inner);
    if (rear) { inner.rotation.y = Math.PI; inner.position.z = D.pitch; }       // the rear cab car faces backwards
    car.position.z = k * D.pitch;
    const fl = new THREE.Group(); fl.name = `car${k + 1}-floor`; fl.position.y = D.floor; car.add(fl); floors.push(fl);
    const nearG = G[`${cab ? "cab" : "mid"}-near`], farG = G[`${cab ? "cab" : "mid"}-far`];
    if (!nearG && !farG) { moving.add(car); cars.push(car); continue; }
    const nearObj = nearG ? nearG.grp.clone() : null, farObj = farG ? farG.grp.clone() : null;
    if (nearObj) inner.add(nearObj); if (farObj) inner.add(farObj);
    if (pantos.has(k + 1)) { const p = pantoGrp.clone(); if (cab) p.position.z = 1.2; inner.add(p); }
    // car-side lamps (own material each: on / off per car and side)
    const dzMid = (nearG ?? farG)!.meta.dzMid;
    for (const side of ["left", "right"] as DoorSide[]) {
      const s = side === "right" ? 1 : -1, ws = rear ? -s : s;           // in the rotated rear car the local side flips
      const m = lamp(`side-${k}-${side}`, "#ff0c04", "#4a0a06", 2.0);   // (3.2 tone-mapped to orange: a car-side lamp is RED)
      const me = new THREE.Mesh(lampGeo, m);
      me.rotation.z = -ws * Math.PI / 2; me.scale.set(1, 0.55, 1); me.position.set(ws * (D.hw + 0.006), D.floor + D.lampY, dzMid + D.lampDZ);
      inner.add(me); lampsL.push({ m, k, side });
    }
    // head / tail lights on the cab faces
    if (cab) {
      const front = k === 0, lit = o.lights !== false;
      for (const s of [1, -1]) {
        const hm = lamp(`head-${k}-${s}`, "#fff4e0", "#9aa0a6", 14), tm = lamp(`tail-${k}-${s}`, "#ff1e10", "#40100c", 10);
        hm.userData.set(lit && front ? 1 : 0); tm.userData.set(lit && !front ? 1 : 0);
        const h = new THREE.Mesh(new THREE.CircleGeometry(0.075, 20), hm); h.position.set(s * 1.07, D.floor + 0.41, FACE.zF - 0.0155); h.rotation.y = Math.PI;
        const tl = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), tm); tl.position.set(s * 0.88, D.floor + 0.41, FACE.zF - 0.0155); tl.rotation.y = Math.PI;
        inner.add(h, tl);
      }
    }
    // interiors
    let inSimple: THREE.Object3D | null = null, inHero: THREE.Object3D | null = null;
    if (o.interior !== "none") {
      if (heroCars.has(k + 1)) {
        const b = await interiorJP(ctx, { cab, doors: (t) => doorOpenOf(k, t), seed: (o.seed ?? 3) + k, ...(o.interiorOpts ?? {}) });
        b.object.position.y = D.floor; inner.add(b.object); inHero = b.object; hero.interior = b as Built & Record<string, unknown>;
        if (b.update) updates.push(b.update);
        if (cab && k === 0 && o.heroCab !== false) {
          const c = await cabJP(ctx, { pilot: (t) => pilotOf(t), ...(o.crewWindow ? { crewWindow: o.crewWindow } : {}), ...(o.cab ?? {}) });
          c.object.position.y = D.floor; inner.add(c.object); hero.cab = c as Built & Record<string, unknown>;
          if (c.update) updates.push(c.update);
        }
      } else { inSimple = simpleIn.clone(); inner.add(inSimple); }
    }
    // gangway bellows to the next car
    if (k < N - 1) {
      const bP = parts();
      for (let i = 0; i < 7; i++) { const z = D.body1 + 0.02 + i * 0.068; rbox(bP, "rubber", -0.56, D.floor - 0.06, z, 0.56, D.floor + 2.05, z + 0.045, 0.02); }
      const bg = meshes(bP, Mrec, { name: "bellows" }); car.add(bg);
    }
    moving.add(car); cars.push(car);
    lodPairs.push({ near: nearObj, far: farObj, inSimple, inHero, zc: k * D.pitch + 10 });
  }
  // ---- door leaves: instanced, two leaf types, per material
  const A = leafParts(1), B = leafParts(-1);
  const leafMeshes: { mesh: THREE.InstancedMesh; type: "A" | "B" }[] = [];
  type Slot = { k: number; side: DoorSide; dz: number; half: -1 | 1; rear: boolean };
  const slotsA: Slot[] = [], slotsB: Slot[] = [];
  for (let k = 0; k < N; k++) {
    const cab = k === 0 || k === N - 1, rear = k === N - 1 && N > 1;
    for (const dz0 of cab ? DOORS_CAB : DOORS_MID) for (const side of ["left", "right"] as DoorSide[]) for (const half of [-1, 1] as const) {
      // local (unrotated car) side and z
      const dz = rear ? D.pitch - dz0 : dz0;
      const s = side === "right" ? 1 : -1;
      // leading edge must point to the door centre: half -1 needs +z leading in world
      const wantLeadPlusZ = half < 0;
      const geoLeadPlusZ = s > 0;                          // A (edge +1) faces +X; rotated by PI for the left side flips z
      const useA = wantLeadPlusZ === geoLeadPlusZ;
      (useA ? slotsA : slotsB).push({ k, side, dz, half, rear });
    }
  }
  for (const [P, slots, type] of [[A, slotsA, "A"], [B, slotsB, "B"]] as const) {
    for (const [kk, geo] of mergeParts(P)) {
      const m = new THREE.InstancedMesh(geo, Mrec[kk], slots.length); m.name = `leaf${type}-${kk}`;
      m.castShadow = !Mrec[kk].transparent; m.receiveShadow = true; m.frustumCulled = false;
      moving.add(m); leafMeshes.push({ mesh: m, type });
    }
  }
  function doorOpenOf(k: number, t: number, side?: DoorSide): number {
    const st = doorsFn(t);
    if (st.side === "none" || st.open <= 0) return 0;
    if (side && st.side !== "both" && st.side !== side) return 0;
    void k; return st.open;
  }
  // the true order: the leaves meet -> each car's red car-side lamp goes out (lampDelay, then car by car) -> once the
  // last one is out the cab's door-closed pilot lamp lights. The lamps change ONLY with the doors.
  function lampOn(k: number, side: DoorSide, t: number): number { return doorOpenOf(k, t - (lampDelay + delay * k), side) > 0.003 || doorOpenOf(k, t, side) > 0.003 ? 1 : 0; }
  function anyLamp(t: number): number { for (const side of ["left", "right"] as DoorSide[]) if (lampOn(N - 1, side, t) || lampOn(0, side, t)) return 1; return 0; }
  function pilotOf(t: number): number { return anyLamp(t) || anyLamp(t - pilotDelay) ? 0 : 1; }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Vp = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), Yax = new THREE.Vector3(0, 1, 0);
  const setLeaves = (t: number) => {
    for (const [slots, type] of [[slotsA, "A"], [slotsB, "B"]] as const) {
      const list = leafMeshes.filter((l) => l.type === type);
      slots.forEach((sl, i) => {
        const f = doorOpenOf(sl.k, t, sl.side), s = sl.side === "right" ? 1 : -1;
        const closedC = sl.dz + sl.half * (D.leafW / 2 - 0.015), off = sl.half * f * (D.leafW - 0.05);
        Vp.set(s * (D.hw - 0.022), D.floor, sl.k * D.pitch + closedC + off);
        Q.setFromAxisAngle(Yax, s > 0 ? 0 : Math.PI);
        M4.compose(Vp, Q, S1);
        for (const l of list) l.mesh.setMatrixAt(i, M4);
      });
      for (const l of list) l.mesh.instanceMatrix.needsUpdate = true;
    }
  };
  // ---- wheels: one axle geometry instanced over every axle
  const wP = parts();
  for (const s of [1, -1]) {
    const x = s * (D.gauge / 2 + 0.035);
    cyl(wP, "wheel", [x - 0.065, 0, 0], [x + 0.065, 0, 0], D.wheelR - 0.012, 28);
    cyl(wP, "tread", [x - 0.06, 0, 0], [x + 0.055, 0, 0], D.wheelR, 28, D.wheelR - 0.006, true);
    cyl(wP, "wheel", [x + s * 0.065 - 0.01, 0, 0], [x + s * 0.065 + 0.01, 0, 0], D.wheelR + 0.014, 28);   // flange (inner side)
    disc(wP, "bogie", [s * 1.0, 0, 0], [1, 0, 0], 0.11, 0.12, 16);                                       // axle box cover
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; rbox(wP, "wheel", x - 0.07, Math.sin(a) * 0.2 - 0.015, Math.cos(a) * 0.2 - 0.015, x - 0.066, Math.sin(a) * 0.2 + 0.015, Math.cos(a) * 0.2 + 0.015, 0.004); }
    disc(wP, "brake", [s * 0.3, 0, 0], [1, 0, 0], 0.3, 0.04, 24);                                         // brake disc
  }
  cyl(wP, "wheel", [-0.9, 0, 0], [0.9, 0, 0], 0.08, 14);
  dirtKey(wP, "wheel", () => 0.5); dirtKey(wP, "brake", () => 0.3);
  const axles: { k: number; z: number }[] = [];
  for (let k = 0; k < N; k++) { const cab = k === 0 || k === N - 1, rear = k === N - 1 && N > 1; for (const b of cab ? BOGIES_CAB : BOGIES_MID) for (const a of [-1, 1]) { const z = b + (a * D.wheelbase) / 2; axles.push({ k, z: rear ? D.pitch - z : z }); } }
  const wheelMeshes: THREE.InstancedMesh[] = [];
  for (const [kk, geo] of mergeParts(wP)) { const m = new THREE.InstancedMesh(geo, Mrec[kk], axles.length); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; moving.add(m); wheelMeshes.push(m); }
  const Xax = new THREE.Vector3(1, 0, 0);
  const setWheels = (dist: number) => {
    Q.setFromAxisAngle(Xax, -dist / D.wheelR);
    axles.forEach((a, i) => { Vp.set(0, D.wheelR, a.k * D.pitch + a.z); M4.compose(Vp, Q, S1); for (const m of wheelMeshes) m.setMatrixAt(i, M4); });
    for (const m of wheelMeshes) m.instanceMatrix.needsUpdate = true;
  };
  // ---- LOD by camera distance (auto); hero interiors stay
  const near = o.nearM ?? 32, camP = new THREE.Vector3(), cw = new THREE.Vector3();
  const setLod = (cam: THREE.Camera) => {
    if (lodMode !== "auto") return;
    camP.setFromMatrixPosition(cam.matrixWorld);
    for (const lp of lodPairs) {
      cw.set(0, 1.8, lp.zc); moving.localToWorld(cw);
      const isNear = cw.distanceTo(camP) < near;
      if (lp.near) lp.near.visible = isNear; if (lp.far) lp.far.visible = !isNear;
    }
  };
  const run = o.run ?? (() => 0);
  const skyMats = [M.steel, M.steelDull, M.face, M.alu, M.ac, M.chrome, M.dest, M.glassDoor];
  const update = (t: number, cam: THREE.Camera) => {
    const d = run(t);
    aimSkyEnv(ctx, skyMats);
    moving.position.z = -d;
    moving.updateMatrixWorld(true);
    setLeaves(t);
    setWheels(d);
    for (const l of lampsL) l.m.userData.set(lampOn(l.k, l.side, t));
    setLod(cam);
    for (const u of updates) u(t, cam);
  };
  update(0, new THREE.PerspectiveCamera());
  return {
    object: root, update, cars, hero,
    carZ: (k) => k * D.pitch,
    doorAt: (k, i, side) => { const cab = k === 0 || k === N - 1, rear = k === N - 1 && N > 1; const z0 = (cab ? DOORS_CAB : DOORS_MID)[i]; return [side === "right" ? D.hw : -D.hw, D.floor, k * D.pitch + (rear ? D.pitch - z0 : z0)]; },
    doorOpen: (k, side, t) => doorOpenOf(k, t, side),
    lampOn, pilot: pilotOf,
    noseZ: (t) => -run(t),
    carFloor: (k) => floors[k],
  };
};

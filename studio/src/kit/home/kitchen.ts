// KIT / HOME: kitchen props. All builders return a Group in their OWN local frame (documented per builder); the set places
// them. Materials carry micro maps (util.pbr) and the big surfaces use the SURFACES registry (worktop_laminate,
// subway_tiles, steel_brushed). No text anywhere (pictogram flames / dots only).
//  - counterRun: base cabinets + plinth + drawers + doors + bar handles + the laminate worktop (bevelled nosing) with
//    cut-outs for the hob and the sink, the inset stainless sink + tap, the tiled backsplash (10 cm tiles), wall cabinets
//  - gasHob (K-P15): a 2-burner built-in gas hob: dark glass-enamel top, stainless trim, burners (drip ring, body, port
//    ring, enamel cap, centre sensor, igniter + thermocouple pins), 5-finger enamel pan supports, the front fascia with 2
//    black knobs (a raised fin, a WHITE pointer: straight UP = OFF), chrome bezels, pictogram flames, the grill door
//  - rangeHood (K-P16): slim hood + chimney cover, aluminium mesh filter, the lamp lens (practical mount), push buttons
//  - kettle (K-P25), fridge (K-P17: magnets + a scribble list), dishRack, coirMat, coatHook (coat + scarf)
import * as THREE from "three";
import type { KitCtx, Practical } from "../core/ctx";
import { surface } from "../surfaces/materials";
import { addDecals } from "../surfaces/decals";
import { pbr, mesh, rboxG, rboxC, at, merge, latheG, tubeG, cylG, canvas, canvasMat, glow, contactBlob, rng, type V3, type C3 } from "./util";

// ================================================================ counter run
export type CounterOpts = {
  /** run length along local +x (m), depth (local +z = the front), worktop height */
  len: number; depth?: number; height?: number;
  /** cut-outs along x (centre, width, depth from the wall) */
  hob?: { x: number; w?: number; d?: number }; sink?: { x: number; w?: number; d?: number };
  /** wall cabinets (skip the span over the hood) */
  wallCabs?: { y0?: number; y1?: number; depth?: number; skip?: [number, number][] };
  /** backsplash tiles up to this height (m) */
  splashTo?: number;
  doorColor?: C3; seed?: number;
};
/** local frame: x along the run (0..len), back on the wall plane z = 0, front +z, floor y = 0 */
export const counterRun = async (ctx: KitCtx, o: CounterOpts) => {
  const L = o.len, D = o.depth ?? 0.62, H = o.height ?? 0.88, R = rng(o.seed ?? 7);
  const g = new THREE.Group(); g.name = "counterRun";
  const top = await surface(ctx, "worktop_laminate", { uv: "uv", tint: [0.62, 0.36, 0.2],   /* LOOK v2 2026-11-20: a warm wood-tone top (was [0.86, 0.8, 0.7]) */ rough: 1.0, macro: { amount: 0.05 }, seed: 11 });
  const carcass = pbr({ color: [0.66, 0.4, 0.24], rough: 0.5, peel: 0.3, tile: 0.4 });   // LOOK v2 2026-11-20: warm wood carcass sides (was [0.9, 0.89, 0.86])
  const doorM = pbr({ color: o.doorColor ?? [0.84, 0.8, 0.73], rough: 0.42, peel: 0.4, tile: 0.4, prints: 6, roughVar: 0.25 });
  const handleM = pbr({ color: [0.72, 0.72, 0.7], rough: 0.28, metal: 1, brushed: true, tile: 0.05 });
  const plinthM = pbr({ color: [0.22, 0.21, 0.2], rough: 0.6, peel: 0.3, tile: 0.3 });
  const T = 0.03, ov = 0.02;                          // worktop thickness + front overhang
  // ---- worktop pieces around the cut-outs (x spans), with a bevelled nosing
  const cuts = [o.hob, o.sink].filter(Boolean).map((c) => ({ x0: c!.x - (c!.w ?? 0.6) / 2, x1: c!.x + (c!.w ?? 0.6) / 2, z0: 0.06, z1: 0.06 + (c!.d ?? 0.5) })).sort((a, b) => a.x0 - b.x0);
  const topG: THREE.BufferGeometry[] = [];
  let px = 0;
  for (const c of cuts) {
    if (c.x0 > px) topG.push(rboxG(px, H - T, 0, c.x0, H, D + ov, 0.006, 3));
    topG.push(rboxG(c.x0, H - T, 0, c.x1, H, c.z0, 0.004), rboxG(c.x0, H - T, c.z1, c.x1, H, D + ov, 0.006, 3));
    px = c.x1;
  }
  if (L > px) topG.push(rboxG(px, H - T, 0, L, H, D + ov, 0.006, 3));
  const topMesh = mesh(merge(topG), top, true, "worktop"); g.add(topMesh);
  // ---- carcasses, plinth, doors, drawers, handles
  g.add(mesh(rboxG(0, 0.1, 0.0, L, H - T, D - 0.02, 0.003), carcass, true, "carcass"));
  g.add(mesh(rboxG(0, 0, 0.02, L, 0.1, D - 0.08, 0.003), plinthM, false, "plinth"));
  const doorG: THREE.BufferGeometry[] = [], handG: THREE.BufferGeometry[] = [];
  // door boundaries: the hob gets one door exactly under its fascia; the rest split into ~0.5 m doors
  const hb = o.hob ? [o.hob.x - (o.hob.w ?? 0.6) / 2, o.hob.x + (o.hob.w ?? 0.6) / 2] : null;
  const segs: [number, number, boolean][] = hb ? [[0, hb[0], false], [hb[0], hb[1], true], [hb[1], L, false]] : [[0, L, false]];
  const spans: [number, number, boolean][] = [];
  for (const [s0, s1, h] of segs) { if (s1 - s0 < 0.05) continue; const n = h ? 1 : Math.max(1, Math.round((s1 - s0) / 0.5)); for (let i = 0; i < n; i++) spans.push([s0 + ((s1 - s0) * i) / n, s0 + ((s1 - s0) * (i + 1)) / n, h]); }
  const gap = 0.003;
  for (const [sa, sb, isHob] of spans) {
    const a = sa + gap, b = sb - gap, mid = (a + b) / 2;
    const dTop = isHob ? H - 0.18 : H - T - 0.16;         // under the hob the fascia takes the top 18 cm
    if (!isHob) doorG.push(rboxG(a, dTop + gap, D - 0.02, b, H - T - gap, D, 0.002));    // drawer front
    doorG.push(rboxG(a, 0.1 + gap, D - 0.02, b, dTop - gap, D, 0.002));
    // bar handles: one on the drawer, one on the door (near the top, centred)
    const hl = Math.min(0.24, (b - a) * 0.55);
    if (!isHob) handG.push(at(rboxC(hl, 0.012, 0.012, 0, 0, 0, 0.005), mid, H - T - 0.08, D + 0.016));
    handG.push(at(rboxC(hl, 0.012, 0.012, 0, 0, 0, 0.005), mid, dTop - 0.06, D + 0.016));
    for (const sx of [-1, 1]) { handG.push(at(cylG(0.004, 0.004, 0.014, 8), mid + sx * hl * 0.42, dTop - 0.06, D + 0.007, Math.PI / 2)); if (!isHob) handG.push(at(cylG(0.004, 0.004, 0.014, 8), mid + sx * hl * 0.42, H - T - 0.08, D + 0.007, Math.PI / 2)); }
  }
  g.add(mesh(merge(doorG), doorM, true, "doors"), mesh(merge(handG), handleM, true, "handles"));
  // ---- backsplash tiles (10 cm white tiles: subway_tiles at tileM 1.0) on the wall plane
  const tiles = await surface(ctx, "subway_tiles", { uv: "uv", tileM: 1.0, tint: [0.2, 0.44, 0.8],   /* LOOK v2: cobalt tiles (was [0.97, 0.96, 0.93]) */ dirt: { bottom: 0.25, heightM: 0.08, baseY: H, grime: 0.12, streaks: 0.05 }, seed: 13 });
  const splashTo = o.splashTo ?? 1.5;
  {
    const sg = new THREE.PlaneGeometry(L, splashTo - H); sg.translate(L / 2, (H + splashTo) / 2, 0.006);
    const uv = sg.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L, H + uv.getY(i) * (splashTo - H));
    g.add(mesh(sg, tiles, false, "backsplash"));
    if (o.hob) addDecals(tiles, [{ type: "stain", at: [o.hob.x, H + 0.22], size: [0.7, 0.45], opacity: 0.55, tint: [0.62, 0.52, 0.36] }, { type: "streak", at: [o.hob.x + 0.18, H + 0.25], size: [0.12, 0.3], opacity: 0.35 }]);
  }
  // ---- wall cabinets
  if (o.wallCabs) {
    const y0 = o.wallCabs.y0 ?? 1.5, y1 = o.wallCabs.y1 ?? 2.2, wd = o.wallCabs.depth ?? 0.33, skip = o.wallCabs.skip ?? [];
    const spans: [number, number][] = []; let s0 = 0;
    for (const [a, b] of [...skip].sort((p, q) => p[0] - q[0])) { if (a > s0) spans.push([s0, a]); s0 = b; }
    if (L > s0) spans.push([s0, L]);
    const wg: THREE.BufferGeometry[] = [], wdG: THREE.BufferGeometry[] = [], whG: THREE.BufferGeometry[] = [];
    for (const [a, b] of spans) {
      wg.push(rboxG(a, y0, 0, b, y1, wd - 0.02, 0.003));
      const n = Math.max(1, Math.round((b - a) / 0.45)), w = (b - a) / n;
      for (let i = 0; i < n; i++) {
        const da = a + i * w + 0.003, db = a + (i + 1) * w - 0.003;
        wdG.push(rboxG(da, y0 + 0.003, wd - 0.02, db, y1 - 0.003, wd, 0.002));
        const hx = i % 2 ? da + 0.04 : db - 0.04;
        whG.push(at(rboxC(0.012, 0.12, 0.012, 0, 0, 0, 0.005), hx, y0 + 0.1, wd + 0.016));
      }
      // under-cabinet light strip (unlit at night: a dark lens)
    }
    g.add(mesh(merge(wg), carcass, true, "wallCabs"), mesh(merge(wdG), doorM, true, "wallDoors"), mesh(merge(whG), handleM, true, "wallHandles"));
  }
  // ---- the sink (inset stainless) + tap
  if (o.sink) {
    const sw = o.sink.w ?? 0.5, sd = o.sink.d ?? 0.4, sx = o.sink.x, sz0 = 0.06, sz1 = sz0 + sd, depth = 0.17;
    const ss = await surface(ctx, "steel_brushed", { uv: "uv", tint: [0.9, 0.9, 0.9], rough: 1.2, dirt: { grime: 0.15 }, seed: 17 });
    const sg: THREE.BufferGeometry[] = [];
    const rim = 0.025;
    sg.push(rboxG(sx - sw / 2, H - 0.001, sz0, sx + sw / 2, H + 0.004, sz0 + rim, 0.002), rboxG(sx - sw / 2, H - 0.001, sz1 - rim, sx + sw / 2, H + 0.004, sz1, 0.002));
    sg.push(rboxG(sx - sw / 2, H - 0.001, sz0, sx - sw / 2 + rim, H + 0.004, sz1, 0.002), rboxG(sx + sw / 2 - rim, H - 0.001, sz0, sx + sw / 2, H + 0.004, sz1, 0.002));
    const ix0 = sx - sw / 2 + rim, ix1 = sx + sw / 2 - rim, iz0 = sz0 + rim, iz1 = sz1 - rim;
    sg.push(rboxG(ix0, H - depth, iz0, ix1, H - depth + 0.004, iz1, 0.002));            // basin floor
    sg.push(rboxG(ix0, H - depth, iz0, ix0 + 0.002, H, iz1, 0.001), rboxG(ix1 - 0.002, H - depth, iz0, ix1, H, iz1, 0.001));
    sg.push(rboxG(ix0, H - depth, iz0, ix1, H, iz0 + 0.002, 0.001), rboxG(ix0, H - depth, iz1 - 0.002, ix1, H, iz1, 0.001));
    g.add(mesh(merge(sg), ss, true, "sink"));
    const chrome = pbr({ color: [0.88, 0.88, 0.87], rough: 0.1, metal: 1, peel: 0, prints: 6 });
    g.add(mesh(at(latheG([[0.001, 0], [0.03, 0], [0.03, 0.003], [0.02, 0.004], [0.012, 0.0], [0.001, -0.004]], 24), sx, H - depth + 0.005, (iz0 + iz1) / 2), chrome, false, "drain"));
    // gooseneck tap at the back + lever
    const tz = sz0 - 0.01 + 0.035;
    g.add(mesh(at(cylG(0.026, 0.024, 0.025, 24), sx + 0.12, H + 0.0125, tz), chrome, true, "tapBase"));
    g.add(mesh(tubeG([[sx + 0.12, H + 0.02, tz], [sx + 0.12, H + 0.22, tz], [sx + 0.12, H + 0.3, tz + 0.06], [sx + 0.12, H + 0.26, tz + 0.16], [sx + 0.12, H + 0.21, tz + 0.18]], 0.011, 48, 12), chrome, true, "tap"));
    g.add(mesh(at(rboxC(0.012, 0.012, 0.08, 0, 0, 0, 0.005), sx + 0.12, H + 0.1, tz + 0.05, -0.35), chrome, true, "tapLever"));
    // water spots by the sink (decals on the worktop: its "uv" frame is box-projected local x / -z)
    addDecals(top, [{ type: "stain", at: [sx - sw / 2 - 0.08, -(D * 0.5)], size: [0.12, 0.1], opacity: 0.3, tint: [0.7, 0.68, 0.64] }, { type: "wear", at: [sx + sw / 2 + 0.1, -(D * 0.6)], size: [0.14, 0.12], opacity: 0.4 }]);
  }
  addDecals(top, [{ type: "stain", at: [L * 0.82, -(D * 0.55)], size: [0.08, 0.08], opacity: 0.45, tint: [0.45, 0.32, 0.22], variant: 1 }]);    // a mug ring
  void R;
  return { object: g, mats: { top, tiles }, H, D };
};

// ================================================================ gas hob (K-P15)
export type HobOpts = {
  /** distance from the hob centre (local z = 0) to the counter's front face, where the fascia sits */
  frontZ: number; w?: number; d?: number;
  /** knob angle (rad, clockwise from straight up = OFF) per knob at time t */
  knob?: (i: number, t: number) => number;
  /** knob size multiplier (default 1.25: 6.9 cm knobs, readable at phone size) */
  knobScale?: number;
};
/** local frame: x along the counter (hob centre 0), y = 0 the worktop surface, +z toward the counter front. Returns the
 *  burner tops (for a kettle / pan) and the knob centres (local) */
export const gasHob = async (ctx: KitCtx, o: HobOpts) => {
  const W = o.w ?? 0.6, Dp = o.d ?? 0.5, g = new THREE.Group(); g.name = "gasHob";
  const glassTop = pbr({ color: [0.035, 0.035, 0.04], rough: 0.12, peel: 0.15, tile: 0.2, clearcoat: 1.0, ccRough: 0.05, prints: 10, roughVar: 0.5 });
  const trim = pbr({ color: [0.75, 0.75, 0.73], rough: 0.25, metal: 1, brushed: true, tile: 0.08 });
  const enamel = pbr({ color: [0.025, 0.025, 0.028], rough: 0.38, peel: 0.9, tile: 0.05, clearcoat: 0.4, ccRough: 0.3, normalScale: 0.8 });
  const alu = pbr({ color: [0.55, 0.55, 0.55], rough: 0.5, metal: 1, peel: 0.8, tile: 0.03 });
  const brass = pbr({ color: [0.45, 0.36, 0.22], rough: 0.55, metal: 1, peel: 0.8, tile: 0.03 });
  const ceramic = pbr({ color: [0.92, 0.9, 0.86], rough: 0.4, peel: 0 });
  // top plate with a stainless trim frame (sits 6 mm proud of the worktop)
  g.add(mesh(rboxG(-W / 2 + 0.012, 0.0, -Dp / 2 + 0.012, W / 2 - 0.012, 0.008, Dp / 2 - 0.012, 0.003), glassTop, true, "hobTop"));
  const tg = [rboxG(-W / 2, 0, -Dp / 2, W / 2, 0.009, -Dp / 2 + 0.014, 0.003), rboxG(-W / 2, 0, Dp / 2 - 0.014, W / 2, 0.009, Dp / 2, 0.003),
    rboxG(-W / 2, 0, -Dp / 2, -W / 2 + 0.014, 0.009, Dp / 2, 0.003), rboxG(W / 2 - 0.014, 0, -Dp / 2, W / 2, 0.009, Dp / 2, 0.003)];
  g.add(mesh(merge(tg), trim, true, "hobTrim"));
  // burners: left front, right back
  const burners: V3[] = [[-0.15, 0.008, 0.07], [0.15, 0.008, -0.07]];
  const tops: V3[] = [];
  for (const [bx, by, bz] of burners) {
    const b = new THREE.Group(); b.position.set(bx, by, bz);
    b.add(mesh(latheG([[0.0, 0.0], [0.095, 0.0], [0.096, 0.004], [0.088, 0.006], [0.06, 0.003], [0.052, 0.004]], 48), trim, false));          // drip ring
    b.add(mesh(latheG([[0.001, 0.004], [0.05, 0.004], [0.05, 0.016], [0.046, 0.02], [0.03, 0.02], [0.001, 0.02]], 40), alu, true));         // body
    b.add(mesh(latheG([[0.036, 0.02], [0.046, 0.02], [0.046, 0.027], [0.043, 0.03], [0.038, 0.03]], 40), brass, true));                       // port ring
    b.add(mesh(latheG([[0.001, 0.03], [0.04, 0.03], [0.041, 0.034], [0.035, 0.038], [0.012, 0.039], [0.001, 0.039]], 40), enamel, true));     // enamel cap
    // port slots: tiny dark notches round the port ring
    const notch = new THREE.InstancedMesh(new THREE.BoxGeometry(0.003, 0.004, 0.006), pbr({ color: [0.02, 0.02, 0.02], rough: 0.9, peel: 0 }), 28);
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; notch.setMatrixAt(i, new THREE.Matrix4().makeRotationY(-a).setPosition(Math.cos(a) * 0.0462, 0.026, Math.sin(a) * 0.0462)); }
    b.add(notch);
    // centre temperature sensor (spring button) + igniter + thermocouple pins
    b.add(mesh(at(cylG(0.01, 0.01, 0.012, 20), 0, 0.044, 0), alu, true));
    b.add(mesh(at(cylG(0.003, 0.0035, 0.03, 10), 0.052, 0.018, 0.012), ceramic, true), mesh(at(cylG(0.0018, 0.0018, 0.032, 8), 0.05, 0.018, -0.016), alu, true));
    // pan support: a ring + 5 tapered fingers (black enamel cast iron)
    const sup: THREE.BufferGeometry[] = [at(new THREE.TorusGeometry(0.104, 0.0055, 8, 48), 0, 0.012, 0, Math.PI / 2)];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, fg = new THREE.BufferGeometry();
      const sh = new THREE.Shape(); sh.moveTo(0.104, 0); sh.lineTo(0.104, 0.038); sh.lineTo(0.058, 0.046); sh.lineTo(0.058, 0.038); sh.lineTo(0.09, 0.02); sh.lineTo(0.098, 0.0);
      const e = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1 }); e.translate(0, 0.006, -0.004); e.rotateY(-a);
      sup.push(e); void fg;
    }
    b.add(mesh(merge(sup), enamel, true, "panSupport"));
    g.add(b);
    tops.push([bx, by + 0.006 + 0.046, bz]);
  }
  // ---- the front fascia (in the cabinet front plane at z = frontZ): stainless panel, 2 knobs, the grill door
  const fz = o.frontZ, fy0 = -0.178, fy1 = -0.038;
  g.add(mesh(rboxG(-W / 2, fy0, fz - 0.02, W / 2, fy1, fz + 0.002, 0.002), trim, true, "fascia"));
  // grill door (dark glass window + a recessed handle)
  const dglass = pbr({ color: [0.02, 0.022, 0.025], rough: 0.08, peel: 0, clearcoat: 1, ccRough: 0.04, prints: 8 });
  g.add(mesh(rboxG(-0.13, fy0 + 0.012, fz + 0.001, 0.13, fy1 - 0.012, fz + 0.012, 0.004), trim, true, "grillDoor"));
  g.add(mesh(rboxG(-0.1, fy0 + 0.05, fz + 0.011, 0.1, fy1 - 0.022, fz + 0.014, 0.003), dglass, false, "grillGlass"));
  g.add(mesh(rboxG(-0.07, fy0 + 0.02, fz + 0.012, 0.07, fy0 + 0.034, fz + 0.03, 0.005), pbr({ color: [0.1, 0.1, 0.1], rough: 0.4, peel: 0 }), true, "grillHandle"));
  // knobs
  const knobBody = pbr({ color: [0.03, 0.03, 0.032], rough: 0.32, peel: 0.3, tile: 0.03, prints: 4, clearcoat: 0.3, ccRough: 0.2 });
  const white = pbr({ color: [0.96, 0.95, 0.92], rough: 0.35, peel: 0 });
  const chrome = pbr({ color: [0.9, 0.9, 0.88], rough: 0.08, metal: 1, peel: 0 });
  const knobs: THREE.Group[] = [];
  const kc: V3[] = [[-0.215, (fy0 + fy1) / 2, fz + 0.002], [0.215, (fy0 + fy1) / 2, fz + 0.002]];
  // pictogram marks on the fascia round each knob: an OFF dot at 12, small / big flames at 3 and 4 o'clock (canvas decal)
  const marks = (() => {
    const { cv, g: c } = canvas(256, 256); c.clearRect(0, 0, 256, 256);
    c.fillStyle = "#f2f0ea"; c.beginPath(); c.arc(128, 18, 9, 0, 7); c.fill();
    const flame = (x: number, y: number, s: number) => { c.beginPath(); c.moveTo(x, y - 14 * s); c.bezierCurveTo(x + 9 * s, y - 4 * s, x + 8 * s, y + 8 * s, x, y + 9 * s); c.bezierCurveTo(x - 8 * s, y + 8 * s, x - 9 * s, y - 4 * s, x, y - 14 * s); c.fill(); };
    c.fillStyle = "#f2f0ea"; flame(232, 128, 1.3); flame(205, 205, 0.8);
    return canvasMat(cv, { transparent: true, alphaTest: 0.3, rough: 0.5 });
  })();
  for (const [kx, ky, kz] of kc) {
    const ks = o.knobScale ?? 1.25, bez = latheG([[0.001, 0], [0.036 * ks, 0], [0.036 * ks, 0.003], [0.032 * ks, 0.007], [0.028 * ks, 0.008], [0.001, 0.008]], 40); bez.rotateX(Math.PI / 2); bez.translate(kx, ky, kz);
    g.add(mesh(bez, chrome, true, "knobBezel"));
    const mk = new THREE.Mesh(new THREE.PlaneGeometry(0.11 * (o.knobScale ?? 1.25), 0.11 * (o.knobScale ?? 1.25)), marks); mk.position.set(kx, ky, kz + 0.0006); g.add(mk);
    const k = new THREE.Group(); k.position.set(kx, ky, kz + 0.008); k.name = "knob";
    const body = latheG([[0.001, 0], [0.027, 0], [0.0275, 0.004], [0.026, 0.02], [0.024, 0.024], [0.012, 0.0255], [0.001, 0.026]], 40); body.rotateX(Math.PI / 2);
    k.add(mesh(body, knobBody, true, "knobBody"));
    // the grip fin across the face + the WHITE pointer on its upper half + a white dot at the rim
    k.add(mesh(rboxC(0.012, 0.05, 0.016, 0, 0, 0.032, 0.004), knobBody, true, "knobFin"));
    k.add(mesh(rboxC(0.0085, 0.024, 0.002, 0, 0.012, 0.0402, 0.001), white, false, "knobPointer"));
    k.add(mesh(at(new THREE.CircleGeometry(0.0032, 16), 0, 0.0235, 0.0262), white, false));
    k.scale.setScalar(o.knobScale ?? 1.25); g.add(k); knobs.push(k);
  }
  const knobAngle = o.knob ?? (() => 0);
  return { object: g, tops, knobs: kc, update: (t: number) => { knobs.forEach((k, i) => { k.rotation.z = -knobAngle(i, t); }); } };
};

// ================================================================ range hood (K-P16)
/** local frame: x along the counter (hood centre 0), back on the wall z = 0, front +z, y = 0 the hood's underside.
 *  Returns the lamp position (local) for a practical */
export const rangeHood = async (ctx: KitCtx, o: { w?: number; d?: number; chimneyTo?: number } = {}) => {
  const W = o.w ?? 0.6, D = o.d ?? 0.5, g = new THREE.Group(); g.name = "rangeHood";
  const ss = await surface(ctx, "steel_brushed", { uv: "uv", tint: [0.92, 0.92, 0.91], rough: 1.1, dirt: { grime: 0.12, bottom: 0.2, heightM: 0.05, baseY: 0 }, seed: 19 });
  g.add(mesh(rboxG(-W / 2, 0, 0, W / 2, 0.14, D, 0.01, 3), ss, true, "hoodBody"));
  const ch = o.chimneyTo ?? 0.8;
  g.add(mesh(rboxG(-0.15, 0.14, 0.0, 0.15, ch, 0.26, 0.004), ss, true, "hoodChimney"));
  // underside: a recessed aluminium mesh filter (a grid canvas: normal + dark holes), the lamp lens
  const { cv, g: c } = canvas(256, 256); c.fillStyle = "#b8b8b4"; c.fillRect(0, 0, 256, 256);
  c.fillStyle = "#2a2a28"; for (let y = 0; y < 256; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 256; x += 8) { c.beginPath(); c.ellipse(x + 2, y + 2, 2.4, 1.6, 0, 0, 7); c.fill(); }
  const filt = canvasMat(cv, { rough: 0.45, metal: 0.8 }); (filt.map as THREE.Texture).wrapS = (filt.map as THREE.Texture).wrapT = THREE.RepeatWrapping; (filt.map as THREE.Texture).repeat.set(5, 4);
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.4, D * 0.7), filt); f.rotation.x = Math.PI / 2; f.position.set(sx * W * 0.22, -0.001, D * 0.45); g.add(f); }
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05), glow([1.0, 0.82, 0.58], 3.2)); lens.rotation.x = Math.PI / 2; lens.position.set(0, -0.002, D * 0.78); lens.name = "hoodLens"; g.add(lens);
  // front control strip: 3 small round push buttons + a tiny amber LED (lamp on)
  const btn = pbr({ color: [0.2, 0.2, 0.21], rough: 0.35, peel: 0 });
  for (let i = 0; i < 3; i++) g.add(mesh(at(cylG(0.0065, 0.0065, 0.004, 16), 0.06 + i * 0.03, 0.06, D + 0.002, Math.PI / 2), btn, true));
  g.add(mesh(at(new THREE.CircleGeometry(0.0022, 12), 0.03, 0.06, D + 0.0015), glow([1, 0.6, 0.2], 4), false));
  return { object: g, lamp: [0, -0.03, D * 0.78] as V3 };
};

// ================================================================ kettle (K-P25)
/** a stainless stovetop kettle, local origin = the centre of its base */
export const kettle = (o: { color?: C3 } = {}) => {
  const g = new THREE.Group(); g.name = "kettle";
  const steel = pbr({ color: o.color ?? [0.86, 0.85, 0.83], rough: 0.12, metal: 1, peel: 0.2, tile: 0.05, prints: 8 });
  const bake = pbr({ color: [0.04, 0.04, 0.04], rough: 0.45, peel: 0.2, tile: 0.05 });
  g.add(mesh(latheG([[0.001, 0], [0.098, 0], [0.104, 0.008], [0.106, 0.04], [0.1, 0.09], [0.085, 0.12], [0.06, 0.14], [0.05, 0.142]], 56), steel, true, "kettleBody"));
  g.add(mesh(latheG([[0.05, 0.14], [0.052, 0.146], [0.045, 0.158], [0.02, 0.164], [0.001, 0.165]], 40), steel, true, "kettleLid"));
  g.add(mesh(latheG([[0.001, 0.165], [0.014, 0.166], [0.016, 0.176], [0.01, 0.185], [0.001, 0.186]], 20), bake, true, "lidKnob"));
  // spout (a flared tube) + handle arch (black) on two posts
  g.add(mesh(tubeG([[0.085, 0.05, 0], [0.13, 0.085, 0], [0.16, 0.13, 0], [0.175, 0.15, 0]], 0.012, 24, 12), steel, true, "spout"));
  g.add(mesh(tubeG([[-0.06, 0.125, 0], [-0.06, 0.2, 0], [0.0, 0.235, 0], [0.06, 0.2, 0], [0.06, 0.125, 0]], 0.009, 40, 10), bake, true, "handle"));
  return g;
};

// ================================================================ fridge (K-P17)
/** a small white two-door fridge with magnets + a scribbled list (no text); local: footprint centred at x, z = 0, the
 *  front +z, y = 0 the floor. The door hinges on the left (+x side when seen from the front is the handle) */
export const fridge = (o: { w?: number; d?: number; h?: number; color?: C3; seed?: number } = {}) => {
  const W = o.w ?? 0.55, D = o.d ?? 0.6, H = o.h ?? 1.3, R = rng(o.seed ?? 23), g = new THREE.Group(); g.name = "fridge";
  const body = pbr({ color: o.color ?? [0.93, 0.93, 0.91], rough: 0.32, peel: 0.8, tile: 0.25, prints: 12, roughVar: 0.3, clearcoat: 0.2, ccRough: 0.25 });
  const seam = pbr({ color: [0.12, 0.12, 0.13], rough: 0.8, peel: 0 });
  const grey = pbr({ color: [0.55, 0.56, 0.57], rough: 0.4, metal: 0.6, peel: 0 });
  g.add(mesh(rboxG(-W / 2, 0.02, -D / 2, W / 2, H, D / 2 - 0.04, 0.012, 3), body, true, "fridgeCab"));
  const split = H * 0.68;
  g.add(mesh(rboxG(-W / 2 + 0.002, 0.06, D / 2 - 0.045, W / 2 - 0.002, split - 0.004, D / 2, 0.01, 3), body, true, "fridgeDoor"));
  g.add(mesh(rboxG(-W / 2 + 0.002, split + 0.004, D / 2 - 0.045, W / 2 - 0.002, H - 0.004, D / 2, 0.01, 3), body, true, "freezerDoor"));
  g.add(mesh(rboxG(-W / 2 + 0.01, split - 0.004, D / 2 - 0.05, W / 2 - 0.01, split + 0.004, D / 2 - 0.035, 0.002), seam, false));
  g.add(mesh(rboxG(-W / 2 + 0.02, 0.02, D / 2 - 0.05, W / 2 - 0.02, 0.058, D / 2 - 0.035, 0.003), seam, false, "ventGrille"));
  // handles: slim vertical bars on the right edge of each door
  g.add(mesh(rboxG(W / 2 - 0.04, split - 0.32, D / 2, W / 2 - 0.025, split - 0.06, D / 2 + 0.03, 0.006), grey, true));
  g.add(mesh(rboxG(W / 2 - 0.04, split + 0.04, D / 2, W / 2 - 0.025, split + 0.2, D / 2 + 0.03, 0.006), grey, true));
  // magnets: a red disc, a yellow square, a blue star (shapes only), + a paper list under the red disc
  const mag = (c: C3) => pbr({ color: c, rough: 0.3, peel: 0, clearcoat: 0.6, ccRough: 0.15 });
  const zf = D / 2 + 0.001;
  g.add(mesh(at(cylG(0.016, 0.016, 0.008, 24), -0.08, split - 0.1, zf + 0.004, Math.PI / 2), mag([0.8, 0.15, 0.12]), true, "magnetRed"));
  g.add(mesh(rboxC(0.028, 0.028, 0.008, 0.1, split - 0.22, zf + 0.004, 0.003), mag([0.95, 0.74, 0.15]), true, "magnetYellow"));
  {
    const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.008 : 0.019; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
    const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelSize: 0.0015, bevelThickness: 0.0015, bevelSegments: 1 }); sg.translate(-0.05, H - 0.16, zf);
    g.add(mesh(sg, mag([0.2, 0.42, 0.8]), true, "magnetStar"));
  }
  {
    const { cv, g: c } = canvas(256, 360); c.fillStyle = "#f7f4ea"; c.fillRect(0, 0, 256, 360);
    c.strokeStyle = "rgba(120,150,200,0.5)"; c.lineWidth = 1.5; for (let y = 50; y < 360; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
    c.strokeStyle = "#3a3d55"; c.lineWidth = 3.2; c.lineCap = "round";
    for (let y = 72; y < 330; y += 26) { if (R() < 0.12) continue; let x = 22 + R() * 10; c.beginPath(); c.moveTo(x, y - 6); const end = 90 + R() * 130; while (x < end) { x += 6 + R() * 6; c.lineTo(x, y - 6 - R() * 9); x += 4 + R() * 4; c.lineTo(x, y - 2 + R() * 3); } c.stroke(); }
    const pm = canvasMat(cv, { rough: 0.85, side: THREE.DoubleSide });
    const pg = new THREE.PlaneGeometry(0.105, 0.148, 6, 8); const p = pg.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, 0.004 * Math.max(0, -p.getY(i) / 0.074) ** 2 + 0.0015 * Math.sin(p.getX(i) * 60));
    pg.computeVertexNormals(); const pmesh = mesh(pg, pm, true, "list"); pmesh.position.set(-0.075, split - 0.17, zf + 0.0015); pmesh.rotation.z = 0.04; g.add(pmesh);
  }
  g.add(contactBlob(W * 1.3, D * 1.2, 0.6));
  return g;
};

// ================================================================ dish rack, coir mat, coat hook
/** a wire dish rack with 2 plates + an upturned glass + a drip tray; local origin = the centre of its footprint on the worktop */
export const dishRack = () => {
  const g = new THREE.Group(); g.name = "dishRack";
  const wire = pbr({ color: [0.85, 0.85, 0.83], rough: 0.25, metal: 1, peel: 0 });
  const tray = pbr({ color: [0.9, 0.9, 0.88], rough: 0.35, peel: 0.2 });
  const W = 0.4, D = 0.3, ws: THREE.BufferGeometry[] = [];
  g.add(mesh(rboxG(-W / 2 - 0.01, 0, -D / 2 - 0.01, W / 2 + 0.01, 0.012, D / 2 + 0.01, 0.004), tray, true, "dripTray"));
  for (const y of [0.025, 0.11]) ws.push(tubeG([[-W / 2, y, -D / 2], [W / 2, y, -D / 2], [W / 2, y, D / 2], [-W / 2, y, D / 2]], 0.0025, 40, 6, true));
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) ws.push(at(cylG(0.0025, 0.0025, 0.1, 6), x, 0.07, z));
  for (let i = 0; i < 9; i++) { const x = -W / 2 + 0.03 + i * 0.03; ws.push(tubeG([[x, 0.025, -D / 2], [x, 0.09, -D / 2 + 0.02], [x, 0.09, -D / 2 + 0.06], [x, 0.025, -D / 2 + 0.09]], 0.0018, 12, 5)); }
  for (let i = 0; i < 6; i++) ws.push(at(cylG(0.0018, 0.0018, D, 5), -W / 2 + 0.02 + i * 0.07, 0.025, 0, Math.PI / 2));
  g.add(mesh(merge(ws), wire, true, "rackWire"));
  const plateM = pbr({ color: [0.95, 0.94, 0.9], rough: 0.18, peel: 0, clearcoat: 0.8, ccRough: 0.08 });
  for (const [x, a] of [[-0.06, -0.12], [-0.0, -0.08]] as [number, number][]) {
    const p = latheG([[0.001, 0], [0.06, 0], [0.065, 0.004], [0.1, 0.012], [0.112, 0.02], [0.113, 0.022], [0.1, 0.016], [0.064, 0.008], [0.001, 0.006]], 48);
    p.rotateZ(Math.PI / 2); p.rotateY(Math.PI / 2 + a); p.translate(x, 0.14, -D / 2 + 0.055);
    g.add(mesh(p, plateM, true, "plate"));
  }
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.18, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  glassM.customProgramCacheKey = () => "home:thinglass";
  const gl = latheG([[0.001, 0.0], [0.03, 0.0], [0.032, 0.002], [0.036, 0.11], [0.0345, 0.11], [0.0285, 0.004], [0.001, 0.004]], 32);
  gl.rotateX(Math.PI); gl.translate(0.12, 0.135, 0.05);
  const glm = new THREE.Mesh(gl, glassM); glm.castShadow = false; glm.renderOrder = 2; g.add(glm);
  return g;
};
/** a coir door mat (bristle normal, worn centre), local origin = the centre on the floor */
export const coirMat = (o: { w?: number; d?: number } = {}) => {
  const W = o.w ?? 0.62, D = o.d ?? 0.4;
  const m = pbr({ color: [0.52, 0.36, 0.2], rough: 0.95, brushed: true, tile: 0.02, normalScale: 1.2, roughVar: 0.2 });
  const { cv, g } = canvas(256, 192); g.fillStyle = "#c9a477"; g.fillRect(0, 0, 256, 192);
  const R = rng(31); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${R() < 0.5 ? "70,45,20" : "220,190,140"},${0.15 + R() * 0.2})`; g.fillRect(R() * 256, R() * 192, 1 + R() * 2, 3 + R() * 6); }
  const gr = g.createRadialGradient(128, 96, 10, 128, 96, 110); gr.addColorStop(0, "rgba(60,45,30,0.35)"); gr.addColorStop(1, "rgba(60,45,30,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 192);
  g.strokeStyle = "#3b2a1a"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 184);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; m.map = t; m.color.setRGB(1, 1, 1);
  const geo = rboxG(-W / 2, 0, -D / 2, W / 2, 0.014, D / 2, 0.004);
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / W + 0.5, uv.getY(i) / D + 0.5);
  const o2 = mesh(geo, m, false, "coirMat"); o2.add(contactBlob(W * 1.1, D * 1.15, 0.35, -0.0005));
  return o2;
};
/** a wall hook rail with a hanging wool coat + a knitted scarf; local frame: the wall plane z = 0, +z out of the wall,
 *  origin at the rail centre */
export const coatHook = (o: { coat?: C3; scarf?: C3; seed?: number } = {}) => {
  const g = new THREE.Group(); g.name = "coatHook";
  const wood = pbr({ color: [0.45, 0.3, 0.18], rough: 0.5, peel: 0.3, tile: 0.1 });
  const metal = pbr({ color: [0.2, 0.2, 0.2], rough: 0.4, metal: 0.8, peel: 0 });
  g.add(mesh(rboxG(-0.25, -0.04, 0, 0.25, 0.04, 0.02, 0.004), wood, true, "hookRail"));
  for (const x of [-0.16, 0, 0.16]) g.add(mesh(tubeG([[x, 0, 0.02], [x, -0.005, 0.06], [x, 0.02, 0.08], [x, 0.04, 0.075]], 0.005, 16, 8), metal, true));
  // the coat: a lofted sheet hanging from a hook (shoulders bunch, the hem flares), seeded folds
  const R = rng(o.seed ?? 41), U = 28, V = 26, pos: number[] = [], idx: number[] = [], uvs: number[] = [];
  const folds = Array.from({ length: 5 }, () => [2 + R() * 5, R() * 6.28, 0.006 + R() * 0.01]);
  for (let j = 0; j <= V; j++) {
    const v = j / V, y = 0.06 - v * 1.02;
    const wHalf = v < 0.12 ? 0.04 + (v / 0.12) * 0.17 : 0.21 + (v - 0.12) * 0.07;
    const depth = v < 0.12 ? 0.05 + v * 0.3 : 0.085 - v * 0.02;
    for (let i = 0; i <= U; i++) {
      const u = i / U, a = u * Math.PI * 2;
      let x = Math.sin(a) * wHalf, z = 0.075 + Math.cos(a) * depth * 0.5 + depth * 0.5 * 0.2;
      for (const [f, ph, amp] of folds) { const k = amp * Math.min(1, v * 3); x += Math.sin(a * f + ph + v * 2) * k * 0.4; z += Math.cos(a * f * 1.3 + ph) * k; }
      z = Math.max(0.012, z);
      pos.push(x, y, z); uvs.push(u * 1.4, v * 1.05);
    }
  }
  for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) { const a = j * (U + 1) + i, b = a + 1, c = a + U + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); cg.setIndex(idx); cg.computeVertexNormals();
  const wool = pbr({ color: o.coat ?? [0.2, 0.22, 0.3], rough: 0.95, peel: 1.0, tile: 0.015, normalScale: 1.4, side: THREE.DoubleSide });
  const coat = mesh(cg, wool, true, "coat"); coat.position.set(-0.16, 0, 0); g.add(coat);
  // sleeves: two tubes down the front
  for (const sx of [-1, 1]) g.add(mesh(tubeG([[-0.16 + sx * 0.17, -0.1, 0.1], [-0.16 + sx * 0.19, -0.4, 0.11], [-0.16 + sx * 0.17, -0.68, 0.1]], 0.045, 16, 10), wool, true, "sleeve"));
  // the scarf: a long knitted strip draped over the next hook (two hanging tails)
  const knit = pbr({ color: o.scarf ?? [0.78, 0.55, 0.16], rough: 0.95, peel: 1.0, tile: 0.01, normalScale: 1.6, side: THREE.DoubleSide });
  for (const [dz, len] of [[0.0, 0.55], [0.03, 0.62]] as [number, number][]) g.add(mesh(tubeG([[0.0, 0.03, 0.07 + dz], [0.01, -0.1, 0.08 + dz], [-0.01, -len * 0.6, 0.075 + dz], [0.005, -len, 0.08 + dz]], 0.028, 24, 8).scale(1, 1, 0.3), knit, true, "scarf"));
  return g;
};

/** the hood lamp as a CORE practical (spot, shadowed, warm), placed under a hood that was put at `hoodWorld` */
export const hoodLamp = (ctx: KitCtx, pos: V3, target: V3, o: { lumens?: number; kelvin?: number; shadow?: boolean } = {}): Practical | null => {
  if (!ctx.practical) return null;
  return ctx.practical({ kind: "spot", pos, target, kelvin: o.kelvin ?? 2700, lumens: o.lumens ?? 400, angle: 1.05, penumbra: 0.75, shadow: o.shadow ?? true, shadowNear: 0.04, bulb: false, range: 3.2 });
};

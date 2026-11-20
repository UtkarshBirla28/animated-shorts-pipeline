// KIT / HOME: the bright simple test lab props. Every builder returns a Group in its own local frame (documented).
//  - workTable (K-P23): white laminate top (5 mm rounded edge, edge band), steel frame + legs + stretcher, levelling feet
//  - taskBoard: the light-and-button box: grey powder-coated steel, sloped top, ONE big dome lamp (red / green / yellow /
//    off, pure in t, + a small coloured practical), 3 big mushroom push buttons that really press, screws, rubber feet,
//    a cable gland; `cable()` runs its lead across the table, down the leg, along the floor to a wall socket
//  - the glass jars, their pictograms, the TRIES bars and the glass shadow live in jars.ts (second build)
//  - ballSim + redBalls: REAL falling / bouncing / rolling / settling of 5 cm glossy red balls in a jar, simulated ONCE
//    at build time (fixed 1/1200 s steps: gravity, restitution, Coulomb friction, rolling, ball-ball contacts, sleep) and
//    sampled at 240 Hz: positions + rotations are a pure function of t (any sub-frame in any tab is identical)
//  - whiteboard, binderShelf, pinboard (blank: no text), ceilingPanel (rect practical), ballTray, cableCover
import * as THREE from "three";
import type { Built, KitCtx, Practical } from "../core/ctx";
import { surface } from "../surfaces/materials";
import { addDecals } from "../surfaces/decals";
import { pbr, mesh, rboxG, rboxC, at, merge, latheG, tubeG, cylG, canvas, canvasMat, glow, contactBlob, rng, ownEnv, type V3, type C3 } from "./util";

// ================================================================ work table
/** local: footprint centred at the origin, the top surface at y = h, long side along x */
export const workTable = async (ctx: KitCtx, o: { w?: number; d?: number; h?: number; seed?: number; /** top colour value 0..1 (default 0.95) + speckle saturation */ value?: number; sat?: number; rough?: number;
  /** a PLAIN satin top of this colour instead of the speckled laminate (a clean lab bench: the speckle reads as noise under a close lens) */ plain?: C3 } = {}) => {
  const W = o.w ?? 1.8, D = o.d ?? 0.8, H = o.h ?? 0.75, g = new THREE.Group(); g.name = "workTable";
  const top = o.plain ? null : await surface(ctx, "worktop_laminate", { uv: "uv", tint: [1.0, 1.0, 0.99], value: o.value ?? 0.95, sat: o.sat ?? 0.2, rough: o.rough ?? 0.9, macro: { amount: 0.03 }, seed: 29 });
  const plainTop = o.plain ? pbr({ color: o.plain, rough: o.rough ?? 0.5, peel: 0.55, tile: 0.35, roughVar: 0.5, prints: 14, normalScale: 0.35 }) : null;
  g.add(mesh(rboxG(-W / 2, H - 0.028, -D / 2, W / 2, H, D / 2, 0.005, 3), (plainTop ?? top)!, true, "tableTop"));
  if (plainTop) g.add(mesh(rboxG(-W / 2 - 0.0006, H - 0.0285, -D / 2 - 0.0006, W / 2 + 0.0006, H - 0.006, D / 2 + 0.0006, 0.004, 2), pbr({ color: [0.62, 0.63, 0.64], rough: 0.45, peel: 0.4, tile: 0.1 }), false, "tableEdgeBand"));
  if (top) addDecals(top, [
    { type: "stain", at: [0.42, D * 0.18], size: [0.085, 0.085], opacity: 0.35, tint: [0.5, 0.38, 0.26], variant: 1 },     // a faint coffee ring
    { type: "streak", at: [-0.35, -D * 0.25], size: [0.012, 0.09], rot: 1.1, opacity: 0.4, tint: [0.25, 0.3, 0.55] },     // a pen mark
    { type: "wear", at: [0.0, 0.1], size: [0.9, 0.4], opacity: 0.35 },
  ]);
  const frame = pbr({ color: [0.78, 0.79, 0.8], rough: 0.45, peel: 0.9, tile: 0.15, roughVar: 0.3 });
  const fg: THREE.BufferGeometry[] = [];
  const lx = W / 2 - 0.06, lz = D / 2 - 0.06;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) fg.push(rboxG(sx * lx - 0.022, 0.025, sz * lz - 0.022, sx * lx + 0.022, H - 0.028, sz * lz + 0.022, 0.004));
  fg.push(rboxG(-lx, H - 0.1, lz - 0.012, lx, H - 0.028, lz + 0.008, 0.003), rboxG(-lx, H - 0.1, -lz - 0.008, lx, H - 0.028, -lz + 0.012, 0.003));       // aprons
  fg.push(rboxG(-lx - 0.008, H - 0.1, -lz, -lx + 0.012, H - 0.028, lz, 0.003), rboxG(lx - 0.012, H - 0.1, -lz, lx + 0.008, H - 0.028, lz, 0.003));
  fg.push(rboxG(-lx, 0.16, -0.015, lx, 0.19, 0.015, 0.003));                                                                                       // stretcher
  for (const sx of [-1, 1]) fg.push(rboxG(sx * lx - 0.015, 0.16, -lz, sx * lx + 0.015, 0.19, lz, 0.003));
  g.add(mesh(merge(fg), frame, true, "tableFrame"));
  const foot = pbr({ color: [0.08, 0.08, 0.08], rough: 0.8, peel: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { g.add(mesh(at(cylG(0.022, 0.018, 0.025, 16), sx * lx, 0.0125, sz * lz), foot, true)); g.add(contactBlob(0.12, 0.12, 0.5).translateX(sx * lx).translateZ(sz * lz)); }
  g.add(contactBlob(W * 1.05, D * 1.1, 0.25));
  return { object: g, topY: H, top };
};

// ================================================================ the light-and-button task board
export type LampState = 0 | 1 | 2 | 3;              // off, red, green, yellow
export const LAMP_RGB: Record<LampState, C3> = { 0: [0.25, 0.22, 0.2], 1: [1, 0.12, 0.06], 2: [0.15, 1, 0.3], 3: [1, 0.72, 0.08] };
export type TaskBoardOpts = {
  /** lamp colour at film time t */
  lamp?: (t: number) => LampState;
  /** button i press depth 0..1 at film time t (button order: red, green, yellow from left) */
  press?: (i: number, t: number) => number;
  /** the lamp on its own short post beside the box (a signal head on a weighted foot, its lead into the box) instead of
   *  on the box top: local x / z of the post (box frame), lamp height above the table top. A lamp beside the operator
   *  makes her point a sideways arm the lens can read (a lamp in front of her gives a foreshortened arm toward us) */
  mast?: { x: number; z?: number; h: number };
  /** false = no practical light for the lamp (a background board: the light budget is 8 lights per set) */
  light?: boolean;
};
/** local: the box sits on y = 0 (the table top), centred, the buttons toward +z (the operator side) */
export const taskBoard = (ctx: KitCtx, o: TaskBoardOpts = {}) => {
  const g = new THREE.Group(); g.name = "taskBoard";
  const W = 0.4, D = 0.25, Hb = 0.15, Hf = 0.09;
  const paint = pbr({ color: [0.56, 0.58, 0.6], rough: 0.5, peel: 1.2, tile: 0.08, prints: 10, roughVar: 0.4 });
  // the box: a sloped top (low at the operator front +z)
  const sh = new THREE.Shape(); sh.moveTo(-D / 2, 0); sh.lineTo(D / 2, 0); sh.lineTo(D / 2, Hf); sh.lineTo(-D / 2 + 0.03, Hb); sh.lineTo(-D / 2, Hb); sh.closePath();
  const box = new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
  box.rotateY(-Math.PI / 2); box.translate(W / 2, 0.004, 0);           // shape x -> world z, extrude -> world x
  const bu = box.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < bu.count; i++) bu.setXY(i, bu.getX(i), bu.getY(i));
  g.add(mesh(box, paint, true, "boardBox"));
  const slope = Math.atan2(Hb - Hf, D - 0.03);
  const topAt = (z: number) => Hf + ((D / 2 - z) / (D - 0.03)) * (Hb - Hf) + 0.008;     // top surface height at z
  // screws at the corners of the top
  const steel = pbr({ color: [0.7, 0.7, 0.7], rough: 0.3, metal: 1, peel: 0 });
  for (const sx of [-1, 1]) for (const z of [-D / 2 + 0.05, D / 2 - 0.02]) { const s = mesh(at(cylG(0.004, 0.004, 0.002, 12), sx * (W / 2 - 0.02), topAt(z), z), steel, false); s.rotation.x = slope; g.add(s); }
  // rubber feet
  const rub = pbr({ color: [0.05, 0.05, 0.05], rough: 0.9, peel: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(at(cylG(0.012, 0.012, 0.006, 12), sx * (W / 2 - 0.03), 0.003, sz * (D / 2 - 0.03)), rub, false));
  g.add(contactBlob(W * 1.2, D * 1.3, 0.6));
  // THE LAMP: a chrome bezel + a big translucent dome on the high back of the top
  const chrome = pbr({ color: [0.88, 0.88, 0.86], rough: 0.12, metal: 1, peel: 0 });
  const M = o.mast, lx = M ? M.x : 0, lz = M ? M.z ?? 0 : -D / 2 + 0.07, ly = M ? M.h : topAt(lz);
  const lampG = new THREE.Group(); lampG.position.set(lx, ly - 0.004, lz); if (!M) lampG.rotation.x = slope; g.add(lampG);
  if (M) {
    // the post: a weighted round foot, a steel tube, a short housing under the lamp, the lead from the foot into the box
    const dark = pbr({ color: [0.16, 0.17, 0.18], rough: 0.45, peel: 0.6, tile: 0.06 });
    g.add(mesh(latheG([[0.001, 0], [0.055, 0], [0.056, 0.006], [0.05, 0.014], [0.014, 0.018], [0.001, 0.018]], 40), dark, true, "mastFoot"));
    g.children[g.children.length - 1].position.set(lx, 0, lz);
    g.add(mesh(at(cylG(0.0075, 0.0075, ly - 0.05, 16), lx, 0.016 + (ly - 0.05) / 2, lz), steel, true, "mastTube"));
    g.add(mesh(at(cylG(0.05, 0.044, 0.04, 40), lx, ly - 0.024, lz), dark, true, "mastHousing"));
    g.add(contactBlob(0.15, 0.15, 0.55));
    g.children[g.children.length - 1].position.set(lx, 0.0015, lz);
    const sx = Math.sign(lx) || 1;
    g.add(cable([[lx - sx * 0.03, 0.006, lz + 0.02], [lx - sx * 0.08, 0.004, lz + 0.05], [sx * (W / 2 + 0.03), 0.004, 0.04], [sx * (W / 2 - 0.004), 0.03, 0.04]], 0.0032));
  }
  lampG.add(mesh(latheG([[0.001, 0], [0.058, 0], [0.058, 0.012], [0.052, 0.018], [0.046, 0.019], [0.001, 0.019]], 48), chrome, true, "lampBezel"));
  const domeM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.18, transmission: 0, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x000000, emissiveIntensity: 1 });
  domeM.customProgramCacheKey = () => "home:lampdome";
  const dome = mesh(latheG([[0.001, 0.019], [0.045, 0.019], [0.046, 0.03], [0.04, 0.05], [0.026, 0.063], [0.001, 0.068]], 48), domeM, true, "lampDome");
  lampG.add(dome);
  const light: Practical | null = ctx.practical && o.light !== false ? ctx.practical({ kind: "point", pos: [0, 0, 0], color: 0xff2010, lumens: 50, shadow: false, bulb: false, range: 1.4 }) : null;
  if (light) { light.object.position.set(0, 0.045, 0); lampG.add(light.object); light.light.position.set(0, 0, 0); }
  // THE BUTTONS: 3 mushroom heads in collars on the front slope
  const btnCols: C3[] = [[0.82, 0.08, 0.06], [0.08, 0.6, 0.18], [0.95, 0.72, 0.05]];
  const btns: THREE.Group[] = [];
  const bz = D / 2 - 0.07, by = topAt(bz);
  btnCols.forEach((c, i) => {
    const bg = new THREE.Group(); bg.position.set((i - 1) * 0.11, by - 0.004, bz); bg.rotation.x = slope; g.add(bg);
    bg.add(mesh(latheG([[0.001, 0], [0.036, 0], [0.036, 0.008], [0.031, 0.012], [0.026, 0.012], [0.026, 0.004], [0.001, 0.004]], 40), pbr({ color: [0.12, 0.12, 0.13], rough: 0.5, peel: 0 }), true, "collar"));
    const head = new THREE.Group(); bg.add(head);
    head.add(mesh(latheG([[0.001, 0.006], [0.024, 0.006], [0.0245, 0.016], [0.022, 0.024], [0.014, 0.029], [0.001, 0.03]], 40), pbr({ color: c, rough: 0.25, peel: 0, clearcoat: 0.8, ccRough: 0.12, prints: 6 }), true, "button"));
    btns.push(head);
  });
  // cable gland at the back
  g.add(mesh(at(cylG(0.009, 0.011, 0.018, 16), 0.12, 0.03, -D / 2 - 0.006, Math.PI / 2), rub, true, "gland"));
  const lampAt = o.lamp ?? (() => 0 as LampState), pressAt = o.press ?? (() => 0);
  const emi = new THREE.Color();
  return {
    object: g, gland: [0.12, 0.03, -D / 2 - 0.016] as V3, lampLocal: [lx, ly + 0.05, lz] as V3, light,
    update: (t: number) => {
      const s = lampAt(t), c = LAMP_RGB[s];
      emi.setRGB(c[0], c[1], c[2]).multiplyScalar(s ? 2.6 : 0.0);
      const dc: C3 = s ? [c[0] * 0.6 + 0.4, c[1] * 0.6 + 0.4, c[2] * 0.6 + 0.4] : [0.85, 0.83, 0.8];
      domeM.emissive.copy(emi); domeM.color.setRGB(dc[0], dc[1], dc[2]);
      if (light) { (light.light as THREE.PointLight).color.setRGB(c[0], c[1], c[2]); light.set(s ? 1 : 0); }   // set(0) is safe + free (CORE round 3)
      btns.forEach((b, i) => { b.position.y = -0.0055 * pressAt(i, t); });
    },
  };
};
/** a cable through world points (a lead lying on surfaces), black rubber */
export const cable = (pts: V3[], r = 0.0042) => mesh(tubeG(pts, r, Math.max(32, pts.length * 16), 8), pbr({ color: [0.05, 0.05, 0.055], rough: 0.6, peel: 0.3, tile: 0.02 }), true, "cable");
/** a grey taped cable cover across the floor (half-round rubber strip with tape edges), from a to b (world, floor y) */
export const cableCover = (a: V3, b: V3) => {
  const d = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]), L = d.length();
  const g = new THREE.CylinderGeometry(0.035, 0.035, L, 20, 1, false, -Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); g.scale(1, 0.32, 1);
  const m = mesh(g, pbr({ color: [0.42, 0.43, 0.45], rough: 0.85, peel: 0.6, tile: 0.05 }), false, "cableCover");
  const grp = new THREE.Group(); grp.add(m);
  const tape = pbr({ color: [0.62, 0.62, 0.6], rough: 0.7, peel: 0.3, tile: 0.05 });
  for (const s of [-1, 1]) { const t = mesh(rboxC(L, 0.0012, 0.03, 0, 0.0006, s * 0.045, 0.0004), tape, false); grp.add(t); }
  grp.position.set((a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2); grp.rotation.y = -Math.atan2(d.z, d.x);
  return grp;
};

// ================================================================ balls: a real little physics sim, baked once
export type BallDrop = { t: number; from: V3; v?: V3 };
export type JarSpace = { centre: V3; innerR: number; floorY: number; topY: number };
export type BallTrack = { t0: number; hz: number; n: number; pos: Float32Array; quat: Float32Array; firstImpact: number; restAt: number };   // n = FILLED samples
/** simulate balls dropped (each at its own time) into one jar; returns per-ball tracks sampled at `hz` */
export const ballSim = (jar: JarSpace, drops: BallDrop[], o: { r?: number; tEnd?: number; hz?: number; e?: number; eBall?: number; mu?: number; seed?: number; /** the wall also holds a ball whose centre is up to this far ABOVE the rim (m) */ rimGuard?: number;
  /** a SUPPORTED pile (opt-in): when a falling ball hits a ball that has already landed and lies below it, the lower ball
   *  takes only `w` of the impulse (it is held by the wall, the floor and the balls under it; a one-pass solver would
   *  otherwise treat it as a free ball and swallow the bounce), and the hit uses restitution `e` */
  pile?: { w: number; e: number } } = {}): BallTrack[] => {
  const r = o.r ?? 0.025, e = o.e ?? 0.32, eB = o.eBall ?? 0.38, mu = o.mu ?? 0.35, g = 9.81, dt = 1 / 1200, hz = o.hz ?? 240, guard = o.rimGuard ?? 0, pile = o.pile;
  const N = drops.length, t0 = Math.min(...drops.map((d) => d.t)), tEnd = o.tEnd ?? Math.max(...drops.map((d) => d.t)) + 6.0;
  const I = 0.4 * r * r;             // per unit mass
  const P = drops.map((d) => new THREE.Vector3(...d.from)), V = drops.map((d) => new THREE.Vector3(...(d.v ?? [0, 0, 0])));
  const W = drops.map(() => new THREE.Vector3()), Q = drops.map((_, i) => new THREE.Quaternion().setFromEuler(new THREE.Euler(i * 1.3, i * 2.1, i * 0.7)));
  const active = drops.map(() => false), asleep = drops.map(() => false), still = drops.map(() => 0), firstImpact = drops.map(() => -1), restAt = drops.map(() => -1);
  const C = new THREE.Vector3(...jar.centre);
  const steps = Math.ceil((tEnd - t0) / dt), every = Math.round(1 / (hz * dt)), samples = Math.ceil(steps / every) + 2;
  const tracks: BallTrack[] = drops.map(() => ({ t0, hz, n: samples, pos: new Float32Array(samples * 3), quat: new Float32Array(samples * 4), firstImpact: -1, restAt: -1 }));
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), rel = new THREE.Vector3(), nrm = new THREE.Vector3(), wq = new THREE.Quaternion();
  let curT = t0, filled = 0;
  // contact with a static surface (normal n from the surface toward the ball centre), penetration depth pen
  const staticContact = (i: number, n: THREE.Vector3, pen: number) => {
    P[i].addScaledVector(n, pen);
    const vn = V[i].dot(n);
    if (vn < 0) {
      const jn = -(1 + (Math.abs(vn) > 0.15 ? e : 0)) * vn;
      V[i].addScaledVector(n, jn);
      // friction at the contact point: slip = v_t + w x (-n r)
      rel.copy(W[i]).cross(tmp.copy(n).multiplyScalar(-r)).add(V[i]); rel.addScaledVector(n, -rel.dot(n));
      const slip = rel.length();
      if (slip > 1e-6) {
        const k = 1 + (r * r) / I;                     // effective inverse mass of the tangential impulse (unit mass)
        const jt = Math.min(mu * jn, slip / k);
        tmp2.copy(rel).multiplyScalar(-jt / slip);
        V[i].add(tmp2); W[i].add(tmp.copy(n).multiplyScalar(-r).cross(tmp2).multiplyScalar(1 / I));
      }
      if (Math.abs(vn) > 0.25) { if (firstImpact[i] < 0) firstImpact[i] = curT; if (asleep[i]) asleep[i] = false; }
    }
    // rolling resistance + a little air while in contact
    W[i].multiplyScalar(1 - 1.8 * dt); V[i].addScaledVector(n, 0).multiplyScalar(1 - 0.25 * dt);
  };
  for (let s = 0, si = 0; s <= steps; s++) {
    curT = t0 + s * dt;
    for (let i = 0; i < N; i++) if (!active[i] && curT >= drops[i].t) active[i] = true;
    for (let i = 0; i < N; i++) {
      if (!active[i] || asleep[i]) continue;
      V[i].y -= g * dt; P[i].addScaledVector(V[i], dt);
      const wl = W[i].length(); if (wl > 1e-6) { wq.setFromAxisAngle(tmp.copy(W[i]).multiplyScalar(1 / wl), wl * dt); Q[i].premultiply(wq); }
      // jar floor
      const fl = C.y + jar.floorY + r; if (P[i].y < fl) staticContact(i, nrm.set(0, 1, 0), fl - P[i].y);
      // jar wall (inside only, below the rim)
      const dx = P[i].x - C.x, dz = P[i].z - C.z, d = Math.hypot(dx, dz), lim = jar.innerR - r;
      if (d > lim && P[i].y < C.y + jar.topY + guard) staticContact(i, nrm.set(-dx / d, 0, -dz / d), d - lim);
    }
    // ball-ball
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      if (!active[i] || !active[j]) continue;
      tmp.subVectors(P[j], P[i]); const d = tmp.length();
      if (d < 2 * r && d > 1e-6) {
        nrm.copy(tmp).multiplyScalar(1 / d); const pen = 2 * r - d;
        let wi = asleep[i] ? 0 : 1, wj = asleep[j] ? 0 : 1, eHit = eB;
        // the supported pile: the lower ball, if it has landed, is held (see `pile`)
        if (pile) { if (nrm.y > 0.25 && firstImpact[i] >= 0 && wi > 0) { wi = pile.w; eHit = pile.e; } else if (nrm.y < -0.25 && firstImpact[j] >= 0 && wj > 0) { wj = pile.w; eHit = pile.e; } else if (wi === 0 || wj === 0) eHit = pile.e; }
        const ws = wi + wj || 1;
        P[i].addScaledVector(nrm, -pen * (wi / ws)); P[j].addScaledVector(nrm, pen * (wj / ws));
        const vrel = rel.subVectors(V[j], V[i]).dot(nrm);
        if (vrel < 0) {
          const jn = (-(1 + (Math.abs(vrel) > 0.15 ? eHit : 0)) * vrel) / (wi + wj || 1);
          V[i].addScaledVector(nrm, -jn * wi); V[j].addScaledVector(nrm, jn * wj);
          if (Math.abs(vrel) > 0.3) { if (asleep[i]) { asleep[i] = false; } if (asleep[j]) { asleep[j] = false; } if (firstImpact[i] < 0) firstImpact[i] = curT; if (firstImpact[j] < 0) firstImpact[j] = curT; }
          // friction between the two (they roll on each other)
          rel.subVectors(V[j], V[i]).add(tmp2.copy(W[j]).cross(tmp.copy(nrm).multiplyScalar(-r))).sub(tmp2.copy(W[i]).cross(tmp.copy(nrm).multiplyScalar(r)));
          rel.addScaledVector(nrm, -rel.dot(nrm));
          const slip = rel.length();
          if (slip > 1e-6) {
            const jt = Math.min(mu * jn, slip / 7), dir = tmp2.copy(rel).multiplyScalar(1 / slip);
            V[i].addScaledVector(dir, jt * wi); V[j].addScaledVector(dir, -jt * wj);
          }
        }
      }
    }
    // sleep when nearly still in the pile
    for (let i = 0; i < N; i++) {
      if (!active[i] || asleep[i]) continue;
      if (V[i].length() < 0.015 && W[i].length() < 0.5 && P[i].y < C.y + jar.topY) { still[i] += dt; if (still[i] > 0.25) { asleep[i] = true; V[i].set(0, 0, 0); W[i].set(0, 0, 0); if (restAt[i] < 0) restAt[i] = curT; } }
      else still[i] = 0;
    }
    if (s % every === 0 && si < samples) {
      for (let i = 0; i < N; i++) { tracks[i].pos.set([P[i].x, P[i].y, P[i].z], si * 3); tracks[i].quat.set([Q[i].x, Q[i].y, Q[i].z, Q[i].w], si * 4); }
      si++; filled = si;
    }
  }
  tracks.forEach((tr, i) => { tr.firstImpact = firstImpact[i]; tr.restAt = restAt[i]; tr.n = filled; });
  return tracks;
};
/** the red balls of one or more tracks as meshes; hidden before their drop time */
export const redBalls = (_ctx: KitCtx, sets: { tracks: BallTrack[]; drops: BallDrop[] }[], o: { r?: number; color?: C3; env?: THREE.Texture | null; envK?: number } = {}): Built => {
  const r = o.r ?? 0.025, g = new THREE.Group(); g.name = "redBalls";
  // a moulding seam + a tiny dimple so the roll reads
  const { cv, g: c } = canvas(512, 256); c.fillStyle = "#ffffff"; c.fillRect(0, 0, 512, 256);
  c.fillStyle = "rgba(90,10,10,0.55)"; c.fillRect(0, 126, 512, 4);
  // two small paler moulding marks (an injection point + a vent) so the spin reads while a ball rolls and settles
  c.fillStyle = "rgba(255,190,180,0.5)"; c.beginPath(); c.ellipse(128, 70, 9, 9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "rgba(70,5,5,0.5)"; c.beginPath(); c.ellipse(384, 190, 7, 7, 0, 0, Math.PI * 2); c.fill();
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(...(o.color ?? [0.86, 0.06, 0.05]), THREE.SRGBColorSpace), map: tx, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, metalness: 0 });
  m.customProgramCacheKey = () => "home:redball";
  if (o.env) ownEnv(m, o.env, o.envK ?? 1);
  const geo = new THREE.SphereGeometry(r, 48, 28);
  const all: { mesh: THREE.Mesh; tr: BallTrack; d: BallDrop }[] = [];
  for (const s of sets) s.tracks.forEach((tr, i) => { const b = mesh(geo, m, true, "redBall"); g.add(b); all.push({ mesh: b, tr, d: s.drops[i] }); });
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  return { object: g, update: (t) => {
    for (const { mesh: b, tr, d } of all) {
      if (t < d.t) { b.position.set(0, -50, 0); continue; }      // parked out of sight (stays visible: compiled with the set, no mid-shot compile)
      const f = Math.max(0, Math.min(tr.n - 1.0001, (t - tr.t0) * tr.hz)), i = Math.min(Math.floor(f), tr.n - 2), k = Math.min(1, f - i);
      b.position.set(tr.pos[i * 3] + (tr.pos[i * 3 + 3] - tr.pos[i * 3]) * k, tr.pos[i * 3 + 1] + (tr.pos[i * 3 + 4] - tr.pos[i * 3 + 1]) * k, tr.pos[i * 3 + 2] + (tr.pos[i * 3 + 5] - tr.pos[i * 3 + 2]) * k);
      qa.fromArray(tr.quat, i * 4); qb.fromArray(tr.quat, i * 4 + 4); b.quaternion.slerpQuaternions(qa, qb, k);
    }
  } };
};
/** static balls (a tray of spares, one under the table) */
export const staticBalls = (pts: V3[], o: { r?: number } = {}) => {
  const r = o.r ?? 0.025, g = new THREE.Group();
  const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.86, 0.06, 0.05, THREE.SRGBColorSpace), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 });
  m.customProgramCacheKey = () => "home:redball2";
  const geo = new THREE.SphereGeometry(r, 32, 20);
  for (const p of pts) { const b = mesh(geo, m, true, "spareBall"); b.position.set(...p); g.add(b); }
  return g;
};
/** a shallow tray (local origin = its centre on the table) */
export const ballTray = () => {
  const g = new THREE.Group(), m = pbr({ color: [0.9, 0.9, 0.88], rough: 0.4, peel: 0.2 });
  const W = 0.2, D = 0.14, h = 0.022, t = 0.004;
  g.add(mesh(merge([rboxG(-W / 2, 0, -D / 2, W / 2, t, D / 2, 0.002), rboxG(-W / 2, 0, -D / 2, -W / 2 + t, h, D / 2, 0.0015), rboxG(W / 2 - t, 0, -D / 2, W / 2, h, D / 2, 0.0015),
    rboxG(-W / 2, 0, -D / 2, W / 2, h, -D / 2 + t, 0.0015), rboxG(-W / 2, 0, D / 2 - t, W / 2, h, D / 2, 0.0015)]), m, true, "ballTray"));
  g.add(contactBlob(W * 1.3, D * 1.3, 0.45));
  return g;
};

// ================================================================ wall dressing (no text)
/** local: wall plane z = 0, +z out of the wall, origin = the board centre */
export const whiteboard = (o: { w?: number; h?: number; seed?: number } = {}) => {
  const W = o.w ?? 1.5, H = o.h ?? 0.95, g = new THREE.Group(); g.name = "whiteboard";
  const { cv, g: c } = canvas(1024, 640), R = rng(o.seed ?? 81);
  c.fillStyle = "#f8f8f6"; c.fillRect(0, 0, 1024, 640);
  // ghosting of erased marker (soft grey-blue smears, no glyphs)
  for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(${R() < 0.5 ? "90,100,130" : "120,120,120"},${0.025 + R() * 0.04})`; c.beginPath(); c.ellipse(80 + R() * 860, 60 + R() * 520, 40 + R() * 140, 10 + R() * 40, (R() - 0.5) * 0.4, 0, 7); c.fill(); }
  const bm = canvasMat(cv, { rough: 0.12 }); const p = new THREE.MeshPhysicalMaterial({ map: bm.map, roughness: 0.14, clearcoat: 0.8, clearcoatRoughness: 0.06 }); p.customProgramCacheKey = () => "home:wb";
  g.add(mesh(at(new THREE.PlaneGeometry(W, H), 0, 0, 0.012), p, false, "wbSurface"));
  const alu = pbr({ color: [0.78, 0.78, 0.77], rough: 0.3, metal: 1, brushed: true, tile: 0.1 });
  g.add(mesh(merge([rboxG(-W / 2 - 0.02, H / 2, 0, W / 2 + 0.02, H / 2 + 0.02, 0.02, 0.004), rboxG(-W / 2 - 0.02, -H / 2 - 0.02, 0, W / 2 + 0.02, -H / 2, 0.02, 0.004),
    rboxG(-W / 2 - 0.02, -H / 2, 0, -W / 2, H / 2, 0.02, 0.004), rboxG(W / 2, -H / 2, 0, W / 2 + 0.02, H / 2, 0.02, 0.004),
    rboxG(-W * 0.3, -H / 2 - 0.05, 0, W * 0.3, -H / 2 - 0.035, 0.07, 0.003), rboxG(-W * 0.3, -H / 2 - 0.05, 0.06, W * 0.3, -H / 2 - 0.03, 0.07, 0.003)]), alu, true, "wbFrame"));
  const cap = (c: C3) => pbr({ color: c, rough: 0.35, peel: 0 }), barrel = pbr({ color: [0.93, 0.93, 0.92], rough: 0.4, peel: 0 });
  [[0.2, 0.3, 0.7], [0.08, 0.08, 0.09], [0.75, 0.1, 0.08]].forEach((col, i) => {
    const x = -0.18 + i * 0.13;
    g.add(mesh(at(cylG(0.009, 0.009, 0.1, 12), x, -H / 2 - 0.026, 0.04, 0, 0, Math.PI / 2), barrel, true), mesh(at(cylG(0.0095, 0.0095, 0.035, 12), x + 0.06, -H / 2 - 0.026, 0.04, 0, 0, Math.PI / 2), cap(col as C3), true));
  });
  return g;
};
/** a wall shelf with binders (coloured, blank spines: finger hole + an empty label slot). Local: wall plane z = 0, origin
 *  = the shelf top centre */
export const binderShelf = (o: { len?: number; seed?: number } = {}) => {
  const L = o.len ?? 1.2, R = rng(o.seed ?? 91), g = new THREE.Group(); g.name = "binderShelf";
  const board = pbr({ color: [0.93, 0.92, 0.9], rough: 0.5, peel: 0.3, tile: 0.3 }), steel = pbr({ color: [0.3, 0.3, 0.32], rough: 0.4, metal: 0.8, peel: 0 });
  g.add(mesh(rboxG(-L / 2, -0.022, 0, L / 2, 0, 0.3, 0.004), board, true, "shelf"));
  for (const x of [-L / 2 + 0.15, L / 2 - 0.15]) g.add(mesh(merge([rboxG(x - 0.012, -0.2, 0, x + 0.012, -0.022, 0.006, 0.002), rboxG(x - 0.01, -0.035, 0.0, x + 0.01, -0.022, 0.26, 0.002)]), steel, true));
  const cols: C3[] = [[0.16, 0.32, 0.62], [0.75, 0.14, 0.12], [0.18, 0.5, 0.3], [0.95, 0.7, 0.12], [0.25, 0.25, 0.28], [0.16, 0.32, 0.62], [0.55, 0.3, 0.6], [0.9, 0.45, 0.15], [0.16, 0.32, 0.62]];
  let x = -L / 2 + 0.06;
  const slot = pbr({ color: [0.97, 0.97, 0.95], rough: 0.6, peel: 0 }), hole = pbr({ color: [0.02, 0.02, 0.02], rough: 0.9, peel: 0 });
  for (let i = 0; i < cols.length && x < L / 2 - 0.15; i++) {
    const w = R() < 0.3 ? 0.05 : 0.075, hgt = 0.31, lean = i === cols.length - 1 ? 0.18 : 0;
    const bg = new THREE.Group(); bg.position.set(x + w / 2, 0, 0.16); bg.rotation.z = -lean;
    const m = pbr({ color: cols[i], rough: 0.45, peel: 0.6, tile: 0.05, roughVar: 0.4 });
    bg.add(mesh(rboxG(-w / 2, 0, -0.14, w / 2, hgt, 0.14, 0.004), m, true));
    bg.add(mesh(rboxG(-w / 2 + 0.008, hgt * 0.52, 0.1405, w / 2 - 0.008, hgt * 0.82, 0.1425, 0.001), slot, false));
    bg.add(mesh(at(new THREE.CircleGeometry(0.011, 16), 0, hgt * 0.2, 0.1425), hole, false));
    g.add(bg); x += w + 0.004 + (lean ? 0.05 : 0);
  }
  return g;
};
/** a cork pinboard in an aluminium frame with blank sheets, coloured pins and old tape marks; local as the whiteboard */
export const pinboard = (o: { w?: number; h?: number; seed?: number } = {}) => {
  const W = o.w ?? 0.9, H = o.h ?? 0.6, R = rng(o.seed ?? 97), g = new THREE.Group(); g.name = "pinboard";
  const { cv, g: c } = canvas(768, 512); c.fillStyle = "#b48a5c"; c.fillRect(0, 0, 768, 512);
  for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${R() < 0.5 ? "90,60,30" : "220,180,130"},${0.15 + R() * 0.25})`; c.fillRect(R() * 768, R() * 512, 1 + R() * 3, 1 + R() * 3); }
  for (let i = 0; i < 6; i++) { c.fillStyle = "rgba(240,235,210,0.35)"; c.fillRect(R() * 700, R() * 470, 40 + R() * 30, 14); }      // tape marks
  const cm = canvasMat(cv, { rough: 0.95 }); cm.normalMap = null;
  g.add(mesh(at(new THREE.PlaneGeometry(W, H), 0, 0, 0.012), cm, false, "cork"));
  const alu = pbr({ color: [0.78, 0.78, 0.77], rough: 0.3, metal: 1, brushed: true, tile: 0.1 });
  g.add(mesh(merge([rboxG(-W / 2 - 0.015, H / 2, 0, W / 2 + 0.015, H / 2 + 0.015, 0.018, 0.003), rboxG(-W / 2 - 0.015, -H / 2 - 0.015, 0, W / 2 + 0.015, -H / 2, 0.018, 0.003),
    rboxG(-W / 2 - 0.015, -H / 2, 0, -W / 2, H / 2, 0.018, 0.003), rboxG(W / 2, -H / 2, 0, W / 2 + 0.015, H / 2, 0.018, 0.003)]), alu, true));
  const paper = pbr({ color: [0.97, 0.97, 0.95], rough: 0.85, peel: 0, side: THREE.DoubleSide });
  const pinCols: C3[] = [[0.85, 0.1, 0.1], [0.1, 0.4, 0.85], [0.95, 0.75, 0.1], [0.15, 0.6, 0.25]];
  for (let i = 0; i < 3; i++) {
    const pw = 0.18, ph = 0.25, px = -W / 2 + 0.16 + i * 0.27 + (R() - 0.5) * 0.04, py = (R() - 0.5) * 0.12, rot = (R() - 0.5) * 0.12;
    const pg = new THREE.PlaneGeometry(pw, ph, 4, 6); const pp = pg.getAttribute("position") as THREE.BufferAttribute;
    for (let k = 0; k < pp.count; k++) pp.setZ(k, 0.003 * Math.max(0, -pp.getY(k) / (ph / 2)) ** 2);
    pg.computeVertexNormals(); const pm = mesh(pg, paper, true, "sheet"); pm.position.set(px, py, 0.016); pm.rotation.z = rot; g.add(pm);
    g.add(mesh(at(new THREE.SphereGeometry(0.006, 10, 8), px, py + ph / 2 - 0.02, 0.022), pbr({ color: pinCols[i % 4], rough: 0.3, peel: 0 }), true));
  }
  return g;
};
/** a recessed ceiling LED panel (white frame + glowing diffuser) + a rect practical; local origin = the panel centre on
 *  the ceiling plane, facing down */
export const ceilingPanel = (ctx: KitCtx, pos: V3, o: { w?: number; d?: number; lumens?: number; kelvin?: number } = {}) => {
  const W = o.w ?? 0.6, D = o.d ?? 1.2, g = new THREE.Group(); g.name = "ceilingPanel";
  const frame = pbr({ color: [0.95, 0.95, 0.94], rough: 0.4, peel: 0.3 });
  g.add(mesh(merge([rboxG(-W / 2 - 0.02, -0.012, -D / 2 - 0.02, W / 2 + 0.02, 0, -D / 2, 0.003), rboxG(-W / 2 - 0.02, -0.012, D / 2, W / 2 + 0.02, 0, D / 2 + 0.02, 0.003),
    rboxG(-W / 2 - 0.02, -0.012, -D / 2, -W / 2, 0, D / 2, 0.003), rboxG(W / 2, -0.012, -D / 2, W / 2 + 0.02, 0, D / 2, 0.003)]), frame, false, "panelFrame"));
  const diff = new THREE.Mesh(new THREE.PlaneGeometry(W, D), glow([1.0, 0.97, 0.9], 2.2)); diff.rotation.x = Math.PI / 2; diff.position.y = -0.004; g.add(diff);
  g.position.set(...pos);
  let lamp: Practical | null = null;
  if (ctx.practical) { lamp = ctx.practical({ kind: "rect", pos: [pos[0], pos[1] - 0.02, pos[2]], target: [pos[0], 0, pos[2]], size: [W, D], kelvin: o.kelvin ?? 4000, lumens: o.lumens ?? 2500, bulb: false }); }
  return { object: g, lamp };
};

// ================================================================ wall structure (so a wall is never a flat plane)
/** a painted DADO: the lower band of a wall in a deeper colour, built as framed panels (stiles every `bay` m, a recessed
 *  field between them) under a moulded rail. Local: the wall plane z = 0, +z into the room, x from 0 to len, the floor
 *  at y = 0. `gaps` = [x0, x1] spans left open (doors, radiators) */
export const wainscot = (o: { len: number; h?: number; color?: C3; rail?: C3; bay?: number; gaps?: [number, number][]; seed?: number }) => {
  const L = o.len, H = o.h ?? 0.9, bay = o.bay ?? 0.62, g = new THREE.Group(); g.name = "wainscot";
  const paint = pbr({ color: o.color ?? [0.5, 0.6, 0.53], rough: 0.5, peel: 1.0, tile: 0.25, roughVar: 0.35, prints: 3 });
  const railM = pbr({ color: o.rail ?? [0.93, 0.93, 0.9], rough: 0.4, peel: 0.6, tile: 0.2 });
  const spans: [number, number][] = []; let x = 0;
  for (const [a, b] of [...(o.gaps ?? [])].sort((p, q) => p[0] - q[0])) { if (a - x > 0.08) spans.push([x, a]); x = Math.max(x, b); }
  if (L - x > 0.08) spans.push([x, L]);
  const field: THREE.BufferGeometry[] = [], frame: THREE.BufferGeometry[] = [], rail: THREE.BufferGeometry[] = [];
  for (const [a, b] of spans) {
    field.push(rboxG(a, 0.16, 0, b, H - 0.03, 0.006, 0.002));
    const n = Math.max(1, Math.round((b - a) / bay)), w = (b - a) / n;
    for (let i = 0; i <= n; i++) { const sx = a + i * w; frame.push(rboxG(Math.max(a, sx - 0.035), 0.16, 0.004, Math.min(b, sx + 0.035), H - 0.03, 0.016, 0.003)); }
    frame.push(rboxG(a, 0.16, 0.004, b, 0.25, 0.016, 0.003), rboxG(a, H - 0.1, 0.004, b, H - 0.03, 0.016, 0.003));
    rail.push(rboxG(a, H - 0.03, 0, b, H, 0.03, 0.006), rboxG(a, H - 0.045, 0, b, H - 0.03, 0.02, 0.004));
  }
  if (field.length) { g.add(mesh(merge(field), paint, false, "dadoField"), mesh(merge(frame), paint, true, "dadoFrame"), mesh(merge(rail), railM, true, "dadoRail")); }
  return g;
};
/** surface-mounted steel conduit with saddle clips + a socket box (the wiring a lab really has). Local: wall plane z = 0,
 *  +z into the room; pts = the run as wall points [x, y] */
export const conduit = (pts: [number, number][], o: { box?: [number, number] } = {}) => {
  const g = new THREE.Group(); g.name = "conduit";
  const steel = pbr({ color: [0.62, 0.63, 0.64], rough: 0.4, metal: 0.9, brushed: true, tile: 0.08 });
  const gs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    gs.push(at(cylG(0.009, 0.009, len, 10), (x0 + x1) / 2, (y0 + y1) / 2, 0.016, 0, 0, a - Math.PI / 2));
    const n = Math.max(1, Math.floor(len / 0.6));
    for (let k = 0; k < n; k++) { const q = (k + 0.5) / n; gs.push(rboxC(0.03, 0.03, 0.006, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, 0.004, 0.002)); }
  }
  g.add(mesh(merge(gs), steel, true, "conduitRun"));
  if (o.box) g.add(mesh(rboxG(o.box[0] - 0.045, o.box[1] - 0.06, 0, o.box[0] + 0.045, o.box[1] + 0.06, 0.04, 0.005), pbr({ color: [0.9, 0.9, 0.88], rough: 0.4, peel: 0.3 }), true, "socketBox"));
  return g;
};

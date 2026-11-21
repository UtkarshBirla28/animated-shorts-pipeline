// v4 SET ENTRY 'kitchen' (owner LAB; briefs/v3/pointing/V4_STRUCTURE.md). Script v4 line 10: "That's how the cereal ends
// up in the fridge." A NEW morning kitchen (the v3 night kitchen stays parked in ../../sets/kitchen.ts).
// THE PICTURE (one shot, ~3 s): a sunny morning kitchen; someone in pyjamas stands at the OPEN fridge, side-on, staring at
// the bright CEREAL BOX sitting on a fridge shelf (lit by the fridge's own white light). Life: the kettle on the counter
// puffs steam, an orange cat walks along the counter toward it, an upper cupboard door swings slowly on its hinge, the wall
// clock ticks, the sun lies on the floor through the window.
// LAYOUT (metres, Y up; the lens looks toward -Z): the room x -2..2.2, z -2.2..2.6, h 2.6; window in the back wall at
// x 0.9; the counter along the back wall from x -0.2 to 2.2 (kettle at x 1.6); the FRIDGE against the back wall at
// x -1.25 (its door hinged on its left, swung open toward the lens); the person at (-0.55, 0, -1.25) facing the fridge.
// Times: the shot is found by ROLE (lab_plan: the line with "cereal"); the blink on the word "cereal".
// COLOURS: strong candy colours chosen by LAB as stand-ins until LOOK gives a kitchen palette (never beige / grey).
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../../kit/core/ctx";
import { room } from "../../../../kit/surfaces/interior";
import { counterRun, kettle, wallClock, pbr, mesh, rboxG, cylG, at, canvas, contactBlob, type C3 } from "../../../../kit/home";
import type { Beat } from "../../cast/moves";
import { pushRest, type ShotCam } from "../camkit";
import { ROLE, spanOf } from "./lab_plan";
import { KITCHEN_PAL, KITCHEN_LIGHT, KITCHEN_RIG, cerealLook, fridgePool } from "../look";
import { S } from "../timeline";

const KPAL_LAB = {
  wall: [0.36, 0.72, 0.98] as C3, floor: [0.95, 0.55, 0.3] as C3, cabinets: [0.98, 0.84, 0.2] as C3, fridge: [0.95, 0.3, 0.32] as C3,
  fridgeIn: [0.97, 0.97, 0.95] as C3, cat: [0.98, 0.52, 0.14] as C3, trim: [0.97, 0.97, 0.95] as C3,
};
/** LOOK's KITCHEN v2 (the joke is the box: a white fridge, sky-blue cupboards, mint walls) over LAB's stand-ins */
export const KPAL = { ...KPAL_LAB, ...KITCHEN_PAL };
export const KIT = {
  room: { x0: -2.0, z0: -2.2, w: 4.2, d: 4.8, h: 2.6 },
  fridge: { x: -1.25, z: -1.85, w: 0.72, d: 0.66, h: 1.85 },
  // V5 (lead): the cereal box is the FIRST thing the eye lands on (big, bright, square to the lens, centre-left), the
  // person stands BESIDE the fridge's open side (screen right), back at the fridge's front, smaller than the fridge
  person: [-0.4, 0, -1.78] as V3,   // FIX R2: further from the fridge's side wall (it sliced his face as he leaned in)   // beside the fridge at its own depth: the same size as the fridge would make her, so smaller than its door (r12 f800: she stood in front, huge)
  cereal: [-1.3, 1.17, -1.62] as V3,
  shelves: [0.45, 0.82, 1.22],
};
const tryS = (k: string) => { try { return S(k); } catch { return NaN; } };
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: C3, name: string, rough = 0.45) => mesh(rboxG(x0, y0, z0, x1, y1, z1, 0.015, 2), pbr({ color: col, rough, peel: 0.4, clearcoat: 0.3, ccRough: 0.2 }), true, name);

/** the cereal box: a tall bright box with a bowl + flakes picture (no words) */
const cerealBox = () => {
  // 19:45 (lead: "the joke is the box"): a LOUD red box with a big white bowl heaped with orange flakes, a spoon in it,
  // a yellow sunburst behind: reads as a cereal box at phone size; no brand, no text
  const { cv, g: c } = canvas(320, 448);
  c.fillStyle = "#e8202a"; c.fillRect(0, 0, 320, 448);
  c.fillStyle = "#ffd23a"; c.beginPath(); c.arc(160, 210, 120, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#ffb000"; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; c.beginPath(); c.moveTo(160, 210); c.arc(160, 210, 150, a, a + 0.12); c.fill(); }
  for (let i = 0; i < 22; i++) { c.fillStyle = ["#f08a1f", "#c8561a", "#ffb347"][i % 3]; c.beginPath(); c.ellipse(80 + (i % 8) * 23, 250 - Math.floor(i / 8) * 20 + (i % 2) * 6, 17, 10, i, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = "#fbfaf6"; c.beginPath(); c.moveTo(40, 262); c.lineTo(280, 262); c.quadraticCurveTo(270, 360, 160, 366); c.quadraticCurveTo(50, 360, 40, 262); c.fill();
  c.strokeStyle = "#1e2c5c"; c.lineWidth = 9; c.stroke();
  c.strokeStyle = "#d9dde3"; c.lineWidth = 14; c.lineCap = "round"; c.beginPath(); c.moveTo(205, 250); c.lineTo(262, 150); c.stroke();
  c.fillStyle = "#d9dde3"; c.beginPath(); c.ellipse(268, 140, 20, 13, -1.0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#2fa7ff"; c.fillRect(0, 400, 320, 48);
  const T = new THREE.CanvasTexture(cv); T.colorSpace = THREE.SRGBColorSpace;
  const front = new THREE.MeshStandardMaterial({ map: T, roughness: 0.5 }), side = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.62, 0.0), roughness: 0.5 });
  front.customProgramCacheKey = () => "kit4:cereal"; side.customProgramCacheKey = () => "kit4:cerealSide";
  const bx = new THREE.Group(); bx.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.16), [side, side, side, side, front, side]));   // AUDIT R1 #26: a real box with depth
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.012, 0.09), side); flap.position.set(0, 0.25, 0.07); flap.rotation.x = -0.6; bx.add(flap);   // an open top flap
  return bx;
};
/** a simple orange cat (body, head, ears, tail, legs) that walks along +x; local: feet on y = 0 */
const cat = () => {
  const g = new THREE.Group(), fur = pbr({ color: KPAL.cat, rough: 0.7, peel: 0.2 }), dark = pbr({ color: [0.05, 0.05, 0.05], rough: 0.5, peel: 0 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.22, 6, 16), fur); body.rotation.z = Math.PI / 2; body.position.y = 0.17; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), fur); head.position.set(0.19, 0.25, 0); g.add(head);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), fur); ear.position.set(0.2, 0.33, s * 0.04); g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), dark); eye.position.set(0.255, 0.26, s * 0.03); g.add(eye); }
  const legs: THREE.Mesh[] = [];
  for (const [x, z] of [[0.11, 0.04], [0.11, -0.04], [-0.11, 0.04], [-0.11, -0.04]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), fur); l.position.set(x, 0.06, z); g.add(l); legs.push(l); }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.26, 8), fur); tail.position.set(-0.2, 0.26, 0); tail.rotation.z = 0.5; g.add(tail);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.add(contactBlob(0.45, 0.2, 0.45));
  return { object: g, step: (t: number) => { legs.forEach((l, i) => { l.rotation.z = 0.5 * Math.sin(t * 9 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)); }); tail.rotation.z = 0.5 + 0.25 * Math.sin(t * 2.3); body.position.y = 0.17 + 0.006 * Math.abs(Math.sin(t * 9)); } };
};
/** soft steam puffs (additive billboards) rising from a point, looping */
const steam = (n = 7) => {
  const { cv, g: c } = canvas(128, 128); const gr = c.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,0.75)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0.55 }); m.customProgramCacheKey = () => "kit4:steam";
  const g = new THREE.Group(), ps = Array.from({ length: n }, () => { const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); g.add(q); return q; });
  return { object: g, update: (t: number, cam: THREE.Camera) => ps.forEach((q, i) => { const u = (t / 1.6 + i / n) % 1; q.position.set(0.04 * Math.sin(u * 6 + i), u * 0.42, 0.03 * Math.cos(u * 5 + i)); q.quaternion.copy(cam.quaternion); q.scale.setScalar(0.05 + 0.16 * u); (q.material as THREE.MeshBasicMaterial).opacity = 0.55; q.visible = u < 0.95; }) };
};

export const build = async (ctx: KitCtx): Promise<Built> => {
  const t0 = performance.now(), g = new THREE.Group(); g.name = "set:kitchen4";
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  const add = (b: { object: THREE.Object3D; update?: (t: number, cam: THREE.Camera) => void }) => { g.add(b.object); if (b.update) ups.push(b.update); return b; };
  const R = KIT.room;
  const Rm = await room(ctx, { origin: [R.x0, 0, R.z0], w: R.w, d: R.d, h: R.h, thick: 0.2, seed: 17,
    floor: "vinyl_speckled", floorOpts: { tint: KPAL.floor, value: 0.7, sat: 1.4, rough: 0.5 },
    wall: "plaster", wallTint: KPAL.wall, wallOpts: { value: 1.45, sat: 1.25, ao: 0.4, cavity: 0.25, macro: { amount: 0.006 }, dirt: { bottom: 0.05, heightM: 0.2, baseY: 0, grime: 0.004, edge: 0 } },
    windows: [{ wall: "back", at: 0.9 - R.x0, w: 1.1, h: 1.1, sill: 1.05, curtains: [0.98, 0.4, 0.45] }, { wall: "left", at: 1.6, w: 1.2, h: 1.3, sill: 0.9, curtains: false }],
    radiator: false, bounce: 0.16, trimColor: KPAL.trim, lens: { points: [[0.9, 1.8], [0.4, 0.6]] } });
  add(Rm);
  { const fg = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), pbr({ color: [0.3, 0.6, 0.22], rough: 0.95, peel: 0 })); fg.rotation.x = -Math.PI / 2; fg.position.set(0, -0.3, R.z0 - 100.2); g.add(fg); }

  // ---- the counter along the back wall (with wall cabinets), the kettle (steam), a swinging cupboard door
  const run = await counterRun(ctx, { len: 2.4, depth: 0.62, height: 0.9, wallCabs: { y0: 1.5, y1: 2.2, depth: 0.34, skip: [[0.9, 1.6]] }, splashTo: 1.5, doorColor: KPAL.cabinets, seed: 4 });
  run.object.position.set(-0.2, 0, R.z0); g.add(run.object);
  const k = kettle({ color: [0.92, 0.2, 0.2] }); k.position.set(-0.02, 0.9, R.z0 + 0.32); k.rotation.y = -0.6; g.add(k);
  { const st = steam(); st.object.position.set(-0.02 + 0.1, 0.9 + 0.17, R.z0 + 0.32 + 0.12); add(st); }
  { // the loose cupboard door: an upper door on its own hinge (left edge), swinging slowly open and back
    const hinge = new THREE.Group(); hinge.position.set(-1.62, 1.95, R.z0 + 0.36); g.add(hinge);   // V5: the cupboard over the fridge (in frame)
    g.add(box(-1.62, 1.95, R.z0, -0.88, 2.55, R.z0 + 0.34, KPAL.cabinets, "fridgeCupboard"));
    hinge.add(box(0, 0.01, 0, 0.36, 0.59, 0.02, KPAL.cabinets.map((v) => v * 0.92) as C3, "looseDoor"));
    hinge.add(mesh(at(cylG(0.012, 0.012, 0.08, 10), 0.31, 0.1, 0.04), pbr({ color: [0.85, 0.85, 0.84], rough: 0.2, metal: 1, peel: 0 }), true, "knob"));
    ups.push((t) => { hinge.rotation.y = -(0.45 + 0.35 * Math.sin(t * 1.6)); });
  }
  add(await wallClock(ctx, { pos: [-0.45, 2.15, R.z0 + 0.012], yaw: 0, radius: 0.17, rim: [0.2, 0.42, 0.85], time0: 7 * 3600 + 12 * 60 }));

  // ---- THE FRIDGE, open: cabinet, lit white inside, shelves, the cereal box on the middle shelf; the door swung toward the lens
  const F = KIT.fridge, x0 = F.x - F.w / 2, x1 = F.x + F.w / 2, zb = F.z - F.d / 2, zf = F.z + F.d / 2;
  g.add(box(x0, 0.0, zb, x0 + 0.04, F.h, zf, KPAL.fridge, "fridgeL")); g.add(box(x1 - 0.04, 0.0, zb, x1, F.h, zf, KPAL.fridge, "fridgeR"));
  g.add(box(x0, F.h - 0.05, zb, x1, F.h, zf, KPAL.fridge, "fridgeTop")); g.add(box(x0, 0, zb, x1, 0.1, zf, KPAL.fridge, "fridgeFoot")); g.add(box(x0, 0, zb, x1, F.h, zb + 0.03, KPAL.fridge, "fridgeBack"));
  const inner = new THREE.MeshStandardMaterial({ color: new THREE.Color(...KPAL.fridgeIn), emissive: new THREE.Color(0.85, 0.92, 1.0), emissiveIntensity: 0.16,   /* FIX R2: no white glow eating the box */ roughness: 0.4 }); inner.customProgramCacheKey = () => "kit4:fridgeIn";
  g.add(mesh(rboxG(x0 + 0.04, 0.1, zb + 0.03, x1 - 0.04, F.h - 0.05, zb + 0.04, 0.002), inner, false, "fridgeInBack"));
  for (const y of KIT.shelves) g.add(mesh(rboxG(x0 + 0.04, y, zb + 0.04, x1 - 0.04, y + 0.015, zf - 0.03, 0.003), new THREE.MeshStandardMaterial({ color: 0xdff4ff, roughness: 0.1, transparent: true, opacity: 0.6 }), false, "shelf"));
  const cb = cerealBox(); cb.position.set(KIT.cereal[0], KIT.shelves[2] + 0.015 + 0.25, KIT.cereal[2] + 0.02); cb.rotation.y = 0.28; g.add(cb);   // on the TOP shelf (upper third of the frame), turned a little;   // V5: alone on the middle shelf, BIG, square to the lens
  void cerealLook;   // AUDIT R1 #26/#27: no glow (it read as a lightbox / TV)   // LOOK: a soft self-glow (the brightest thing in the frame)
  add(fridgePool(ctx, [KIT.cereal[0], KIT.shelves[0] + 0.1, KIT.cereal[2]]));   // FIX R2: the pool low (it burnt the box white)
  // other fridge contents: a milk carton, jars, a bottle
  g.add(box(x1 - 0.2, 0.515, zb + 0.15, x1 - 0.1, 0.75, zb + 0.25, [0.95, 0.96, 1.0], "milk")); g.add(box(x1 - 0.2, 0.75, zb + 0.15, x1 - 0.1, 0.78, zb + 0.25, [0.2, 0.45, 0.95], "milkTop"));
  for (const [x, c] of [[x1 - 0.18, [0.3, 0.75, 0.3]], [x1 - 0.3, [0.95, 0.3, 0.5]]] as [number, C3][]) g.add(mesh(at(cylG(0.045, 0.045, 0.12, 20), x, KIT.shelves[2] + 0.075, zb + 0.2), pbr({ color: c, rough: 0.3, peel: 0.1, clearcoat: 0.6 }), true, "jar"));
  g.add(mesh(at(cylG(0.035, 0.035, 0.26, 20), x0 + 0.14, KIT.shelves[0] + 0.145, zb + 0.22), pbr({ color: [0.98, 0.6, 0.1], rough: 0.25, peel: 0.1, clearcoat: 0.6 }), true, "juice"));
  const flight = ctx.practical ? ctx.practical({ kind: "point", pos: [F.x, 0.7, F.z + 0.05],   /* fix5: at the top it burnt the box (now on the top shelf) to white */ color: 0xeaf4ff, lumens: KITCHEN_LIGHT.fridgeLumens, shadow: false, bulb: false, range: 2.6 }) : null;
  if (flight) { g.add(flight.object); flight.set(1); }
  { // the door, hinged on the fridge's left front edge, open ~110 deg toward the lens and to the left
    const hinge = new THREE.Group(); hinge.position.set(x0, 0, zf); hinge.rotation.y = -1.9; g.add(hinge);
    hinge.add(box(0, 0.06, -0.05, F.w, F.h - 0.02, 0, KPAL.fridge, "fridgeDoor"));
    hinge.add(mesh(rboxG(0.05, 0.12, -0.07, F.w - 0.05, F.h - 0.1, -0.05, 0.01), inner, false, "doorLiner"));
    for (const y of [0.45, 0.95, 1.35]) hinge.add(box(0.06, y, -0.15, F.w - 0.06, y + 0.12, -0.07, [0.85, 0.95, 1.0], "doorBin"));
    hinge.add(box(F.w - 0.06, 0.8, 0.0, F.w - 0.03, 1.25, 0.03, [0.9, 0.9, 0.9], "handle"));
  }
  // ---- the cat: walks across the front of the room (left to right), one pass through the shot
  const C = cat(); void g;   // AUDIT R1 #26: the cat entered and left cut by the edges and pulled the eye: out
  const [ks, ke] = spanOf("kitchen");
  ups.push((t) => { const a = Number.isFinite(ks) ? ks : 0, b = Number.isFinite(ke) ? ke : a + 3, u = (t - a) / Math.max(1, b - a); C.object.position.set(-1.75 + 1.5 * u, 0, -1.25); C.object.rotation.y = 0;   /* across the floor in front of her, low in the frame (85-93 %) */ C.object.scale.setScalar(1.0);   /* across the floor in front of the person, below the caption band */ C.step(t); });

  // ---- the person in pyjamas (CAST): side-on at the open fridge, staring at the cereal box (CAST's v4 rows)
  try {
    const [{ castCardOf }, MV, { BEATS_V4 }, { R_V4 }] = await Promise.all([import("../../cast/member"), import("../../cast/moves"), import("../../cast/beats_v4"), import("../resolver")]);
    const rows = BEATS_V4.filter((b) => b.who === "pyjamas");
    const cer = tryS("cereal#1"), extra: Beat[] = Number.isFinite(cer) ? [{ who: "pyjamas", m: "face", at: Math.round(cer * 30), until: Math.round(cer * 30) + 6, expr: "tired", still: true } as Beat] : [];
    const timed = MV.timeBeats([...rows, ...extra], R_V4);
    const target: V3 = [KIT.cereal[0], KIT.cereal[1] + 0.05, KIT.cereal[2] + 0.18];
    add(await castCardOf(ctx, "pyjamas", { pos: () => KIT.person, yaw: () => -1.57,   /* V5: side-on to the box: her face is the second thing, the box the first */ aim: () => target, look: () => target, name: "kit4_pyjamas" }, (e) => MV.actBeats("pyjamas", timed, e)));
  } catch (e) { console.warn("kitchen4: CAST not available", e); }

  console.warn(`kit set "kitchen4" (LAB v4) built in ${(performance.now() - t0).toFixed(0)} ms; shot ${ROLE.kitchen ?? "none"}`);
  return { object: g, hints: { shadowCenter: [0, 0, -0.8], shadowExt: 4, probe: [0, 1.4, 0.5], groundAlbedo: [0.8, 0.5, 0.3],
    rigOpts: { ...KITCHEN_RIG } },   // LOOK's kitchen rig
    update: (t, cam) => { Rm.update?.(t, cam); for (const u of ups) u(t, cam); } };
};

/** the kitchen's one shot: wide from the front right, the person side-on at the open fridge, a slow push, then rest */
export const KVIEW = { pos: [-0.92, 1.25, 1.75] as V3, look: [-0.84, 1.05, -1.6] as V3, fov: 47, fnum: 4 };   // FIX R2: the box whole at the left, him clear of the fridge wall
const ROLE_CAMS: Record<string, ShotCam> = { kitchen: pushRest(KVIEW, 0, 20) };   // the push is the director's drift (+0.18): a push of our own ran her off the right edge
export const CAMS: Record<string, ShotCam> = Object.fromEntries(Object.entries(ROLE_CAMS).filter(([r]) => ROLE[r as "kitchen"]).map(([r, c]) => [ROLE[r as "kitchen"]!, c]));

// KIT / HOME: the grey steel apartment front door (K-P18) in its pressed-steel frame: a 45 mm leaf with rounded edges,
// a shallow pressed panel on each face, orange-peel satin paint with kick scuffs at the bottom and fingerprints round the
// lever, 3 butt hinges, a rubber seal in the frame rebate, a worn steel threshold, an overhead door closer (body + arm),
// lever handles on roses (both faces), a lock cylinder with a key + key ring (keys.ts) on the inner face, a peephole
// viewer, and a door chain on the frame. The leaf opens INTO the room by `open(t)` (rad, pure in t).
// Local frame (same as the SURFACES room walls): x along the wall (the hinge jamb at x = 0), y up, z = 0 the inner wall
// face, +z into the room, the wall body z in [-thick, 0]. Place it with the room wall's frame (origin + yaw).
import * as THREE from "three";
import type { Built, KitCtx } from "../core/ctx";
import { pbr, mesh, rboxG, rboxC, at, merge, latheG, tubeG, cylG, rep, roughMap, type V3, type C3 } from "./util";
import { keyRing, type KeyKick } from "./keys";

export type DoorOpts = {
  /** world origin of the wall frame and its yaw (room.ts frames: back 0, front PI, left PI/2, right -PI/2) */
  origin: V3; yaw: number;
  /** the opening's centre along the wall (local x), its size and the wall thickness (match room({ doors, thick })) */
  at: number; w?: number; h?: number; thick?: number;
  /** leaf colour (sRGB) */
  color?: C3;
  /** opening angle (rad) as a function of film time; default closed */
  open?: (t: number) => number;
  /** the keys in the inner lock cylinder (default true) and their swing kicks */
  keys?: boolean; keyKicks?: KeyKick[];
  /** hinge on the left (x0, default) or the right jamb as seen from inside */
  hinge?: "left" | "right";
  seed?: number;
};

export const apartmentDoor = async (ctx: KitCtx, o: DoorOpts): Promise<Built & { leaf: THREE.Group; leverWorld: (t: number) => THREE.Vector3; keysPivot?: THREE.Object3D }> => {
  const W = o.w ?? 0.85, H = o.h ?? 2.0, T = o.thick ?? 0.26, x0 = o.at - W / 2, x1 = o.at + W / 2;
  const root = new THREE.Group(); root.name = "apartmentDoor";
  const paint = pbr({ color: o.color ?? [0.52, 0.55, 0.56], rough: 0.42, peel: 1.0, tile: 0.18, prints: 14, roughVar: 0.35, normalScale: 0.6 });
  // macro wear on the leaf: a canvas over the paint colour (kick scuffs at the bottom, a darker grime band round the lever)
  {
    const S = 512, cv = document.createElement("canvas"); cv.width = 256; cv.height = S; const g = cv.getContext("2d")!;
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, S);
    const gr = g.createLinearGradient(0, S, 0, S * 0.86); gr.addColorStop(0, "rgba(70,62,55,0.55)"); gr.addColorStop(1, "rgba(70,62,55,0)"); g.fillStyle = gr; g.fillRect(0, S * 0.86, 256, S * 0.14);
    let s = (o.seed ?? 3) * 99991; const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(40,36,34,${0.15 + R() * 0.3})`; g.lineWidth = 1 + R() * 2.5; const x = R() * 256, y = S * (0.9 + R() * 0.09); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 40, y + (R() - 0.5) * 8); g.stroke(); }
    const lg = g.createRadialGradient(220, S * 0.5, 4, 220, S * 0.5, 70); lg.addColorStop(0, "rgba(90,80,70,0.3)"); lg.addColorStop(1, "rgba(90,80,70,0)"); g.fillStyle = lg; g.fillRect(140, S * 0.35, 116, S * 0.3);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; paint.map = t; paint.needsUpdate = true;
  }
  const frameM = pbr({ color: [0.42, 0.44, 0.45], rough: 0.45, peel: 1.0, tile: 0.2, roughVar: 0.4 });
  const rubber = pbr({ color: [0.04, 0.04, 0.045], rough: 0.85, peel: 0.4, tile: 0.05 });
  const chrome = pbr({ color: [0.86, 0.86, 0.85], rough: 0.14, metal: 1, peel: 0, prints: 8 });
  const satin = pbr({ color: [0.7, 0.7, 0.68], rough: 0.3, metal: 1, brushed: true, tile: 0.05, prints: 10 });
  const brassM = pbr({ color: [0.75, 0.6, 0.33], rough: 0.3, metal: 1, peel: 0 });
  const dark = pbr({ color: [0.03, 0.03, 0.035], rough: 0.3, peel: 0 });
  // ---- the pressed-steel frame: two jambs + head lining the reveal, with returns on both faces and a stop rebate
  const fw = 0.05, fr = 0.004, frameG: THREE.BufferGeometry[] = [];
  for (const [a, b] of [[x0 - fw, x0], [x1, x1 + fw]] as [number, number][]) {
    frameG.push(rboxG(a, 0, -T - 0.012, b, H + fw, -T + 0.008, fr), rboxG(a, 0, -0.008, b, H + fw, 0.012, fr));                 // face returns
  }
  frameG.push(rboxG(x0 - fw, H, -T - 0.012, x1 + fw, H + fw, -T + 0.008, fr), rboxG(x0 - fw, H, -0.008, x1 + fw, H + fw, 0.012, fr));
  frameG.push(rboxG(x0 - 0.004, 0, -T, x0 + 0.002, H, 0, 0.0015), rboxG(x1 - 0.002, 0, -T, x1 + 0.004, H, 0, 0.0015), rboxG(x0, H - 0.002, -T, x1, H + 0.004, 0, 0.0015));   // reveal linings
  // the stop (a 15 mm rib round the opening at the outer third) the leaf closes against
  frameG.push(rboxG(x0, 0, -0.07, x0 + 0.016, H, -0.045, 0.002), rboxG(x1 - 0.016, 0, -0.07, x1, H, -0.045, 0.002), rboxG(x0, H - 0.016, -0.07, x1, H, -0.045, 0.002));
  root.add(mesh(merge(frameG), frameM, true, "doorFrame"));
  const sealG = [rboxG(x0 + 0.014, 0.01, -0.047, x0 + 0.02, H - 0.018, -0.039, 0.002), rboxG(x1 - 0.02, 0.01, -0.047, x1 - 0.014, H - 0.018, -0.039, 0.002), rboxG(x0 + 0.014, H - 0.02, -0.047, x1 - 0.014, H - 0.014, -0.039, 0.002)];
  root.add(mesh(merge(sealG), rubber, false, "doorSeal"));
  // threshold: a worn steel sill plate (scuffed in the middle)
  const sillM = pbr({ color: [0.6, 0.6, 0.58], rough: 0.35, metal: 1, brushed: true, tile: 0.1, prints: 0 });
  sillM.roughnessMap = rep(roughMap(17, { base: 0.75, var: 0.5, scratches: 120 }), 2, 2);
  root.add(mesh(rboxG(x0 - 0.01, 0, -T, x1 + 0.01, 0.018, 0.03, 0.004), sillM, false, "threshold"));
  // ---- the leaf (pivot at the hinge line on the inner face)
  const hingeLeft = (o.hinge ?? "left") === "left";
  const leaf = new THREE.Group(); leaf.name = "doorLeaf";
  const LW = W - 0.008, LD = 0.045;
  const lx = (x: number) => (hingeLeft ? x : -x);     // leaf-local x from the hinge
  const leafG = [rboxG(Math.min(lx(0.004), lx(LW)), 0.012, -LD, Math.max(lx(0.004), lx(LW)), H - 0.004, 0, 0.006, 3)];
  // pressed panels on both faces: a raised 2 mm field inside a 10 cm border (one tall panel + one short)
  for (const [ya, yb] of [[0.18, 1.3], [1.42, H - 0.18]] as [number, number][]) for (const z of [[0.0, 0.0022], [-LD - 0.0022, -LD]] as [number, number][]) {
    const a = lx(0.11), b = lx(LW - 0.11);
    leafG.push(rboxG(Math.min(a, b), ya, z[0], Math.max(a, b), yb, z[1], 0.0016));
  }
  leaf.add(mesh(merge(leafG), paint, true, "leaf"));
  // hinges (3 butts on the hinge edge)
  for (const y of [0.25, H / 2 + 0.05, H - 0.25]) {
    leaf.add(mesh(at(cylG(0.008, 0.008, 0.1, 16), 0, y, 0.002), satin, true));
    leaf.add(mesh(at(cylG(0.0045, 0.0045, 0.006, 12), 0, y + 0.053, 0.002), satin, false));
  }
  // lever handles (both faces) + roses
  const LY = 1.0, LX = lx(LW - 0.07);
  const leverG = (face: 1 | -1) => {
    const zf = face > 0 ? 0 : -LD, g: THREE.BufferGeometry[] = [];
    const rose = latheG([[0.001, 0], [0.026, 0], [0.026, 0.004], [0.022, 0.01], [0.012, 0.012], [0.001, 0.012]], 32); rose.rotateX(face * Math.PI / 2); rose.translate(LX, LY, zf);
    g.push(rose);
    const neck = cylG(0.0085, 0.0085, 0.05, 16); neck.rotateX(Math.PI / 2); neck.translate(LX, LY, zf + face * 0.035); g.push(neck);
    const dir = hingeLeft ? -1 : 1;           // the lever points toward the hinge
    g.push(tubeG([[LX, LY, zf + face * 0.058], [LX + dir * 0.04, LY + 0.002, zf + face * 0.062], [LX + dir * 0.1, LY - 0.004, zf + face * 0.055], [LX + dir * 0.13, LY - 0.012, zf + face * 0.045]], 0.0095, 24, 12));
    return merge(g);
  };
  leaf.add(mesh(leverG(1), satin, true, "leverIn"), mesh(leverG(-1), satin, true, "leverOut"));
  // lock: a round escutcheon + cylinder below the lever (both faces); the keyway slot dark
  const CY = LY - 0.12;
  for (const face of [1, -1] as const) {
    const zf = face > 0 ? 0 : -LD;
    const esc = latheG([[0.001, 0], [0.022, 0], [0.021, 0.004], [0.016, 0.007], [0.001, 0.007]], 32); esc.rotateX(face * Math.PI / 2); esc.translate(LX, CY, zf);
    leaf.add(mesh(esc, satin, true));
    const cyl = cylG(0.0135, 0.0135, 0.012, 24); cyl.rotateX(Math.PI / 2); cyl.translate(LX, CY, zf + face * 0.01); leaf.add(mesh(cyl, brassM, true));
    leaf.add(mesh(rboxC(0.0025, 0.012, 0.004, LX, CY - 0.001, zf + face * 0.016, 0.0008), dark, false));
  }
  // peephole viewer (inner face: chrome ring + a dark glass lens with a glint)
  {
    const v = latheG([[0.001, 0], [0.011, 0], [0.011, 0.006], [0.007, 0.012], [0.004, 0.012]], 24); v.rotateX(Math.PI / 2); v.translate(lx(LW / 2), 1.5, 0); leaf.add(mesh(v, chrome, true));
    const lensM = new THREE.MeshPhysicalMaterial({ color: 0x101418, roughness: 0.02, metalness: 0, clearcoat: 1 }); lensM.customProgramCacheKey = () => "home:lens";
    leaf.add(mesh(at(new THREE.CircleGeometry(0.0042, 20), lx(LW / 2), 1.5, 0.0122), lensM, false));
  }
  // overhead closer: body on the leaf top (inner face) + an arm to a frame bracket
  {
    const cx0 = lx(0.06), cx1 = lx(0.32);
    leaf.add(mesh(rboxG(Math.min(cx0, cx1), H - 0.11, 0.0, Math.max(cx0, cx1), H - 0.05, 0.055, 0.006), frameM, true, "closer"));
    leaf.add(mesh(at(cylG(0.012, 0.012, 0.018, 16), lx(0.08), H - 0.04, 0.03), satin, true));
  }
  const arm = new THREE.Group(); arm.name = "closerArm";
  arm.add(mesh(rboxC(0.22, 0.012, 0.02, 0.11, 0, 0, 0.004), frameM, true));
  root.add(arm);
  const brX = hingeLeft ? x0 + 0.16 : x1 - 0.16;
  root.add(mesh(rboxG(brX - 0.04, H + 0.005, 0.0, brX + 0.04, H + 0.045, 0.04, 0.004), frameM, true, "closerBracket"));
  // the chain guard: a slide plate on the jamb (latch side) with the chain hanging down (the door is open)
  {
    const jx = hingeLeft ? x1 + 0.025 : x0 - 0.025;
    root.add(mesh(rboxG(jx - 0.014, 1.38, 0.008, jx + 0.014, 1.47, 0.016, 0.003), chrome, true, "chainPlate"));
    const links = new THREE.InstancedMesh(new THREE.TorusGeometry(0.0055, 0.0013, 6, 14), chrome, 18); links.castShadow = true; links.name = "chain";
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < 18; i++) {
      // a hanging catenary-ish line down the jamb face, each link turned 90 deg to the last
      const y = 1.43 - i * 0.0095, sway = 0.003 * Math.sin(i * 0.7);
      q.setFromEuler(new THREE.Euler(0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2));
      m.compose(new THREE.Vector3(jx + sway, y, 0.022), q, new THREE.Vector3(1, 1.25, 1)); links.setMatrixAt(i, m);
    }
    root.add(links);
    root.add(mesh(at(new THREE.SphereGeometry(0.007, 14, 10), jx, 1.43 - 18 * 0.0095 - 0.004, 0.022), chrome, true, "chainKnob"));
  }
  leaf.position.set(hingeLeft ? x0 + 0.004 : x1 - 0.004, 0, 0);
  root.add(leaf);
  // keys in the inner cylinder (a child of the leaf so they swing with it)
  let keysPivot: THREE.Object3D | undefined;
  let keys: (Built & { pivot: THREE.Group }) | null = null;
  if (o.keys !== false) {
    keys = await keyRing(ctx, { pos: [LX, CY, 0.016], yaw: 0, kicks: o.keyKicks, seed: o.seed });
    leaf.add(keys.object); keysPivot = keys.pivot;
  }
  root.position.set(...o.origin); root.rotation.y = o.yaw;
  const openF = o.open ?? (() => 0);
  const tmp = new THREE.Vector3();
  const place = (t: number) => {
    const a = openF(t);
    leaf.rotation.y = hingeLeft ? -a : a;
    // closer arm: from the frame bracket to a point on the leaf top
    const bx = brX, by = H + 0.025, bz = 0.03;
    const p = new THREE.Vector3(lx(0.3), H - 0.04, 0.04).applyAxisAngle(new THREE.Vector3(0, 1, 0), leaf.rotation.y).add(leaf.position);
    arm.position.set(bx, by, bz); const dx = p.x - bx, dz = p.z - bz, L = Math.hypot(dx, dz);
    arm.rotation.set(0, -Math.atan2(dz, dx), 0); arm.scale.set(L / 0.22, 1, 1);
  };
  place(0);
  return {
    object: root, leaf, keysPivot,
    leverWorld: (t: number) => { place(t); root.updateMatrixWorld(true); return tmp.set(LX + (hingeLeft ? -0.06 : 0.06), LY, 0.06).applyMatrix4(leaf.matrixWorld).clone(); },
    update: (t, cam) => { place(t); keys?.update?.(t, cam); },
  };
};

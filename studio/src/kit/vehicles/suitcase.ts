// kit/vehicles (TRAIN owner): K-P27, the big yellow rolling suitcase (the film's hero prop). A 75 cm hard-shell
// spinner: glossy sunflower-yellow polycarbonate (clearcoat), two shell halves round a black zip band with two metal
// pulls and a lock block, 6 vertical ribs front and back, black corner guards, a top carry handle, a side handle, four
// side studs, a two-stage telescopic handle with a push button (extension 0..1 -> grip at 0.80..1.05 m), 4 double
// spinner casters (a housing, a swivelling fork, an axle, two grey tyres with hub caps), a small red luggage tag with a
// blank white card. Scuffs at the bottom edges, a contact shadow. No brand.
// It ROLLS BY ITSELF: give `pos(t)` (and maybe `yaw(t)`) and the wheels turn by the travelled path length, the casters
// trail the travel direction (they keep their last heading when it stops) and shimmy a little at speed, the shell
// shivers, the tag swings. Local frame: the case stands on y = 0, its front faces +Z, width along X.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";
import { contactShadow } from "../props/catalog";
import { parts, rbox, cyl, disc, tube, meshes, dirtKey, sstep } from "./geo";
import { vmat, carEnv, ownEnv } from "./mats";

export type SuitcaseOpts = {
  /** ground point (feet of the case) at film time t */
  pos: V3 | ((t: number) => V3);
  /** yaw (rad) at t (0 = front toward +Z) */
  yaw?: number | ((t: number) => number);
  /** telescopic handle extension 0..1 (default 1 = 1.05 m) */
  handle?: number | ((t: number) => number);
  /** tilt back onto two wheels (rad, about the case's X axis), e.g. while it is rolled over a threshold */
  tilt?: number | ((t: number) => number);
  /** caster swivel (rad) relative to the case (default: trails the travel direction) */
  casters?: (t: number) => number;
  /** the shell colour (default a sunflower yellow tuned to stay YELLOW under the golden rig) */
  color?: THREE.ColorRepresentation;
  /** contact shadow strength (0 = none) */
  contact?: number;
  scale?: number;
  /** true = it lives inside the car: the shell reflects the car's own environment (kit carEnv), not the sky */
  interior?: boolean;
  /** the last film second the path table must cover (default 120) */
  tMax?: number;
  /** metres ROLLED on its own wheels at t. Give it when `pos` also carries a vehicle's motion (a case riding a train
   *  in world coordinates would otherwise spin its wheels with the train); better: mount the case on the train
   *  (trainJP `carFloor(k).add(bag.object)`) and give `pos` in car coordinates */
  rolled?: (t: number) => number;
};
const val = <T,>(v: T | ((t: number) => T) | undefined, t: number, d: T): T => (v === undefined ? d : typeof v === "function" ? (v as (t: number) => T)(t) : v);

export const SUITCASE = { w: 0.5, h: 0.75, d: 0.3, wheelR: 0.032, base: 0.075,
  /** caster pivots in the case's local frame (x, z), order: [-x -z, -x +z, +x -z, +x +z] */
  casters: [[-0.175, -0.09], [-0.175, 0.09], [0.175, -0.09], [0.175, 0.09]] as [number, number][] };

/** the yellow spinner: Built with update(t); `object` is placed / turned / tilted every sub-frame from the opts */
export const suitcase = async (ctx: KitCtx, o: SuitcaseOpts): Promise<Built & {
  root: THREE.Group;
  /** WORLD position of caster i's wheel centre at film time t (for a foot that hooks a wheel) */ wheelWorld: (i: number, t: number) => V3;
  /** ground speed (m/s) at t */ speed: (t: number) => number;
}> => {
  const W = SUITCASE.w, H = SUITCASE.h, Dp = SUITCASE.d, base = SUITCASE.base;          // shell from y = base to H
  const y0 = base, y1 = H, hw = W / 2, hd = Dp / 2;
  const env = o.interior ? carEnv(ctx, 1, 0) : null;
  const shell = new THREE.MeshPhysicalMaterial({ color: o.color ?? "#f6bb08", roughness: 0.32, metalness: 0, clearcoat: o.interior ? 1 : 0.55, clearcoatRoughness: 0.1 });   // deeper sunflower; less white sky sheen outdoors
  if (env) ownEnv(shell, env, 1);
  const dc = { uDirtCol: { value: new THREE.Color("#8d7a3c") }, uDirtRough: { value: 0.7 } };
  shell.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, dc);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aDirt;\nvarying vec2 vDirt;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvDirt = aDirt;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vDirt;\nuniform vec3 uDirtCol;\nuniform float uDirtRough;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = mix( diffuseColor.rgb, uDirtCol, vDirt.x * 0.8 );")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, uDirtRough, vDirt.x );");
  };
  shell.customProgramCacheKey = () => "vehicles:suitcase-shell2";
  shell.name = "veh:suitcase-shell";
  const E = env ? { envMap: env, env: 1 } : {};
  const mats: Record<string, THREE.Material> = {
    shell,
    black: vmat("case-black", { color: "#141516", rough: 0.55, map: "peel", tile: 0.08, normalScale: 0.25, dirtColor: "#3b3731", ...E }),
    zip: vmat("case-zip", { color: "#0c0c0d", rough: 0.8, map: "weave", tile: 0.02, normalScale: 0.6, ...E }),
    alu: vmat("case-alu", { color: "#a3a8ad", rough: 0.4, metal: 1, map: "brush", tile: 0.2, normalScale: 0.15, ...E }),
    tag: vmat("case-tag", { color: "#c62f26", rough: 0.6, map: "peel", tile: 0.05, normalScale: 0.4, ...E }),
    card: vmat("case-card", { color: "#f4f2ec", rough: 0.85, useDirt: false, ...E }),
    tyre: vmat("case-tyre", { color: "#3b3d40", rough: 0.6, dirtColor: "#2a2825", ...E }),
    hub: vmat("case-hub", { color: "#8f9396", rough: 0.4, metal: 0.6, useDirt: false, ...E }),
  };
  const P = parts();
  // ---- the two shell halves (front deeper) round the zip band
  const zipZ = -hd + Dp * 0.42;
  rbox(P, "shell", -hw, y0, zipZ + 0.006, hw, y1, hd, 0.05, 5);
  rbox(P, "shell", -hw, y0, -hd, hw, y1, zipZ - 0.006, 0.05, 5);
  rbox(P, "zip", -hw + 0.008, y0 + 0.008, zipZ - 0.009, hw - 0.008, y1 - 0.008, zipZ + 0.009, 0.04, 3);
  // zip pulls (two, parked together near the top of one side) and the lock block on the top
  for (const dy of [0, 0.04]) { rbox(P, "alu", hw - 0.004, y1 - 0.2 - dy, zipZ - 0.006, hw + 0.006, y1 - 0.17 - dy, zipZ + 0.006, 0.003); rbox(P, "black", hw + 0.002, y1 - 0.23 - dy, zipZ - 0.005, hw + 0.008, y1 - 0.2 - dy, zipZ + 0.005, 0.003); }
  rbox(P, "black", hw - 0.012, y1 - 0.15, zipZ - 0.03, hw + 0.008, y1 - 0.09, zipZ + 0.03, 0.006, 2); rbox(P, "alu", hw + 0.006, y1 - 0.135, zipZ - 0.012, hw + 0.01, y1 - 0.105, zipZ + 0.012, 0.003);
  // ribs: 6 vertical raised ribs, front and back
  for (const side of [1, -1]) for (let i = 0; i < 5; i++) {
    const x = -hw + 0.085 + (i * (W - 0.17)) / 4, z = side > 0 ? hd : -hd;
    rbox(P, "shell", x - 0.019, y0 + 0.075, Math.min(z - 0.016 * side, z + 0.011 * side), x + 0.019, y1 - 0.075, Math.max(z - 0.016 * side, z + 0.011 * side), 0.011, 3);
  }
  // corner guards (black, top and bottom corners)
  for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) {
    const yy = sy ? y1 - 0.06 : y0, zz = sz > 0 ? hd - 0.06 : -hd;
    rbox(P, "black", sx > 0 ? hw - 0.055 : -hw - 0.004, yy, zz - 0.004, sx > 0 ? hw + 0.004 : -hw + 0.055, yy + 0.064, zz + 0.064, 0.022, 3);
  }
  // top carry handle (base pads + a curved grip) and a side handle; four studs on the other side
  for (const sx of [-1, 1]) rbox(P, "black", sx * 0.075 - 0.02, y1 - 0.004, -0.03, sx * 0.075 + 0.02, y1 + 0.016, 0.03, 0.008);
  tube(P, "black", [[-0.07, y1 + 0.012, 0], [-0.055, y1 + 0.04, 0], [0, y1 + 0.046, 0], [0.055, y1 + 0.04, 0], [0.07, y1 + 0.012, 0]], 0.011, 10);
  for (const zz of [0.02, 0.12]) rbox(P, "black", hw - 0.004, y0 + 0.3, zz - 0.02, hw + 0.016, y0 + 0.34, zz + 0.02, 0.008);
  tube(P, "black", [[hw + 0.012, y0 + 0.32, 0.024], [hw + 0.034, y0 + 0.32, 0.045], [hw + 0.038, y0 + 0.32, 0.07], [hw + 0.034, y0 + 0.32, 0.095], [hw + 0.012, y0 + 0.32, 0.116]], 0.01, 10);
  for (const yy of [y0 + 0.1, y1 - 0.1]) for (const zz of [-0.09, 0.09]) disc(P, "black", [-hw - 0.003, yy, zz], [1, 0, 0], 0.011, 0.012, 12);
  // telescopic handle housing on top at the back
  rbox(P, "black", -0.17, y1 - 0.006, -hd + 0.02, 0.17, y1 + 0.014, -hd + 0.07, 0.008);
  // the wheel housings at the four bottom corners
  for (const [cx, cz] of SUITCASE.casters) rbox(P, "black", cx - 0.047, base - 0.014, cz - 0.047, cx + 0.047, base + 0.035, cz + 0.047, 0.016, 3);
  // scuffs: the bottom 8 cm of the shell and the lower corners
  dirtKey(P, "shell", (x, y, z) => sstep(0.13, base, y) * 0.3 + sstep(0.04, 0.0, Math.min(hw - Math.abs(x), hd - Math.abs(z))) * sstep(0.25, base, y) * 0.2);
  dirtKey(P, "black", (_x, y) => sstep(0.12, 0.04, y) * 0.4);
  const body = meshes(P, mats, { name: "suitcase-body" });

  // ---- the telescopic handle (outer tubes fixed length, grip with a button), moved by the extension
  const hP = parts();
  for (const sx of [-0.13, 0.13]) { cyl(hP, "alu", [sx, -0.32, -hd + 0.045], [sx, 0.01, -hd + 0.045], 0.0095, 12); cyl(hP, "alu", [sx, -0.33, -hd + 0.045], [sx, -0.16, -hd + 0.045], 0.0125, 12); }
  rbox(hP, "black", -0.16, 0.0, -hd + 0.025, 0.16, 0.036, -hd + 0.065, 0.015, 3);
  rbox(hP, "alu", -0.022, 0.034, -hd + 0.035, 0.022, 0.04, -hd + 0.055, 0.003);
  const handle = meshes(hP, mats, { name: "suitcase-handle" });

  // ---- the tag: a strap loop from the top handle and a red tag with a white card
  const tP = parts();
  tube(tP, "black", [[0.03, y1 + 0.04, 0], [0.045, y1 + 0.02, 0.01], [0.06, y1 - 0.02, 0.03]], 0.0035, 6);
  rbox(tP, "tag", 0.03, y1 - 0.12, 0.028, 0.1, y1 - 0.02, 0.036, 0.008);
  rbox(tP, "card", 0.04, y1 - 0.105, 0.0362, 0.09, y1 - 0.045, 0.038, 0.002);
  const tag = meshes(tP, mats, { name: "suitcase-tag" });
  const tagPivot = new THREE.Group(); tagPivot.position.set(0.045, y1 + 0.035, 0.0); tag.position.set(-0.045, -(y1 + 0.035), 0); tagPivot.add(tag);

  // ---- casters: a swivelling fork (stem, bridge, two cheeks, an axle) + a double wheel (tyres, hub caps). The wheel
  //      TRAILS the pivot by 2.2 cm (local -Z of the swivel group = the trailing side)
  const TR = 0.022, wy = SUITCASE.wheelR;
  const fP = parts();
  cyl(fP, "alu", [0, 0.071, 0], [0, 0.058, 0], 0.011, 10);
  rbox(fP, "black", -0.024, 0.0645, -TR - 0.014, 0.024, 0.0715, 0.012, 0.003);
  for (const sx of [-1, 1]) rbox(fP, "black", sx * 0.0035 - 0.0035, wy - 0.012, -TR - 0.014, sx * 0.0035 + 0.0035, 0.067, -TR + 0.014, 0.003);
  cyl(fP, "alu", [-0.026, wy, -TR], [0.026, wy, -TR], 0.004, 8);
  const forkGeo = meshes(fP, mats, { name: "caster-fork" });
  const wP = parts();
  for (const sx of [-0.0155, 0.0155]) {
    cyl(wP, "tyre", [sx - 0.0075, 0, 0], [sx + 0.0075, 0, 0], SUITCASE.wheelR, 22);
    cyl(wP, "hub", [sx - 0.0082, 0, 0], [sx + 0.0082, 0, 0], 0.016, 14);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cyl(wP, "black", [sx + Math.sign(sx) * 0.0078, Math.sin(a) * 0.023, Math.cos(a) * 0.023], [sx + Math.sign(sx) * 0.0086, Math.sin(a) * 0.023, Math.cos(a) * 0.023], 0.0035, 6); }
  }
  dirtKey(wP, "tyre", () => 0.3);
  const wheelGeo = meshes(wP, mats, { name: "caster-wheels" });
  const cRoot = new THREE.Group();
  const casters: { yaw: THREE.Group; wheels: THREE.Group }[] = [];
  for (const [cx, cz] of SUITCASE.casters) {
    const yaw = new THREE.Group(); yaw.position.set(cx, 0, cz);
    yaw.add(forkGeo.clone());
    const wheels = wheelGeo.clone(); wheels.position.set(0, wy, -TR); yaw.add(wheels);
    cRoot.add(yaw); casters.push({ yaw, wheels });
  }
  const root = new THREE.Group(); root.name = "suitcase";
  const tiltG = new THREE.Group(); tiltG.add(body, handle, tagPivot, cRoot); root.add(tiltG);
  const cs = contactShadow(W * 1.25, Dp * 1.6, o.contact ?? 0.6); root.add(cs);
  const s = o.scale ?? 1; root.scale.setScalar(s);

  // ---- the path table (pure): path length + the last travel heading at 60 Hz from t = 0
  const DT = 1 / 60, TM = o.tMax ?? 120, n = Math.ceil(TM / DT) + 2;
  const len = new Float32Array(n), head = new Float32Array(n), spd = new Float32Array(n);
  const moving = typeof o.pos === "function";
  if (moving) {
    let prev = val(o.pos, 0, [0, 0, 0] as V3), h = 0;
    for (let i = 1; i < n; i++) {
      const p = val(o.pos, i * DT, prev), dx = p[0] - prev[0], dz = p[2] - prev[2], d = Math.hypot(dx, dz);
      len[i] = len[i - 1] + d; spd[i] = d / DT;
      if (d > 2e-5) h = Math.atan2(dx, dz);
      head[i] = h; prev = p;
    }
  }
  const at = (a: Float32Array, t: number) => { const f = Math.max(0, Math.min(n - 1.001, t / DT)), i = Math.floor(f), u = f - i; return a[i] * (1 - u) + a[i + 1] * u; };
  const headAt = (t: number) => head[Math.max(0, Math.min(n - 1, Math.round(t / DT)))];
  const update = (t: number) => {
    const p = val(o.pos, t, [0, 0, 0] as V3), yaw = val(o.yaw, t, 0), ext = val(o.handle, t, 1), tilt = val(o.tilt, t, 0);
    const v = o.rolled ? Math.abs(o.rolled(t + 0.02) - o.rolled(t - 0.02)) / 0.04 : moving ? at(spd, t) : 0, vk = Math.min(1, v / 0.4);
    root.position.set(p[0], p[1], p[2]); root.rotation.y = yaw;
    // tilt back about the rear wheel line; a rolling case shivers a little (hard wheels on a ribbed floor)
    tiltG.position.set(0, 0, 0); tiltG.rotation.set(0, 0, 0);
    if (Math.abs(tilt) > 1e-4) { const pz = -(hd - 0.06), th = -tilt; tiltG.rotation.x = th; tiltG.position.set(0, pz * Math.sin(th), pz - pz * Math.cos(th)); }
    tiltG.rotation.z = 0.006 * vk * Math.sin(t * 31) + 0.003 * vk * Math.sin(t * 47 + 1);
    tiltG.rotation.x += 0.004 * vk * Math.sin(t * 27 + 0.6);
    handle.position.y = y1 + 0.005 + 0.22 * Math.max(0, Math.min(1, ext));
    // wheels: roll by the path length; casters trail the travel direction (kept when it stops) + a shimmy at speed
    const roll = (o.rolled ? o.rolled(t) : moving ? at(len, t) : 0) / SUITCASE.wheelR;
    const trail = o.casters ? o.casters(t) : headAt(t) - yaw;
    casters.forEach((c, i) => {
      c.yaw.rotation.y = trail + (o.casters ? 0 : 0.14 * vk * Math.sin(t * 19 + i * 1.9));
      c.wheels.rotation.x = roll;
    });
    // the tag swings with the movement + a slow idle sway
    tagPivot.rotation.x = 0.05 * Math.sin(t * 2.1) + Math.min(0.5, v * 0.35) + 0.08 * vk * Math.sin(t * 9);
    tagPivot.rotation.z = 0.04 * Math.sin(t * 1.3 + 1);
  };
  update(0);
  const W3 = new THREE.Vector3();
  return {
    object: root, root, update: (t) => update(t),
    wheelWorld: (i, t) => { update(t); root.updateMatrixWorld(true); casters[i].wheels.getWorldPosition(W3); return [W3.x, W3.y, W3.z]; },
    speed: (t) => (moving ? at(spd, t) : 0),
  };
};

// KIT / SUBWAY: a generic New York "R-type" subway car and a consist of them (no logos, no route signs, no car
// numbers: plain shapes only). B-division size: 18.35 m (60 ft) x 3.02 m, floor at y 0 (platform level), roof crown
// 2.56 m (12 ft above the rail). Local frame: x along the car (centred), y up from the floor, +z = side A (the platform
// side: the side that opens), -z = side B. Four double doors per side (1.27 m openings, leaves slide into pockets), fluted
// stainless lower panels (real ribs: the lamp rows streak across them as the train moves), window gaskets, belt rail,
// eave gutter, curved roof with AC housings, skirt boxes, bogies, end doors + between-car barriers, amber door-indicator
// lamps at the eaves, the conductor's half-cab at the -x end with a DROP-DOWN side window.
// Interior: speckled vinyl floor, blue-grey moulded benches, stainless poles + grab bars, plain pastel ad frames (no
// text), curved ceiling with two LED strips. `selfLit` > 0 gives the interior an emissive term (the station view: no
// lamps inside each car); the camera-inside set (ny_car) uses selfLit 0 + real practicals.
import * as THREE from "three";
import type { KitCtx, V3 } from "../core/ctx";
import { surface } from "../surfaces/materials";
import { Parts } from "./geo";
import { glass, metal, plain, paintedSteel, emissive } from "./mats";
import { posterTex } from "./tex";

export const CAR = { L: 18.35, W: 3.02, HW: 1.51, roof: 2.56, eave: 2.33, sill: -0.52, doors: [-6.86, -2.29, 2.29, 6.86], DW: 1.27, DH: 1.93, gap: 0.62,
  /** local x of the conductor's window centre (side A, -x end) */ condX: -8.55, winY: [0.86, 1.78] as [number, number] };
const HW = CAR.HW, L = CAR.L;

export type CarOpts = { detail?: "near" | "far"; selfLit?: number; seed?: number; cab?: boolean; interior?: boolean };
export type CarBuilt = {
  object: THREE.Group;
  /** 0 shut .. 1 open (side A leaves) */ setDoors: (k: number) => void;
  /** 0 up (closed) .. 1 fully down (the conductor's drop window) */ setWindow: (k: number) => void;
  /** amber door-indicator lamps 0..1 */ setIndicator: (k: number) => void;
  /** materials that should reflect the local environment */ envMats: THREE.Material[];
  mats: Record<string, THREE.Material>;
};

/** the side wall outer face (z = +zf, facing +z * dir) with holes, UV = (x, y) in metres */
const wallGrid = (P: Parts, k: string, holes: { x0: number; x1: number; y0: number; y1: number }[], z: number, dir: 1 | -1, y0 = CAR.sill, y1 = CAR.eave) => {
  const xs = [...new Set([-L / 2, L / 2, ...holes.flatMap((h) => [h.x0, h.x1])])].sort((a, b) => a - b);
  const ys = [...new Set([y0, y1, ...holes.flatMap((h) => [h.y0, h.y1])])].filter((v) => v >= y0 && v <= y1).sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
    if (holes.some((h) => cx > h.x0 && cx < h.x1 && cy > h.y0 && cy < h.y1)) continue;
    const g = new THREE.BufferGeometry(), a = xs[i], b = xs[i + 1], c = ys[j], d = ys[j + 1];
    g.setAttribute("position", new THREE.Float32BufferAttribute([a, c, z, b, c, z, b, d, z, a, d, z], 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, dir, 0, 0, dir, 0, 0, dir, 0, 0, dir], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([a, c, b, c, b, d, a, d], 2));
    g.setIndex(dir > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    P.add(k, g);
  }
};
/** fluted (ribbed) stainless panel along x between xa and xb, y from ya to yb, at z (outward +z), rib pitch p */
const fluted = (P: Parts, k: string, xa: number, xb: number, ya: number, yb: number, z: number, p = 0.058, depth = 0.007) => {
  const prof: [number, number][] = [];
  const n = Math.floor((yb - ya) / p);
  for (let i = 0; i < n; i++) { const y = ya + i * p; prof.push([y, z], [y + p * 0.12, z + depth], [y + p * 0.62, z + depth], [y + p * 0.74, z]); }
  prof.push([ya + n * p, z]);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  prof.forEach(([y, zz], i) => {
    const pr = prof[Math.max(0, i - 1)], nx = prof[Math.min(prof.length - 1, i + 1)];
    let dy = nx[0] - pr[0], dz = nx[1] - pr[1]; const l = Math.hypot(dy, dz) || 1; dy /= l; dz /= l;
    // normal = perpendicular in the y-z plane, pointing +z
    const ny = -dz, nz = dy;
    pos.push(xa, y, zz, xb, y, zz); nor.push(0, ny, nz, 0, ny, nz); uv.push(xa, y, xb, y);
    if (i > 0) { const b = i * 2; idx.push(b - 2, b - 1, b + 1, b - 2, b + 1, b); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  P.add(k, g);
};

/** window holes + door openings of side A (with the cab window) and side B */
const sideHoles = (cab: boolean) => {
  const [wy0, wy1] = CAR.winY, H: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const dx of CAR.doors) H.push({ x0: dx - CAR.DW / 2, x1: dx + CAR.DW / 2, y0: 0.0, y1: CAR.DH });
  for (const s of [-1, 1]) {
    H.push({ x0: s > 0 ? 0.12 : -1.45, x1: s > 0 ? 1.45 : -0.12, y0: wy0, y1: wy1 });
    H.push({ x0: s * 3.1, x1: s * 4.45, y0: wy0, y1: wy1 }); H.push({ x0: s * 4.68, x1: s * 6.03, y0: wy0, y1: wy1 });
  }
  for (const h of H) if (h.x0 > h.x1) { const t = h.x0; h.x0 = h.x1; h.x1 = t; }
  H.push({ x0: 7.75, x1: 8.95, y0: wy0, y1: wy1 });
  if (cab) H.push({ x0: CAR.condX - 0.31, x1: CAR.condX + 0.31, y0: 1.0, y1: wy1 }); else H.push({ x0: -8.95, x1: -7.75, y0: wy0, y1: wy1 });
  return H;
};

export const nyCar = async (ctx: KitCtx, o: CarOpts = {}): Promise<CarBuilt> => {
  const near = (o.detail ?? "near") === "near", cab = o.cab ?? true, selfLit = o.selfLit ?? 0, inside = o.interior ?? true;
  const root = new THREE.Group(); root.name = "ny-car";
  // ---------------- materials
  const steel = await surface(ctx, "steel_brushed", { uv: "uv", tileM: 0.8, tint: [0.86, 0.86, 0.88], rough: 0.9, dirt: { grime: 0.12, bottom: 0.5, heightM: 0.5, baseY: CAR.sill, streaks: 0.15 }, seed: (o.seed ?? 1) + 3 });
  const flute = await surface(ctx, "steel_brushed", { uv: "uv", tileM: 0.8, tint: [0.84, 0.84, 0.86], rough: 0.75, dirt: { grime: 0.18, bottom: 0.9, heightM: 0.6, baseY: CAR.sill }, seed: (o.seed ?? 1) + 5 });
  const innerSteel = metal([0.7, 0.7, 0.71], 0.32);
  const rubber = plain([0.025, 0.025, 0.027], 0.75, 0, "rubber");
  const glz = glass([0.03, 0.035, 0.04], near ? 0.3 : 0.45, "carglass");
  const roof = paintedSteel({ color: [0.32, 0.31, 0.3], rough: 0.7, chips: 0.05, baseY: 2.3, grimeH: 0.3, grime: 0.2, dirt: 0.6, key: "carroof" });
  const under = plain([0.05, 0.048, 0.046], 0.85, 0.2, "under");
  const lit = (c: [number, number, number], rough: number, key: string) => plain(c, rough, 0, key, selfLit > 0 ? { emissive: new THREE.Color(...c), emissiveIntensity: selfLit } : {});
  const floorM = inside && near && selfLit === 0 ? await surface(ctx, "vinyl_speckled", { tint: [0.6, 0.62, 0.66], sat: 0.6, dirt: { grime: 0.18, edge: 0.3 }, wear: { centre: 0.4 } }) : lit([0.36, 0.37, 0.39], 0.6, "carfloor");
  const lining = lit([0.86, 0.84, 0.8], 0.55, "lining");
  const ceil = lit([0.92, 0.91, 0.88], 0.6, "ceil"); ceil.side = THREE.DoubleSide;
  const seat = lit([0.33, 0.41, 0.5], 0.42, "seat");
  const led = emissive([1.0, 0.86, 0.66], 5.5);
  const amber = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.12), toneMapped: false, fog: false });
  const mats: Record<string, THREE.Material> = { steel, flute, innerSteel, rubber, glass: glz, roof, under, floor: floorM, lining, ceil, seat, led, amber };

  // ---------------- body (static parts)
  const P = new Parts();
  const holes = sideHoles(cab);
  wallGrid(P, "steel", holes, HW, 1);
  wallGrid(P, "steel", sideHoles(false), -HW, -1);
  // fluted lower panels between the door openings (both sides), stopping under the windows
  const segs: [number, number][] = []; let x0 = -L / 2 + 0.12;
  for (const dx of CAR.doors) { segs.push([x0, dx - CAR.DW / 2 - 0.05]); x0 = dx + CAR.DW / 2 + 0.05; }
  segs.push([x0, L / 2 - 0.12]);
  for (const [a, b] of segs) { fluted(P, "flute", a, b, -0.42, 0.74, HW + 0.002); if (near) fluted(P, "flute", a, b, -0.42, 0.74, -HW - 0.012); }
  // belt rail, eave gutter, sill
  for (const s of [-1, 1]) {
    const z = s * HW;
    P.box("innerSteel", -L / 2 + 0.05, 0.8, Math.min(z, z + s * 0.02), L / 2 - 0.05, 0.84, Math.max(z, z + s * 0.02), 0.006);
    P.box("innerSteel", -L / 2 + 0.03, 2.31, Math.min(z, z + s * 0.05), L / 2 - 0.03, 2.36, Math.max(z, z + s * 0.05), 0.01);
    P.box("under", -L / 2 + 0.3, -0.56, Math.min(z, z - s * 0.05), L / 2 - 0.3, -0.5, Math.max(z, z - s * 0.05), 0.005);
  }
  // window gaskets + reveals + glass (side A full, side B glass only)
  for (const h of holes) {
    const isDoor = h.y0 < 0.01 && h.y1 > 1.9, isCabWin = cab && Math.abs((h.x0 + h.x1) / 2 - CAR.condX) < 0.05;
    const r = 0.03;
    if (!isDoor) {
      P.box("rubber", h.x0 - r, h.y0 - r, HW - 0.01, h.x1 + r, h.y0 + 0.005, HW + 0.012, 0.01);
      P.box("rubber", h.x0 - r, h.y1 - 0.005, HW - 0.01, h.x1 + r, h.y1 + r, HW + 0.012, 0.01);
      P.box("rubber", h.x0 - r, h.y0, HW - 0.01, h.x0 + 0.005, h.y1, HW + 0.012, 0.01);
      P.box("rubber", h.x1 - 0.005, h.y0, HW - 0.01, h.x1 + r, h.y1, HW + 0.012, 0.01);
      if (!isCabWin) P.quad("glass", [h.x0, h.y0, HW - 0.035], [h.x1, h.y0, HW - 0.035], [h.x1, h.y1, HW - 0.035], [h.x0, h.y1, HW - 0.035]);
      // reveal faces (top / bottom / sides) between the skin and the lining
      P.quad("innerSteel", [h.x0, h.y0, HW], [h.x1, h.y0, HW], [h.x1, h.y0, HW - 0.09], [h.x0, h.y0, HW - 0.09]);
      P.quad("innerSteel", [h.x0, h.y1, HW - 0.09], [h.x1, h.y1, HW - 0.09], [h.x1, h.y1, HW], [h.x0, h.y1, HW]);
    } else {
      // door frame trim (stainless, proud) + rubber jamb seals + the threshold plate
      P.box("innerSteel", h.x0 - 0.06, 0, HW - 0.01, h.x0, h.y1 + 0.06, HW + 0.014, 0.006);
      P.box("innerSteel", h.x1, 0, HW - 0.01, h.x1 + 0.06, h.y1 + 0.06, HW + 0.014, 0.006);
      P.box("innerSteel", h.x0 - 0.06, h.y1, HW - 0.01, h.x1 + 0.06, h.y1 + 0.06, HW + 0.014, 0.006);
      P.box("rubber", h.x0, 0.02, HW - 0.09, h.x0 + 0.025, h.y1, HW - 0.01, 0.008);
      P.box("rubber", h.x1 - 0.025, 0.02, HW - 0.09, h.x1, h.y1, HW - 0.01, 0.008);
      P.box("innerSteel", h.x0, -0.005, HW - 0.12, h.x1, 0.012, HW + 0.02, 0.004);
      P.quad("innerSteel", [h.x0, h.y1, HW - 0.09], [h.x1, h.y1, HW - 0.09], [h.x1, h.y1, HW], [h.x0, h.y1, HW]);
      P.quad("glass", [h.x0, 0.98, -HW + 0.04], [h.x1, 0.98, -HW + 0.04], [h.x1, 1.86, -HW + 0.04], [h.x0, 1.86, -HW + 0.04]);
    }
  }
  // side B glass (windows)
  for (const h of sideHoles(false)) if (!(h.y0 < 0.01 && h.y1 > 1.9)) P.quad("glass", [h.x1, h.y0, -HW + 0.035], [h.x0, h.y0, -HW + 0.035], [h.x0, h.y1, -HW + 0.035], [h.x1, h.y1, -HW + 0.035]);
  // panel seams (thin dark lines) on side A between windows + rivet-like dots at the belt
  for (const sx of [-7.4, -6.1, -2.95, -1.55, 0, 1.55, 2.95, 6.1, 7.4]) P.box("rubber", sx - 0.003, 0.84, HW - 0.002, sx + 0.003, 2.3, HW + 0.003, 0);
  // roof (curved), AC housings, ends
  const Rr = (HW * HW + 0.23 * 0.23) / (2 * 0.23), th = Math.asin(HW / Rr);
  // CylinderGeometry: axis Y, theta 0 = +z; theta -PI/2 (-x) becomes +y after rotateZ(-PI/2) (axis -> x)
  const rg = new THREE.CylinderGeometry(Rr, Rr, L - 0.04, 24, 1, true, -Math.PI / 2 - th, 2 * th);
  rg.rotateZ(-Math.PI / 2); rg.translate(0, CAR.roof - Rr, 0);
  P.add("roof", rg);
  for (const ax of [-5.2, 4.6]) { P.box("roof", ax - 1.1, 2.45, -0.85, ax + 1.1, 2.78, 0.85, 0.04); for (let k = 0; k < 9; k++) P.box("under", ax - 0.9 + k * 0.22, 2.6, 0.86, ax - 0.84 + k * 0.22, 2.74, 0.865, 0); }
  // ends: end walls with an end door window, between-car barriers (side A)
  for (const s of [-1, 1]) {
    const x = s * (L / 2 - 0.01);
    P.quad("steel", [x, CAR.sill, s * HW], [x, CAR.sill, -s * HW], [x, CAR.eave, -s * HW], [x, CAR.eave, s * HW]);
    if (inside) { const xi = s * (L / 2 - 0.07); P.quad("lining", [xi, 0, -s * (HW - 0.09)], [xi, 0, s * (HW - 0.09)], [xi, 2.02, s * (HW - 0.09)], [xi, 2.02, -s * (HW - 0.09)]); }
    P.box("rubber", x - 0.02, 0.95, -0.36, x + 0.02, 1.75, 0.36, 0.01);
    P.box("innerSteel", x + s * 0.0, 0.5, HW - 0.12, x + s * 0.32, 0.53, HW - 0.09, 0.004);
    for (const by of [0.0, 0.32]) P.box("innerSteel", x + s * (0.06 + by * 0.6), -0.1, HW - 0.12, x + s * (0.085 + by * 0.6), 1.15, HW - 0.095, 0.004);
  }
  // under-floor: skirt boxes + bogies (rarely seen; low detail)
  for (const bx of [-3.5, 0.5, 3.8]) P.box("under", bx - 1.0, -0.98, -1.05, bx + 1.0, -0.42, 1.05, 0.02);
  for (const bx of [-6.4, 6.4]) {
    P.box("under", bx - 1.3, -0.92, -1.0, bx + 1.3, -0.62, 1.0, 0.03);
    for (const wx of [-0.95, 0.95]) for (const wz of [-0.72, 0.72]) P.cyl("under", [bx + wx, -0.8, wz - 0.06], [bx + wx, -0.8, wz + 0.06], 0.42, 18);
  }
  // amber door-indicator lamps (separate material: they light when the doors are open)
  for (const s of [-1, 1]) { const g = new THREE.SphereGeometry(0.035, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.rotateX(Math.PI / 2); g.translate(s * (L / 2 - 0.45), 2.2, HW + 0.005); P.add("amber", g); }

  // ---------------- interior
  if (inside) {
    P.quad("floor", [-L / 2 + 0.05, 0, HW - 0.09], [L / 2 - 0.05, 0, HW - 0.09], [L / 2 - 0.05, 0, -HW + 0.09], [-L / 2 + 0.05, 0, -HW + 0.09]);
    // linings (inner faces with the same holes)
    wallGrid(P, "lining", holes, HW - 0.09, -1, 0, 2.02);
    wallGrid(P, "lining", sideHoles(false), -HW + 0.09, 1, 0, 2.02);
    for (const h of holes) if (!(h.y0 < 0.01 && h.y1 > 1.9)) {
      P.quad("innerSteel", [h.x0, h.y0, HW], [h.x0, h.y0, HW - 0.09], [h.x0, h.y1, HW - 0.09], [h.x0, h.y1, HW]);
      P.quad("innerSteel", [h.x1, h.y0, HW - 0.09], [h.x1, h.y0, HW], [h.x1, h.y1, HW], [h.x1, h.y1, HW - 0.09]);
    } else {
      P.quad("lining", [h.x0, 0, HW], [h.x0, 0, HW - 0.09], [h.x0, h.y1, HW - 0.09], [h.x0, h.y1, HW]);
      P.quad("lining", [h.x1, 0, HW - 0.09], [h.x1, 0, HW], [h.x1, h.y1, HW], [h.x1, h.y1, HW - 0.09]);
    }
    // ceiling: a shallow curved panel + the two LED strips + diffuser trims
    const ct = Math.asin((HW - 0.09) / 4.2);
    const cg = new THREE.CylinderGeometry(4.2, 4.2, L - 0.1, 18, 1, true, -Math.PI / 2 - ct, 2 * ct);
    cg.rotateZ(-Math.PI / 2); cg.translate(0, 2.27 - 4.2, 0);
    P.add("ceil", cg);
    for (const s of [-1, 1]) {
      P.box("led", -L / 2 + 0.6, 2.2, s * 0.62 - 0.06, L / 2 - 0.6, 2.22, s * 0.62 + 0.06, 0);
      P.box("innerSteel", -L / 2 + 0.6, 2.2, s * 0.62 - 0.085, L / 2 - 0.6, 2.235, s * 0.62 - 0.06, 0.003);
      P.box("innerSteel", -L / 2 + 0.6, 2.2, s * 0.62 + 0.06, L / 2 - 0.6, 2.235, s * 0.62 + 0.085, 0.003);
    }
    // benches between the doors (both sides), stanchions at the bench ends, grab bars above
    const benches: [number, number][] = [[-5.98, -3.17], [-1.4, 1.4], [3.17, 5.98], [cab ? -8.05 : -8.9, -7.75], [7.75, 8.9]];
    for (const [a, b] of benches) for (const s of [-1, 1]) {
      if (cab && s > 0 && a < -7) continue;
      const zw = s * (HW - 0.09), zi = s * (HW - 0.52);
      const n = Math.max(1, Math.round((b - a) / 0.46));
      for (let k = 0; k < n; k++) {
        const xa = a + ((b - a) * k) / n + 0.01, xb = a + ((b - a) * (k + 1)) / n - 0.01;
        P.box("seat", xa, 0.4, Math.min(zw, zi), xb, 0.46, Math.max(zw, zi), 0.03);
        P.box("seat", xa, 0.46, Math.min(zw, zw - s * 0.07), xb, 0.92, Math.max(zw, zw - s * 0.07), 0.03);
      }
      P.box("seat", a, 0.08, Math.min(zw, zi + s * 0.06), b, 0.4, Math.max(zw, zi + s * 0.06), 0.02);
      P.cyl("innerSteel", [a - 0.03, 0, zi + s * 0.02], [a - 0.03, 1.98, zi + s * 0.02], 0.019);
      P.cyl("innerSteel", [b + 0.03, 0, zi + s * 0.02], [b + 0.03, 1.98, zi + s * 0.02], 0.019);
      P.cyl("innerSteel", [a - 0.03, 1.98, zi + s * 0.02], [b + 0.03, 1.98, zi + s * 0.02], 0.016);
    }
    // centre poles in the doorways
    for (const dx of CAR.doors) P.cyl("innerSteel", [dx, 0, 0], [dx, 2.24, 0], 0.02);
    // ad frames above the windows (posters are separate meshes: per-poster textures)
    // the cab partition (-x end, side A half) with its door window
    if (cab) {
      P.box("lining", -L / 2 + 0.95, 0, 0.02, -L / 2 + 0.98, 2.02, HW - 0.09, 0.005);
      P.box("lining", -L / 2 + 0.05, 0, -0.01, -L / 2 + 0.95, 2.02, 0.02, 0.005);
      P.box("rubber", -L / 2 + 0.94, 1.2, 0.3, -L / 2 + 0.99, 1.7, 0.9, 0.01);
    }
  }
  const body = P.build(mats, { cast: (k) => k !== "glass" && k !== "led" && k !== "amber" && k !== "ceil", name: "car-body" });
  for (const ch of body.children) { if ((ch as THREE.Mesh).material === glz) { ch.renderOrder = 2; } }
  root.add(body);

  // posters (plain pastel, no text) in frames above the windows, both sides
  if (inside && near) {
    let pi = (o.seed ?? 1) * 3;
    for (const s of [-1, 1]) for (const px of [-5.3, -3.9, -0.7, 0.7, 3.9, 5.3]) {
      const pm = new THREE.MeshStandardMaterial({ map: posterTex(pi++ % 5), roughness: 0.35, ...(selfLit > 0 ? { emissive: 0xffffff, emissiveMap: posterTex((pi - 1) % 5), emissiveIntensity: selfLit * 0.9 } : {}) });
      pm.customProgramCacheKey = () => "subway:poster" + (selfLit > 0 ? "L" : "");
      const pg = new THREE.PlaneGeometry(0.62, 0.21); const mesh = new THREE.Mesh(pg, pm);
      mesh.position.set(px, 1.92, s * (HW - 0.097)); mesh.rotation.y = s > 0 ? Math.PI : 0; mesh.receiveShadow = true; root.add(mesh);
    }
  }

  // ---------------- door leaves (side A): all left leaves move together, all right leaves together
  const leaves: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const LP = new Parts(), lw = CAR.DW / 2;
    for (const dx of CAR.doors) {
      const xa = side < 0 ? dx - lw : dx, xb = side < 0 ? dx : dx + lw, z0 = HW - 0.065, z1 = HW - 0.035;
      const wx0 = (xa + xb) / 2 - 0.2, wx1 = (xa + xb) / 2 + 0.2, wy0 = 0.98, wy1 = 1.86;
      LP.box("steel", xa, 0.012, z0, xb, wy0, z1, 0.004); LP.box("steel", xa, wy1, z0, xb, CAR.DH, z1, 0.004);
      LP.box("steel", xa, wy0, z0, wx0, wy1, z1, 0.004); LP.box("steel", wx1, wy0, z0, xb, wy1, z1, 0.004);
      LP.box("rubber", wx0 - 0.015, wy0 - 0.015, z1 - 0.004, wx1 + 0.015, wy0, z1 + 0.006, 0.004);
      LP.box("rubber", wx0 - 0.015, wy1, z1 - 0.004, wx1 + 0.015, wy1 + 0.015, z1 + 0.006, 0.004);
      LP.box("rubber", wx0 - 0.015, wy0, z1 - 0.004, wx0, wy1, z1 + 0.006, 0.004); LP.box("rubber", wx1, wy0, z1 - 0.004, wx1 + 0.015, wy1, z1 + 0.006, 0.004);
      LP.quad("glass", [wx0, wy0, z0 + 0.012], [wx1, wy0, z0 + 0.012], [wx1, wy1, z0 + 0.012], [wx0, wy1, z0 + 0.012]);
      // the meeting-edge rubber nosing
      const ex = side < 0 ? xb - 0.02 : xa; LP.box("rubber", ex, 0.012, z0 - 0.005, ex + 0.02, CAR.DH, z1 + 0.008, 0.008);
    }
    const lg = LP.build(mats, { cast: (k) => k !== "glass", name: side < 0 ? "leaves-L" : "leaves-R" });
    root.add(lg); leaves.push(lg);
  }
  // ---------------- the conductor's drop window sash (glass in a frame, slides down into the wall)
  const sash = new THREE.Group(); sash.name = "drop-window";
  if (cab) {
    const SP = new Parts(), cx = CAR.condX;
    SP.box("innerSteel", cx - 0.31, 1.0, HW - 0.05, cx + 0.31, 1.03, HW - 0.03, 0.004);
    SP.box("innerSteel", cx - 0.31, CAR.winY[1] - 0.03, HW - 0.05, cx + 0.31, CAR.winY[1], HW - 0.03, 0.004);
    SP.quad("glass", [cx - 0.3, 1.03, HW - 0.04], [cx + 0.3, 1.03, HW - 0.04], [cx + 0.3, CAR.winY[1] - 0.03, HW - 0.04], [cx - 0.3, CAR.winY[1] - 0.03, HW - 0.04]);
    sash.add(SP.build(mats, { cast: (k) => k !== "glass", name: "sash" }));
    root.add(sash);
  }
  const setDoors = (k: number) => { const e = Math.max(0, Math.min(1, k)), d = e * (CAR.DW / 2 - 0.03); leaves[0].position.x = -d; leaves[1].position.x = d; };
  const setWindow = (k: number) => { sash.position.y = -Math.max(0, Math.min(1, k)) * 0.74; };
  const setIndicator = (k: number) => { amber.color.setRGB(1, 0.55, 0.12).multiplyScalar(0.15 + 7 * Math.max(0, Math.min(1, k))); };
  setIndicator(0);
  root.traverse((ob) => { const m = ob as THREE.Mesh; if (m.isMesh) m.userData.kitModule = "train"; });
  return { object: root, setDoors, setWindow, setIndicator, envMats: [steel, flute, innerSteel, glz], mats };
};

export type TrainOpts = {
  /** number of cars and the index of the car with the conductor's cab (its +x end) */
  cars?: number; condCar?: number;
  /** world z of the car centreline, y of the car floor */
  z?: number; y?: number;
  selfLit?: number;
  /** which cars get the near (full) detail: within this many cars of the conductor's car */
  nearCars?: number;
};
/** a consist along world X; `place(x)` puts the conductor's window centre at world x (the train moves by x) */
export const nyTrain = async (ctx: KitCtx, o: TrainOpts = {}) => {
  const n = o.cars ?? 5, k = o.condCar ?? 2, pitch = CAR.L + CAR.gap, near = o.nearCars ?? 1;
  const G = new THREE.Group(); G.name = "ny-train";
  const cars: CarBuilt[] = [];
  for (let i = 0; i < n; i++) {
    const c = await nyCar(ctx, { detail: Math.abs(i - k) <= near ? "near" : "far", selfLit: o.selfLit ?? 0.55, seed: i + 1, cab: i === k, interior: true });
    c.object.position.set((i - k) * pitch - CAR.condX, o.y ?? 0, 0);
    G.add(c.object); cars.push(c);
  }
  G.position.z = o.z ?? -1.63;
  const place = (x: number) => { G.position.x = x; };
  const envMats = cars.flatMap((c) => c.envMats);
  return { object: G, cars, place, envMats, cond: cars[k], pitch,
    /** world x of the conductor's window at train position x */ condWorldX: (x: number) => x };
};
export type NyTrain = Awaited<ReturnType<typeof nyTrain>>;
export const carHalfWidth = HW;
export const trainZ = (zEdge: number, gap = 0.12) => zEdge - gap - HW;
export type { V3 };

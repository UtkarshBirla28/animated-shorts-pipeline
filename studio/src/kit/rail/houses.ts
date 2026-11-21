// Lineside Tokyo suburbs (STATION owner): rows of 2-storey detached houses (siding / render walls, aluminium windows,
// pitched grey-tile or slate roofs, a small balcony) and 3-5 storey apartment blocks ("mansions": a concrete balcony on
// every floor along the facade, frosted railing panels, sliding glass doors, outdoor AC units, a rooftop water tank) with
// LAUNDRY that flaps in the wind. Built from a handful of SHARED materials (merged geometry per row: ~12 draw calls a
// row, no per-house programs: SURFACES' building() made ~20 materials a house = a 50 s shader compile per set). Rows run
// along Z; the main facade faces the track. Windows: dark sky-reflecting glass over a seeded curtain / blind / lamp atlas.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { KitCtx } from "../core/ctx";
import { surface } from "../surfaces/materials";
import { box, boxMM, canvasTex, clothMaterial, flush, hash, mat, rod, rng, BOXQ, type Parts } from "./util";

export type HouseRowOpts = {
  /** the facade line x (the side nearest the track), ground y, z range (z1 near / larger .. z0), facing: +1 = faces +x */
  x: number; y: number; z1: number; z0: number; face: 1 | -1;
  seed?: number;
  /** far LOD: boxes + window texture only */
  far?: boolean;
  /** share of apartment blocks (0..1, default 0.35) and their max floors (default 5) */
  blocks?: number; maxFloors?: number;
};

// LOOK v2 (2026-11-20, look director): clear colours (were cream / beige walls [0.93, 0.89, 0.81] [0.87, 0.85, 0.81]
// [0.8, 0.74, 0.65] [0.94, 0.93, 0.91] and grey roofs [0.34, 0.35, 0.37] [0.27, 0.3, 0.35] [0.38, 0.32, 0.28])
const WALLS: [number, number, number][] = [[0.96, 0.72, 0.5], [0.55, 0.76, 0.93], [0.96, 0.95, 0.93], [0.86, 0.5, 0.4]];   // (exactly 4: the parts use keys wall0..wall3)
const ROOFS: [number, number, number][] = [[0.18, 0.32, 0.58], [0.55, 0.22, 0.16], [0.2, 0.42, 0.36]];
const CLOTH: [number, number, number][] = [[0.95, 0.95, 0.93], [0.55, 0.68, 0.86], [0.92, 0.75, 0.78], [0.62, 0.64, 0.66], [0.78, 0.9, 0.84], [0.35, 0.42, 0.6]];

let curtainT: THREE.Texture | null = null;
/** 4 x 2 atlas of what is behind a window: curtains (beige / pink / blue), a white blind, a dark room, a lit lamp room */
const curtains = () => (curtainT ??= canvasTex(512, 256, (g) => {
  const cells: [string, string][] = [["#d8cdb4", "c"], ["#2a2c30", "d"], ["#e9e6df", "b"], ["#cf9aa0", "c"], ["#8fa4c2", "c"], ["#3a3428", "l"], ["#d9d3c2", "b"], ["#1f2125", "d"]];
  cells.forEach(([col, kind], i) => {
    const x0 = (i % 4) * 128, y0 = Math.floor(i / 4) * 128, R = rng(i + 5);
    g.fillStyle = col; g.fillRect(x0, y0, 128, 128);
    if (kind === "c") { for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(0,0,0,${0.05 + R() * 0.08})`; g.fillRect(x0 + k * 13 + R() * 3, y0, 4, 128); } g.fillStyle = "rgba(20,20,22,0.85)"; g.fillRect(x0 + 50, y0, 28 + R() * 20, 128); }
    if (kind === "b") for (let k = 0; k < 16; k++) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x0, y0 + k * 8, 128, 1.5); }
    if (kind === "l") { const gr = g.createRadialGradient(x0 + 64, y0 + 60, 4, x0 + 64, y0 + 60, 70); gr.addColorStop(0, "#f6d79a"); gr.addColorStop(1, "#3a3428"); g.fillStyle = gr; g.fillRect(x0, y0, 128, 128); }
    if (kind === "d") { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(x0 + 10, y0 + 70, 70, 30); }
  });
}));
let farWin: THREE.Texture | null = null;
const farWindows = () => (farWin ??= (() => {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    for (let fy = 0; fy < 4; fy++) for (let fx = 0; fx < 4; fx++) {
      const k = hash(fx * 7 + fy * 13);
      g.fillStyle = k > 0.7 ? "#5a5f66" : k > 0.3 ? "#3e444b" : "#6c6a60"; g.fillRect(fx * 64 + 12, fy * 64 + 14, 40, 30);
      g.fillStyle = "#cfcac0"; g.fillRect(fx * 64 + 8, fy * 64 + 44, 48, 5);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 10, 1 / 11.6); return t;
})());

/** a gable roof prism over [x0,x1] x [z0,z1] from height y, ridge along Z (pitch ~25 deg), with eaves */
const gable = (x0: number, x1: number, z0: number, z1: number, y: number, eave = 0.45) => {
  const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 + eave, rise = Math.tan(0.44) * hw, za = z0 - eave, zb = z1 + eave;
  const v = [cx - hw, y, za, cx, y + rise, za, cx, y + rise, zb, cx - hw, y, zb, cx, y + rise, za, cx + hw, y, za, cx + hw, y, zb, cx, y + rise, zb];
  const uv = [0, 0, hw * 1.1, 0, hw * 1.1, zb - za, 0, zb - za, 0, 0, hw * 1.1, 0, hw * 1.1, zb - za, 0, zb - za];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6]); g.computeVertexNormals();
  const r = rise * (1 - eave / hw), e = new THREE.BufferGeometry();
  e.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z0, cx, y + r, z0, x1, y, z0, x0, y, z1, x1, y, z1, cx, y + r, z1], 3));
  e.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, hw, r, 2 * hw, 0, 0, 0, 2 * hw, 0, hw, r], 2));
  e.computeVertexNormals();
  return { roof: g, ends: e.index ? e.toNonIndexed() : e };
};
/** a window on a facade plane x = xf (facing face), z0..z1, y0..y1: alu frame, mullion, sill, glass + what's behind it */
const windowAt = (P: Parts, glassG: THREE.BufferGeometry[], backG: THREE.BufferGeometry[], xf: number, face: number, z0: number, z1: number, y0: number, y1: number, seed: number) => {
  const fr = 0.04, inset = 0.08, xg = xf - face * inset, xb = xf - face * (inset + 0.06);
  // frame (4 sides) + a centre mullion (sliding sashes) + a sill
  for (const [a, b, c, d] of [[z0, z1, y0, y0 + fr], [z0, z1, y1 - fr, y1], [z0, z0 + fr, y0, y1], [z1 - fr, z1, y0, y1], [(z0 + z1) / 2 - fr / 2, (z0 + z1) / 2 + fr / 2, y0, y1]] as [number, number, number, number][])
    boxMM(P, "alu", Math.min(xf, xg), c, a, Math.max(xf, xg), d, b, 0.003);
  boxMM(P, "sill", Math.min(xf + face * 0.05, xf - face * 0.02), y0 - 0.05, z0 - 0.05, Math.max(xf + face * 0.05, xf - face * 0.02), y0, z1 + 0.05, 0.005);
  // reveal (the wall thickness around the opening)
  for (const zz of [z0, z1]) boxMM(P, "reveal", Math.min(xf, xg), y0, zz - 0.01, Math.max(xf, xg), y1, zz + 0.01, 0.002);
  const q = new THREE.PlaneGeometry(z1 - z0 - 2 * fr, y1 - y0 - 2 * fr); q.rotateY(face * Math.PI / 2); q.translate(xg, (y0 + y1) / 2, (z0 + z1) / 2); glassG.push(q);
  const b = new THREE.PlaneGeometry(z1 - z0, y1 - y0); b.rotateY(face * Math.PI / 2); b.translate(xb, (y0 + y1) / 2, (z0 + z1) / 2);
  const cell = Math.floor(hash(seed) * 8), cu = (cell % 4) / 4, cv = Math.floor(cell / 4) / 2, uv = b.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, cu + uv.getX(i) * 0.25, 1 - (cv + (1 - uv.getY(i)) * 0.5));
  backG.push(b);
};

export const houseRow = async (ctx: KitCtx, o: HouseRowOpts) => {
  const G = new THREE.Group(); G.name = "houses";
  const P: Parts = new Map(), laundry: THREE.BufferGeometry[][] = CLOTH.map(() => []);
  const roofG: THREE.BufferGeometry[][] = ROOFS.map(() => []), endG: THREE.BufferGeometry[] = [], glassG: THREE.BufferGeometry[] = [], backG: THREE.BufferGeometry[] = [];
  let z = o.z1, i = 0; const S = o.seed ?? 1, f = o.face;
  BOXQ.plain = true;      // houses stand 11+ m from any lens: plain boxes (the rounded ones made 2.3 M triangles)
  while (z > o.z0 + 4) {
    const R = (k: number) => hash(S * 97 + i * 31 + k);
    const block = R(1) < (o.blocks ?? 0.35);
    const len = Math.min(z - o.z0, block ? 16 + R(2) * 8 : 7.5 + R(2) * 3), dep = block ? 10 : 8 + R(3) * 1.5;
    const floors = block ? Math.min(o.maxFloors ?? 5, 3 + Math.floor(R(4) * 3)) : 2, fH = block ? 2.9 : 2.85, H = floors * fH;
    const back = R(5) * 3, xf = o.x - f * back, xb = xf - f * dep, x0 = Math.min(xf, xb), za = z - len + 0.6, zb = z - 0.6;
    const wk = "wall" + Math.floor(R(6) * WALLS.length);
    if (o.far) {
      boxMM(P, "farwall" + (i % 3), x0, o.y, za, x0 + dep, o.y + H + (block ? 0.6 : 0), zb, 0.05);
      if (!block) roofG[i % ROOFS.length].push(gable(x0, x0 + dep, za, zb, o.y + H, 0.35).roof);
      z -= len; i++; continue;
    }
    boxMM(P, wk, x0, o.y, za, x0 + dep, o.y + H + (block ? 0.75 : 0.12), zb, 0.02);           // the walls (+ parapet height)
    boxMM(P, "base", x0 - 0.02, o.y - 0.1, za - 0.02, x0 + dep + 0.02, o.y + 0.35, zb + 0.02, 0.01);  // concrete foundation strip
    if (block) {
      boxMM(P, "coping", x0 - 0.04, o.y + H + 0.75, za - 0.04, x0 + dep + 0.04, o.y + H + 0.82, zb + 0.04, 0.01);
      box(P, "tank", [x0 + dep / 2, o.y + H + 1.5, (za + zb) / 2], [2.2, 1.4, 1.6], 0.06);
    } else {
      const gb = gable(x0 - 0.05, x0 + dep + 0.05, za - 0.05, zb + 0.05, o.y + H + 0.12, 0.5); roofG[i % ROOFS.length].push(gb.roof); endG.push(gb.ends);
      boxMM(P, "alu", Math.min(xf, xf + f * 0.12), o.y + H + 0.05, za - 0.5, Math.max(xf, xf + f * 0.12), o.y + H + 0.16, zb + 0.5, 0.01);   // eave gutter
    }
    // facade: per floor a window band; blocks: a balcony on every floor above the ground floor (sliding doors behind)
    for (let fl = 0; fl < floors; fl++) {
      const by = o.y + fl * fH, bays = block ? Math.max(2, Math.round((zb - za) / 4.2)) : 2;
      for (let k = 0; k < bays; k++) {
        const R2 = (q: number) => hash(S * 7 + i * 101 + fl * 13 + k * 7 + q);
        const bw = (zb - za) / bays, c = zb - (k + 0.5) * bw;
        if (block && fl > 0) {
          windowAt(P, glassG, backG, xf, f, c - bw * 0.36, c + bw * 0.36, by + 0.05, by + 2.1, S + i * 13 + fl * 5 + k);
          const xo = xf, xe = xf + f * 1.05, z0b = c - bw / 2 + 0.08, z1b = c + bw / 2 - 0.08;
          boxMM(P, "slab", Math.min(xo, xe), by - 0.16, z0b, Math.max(xo, xe), by + 0.02, z1b, 0.02);
          boxMM(P, "panel", Math.min(xe, xe - f * 0.05), by + 0.02, z0b, Math.max(xe, xe - f * 0.05), by + 1.08, z1b, 0.01);
          boxMM(P, "slab", Math.min(xo, xe), by + 0.02, z1b - 0.08, Math.max(xo, xe), by + fH - 0.16, z1b, 0.01);   // the dividing wall
          if (R2(1) > 0.3) box(P, "ac", [xf + f * 0.45, by + 0.33, z0b + 0.55], [0.3, 0.6, 0.8], 0.03);
          if (R2(2) > 0.25) {
            const py = by + 1.85;
            rod(P, "pole", [xf + f * 0.7, py, z0b + 0.2], [xf + f * 0.7, py, z1b - 0.3], 0.014, 5);
            const nC = 3 + Math.floor(R2(3) * 4);
            for (let cI = 0; cI < nC; cI++) {
              const cw = 0.35 + R2(10 + cI) * 0.45, ch = 0.45 + R2(20 + cI) * 0.5, cz = z1b - 0.45 - (cI + 0.5) * ((z1b - z0b - 0.8) / nC);
              const cg = new THREE.PlaneGeometry(cw, ch, 4, 4); cg.rotateY(Math.PI / 2); cg.translate(xf + f * 0.7, py - ch / 2 - 0.02, cz);
              const pa = cg.getAttribute("position") as THREE.BufferAttribute, hang = new Float32Array(pa.count * 2);
              for (let q = 0; q < pa.count; q++) { hang[q * 2] = (py - pa.getY(q)) / ch; hang[q * 2 + 1] = cI * 1.7 + i * 0.9 + fl; }
              cg.setAttribute("aHang", new THREE.BufferAttribute(hang, 2)); laundry[Math.floor(R2(30 + cI) * CLOTH.length)].push(cg);
            }
          }
        } else {
          const ww = block ? bw * 0.5 : Math.min(1.7, bw * 0.6), wy0 = by + (fl === 0 ? 0.85 : 0.8), wy1 = by + 2.0;
          windowAt(P, glassG, backG, xf, f, c - ww / 2, c + ww / 2, wy0, wy1, S + i * 17 + fl * 3 + k);
          if (!block && fl === 1 && k === 0 && R(8) > 0.35) {      // a small metal balcony with laundry on the house
            const xe = xf + f * 0.85;
            boxMM(P, "slab", Math.min(xf, xe), by - 0.1, c - 1.3, Math.max(xf, xe), by + 0.02, c + 1.3, 0.01);
            for (let r = c - 1.25; r <= c + 1.25; r += 0.12) rod(P, "pole", [xe, by, r], [xe, by + 1.0, r], 0.008, 4);
            rod(P, "pole", [xe, by + 1.0, c - 1.3], [xe, by + 1.0, c + 1.3], 0.02, 5);
            const py = by + 1.9; rod(P, "pole", [xf + f * 0.55, py, c - 1.1], [xf + f * 0.55, py, c + 1.1], 0.012, 5);
            for (let cI = 0; cI < 4; cI++) {
              const R3 = (q: number) => hash(S * 3 + i * 41 + cI * 9 + q), cw = 0.32 + R3(1) * 0.3, ch = 0.4 + R3(2) * 0.45, cz = c + 0.9 - cI * 0.55;
              const cg = new THREE.PlaneGeometry(cw, ch, 4, 4); cg.rotateY(Math.PI / 2); cg.translate(xf + f * 0.55, py - ch / 2 - 0.02, cz);
              const pa = cg.getAttribute("position") as THREE.BufferAttribute, hang = new Float32Array(pa.count * 2);
              for (let q = 0; q < pa.count; q++) { hang[q * 2] = (py - pa.getY(q)) / ch; hang[q * 2 + 1] = cI * 2.1 + i; }
              cg.setAttribute("aHang", new THREE.BufferAttribute(hang, 2)); laundry[Math.floor(R3(3) * CLOTH.length)].push(cg);
            }
          }
        }
      }
    }
    if (!block) {
      box(P, "ac", [xf + f * 0.25, o.y + 0.3, zb - 0.6], [0.3, 0.55, 0.78], 0.03);                          // the house's outdoor unit
      boxMM(P, "gwall", Math.min(xf + f * 1.6, xf + f * 1.72), o.y, za, Math.max(xf + f * 1.6, xf + f * 1.72), o.y + 1.1, zb, 0.02);  // block wall
    }
    z -= len; i++;
  }
  BOXQ.plain = false;
  const wallMats = await Promise.all(WALLS.map((c, k) => surface(ctx, k % 2 ? "plaster" : "painted_wall", { uv: "uv", res: "1k", tint: c, sat: 0.6, dirt: { bottom: 0.6, heightM: 0.6, baseY: o.y, streaks: 0.35, grime: 0.12 }, seed: k })));
  const roofMats = await Promise.all(ROOFS.map((c, k) => surface(ctx, k % 2 ? "roof_slates" : "roof_tiles", { uv: "uv", res: "1k", tint: c, sat: 0.3, dirt: { grime: 0.2, streaks: 0.2 }, seed: k })));
  roofG.forEach((list, k) => { if (!list.length) return; const m = new THREE.Mesh(list.length === 1 ? list[0] : mergeGeometries(list)!, roofMats[k]); m.castShadow = true; m.receiveShadow = true; G.add(m); });
  if (endG.length) { const m = new THREE.Mesh(mergeGeometries(endG)!, mat([0.88, 0.85, 0.79], 0.85, 0, { side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; G.add(m); }
  laundry.forEach((list, k) => {
    if (!list.length) return;
    const m = new THREE.Mesh(mergeGeometries(list)!, clothMaterial(ctx, null, CLOTH[k], "laundry" + k)); m.castShadow = true; m.receiveShadow = true; G.add(m);
  });
  if (glassG.length) { const m = new THREE.Mesh(mergeGeometries(glassG)!, glassMat()); m.receiveShadow = true; G.add(m); }
  if (backG.length) { const m = new THREE.Mesh(mergeGeometries(backG)!, backMat()); m.receiveShadow = true; G.add(m); }
  const fw = farWindows();
  const M: Record<string, THREE.Material> = {
    wall0: wallMats[0], wall1: wallMats[1], wall2: wallMats[2], wall3: wallMats[3],
    base: mat([0.6, 0.59, 0.56], 0.9), coping: mat([0.7, 0.7, 0.68], 0.7), alu: mat([0.66, 0.67, 0.66], 0.35, 0.8), sill: mat([0.72, 0.72, 0.7], 0.5, 0.5),
    reveal: mat([0.75, 0.73, 0.7], 0.8), slab: mat([0.78, 0.77, 0.74], 0.85), panel: mat([0.72, 0.74, 0.76], 0.35, 0.2), ac: mat([0.88, 0.88, 0.85], 0.5),
    pole: mat([0.75, 0.76, 0.78], 0.3, 0.8), tank: mat([0.8, 0.8, 0.76], 0.6), gwall: mat([0.66, 0.64, 0.6], 0.9),
    farwall0: mat([0.9, 0.87, 0.8], 0.85, 0, { map: fw }), farwall1: mat([0.82, 0.8, 0.76], 0.85, 0, { map: fw }), farwall2: mat([0.78, 0.72, 0.64], 0.85, 0, { map: fw }),
  };
  if (P.size) G.add(flush(P, M, { name: "house-parts", module: "rail-houses" }));
  return G;
};
let gm: THREE.MeshStandardMaterial | null = null, bkm: THREE.MeshStandardMaterial | null = null;
const glassMat = () => (gm ??= new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.055, 0.06), roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.55, envMapIntensity: 1.3, depthWrite: false }));
const backMat = () => (bkm ??= new THREE.MeshStandardMaterial({ map: curtains(), roughness: 0.9, emissive: new THREE.Color(1, 0.9, 0.75), emissiveMap: curtains(), emissiveIntensity: 0.06 }));

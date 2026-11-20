// SURFACES interior room kit. A box room (min corner `origin`, size w x h x d, Y up) with real wall thickness: window and
// door openings cut through the walls (reveals), window frames + glazing bars + an inner sill board, clear glass that
// lets the pipeline's sun in (it casts no shadow; the walls do, so the sun patch + the shafts come through the window),
// curtains, skirting boards and crown moulding (bevelled), a door with architrave and panels, a plaster ceiling with
// ceiling roses + pendant lamps (CORE practicals: `ctx.practical`, with a PointLight fallback), wall art frames with
// painted canvases, a shelf with books, a radiator under the window, switch / socket plates; floors from the registry
// (displaced boards near the lens); wall wear (dirt at the bottom, scuffs) + floor wear decals. All parts merged per
// material. Walls: local x along the wall, +z into the room (facade.ts helpers).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { KitCtx, Built, V3, Practical } from "../core/ctx";
import { surface, setSurfAttrs, type SurfName, type SurfMaterial, type SurfaceOpts } from "./materials";
import { interiorFloor, rng, type Lens } from "./ground";
import { addDecals, type DecalSpec } from "./decals";
import { rbox, quadZ, reveal, wallWithHoles, put, type Parts, type Hole } from "./facade";

type C3 = [number, number, number];
export type Wall = "back" | "front" | "left" | "right";
export type RoomOpts = {
  origin: V3; w: number; d: number; h?: number; thick?: number;
  floor?: SurfName; floorOpts?: SurfaceOpts;
  wall?: SurfName; wallTint?: C3; wallOpts?: SurfaceOpts;
  /** one wall papered (canvas pattern over the plaster) */
  wallpaper?: { wall: Wall; colors: [C3, C3]; repeatM?: number };
  windows?: { wall: Wall; at: number; w?: number; h?: number; sill?: number; curtains?: C3 | false }[];
  doors?: { wall: Wall; at: number; w?: number; h?: number; color?: C3 }[];
  lamps?: { x: number; z: number; drop?: number; lumens?: number; kelvin?: number; shadow?: boolean }[];
  art?: { wall: Wall; at: number; y?: number; w?: number; h?: number }[];
  shelf?: { wall: Wall; at: number; y?: number; len?: number };
  radiator?: boolean;
  /** a soft warm fill near each window wall standing in for the sun patch's bounce (x rig sun intensity), default 0.1 */
  bounce?: number;
  trimColor?: C3; seed?: number; lens?: Lens;
};

const plain = (c: C3, rough = 0.45, metal = 0) => { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(...c), roughness: rough, metalness: metal }); m.customProgramCacheKey = () => "surfaces:plain"; return m; };
const css = (c: C3) => `rgb(${Math.round(Math.pow(c[0], 1 / 2.2) * 255)},${Math.round(Math.pow(c[1], 1 / 2.2) * 255)},${Math.round(Math.pow(c[2], 1 / 2.2) * 255)})`;
/** a wallpaper tile (stripes + a small seeded motif), sRGB canvas */
const wallpaperTex = (a: C3, b: C3, seed: number) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 512; const g = cv.getContext("2d")!, R = rng(seed);
  g.fillStyle = css(a); g.fillRect(0, 0, 512, 512);
  g.fillStyle = css(b); for (let i = 0; i < 4; i++) g.fillRect(i * 128 + 54, 0, 20, 512);
  g.globalAlpha = 0.55; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = i * 128 + (j % 2 ? 0 : 64) + 0, y = j * 128 + 64; g.save(); g.translate(x, y);
    for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.ellipse(0, -11, 4.5, 10, 0, 0, 6.28); g.fill(); }
    g.restore();
  }
  g.globalAlpha = 0.06; g.fillStyle = "#000"; for (let i = 0; i < 3000; i++) g.fillRect(R() * 512, R() * 512, 1.5, 1.5);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
};
/** a small painted canvas (seeded landscape / abstract) for frames */
const paintingTex = (seed: number) => {
  const cv = document.createElement("canvas"); cv.width = 384; cv.height = 512; const g = cv.getContext("2d")!, R = rng(seed);
  const pals: C3[][] = [[[0.55, 0.65, 0.75], [0.35, 0.45, 0.25], [0.8, 0.6, 0.3]], [[0.85, 0.55, 0.35], [0.4, 0.25, 0.2], [0.95, 0.85, 0.6]], [[0.3, 0.4, 0.55], [0.2, 0.25, 0.3], [0.85, 0.8, 0.7]]];
  const p = pals[Math.floor(R() * pals.length)];
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, css(p[0])); gr.addColorStop(1, css(p[2])); g.fillStyle = gr; g.fillRect(0, 0, 384, 512);
  g.fillStyle = css(p[2]); g.beginPath(); g.arc(90 + R() * 200, 120 + R() * 80, 30 + R() * 25, 0, 6.28); g.fill();
  for (let k = 0; k < 3; k++) { g.fillStyle = css(p[1].map((v) => v * (0.7 + 0.15 * k)) as C3); g.beginPath(); g.moveTo(0, 512); let y = 300 + k * 60 + R() * 40; g.lineTo(0, y);
    for (let x = 0; x <= 384; x += 32) { y += (R() - 0.5) * 50; g.lineTo(x, y); } g.lineTo(384, 512); g.fill(); }
  g.globalAlpha = 0.08; for (let i = 0; i < 800; i++) { g.fillStyle = R() < 0.5 ? "#fff" : "#000"; g.fillRect(R() * 384, R() * 512, 3 + R() * 8, 1.5); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

/** build the room (see the header). Returns the group, materials (floor / walls for more decals) and the lamps */
export const room = async (ctx: KitCtx, o: RoomOpts): Promise<Built & { mats: Record<string, SurfMaterial>; lamps: Practical[] }> => {
  const R = rng(o.seed ?? 1), H = o.h ?? 2.9, t = o.thick ?? 0.26, [X0, Y0, Z0] = o.origin, W = o.w, D = o.d;
  const grp = new THREE.Group(); grp.name = "room"; grp.userData.kitModule = "interior";
  const trimC = o.trimColor ?? [0.9, 0.88, 0.83];
  const wallMat = await surface(ctx, o.wall ?? "plaster", { uv: "uv", tint: o.wallTint ?? [0.93, 0.86, 0.76], dirt: { bottom: 0.35, heightM: 0.3, baseY: Y0, grime: 0.05, edge: 0 }, moss: { amount: 0 }, ...o.wallOpts });
  let paperMat: SurfMaterial | null = null;
  if (o.wallpaper) {
    paperMat = await surface(ctx, "plaster", { uv: "uv", anti: "none", tileM: o.wallpaper.repeatM ?? 0.53, dirt: { bottom: 0.3, heightM: 0.3, baseY: Y0, grime: 0.06 }, macro: { amount: 0.06 }, moss: { amount: 0 }, seed: 3 });
    paperMat.userData.surf.U.sAlb.value = wallpaperTex(o.wallpaper.colors[0], o.wallpaper.colors[1], o.seed ?? 1);
  }
  const ceilMat = await surface(ctx, "plaster", { uv: "uv", tint: [0.96, 0.95, 0.92], dirt: { joints: 0, grime: 0.03 }, moss: { amount: 0 }, side: THREE.DoubleSide, seed: 7 });
  const M: Record<string, THREE.Material> = { wall: wallMat, ceil: ceilMat, trim: plain(trimC, 0.38), wood: plain([0.32, 0.2, 0.12], 0.5), glass: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.03, metalness: 0, depthWrite: false }),
    metal: plain([0.75, 0.72, 0.66], 0.35, 0.8), shade: new THREE.MeshStandardMaterial({ color: new THREE.Color(0.9, 0.82, 0.66), roughness: 0.8, side: THREE.DoubleSide, emissive: new THREE.Color(0.5, 0.34, 0.16), emissiveIntensity: 0.6 }),
    books: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), canvas: plain([1, 1, 1], 0.7) };
  if (paperMat) M.paper = paperMat;
  (M.glass as THREE.Material).customProgramCacheKey = () => "surfaces:roomglass";
  // wall frames: origin (world) + yaw; local x along the wall, +z into the room
  const frames: Record<Wall, { o: V3; yaw: number; len: number }> = {
    back: { o: [X0, Y0, Z0], yaw: 0, len: W }, front: { o: [X0 + W, Y0, Z0 + D], yaw: Math.PI, len: W },
    left: { o: [X0, Y0, Z0 + D], yaw: Math.PI / 2, len: D }, right: { o: [X0 + W, Y0, Z0], yaw: -Math.PI / 2, len: D },
  };
  const wallDecals: DecalSpec[] = [];
  for (const wn of ["back", "front", "left", "right"] as Wall[]) {
    const F = frames[wn], P: Parts = new Map(), holes: Hole[] = [], gaps: [number, number][] = [];
    const key = o.wallpaper?.wall === wn ? "paper" : "wall";
    for (const win of (o.windows ?? []).filter((x) => x.wall === wn)) {
      const ww = win.w ?? 1.3, wh = win.h ?? 1.55, sill = win.sill ?? 0.85, h: Hole = { x0: win.at - ww / 2, y0: sill, x1: win.at + ww / 2, y1: sill + wh };
      holes.push(h);
      reveal(P, key, [h.x0, h.y0, 0], [h.x0, h.y0, -t], [0, wh, 0], [1, 0, 0]); reveal(P, key, [h.x1, h.y0, -t], [h.x1, h.y0, 0], [0, wh, 0], [-1, 0, 0]);
      reveal(P, key, [h.x0, h.y1, -t], [h.x1, h.y1, -t], [0, 0, t], [0, -1, 0]); reveal(P, key, [h.x1, h.y0, -t], [h.x0, h.y0, -t], [0, 0, t], [0, 1, 0]);
      const fz0 = -t + 0.05, fz1 = -t + 0.12, fw = 0.06;
      rbox(P, "trim", h.x0, h.y0, fz0, h.x0 + fw, h.y1, fz1, 0.005); rbox(P, "trim", h.x1 - fw, h.y0, fz0, h.x1, h.y1, fz1, 0.005);
      rbox(P, "trim", h.x0, h.y1 - fw, fz0, h.x1, h.y1, fz1, 0.005); rbox(P, "trim", h.x0, h.y0, fz0, h.x1, h.y0 + fw, fz1, 0.005);
      const cx = win.at, my = h.y0 + wh * 0.55;
      rbox(P, "trim", cx - 0.03, h.y0 + fw, fz0 + 0.01, cx + 0.03, h.y1 - fw, fz1, 0.004);
      rbox(P, "trim", h.x0 + fw, my - 0.025, fz0 + 0.01, h.x1 - fw, my + 0.025, fz1, 0.004);
      quadZ(P, "glass", h.x0 + fw, h.y0 + fw, h.x1 - fw, h.y1 - fw, fz0 + 0.03);
      rbox(P, "wood", h.x0 - 0.06, h.y0 - 0.035, -t + 0.12, h.x1 + 0.06, h.y0 + 0.0, 0.05, 0.008);           // inner sill board
      for (const [a, b, c, e] of [[h.x0 - 0.08, h.y0, h.x0, h.y1 + 0.08], [h.x1, h.y0, h.x1 + 0.08, h.y1 + 0.08], [h.x0 - 0.08, h.y1, h.x1 + 0.08, h.y1 + 0.08]] as number[][]) rbox(P, "trim", a, b, 0, c, e, 0.02, 0.005);   // architrave
      if (o.radiator !== false && wn !== "front") {
        const rw = Math.min(ww, 1.1), n = Math.floor(rw / 0.075);
        for (let i = 0; i < n; i++) { const rx = cx - rw / 2 + i * 0.075; rbox(P, "trim", rx, 0.14, 0.04, rx + 0.06, 0.74, 0.13, 0.012); }
        rbox(P, "metal", cx - rw / 2 - 0.05, 0.08, 0.07, cx - rw / 2 - 0.02, 0.2, 0.1, 0.008);
      }
      if (win.curtains !== false) {
        const cc = win.curtains ?? ([[0.55, 0.22, 0.18], [0.75, 0.68, 0.52], [0.25, 0.32, 0.4]] as C3[])[Math.floor(R() * 3)];
        M["curtain" + wn] = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cc), roughness: 0.9, side: THREE.DoubleSide });
        for (const side of [-1, 1]) {
          const g = new THREE.PlaneGeometry(0.42, h.y1 + 0.3 - 0.06, 28, 1), p = g.getAttribute("position") as THREE.BufferAttribute;
          for (let i = 0; i < p.count; i++) { const u = p.getX(i) / 0.42 + 0.5; p.setZ(i, 0.11 + 0.035 * Math.sin(u * Math.PI * 9 + side)); }
          g.computeVertexNormals(); g.translate(side < 0 ? h.x0 - 0.12 : h.x1 + 0.12, (h.y1 + 0.3 + 0.06) / 2, 0);
          put(P, "curtain" + wn, g);
        }
        const rail = new THREE.CylinderGeometry(0.012, 0.012, ww + 0.9, 10); rail.rotateZ(Math.PI / 2); rail.translate(cx, h.y1 + 0.32, 0.13); put(P, "metalc", rail);
      }
    }
    for (const dr of (o.doors ?? []).filter((x) => x.wall === wn)) {
      const dw = dr.w ?? 0.88, dh = dr.h ?? 2.08, h: Hole = { x0: dr.at - dw / 2, y0: 0, x1: dr.at + dw / 2, y1: dh };
      holes.push(h); gaps.push([h.x0 - 0.08, h.x1 + 0.08]);
      reveal(P, key, [h.x0, 0, 0], [h.x0, 0, -t], [0, dh, 0], [1, 0, 0]); reveal(P, key, [h.x1, 0, -t], [h.x1, 0, 0], [0, dh, 0], [-1, 0, 0]);
      reveal(P, key, [h.x0, dh, -t], [h.x1, dh, -t], [0, 0, t], [0, -1, 0]);
      for (const [a, b, c, e] of [[h.x0 - 0.075, 0, h.x0, dh + 0.075], [h.x1, 0, h.x1 + 0.075, dh + 0.075], [h.x0 - 0.075, dh, h.x1 + 0.075, dh + 0.075]] as number[][]) rbox(P, "trim", a, b, 0, c, e, 0.022, 0.006);
      const lz = -t * 0.5;
      M.door = plain(dr.color ?? [0.86, 0.84, 0.78], 0.35);
      rbox(P, "door", h.x0 + 0.01, 0.01, lz, h.x1 - 0.01, dh - 0.005, lz + 0.04, 0.005);
      for (const [a, c] of [[0.08, 0.42], [0.5, 0.92]] as [number, number][]) for (const s of [0, 1]) {
        const px0 = s ? (h.x0 + h.x1) / 2 + 0.04 : h.x0 + 0.1, px1 = s ? h.x1 - 0.1 : (h.x0 + h.x1) / 2 - 0.04;
        rbox(P, "door", px0, dh * a, lz + 0.04, px1, dh * c, lz + 0.052, 0.006);
      }
      rbox(P, "metal", h.x1 - 0.12, 1.0, lz + 0.04, h.x1 - 0.06, 1.03, lz + 0.1, 0.008);
      wallDecals.push({ type: "wear", at: [h.x1 + 0.25, 1.0], size: [0.4, 0.5], opacity: 0.5 });
      rbox(P, "trim", h.x1 + 0.15, 1.15, 0, h.x1 + 0.23, 1.27, 0.012, 0.004);   // switch plate
    }
    wallWithHoles(P, key, F.len, H, holes);
    // skirting (split at doors) + crown moulding + a socket
    let px = 0;
    for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) { if (a - px > 0.05) { rbox(P, "trim", px, 0, 0, a, 0.15, 0.018, 0.004); rbox(P, "trim", px, 0.15, 0, a, 0.17, 0.011, 0.004); } px = b; }
    if (F.len - px > 0.05) { rbox(P, "trim", px, 0, 0, F.len, 0.15, 0.018, 0.004); rbox(P, "trim", px, 0.15, 0, F.len, 0.17, 0.011, 0.004); }
    rbox(P, "trim", 0, H - 0.05, 0, F.len, H, 0.07, 0.006); rbox(P, "trim", 0, H - 0.1, 0, F.len, H - 0.05, 0.035, 0.006); rbox(P, "trim", 0, H - 0.125, 0, F.len, H - 0.1, 0.015, 0.004);
    if (wn === "back") rbox(P, "trim", F.len * 0.8, 0.28, 0, F.len * 0.8 + 0.08, 0.36, 0.01, 0.003);
    // art + shelf
    for (const a of (o.art ?? []).filter((x) => x.wall === wn)) {
      const aw = a.w ?? 0.5, ah = a.h ?? 0.65, ay = a.y ?? 1.55, fw = 0.045, k = "canvas" + wn + a.at;
      for (const [x0, y0, x1, y1] of [[a.at - aw / 2 - fw, ay - ah / 2 - fw, a.at + aw / 2 + fw, ay - ah / 2], [a.at - aw / 2 - fw, ay + ah / 2, a.at + aw / 2 + fw, ay + ah / 2 + fw],
        [a.at - aw / 2 - fw, ay - ah / 2, a.at - aw / 2, ay + ah / 2], [a.at + aw / 2, ay - ah / 2, a.at + aw / 2 + fw, ay + ah / 2]]) rbox(P, "wood", x0, y0, 0.005, x1, y1, 0.035, 0.006);
      const cm = new THREE.MeshStandardMaterial({ map: paintingTex(Math.floor((o.seed ?? 1) * 31 + a.at * 17)), roughness: 0.75 }); cm.customProgramCacheKey = () => "surfaces:canvas"; M[k] = cm;
      const g = new THREE.PlaneGeometry(aw, ah); g.translate(a.at, ay, 0.015); put(P, k, g);
    }
    if (o.shelf && o.shelf.wall === wn) {
      const s = o.shelf, L = s.len ?? 1.2, sy = s.y ?? 1.3, x0 = s.at - L / 2;
      rbox(P, "wood", x0, sy - 0.03, 0, x0 + L, sy, 0.24, 0.006);
      for (const bx of [x0 + 0.15, x0 + L - 0.2]) rbox(P, "metal", bx, sy - 0.16, 0, bx + 0.03, sy - 0.03, 0.2, 0.005);
      const books: THREE.BufferGeometry[] = [];
      let bx = x0 + 0.05;
      while (bx < x0 + L - 0.1) {
        const bw = 0.025 + R() * 0.035, bh = 0.17 + R() * 0.12, lean = R() < 0.1 ? 0.25 : 0;
        const g = new THREE.BoxGeometry(bw, bh, 0.16 + R() * 0.05); g.translate(0, bh / 2, 0); g.rotateZ(-lean); g.translate(bx + bw / 2, sy, 0.11);
        const c = new THREE.Color().setHSL(R(), 0.25 + R() * 0.35, 0.2 + R() * 0.35), col = new Float32Array(g.getAttribute("position").count * 3);
        for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
        g.setAttribute("color", new THREE.BufferAttribute(col, 3)); books.push(g.toNonIndexed());
        bx += bw + 0.003 + (lean ? 0.06 : 0);
      }
      put(P, "books", mergeGeometries(books)!);
    }
    const wg = new THREE.Group(); wg.position.set(...F.o); wg.rotation.y = F.yaw; wg.name = "wall_" + wn;
    for (const [k, list] of P) {
      if (!M[k] || !list.length) continue;
      const g = list.length === 1 ? list[0] : mergeGeometries(list.map((x) => (x.index ? x : x)), false);
      if (!g) { console.warn("room: merge failed", k); continue; }
      if (k === "wall" || k === "paper") setSurfAttrs(g, () => [0, 0, 0, 0]);
      const m = new THREE.Mesh(g, M[k]); m.castShadow = k !== "glass"; m.receiveShadow = true; wg.add(m);
    }
    grp.add(wg);
  }
  // outer shell (thick walls are hollow otherwise; also keeps the sun out): back faces of slabs around the room
  const shell = new THREE.Mesh(new THREE.BoxGeometry(W + 2 * t, H + 0.3, D + 2 * t), new THREE.MeshStandardMaterial({ color: 0x6b6158, roughness: 0.9, side: THREE.BackSide }));
  shell.position.set(X0 + W / 2, Y0 + H / 2 + 0.15, Z0 + D / 2); shell.castShadow = false; shell.receiveShadow = false; shell.visible = false;
  // ceiling (+ a slab above it that casts the roof shadow)
  {
    const g = new THREE.PlaneGeometry(W, D); g.rotateX(Math.PI / 2); g.translate(X0 + W / 2, Y0 + H, Z0 + D / 2);
    const uv = g.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W, uv.getY(i) * D);
    setSurfAttrs(g, () => [0, 0, 0, 0]);
    const c = new THREE.Mesh(g, ceilMat); c.receiveShadow = true; c.castShadow = true; grp.add(c);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 2 * t, 0.25, D + 2 * t), plain([0.4, 0.38, 0.35], 0.9)); slab.position.set(X0 + W / 2, Y0 + H + 0.13, Z0 + D / 2); slab.castShadow = true; grp.add(slab);
  }
  // floor
  const fl = await interiorFloor(ctx, { rect: [X0, X0 + W, Z0, Z0 + D], y: Y0, surface: o.floor ?? "wood_floor", opts: o.floorOpts, lens: o.lens });
  grp.add(fl.object);
  addDecals(fl.mats.floor, [
    { type: "wear", at: [X0 + W * 0.5, Z0 + D * 0.55], size: [1.6, 2.2], opacity: 0.6 },
    { type: "stain", at: [X0 + W * 0.3, Z0 + D * 0.3], size: [0.5, 0.4], opacity: 0.4 },
    { type: "wear", at: [X0 + W * 0.8, Z0 + D * 0.85], size: [0.9, 0.8], opacity: 0.5 },
  ]);
  if (wallDecals.length) { addDecals(wallMat, wallDecals); }
  // lamps: ceiling rose + cord + drum shade + a practical light
  const lamps: Practical[] = [];
  const lamp = new THREE.Group(); lamp.name = "lamps";
  for (const L of o.lamps ?? []) {
    const drop = L.drop ?? 0.75, ly = Y0 + H - drop;
    const rose = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.15, -0.02), new THREE.Vector2(0.1, -0.035), new THREE.Vector2(0.04, -0.045), new THREE.Vector2(0.001, -0.05)], 32), M.trim);
    rose.position.set(L.x, Y0 + H - 0.001, L.z); rose.castShadow = true;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, drop - 0.16, 6), plain([0.1, 0.1, 0.1], 0.5)); cord.position.set(L.x, Y0 + H - (drop - 0.16) / 2 - 0.04, L.z);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.24, 36, 1, true), M.shade); shade.position.set(L.x, ly + 0.04, L.z); shade.castShadow = false;
    lamp.add(rose, cord, shade);
    const spec = { kind: "point" as const, pos: [L.x, ly - 0.02, L.z] as V3, kelvin: L.kelvin ?? 2700, lumens: L.lumens ?? 900, shadow: L.shadow ?? false, bulb: { radius: 0.035 } };
    if (ctx.practical) { const p = ctx.practical(spec); lamp.add(p.object); lamps.push(p); }
    else { const pl = new THREE.PointLight(0xffc98a, 6, 8, 2); pl.position.set(...spec.pos); lamp.add(pl); }
  }
  // bounce fill: the sun patch on the floor lights the window wall + ceiling (CORE's GI probe is one SH point per room)
  const fills: THREE.PointLight[] = [];
  if ((o.bounce ?? 0.1) > 0) for (const win of o.windows ?? []) {
    const F = frames[win.wall], c = Math.cos(F.yaw), sn = Math.sin(F.yaw);
    const lx = win.at, lz = 1.5;
    const wx = F.o[0] + lx * c + lz * sn, wz = F.o[2] - lx * sn + lz * c;
    const pl = new THREE.PointLight(new THREE.Color(1.0, 0.88, 0.76), (o.bounce ?? 0.1) * (ctx.rig.sunIntensity ?? 7), 0, 2);
    pl.position.set(wx, Y0 + 0.55, wz); pl.castShadow = false; pl.name = "bounceFill"; fills.push(pl); lamp.add(pl);
  }
  grp.add(lamp, shell);
  return { object: grp, mats: { wall: wallMat, floor: fl.mats.floor, ceiling: ceilMat, ...(paperMat ? { paper: paperMat } : {}) }, lamps,
    update: () => { for (const f of fills) f.intensity = (o.bounce ?? 0.1) * (ctx.rig.sunIntensity ?? 7); },
    hints: { shadowCenter: [X0 + W / 2, Y0, Z0 + D / 2], shadowExt: Math.max(W, D) * 0.9 + 2, probe: [X0 + W / 2, Y0 + 1.3, Z0 + D / 2] } };
};

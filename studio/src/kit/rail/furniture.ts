// Platform furniture, round 2 (STATION owner): the things that make a Tokyo platform read as one from any angle.
// `kiosk` (the steel-panel staff hut the vending machines lean on), `ledBoard` (LED departure indicator: digits, a colon,
// running arrows), `doorMarks` (painted door-position marks with car / door digits + queue lines), `stopMarker` (the
// driver's stop-position diamond with the car count), `columnKit` (numbered plates, emergency-stop boxes, horn speakers on
// the canopy columns), `posterStand` (lit ad panels: pictures only). No text anywhere: pictograms, digits, arrows.
// Every look is ONE shared material for the whole set (`shared()`): the material + program count stays low.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { KitCtx, V3 } from "../core/ctx";
import { surface } from "../surfaces/materials";
import { box, boxMM, canvasTex, cyl, flush, glow, grime, mat, rod, rng, type Parts } from "./util";

const texMemo = new Map<string, THREE.Texture>();
const memo = (k: string, f: () => THREE.Texture) => { if (!texMemo.has(k)) texMemo.set(k, f()); return texMemo.get(k)!; };
const sharedM = new Map<string, THREE.Material>();
export const shared = <T extends THREE.Material>(k: string, f: () => T) => { if (!sharedM.has(k)) sharedM.set(k, f()); return sharedM.get(k) as T; };
const tagAll = (G: THREE.Object3D) => G.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
/** a flat quad on a wall: centre c, size (w across, h up), facing the horizontal unit normal n = [nx, nz], proud by `off` */
const wallQuad = (c: V3, w: number, h: number, n: [number, number], off = 0.004) => {
  const q = new THREE.PlaneGeometry(w, h); q.rotateY(Math.atan2(n[0], n[1])); q.translate(c[0] + n[0] * off, c[1], c[2] + n[1] * off); return q;
};
/** remap a quad's uv into cell (col, row) of a cols x rows atlas (row 0 = the canvas top) */
const cellUV = (q: THREE.BufferGeometry, col: number, row: number, cols: number, rows: number) => {
  const uv = q.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / cols, 1 - (row + 1 - uv.getY(i)) / rows);
  return q;
};
const quadMesh = (list: THREE.BufferGeometry[], m: THREE.Material, cast = false) => {
  const me = new THREE.Mesh(list.length === 1 ? list[0] : mergeGeometries(list)!, m); me.castShadow = cast; me.receiveShadow = true; return me;
};
const FONT = "Arial, Helvetica, sans-serif";

// ---------------------------------------------------------------- pictogram sheet (no text)
/** 4 x 2 sheet: 0 fire extinguisher, 1 staff only, 2 emergency button, 3 route diagram (lines + dots),
 *  4 timetable (digit grid), 5 a lit blind (window back), 6 hazard stripes, 7 IC wave */
const wallSheet = () => memo("wallSheet", () => canvasTex(1024, 512, (g) => {
  const cell = (i: number, f: () => void) => { g.save(); g.translate((i % 4) * 256, Math.floor(i / 4) * 256); g.beginPath(); g.rect(0, 0, 256, 256); g.clip(); f(); g.restore(); };
  cell(0, () => { g.fillStyle = "#c8261c"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#fff"; g.fillRect(96, 88, 56, 118); g.fillRect(110, 66, 28, 26); g.fillRect(132, 58, 46, 12);
    g.strokeStyle = "#fff"; g.lineWidth = 9; g.beginPath(); g.moveTo(104, 74); g.quadraticCurveTo(66, 78, 70, 128); g.stroke(); g.fillStyle = "#c8261c"; g.fillRect(104, 128, 40, 34); });
  cell(1, () => { g.fillStyle = "#e9e9e4"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#1b1d21"; g.beginPath(); g.arc(128, 84, 22, 0, 7); g.fill(); g.fillRect(100, 112, 56, 78);
    g.strokeStyle = "#c8261c"; g.lineWidth = 16; g.beginPath(); g.arc(128, 128, 92, 0, 7); g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(192, 192); g.stroke(); });
  cell(2, () => { g.fillStyle = "#e9e9e4"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#c8261c"; g.fillRect(14, 14, 228, 228); g.fillStyle = "#f1f0ea"; g.fillRect(26, 26, 204, 204);
    g.fillStyle = "#c8261c"; g.beginPath(); g.arc(128, 128, 62, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 10; g.beginPath(); g.moveTo(128, 92); g.lineTo(128, 138); g.stroke(); g.beginPath(); g.arc(128, 160, 6, 0, 7); g.stroke(); });
  cell(3, () => { g.fillStyle = "#f4f3ee"; g.fillRect(0, 0, 256, 256); const cols = ["#1f9a5a", "#e8792b", "#2b6fc0", "#c8261c", "#8a55b0"], R = rng(77);
    cols.forEach((c, k) => { g.strokeStyle = c; g.lineWidth = 7; g.lineJoin = "round"; g.beginPath(); let x = 14, y = 36 + k * 44 + R() * 10; g.moveTo(x, y); const pts: [number, number][] = [[x, y]];
      while (x < 236) { x += 30 + R() * 26; y += (R() - 0.5) * (R() > 0.6 ? 70 : 8); y = Math.max(16, Math.min(240, y)); g.lineTo(x, y); pts.push([x, y]); }
      g.stroke(); g.fillStyle = "#fff"; g.lineWidth = 3; pts.forEach(([px, py]) => { g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill(); g.stroke(); }); }); });
  cell(4, () => { g.fillStyle = "#f6f5f0"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#1f9a5a"; g.fillRect(0, 0, 256, 26); g.font = `bold 15px ${FONT}`; g.textBaseline = "middle"; const R = rng(5);
    for (let r = 0; r < 14; r++) { g.fillStyle = r % 2 ? "#ecebe4" : "#f6f5f0"; g.fillRect(0, 30 + r * 16, 256, 16); g.fillStyle = "#c8261c"; g.fillText(String(5 + r), 8, 39 + r * 16); g.fillStyle = "#22252a";
      let m = Math.floor(R() * 6); for (let k = 0; k < 9 && m < 60; k++) { g.fillText(String(m).padStart(2, "0"), 40 + k * 24, 39 + r * 16); m += 4 + Math.floor(R() * 7); } } });
  cell(5, () => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#f1e6c8"); gr.addColorStop(1, "#cdbf9c"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 26; k++) { g.fillStyle = "rgba(60,48,30,0.22)"; g.fillRect(0, k * 10 + 7, 256, 2); } g.fillStyle = "rgba(30,24,16,0.5)"; g.fillRect(150, 150, 70, 106); g.fillRect(40, 190, 60, 66); });
  cell(6, () => { for (let i = -8; i < 16; i++) { g.fillStyle = i % 2 ? "#c8261c" : "#f1f0ea"; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 - 224, 256); g.lineTo(i * 32 - 256, 256); g.fill(); } });
  cell(7, () => { g.fillStyle = "#1d3f6e"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#fff"; g.lineWidth = 14; g.lineCap = "round"; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(70, 128, 40 + k * 42, -0.75, 0.75); g.stroke(); } });
  grime(g, 1024, 512, 13, 2600, 0.05);
}));
const sheetMat = () => shared("wallSheet", () => new THREE.MeshStandardMaterial({ map: wallSheet(), roughness: 0.5 }));
const sheetGlow = () => shared("wallSheetGlow", () => new THREE.MeshStandardMaterial({ map: wallSheet(), emissive: new THREE.Color(1, 0.92, 0.78), emissiveMap: wallSheet(), emissiveIntensity: 0.5, roughness: 0.6 }));
const glassDark = () => shared("glassDark", () => new THREE.MeshStandardMaterial({ color: new THREE.Color(0.04, 0.05, 0.055), roughness: 0.05, transparent: true, opacity: 0.45, envMapIntensity: 1.4, depthWrite: false }));
const steelM = () => shared("steel", () => mat([0.78, 0.78, 0.77], 0.28, 1.0));
const aluM = () => shared("alu", () => mat([0.7, 0.71, 0.71], 0.35, 0.85));
const darkM = () => shared("dark", () => mat([0.16, 0.17, 0.19], 0.5, 0.3));
const redM = () => shared("red", () => mat([0.74, 0.12, 0.09], 0.4, 0.1));

// ---------------------------------------------------------------- the kiosk (the staff hut the vending machines lean on)
/** a small steel-panel platform hut between x0..x1, z0..z1: plinth, pale panels with cover strips, a ribbon window on the
 *  -X face (a lit blind behind the glass), a staff door + bulkhead lamp on the +Z end, an awning + strip light over the
 *  -Z end (the vending machines stand under it), a fire-extinguisher box + a timetable (digits) + a route diagram + an
 *  emergency intercom on the +X face, a roof slab with fascia, gutter + downpipe, an AC unit + a vent on the roof. */
export const kiosk = async (ctx: KitCtx, o: { x0: number; x1: number; z0: number; z1: number; top: number; h?: number }) => {
  const G = new THREE.Group(); G.name = "kiosk";
  const P: Parts = new Map(), { x0, x1, z0, z1 } = o, y0 = o.top, H = o.h ?? 2.75, y1 = y0 + H, zc = (z0 + z1) / 2, xc = (x0 + x1) / 2;
  boxMM(P, "plinth", x0 - 0.03, y0, z0 - 0.03, x1 + 0.03, y0 + 0.14, z1 + 0.03, 0.012);
  boxMM(P, "panel", x0, y0 + 0.14, z0, x1, y1, z1, 0.008);
  boxMM(P, "fascia", x0 - 0.05, y1 - 0.16, z0 - 0.05, x1 + 0.05, y1, z1 + 0.05, 0.01);
  boxMM(P, "roof", x0 - 0.16, y1, z0 - 0.16, x1 + 0.16, y1 + 0.09, z1 + 0.16, 0.02);
  box(P, "acU", [xc + 0.2, y1 + 0.42, zc + 0.9], [0.8, 0.62, 0.34], 0.03); box(P, "strip", [xc + 0.2, y1 + 0.12, zc + 0.9], [0.9, 0.06, 0.4], 0.006);
  cyl(P, "strip", [xc - 0.4, y1 + 0.09, zc - 1.2], 0.05, 0.05, 0.5, 10); cyl(P, "strip", [xc - 0.4, y1 + 0.55, zc - 1.2], 0.09, 0.07, 0.07, 10);
  // cover strips over the panel joints (every ~0.84 m on the long faces, 3 on the ends)
  const nz = Math.round((z1 - z0) / 0.84), sy = (y0 + 0.14 + y1 - 0.16) / 2;
  for (let k = 0; k <= nz; k++) { const z = z0 + ((z1 - z0) * k) / nz; for (const x of [x0 - 0.008, x1 + 0.008]) box(P, "strip", [x, sy, z], [0.02, H - 0.3, 0.045], 0.004); }
  for (const x of [x0, xc, x1]) for (const z of [z0 - 0.008, z1 + 0.008]) box(P, "strip", [x, sy, z], [0.045, H - 0.3, 0.02], 0.004);
  // gutter + downpipe at the +Z / -X corner
  boxMM(P, "strip", x0 - 0.22, y1 - 0.06, z0 - 0.1, x0 - 0.12, y1 + 0.04, z1 + 0.1, 0.01);
  rod(P, "strip", [x0 - 0.1, y1 - 0.05, z1 - 0.12], [x0 - 0.1, y0 + 0.16, z1 - 0.12], 0.035, 8);
  const sheet: THREE.BufferGeometry[] = [], sheetLit: THREE.BufferGeometry[] = [], glassG: THREE.BufferGeometry[] = [];
  // -X face: the ribbon window (alu frame, 2 mullions, sill), dark glass, the lit blind behind
  { const a = z0 + 0.95, b = z1 - 0.95, wy0 = y0 + 1.02, wy1 = y0 + 2.02, xo = x0 - 0.03;
    boxMM(P, "alu", xo, wy0 - 0.05, a - 0.05, x0 + 0.02, wy0, b + 0.05, 0.004); boxMM(P, "alu", xo, wy1, a - 0.05, x0 + 0.02, wy1 + 0.05, b + 0.05, 0.004);
    for (const z of [a - 0.025, a + (b - a) / 3, a + (2 * (b - a)) / 3, b + 0.025]) boxMM(P, "alu", xo, wy0, z - 0.025, x0 + 0.02, wy1, z + 0.025, 0.004);
    boxMM(P, "alu", x0 - 0.07, wy0 - 0.08, a - 0.08, x0, wy0 - 0.05, b + 0.08, 0.004);
    sheetLit.push(cellUV(wallQuad([x0, (wy0 + wy1) / 2, (a + b) / 2], b - a, wy1 - wy0, [-1, 0], 0.011), 1, 1, 4, 2));
    glassG.push(wallQuad([x0, (wy0 + wy1) / 2, (a + b) / 2], b - a, wy1 - wy0, [-1, 0], 0.018)); }
  // +Z end: the staff door (frame, leaf, wired window, lever, kick plate), the staff-only plate, a bulkhead lamp
  { const da = x1 - 1.38, db = x1 - 0.5, dh = 2.02, zf = z1 + 0.012;
    boxMM(P, "alu", da - 0.05, y0 + 0.14, z1 - 0.02, da, y0 + dh + 0.05, zf + 0.02, 0.004); boxMM(P, "alu", db, y0 + 0.14, z1 - 0.02, db + 0.05, y0 + dh + 0.05, zf + 0.02, 0.004);
    boxMM(P, "alu", da - 0.05, y0 + dh, z1 - 0.02, db + 0.05, y0 + dh + 0.05, zf + 0.02, 0.004);
    boxMM(P, "door", da, y0 + 0.14, z1 - 0.01, db, y0 + dh, zf + 0.006, 0.006);
    boxMM(P, "steelK", da + 0.02, y0 + 0.16, zf, db - 0.02, y0 + 0.42, zf + 0.011, 0.002);
    box(P, "steelK", [da + 0.12, y0 + 1.05, zf + 0.03], [0.05, 0.16, 0.03], 0.006); box(P, "steelK", [da + 0.19, y0 + 1.08, zf + 0.055], [0.15, 0.025, 0.025], 0.008);
    boxMM(P, "alu", db - 0.62, y0 + 1.28, zf, db - 0.22, y0 + 1.82, zf + 0.012, 0.004);
    glassG.push(wallQuad([db - 0.42, y0 + 1.55, zf], 0.34, 0.48, [0, 1], 0.014));
    sheet.push(cellUV(wallQuad([da - 0.3, y0 + 1.62, z1], 0.2, 0.2, [0, 1], 0.012), 1, 0, 4, 2));
    box(P, "lampCase", [(da + db) / 2, y0 + 2.3, z1 + 0.05], [0.3, 0.12, 0.1], 0.02); box(P, "lampGlow", [(da + db) / 2, y0 + 2.28, z1 + 0.075], [0.24, 0.07, 0.06], 0.02); }
  // -Z end (where the vending machines stand): a shallow steel awning on two brackets + a strip light under it
  { boxMM(P, "roof", x0 - 0.06, y0 + 2.2, z0 - 0.95, x1 + 0.06, y0 + 2.25, z0, 0.01); boxMM(P, "fascia", x0 - 0.07, y0 + 2.17, z0 - 0.97, x1 + 0.07, y0 + 2.27, z0 - 0.93, 0.008);
    for (const x of [x0 + 0.04, x1 - 0.04]) rod(P, "strip", [x, y0 + 2.2, z0 - 0.9], [x, y0 + 2.62, z0 - 0.01], 0.016, 6);
    box(P, "lampCase", [xc, y0 + 2.17, z0 - 0.5], [1.5, 0.05, 0.09], 0.01); box(P, "lampGlow", [xc, y0 + 2.145, z0 - 0.5], [1.4, 0.02, 0.06], 0.006); }
  // +X face (the train side): the extinguisher cabinet, the timetable (digits only), a route diagram (above the bins), the
  // emergency intercom + its red / white strip near the +Z end
  { const xf = x1;
    box(P, "red", [xf + 0.07, y0 + 0.82, z0 + 0.36], [0.14, 0.72, 0.36], 0.012); sheet.push(cellUV(wallQuad([xf + 0.14, y0 + 0.92, z0 + 0.36], 0.26, 0.26, [1, 0], 0.003), 0, 0, 4, 2));
    for (const [cz, col, row, wy] of [[z0 + 1.2, 0, 1, 1.5], [z0 + 2.5, 3, 0, 1.62]] as [number, number, number, number][]) {
      boxMM(P, "alu", xf, y0 + wy - 0.49, cz - 0.39, xf + 0.025, y0 + wy + 0.49, cz + 0.39, 0.006);
      sheet.push(cellUV(wallQuad([xf + 0.025, y0 + wy, cz], 0.7, 0.9, [1, 0], 0.003), col, row, 4, 2));
    }
    box(P, "alu", [xf + 0.05, y0 + 1.42, z1 - 0.5], [0.1, 0.5, 0.38], 0.012); sheet.push(cellUV(wallQuad([xf + 0.1, y0 + 1.52, z1 - 0.5], 0.26, 0.26, [1, 0], 0.003), 2, 0, 4, 2));
    box(P, "dark", [xf + 0.105, y0 + 1.28, z1 - 0.5], [0.012, 0.1, 0.22], 0.002);
    sheet.push(cellUV(wallQuad([xf, y0 + 2.2, z1 - 0.5], 0.5, 0.12, [1, 0], 0.012), 2, 1, 4, 2)); }
  const M = {
    plinth: await surface(ctx, "concrete_floor", { uv: "uv", tint: [0.74, 0.73, 0.7], dirt: { grime: 0.3, bottom: 0.7, heightM: 0.14, baseY: y0 }, wear: { edges: 1 } }) as THREE.Material,
    panel: await surface(ctx, "painted_metal", { uv: "uv", tint: [0.88, 0.89, 0.86], sat: 0.12, rough: 0.9, rot: Math.PI / 2, dirt: { bottom: 0.75, heightM: 0.55, baseY: y0, grime: 0.2, streaks: 0.45 }, wear: { edges: 0.5 } }) as THREE.Material,
    fascia: shared("kioskFascia", () => mat([0.2, 0.38, 0.33], 0.45, 0.3)), roof: shared("kioskRoof", () => mat([0.58, 0.59, 0.58], 0.6, 0.2)), strip: shared("kioskStrip", () => mat([0.8, 0.8, 0.76], 0.45, 0.4)),
    acU: shared("acUnit", () => mat([0.86, 0.86, 0.83], 0.5, 0.1)), alu: aluM(), dark: darkM(), door: shared("kioskDoor", () => mat([0.3, 0.46, 0.44], 0.5, 0.2)), steelK: steelM(),
    red: redM(), lampCase: darkM(), lampGlow: shared("lampGlow", () => glow([1.0, 0.9, 0.72], 2.2, 0.5)),
  };
  G.add(flush(P, M, { name: "kiosk", module: "rail-kiosk" }));
  if (sheet.length) G.add(quadMesh(sheet, sheetMat()));
  if (sheetLit.length) G.add(quadMesh(sheetLit, sheetGlow()));
  if (glassG.length) { const gm = quadMesh(glassG, glassDark()); gm.renderOrder = 2; G.add(gm); }
  return { object: G as THREE.Object3D };
};

// ---------------------------------------------------------------- LED departure board (digits only)
const DOT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"], "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"], "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"], "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"], "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"], "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["00000", "00100", "00100", "00000", "00100", "00100", "00000"],
};
const dots = (g: CanvasRenderingContext2D, txt: string, x: number, y: number, p: number, col: string) => {
  g.fillStyle = col;
  for (const ch of txt) {
    const G5 = DOT[ch];
    if (G5) for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (G5[r][c] === "1") { g.beginPath(); g.arc(x + c * p + p / 2, y + r * p + p / 2, p * 0.42, 0, 7); g.fill(); }
    x += (ch === ":" ? 4 : 6) * p;
  }
};
const ledTex = (seed: number) => memo("led" + (seed % 2), () => canvasTex(768, 160, (g, w, h) => {
  g.fillStyle = "#050506"; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(70,45,20,0.4)"; for (let y = 6; y < h; y += 8) for (let x = 6; x < w; x += 8) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }   // the unlit dot grid
  // two departures: a line-colour block, the time, the platform number, the car count
  const rows: [string, string, string, string][] = seed % 2 ? [["#ff8a1e", "17:36", "1", "10"], ["#37e06a", "17:44", "1", "10"]] : [["#ff8a1e", "17:38", "2", "10"], ["#37e06a", "17:47", "2", "8"]];
  rows.forEach(([col, tm, pf, cars], k) => { const y = 14 + k * 76;
    g.fillStyle = k ? "#1f9a5a" : "#e8792b"; g.fillRect(18, y + 4, 44, 48);
    dots(g, tm, 92, y, 8, col); dots(g, pf, 400, y, 8, "#ff5a2a"); dots(g, cars, 560, y, 8, col); });
}));
const LED_U = { uT: { value: 0 } };
const ledRun = () => shared("ledRun", () => {
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(1.0, 0.42, 0.1), emissiveIntensity: 1.6, roughness: 0.25 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = LED_U.uT;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vUvL;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvUvL = uv;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uT;\nvarying vec2 vUvL;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      {
        vec2 q = vUvL * vec2( 96.0, 5.0 ); vec2 c = fract( q ) - 0.5;
        float dotK = smoothstep( 0.42, 0.3, length( c ) );
        float col = floor( q.x ), row = floor( q.y );
        float ph = mod( col - floor( uT * 14.0 ), 8.0 );            // chevrons running along the board
        float chev = step( abs( ph - ( 2.0 - abs( row - 2.0 ) ) ), 0.5 );
        totalEmissiveRadiance *= dotK * ( 0.05 + chev );
      }`);
  };
  m.customProgramCacheKey = () => "rail:ledrun";
  return m;
});
/** a double-faced LED departure indicator hanging at `pos` (its centre); faces look along +-Z (rotated by yaw); the bottom
 *  row of chevrons runs (life). Digits, a colon and arrows only. */
export const ledBoard = (o: { pos: V3; yaw?: number; hangTo?: number; seed?: number }) => {
  const G = new THREE.Group(); G.name = "led-board";
  const P: Parts = new Map(), W = 1.7, H = 0.46;
  box(P, "case", [0, 0, 0], [W + 0.08, H + 0.08, 0.16], 0.02); box(P, "case", [0, H / 2 + 0.07, 0], [W + 0.14, 0.03, 0.26], 0.008);
  if (o.hangTo) for (const x of [-0.6, 0.6]) rod(P, "case", [x, H / 2, 0], [x, o.hangTo - o.pos[1], 0], 0.02, 6);
  G.add(flush(P, { case: darkM() }, { name: "led" }));
  const seed = o.seed ?? 1, t = ledTex(seed);
  const fm = shared("ledFace" + (seed % 2), () => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(1, 1, 1), emissiveMap: t, emissiveIntensity: 1.5, roughness: 0.25 }));
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(W, H * 0.78), fm); f.position.set(0, H * 0.11, s * 0.082); if (s < 0) f.rotation.y = Math.PI; G.add(f);
    const a = new THREE.Mesh(new THREE.PlaneGeometry(W, H * 0.14), ledRun()); a.position.set(0, -H * 0.4, s * 0.082); if (s < 0) a.rotation.y = Math.PI; G.add(a);
  }
  G.position.set(...o.pos); G.rotation.y = o.yaw ?? 0; tagAll(G);
  return { object: G as THREE.Object3D, update: (tt: number) => { LED_U.uT.value = tt; } };
};

// ---------------------------------------------------------------- door-position marks + the driver's stop marker
/** painted door marks on the slabs behind the tactile row: a line-colour bar with two arrows toward the door and the
 *  car . door digits, two worn white queue lines behind it. One atlas, one draw. `x` = the platform edge (track on +x). */
export const doorMarks = (doors: { z: number; car: number; door: number }[], o: { x: number; top: number; color?: string }) => {
  const cols = 8, rows = Math.ceil((doors.length + 1) / cols), cw = 256, ch = 96;
  const tex = canvasTex(cols * cw, rows * ch, (g) => {
    g.clearRect(0, 0, cols * cw, rows * ch);
    doors.forEach((d, i) => {
      const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch, R = rng(d.car * 17 + d.door);
      g.fillStyle = o.color ?? "#2c8a62"; g.beginPath(); g.roundRect(x0 + 6, y0 + 10, cw - 12, ch - 20, 10); g.fill();
      g.strokeStyle = "#f2f1ea"; g.lineWidth = 4; g.stroke();
      g.fillStyle = "#f2f1ea";
      for (const ax of [34, cw - 34]) { g.beginPath(); g.moveTo(x0 + ax, y0 + 22); g.lineTo(x0 + ax - 18, y0 + 56); g.lineTo(x0 + ax + 18, y0 + 56); g.closePath(); g.fill(); g.fillRect(x0 + ax - 6, y0 + 54, 12, 18); }
      g.font = `bold 50px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(String(d.car), x0 + 98, y0 + ch / 2 + 3); g.fillText(String(d.door), x0 + 160, y0 + ch / 2 + 3);
      g.beginPath(); g.arc(x0 + 129, y0 + ch / 2 + 3, 5, 0, 7); g.fill();
      g.globalCompositeOperation = "destination-out";       // foot wear: scuffed-through patches
      for (let k = 0; k < 150; k++) { g.fillStyle = `rgba(0,0,0,${(0.25 + R() * 0.55).toFixed(2)})`; const s = 1 + R() * 5; g.fillRect(x0 + R() * cw, y0 + R() * ch, s * (1 + R() * 3), s); }
      g.globalCompositeOperation = "source-over";
    });
    // the last cell: worn white paint (the queue lines)
    const n = doors.length, x0 = (n % cols) * cw, y0 = Math.floor(n / cols) * ch, R = rng(3);
    g.fillStyle = "#efeee6"; g.fillRect(x0, y0, cw, ch); g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(0,0,0,${(0.2 + R() * 0.6).toFixed(2)})`; const s = 1 + R() * 4; g.fillRect(x0 + R() * cw, y0 + R() * ch, s * (1 + R() * 5), s); }
    g.globalCompositeOperation = "source-over";
  });
  const quads: THREE.BufferGeometry[] = [], y = o.top + 0.006;
  /** a floor quad: canvas up = +x (toward the train), canvas right = +z */
  const flat = (xa: number, xb: number, za: number, zb: number, col: number, row: number) => {
    const q = new THREE.BufferGeometry(), e = 0.004;
    q.setAttribute("position", new THREE.Float32BufferAttribute([xa, y, za, xa, y, zb, xb, y, za, xb, y, zb], 3));
    q.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    const u0 = col / cols + e, u1 = (col + 1) / cols - e, v0 = 1 - (row + 1) / rows + e, v1 = 1 - row / rows - e;
    q.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u1, v0, u0, v1, u1, v1], 2));
    q.setIndex([0, 1, 2, 2, 1, 3]); quads.push(q);
  };
  const n = doors.length, wc = n % cols, wr = Math.floor(n / cols);
  doors.forEach((d, i) => {
    flat(o.x - 1.68, o.x - 1.2, d.z - 0.64, d.z + 0.64, i % cols, Math.floor(i / cols));
    for (const s of [-1, 1]) flat(o.x - 3.0, o.x - 1.8, d.z + s * 0.72 - 0.03, d.z + s * 0.72 + 0.03, wc, wr);
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.08, roughness: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const me = quadMesh(quads, m); me.name = "door-marks"; me.renderOrder = 1; me.userData.kitModule = "rail-marks";
  return me as THREE.Object3D;
};
/** 8 x 2 sheet: row 0 = column plates 1-8 (white on blue), row 1 = stop-marker diamonds (car counts) */
const STOP_NUMS = ["10", "8", "6", "4", "12", "15", "2", "1"];
const digitSheet = () => memo("digitSheet", () => canvasTex(1024, 256, (g) => {
  for (let i = 0; i < 16; i++) {
    const x0 = (i % 8) * 128, y0 = Math.floor(i / 8) * 128; g.textAlign = "center"; g.textBaseline = "middle";
    if (i < 8) {
      g.fillStyle = "#1d4f91"; g.fillRect(x0, y0, 128, 128); g.strokeStyle = "#e9edf2"; g.lineWidth = 6; g.strokeRect(x0 + 8, y0 + 8, 112, 112);
      g.fillStyle = "#f4f6f8"; g.font = `bold 78px ${FONT}`; g.fillText(String(i + 1), x0 + 64, y0 + 68);
    } else {
      g.fillStyle = "#17181a"; g.fillRect(x0, y0, 128, 128); g.fillStyle = "#f3f2ec"; g.beginPath(); g.moveTo(x0 + 64, y0 + 4); g.lineTo(x0 + 124, y0 + 64); g.lineTo(x0 + 64, y0 + 124); g.lineTo(x0 + 4, y0 + 64); g.closePath(); g.fill();
      g.strokeStyle = "#17181a"; g.lineWidth = 6; g.stroke(); g.fillStyle = "#17181a"; g.font = `bold 54px ${FONT}`; g.fillText(STOP_NUMS[i - 8], x0 + 64, y0 + 68);
    }
  }
  grime(g, 1024, 256, 21, 900, 0.05);
}));
const digitMat = () => shared("digitSheet", () => new THREE.MeshStandardMaterial({ map: digitSheet(), roughness: 0.5, side: THREE.DoubleSide }));
/** the driver's stop-position marker: a yellow diamond with the car count (digits) on a short post at the platform edge,
 *  facing +Z (the arriving cab): the thing a driver points at when he stops. */
export const stopMarker = (o: { pos: V3; num?: string }) => {
  const G = new THREE.Group(); G.name = "stop-marker";
  const P: Parts = new Map();
  cyl(P, "post", [0, 0, 0], 0.028, 0.028, 1.02, 10); box(P, "post", [0, 0.008, 0], [0.16, 0.016, 0.16], 0.004); box(P, "plateBack", [0, 1.2, -0.006], [0.4, 0.4, 0.012], 0.004);
  G.add(flush(P, { post: shared("postGrey", () => mat([0.8, 0.81, 0.8], 0.5, 0.4)), plateBack: darkM() }, { name: "stop" }));
  const q = cellUV(new THREE.PlaneGeometry(0.38, 0.38), Math.max(0, STOP_NUMS.indexOf(o.num ?? "10")), 1, 8, 2); q.translate(0, 1.2, 0.002);
  G.add(quadMesh([q], digitMat(), true));
  G.position.set(...o.pos); tagAll(G);
  return G as THREE.Object3D;
};
/** what hangs on the canopy columns (x = the column line, columns at `colZ`): a numbered plate on each, an emergency-stop
 *  button box (a red mushroom button, a hazard strip, its conduit) on every 2nd one, a horn speaker on every 3rd */
export const columnKit = (colZ: number[], o: { x: number; top: number }) => {
  const G = new THREE.Group(); G.name = "column-kit";
  const P: Parts = new Map(), plates: THREE.BufferGeometry[] = [], sheet: THREE.BufferGeometry[] = [];
  [...colZ].sort((a, b) => a - b).forEach((z, i) => {
    for (const s of [1, -1]) plates.push(cellUV(wallQuad([o.x, o.top + 2.25, z], 0.2, 0.2, [s, 0], 0.158), i % 8, 0, 8, 2));
    if (i % 2 === 0) for (const s of [1, -1]) {
      box(P, "stopBox", [o.x + s * 0.2, o.top + 1.32, z], [0.1, 0.34, 0.24], 0.012);
      cyl(P, "red", [o.x + s * 0.25 - (s < 0 ? 0.035 : 0), o.top + 1.3, z], 0.05, 0.045, 0.035, 14, "x");
      sheet.push(cellUV(wallQuad([o.x + s * 0.2, o.top + 1.6, z], 0.24, 0.16, [s, 0], 0.052), 2, 1, 4, 2));
      rod(P, "conduit", [o.x + s * 0.17, o.top + 1.5, z + 0.1], [o.x + s * 0.17, o.top + 3.4, z + 0.1], 0.012, 6);
    }
    if (i % 3 === 1) { cyl(P, "speaker", [o.x, o.top + 3.02, z + 0.24], 0.07, 0.15, 0.22, 14, "z"); box(P, "conduit", [o.x, o.top + 3.1, z + 0.2], [0.05, 0.16, 0.06], 0.006); }
  });
  G.add(flush(P, { stopBox: shared("stopBox", () => mat([0.86, 0.86, 0.83], 0.45, 0.2)), red: redM(), conduit: aluM(), speaker: shared("speaker", () => mat([0.84, 0.84, 0.8], 0.5, 0.2)) }, { name: "colkit", module: "rail-colkit" }));
  if (plates.length) G.add(quadMesh(plates, digitMat()));
  if (sheet.length) G.add(quadMesh(sheet, sheetMat()));
  return G as THREE.Object3D;
};
/** 4 blank ad posters (pictures only, no text): mountain + sun, a drink can, waves, a train front */
const posterSheet = () => memo("posterSheet", () => canvasTex(1024, 512, (g) => {
  const cell = (i: number, f: () => void) => { g.save(); g.translate(i * 256, 0); g.beginPath(); g.rect(0, 0, 256, 512); g.clip(); f(); g.restore(); };
  cell(0, () => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#f2b9a0"); gr.addColorStop(1, "#f3e9e0"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
    g.fillStyle = "#e9573a"; g.beginPath(); g.arc(170, 170, 54, 0, 7); g.fill();
    g.fillStyle = "#3d6b8e"; g.beginPath(); g.moveTo(0, 400); g.lineTo(96, 210); g.lineTo(150, 300); g.lineTo(196, 250); g.lineTo(256, 380); g.lineTo(256, 512); g.lineTo(0, 512); g.fill();
    g.fillStyle = "#f4f4f0"; g.beginPath(); g.moveTo(96, 210); g.lineTo(72, 258); g.lineTo(98, 246); g.lineTo(118, 262); g.closePath(); g.fill(); });
  cell(1, () => { g.fillStyle = "#1f6f9a"; g.fillRect(0, 0, 256, 512); g.fillStyle = "#e9eef0"; g.fillRect(84, 150, 88, 22); g.fillStyle = "#f4f4f0"; g.fillRect(84, 172, 88, 190); g.fillStyle = "#d8402c"; g.fillRect(84, 230, 88, 56);
    g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(96, 176, 12, 182); g.fillStyle = "#bfe3f2"; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(40 + ((k * 67) % 190), 60 + ((k * 131) % 400), 9 + (k % 3) * 4, 0, 7); g.fill(); } });
  cell(2, () => { g.fillStyle = "#f2efe6"; g.fillRect(0, 0, 256, 512);
    for (let k = 0; k < 7; k++) { g.strokeStyle = ["#2b6fc0", "#3a8fd0", "#7fc0e6"][k % 3]; g.lineWidth = 14; g.beginPath(); for (let x = 0; x <= 256; x += 8) { const y = 150 + k * 46 + 22 * Math.sin(x * 0.045 + k * 1.1); if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = "#e9573a"; g.beginPath(); g.arc(128, 84, 36, 0, 7); g.fill(); });
  cell(3, () => { g.fillStyle = "#2a8a5c"; g.fillRect(0, 0, 256, 512); g.fillStyle = "#d9dcdc"; g.beginPath(); g.roundRect(56, 150, 144, 220, 22); g.fill(); g.fillStyle = "#14171a"; g.beginPath(); g.roundRect(72, 170, 112, 84, 8); g.fill();
    g.fillStyle = "#1f9a5a"; g.fillRect(56, 280, 144, 22); g.fillStyle = "#fff6c8"; g.beginPath(); g.arc(86, 332, 12, 0, 7); g.arc(170, 332, 12, 0, 7); g.fill(); g.fillStyle = "#3b3f44"; g.fillRect(40, 392, 176, 10); g.fillRect(70, 372, 14, 26); g.fillRect(172, 372, 14, 26); });
  grime(g, 1024, 512, 31, 1800, 0.04);
}));
/** a double-sided framed poster on two legs (a lit ad panel between the columns); its faces look along +-Z (rotated by yaw) */
export const posterStand = (o: { pos: V3; yaw?: number; seed?: number }) => {
  const G = new THREE.Group(); G.name = "poster";
  const P: Parts = new Map(), W = 1.06, H = 1.5, y0 = 0.42;
  for (const x of [-W / 2 + 0.04, W / 2 - 0.04]) { box(P, "frame", [x, y0 / 2, 0], [0.05, y0, 0.05], 0.006); box(P, "frame", [x, 0.01, 0], [0.09, 0.02, 0.34], 0.004); }
  box(P, "frame", [0, y0 + H / 2, 0], [W, H, 0.09], 0.012);
  G.add(flush(P, { frame: aluM() }, { name: "poster" }));
  const pm = shared("posterGlow", () => new THREE.MeshStandardMaterial({ map: posterSheet(), emissive: new THREE.Color(1, 1, 1), emissiveMap: posterSheet(), emissiveIntensity: 0.3, roughness: 0.35 }));
  const qs: THREE.BufferGeometry[] = [];
  for (const [k, s] of [1, -1].entries()) qs.push(cellUV(wallQuad([0, y0 + H / 2, 0], W - 0.1, H - 0.1, [0, s], 0.047), ((o.seed ?? 1) + k) % 4, 0, 4, 1));
  G.add(quadMesh(qs, pm));
  G.position.set(...o.pos); G.rotation.y = o.yaw ?? 0; tagAll(G);
  return G as THREE.Object3D;
};
/** a platform light pole for the uncovered end of a platform: a tapered grey pole on a base plate, a T arm with two LED
 *  heads (emissive strips: bloom at golden hour), a horn speaker, optionally a pictogram board (both faces along +-Z) */
export const lightPole = (o: { pos: V3; yaw?: number; board?: THREE.Texture; h?: number }) => {
  const G = new THREE.Group(); G.name = "light-pole";
  const P: Parts = new Map(), H = o.h ?? 4.3;
  cyl(P, "pole", [0, 0, 0], 0.07, 0.05, H, 12); box(P, "pole", [0, 0.012, 0], [0.3, 0.024, 0.3], 0.004);
  for (const [bx, bz] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) cyl(P, "bolt", [bx, 0.02, bz], 0.012, 0.012, 0.035, 6);
  box(P, "pole", [0, H - 0.04, 0], [1.5, 0.05, 0.06], 0.006);
  for (const x of [-0.5, 0.5]) { box(P, "head", [x, H - 0.1, 0], [0.62, 0.07, 0.17], 0.012); box(P, "ledGlow", [x, H - 0.142, 0], [0.54, 0.014, 0.11], 0.004); }
  cyl(P, "speaker", [0.09, H - 0.75, 0.12], 0.06, 0.13, 0.2, 14, "z"); box(P, "pole", [0.09, H - 0.7, 0.03], [0.04, 0.12, 0.08], 0.006);
  if (o.board) { box(P, "head", [0, 2.62, 0], [1.3, 0.46, 0.08], 0.01); for (const x of [-0.4, 0.4]) box(P, "pole", [x, 2.62, 0], [0.05, 0.3, 0.1], 0.004); }
  G.add(flush(P, { pole: shared("poleGrey", () => mat([0.78, 0.8, 0.79], 0.5, 0.5)), bolt: darkM(), head: darkM(), ledGlow: shared("ledGlow", () => glow([1.0, 0.97, 0.9], 1.8, 0.6)), speaker: shared("speaker", () => mat([0.84, 0.84, 0.8], 0.5, 0.2)) }, { name: "light-pole" }));
  if (o.board) {
    const bm = shared("board:" + o.board.uuid, () => new THREE.MeshStandardMaterial({ map: o.board!, emissive: new THREE.Color(1, 1, 1), emissiveMap: o.board!, emissiveIntensity: 0.35, roughness: 0.4 }));
    G.add(quadMesh([wallQuad([0, 2.62, 0], 1.24, 0.42, [0, 1], 0.042), wallQuad([0, 2.62, 0], 1.24, 0.42, [0, -1], 0.042)], bm, true));
  }
  G.position.set(...o.pos); G.rotation.y = o.yaw ?? 0; tagAll(G);
  return G as THREE.Object3D;
};

// The Tokyo island platform kit (STATION owner): `islandPlatform` (hero: SURFACES `platform()` x 2 back to back, displaced
// slabs, tactile row 0.8 m from each edge, coping + white edge line) and `islandLite` (the same layout with metre-UV
// surfaces, for the moving station in the cab treadmill), the canopy K-P10 (cream H-beam columns every 8 m, cantilever
// rafters, purlins, corrugated steel roof with CLEAR polycarbonate bays = the sun stripes, eave gutters + downpipes, LED
// strip lights), benches K-P8, recycling bins K-P9, the drinks vending machine K-P7, the ITV monitor K-P11, pole clocks,
// pictogram boards, the stair well, door-position marks. No Japanese text anywhere: pictograms, digits and arrows only.
// Frame: the island runs along Z between xB (track-2 edge, smaller x) and xA (track-1 edge); the platform top at y = top.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { KitCtx, V3 } from "../core/ctx";
import { platform, kerbMesh, boxUVsAndWear } from "../surfaces/ground";
import { surface } from "../surfaces/materials";
import { paintLines } from "../surfaces/decals";
import { box, boxMM, canvasTex, cyl, flush, glow, grime, hash, hbeam, mat, rod, rng, type Parts } from "./util";
import { groundStrip } from "./track";

export type IslandOpts = {
  xA: number; xB: number;            // track-1 edge x (larger) and track-2 edge x (smaller)
  z0: number; z1: number;            // platform z range (z0 < z1)
  top?: number;                      // platform top y (default 0)
  base?: number;                     // track base y below (default top - 1.69: rail top 1.1 below the platform)
  canopy?: { z0: number; z1: number; colZ?: number; clear?: (bay: number) => boolean } | null;
  lens?: { points: [number, number][] };
  /** islandLite only: slab / tactile colour (linear tint, saturation) */
  slab?: { tint: [number, number, number]; sat: number }; tactile?: { tint: [number, number, number]; sat: number };
  /** the old generic triangles every 5 m (default true); pass false when the set paints real door marks (`doorMarks`) */
  marks?: boolean;
  seed?: number;
};

// ---------------------------------------------------------------- the canopy (K-P10)
export const canopy = async (ctx: KitCtx, o: { xc: number; halfW: number; top: number; z0: number; z1: number; colZ?: number; clear?: (bay: number) => boolean; lite?: boolean; seed?: number }) => {
  const P: Parts = new Map(), y0 = o.top, eave = y0 + 3.45, ridge = y0 + 3.85, hw = o.halfW, xc = o.xc;
  const sp = 8, c0 = o.colZ ?? o.z1 - 4;
  const cols: number[] = []; for (let z = c0; z > o.z0 + 1; z -= sp) cols.push(z);
  const clear = o.clear ?? ((b: number) => b % 2 === 1);
  for (const z of cols) {
    hbeam(P, "cream", [xc, y0, z], ridge - 0.25 - y0, 0.3, 0.3, 0.014, 0);
    box(P, "cream", [xc, y0 + 0.012, z], [0.5, 0.024, 0.5], 0.004);
    for (const [bx, bz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) cyl(P, "bolt", [xc + bx, y0 + 0.02, z + bz], 0.016, 0.016, 0.05, 6);
    if (!o.lite) box(P, "kick", [xc, y0 + 0.22, z], [0.34, 0.44, 0.34], 0.004);         // stainless kick plate
    // cantilever rafters: I-beams from the column head out to both eaves (sloping down), knee braces
    for (const s of [-1, 1]) {
      const a: V3 = [xc, ridge - 0.12, z], b: V3 = [xc + s * hw, eave - 0.12, z];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const g = new THREE.BoxGeometry(L, 0.3, 0.15); g.rotateZ(ang); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
      boxUVsAndWear(g); P.get("cream") ? P.get("cream")!.push(g) : P.set("cream", [g]);
      rod(P, "cream", [xc + s * 0.15, ridge - 1.25, z], [xc + s * 1.3, ridge - 0.25 - 0.1 * 1.3, z], 0.05, 6);
    }
  }
  // purlins (C-sections) along the roof, the deck, gutters, LED strip housings
  const zA = o.z0, zB = o.z1, L = zB - zA, zc = (zA + zB) / 2;
  for (const s of [-1, 1]) for (const u of [0.08, 0.35, 0.62, 0.9]) {
    const x = xc + s * hw * u, y = ridge - 0.12 - (ridge - eave) * u + 0.16;
    box(P, "cream", [x, y, zc], [0.1, 0.15, L], 0.004);
  }
  // corrugated deck: opaque steel bays + clear polycarbonate bays (no shadow), split by the column grid
  const deck: { g: THREE.BufferGeometry; clear: boolean }[] = [];
  const edges = [zB, ...cols.map((c) => c - sp / 2).filter((z) => z > zA && z < zB), zA].sort((a, b) => b - a);
  for (let i = 0; i < edges.length - 1; i++) {
    const za = edges[i + 1], zb = edges[i], isClear = !o.lite && clear(i);
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(hw + 0.05, zb - za, 24, 1);
      g.rotateX(-Math.PI / 2);
      const pa = g.getAttribute("position") as THREE.BufferAttribute;
      for (let k = 0; k < pa.count; k++) {
        const lx = pa.getX(k) + (hw + 0.05) / 2;              // 0 at the ridge .. hw at the eave
        const xw = xc + s * lx, y = ridge - (ridge - eave) * (lx / hw) + 0.25;      // flat sheet: the corrugation is in the surface's normal map (a geometric ripple at this tessellation aliased into dots)
        pa.setXYZ(k, xw, y, pa.getZ(k) + (za + zb) / 2);
      }
      g.computeVertexNormals();
      const uv = g.getAttribute("uv") as THREE.BufferAttribute; for (let k = 0; k < uv.count; k++) uv.setXY(k, pa.getX(k), pa.getZ(k));
      deck.push({ g, clear: isClear });
    }
  }
  for (const s of [-1, 1]) {
    const gx = xc + s * (hw + 0.12);
    box(P, "gutter", [gx, eave + 0.1, zc], [0.2, 0.16, L], 0.01);                   // eave gutter
    box(P, "cream", [xc + s * (hw + 0.02), eave + 0.17, zc], [0.04, 0.3, L], 0.004); // fascia
    for (const z of cols.filter((_, k) => k % 3 === 0)) { rod(P, "gutter", [gx, eave + 0.04, z + 0.125], [xc + s * 0.2, ridge - 0.34, z + 0.125], 0.04, 8); rod(P, "gutter", [xc + s * 0.2, ridge - 0.32, z + 0.125], [xc + s * 0.2, y0 + 0.04, z + 0.125], 0.04, 8); }
    // LED strip housings under the deck, a row each side
    box(P, "led", [xc + s * hw * 0.5, ridge - (ridge - eave) * 0.5 - 0.05, zc], [0.12, 0.06, L - 1], 0.01);
  }
  const corr = await surface(ctx, "corrugated_metal", { uv: "uv", tint: [0.93, 0.93, 0.92], sat: 0.1, rot: Math.PI / 2, dirt: { grime: 0.12, streaks: 0.25 }, side: THREE.DoubleSide });
  // the two ends: barge boards along both roof slopes + a ridge cap (the bare sheet edge + purlin ends read unfinished)
  for (const z of [zA - 0.03, zB + 0.03]) for (const s of [-1, 1]) {
    const a: V3 = [xc, ridge + 0.2, z], b: V3 = [xc + s * (hw + 0.06), eave + 0.2, z];
    const Lb = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const g = new THREE.BoxGeometry(Lb, 0.34, 0.045); g.rotateZ(ang); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.06, z);
    boxUVsAndWear(g); P.get("cream")!.push(g);
  }
  box(P, "gutter", [xc, ridge + 0.275, zc], [0.34, 0.035, L + 0.1], 0.008);
  const poly = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.85, 0.88, 0.86), roughness: 0.18, transmission: 0, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  const G = new THREE.Group(); G.name = "canopy";
  const op = deck.filter((d) => !d.clear).map((d) => d.g), cl = deck.filter((d) => d.clear).map((d) => d.g);
  if (op.length) { const m = new THREE.Mesh(mergeGeometries(op)!, corr); m.castShadow = true; m.receiveShadow = true; G.add(m); }
  if (cl.length) { const m = new THREE.Mesh(mergeGeometries(cl)!, poly); m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2; G.add(m); }
  const M = {
    cream: await surface(ctx, "plaster", { uv: "uv", tint: [0.87, 0.88, 0.85], sat: 0.15, rough: 0.85, metal: 0.25, dirt: { bottom: 0.7, heightM: 0.5, baseY: y0, grime: 0.18 }, wear: { edges: 0.7 } }) as THREE.Material,
    bolt: mat([0.3, 0.26, 0.22], 0.6, 0.6), kick: mat([0.8, 0.8, 0.79], 0.42, 0.55), gutter: mat([0.55, 0.56, 0.55], 0.5, 0.3),
    led: glow([1.0, 0.97, 0.9], 1.6, 0.6),
  };
  G.add(flush(P, M, { name: "canopy", module: "rail-canopy" }));
  return { object: G as THREE.Object3D, cols, eave, ridge };
};

// ---------------------------------------------------------------- pictogram textures (no text)
const tex = new Map<string, THREE.Texture>();
const memo = (k: string, f: () => THREE.Texture) => { if (!tex.has(k)) tex.set(k, f()); return tex.get(k)!; };
/** a hanging platform board: navy panel, white circled number, an arrow, a stairs or wheelchair pictogram */
export const boardTex = (kind: "num1" | "stairs" | "exit" | "wc") => memo("board:" + kind, () => canvasTex(512, 192, (g, w, h) => {
  g.fillStyle = "#1e2b44"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d8dde4"; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = "#f4f4f0"; g.strokeStyle = "#f4f4f0"; g.lineWidth = 10; g.lineCap = "round"; g.lineJoin = "round";
  const arrow = (x: number, y: number, dir: 1 | -1) => { g.beginPath(); g.moveTo(x - dir * 50, y); g.lineTo(x + dir * 40, y); g.stroke(); g.beginPath(); g.moveTo(x + dir * 52, y); g.lineTo(x + dir * 18, y - 30); g.lineTo(x + dir * 18, y + 30); g.closePath(); g.fill(); };
  if (kind === "num1") {
    g.beginPath(); g.arc(110, h / 2, 62, 0, Math.PI * 2); g.lineWidth = 9; g.stroke();
    g.font = "bold 96px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("1", 110, h / 2 + 6);
    g.fillStyle = "#2fa86a"; g.fillRect(210, h / 2 - 8, 120, 16);                          // the line colour bar (emerald)
    g.fillStyle = "#f4f4f0"; arrow(420, h / 2, 1);
  } else if (kind === "stairs") {
    g.lineWidth = 12; g.beginPath(); let x = 60, y = 150; g.moveTo(x, y); for (let i = 0; i < 4; i++) { y -= 26; g.lineTo(x, y); x += 30; g.lineTo(x, y); } g.stroke();
    g.beginPath(); g.arc(150, 40, 14, 0, Math.PI * 2); g.fill(); arrow(380, h / 2, -1);
  } else if (kind === "exit") {
    g.fillStyle = "#e8c23a"; g.fillRect(40, 40, 110, 112); g.fillStyle = "#1e2b44"; g.fillRect(70, 60, 50, 92); g.fillStyle = "#e8c23a"; g.beginPath(); g.arc(110, 104, 5, 0, 7); g.fill();
    g.fillStyle = "#f4f4f0"; arrow(330, h / 2, 1);
  } else {
    g.beginPath(); g.arc(110, 52, 15, 0, 7); g.fill(); g.lineWidth = 11; g.beginPath(); g.moveTo(108, 72); g.lineTo(104, 120); g.lineTo(140, 120); g.lineTo(150, 152); g.stroke();
    g.lineWidth = 8; g.beginPath(); g.arc(104, 130, 34, Math.PI * 0.6, Math.PI * 2.2); g.stroke(); arrow(380, h / 2, 1);
  }
}));

// ---------------------------------------------------------------- props
/** K-P8: a bench of `n` moulded bucket seats on a steel beam (orange / blue alternating), facing +X at the local origin */
export const bench = (P: Parts, at: V3, n = 4, yaw = 0, seed = 1) => {
  const g: Parts = new Map(), R = rng(seed);
  const w = 0.48, L = n * w;
  for (const z of [-L / 2 + 0.25, L / 2 - 0.25]) {
    box(g, "frame", [0, 0.2, z], [0.06, 0.4, 0.06], 0.006); box(g, "frame", [0, 0.012, z], [0.5, 0.024, 0.16], 0.004);
  }
  box(g, "frame", [0, 0.38, 0], [0.08, 0.06, L], 0.006);
  for (let i = 0; i < n; i++) {
    const z = -L / 2 + w * (i + 0.5), k = i % 2 ? "seatB" : "seatO";
    box(g, k, [0.05, 0.43, z], [0.42, 0.05, 0.43], 0.03);                       // pan
    const back = new THREE.BoxGeometry(0.05, 0.42, 0.43); back.rotateZ(-0.18); back.translate(-0.19, 0.66, z); boxUVsAndWear(back); g.get(k) ? g.get(k)!.push(back) : g.set(k, [back]);
    void R;
  }
  for (const [k, list] of g) for (const geo of list) { geo.rotateY(yaw); geo.translate(at[0], at[1], at[2]); (P.get(k) ?? P.set(k, []).get(k)!).push(geo); }
};
/** K-P9: a recycling station of 3 bins (cans + bottles / PET / paper), pictogram panels, facing +X */
export const binsTex = () => memo("bins", () => canvasTex(768, 256, (g, w, h) => {
  const cols = ["#2f6fb3", "#3e8d5a", "#8a8f96"];
  for (let i = 0; i < 3; i++) {
    const x0 = i * 256; g.fillStyle = "#d9dcdc"; g.fillRect(x0, 0, 256, h); g.fillStyle = cols[i]; g.fillRect(x0 + 18, 18, 220, 58);
    g.fillStyle = "#1b1d20"; g.beginPath(); g.ellipse(x0 + 128, 47, i === 2 ? 80 : 34, i === 2 ? 9 : 22, 0, 0, Math.PI * 2); g.fill();  // the slot
    g.fillStyle = "#ffffff"; g.strokeStyle = "#ffffff"; g.lineWidth = 7;
    const cx = x0 + 128, cy = 165;
    if (i === 0) { g.fillRect(cx - 52, cy - 34, 34, 70); g.beginPath(); g.moveTo(cx + 18, cy + 36); g.lineTo(cx + 18, cy - 8); g.lineTo(cx + 30, cy - 34); g.lineTo(cx + 40, cy - 34); g.lineTo(cx + 52, cy - 8); g.lineTo(cx + 52, cy + 36); g.closePath(); g.fill(); }
    else if (i === 1) { g.beginPath(); g.moveTo(cx - 20, cy + 40); g.lineTo(cx - 20, cy - 10); g.lineTo(cx - 8, cy - 30); g.lineTo(cx - 8, cy - 44); g.lineTo(cx + 8, cy - 44); g.lineTo(cx + 8, cy - 30); g.lineTo(cx + 20, cy - 10); g.lineTo(cx + 20, cy + 40); g.closePath(); g.fill(); g.fillStyle = cols[1]; g.fillRect(cx - 20, cy, 40, 14); }
    else { for (let k = 0; k < 4; k++) g.fillRect(cx - 50, cy - 30 + k * 18, 100, 8); }
    grime(g, 256, h, 30 + i, 300, 0.06);
  }
}));
export const bins = (P: Parts, at: V3, yaw = 0) => {
  const g: Parts = new Map();
  box(g, "binBody", [0, 0.48, 0], [0.42, 0.96, 1.32], 0.02);
  box(g, "binTop", [0, 0.975, 0], [0.45, 0.03, 1.35], 0.008);
  box(g, "binFoot", [0, 0.03, 0], [0.4, 0.06, 1.3], 0.006);
  for (const [k, list] of g) for (const geo of list) { geo.rotateY(yaw); geo.translate(at[0], at[1], at[2]); (P.get(k) ?? P.set(k, []).get(k)!).push(geo); }
  const q = new THREE.PlaneGeometry(1.3, 0.43); q.rotateY(Math.PI / 2); q.translate(0.213, 0.7, 0); q.rotateY(yaw); q.translate(at[0], at[1], at[2]);
  (P.get("binFace") ?? P.set("binFace", []).get("binFace")!).push(q);
};

// K-P7 the drinks vending machine lives in vending.ts (round 2: a real display case with 3D drinks)
export { vendingMachine } from "./vending";

// ---------------------------------------------------------------- K-P11 ITV monitor + pole clock
export const itvMonitor = (o: { pos: V3; yaw?: number }) => {
  const G = new THREE.Group(); G.name = "itv";
  const P: Parts = new Map();
  cyl(P, "pole", [0, 0, 0], 0.07, 0.06, 2.9, 10);
  box(P, "pole", [0, 0.01, 0], [0.35, 0.02, 0.35], 0.004);
  box(P, "housing", [0, 3.0, 0], [1.25, 0.62, 0.32], 0.02);
  box(P, "housing", [0, 3.35, 0.12], [1.35, 0.04, 0.55], 0.01);                 // the sun hood
  const M = { pole: mat([0.82, 0.83, 0.82], 0.55, 0.3), housing: mat([0.2, 0.21, 0.23], 0.5, 0.3) };
  G.add(flush(P, M, { name: "itv", module: "rail-itv" }));
  const U = { uT: { value: 0 } };
  const sm = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.9, roughness: 0.15 });
  sm.onBeforeCompile = (sh) => {   // a grey moving "car sides" picture: long panels + door gaps scrolling, scan flicker
    sh.uniforms.uT = U.uT;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uT;\nvarying vec2 vUvI;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      {
        vec2 q = vUvI;
        float persp = mix( 0.4, 1.6, q.x );
        float doors = step( 0.82, fract( q.x * 3.0 * persp + 0.15 * sin( uT * 0.3 ) ) );
        float body = smoothstep( 0.18, 0.2, q.y ) * smoothstep( 0.82, 0.8, q.y );
        float plat = step( q.y, 0.18 ) * ( 0.55 + 0.1 * fract( q.x * 37.0 ) );
        float v = mix( 0.22, 0.62 - doors * 0.35, body ) + plat * 0.4;
        v *= 0.93 + 0.07 * sin( q.y * 300.0 + uT * 40.0 );
        v *= 0.96 + 0.04 * fract( sin( floor( uT * 15.0 ) * 91.7 ) * 4375.5 );
        totalEmissiveRadiance = vec3( v * 0.9, v * 0.95, v ) * 0.32;
      }`);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vUvI;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvUvI = uv;");
  };
  sm.customProgramCacheKey = () => "rail:itv";
  for (const x of [-0.3, 0.3]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.4), sm); s.position.set(x, 3.0, 0.165); G.add(s); }
  G.position.set(...o.pos); G.rotation.y = o.yaw ?? 0;
  G.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
  return { object: G as THREE.Object3D, update: (t: number) => { U.uT.value = t; } };
};
const clockFace = () => memo("clock", () => canvasTex(256, 256, (g, w) => {
  g.fillStyle = "#f6f5f0"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.strokeStyle = "#1b1b1d"; g.lineCap = "butt";
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, r0 = i % 5 ? 108 : 94; g.lineWidth = i % 5 ? 3 : 8; g.beginPath(); g.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); g.lineTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); g.stroke(); }
  g.fillStyle = "#1b1b1d"; g.font = "bold 30px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillText(String(i), 128 + Math.sin(a) * 76, 128 - Math.cos(a) * 76); }
  void w;
}));
/** a double-faced round platform clock hanging from a canopy purlin at `pos` (the clock centre); hands = 17:32 + t */
export const poleClock = (o: { pos: V3; yaw?: number; hangTo?: number; baseTime?: number }) => {
  const G = new THREE.Group(); G.name = "clock";
  const P: Parts = new Map();
  cyl(P, "case", [0, 0, -0.06], 0.34, 0.34, 0.12, 32, "z");
  if (o.hangTo) rod(P, "case", [0, 0.33, 0], [0, o.hangTo - o.pos[1], 0], 0.025, 6);
  G.add(flush(P, { case: mat([0.25, 0.26, 0.28], 0.4, 0.6) }, { name: "clock" }));
  const fm = new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.3, emissive: new THREE.Color(1, 1, 1), emissiveMap: clockFace(), emissiveIntensity: 0.25 });
  const hands: { h: THREE.Mesh; m: THREE.Mesh; s: THREE.Mesh }[] = [];
  for (const side of [1, -1]) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.31, 40), fm); f.position.z = side * 0.062; if (side < 0) f.rotation.y = Math.PI; G.add(f);
    const hm = mat([0.06, 0.06, 0.07], 0.5), sm = mat([0.75, 0.15, 0.1], 0.5);
    const mk = (L: number, w: number, m: THREE.Material) => { const g = new THREE.PlaneGeometry(w, L); g.translate(0, L / 2 - 0.03, 0); const me = new THREE.Mesh(g, m); me.position.z = side * 0.066; if (side < 0) me.rotation.y = Math.PI; G.add(me); return me; };
    hands.push({ h: mk(0.17, 0.022, hm), m: mk(0.25, 0.016, hm), s: mk(0.27, 0.006, sm) });
  }
  G.position.set(...o.pos); G.rotation.y = o.yaw ?? 0;
  G.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
  const base = o.baseTime ?? (17 * 3600 + 32 * 60 + 10);
  const update = (t: number) => {
    const T = base + t, sec = Math.floor(T) % 60 + Math.min(1, (T % 1) * 6) , mn = (T / 60) % 60, hr = (T / 3600) % 12;   // the second hand ticks
    for (const k of hands) {
      const sg = k.h.rotation.y ? -1 : 1;
      k.h.rotation.z = -sg * hr / 12 * Math.PI * 2; k.m.rotation.z = -sg * mn / 60 * Math.PI * 2; k.s.rotation.z = -sg * sec / 60 * Math.PI * 2;
    }
  };
  return { object: G as THREE.Object3D, update };
};

// ---------------------------------------------------------------- the island itself
/** hero island platform: SURFACES `platform()` on both edges (displaced slabs near the lens) + door marks */
export const islandPlatform = async (ctx: KitCtx, o: IslandOpts) => {
  const G = new THREE.Group(); G.name = "island";
  const top = o.top ?? 0, base = o.base ?? top - 1.69, h = top - base, mid = (o.xA + o.xB) / 2;
  // side B (edge at xB, track 2 on -x): platform() as is
  const pB = await platform(ctx, { x0: o.xB, x1: mid, z0: o.z0, z1: o.z1, y: base, h, lens: o.lens, seed: (o.seed ?? 1) + 1 });
  G.add(pB.object);
  // side A (edge at xA, track 1 on +x): built mirrored inside a group turned 180 deg (xz surfaces sample WORLD space)
  const gA = new THREE.Group(); gA.rotation.y = Math.PI;
  const lensA = o.lens ? { points: o.lens.points.map(([x, z]) => [-x, -z] as [number, number]) } : undefined;
  const pA = await platform(ctx, { x0: -o.xA, x1: -mid, z0: -o.z1, z1: -o.z0, y: base, h, lens: lensA, seed: o.seed ?? 1 });
  gA.add(pA.object); G.add(gA);
  // door-position marks near the tactile row on side A every 5 m: small painted triangles (digits on the boards only)
  const marks = [] as { a: [number, number]; b: [number, number]; w: number; color: [number, number, number] }[];
  if (o.marks !== false) for (let z = o.z1 - 3.4; z > o.z0 + 1; z -= 5) marks.push({ a: [o.xA - 1.25, z + 0.2], b: [o.xA - 1.25, z - 0.2], w: 0.22, color: [0.86, 0.36, 0.2] });
  if (marks.length) G.add(await paintLines(ctx, marks, { y: () => top + 0.001 }));
  // the platform ends: a low steel railing across each end (the far end has a gate)
  const P: Parts = new Map();
  for (const z of [o.z0 + 0.1, o.z1 - 0.1]) {
    for (let x = o.xB + 0.6; x <= o.xA - 0.55; x += 1.5) rod(P, "rail", [x, top, z], [x, top + 1.1, z], 0.03, 6);
    rod(P, "rail", [o.xB + 0.6, top + 1.1, z], [o.xA - 0.55, top + 1.1, z], 0.03, 6);
    rod(P, "rail", [o.xB + 0.6, top + 0.55, z], [o.xA - 0.55, top + 0.55, z], 0.02, 6);
  }
  G.add(flush(P, { rail: mat([0.8, 0.81, 0.8], 0.45, 0.5) }, { name: "ends" }));
  return { object: G as THREE.Object3D, mats: { A: pA.mats, B: pB.mats }, top, base, mid };
};

/** lite island (metre-UV surfaces, moves with its mesh: the station inside the cab treadmill) */
export const islandLite = async (ctx: KitCtx, o: IslandOpts) => {
  const G = new THREE.Group(); G.name = "islandLite";
  const top = o.top ?? 0, base = o.base ?? top - 1.69;
  G.add(await groundStrip(ctx, "concrete_sidewalk", { rect: [o.xB + 0.35, o.xA - 0.35, o.z0, o.z1], y: top, coarse: 1.5, opts: { tint: o.slab?.tint ?? [0.82, 0.82, 0.8], sat: o.slab?.sat, dirt: { joints: 0.5, grime: 0.12 } } }));
  for (const [xa, xb] of [[o.xA - 1.1, o.xA - 0.8], [o.xB + 0.8, o.xB + 1.1]] as [number, number][])
    G.add(await groundStrip(ctx, "tactile_paving", { rect: [xa, xb, o.z0, o.z1], y: top + 0.004, coarse: 1.5, opts: { rot: Math.PI / 2, tint: o.tactile?.tint, sat: o.tactile?.sat, dirt: { grime: 0.2 } } }));
  const cope = await surface(ctx, "concrete_floor", { uv: "uv", tint: [0.8, 0.8, 0.78], wear: { edges: 1 } });
  for (const x of [o.xA - 0.175, o.xB + 0.175]) G.add(kerbMesh(cope, { from: [x, o.z1], to: [x, o.z0], w: 0.35, h: 0, sink: 0.25, y0: top, len: 1.5 }));
  const wall = await surface(ctx, "tunnel_concrete", { uv: "uv", dirt: { grime: 0.45, streaks: 0.5 } });
  for (const [x, s] of [[o.xA - 0.22, 1], [o.xB + 0.22, -1]] as [number, number][]) {
    const fw = new THREE.PlaneGeometry(o.z1 - o.z0, top - 0.25 - base); fw.rotateY(s * Math.PI / 2); fw.translate(x, base + (top - 0.25 - base) / 2, (o.z0 + o.z1) / 2);
    const m = new THREE.Mesh(fw, wall); m.receiveShadow = true; G.add(m);
  }
  const line = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.88, 0.88, 0.85), roughness: 0.6 });
  for (const x of [o.xA - 0.27, o.xB + 0.27]) { const q = new THREE.PlaneGeometry(0.1, o.z1 - o.z0); q.rotateX(-Math.PI / 2); q.translate(x, top + 0.003, (o.z0 + o.z1) / 2); G.add(new THREE.Mesh(q, line)); }
  return { object: G as THREE.Object3D, top, base };
};

/** the stair well (opening walls + stainless rails + the guide-chime speaker), centred at (x, z), running along Z */
export const stairWell = (P: Parts, o: { x: number; z0: number; z1: number; top: number; w?: number }) => {
  const w = o.w ?? 2.6, x0 = o.x - w / 2, x1 = o.x + w / 2;
  for (const x of [x0 - 0.08, x1 + 0.08]) { boxMM(P, "wellWall", x - 0.08, o.top, o.z0, x + 0.08, o.top + 1.05, o.z1, 0.015); rod(P, "steelR", [x, o.top + 1.12, o.z0], [x, o.top + 1.12, o.z1], 0.025, 8); }
  boxMM(P, "wellWall", x0 - 0.16, o.top, o.z1 - 0.16, x1 + 0.16, o.top + 1.05, o.z1, 0.015);
  // steps going down toward z0 (visible through the opening)
  for (let k = 0; k < 18; k++) boxMM(P, "steps", x0, o.top - 0.17 * (k + 1), o.z1 - 0.3 * (k + 1), x1, o.top - 0.17 * k, o.z1 - 0.3 * k - 0.0, 0.01);
  box(P, "speaker", [o.x, o.top + 2.6, o.z1 - 0.1], [0.28, 0.2, 0.18], 0.03);
};
export const stairMats = () => ({ wellWall: mat([0.86, 0.84, 0.78], 0.85), steelR: mat([0.8, 0.8, 0.8], 0.25, 1.0), steps: mat([0.66, 0.65, 0.62], 0.85), speaker: mat([0.85, 0.85, 0.82], 0.5) });
export const benchMats = () => ({ frame: mat([0.45, 0.46, 0.48], 0.45, 0.7), seatO: mat([0.84, 0.87, 0.85], 0.42), seatB: mat([0.17, 0.36, 0.66], 0.4) });
export const binMats = () => ({ binBody: mat([0.8, 0.82, 0.82], 0.35, 0.5), binTop: mat([0.6, 0.62, 0.63], 0.3, 0.8), binFoot: mat([0.25, 0.26, 0.27], 0.7), binFace: new THREE.MeshStandardMaterial({ map: binsTex(), roughness: 0.4 }) });
void hash;

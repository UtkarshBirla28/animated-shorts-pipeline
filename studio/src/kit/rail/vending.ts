// K-P7 the Japanese drinks vending machine (STATION owner), round 2: a real display case. 1.02 x 0.78 x 1.9 m, front +Z at
// the local origin: a lit white back, 3 shelves of 27 dummy cans / PET bottles as GEOMETRY behind glass (no brands, no
// text), a price rail under each shelf (digits, hot / cold bars, buttons whose LEDs chase = life), the lower door (coin +
// note slots, the IC reader with a wave pictogram, coin return, the take-out port with its lip), a header sign with drink
// pictograms, side vents, a lock, a dark plinth. Materials are shared between machines (furniture.ts `shared`).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { KitCtx, V3 } from "../core/ctx";
import { box, boxMM, canvasTex, cyl, flush, glow, grime, mat, rng, type Parts } from "./util";
import { shared } from "./furniture";

const FONT = "Arial, Helvetica, sans-serif";
const texMemo = new Map<string, THREE.Texture>();
const memo = (k: string, f: () => THREE.Texture) => { if (!texMemo.has(k)) texMemo.set(k, f()); return texMemo.get(k)!; };
const DRINKS = ["#c8442f", "#2e6fbf", "#e7e2d6", "#3b8a4f", "#2aa39a", "#6b4a3a", "#9fc4e0", "#f0f0ea", "#b23a5e", "#203a5c", "#e8792b", "#7a4fa3"];

/** the price rail under each shelf: 3 rows x 9 cells: a hot (red) / cold (blue) bar, the price (digits), a round button */
const vendStrip = (seed: number) => memo("vendStrip" + seed, () => canvasTex(1152, 192, (g, w, h) => {
  g.fillStyle = "#e9ebec"; g.fillRect(0, 0, w, h);
  const prices = [130, 150, 160, 120, 180, 140, 110, 200, 170];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
    const x0 = i * 128, y0 = row * 64, hot = row === 2 && i > 4;
    g.fillStyle = hot ? "#d83a2c" : "#2a62c6"; g.fillRect(x0 + 8, y0 + 4, 112, 10);
    g.fillStyle = "#17191c"; g.font = "bold 30px " + FONT; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(String(prices[(i + row * 4 + seed) % 9]), x0 + 10, y0 + 40);
    g.fillStyle = "#6f757c"; g.beginPath(); g.arc(x0 + 100, y0 + 40, 15, 0, 7); g.fill(); g.fillStyle = "#9aa1a8"; g.beginPath(); g.arc(x0 + 100, y0 + 40, 10, 0, 7); g.fill();
  }
  grime(g, w, h, 7 + seed, 500, 0.04);
}));
/** the lower door panel: coin + note slots, the IC reader (a wave pictogram), coin return, the take-out port */
const vendLower = () => memo("vendLow", () => canvasTex(512, 384, (g, w, h) => {
  g.fillStyle = "#e3e6e8"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#2a2d31"; g.fillRect(40, 30, 120, 62); g.fillStyle = "#9aa0a6"; g.fillRect(80, 56, 40, 8);                      // coin slot
  g.fillStyle = "#2a2d31"; g.fillRect(180, 30, 150, 62); g.fillStyle = "#6a7077"; g.fillRect(195, 58, 120, 6);                    // note slot
  g.fillStyle = "#1d3f6e"; g.beginPath(); g.roundRect(360, 18, 110, 96, 12); g.fill(); g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.lineCap = "round";
  for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(388, 66, 14 + k * 14, -0.8, 0.8); g.stroke(); }                              // IC wave
  g.fillStyle = "#3a3e44"; g.beginPath(); g.roundRect(52, 118, 84, 44, 8); g.fill();                                               // coin return
  g.fillStyle = "#101214"; g.beginPath(); g.roundRect(34, 200, 444, 150, 10); g.fill(); g.fillStyle = "#23272c"; g.fillRect(46, 212, 420, 54);   // take-out port + flap
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 3; g.beginPath(); g.moveTo(60, 222); g.lineTo(440, 222); g.stroke();
  grime(g, w, h, 9, 900, 0.06);
}));
/** the header sign: a colour band with three drink pictograms (no text) */
const vendHeader = (seed: number) => memo("vendHead" + (seed % 2), () => canvasTex(512, 48, (g, w, h) => {
  g.fillStyle = seed % 2 ? "#f2f2ee" : "#1f5fa8"; g.fillRect(0, 0, w, h); g.fillStyle = seed % 2 ? "#c8261c" : "#f4f6f8";
  g.fillRect(0, h - 8, w, 4);
  for (const [k, x] of [150, 256, 362].entries()) {
    if (k === 0) { g.fillRect(x - 8, 12, 16, 26); g.fillRect(x - 4, 6, 8, 8); }                                                    // bottle
    else if (k === 1) { g.beginPath(); g.roundRect(x - 9, 9, 18, 28, 4); g.fill(); }                                               // can
    else { g.beginPath(); g.moveTo(x - 11, 10); g.lineTo(x + 11, 10); g.lineTo(x + 7, 37); g.lineTo(x - 7, 37); g.closePath(); g.fill(); }   // cup
  }
}));
const VEND_U = { uT: { value: 0 } };
const colorize = (g: THREE.BufferGeometry, f: (y: number) => THREE.Color) => {
  const p = g.getAttribute("position") as THREE.BufferAttribute, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = f(p.getY(i)); c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g;
};
const STRIP_FRAG = [
  "#include <emissivemap_fragment>",
  "{",
  "  vec2 q = vMapUv * vec2( 9.0, 3.0 ); vec2 c = fract( q ) - vec2( 0.78, 0.375 );",
  "  float btn = smoothstep( 0.2, 0.12, length( c * vec2( 2.0, 1.0 ) ) );",
  "  float on = step( abs( mod( floor( q.x ) + floor( q.y ) * 3.0 - floor( uT * 2.2 ), 9.0 ) ), 0.5 );",
  "  totalEmissiveRadiance += btn * ( 0.25 + on * 2.4 ) * vec3( 0.5, 1.0, 1.6 );",
  "}",
].join("\n");

export type VendOpts = { pos: V3; yaw?: number; seed?: number; /** cabinet colour (sRGB, default white) */ body?: [number, number, number] };
export const vendingMachine = async (_ctx: KitCtx, o: VendOpts) => {
  const G = new THREE.Group(); G.name = "vending";
  const P: Parts = new Map(), W = 1.02, D = 0.78, H = 1.83, zf = D / 2, seed = o.seed ?? 0, R = rng(41 + seed * 7);
  const rows = [0.8, 1.125, 1.45], wx = 0.45;
  const dark = () => shared("dark", () => mat([0.16, 0.17, 0.19], 0.5, 0.3)), alu = () => shared("alu", () => mat([0.7, 0.71, 0.71], 0.35, 0.85));
  box(P, "plinth", [0, 0.03, 0], [W - 0.04, 0.06, D - 0.06], 0.006);
  boxMM(P, "body", -W / 2, 0.06, -zf, W / 2, H + 0.06, zf - 0.1, 0.012);                       // the cabinet behind the door
  boxMM(P, "body", -W / 2, 0.06, zf - 0.1, W / 2, 0.78, zf, 0.012);                             // the door: lower panel, posts, header
  for (const s of [-1, 1]) boxMM(P, "body", s > 0 ? wx : -W / 2, 0.78, zf - 0.1, s > 0 ? W / 2 : -wx, 1.8, zf, 0.008);
  boxMM(P, "body", -W / 2, 1.78, zf - 0.1, W / 2, H + 0.06, zf, 0.012);
  box(P, "cap", [0, H + 0.075, 0], [W + 0.02, 0.03, D + 0.01], 0.008);
  for (const y of rows) boxMM(P, "rail", -wx, y, zf - 0.07, wx, y + 0.055, zf - 0.004, 0.004);    // the price rails (shelf fronts)
  for (const y of rows) boxMM(P, "shelf", -wx, y + 0.04, zf - 0.104, wx, y + 0.055, zf - 0.07, 0);
  for (const [a, b, c, d] of [[-wx - 0.012, 0.78, -wx, 1.79], [wx, 0.78, wx + 0.012, 1.79], [-wx, 1.778, wx, 1.79], [-wx, 0.78, wx, 0.792]])
    boxMM(P, "alu", a, b, zf - 0.004, c, d, zf + 0.008, 0.002);                                    // window trim
  box(P, "alu", [0, 0.372, zf + 0.008], [0.9, 0.018, 0.02], 0.004);                                // the take-out lip
  box(P, "dark", [-0.33, 0.622, zf + 0.004], [0.17, 0.085, 0.012], 0.004);                         // the coin-return cup
  cyl(P, "steelK", [W / 2 - 0.03, 1.2, zf], 0.013, 0.013, 0.009, 12, "z");                         // the lock
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) box(P, "dark", [s * (W / 2 + 0.001), 0.2 + k * 0.045, -0.12], [0.004, 0.022, 0.34], 0);   // side vents
  const bodyC = o.body ?? [0.94, 0.94, 0.93];
  G.add(flush(P, {
    plinth: dark(), dark: dark(), body: shared("vendBody:" + bodyC.join(","), () => mat(bodyC as [number, number, number], 0.34, 0.15)), cap: shared("vendCap", () => mat([0.5, 0.52, 0.55], 0.35, 0.6)),
    rail: shared("vendRail", () => mat([0.9, 0.91, 0.91], 0.4, 0.1)), shelf: shared("vendShelf", () => mat([0.95, 0.95, 0.95], 0.5)), alu: alu(), steelK: shared("steel", () => mat([0.78, 0.78, 0.77], 0.28, 1.0)),
  }, { name: "vend", module: "rail-vend" }));
  // the lit back of the display case
  const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * wx, 1.0), shared("vendBack", () => glow([1.0, 0.99, 0.96], 0.85, 0.9))); back.position.set(0, 1.29, zf - 0.103); G.add(back);
  // the drinks: 3 shelves x 9, cans + PET bottles (vertex-coloured; a little self-glow = the case light on them)
  const geos: THREE.BufferGeometry[] = [], C = (hex: string) => new THREE.Color(hex), silver = C("#c9cdd1"), white = C("#f4f4f0");
  for (const y of rows) for (let i = 0; i < 9; i++) {
    const x = -0.392 + i * 0.098, y0 = y + 0.055, col = C(DRINKS[Math.floor(R() * DRINKS.length)]), col2 = C(DRINKS[Math.floor(R() * DRINKS.length)]), can = R() > 0.45, z = zf - 0.052;
    if (can) {
      geos.push(colorize(new THREE.CylinderGeometry(0.0325, 0.0325, 0.118, 14, 5).translate(x, y0 + 0.059, z), (yy) => (yy > y0 + 0.11 || yy < y0 + 0.006 ? silver : yy > y0 + 0.04 && yy < y0 + 0.078 ? col2 : col)));
    } else {
      const capC = R() > 0.5 ? white : col2;
      geos.push(colorize(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 14, 5).translate(x, y0 + 0.075, z), (yy) => (yy > y0 + 0.045 && yy < y0 + 0.108 ? col2 : col)));
      geos.push(colorize(new THREE.CylinderGeometry(0.0135, 0.03, 0.042, 14, 1).translate(x, y0 + 0.171, z), () => col));
      geos.push(colorize(new THREE.CylinderGeometry(0.0145, 0.0145, 0.022, 12, 1).translate(x, y0 + 0.203, z), () => capC));
    }
  }
  const dm = shared("vendDrinks", () => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.15 });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance += vColor.rgb * 0.3;\n#endif"); };
    m.customProgramCacheKey = () => "rail:vend-drinks"; return m;
  });
  const drinks = new THREE.Mesh(mergeGeometries(geos)!, dm); G.add(drinks);
  // price rails (their buttons chase), the lower door panel, the header sign, the glass
  const sm = shared("vendStrip" + seed, () => {
    const t = vendStrip(seed), m = new THREE.MeshStandardMaterial({ map: t, emissive: new THREE.Color(1, 1, 1), emissiveMap: t, emissiveIntensity: 0.22, roughness: 0.4 });
    m.onBeforeCompile = (sh) => { sh.uniforms.uT = VEND_U.uT; sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uT;").replace("#include <emissivemap_fragment>", STRIP_FRAG); };
    m.customProgramCacheKey = () => "rail:vendstrip"; return m;
  });
  const strips: THREE.BufferGeometry[] = [];
  rows.forEach((y, k) => {
    const q = new THREE.PlaneGeometry(2 * wx, 0.055).translate(0, y + 0.0275, zf - 0.0035), uv = q.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, (k + uv.getY(i)) / 3);      // rail k = atlas row k from the bottom
    strips.push(q);
  });
  const stripMesh = new THREE.Mesh(mergeGeometries(strips)!, sm); G.add(stripMesh);
  const low = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.675), shared("vendLow", () => new THREE.MeshStandardMaterial({ map: vendLower(), roughness: 0.42 }))); low.position.set(0, 0.425, zf + 0.0015); G.add(low);
  const head = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.088), shared("vendHead" + (seed % 2), () => { const t = vendHeader(seed); return new THREE.MeshStandardMaterial({ map: t, emissive: new THREE.Color(1, 1, 1), emissiveMap: t, emissiveIntensity: 0.3, roughness: 0.4 }); }));
  head.position.set(0, 1.838, zf + 0.0015); G.add(head);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2 * wx, 0.99), shared("vendGlass", () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 1.6, depthWrite: false })));
  glass.position.set(0, 1.285, zf + 0.002); glass.renderOrder = 3; G.add(glass);
  G.position.set(...o.pos); G.rotation.y = o.yaw ?? 0;
  G.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh && mm !== glass && mm !== back) { mm.castShadow = true; mm.receiveShadow = true; } });
  return { object: G as THREE.Object3D, update: (t: number) => { VEND_U.uT.value = t; } };
};

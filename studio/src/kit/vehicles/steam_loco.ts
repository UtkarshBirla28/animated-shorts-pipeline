// kit/vehicles (TRAIN owner): K-P40, a Japanese STEAM LOCOMOTIVE of about 1910 (late Meiji), for the "pointing" film's
// true story (the driver Hori, his fireman, an official of the Kobe Railway Bureau riding in the cab).
// The generic form of the British-built 4-4-0 TENDER express engines the Japanese Government Railways ran on the
// Tokaido / Sanyo lines round Kobe at the time (Beyer Peacock / Neilson / Dubs / Sharp Stewart types of the 5300-6400
// classes): 1,067 mm gauge; a tall stovepipe chimney with a capped top, a brass dome and a brass safety-valve casing;
// outside cylinders driving the leading coupled wheels (1.40 m) with a coupling rod, a leading 4-wheel bogie (0.94 m);
// running board with splashers; a cab with a roof, round front spectacle windows and low side sheets, OPEN at the back;
// buffers + a centre link coupling (Japan changed to automatic couplers only in 1925); a 6-wheel tender with coal.
// NO number plate, no lettering, no logo. Colour: a parameter (default the film's vivid red-brown with black smokebox +
// chimney and brass. DEFAULT NOW BLACK (JGR practice; the fact-checker), red buffer beam, brass).
//
// Frame: y = 0 at the TOP OF RAIL, the front buffer beam's face at z = 0, the engine + tender extend toward +Z, the train
// RUNS toward -Z, x + = the engine's right; the driver stands on the LEFT (x < 0: Japan runs on the left), the fireman
// works at the firehole in the middle / right. All parts are real-size metres.
//   const loco = await steamLoco(ctx, { run: (t) => 11 * t });   g.add(loco.object);   loco.update(t, cam) every sub-frame
//   LOCO marks (cab floor, the driver's / fireman's / official's places, the firehole, the gauges, the chimney top)
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Built, KitCtx, V3 } from "../core/ctx";

export type SteamLocoOpts = {
  /** metres travelled toward -Z at film time t (drives the wheels + rods); default 0 */
  run?: (t: number) => number;
  /** body paint (cab, tender, splashers, wheel centres); default the vivid red-brown */
  paint?: THREE.ColorRepresentation;
  /** 0..1 how open the firehole door is at t (the fireman's shovel beat); default a slow breathing 0.35..0.6 */
  fireDoor?: (t: number) => number;
  /** the firebox light: a real point light in the cab (1 of the light budget); default true */
  fireLight?: boolean;
  /** tender on (default true) */
  tender?: boolean;
  /** at t: true = a CUT-AWAY view (the cab's LEFT side sheets hidden, so a lens beside the cab sees both men whole) */
  cutaway?: (t: number) => boolean;
};

/** the loco's sizes and marks (loco frame: rail top y 0, front buffer beam z 0, toward +Z) */
export const STEAM = {
  gauge: 1.067, wheelX: 0.565,
  drvR: 0.70, drvZ: [4.4, 6.6] as const,           // coupled wheels: radius, axle z
  bogR: 0.47, bogZ: [1.15, 2.85] as const,         // bogie wheels
  tenR: 0.5, tenZ: [9.6, 11.1, 12.6] as const,     // tender wheels
  crank: 0.3, rodL: 2.15,                          // crank radius, connecting rod length
  cylX: 0.88, cylY: 0.86, cylZ: [1.1, 2.2] as const,
  boilerR: 0.6, boilerY: 2.05, boilerZ: [1.25, 5.45] as const, smokeboxR: 0.66, smokeboxZ: [0.32, 1.27] as const,
  chimneyZ: 0.8, chimneyTop: 3.78, domeZ: 3.35, valveZ: 5.75,
  plateY: 1.26,                                    // running board top
  cabZ: [6.25, 7.95] as const, cabFloorY: 1.38, cabRoofY: 3.32, cabHW: 1.18,
  tenderZ: [8.25, 14.0] as const, tenderTop: 2.62,
  len: 14.2,
};
/** marks in the loco frame (people stand on the cab floor; y = the floor) */
export const LOCO = {
  driver: [-0.62, STEAM.cabFloorY, 6.95] as V3,      // Hori: left side, by the side opening, eyes over the cab side
  fireman: [0.38, STEAM.cabFloorY, 7.45] as V3,      // the fireman: right of centre, between the firehole and the coal
  official: [0.05, STEAM.cabFloorY, 7.85] as V3,     // the official at the back of the cab (the tender front behind him)
  firehole: [0, 1.86, 6.33] as V3,
  gauge: [0, 2.86, 6.3] as V3,
  regulator: [-0.25, 2.62, 6.3] as V3,
  chimneyTop: [0, STEAM.chimneyTop + 0.05, 0.8] as V3,
  safetyValve: [0, 2.95, 5.75] as V3,
  sideWindowL: [-STEAM.cabHW, 2.55, 6.6] as V3,
  coal: [0, 2.0, 8.6] as V3,
};

const PAINT_DEFAULT = "#1a1a1c";   // JGR black (the fact-checker: Japanese steam engines were black); brass + a red buffer beam + red-lined wheels carry the colour
const C = { black: "#141415", smoke: "#1b1b1c", brass: "#d9a93a", copper: "#c4693a", steel: "#c8ccd1", beam: "#d0321f", wood: "#7a5232", coal: "#121213", glass: "#cfe7ef", rubber: "#0c0c0c", dial: "#f3efe4" };

type Bag = Map<string, THREE.BufferGeometry[]>;
const put = (B: Bag, k: string, g: THREE.BufferGeometry, m?: THREE.Matrix4) => {
  let x = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(x.attributes)) if (!["position", "normal", "uv"].includes(name)) x.deleteAttribute(name);
  if (!x.attributes.uv) x.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((x.attributes.position.count) * 2), 2));
  if (m) x.applyMatrix4(m);
  (B.get(k) ?? B.set(k, []).get(k)!).push(x);
};
const M4 = (p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
const box = (B: Bag, k: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  put(B, k, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), M4([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]));
/** a cylinder along Z (boilers, buffers) from z0 to z1 at (x, y) */
const cylZ = (B: Bag, k: string, x: number, y: number, z0: number, z1: number, r: number, seg = 40, r1 = r) =>
  put(B, k, new THREE.CylinderGeometry(r1, r, z1 - z0, seg, 1), M4([x, y, (z0 + z1) / 2], [Math.PI / 2, 0, 0]));
/** a vertical cylinder from y0 to y1 */
const cylY = (B: Bag, k: string, x: number, z: number, y0: number, y1: number, r: number, seg = 32, rTop = r) =>
  put(B, k, new THREE.CylinderGeometry(rTop, r, y1 - y0, seg, 1), M4([x, (y0 + y1) / 2, z]));
/** a cylinder along X */
const cylX = (B: Bag, k: string, x0: number, x1: number, y: number, z: number, r: number, seg = 24) =>
  put(B, k, new THREE.CylinderGeometry(r, r, x1 - x0, seg, 1), M4([(x0 + x1) / 2, y, z], [0, 0, Math.PI / 2]));
/** a ring band round a Z-axis barrel */
const bandZ = (B: Bag, k: string, y: number, z: number, r: number, w = 0.035) => put(B, k, new THREE.CylinderGeometry(r + 0.008, r + 0.008, w, 48, 1, true), M4([0, y, z], [Math.PI / 2, 0, 0]));
const tube = (B: Bag, k: string, pts: V3[], r: number, seg = 32) =>
  put(B, k, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 8, false));
const bake = (B: Bag, mats: Record<string, THREE.Material>, name: string) => {
  const g = new THREE.Group(); g.name = name;
  for (const [k, list] of B) { const geo = mergeGeometries(list, false); if (!geo) continue; geo.computeBoundingSphere(); const me = new THREE.Mesh(geo, mats[k]); me.castShadow = true; me.receiveShadow = true; me.name = name + ":" + k; g.add(me); }
  return g;
};
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

/** a spoked wheel (axis along X, centred at the origin): tyre, rim, spokes, hub, a balance weight; `side` = +1 right */
const wheelGeo = (r: number, spokes: number, side: number, weight: boolean): Bag => {
  const B: Bag = new Map(), w = 0.13;
  put(B, "steel", new THREE.CylinderGeometry(r, r, w, 56, 1, true), M4([0, 0, 0], [0, 0, Math.PI / 2]));                    // tyre tread
  put(B, "white", new THREE.RingGeometry(r - 0.035, r, 56), M4([side * w / 2, 0, 0], [0, side * Math.PI / 2, 0]));            // the tyre edge painted white (JGR practice)
  put(B, "steel", new THREE.RingGeometry(r - 0.07, r - 0.035, 56), M4([side * w / 2, 0, 0], [0, side * Math.PI / 2, 0]));
  put(B, "steel", new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.03, 56, 1), M4([-side * w / 2, 0, 0], [0, 0, Math.PI / 2])); // flange
  put(B, "paint", new THREE.TorusGeometry(r - 0.09, 0.03, 8, 56), M4([side * 0.03, 0, 0], [0, Math.PI / 2, 0]));             // rim
  for (let i = 0; i < spokes; i++) { const a = (i / spokes) * Math.PI * 2;
    put(B, "paint", new THREE.CylinderGeometry(0.022, 0.03, r - 0.17, 8), M4([side * 0.03, Math.cos(a) * (r / 2 - 0.02), Math.sin(a) * (r / 2 - 0.02)], [a - Math.PI / 2, 0, 0])); }
  put(B, "paint", new THREE.CylinderGeometry(r * 0.2, r * 0.22, 0.12, 24), M4([side * 0.03, 0, 0], [0, 0, Math.PI / 2]));      // hub
  put(B, "steel", new THREE.CylinderGeometry(0.06, 0.06, 0.16, 16), M4([side * 0.08, 0, 0], [0, 0, Math.PI / 2]));             // axle end
  if (weight) put(B, "paint", new THREE.CylinderGeometry(r - 0.12, r - 0.12, 0.05, 24, 1, false, -0.55, 1.1), M4([side * 0.04, 0, 0], [0, 0, Math.PI / 2]));
  return B;
};

export const steamLoco = async (ctx: KitCtx, o: SteamLocoOpts = {}): Promise<Built & { group: THREE.Group }> => {
  void ctx;
  const S = STEAM, run = o.run ?? (() => 0);
  const paint = new THREE.MeshPhysicalMaterial({ color: o.paint ?? PAINT_DEFAULT, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide });   // (double: the cab sheets are seen from inside)
  const mats: Record<string, THREE.Material> = {
    paint,
    black: new THREE.MeshPhysicalMaterial({ color: C.black, roughness: 0.42, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide }),
    smoke: new THREE.MeshStandardMaterial({ color: C.smoke, roughness: 0.75, metalness: 0.3 }),
    brass: new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.22, metalness: 1 }),
    copper: new THREE.MeshStandardMaterial({ color: C.copper, roughness: 0.28, metalness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.25, metalness: 1 }),
    beam: new THREE.MeshPhysicalMaterial({ color: C.beam, roughness: 0.35, clearcoat: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.8 }),
    coal: new THREE.MeshStandardMaterial({ color: C.coal, roughness: 0.55, metalness: 0.15 }),
    rubber: new THREE.MeshStandardMaterial({ color: C.rubber, roughness: 0.9 }),
    white: new THREE.MeshStandardMaterial({ color: "#f2f0ea", roughness: 0.5, side: THREE.DoubleSide }),
  };
  const B: Bag = new Map(), LB: Bag = new Map();
  const hw = 1.22, P = S.plateY;
  // ---- frames, buffer beam, buffers, coupling, running board, valances
  box(B, "black", -0.62, 0.55, 0.15, -0.56, P - 0.02, 8.05); box(B, "black", 0.56, 0.55, 0.15, 0.62, P - 0.02, 8.05);
  box(B, "beam", -hw, 0.82, 0.0, hw, 1.24, 0.16);
  for (const sx of [-1, 1]) { cylZ(B, "black", sx * 0.82, 1.03, -0.3, 0.0, 0.11, 24); cylZ(B, "steel", sx * 0.82, 1.03, -0.46, -0.3, 0.06, 16); cylZ(B, "steel", sx * 0.82, 1.03, -0.5, -0.46, 0.2, 32, 0.19); }
  box(B, "black", -0.1, 0.95, -0.12, 0.1, 1.1, 0.0); tube(B, "steel", [[0, 1.0, -0.12], [0, 0.95, -0.25], [0, 0.98, -0.36]], 0.025, 8);   // drawhook + link
  box(B, "black", -hw, P - 0.04, 0.16, hw, P, 6.25);                                                  // running board
  for (const sx of [-1, 1]) box(B, "paint", sx * hw - (sx > 0 ? 0.03 : 0), P - 0.24, 0.16, sx * hw + (sx > 0 ? 0 : 0.03), P - 0.04, 6.25);   // valance
  // ---- splashers over the coupled wheels (paint with a brass beading)
  for (const sx of [-1, 1]) for (const z of S.drvZ) {
    put(B, "paint", new THREE.CylinderGeometry(S.drvR + 0.08, S.drvR + 0.08, 0.16, 40, 1, false, 0, Math.PI), M4([sx * 0.6, S.drvR, z], [0, 0, Math.PI / 2]));
    put(B, "brass", new THREE.TorusGeometry(S.drvR + 0.085, 0.012, 6, 40, Math.PI), M4([sx * 0.685, S.drvR, z], [0, sx * Math.PI / 2, Math.PI / 2]));
  }
  // ---- cylinders (outside), their covers, valve chests, drain cocks; slide bars
  for (const sx of [-1, 1]) {
    cylZ(B, "paint", sx * S.cylX, S.cylY, S.cylZ[0], S.cylZ[1], 0.25, 32);
    cylZ(B, "steel", sx * S.cylX, S.cylY, S.cylZ[0] - 0.05, S.cylZ[0], 0.27, 32); cylZ(B, "steel", sx * S.cylX, S.cylY, S.cylZ[1], S.cylZ[1] + 0.05, 0.27, 32);
    box(B, "paint", sx * S.cylX - 0.16, S.cylY + 0.2, S.cylZ[0] + 0.05, sx * S.cylX + 0.16, S.cylY + 0.42, S.cylZ[1] - 0.05);
    for (const y of [S.cylY + 0.06, S.cylY - 0.06]) box(B, "steel", sx * S.cylX - 0.03, y - 0.015, S.cylZ[1], sx * S.cylX + 0.03, y + 0.015, 3.75);
    box(B, "black", sx * S.cylX - 0.05, 0.75, 3.7, sx * S.cylX + 0.05, P - 0.04, 3.8);           // slide-bar bracket
    cylY(B, "brass", sx * S.cylX, S.cylZ[0] + 0.15, S.cylY - 0.36, S.cylY - 0.24, 0.02, 8);     // drain cocks
  }
  // ---- smokebox, door, chimney, lamp; boiler barrel with brass bands; firebox; dome; safety valves; handrails; whistle
  cylZ(B, "smoke", 0, S.boilerY, S.smokeboxZ[0], S.smokeboxZ[1], S.smokeboxR, 56);
  put(B, "smoke", new THREE.CylinderGeometry(S.smokeboxR - 0.05, S.smokeboxR - 0.02, 0.06, 56), M4([0, S.boilerY, S.smokeboxZ[0] - 0.02], [Math.PI / 2, 0, 0]));
  put(B, "smoke", new THREE.SphereGeometry(0.6, 40, 12, 0, Math.PI * 2, 0, 0.5), M4([0, S.boilerY, S.smokeboxZ[0] + 0.48], [-Math.PI / 2, 0, 0], [1, 1, 0.9]));
  for (const y of [0.32, -0.32]) box(B, "steel", -0.42, S.boilerY + y - 0.02, S.smokeboxZ[0] - 0.12, 0.42, S.boilerY + y + 0.02, S.smokeboxZ[0] - 0.07);   // door hinge straps
  cylZ(B, "steel", 0, S.boilerY, S.smokeboxZ[0] - 0.16, S.smokeboxZ[0] - 0.07, 0.05, 16); cylX(B, "steel", -0.15, 0.15, S.boilerY, S.smokeboxZ[0] - 0.16, 0.02, 8);   // the dart
  box(B, "smoke", -0.5, P, 0.3, 0.5, S.boilerY - 0.3, 1.27);                                         // smokebox saddle
  cylY(B, "smoke", 0, S.chimneyZ, S.boilerY + 0.4, S.chimneyTop - 0.18, 0.2, 40, 0.215);              // chimney
  put(B, "smoke", new THREE.CylinderGeometry(0.33, 0.215, 0.14, 40), M4([0, S.chimneyTop - 0.11, S.chimneyZ]));   // the capped top
  put(B, "smoke", new THREE.CylinderGeometry(0.3, 0.33, 0.05, 40), M4([0, S.chimneyTop - 0.015, S.chimneyZ]));
  put(B, "copper", new THREE.TorusGeometry(0.305, 0.018, 8, 40), M4([0, S.chimneyTop + 0.01, S.chimneyZ], [Math.PI / 2, 0, 0]));
  put(B, "smoke", new THREE.CylinderGeometry(0.26, 0.42, 0.18, 40), M4([0, S.boilerY + 0.56, S.chimneyZ]));          // chimney base flare
  // headlamp (an oil lamp on the smokebox top, front)
  box(B, "black", -0.13, S.boilerY + 0.55, 0.14, 0.13, S.boilerY + 0.85, 0.4); cylY(B, "black", 0, 0.27, S.boilerY + 0.85, S.boilerY + 0.98, 0.07, 16);
  cylZ(B, "brass", 0, S.boilerY + 0.7, 0.11, 0.15, 0.1, 24);
  // boiler barrel + bands
  cylZ(B, "paint", 0, S.boilerY, S.boilerZ[0], S.boilerZ[1], S.boilerR, 64);
  for (const z of [1.3, 2.3, 3.9, 4.75, 5.4]) bandZ(B, "brass", S.boilerY, z, S.boilerR);
  // firebox (round-top) between the coupled wheels, up to the cab front
  cylZ(B, "paint", 0, S.boilerY, S.boilerZ[1], S.cabZ[0], S.boilerR + 0.04, 64);
  box(B, "paint", -0.62, P, S.boilerZ[1], 0.62, S.boilerY, S.cabZ[0]);
  bandZ(B, "brass", S.boilerY, S.cabZ[0] - 0.05, S.boilerR + 0.04);
  // dome (brass) + safety-valve casing (brass) + whistle
  cylY(B, "brass", 0, S.domeZ, S.boilerY + 0.45, S.boilerY + 0.82, 0.3, 40, 0.28);
  put(B, "brass", new THREE.SphereGeometry(0.28, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), M4([0, S.boilerY + 0.82, S.domeZ]));
  put(B, "brass", new THREE.CylinderGeometry(0.3, 0.46, 0.12, 40), M4([0, S.boilerY + 0.5, S.domeZ]));
  cylY(B, "brass", 0, S.valveZ, S.boilerY + 0.55, S.boilerY + 0.92, 0.12, 24, 0.09);
  put(B, "brass", new THREE.CylinderGeometry(0.16, 0.2, 0.08, 24), M4([0, S.boilerY + 0.95, S.valveZ]));
  cylY(B, "brass", 0.32, 6.05, S.boilerY + 0.5, S.boilerY + 0.95, 0.03, 12); cylY(B, "brass", 0.32, 6.05, S.boilerY + 0.95, S.boilerY + 1.12, 0.05, 16, 0.04);   // whistle
  // handrails along the boiler (steel, on brass knobs) + sandboxes on the running board
  for (const sx of [-1, 1]) {
    cylZ(B, "steel", sx * (S.boilerR + 0.09), S.boilerY + 0.28, 0.6, 6.2, 0.014, 8);
    for (const z of [0.7, 1.9, 3.1, 4.3, 5.5]) cylX(B, "brass", sx * S.boilerR - (sx > 0 ? 0 : 0.09), sx * S.boilerR + (sx > 0 ? 0.09 : 0), S.boilerY + 0.28, z, 0.012, 6);
    box(B, "paint", sx * 0.95 - 0.12, P, 3.45, sx * 0.95 + 0.12, P + 0.42, 3.75);
    put(B, "brass", new THREE.CylinderGeometry(0.06, 0.07, 0.05, 16), M4([sx * 0.95, P + 0.45, 3.6]));
  }
  // ---- the CAB: front spectacle plate with round windows, side sheets with an opening, a curved roof; open back
  const cz0 = S.cabZ[0], cz1 = S.cabZ[1], F = S.cabFloorY, R = S.cabRoofY, chw = S.cabHW;
  {
    // front plate with two round spectacle windows: boxes round two square openings + an annulus filling each square
    // to the round window (an extruded shape with holes did not render)
    const wy0 = 2.54, wy1 = 2.9, wx = [0.64, 1.0];
    box(B, "paint", -chw, P, cz0, chw, wy0, cz0 + 0.03);
    box(B, "paint", -chw, wy1, cz0, chw, R - 0.12, cz0 + 0.03);
    for (const [x0, x1] of [[-chw, -wx[1]], [-wx[0], wx[0]], [wx[1], chw]] as [number, number][]) box(B, "paint", x0, wy0, cz0, x1, wy1, cz0 + 0.03);
    put(B, "paint", new THREE.CylinderGeometry(2.4, 2.4, 0.03, 64, 1, false, -0.48, 0.96), M4([0, R - 2.5, cz0 + 0.015], [Math.PI / 2, 0, 0]));   // the arched top
    for (const sx of [-1, 1]) put(B, "paint", new THREE.RingGeometry(0.17, 0.27, 40), M4([sx * 0.82, 2.72, cz0 + 0.015]));
    // side sheets: lower panel to 2.25 m with a cut-out entrance at the back; a pillar up to the roof at the front
    for (const sx of [-1, 1]) {
      const SB = sx < 0 ? LB : B;   // the LEFT side sheets are their own mesh (the cut-away hides them)
      box(SB, "paint", sx * chw - 0.015, P, cz0, sx * chw + 0.015, 2.25, cz0 + 1.05);
      box(SB, "paint", sx * chw - 0.015, 2.25, cz0, sx * chw + 0.015, R - 0.1, cz0 + 0.12);
      box(SB, "paint", sx * chw - 0.015, P, cz1 - 0.12, sx * chw + 0.015, 2.25, cz1);
      cylZ(SB, "brass", sx * chw, 2.26, cz0, cz0 + 1.05, 0.018, 8);                                  // beading
      cylY(B, "brass", sx * (chw + 0.04), cz0 + 1.12, 1.45, 2.4, 0.018, 8);                           // grab rail
      box(B, "black", sx * chw - 0.2 * sx - 0.1, 0.55, cz0 + 1.05, sx * chw - 0.2 * sx + 0.1, 0.6, cz0 + 1.35);   // step
    }
    // roof: a curved sheet over the cab, overhanging the back
    const rg = new THREE.CylinderGeometry(2.6, 2.6, cz1 + 0.25 - (cz0 - 0.05), 64, 1, true, -0.47, 0.94);
    put(B, "black", rg, M4([0, R - 2.56, (cz0 - 0.05 + cz1 + 0.25) / 2], [Math.PI / 2, 0, 0]));
    // cab floor (wooden planks) + the fall plate to the tender
    box(B, "wood", -chw, P, cz0, chw, F, cz1); box(B, "steel", -0.8, F - 0.02, cz1, 0.8, F, 8.4);
  }
  // ---- the BACKHEAD (inside the cab front): the firebox back plate, firehole, gauges, water glasses, regulator, pipes
  const bz = cz0 + 0.035;
  {
    put(B, "black", new THREE.CircleGeometry(0.66, 48), M4([0, S.boilerY, bz + 0.002]));
    box(B, "black", -0.66, P, bz, 0.66, S.boilerY, bz + 0.004);
    // firehole ring (the doors are separate meshes)
    put(B, "steel", new THREE.TorusGeometry(0.21, 0.035, 10, 40), M4([LOCO.firehole[0], LOCO.firehole[1], bz + 0.03], [0, 0, 0], [1.25, 0.85, 1]));
    // pressure gauge (brass rim, white dial) + its siphon pipe
    cylZ(B, "brass", 0, 2.86, bz, bz + 0.07, 0.15, 40);
    cylY(B, "copper", 0.12, bz + 0.05, 2.55, 2.75, 0.012, 8);
    // two water gauge glasses in brass frames
    for (const sx of [-1, 1]) { cylY(B, "brass", sx * 0.36, bz + 0.07, 2.08, 2.12, 0.035, 12); cylY(B, "brass", sx * 0.36, bz + 0.07, 2.56, 2.6, 0.035, 12); cylY(B, "brass", sx * 0.36 + 0.05 * sx, bz + 0.07, 2.08, 2.6, 0.01, 6); }
    // regulator: a brass quadrant + the handle (separate, moves) ; injector steam valves (brass wheels) + copper pipes
    put(B, "brass", new THREE.TorusGeometry(0.22, 0.012, 6, 24, Math.PI / 2), M4([0, 2.62, bz + 0.06], [0, 0, Math.PI * 0.5]));
    for (const [x, y] of [[-0.48, 2.42], [0.48, 2.42], [-0.18, 2.62], [0.22, 2.68]] as [number, number][]) { put(B, "brass", new THREE.TorusGeometry(0.05, 0.01, 6, 20), M4([x, y, bz + 0.09])); cylZ(B, "brass", x, y, bz, bz + 0.09, 0.015, 8); }
    tube(B, "copper", [[-0.48, 2.42, bz + 0.05], [-0.6, 2.2, bz + 0.07], [-0.66, 1.7, bz + 0.08], [-0.7, 1.45, bz + 0.2]], 0.022);
    tube(B, "copper", [[0.48, 2.42, bz + 0.05], [0.6, 2.2, bz + 0.07], [0.66, 1.7, bz + 0.08], [0.7, 1.45, bz + 0.2]], 0.022);
    tube(B, "copper", [[-0.5, 2.78, bz + 0.05], [0, 2.95, bz + 0.06], [0.5, 2.78, bz + 0.05]], 0.016);
    // the reverser (driver's side, a screw pillar with a wheel) and the brake valve
    cylY(B, "black", -0.75, cz0 + 0.3, F, 2.05, 0.05, 16);
    put(B, "steel", new THREE.TorusGeometry(0.13, 0.016, 8, 28), M4([-0.75, 2.1, cz0 + 0.3], [Math.PI / 2, 0, 0]));
    box(B, "brass", -0.98, 2.15, cz0 + 0.05, -0.86, 2.3, cz0 + 0.17);
  }
  // ---- TENDER: frame, axleboxes, tank sides with beading, coal space, toolbox
  if (o.tender ?? true) {
    const t0 = S.tenderZ[0], t1 = S.tenderZ[1], tw = 1.18, T = S.tenderTop;
    box(B, "black", -1.2, 0.62, t0, 1.2, P - 0.02, t1); box(B, "beam", -1.2, 0.82, t1, 1.2, 1.24, t1 + 0.12);
    for (const sx of [-1, 1]) for (const z of S.tenZ) box(B, "black", sx * 0.78 - 0.08, 0.38, z - 0.14, sx * 0.78 + 0.08, 0.66, z + 0.14);
    for (const sx of [-1, 1]) { cylZ(B, "black", sx * 0.82, 1.03, t1 + 0.12, t1 + 0.42, 0.11, 24); cylZ(B, "steel", sx * 0.82, 1.03, t1 + 0.42, t1 + 0.5, 0.2, 32, 0.19); }
    box(B, "paint", -tw, P, t0 + 0.25, tw, T, t1);                                                  // tank
    for (const sx of [-1, 1]) { cylZ(B, "brass", sx * (tw + 0.005), T - 0.02, t0 + 0.25, t1, 0.02, 8); cylZ(B, "brass", sx * (tw + 0.005), P + 0.06, t0 + 0.25, t1, 0.016, 8);
      box(B, "black", sx * (tw + 0.004) - 0.004, P + 0.25, t0 + 0.6, sx * (tw + 0.004) + 0.004, T - 0.25, t1 - 0.35); }   // a lined panel
    box(B, "paint", -tw, P, t0, tw, 2.0, t0 + 0.25);                                                  // coal-hole front
    box(B, "paint", -tw, T, t0 + 0.25, -tw + 0.04, T + 0.32, t1 - 1.5); box(B, "paint", tw - 0.04, T, t0 + 0.25, tw, T + 0.32, t1 - 1.5);   // coal rails
    box(B, "black", -0.6, T, t1 - 1.4, 0.6, T + 0.35, t1 - 0.8);                                      // tank filler / toolbox
    cylY(B, "brass", 0, t1 - 1.1, T + 0.35, T + 0.42, 0.25, 24);
    // the coal heap: a mound + chunks
    const R2 = mulberry(7), cg: THREE.BufferGeometry[] = [];
    put(B, "coal", new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M4([0, T - 0.2, t0 + 2.5], [0, 0, 0], [1.1, 0.7, 1.3]));
    put(B, "coal", new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), M4([0, 1.62, t0 + 0.55], [0, 0, 0], [0.75, 0.42, 0.45]));
    for (let i = 0; i < 700; i++) { const a = R2() * Math.PI * 2, rr = Math.sqrt(R2()); const x = Math.cos(a) * rr * 1.05, z = t0 + 2.5 + Math.sin(a) * rr * 1.2;
      const y = T - 0.2 + 0.7 * Math.sqrt(Math.max(0, 1 - (x / 1.1) ** 2 - ((z - t0 - 2.5) / 1.3) ** 2));
      const s = 0.03 + 0.045 * R2(); const geo = new THREE.IcosahedronGeometry(s, 0); geo.applyMatrix4(M4([x, y, z], [R2() * 3, R2() * 3, R2() * 3], [1, 0.7 + 0.4 * R2(), 1])); cg.push(geo); }
    for (const geo of cg) put(B, "coal", geo);
    // a few coal lumps on the cab floor + the shovel plate
    for (let i = 0; i < 40; i++) { const geo = new THREE.IcosahedronGeometry(0.03 + 0.04 * R2(), 0); geo.applyMatrix4(M4([(R2() - 0.5) * 1.4, F + 0.02, 7.3 + R2() * 0.9], [R2() * 3, R2() * 3, R2() * 3])); put(B, "coal", geo); }
  }
  const body = bake(B, mats, "loco-body"), leftSide = bake(LB, mats, "loco-cab-left");
  const group = new THREE.Group(); group.name = "steam-loco"; group.add(body, leftSide);

  // ---- moving parts: wheels, coupling + connecting rods, crossheads, the firehole doors, the regulator handle
  const wheels: { m: THREE.Object3D; r: number }[] = [];
  const addWheel = (r: number, spokes: number, x: number, z: number, weight: boolean) => {
    const side = Math.sign(x), W = bake(wheelGeo(r, spokes, side, weight), mats, "wheel"); W.position.set(x, r, z); group.add(W); wheels.push({ m: W, r });
  };
  for (const sx of [-1, 1]) { for (const z of S.drvZ) addWheel(S.drvR, 16, sx * S.wheelX, z, true); for (const z of S.bogZ) addWheel(S.bogR, 10, sx * S.wheelX, z, false); if (o.tender ?? true) for (const z of S.tenZ) addWheel(S.tenR, 10, sx * S.wheelX, z, false); }
  // the bogie frame + axles (static)
  { const Bg: Bag = new Map(); box(Bg, "black", -0.5, 0.36, 0.75, 0.5, 0.62, 3.25); for (const z of [...S.bogZ, ...S.drvZ]) cylX(Bg, "steel", -0.6, 0.6, z < 4 ? S.bogR : S.drvR, z, 0.07); group.add(bake(Bg, mats, "bogie")); }
  const rodMat = mats.steel;
  const mk = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; group.add(m); return m; };
  const rods = [-1, 1].map((sx) => ({
    sx, phase: sx > 0 ? 0 : Math.PI / 2,                                                   // right leads the left by 90 deg
    coupling: mk(new THREE.BoxGeometry(0.05, 0.1, 1), rodMat),
    conn: mk(new THREE.BoxGeometry(0.05, 0.11, 1), rodMat),
    cross: mk(new THREE.BoxGeometry(0.14, 0.18, 0.3), rodMat),
    pins: [mk(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16).rotateZ(Math.PI / 2), mats.steel), mk(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16).rotateZ(Math.PI / 2), mats.steel)],
    piston: mk(new THREE.CylinderGeometry(0.035, 0.035, 1, 12).rotateX(Math.PI / 2), mats.steel),
  }));
  // firehole doors (two leaves that slide apart) + the fire behind them
  const fireTex = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 150, 10, 128, 128, 140); gr.addColorStop(0, "#fff6c8"); gr.addColorStop(0.35, "#ffbe3c"); gr.addColorStop(0.7, "#ff6a12"); gr.addColorStop(1, "#7a1a04");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${200 + Math.random() * 55},${80 + Math.random() * 120},20,${0.3 + Math.random() * 0.4})`; g.beginPath(); g.arc(Math.random() * 256, 120 + Math.random() * 136, 6 + Math.random() * 18, 0, Math.PI * 2); g.fill(); }
  });
  const fireMat = new THREE.MeshBasicMaterial({ map: fireTex, toneMapped: false, color: new THREE.Color(2.4, 2.0, 1.6) });
  const fire = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), fireMat); fire.scale.set(1.2, 0.82, 1); fire.position.set(LOCO.firehole[0], LOCO.firehole[1], bz + 0.012); group.add(fire);
  const doors = [-1, 1].map((sx) => { const d = mk(new THREE.BoxGeometry(0.26, 0.36, 0.02), mats.black); d.position.set(sx * 0.13, LOCO.firehole[1], bz + 0.06); return { d, sx }; });
  const regHandle = mk(new THREE.BoxGeometry(0.035, 0.035, 0.36), mats.brass);
  // the fire's glow in the cab (one point light; it flickers)
  let fireLight: THREE.PointLight | null = null;
  if (o.fireLight ?? true) { fireLight = new THREE.PointLight(0xff8a2a, 2.5, 3.2, 1.6); fireLight.position.set(0, 1.85, bz + 0.45); fireLight.castShadow = false; group.add(fireLight); }
  const fireDoor = o.fireDoor ?? ((t: number) => 0.45 + 0.12 * Math.sin(t * 1.3));

  const update = (t: number) => {
    leftSide.visible = !(o.cutaway?.(t) ?? false);
    const d = run(t), a = -d / S.drvR;
    for (const w of wheels) w.m.rotation.x = -d / w.r;
    for (const R of rods) {
      const th = a + R.phase, cr = S.crank;
      const pin = (z: number): V3 => [R.sx * 0.79, S.drvR + cr * Math.sin(-th), z + cr * Math.cos(-th)];
      const p0 = pin(S.drvZ[0]), p1 = pin(S.drvZ[1]);
      R.pins[0].position.set(R.sx * 0.76, p0[1], p0[2]); R.pins[1].position.set(R.sx * 0.76, p1[1], p1[2]);
      R.coupling.position.set(R.sx * 0.76, p0[1], (p0[2] + p1[2]) / 2); R.coupling.scale.set(1, 1, S.drvZ[1] - S.drvZ[0] + 0.2);
      // crosshead on the cylinder axis: z = pin z - sqrt(L^2 - dy^2)
      const dy = p0[1] - S.cylY, zc = p0[2] - Math.sqrt(Math.max(0.01, S.rodL * S.rodL - dy * dy));
      R.cross.position.set(R.sx * S.cylX, S.cylY, zc);
      const mid: V3 = [R.sx * 0.83, (p0[1] + S.cylY) / 2, (p0[2] + zc) / 2];
      R.conn.position.set(...mid); R.conn.scale.set(1, 1, S.rodL + 0.12); R.conn.rotation.set(Math.atan2(-(p0[1] - S.cylY), p0[2] - zc), 0, 0);
      const pl = zc - (S.cylZ[1] - 0.1); R.piston.position.set(R.sx * S.cylX, S.cylY, S.cylZ[1] - 0.1 + pl / 2); R.piston.scale.set(1, 1, Math.max(0.05, pl));
    }
    const k = Math.max(0, Math.min(1, fireDoor(t)));
    for (const D of doors) D.d.position.x = D.sx * (0.13 + 0.17 * k);
    const fl = 0.75 + 0.15 * Math.sin(t * 17.3) + 0.1 * Math.sin(t * 7.1 + 1.3) + 0.08 * Math.sin(t * 31.7);
    fireMat.color.setRGB(2.4 * fl, 2.0 * fl, 1.6 * fl);
    if (fireLight) fireLight.intensity = (0.6 + 2.6 * k) * fl;
    regHandle.position.set(-0.12, 2.62, bz + 0.12); regHandle.rotation.set(0, 0, 0.5 + 0.05 * Math.sin(t * 0.7)); regHandle.rotateY(Math.PI / 2);
  };
  update(0);
  return { object: group, group, update: (t) => update(t) };
};
const mulberry = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

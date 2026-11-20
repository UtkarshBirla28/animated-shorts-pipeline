// KIT / SUBWAY: the dark NYC tunnel wall a stopped car's doors open onto. Plane z = zWall facing -z (toward the car),
// along x0..x1, from the track bed to the tunnel roof. Board-formed concrete (our plank + tie-hole texture over
// SURFACES' tunnel concrete shader: soot streaks, grime, efflorescence decals), a bench-wall ledge, a recessed niche
// with a CAGED warm bulb (shadowed point practical, faint flicker), a steel junction box + conduit, a cable run on
// brackets every 1.5 m (6 sagging black cables), a blue emergency light over its alarm box (the only cool note), a
// stencilled number (digits only), the track bed below (ballast, ties, rails). Pure geometry; lights via ctx.practical.
import * as THREE from "three";
import type { KitCtx, Practical } from "../core/ctx";
import { surface, setSurfAttrs } from "../surfaces/materials";
import { farGround } from "../surfaces/ground";
import { addDecals } from "../surfaces/decals";
import { Parts } from "./geo";
import { metal, plain, paintedSteel, emissive } from "./mats";
import { boardForm, swapSurf, stencilTex } from "./tex";

export type TunnelOpts = { x0?: number; x1?: number; zWall?: number; floorY?: number; roofY?: number; niche?: { x: number; y?: number };
  blue?: { x: number; y?: number }; number?: { x: number; y?: number; digits?: string }; seed?: number };

export const nyTunnelWall = async (ctx: KitCtx, o: TunnelOpts = {}) => {
  const x0 = o.x0 ?? -30, x1 = o.x1 ?? 30, zw = o.zWall ?? 2.31, fy = o.floorY ?? -1.32, ry = o.roofY ?? 3.6, seed = o.seed ?? 1;
  const nx = o.niche?.x ?? 1.8, ny = o.niche?.y ?? 1.25;
  const G = new THREE.Group(); G.name = "ny-tunnel";
  const hi = ctx.quality === "final" || ctx.quality === "final4";
  // ---------------- the wall: board-formed concrete with a niche cut into it
  const wallM = swapSurf(await surface(ctx, "tunnel_concrete", { uv: "uv", tileM: 1.8, anti: "none", pom: { scale: 1.0, steps: 12, fadeM: 5 },
    tint: [0.62, 0.6, 0.57], dirt: { grime: 0.55, streaks: 0.75, bottom: 0.9, heightM: 0.9, baseY: fy }, macro: { amount: 0.22, scaleM: 2.2 }, seed }), boardForm(seed, hi ? 1024 : 512));
  wallM.userData.surf.U.sDispV.value.x = 0.006; wallM.userData.surf.U.sPom.value.x = 0.006 / 1.8;
  addDecals(wallM, [
    { type: "streak", at: [nx + 0.9, 2.6], size: [1.8, 0.7], opacity: 0.9 },
    { type: "streak", at: [nx - 1.6, 3.0], size: [2.4, 0.9], opacity: 0.8 },
    { type: "streak", at: [nx + 3.6, 2.2], size: [1.5, 0.6], opacity: 0.7 },
    { type: "paint", at: [nx + 1.4, 0.4], size: [1.3, 0.5], rot: 0.1, opacity: 0.55, tint: [0.85, 0.84, 0.78] },   // efflorescence (white salts)
    { type: "paint", at: [nx - 0.9, 0.2], size: [0.9, 0.35], rot: -0.2, opacity: 0.45, tint: [0.82, 0.82, 0.76] },
    { type: "stain", at: [nx + 0.2, 0.9], size: [1.0, 1.4], opacity: 0.8 },
    { type: "crack", at: [nx + 2.3, 1.4], size: [1.2, 0.05], rot: 1.2, opacity: 0.8 },
    { type: "stain", at: [nx - 2.5, 1.2], size: [1.4, 1.0], opacity: 0.6 },
  ]);
  const P = new Parts();
  const nw = 0.62, nh = 0.82, nd = 0.26, n0 = nx - nw / 2, n1 = nx + nw / 2, ny0 = ny, ny1 = ny + nh;
  // wall quads around the niche hole (UV = metres along x, y)
  const q = (a: number, b: number, c: number, d: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([b, c, zw, a, c, zw, a, d, zw, b, d, zw], 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([-b, c, -a, c, -a, d, -b, d], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    setSurfAttrs(g, () => [0, 0, 0, 0]); return g;
  };
  for (const g of [q(x0, n0, fy, ry), q(n1, x1, fy, ry), q(n0, n1, fy, ny0), q(n0, n1, ny1, ry)]) { const m = new THREE.Mesh(g, wallM); m.receiveShadow = true; m.castShadow = true; G.add(m); }
  // niche: back + 4 reveals (same concrete)
  P.quad("nicheC", [n1, ny0, zw + nd], [n0, ny0, zw + nd], [n0, ny1, zw + nd], [n1, ny1, zw + nd]);
  P.quad("nicheC", [n0, ny0, zw], [n1, ny0, zw], [n1, ny0, zw + nd], [n0, ny0, zw + nd]);
  P.quad("nicheC", [n1, ny1, zw], [n0, ny1, zw], [n0, ny1, zw + nd], [n1, ny1, zw + nd]);
  P.quad("nicheC", [n0, ny0, zw + nd], [n0, ny1, zw + nd], [n0, ny1, zw], [n0, ny0, zw]);
  P.quad("nicheC", [n1, ny0, zw], [n1, ny1, zw], [n1, ny1, zw + nd], [n1, ny0, zw + nd]);
  // the caged bulb: a socket on a small plate, a wire cage (rings + bars), its conduit up the wall to a junction box
  const bx = nx, by = ny1 - 0.2, bz = zw + nd - 0.1;
  P.box("steel", bx - 0.06, by + 0.06, zw + nd - 0.02, bx + 0.06, by + 0.18, zw + nd, 0.004);
  P.cyl("steel", [bx, by + 0.06, bz], [bx, by + 0.12, bz], 0.022, 10);
  for (const ry2 of [-0.06, 0.0, 0.05]) { const tg = new THREE.TorusGeometry(0.055 - Math.abs(ry2) * 0.25, 0.0025, 4, 18); tg.rotateX(Math.PI / 2); tg.translate(bx, by + ry2, bz); P.add("cage", tg); }
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; P.cyl("cage", [bx + Math.cos(a) * 0.05, by + 0.06, bz + Math.sin(a) * 0.05], [bx + Math.cos(a) * 0.035, by - 0.09, bz + Math.sin(a) * 0.035], 0.002, 4); }
  P.cyl("steel", [bx + 0.0, ny1, zw + nd - 0.05], [bx + 0.0, 2.75, zw - 0.04], 0.012, 8);
  P.box("box", bx - 0.12, 2.75, zw - 0.12, bx + 0.12, 3.02, zw - 0.0, 0.01);
  // bench-wall ledge (a narrow concrete walk) at the wall foot
  const ledgeM = await surface(ctx, "concrete_floor", { uv: "uv", tint: [0.42, 0.4, 0.38], dirt: { grime: 0.6, edge: 0.5 }, wear: { edges: 1 }, seed: seed + 2 });
  const LP = new Parts();
  for (let x = x0; x < x1; x += 2.0) LP.box("ledge", x + 0.005, fy, zw - 0.6, x + 1.995, -0.42, zw, 0.02);
  // cable run: L brackets every 1.5 m carrying 6 cables with sag
  const brY = [1.55, 1.68, 1.81, 1.94, 2.07, 2.2];
  const xsB: number[] = []; for (let x = Math.ceil(x0 / 1.5) * 1.5; x <= x1; x += 1.5) xsB.push(x);
  for (const x of xsB) { P.box("bracket", x - 0.02, 1.45, zw - 0.2, x + 0.02, 2.3, zw - 0.0, 0.004); for (const y of brY) P.box("bracket", x - 0.02, y - 0.012, zw - 0.2, x + 0.02, y, zw, 0.003); }
  for (let i = 0; i < xsB.length - 1; i++) for (let c = 0; c < 6; c++) {
    const y = brY[c] + 0.022 + c * 0.0, z = zw - 0.05 - (c % 3) * 0.045, sag = 0.03 + 0.02 * ((i * 7 + c * 3) % 5) / 5;
    P.cable("cable", [xsB[i], y, z], [xsB[i + 1], y, z], sag, 0.016 + 0.004 * (c % 2));
  }
  // the blue emergency light + its alarm box (digits-free)
  const blueX = o.blue?.x ?? 5.3, blueY = o.blue?.y ?? 1.75;
  P.box("bluebox", blueX - 0.16, blueY - 0.55, zw - 0.12, blueX + 0.16, blueY - 0.15, zw, 0.012);
  P.box("steel", blueX - 0.05, blueY - 0.05, zw - 0.08, blueX + 0.05, blueY + 0.0, zw, 0.006);
  const blueGlobe = new THREE.SphereGeometry(0.045, 14, 10); blueGlobe.translate(blueX, blueY + 0.04, zw - 0.05); P.add("blue", blueGlobe);
  // track bed below (ballast, timber ties, rails)
  G.add((await farGround(ctx, "ballast", [x0, x1, -1.8, zw], { tint: [0.32, 0.31, 0.3], dirt: { grime: 0.6 } }, fy)).object);
  for (let x = x0; x < x1; x += 0.62) P.box("tie", x - 0.09, fy, -1.3, x + 0.09, fy + 0.16, 1.3, 0.01);
  for (const s of [-1, 1]) P.box("rail", x0, fy + 0.16, s * 0.7175 - 0.035, x1, fy + 0.33, s * 0.7175 + 0.035, 0.004);
  // the tunnel roof (dark) above the car
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, zw + 2.4).rotateX(Math.PI / 2).translate((x0 + x1) / 2, ry, zw / 2 - 1.2), plain([0.05, 0.048, 0.045], 0.9, 0, "troof"));
  G.add(roof);
  const blueM = emissive(0x3a6cff, 4.0) as THREE.MeshBasicMaterial;
  const mats: Record<string, THREE.Material> = {
    nicheC: wallM, steel: metal([0.3, 0.29, 0.27], 0.55), cage: metal([0.12, 0.11, 0.1], 0.5), cable: plain([0.02, 0.02, 0.022], 0.55, 0, "cable"),
    bracket: paintedSteel({ color: [0.2, 0.19, 0.17], rough: 0.6, chips: 0.2, rust: 0.8, baseY: 0, grimeH: 0, grime: 0, dirt: 0.6, freq: 30, seed: seed + 3, key: "bracket" }),
    box: paintedSteel({ color: [0.33, 0.33, 0.3], rough: 0.55, chips: 0.15, rust: 0.7, baseY: 2.7, grimeH: 0.1, grime: 0.3, dirt: 0.5, seed: seed + 4, key: "jbox" }),
    bluebox: paintedSteel({ color: [0.12, 0.2, 0.42], rough: 0.5, chips: 0.12, rust: 0.5, baseY: 1.0, grimeH: 0.1, grime: 0.3, dirt: 0.5, seed: seed + 5, key: "bluebox" }),
    blue: blueM, tie: plain([0.1, 0.075, 0.055], 0.85, 0, "tie"), rail: metal([0.22, 0.16, 0.11], 0.6),
  };
  G.add(P.build(mats, { cast: (k) => k !== "blue", name: "tunnel-parts" }));
  G.add(LP.build({ ledge: ledgeM }, { name: "ledge" }));
  // the stencilled number (white spray, digits only)
  const num = o.number ?? { x: nx + 1.25, y: 1.0, digits: "117" };
  const sm = new THREE.MeshStandardMaterial({ map: stencilTex(num.digits ?? "117"), transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  sm.customProgramCacheKey = () => "subway:stencil";
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), sm); sp.position.set(num.x, num.y ?? 1.0, zw - 0.004); sp.rotation.y = Math.PI; sp.receiveShadow = true; G.add(sp);
  // lights: the caged bulb (shadowed, faint flicker) + the blue light
  let bulb: Practical | null = null, blue: Practical | null = null;
  if (ctx.practical) {
    bulb = ctx.practical({ kind: "point", pos: [bx, by, bz], kelvin: 2400, lumens: 300, shadow: true, shadowNear: 0.08, flicker: 0.04, bulb: { radius: 0.03 }, seed: 21, range: 7 });
    blue = ctx.practical({ kind: "point", pos: [blueX, blueY + 0.04, zw - 0.12], color: 0x3a6cff, lumens: 120, bulb: false, seed: 22, range: 5 });
    G.add(bulb.object); G.add(blue.object);
  }
  return { object: G, bulb, blue, blueM, wallM, nichePos: [bx, by, bz] as [number, number, number] };
};

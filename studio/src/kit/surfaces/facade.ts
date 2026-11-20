// SURFACES facade kit: a parametric building front with REAL depth. Local frame: x along the facade (0..width), y up,
// +z out of the wall (the wall plane is z = 0); `origin` = bottom-left corner on the ground, `yaw` turns it about Y.
// Near LOD: the wall is cut around every opening (reveals of real depth), inset window frames with sashes / mullions /
// glazing bars, sills with drips, lintels or keystones, string courses, a plinth, a cornice or a parapet with coping,
// downpipes with brackets + hopper heads, a door with panels, fanlight and steps, or a shop front (stall riser, big
// glazing, recessed door, blank fascia sign, pilasters, a striped awning that casts shadow). Glass reflects the sky
// (IBL) and shows a fake room behind it (interior mapping: back / side walls, floor, ceiling, furniture band, curtains
// or blinds, lamp glow), seeded per window. Dirt streaks under the sills are projected decals on the wall material.
// Far LOD: one flat wall + interior-mapped glass quads + sills / trims only. All parts are merged per material.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { KitCtx, Built, V3 } from "../core/ctx";
import { surface, setSurfAttrs, type SurfName, type SurfMaterial, type SurfaceOpts } from "./materials";
import { boxUVsAndWear, rng } from "./ground";
import { addDecals, type DecalSpec } from "./decals";

type C3 = [number, number, number];
export type WindowType = "sash" | "casement" | "modern";
export type FacadeOpts = {
  origin: V3; yaw?: number; width: number; floors: number;
  floorH?: number; groundH?: number; bays?: number; seed?: number;
  wall?: SurfName; wallOpts?: SurfaceOpts; trim?: SurfName; plinth?: SurfName;
  window?: WindowType; frameColor?: C3;
  /** a shop front on the ground floor (true or options) */
  shop?: boolean | { awning?: [C3, C3] | false; fascia?: C3 };
  /** a front door in this ground-floor bay (index) when there is no shop */
  door?: number | boolean;
  roof?: "parapet" | "cornice";
  downpipes?: boolean;
  lod?: "near" | "far";
  /** rooms behind the glass: share lit at night (0..1), interior brightness (linear) */
  litShare?: number; interior?: number;
};

// ---------------------------------------------------------------- the glass: sky reflection + interior mapping
const GLASS_VERT_PARS = /* glsl */ `
attribute vec4 aRoom;    // room x0, x1, y0 (floor), y1 (ceiling) in facade-local metres
attribute vec4 aRoom2;   // depth, seed, lamp on, glass z
varying vec3 vLoc; varying vec3 vCamL; varying vec4 vRoom; varying vec4 vRoom2;`;
const GLASS_VERT = /* glsl */ `
vLoc = position; vRoom = aRoom; vRoom2 = aRoom2;
vCamL = ( inverse( modelMatrix ) * vec4( cameraPosition, 1.0 ) ).xyz;`;
const GLASS_FRAG_PARS = /* glsl */ `
varying vec3 vLoc; varying vec3 vCamL; varying vec4 vRoom; varying vec4 vRoom2;
uniform float uInterior;
float gH( float n ) { return fract( sin( n * 91.345 + 7.13 ) * 43758.5453 ); }
vec3 gRoom() {
  vec3 d = normalize( vLoc - vCamL );
  if ( d.z > -0.01 ) d.z = -0.01;
  float zb = vRoom2.w - vRoom2.x;
  float tx = d.x > 0.0 ? ( vRoom.y - vLoc.x ) / d.x : ( vRoom.x - vLoc.x ) / d.x;
  float ty = d.y > 0.0 ? ( vRoom.w - vLoc.y ) / d.y : ( vRoom.z - vLoc.y ) / d.y;
  float tz = ( zb - vLoc.z ) / d.z;
  float t = min( tx, min( ty, tz ) );
  vec3 p = vLoc + d * t;
  float s = vRoom2.y;
  vec3 wallC = mix( vec3( 0.62, 0.55, 0.45 ), vec3( 0.45, 0.52, 0.55 ), gH( s ) ) * mix( 0.7, 1.1, gH( s + 1.0 ) );
  float depthK = clamp( ( vRoom2.w - p.z ) / vRoom2.x, 0.0, 1.0 );
  vec3 c;
  if ( t == tz ) {
    c = wallC;
    float fx0 = mix( vRoom.x, vRoom.y, 0.15 + 0.4 * gH( s + 2.0 ) ), fx1 = fx0 + ( vRoom.y - vRoom.x ) * ( 0.3 + 0.25 * gH( s + 3.0 ) );
    if ( p.x > fx0 && p.x < fx1 && p.y < vRoom.z + 0.85 ) c = mix( vec3( 0.18, 0.12, 0.08 ), vec3( 0.32, 0.25, 0.3 ), gH( s + 4.0 ) );   // sofa / cabinet
    float px = mix( vRoom.x, vRoom.y, 0.55 + 0.2 * gH( s + 5.0 ) );
    if ( abs( p.x - px ) < 0.32 && abs( p.y - ( vRoom.z + 1.6 ) ) < 0.24 ) c = mix( vec3( 0.25, 0.3, 0.35 ), vec3( 0.6, 0.45, 0.3 ), gH( s + 6.0 ) );   // a picture
  } else if ( t == ty ) {
    c = d.y > 0.0 ? vec3( 0.75, 0.73, 0.7 ) : mix( vec3( 0.32, 0.2, 0.11 ), vec3( 0.42, 0.38, 0.33 ), gH( s + 7.0 ) ) * ( 0.85 + 0.15 * step( 0.5, fract( p.x * 6.0 ) ) );
  } else c = wallC * 0.82;
  float light = mix( 1.0, 0.35, depthK ) * ( d.y > 0.0 && t == ty ? 0.7 : 1.0 );
  // a table / floor lamp in ~half the rooms: a warm pool on the back wall
  float lampOn = max( vRoom2.z, step( 0.5, gH( s + 13.0 ) ) );
  vec2 lp = vec2( mix( vRoom.x, vRoom.y, 0.2 + 0.6 * gH( s + 14.0 ) ), vRoom.z + 1.5 );
  vec3 warm = vec3( 1.0, 0.62, 0.3 ) * lampOn;
  if ( t == tz ) c += warm * 0.9 * exp( - 5.0 * dot( p.xy - lp, p.xy - lp ) );
  // furniture silhouettes on a mid-room layer (parallax against the back wall): a sofa / armchair, a floor lamp, a plant
  float zl = vRoom2.w - vRoom2.x * ( 0.45 + 0.2 * gH( s + 15.0 ) ), tl = ( zl - vLoc.z ) / d.z;
  if ( tl > 0.0 && tl < t ) {
    vec3 q = vLoc + d * tl; float fy = q.y - vRoom.z;
    float sx0 = mix( vRoom.x, vRoom.y, 0.05 + 0.3 * gH( s + 16.0 ) ), sw = ( vRoom.y - vRoom.x ) * ( 0.28 + 0.2 * gH( s + 17.0 ) );
    float u = ( q.x - sx0 ) / sw;
    bool sofa = u > 0.0 && u < 1.0 && fy < 0.45 + 0.32 * step( 0.12, min( u, 1.0 - u ) );
    float lx = lp.x;
    bool pole = abs( q.x - lx ) < 0.014 && fy < 1.45;
    bool shade = abs( q.x - lx ) < 0.16 - ( fy - 1.45 ) * 0.25 && fy > 1.45 && fy < 1.72;
    float px = mix( vRoom.x, vRoom.y, 0.75 + 0.2 * gH( s + 18.0 ) );
    bool plant = gH( s + 19.0 ) < 0.5 && ( length( vec2( q.x - px, fy - 1.0 ) ) < 0.3 + 0.06 * sin( atan( fy - 1.0, q.x - px ) * 7.0 ) || ( abs( q.x - px ) < 0.12 && fy < 0.45 ) );
    if ( shade ) return vec3( 0.95, 0.75, 0.45 ) * ( 0.25 + 2.2 * lampOn ) * uInterior + warm * 0.6;
    if ( sofa || pole || plant ) {
      vec3 fc = plant ? vec3( 0.08, 0.14, 0.06 ) : ( pole ? vec3( 0.05 ) : mix( vec3( 0.22, 0.12, 0.08 ), vec3( 0.18, 0.22, 0.3 ), gH( s + 20.0 ) ) );
      return fc * uInterior * 0.8 + fc * warm * 0.25;
    }
  }
  vec3 lamp = vRoom2.z * vec3( 1.0, 0.72, 0.42 ) * ( 1.2 + 2.5 * exp( - 6.0 * length( p.xz - vec2( 0.5 * ( vRoom.x + vRoom.y ), vRoom2.w - 0.5 * vRoom2.x ) ) ) );
  return c * ( uInterior * light + lamp * 0.35 + warm * 0.12 * ( 1.0 - depthK ) );
}`;
const GLASS_EMIT = /* glsl */ `
#include <emissivemap_fragment>
{
  vec3 room = gRoom();
  // curtains at the sides / a blind at the top, in front of the room (seeded)
  float u = ( vLoc.x - vRoom.x ) / max( vRoom.y - vRoom.x, 0.01 );
  float s = vRoom2.y, cw = 0.2 + 0.22 * gH( s + 8.0 );
  float curt = ( 1.0 - step( cw, u ) ) + step( 1.0 - cw, u );
  if ( gH( s + 9.0 ) < 0.2 ) curt = 0.0;
  vec3 cc = mix( vec3( 0.75, 0.68, 0.55 ), vec3( 0.45, 0.2, 0.18 ), gH( s + 10.0 ) ) * ( 0.62 + 0.38 * pow( 0.5 + 0.5 * sin( u * 70.0 + sin( vLoc.y * 3.0 ) ), 0.7 ) );
  float blind = gH( s + 11.0 ) < 0.25 ? step( vRoom.w - 0.35 - 0.5 * gH( s + 12.0 ), vLoc.y ) : 0.0;
  room = mix( room, cc * uInterior * 1.4, max( curt, blind * ( 0.8 + 0.2 * step( 0.5, fract( vLoc.y * 25.0 ) ) ) ) );
  totalEmissiveRadiance += room;
}`;
let glassMat: THREE.MeshStandardMaterial | null = null;
export const glassMaterial = (interior = 0.32) => {
  if (glassMat) { glassMat.userData.U.uInterior.value = interior; return glassMat; }
  const U = { uInterior: { value: interior } };
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.02, 0.022, 0.025), roughness: 0.04, metalness: 0.0, envMapIntensity: 1.2 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + GLASS_VERT_PARS).replace("#include <begin_vertex>", "#include <begin_vertex>\n" + GLASS_VERT);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GLASS_FRAG_PARS).replace("#include <emissivemap_fragment>", GLASS_EMIT);
  };
  m.customProgramCacheKey = () => "surfaces:glass";
  m.userData.U = U;
  glassMat = m;
  return m;
};

// ---------------------------------------------------------------- geometry helpers (local facade coordinates)
export type Parts = Map<string, THREE.BufferGeometry[]>;
export const put = (P: Parts, k: string, g: THREE.BufferGeometry) => { if (!P.has(k)) P.set(k, []); P.get(k)!.push(g); };
/** a rounded box from min / max corners (UVs in metres from local coords, wear on the arrises) */
export const rbox = (P: Parts, k: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r = 0.008, seg = 2) => {
  if (Math.abs(z0) < 1e-6) z0 = -0.004;                       // sink parts touching the wall plane a little (no z-fighting)
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.2, h / 2.2, d / 2.2));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  put(P, k, boxUVsAndWear(g));
};
/** a flat quad in the plane z = const (normal +z), x0..x1, y0..y1, UV = metres */
export const quadZ = (P: Parts, k: string, x0: number, y0: number, x1: number, y1: number, z: number, flip = false) => {
  const g = new THREE.BufferGeometry();
  const pos = [x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z];
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, flip ? -1 : 1, 0, 0, flip ? -1 : 1, 0, 0, flip ? -1 : 1, 0, 0, flip ? -1 : 1], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([x0, y0, x1, y0, x1, y1, x0, y1], 2));
  g.setIndex(flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
  put(P, k, g);
};
/** a reveal face: a quad from p0..p1 (bottom edge) extruded into the wall by depth, with its normal n (local) */
export const reveal = (P: Parts, k: string, a: V3, b: V3, up: V3, n: V3) => {
  const g = new THREE.BufferGeometry(), c: V3 = [b[0] + up[0], b[1] + up[1], b[2] + up[2]], d: V3 = [a[0] + up[0], a[1] + up[1], a[2] + up[2]];
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([...n, ...n, ...n, ...n], 3));
  // uv in metres: run along the longest axis of (b - a), then up
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), U = Math.hypot(...up);
  const u0 = Math.abs(n[0]) > 0.5 ? a[2] : a[0], v0 = Math.abs(n[1]) > 0.5 ? a[2] : a[1];
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u0 + L, v0, u0 + L, v0 + U, u0, v0 + U], 2));
  // winding so the face looks along n
  const e1 = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), e2 = new THREE.Vector3(...up), nn = new THREE.Vector3().crossVectors(e1, e2);
  g.setIndex(nn.dot(new THREE.Vector3(...n)) > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  put(P, k, g);
};
export type Hole = { x0: number; y0: number; x1: number; y1: number };
/** the wall plane z = 0 minus the holes (grid decomposition, UV = metres) */
export const wallWithHoles = (P: Parts, k: string, W: number, H: number, holes: Hole[]) => {
  const xs = [...new Set([0, W, ...holes.flatMap((h) => [h.x0, h.x1])])].sort((a, b) => a - b);
  const ys = [...new Set([0, H, ...holes.flatMap((h) => [h.y0, h.y1])])].sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
    if (holes.some((h) => cx > h.x0 && cx < h.x1 && cy > h.y0 && cy < h.y1)) continue;
    quadZ(P, k, xs[i], ys[j], xs[i + 1], ys[j + 1], 0);
  }
};
export const glassQuad = (P: Parts, x0: number, y0: number, x1: number, y1: number, z: number, room: [number, number, number, number], depth: number, seed: number, lit: number) => {
  quadZ(P, "glass", x0, y0, x1, y1, z);
  const g = P.get("glass")![P.get("glass")!.length - 1];
  const r = new Float32Array(16), r2 = new Float32Array(16);
  for (let i = 0; i < 4; i++) { r.set(room, i * 4); r2.set([depth, seed, lit, z], i * 4); }
  g.setAttribute("aRoom", new THREE.BufferAttribute(r, 4)); g.setAttribute("aRoom2", new THREE.BufferAttribute(r2, 4));
};

const PALETTE: C3[] = [[0.92, 0.9, 0.85], [0.1, 0.18, 0.14], [0.08, 0.08, 0.09], [0.55, 0.12, 0.1], [0.16, 0.24, 0.36], [0.78, 0.72, 0.6]];
const AWNINGS: [C3, C3][] = [[[0.62, 0.08, 0.07], [0.92, 0.88, 0.8]], [[0.1, 0.32, 0.2], [0.9, 0.86, 0.78]], [[0.12, 0.2, 0.42], [0.9, 0.88, 0.82]], [[0.75, 0.45, 0.1], [0.3, 0.12, 0.08]]];
const awnTex: Map<string, THREE.CanvasTexture> = new Map();
const css = (c: C3) => `rgb(${Math.round(Math.pow(c[0], 1 / 2.2) * 255)},${Math.round(Math.pow(c[1], 1 / 2.2) * 255)},${Math.round(Math.pow(c[2], 1 / 2.2) * 255)})`;
const awningTexture = (a: C3, b: C3) => {
  const k = a.join() + b.join(); if (awnTex.has(k)) return awnTex.get(k)!;
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256; const g = cv.getContext("2d")!;
  for (let i = 0; i < 16; i++) { g.fillStyle = css(i % 2 ? b : a); g.fillRect(i * 32, 0, 32, 256); }
  // weathering: a sun-faded top, a dirty bottom hem, weave specks
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,250,235,0.18)"); gr.addColorStop(0.8, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(40,30,20,0.25)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "rgba(0,0,0,0.05)"; for (let i = 0; i < 6000; i++) g.fillRect((i * 37) % 512, (i * 53) % 256, 1, 1);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; awnTex.set(k, t); return t;
};
const plain = (c: C3, rough = 0.45, metal = 0) => { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(...c), roughness: rough, metalness: metal }); m.customProgramCacheKey = () => "surfaces:plain"; return m; };

/** build one facade (see the header). Returns the group, its kit materials (wall / trim / plinth, for more decals) and
 *  the window rects (local) */
export const facade = async (ctx: KitCtx, o: FacadeOpts): Promise<Built & { mats: Record<string, SurfMaterial>; windows: Hole[] }> => {
  const R = rng(o.seed ?? 1), far = o.lod === "far";
  const W = o.width, fH = o.floorH ?? 3.1, shop = !!o.shop, gH = o.groundH ?? (shop ? 3.7 : fH);
  const bays = o.bays ?? Math.max(2, Math.round(W / 2.7)), bw = W / Math.max(1, bays);
  const Hroof = gH + (o.floors - 1) * fH, parapet = (o.roof ?? "parapet") === "parapet", H = Hroof + (parapet ? 0.9 : 0.35);
  const wType: WindowType = o.window ?? (["sash", "casement", "modern"] as WindowType[])[Math.floor(R() * 2.2)];
  const frameC = o.frameColor ?? PALETTE[Math.floor(R() * 3)], doorC = PALETTE[1 + Math.floor(R() * 5)];
  const wallName = o.wall ?? (["brick_wall", "painted_wall", "brick_wall", "stone_wall"] as SurfName[])[Math.floor(R() * 4)];
  const dRev = wallName.includes("brick") || wallName === "stone_wall" ? 0.2 : 0.14;
  const baseY = o.origin[1];
  const wall = await surface(ctx, wallName, { uv: "uv", pom: !far && wallName !== "painted_wall", seed: o.seed,
    dirt: { bottom: 0.6, heightM: 0.9, baseY, grime: 0.14, streaks: 0.12, joints: 0.35 }, moss: { amount: 0.12 }, ...o.wallOpts });
  const trim = await surface(ctx, o.trim ?? "stone_trim", { uv: "uv", tint: [0.95, 0.92, 0.86], dirt: { grime: 0.25, bottom: 0.35, heightM: 0.4, baseY }, wear: { edges: 1, chips: 0.6 }, seed: (o.seed ?? 1) + 5 });
  const plinth = await surface(ctx, o.plinth ?? "stone_trim", { uv: "uv", tint: [0.7, 0.68, 0.64], dirt: { bottom: 0.8, heightM: 0.35, baseY, grime: 0.3 }, wear: { edges: 1 }, seed: (o.seed ?? 1) + 9 });
  const P: Parts = new Map(), holes: Hole[] = [], windows: Hole[] = [], decals: DecalSpec[] = [];
  const glassZ = -dRev + 0.04;
  // ---- one window: reveal, frame, sashes / mullions / glazing bars, glass + room, sill, lintel ----
  const addWindow = (h: Hole, room: [number, number, number, number], seed: number, lit: number) => {
    const { x0, y0, x1, y1 } = h, cx = (x0 + x1) / 2, ww = x1 - x0, wh = y1 - y0;
    windows.push(h);
    if (far) {
      glassQuad(P, x0, y0, x1, y1, 0.004, room, 4, seed, lit);
      rbox(P, "trim", x0 - 0.06, y0 - 0.07, 0, x1 + 0.06, y0, 0.06);
      rbox(P, "trim", x0 - 0.06, y1, 0, x1 + 0.06, y1 + 0.14, 0.02);
      return;
    }
    holes.push(h);
    const d = dRev;
    reveal(P, "wall", [x0, y0, 0], [x0, y0, -d], [0, wh, 0], [1, 0, 0]);
    reveal(P, "wall", [x1, y0, -d], [x1, y0, 0], [0, wh, 0], [-1, 0, 0]);
    reveal(P, "wall", [x0, y1, -d], [x1, y1, -d], [0, 0, d], [0, -1, 0]);
    const fz0 = -d, fz1 = -d + 0.07, fw = wType === "modern" ? 0.045 : 0.065;
    rbox(P, "frame", x0, y0, fz0, x0 + fw, y1, fz1, 0.006); rbox(P, "frame", x1 - fw, y0, fz0, x1, y1, fz1, 0.006);
    rbox(P, "frame", x0, y1 - fw, fz0, x1, y1, fz1, 0.006); rbox(P, "frame", x0, y0, fz0, x1, y0 + fw * 1.4, fz1 + 0.01, 0.006);
    const gb = 0.024;
    if (wType === "sash") {
      const my = y0 + wh * 0.5;
      rbox(P, "frame", x0 + fw, my - 0.03, fz1 - 0.01, x1 - fw, my + 0.03, fz1 + 0.03, 0.005);
      for (const [a, b] of [[y0 + fw * 1.4, my], [my, y1 - fw]] as [number, number][]) {
        rbox(P, "frame", cx - gb / 2, a, fz1 - 0.02, cx + gb / 2, b, fz1 + 0.005, 0.004);
        rbox(P, "frame", x0 + fw, (a + b) / 2 - gb / 2, fz1 - 0.02, x1 - fw, (a + b) / 2 + gb / 2, fz1 + 0.005, 0.004);
      }
    } else if (wType === "casement") {
      const ty = y0 + wh * 0.74;
      rbox(P, "frame", cx - 0.035, y0 + fw, fz0, cx + 0.035, ty, fz1, 0.005);
      rbox(P, "frame", x0 + fw, ty - 0.03, fz0, x1 - fw, ty + 0.03, fz1, 0.005);
      for (const [a, b] of [[x0 + fw, cx - 0.035], [cx + 0.035, x1 - fw]] as [number, number][]) {
        rbox(P, "frame", a, y0 + fw * 1.4, fz1 - 0.01, a + 0.035, ty - 0.03, fz1 + 0.012, 0.004); rbox(P, "frame", b - 0.035, y0 + fw * 1.4, fz1 - 0.01, b, ty - 0.03, fz1 + 0.012, 0.004);
      }
    } else {
      const mx = x0 + ww * 0.36;
      rbox(P, "frame", mx - 0.025, y0 + fw, fz0, mx + 0.025, y1 - fw, fz1, 0.004);
    }
    glassQuad(P, x0 + fw * 0.5, y0 + fw, x1 - fw * 0.5, y1 - fw * 0.5, glassZ, room, 4.2, seed, lit);
    rbox(P, "trim", x0 - 0.07, y0 - 0.075, -d + 0.03, x1 + 0.07, y0, 0.065, 0.01);
    rbox(P, "trim", x0 - 0.06, y0 - 0.095, 0.0, x1 + 0.06, y0 - 0.07, 0.05, 0.006);
    const lt = Math.floor(seed * 7) % 3;
    if (wallName === "painted_wall" || lt === 2) {
      for (const [a, b, c, e] of [[x0 - 0.1, y1, x1 + 0.1, y1 + 0.12], [x0 - 0.1, y0, x0, y1], [x1, y0, x1 + 0.1, y1]] as number[][]) rbox(P, "trim", a, b, 0, c, e, 0.03, 0.008);
      rbox(P, "trim", x0 - 0.14, y1 + 0.12, 0, x1 + 0.14, y1 + 0.17, 0.06, 0.008);
    } else {
      rbox(P, "trim", x0 - 0.1, y1, 0, x1 + 0.1, y1 + 0.2, 0.025, 0.008);
      if (lt === 1) rbox(P, "trim", cx - 0.09, y1 - 0.05, 0, cx + 0.09, y1 + 0.26, 0.05, 0.01);
    }
    if (decals.length < 14) decals.push({ type: "streak", at: [cx, y0 - 0.1 - 0.45], size: [ww * 0.95, 0.9], opacity: 0.55 + 0.3 * R(), variant: decals.length % 2, tint: [0.45, 0.42, 0.38] });
  };
  // ---- floors ----
  let sRoom = (o.seed ?? 1) * 13.7;
  const lit = (k: number) => ((Math.sin(k * 91.7) * 0.5 + 0.5) < (o.litShare ?? 0) ? 1 : 0);
  for (let f = 0; f < o.floors; f++) {
    const fy = f === 0 ? 0 : gH + (f - 1) * fH, fh = f === 0 ? gH : fH;
    if (f === 0 && shop) continue;
    for (let b = 0; b < bays; b++) {
      const cx = (b + 0.5) * bw;
      if (f === 0 && (o.door === true ? b === 0 : o.door === b)) continue;
      const ww = Math.min(1.25, bw * 0.48), wh = Math.min(fh * 0.56, wType === "sash" ? 1.75 : 1.5), sill = f === 0 ? 0.95 : 0.85;
      addWindow({ x0: cx - ww / 2, y0: fy + sill, x1: cx + ww / 2, y1: fy + sill + wh }, [b * bw + 0.05, (b + 1) * bw - 0.05, fy, fy + fh - 0.3], (sRoom += 1.37) % 97, lit(sRoom));
    }
  }
  // ---- ground floor: door or shop ----
  const M: Record<string, THREE.Material> = {};
  const gHoles: [number, number][] = [];
  if (!far && !shop && o.door !== undefined && o.door !== false) {
    const b = o.door === true ? 0 : o.door, cx = (b + 0.5) * bw, x0 = cx - 0.55, x1 = cx + 0.55, y0 = 0.3, y1 = 2.75, d = dRev + 0.05;
    holes.push({ x0, y0: 0, x1, y1 }); gHoles.push([x0, x1]);
    reveal(P, "wall", [x0, 0, 0], [x0, 0, -d], [0, y1, 0], [1, 0, 0]); reveal(P, "wall", [x1, 0, -d], [x1, 0, 0], [0, y1, 0], [-1, 0, 0]);
    reveal(P, "wall", [x0, y1, -d], [x1, y1, -d], [0, 0, d], [0, -1, 0]);
    rbox(P, "trim", x0, 0, -d, x1, y0, 0.0, 0.01);
    rbox(P, "trim", cx - 0.8, 0, 0, cx + 0.8, 0.15, 0.62, 0.012); rbox(P, "trim", cx - 0.72, 0.15, 0, cx + 0.72, 0.3, 0.32, 0.012);
    const lz = -d + 0.02, top = y1 - 0.5;
    rbox(P, "door", x0 + 0.06, y0, lz, x1 - 0.06, top, lz + 0.05, 0.006);
    for (const [a, c] of [[0.15, 0.48], [0.55, 0.95]] as [number, number][]) for (const s of [-1, 1]) {
      const px0 = s < 0 ? x0 + 0.14 : cx + 0.04, px1 = s < 0 ? cx - 0.04 : x1 - 0.14, py0 = y0 + (top - y0) * a, py1 = y0 + (top - y0) * c - 0.04;
      rbox(P, "door", px0, py0, lz + 0.05, px1, py1, lz + 0.065, 0.006);
    }
    rbox(P, "frame", x0, top, lz, x1, top + 0.06, lz + 0.07, 0.005); rbox(P, "frame", x0, y1 - 0.06, lz, x1, y1, lz + 0.07, 0.005);
    rbox(P, "frame", x0, y0, lz - 0.01, x0 + 0.06, y1, lz + 0.07, 0.005); rbox(P, "frame", x1 - 0.06, y0, lz - 0.01, x1, y1, lz + 0.07, 0.005);
    glassQuad(P, x0 + 0.06, top + 0.06, x1 - 0.06, y1 - 0.06, lz + 0.02, [x0 - 0.6, x1 + 0.6, 0.3, 3.2], 3, sRoom % 97, 0);
    rbox(P, "metal", x1 - 0.2, 1.3, lz + 0.05, x1 - 0.14, 1.36, lz + 0.11, 0.01);
    rbox(P, "trim", x0 - 0.12, y1, 0, x1 + 0.12, y1 + 0.22, 0.04, 0.01);
    rbox(P, "trim", cx - 0.1, y1 - 0.06, 0, cx + 0.1, y1 + 0.3, 0.06, 0.01);
  }
  if (shop) {
    const so = typeof o.shop === "object" ? o.shop : {};
    const pw = 0.42, x0 = pw, x1 = W - pw, top = gH - 0.75;
    holes.push({ x0, y0: 0, x1, y1: top }); gHoles.push([x0, x1]);
    if (!far) {
      reveal(P, "wall", [x0, 0, 0], [x0, 0, -0.3], [0, top, 0], [1, 0, 0]); reveal(P, "wall", [x1, 0, -0.3], [x1, 0, 0], [0, top, 0], [-1, 0, 0]);
      reveal(P, "wall", [x0, top, -0.3], [x1, top, -0.3], [0, 0, 0.3], [0, -1, 0]);
    }
    const dx0 = x1 - 1.35, sz = -0.15;
    rbox(P, "stall", x0, 0, sz - 0.12, dx0, 0.55, sz + 0.02, 0.01);
    rbox(P, "trim", x0 - 0.01, 0.55, sz - 0.14, dx0 + 0.01, 0.6, sz + 0.06, 0.008);
    glassQuad(P, x0, 0.6, dx0, top - 0.32, sz - 0.05, [x0, x1, 0.0, gH - 0.3], 5.5, (sRoom += 3.1) % 97, 0.6);
    for (let i = 0; i <= 3; i++) { const mx = x0 + (dx0 - x0) * i / 3; rbox(P, "frame", mx - 0.035, 0.6, sz - 0.06, mx + 0.035, top - 0.32, sz + 0.02, 0.005); }
    rbox(P, "frame", x0, top - 0.36, sz - 0.08, x1, top - 0.28, sz + 0.02, 0.005);
    glassQuad(P, x0, top - 0.28, x1, top, sz - 0.05, [x0, x1, 0, gH - 0.3], 5.5, (sRoom + 1.7) % 97, 0.6);
    const dz = -1.1;
    reveal(P, "wall", [dx0, 0, sz], [dx0, 0, dz], [0, top - 0.36, 0], [1, 0, 0]);
    rbox(P, "trim", dx0, 0, dz, x1, 0.04, sz, 0.006);
    rbox(P, "door", dx0 + 0.08, 0.04, dz, x1 - 0.08, top - 0.4, dz + 0.05, 0.006);
    glassQuad(P, dx0 + 0.2, 0.9, x1 - 0.2, top - 0.55, dz + 0.055, [dx0 - 1, x1 + 1, 0, gH - 0.3], 4, (sRoom + 2.9) % 97, 0.6);
    rbox(P, "metal", dx0 + 0.18, 0.95, dz + 0.05, dx0 + 0.22, 1.45, dz + 0.1, 0.01);
    rbox(P, "fascia", 0.25, top + 0.02, 0, W - 0.25, gH - 0.2, 0.14, 0.012);
    rbox(P, "trim", 0.15, gH - 0.2, 0, W - 0.15, gH - 0.08, 0.26, 0.012);
    for (const pxx of [0, W - pw]) { rbox(P, "fascia", pxx, 0, 0, pxx + pw, top, 0.09, 0.012); rbox(P, "trim", pxx - 0.02, top - 0.05, 0, pxx + pw + 0.02, gH - 0.2, 0.2, 0.012); rbox(P, "plinth", pxx - 0.02, 0, 0, pxx + pw + 0.02, 0.4, 0.12, 0.012); }
    if (so.awning !== false) {
      const [a, b] = so.awning ?? AWNINGS[Math.floor(R() * AWNINGS.length)];
      M.awning = new THREE.MeshStandardMaterial({ map: awningTexture(a, b), roughness: 0.85, side: THREE.DoubleSide });
      const ax0 = x0 + 0.05, ax1 = x1 - 0.05, ay = top + 0.02, out = 1.25, drop = 0.55;
      const g = new THREE.BufferGeometry(), n = 24, pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let j = 0; j <= 4; j++) for (let i = 0; i <= n; i++) { const u = i / n, v = j / 4, sag = 0.03 * Math.sin(u * Math.PI * 8) * v; pos.push(ax0 + (ax1 - ax0) * u, ay - drop * v - sag, 0.14 + out * v); uv.push(u * (ax1 - ax0) / 2, 1 - v * 0.8); }
      for (let j = 0; j < 4; j++) for (let i = 0; i < n; i++) { const p0 = j * (n + 1) + i; idx.push(p0, p0 + n + 1, p0 + 1, p0 + 1, p0 + n + 1, p0 + n + 2); }
      const base = pos.length / 3;
      for (let i = 0; i <= n * 2; i++) { const u = i / (n * 2), sc = 0.06 * Math.abs(Math.sin(u * Math.PI * (ax1 - ax0) * 2.5)); pos.push(ax0 + (ax1 - ax0) * u, ay - drop, 0.14 + out, ax0 + (ax1 - ax0) * u, ay - drop - 0.2 + sc, 0.14 + out); uv.push(u * (ax1 - ax0) / 2, 0.2, u * (ax1 - ax0) / 2, 0.02); }
      for (let i = 0; i < n * 2; i++) { const p0 = base + i * 2; idx.push(p0, p0 + 1, p0 + 2, p0 + 1, p0 + 3, p0 + 2); }
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      put(P, "awning", g);
      for (const ex of [ax0, ax1]) rbox(P, "metal", ex - 0.012, ay - drop, 0.1, ex + 0.012, ay - drop + 0.03, 0.14 + out, 0.006);
    }
  }
  // ---- wall plane with the holes, plinth (split at the ground-floor holes), string courses, roof edge, quoins ----
  wallWithHoles(P, "wall", W, H, holes);
  let px = -0.02;
  for (const [a, b] of [...gHoles].sort((p, q) => p[0] - q[0])) { if (a - px > 0.05) rbox(P, "plinth", px, 0, 0, a, 0.45, 0.035, 0.01); px = b; }
  if (W + 0.02 - px > 0.05) rbox(P, "plinth", px, 0, 0, W + 0.02, 0.45, 0.035, 0.01);
  for (let f = 1; f < o.floors; f++) { const yl = gH + (f - 1) * fH; rbox(P, "trim", -0.02, yl - 0.05, 0, W + 0.02, yl + 0.1, 0.045, 0.01); }
  if (parapet) {
    rbox(P, "trim", -0.02, Hroof - 0.05, 0, W + 0.02, Hroof + 0.12, 0.06, 0.01);
    rbox(P, "trim", -0.04, H, -0.32, W + 0.04, H + 0.08, 0.07, 0.01);
  } else {
    rbox(P, "trim", -0.02, H - 0.42, 0, W + 0.02, H - 0.26, 0.08, 0.01);
    rbox(P, "trim", -0.04, H - 0.26, 0, W + 0.04, H - 0.12, 0.18, 0.012);
    rbox(P, "trim", -0.08, H - 0.12, -0.3, W + 0.08, H, 0.3, 0.012);
  }
  if (!far) for (const qx of [0, W]) for (let y = 0.45, i = 0; y < Hroof - 0.3; y += 0.32, i++) { const wq = i % 2 ? 0.28 : 0.44; rbox(P, "trim", qx === 0 ? -0.015 : W - wq, y + 0.01, 0, qx === 0 ? wq : W + 0.015, y + 0.3, 0.025, 0.008); }
  // ---- downpipes with brackets, hopper heads and shoes ----
  if (o.downpipes !== false && !far) for (const dx of [0.62, W - 0.62]) {
    const r = 0.05, top = Hroof - 0.25, cyl = new THREE.CylinderGeometry(r, r, top - 0.25, 14, 1); cyl.translate(dx, (top + 0.25) / 2, 0.13);
    put(P, "metalc", cyl);
    for (let y = 0.9; y < top - 0.3; y += 1.6) rbox(P, "metal", dx - 0.065, y, 0, dx + 0.065, y + 0.05, 0.19, 0.008);
    rbox(P, "metal", dx - 0.13, top - 0.05, 0.02, dx + 0.13, top + 0.25, 0.27, 0.01);
    const shoe = new THREE.CylinderGeometry(r, r, 0.3, 14, 1); shoe.rotateX(-0.9); shoe.translate(dx, 0.17, 0.22); put(P, "metalc", shoe);
  }
  // ---- materials, merge per material ----
  const fasc: C3 = typeof o.shop === "object" && o.shop.fascia ? o.shop.fascia : PALETTE[1 + Math.floor(R() * 5)];
  Object.assign(M, { wall, trim, plinth, frame: plain(frameC, 0.4), door: plain(doorC, 0.35), fascia: plain(fasc, 0.38),
    glass: glassMaterial(o.interior ?? 0.32), metal: plain([0.06, 0.07, 0.065], 0.45, 0.5), metalc: plain([0.06, 0.07, 0.065], 0.45, 0.5) });
  if (P.has("stall")) M.stall = await surface(ctx, "marble", { uv: "uv", tint: [0.55, 0.6, 0.58], dirt: { bottom: 0.6, heightM: 0.3, baseY } });
  const grp = new THREE.Group(); grp.name = "facade"; grp.userData.kitModule = "facade";
  for (const [k, list] of P) {
    if (!list.length || !M[k]) continue;
    const g = list.length === 1 ? list[0] : mergeGeometries(list, false);
    if (!g) { console.warn("facade: merge failed for", k); continue; }
    if (k === "wall") setSurfAttrs(g, () => [0, 0, 0, 0]);
    const mesh = new THREE.Mesh(g, M[k]); mesh.castShadow = k !== "glass"; mesh.receiveShadow = true; mesh.name = "facade_" + k;
    grp.add(mesh);
  }
  addDecals(wall, decals);
  grp.position.set(...o.origin); grp.rotation.y = o.yaw ?? 0;
  return { object: grp, mats: { wall, trim, plinth }, windows };
};

export type BuildingOpts = {
  /** footprint min corner (x0, z0), size w (x) by d (z), ground height y */
  x0: number; z0: number; w: number; d: number; y?: number;
  floors: number; floorH?: number; groundH?: number;
  /** which side carries the main facade (shop / door): "+z" (toward the default camera), "-z", "+x", "-x" */
  front?: "+z" | "-z" | "+x" | "-x";
  main?: Partial<FacadeOpts>; sides?: Partial<FacadeOpts>; back?: Partial<FacadeOpts>;
  roof?: "parapet" | "cornice"; wall?: SurfName; seed?: number; lod?: "near" | "far";
};
type Face = Built & { mats: Record<string, SurfMaterial>; windows: Hole[] };
/** a CLOSED building: four facades meeting at quoined corners + a roof slab, so no edge is ever paper-thin. The main
 *  side gets `main` (shop / door), the two flanks `sides` (fewer bays, no door), the back `back` (far LOD by default). */
export const building = async (ctx: KitCtx, o: BuildingOpts): Promise<Built & { faces: Record<string, Face> }> => {
  const y = o.y ?? 0, R = rng(o.seed ?? 1);
  const front = o.front ?? "+z", fH = o.floorH ?? 3.1, gH = o.groundH ?? (o.main?.shop ? 3.7 : fH);
  const wall = o.wall ?? (["brick_wall", "painted_wall", "brick_wall", "stone_wall"] as SurfName[])[Math.floor(R() * 4)];
  const base: Partial<FacadeOpts> = { floors: o.floors, floorH: fH, groundH: gH, wall, roof: o.roof ?? "parapet", lod: o.lod };
  // origin = bottom-left corner seen from outside; yaw turns local +x along the side
  const S: Record<string, { origin: V3; yaw: number; width: number }> = {
    "+z": { origin: [o.x0, y, o.z0 + o.d], yaw: 0, width: o.w }, "-z": { origin: [o.x0 + o.w, y, o.z0], yaw: Math.PI, width: o.w },
    "-x": { origin: [o.x0, y, o.z0], yaw: -Math.PI / 2, width: o.d }, "+x": { origin: [o.x0 + o.w, y, o.z0 + o.d], yaw: Math.PI / 2, width: o.d },
  };
  const opp: Record<string, string> = { "+z": "-z", "-z": "+z", "+x": "-x", "-x": "+x" };
  const grp = new THREE.Group(); grp.name = "building"; grp.userData.kitModule = "facade";
  const faces: Record<string, Face> = {};
  let k = 0;
  for (const side of Object.keys(S)) {
    const role = side === front ? "main" : side === opp[front] ? "back" : "side";
    const extra: Partial<FacadeOpts> = role === "main" ? { ...o.main } : role === "back" ? { lod: "far", ...o.back } : { bays: Math.max(1, Math.round(S[side].width / 3.6)), door: false, shop: false, ...o.sides };
    const f = await facade(ctx, { ...base, ...extra, origin: S[side].origin, yaw: S[side].yaw, width: S[side].width, floors: o.floors, seed: (o.seed ?? 1) * 7 + k++ } as FacadeOpts);
    faces[side] = f; grp.add(f.object);
  }
  const Hroof = gH + (o.floors - 1) * fH;
  const slabM = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.2, 0.19, 0.18), roughness: 0.92 });
  slabM.customProgramCacheKey = () => "surfaces:roofslab";
  const slab = new THREE.Mesh(new THREE.BoxGeometry(o.w - 0.02, 0.3, o.d - 0.02), slabM);
  slab.position.set(o.x0 + o.w / 2, y + Hroof + ((o.roof ?? "parapet") === "parapet" ? 0.1 : 0.2), o.z0 + o.d / 2); slab.castShadow = true; slab.receiveShadow = true;
  grp.add(slab);
  return { object: grp, faces };
};

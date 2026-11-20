// kit/rail shared helpers (STATION owner): merged-part builder, simple materials, canvas textures, seeded noise,
// thin-wire material that never drops below ~0.6 px (no shimmering catenary), cloth flap. Pure, seeded, no Math.random.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { boxUVsAndWear, rng } from "../surfaces/ground";
import type { KitCtx, V3 } from "../core/ctx";

export { rng };
export type Parts = Map<string, THREE.BufferGeometry[]>;
export const put = (P: Parts, k: string, g: THREE.BufferGeometry) => { if (!P.has(k)) P.set(k, []); P.get(k)!.push(g); };

/** seeded hash in [0, 1) */
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
/** smooth 1D value noise in [-1, 1] */
export const vn1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f);
  return (hash(i + seed * 57.3) * (1 - k) + hash(i + 1 + seed * 57.3) * k) * 2 - 1;
};
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** box quality switch: `plain` = every box a plain 12-triangle box (parts that never come near a lens: lineside houses) */
export const BOXQ = { plain: false };
/** a rounded box from its centre + size (metre UVs, arris wear for kit surfaces). Bevels under 2 cm get one segment
 *  (108 triangles), bigger ones two (300); r = 0 or BOXQ.plain = a plain box (12). */
export const box = (P: Parts, k: string, c: V3, s: V3, r = 0.006, rotY = 0, rotX = 0, rotZ = 0) => {
  const rr = Math.max(0.0005, Math.min(r, s[0] / 2.2, s[1] / 2.2, s[2] / 2.2));
  const g = r > 0 && !BOXQ.plain ? new RoundedBoxGeometry(s[0], s[1], s[2], rr < 0.02 ? 1 : 2, rr) : new THREE.BoxGeometry(s[0], s[1], s[2]);
  if (rotX) g.rotateX(rotX); if (rotZ) g.rotateZ(rotZ); if (rotY) g.rotateY(rotY);
  g.translate(c[0], c[1], c[2]);
  put(P, k, boxUVsAndWear(g.index ? g : g));
};
/** min / max corners */
export const boxMM = (P: Parts, k: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r = 0.006) =>
  box(P, k, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)], r);
/** a cylinder (axis Y by default) from centre-bottom, radii r0 (bottom) r1 (top), height h */
export const cyl = (P: Parts, k: string, base: V3, r0: number, r1: number, h: number, seg = 12, axis: "y" | "x" | "z" = "y") => {
  const g = new THREE.CylinderGeometry(r1, r0, h, seg, 1, false);
  g.translate(0, h / 2, 0);
  if (axis === "x") g.rotateZ(-Math.PI / 2); else if (axis === "z") g.rotateX(Math.PI / 2);
  g.translate(base[0], base[1], base[2]);
  put(P, k, boxUVsAndWear(g));
};
/** an H / I beam (steel section) standing on `base`, height h, flange width b, depth d (along `dirX`), plate t */
export const hbeam = (P: Parts, k: string, base: V3, h: number, b = 0.3, d = 0.3, t = 0.016, rotY = 0) => {
  const parts: THREE.BufferGeometry[] = [];
  const mk = (cx: number, cz: number, sx: number, sz: number) => { const g = new THREE.BoxGeometry(sx, h, sz); g.translate(cx, h / 2, cz); parts.push(g); };
  mk(0, -d / 2 + t / 2, b, t); mk(0, d / 2 - t / 2, b, t); mk(0, 0, t * 0.75, d - 2 * t);
  const g = mergeGeometries(parts)!; parts.forEach((p) => p.dispose());
  if (rotY) g.rotateY(rotY);
  g.translate(base[0], base[1], base[2]);
  put(P, k, boxUVsAndWear(g));
};
/** a straight tube between two points (struts, rails, bars) */
export const rod = (P: Parts, k: string, a: V3, b: V3, r: number, seg = 6) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  if (L < 1e-5) return;
  const g = new THREE.CylinderGeometry(r, r, L, seg, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyQuaternion(q); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  put(P, k, boxUVsAndWear(g));
};

export type MatMap = Record<string, THREE.Material>;
/** merge every part list into one mesh per material key */
export const flush = (P: Parts, M: MatMap, o: { cast?: boolean | ((k: string) => boolean); receive?: boolean; name?: string; module?: string } = {}) => {
  const G = new THREE.Group(); G.name = o.name ?? "rail-parts";
  for (const [k, list] of P) {
    if (!list.length) continue;
    const mat = M[k]; if (!mat) throw new Error(`kit/rail: no material for part key "${k}"`);
    // keep attribute sets compatible (aSurf / aWear / uv exist on every boxUVsAndWear part)
    const g = list.length === 1 ? list[0] : mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)), false);
    if (!g) throw new Error(`kit/rail: merge failed for "${k}"`);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = typeof o.cast === "function" ? o.cast(k) : o.cast !== false;
    m.receiveShadow = o.receive !== false;
    m.name = `${o.name ?? "rail"}:${k}`; m.userData.kitModule = o.module ?? "rail";
    G.add(m);
  }
  return G;
};

/** a plain PBR material (sRGB colour triple 0..1) */
export const mat = (srgb: [number, number, number] | number, rough = 0.6, metal = 0, extra: THREE.MeshStandardMaterialParameters = {}) => {
  const c = typeof srgb === "number" ? new THREE.Color(srgb) : new THREE.Color().setRGB(srgb[0], srgb[1], srgb[2], THREE.SRGBColorSpace);
  return new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, ...extra });
};
/** an emissive (lit panel / lamp) material: linear radiance `k` x colour */
export const glow = (srgb: [number, number, number], k = 2, base = 0.05) => {
  const c = new THREE.Color().setRGB(srgb[0], srgb[1], srgb[2], THREE.SRGBColorSpace);
  return new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(base), emissive: c, emissiveIntensity: k, roughness: 0.3 });
};

/** a canvas texture (sRGB, mip-mapped) drawn once */
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d")!; draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  return t;
};
/** deterministic grime speckle over a canvas (seeded) */
export const grime = (g: CanvasRenderingContext2D, w: number, h: number, seed: number, n = 4000, a = 0.06, dark = "0,0,0") => {
  const R = rng(seed);
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${dark},${(a * R()).toFixed(3)})`; const s = 1 + R() * 3; g.fillRect(R() * w, R() * h, s, s); }
};

// ---------------------------------------------------------------- thin wires (>= ~0.6 px wide at any distance)
/** wire uniforms shared by every wire material: drawing-buffer height (px), minimum width (px) */
export const WIRE_U = { uWireH: { value: 960 }, uWireMinPx: { value: 0.65 }, uWireT: { value: 0 }, uWireSway: { value: 0.035 } };
export const syncWireU = (ctx: KitCtx) => {
  const v = new THREE.Vector2(); ctx.gl.getDrawingBufferSize(v);
  WIRE_U.uWireH.value = v.y || ctx.size?.h || 960;
  WIRE_U.uWireT.value = ctx.windT.value;
};
const wireMats = new Map<string, THREE.MeshStandardMaterial>();
/** a wire material: tubes built with `wireGeometry` (attribute aR = radius) grow to >= uWireMinPx on screen */
export const wireMaterial = (srgb: [number, number, number], rough = 0.55, metal = 0.6, key = "dark") => {
  const k = key + srgb.join(",");
  if (wireMats.has(k)) return wireMats.get(k)!;
  const m = mat(srgb, rough, metal);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIRE_U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aR;\nuniform float uWireH;\nuniform float uWireMinPx;\nuniform float uWireT;\nuniform float uWireSway;\nattribute float aSway;\n")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
      {
        vec4 wp = modelMatrix * vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          wp = modelMatrix * instanceMatrix * vec4( transformed, 1.0 );
        #endif
        float dist = length( wp.xyz - cameraPosition );
        float ps = 2.0 * dist / ( projectionMatrix[1][1] * uWireH );
        transformed += objectNormal * max( 0.0, uWireMinPx * 0.5 * ps - aR );
        // slow wind sway of the free span (aSway = 0 at the supports, 1 mid-span)
        float ph = wp.z * 0.045 + wp.x * 0.3 + wp.y * 1.7;
        transformed.x += aSway * uWireSway * ( sin( uWireT * 1.3 + ph ) * 0.7 + sin( uWireT * 2.9 + ph * 1.9 ) * 0.3 );
        transformed.y += aSway * uWireSway * 0.25 * sin( uWireT * 1.1 + ph * 1.3 );
      }`);
  };
  m.customProgramCacheKey = () => "rail:wire";
  wireMats.set(k, m);
  return m;
};
/** a tube along a polyline (world / local points), radius r, with the aR attribute the wire material needs */
export const wireGeometry = (pts: V3[], r: number, radial = 4, sway = 0) => {
  const pos: number[] = [], nrm: number[] = [], ar: number[] = [], sw: number[] = [], idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pts.length; i++) {
    const p = new THREE.Vector3(...pts[i]);
    const a = new THREE.Vector3(...pts[Math.max(0, i - 1)]), b = new THREE.Vector3(...pts[Math.min(pts.length - 1, i + 1)]);
    const tng = b.sub(a).normalize();
    let n1 = new THREE.Vector3().crossVectors(tng, up); if (n1.lengthSq() < 1e-6) n1 = new THREE.Vector3(1, 0, 0); n1.normalize();
    const n2 = new THREE.Vector3().crossVectors(n1, tng).normalize();
    for (let j = 0; j < radial; j++) {
      const a2 = (j / radial) * Math.PI * 2, n = n1.clone().multiplyScalar(Math.cos(a2)).add(n2.clone().multiplyScalar(Math.sin(a2)));
      const u = pts.length > 1 ? i / (pts.length - 1) : 0;
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r); nrm.push(n.x, n.y, n.z); ar.push(r); sw.push(sway * 4 * u * (1 - u));
    }
  }
  for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = a + radial, d = b + radial;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("aR", new THREE.Float32BufferAttribute(ar, 1));
  g.setAttribute("aSway", new THREE.Float32BufferAttribute(sw, 1));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx);
  return g;
};
/** a sagging span between two points (parabola), n segments, sag (m) at mid-span */
export const sagPts = (a: V3, b: V3, sag: number, n = 12): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) { const u = i / n; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u]); }
  return out;
};
/** merge wire tubes (same material) into one mesh; wires do not cast shadows by default */
export const wireMesh = (geos: THREE.BufferGeometry[], m: THREE.Material, cast = false) => {
  const g = mergeGeometries(geos, false)!; geos.forEach((x) => x.dispose());
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = cast; mesh.receiveShadow = false; mesh.userData.kitModule = "rail-wires";
  return mesh;
};

// ---------------------------------------------------------------- cloth flap (laundry, flags): vertex wave by height
const clothMats = new Map<string, THREE.MeshStandardMaterial>();
export const clothMaterial = (ctx: KitCtx, map: THREE.Texture | null, srgb: [number, number, number], key: string) => {
  if (clothMats.has(key)) return clothMats.get(key)!;
  const m = mat(srgb, 0.85, 0, { side: THREE.DoubleSide, map: map ?? null });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWindT = ctx.windT;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWindT;\nattribute vec2 aHang;\n")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
      {
        float d = clamp( aHang.x, 0.0, 1.0 );           // 0 at the line, 1 at the free hem
        float ph = aHang.y;
        float w = sin( uWindT * 3.1 + ph + position.x * 6.0 ) * 0.6 + sin( uWindT * 5.3 + ph * 1.7 + position.x * 11.0 ) * 0.3;
        float gust = 0.6 + 0.4 * sin( uWindT * 0.7 + ph );
        transformed.z += d * d * w * 0.06 * gust;
        transformed.x += d * 0.02 * sin( uWindT * 2.3 + ph );
      }`);
  };
  m.customProgramCacheKey = () => "rail:cloth:" + key;
  clothMats.set(key, m);
  return m;
};

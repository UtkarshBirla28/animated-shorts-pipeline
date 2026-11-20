// KIT / CARDS: grass in front of a card's feet (owner CARDS). See NOTES.md.
// A pool of instanced 3D blades placed on a WORLD-FIXED hashed grid round the card's ground point: as the walker moves,
// cells enter and leave the radius and their blades grow / shrink smoothly (never slide with him, never pop). Lit like the
// set (MeshStandardMaterial, scene sun + shadows), wind on the shared ctx.windT clock. Meant to thicken the set's own
// lawn right at the feet so the shoes sink into it (NATURE's lawn, when it exists, does the rest of the field).
import * as THREE from "three";
import type { KitCtx, V3 } from "../core/ctx";

const TAU = Math.PI * 2;
const hash = (a: number, b: number, c = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
const lin = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

const bladeGeo = (() => {
  const seg = 4, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg; i++) { const h = i / seg, w = 0.5 * Math.pow(1 - h, 0.9) + 0.03, bend = 0.25 * h * h; pos.push(-w, h, bend, w, h, bend); }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const n = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * 0.4, 0.85, n.getZ(i) * 0.4);
  return g;
})();

export type FootGrassOpts = { radius?: number; pitch?: number; perCell?: number; height?: [number, number]; greens?: THREE.Color[] };

export const footGrass = (ctx: KitCtx, parent: THREE.Object3D, o: FootGrassOpts = {}) => {
  const rad = o.radius ?? 0.62, pitch = o.pitch ?? 0.055, per = o.perCell ?? 2, [h0, h1] = o.height ?? [0.08, 0.19];
  const span = Math.ceil(rad / pitch), max = (2 * span + 1) ** 2 * per;
  const greens = o.greens ?? [lin(0.33, 0.45, 0.16), lin(0.27, 0.40, 0.12), lin(0.40, 0.50, 0.20), lin(0.24, 0.35, 0.13), lin(0.44, 0.49, 0.22)];
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  const aBlade = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.windT = ctx.windT;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aBlade;\nuniform float windT;\nvarying float vH;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vH = position.y;
{
  float hh = position.y * position.y;
  #ifdef USE_INSTANCING
  vec3 ip = instanceMatrix[ 3 ].xyz;
  #else
  vec3 ip = vec3( 0.0 );
  #endif
  float w = sin( windT * 2.2 + ip.x * 0.9 + ip.z * 0.6 + aBlade.x * 6.283 ) + 0.4 * sin( windT * 5.1 + aBlade.x * 30.0 );
  transformed.x += 0.30 * hh * w * aBlade.y;
  transformed.z += 0.18 * hh * w * aBlade.y;
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vH;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb *= mix( 0.35, 1.12, smoothstep( 0.0, 1.0, vH ) );");
  };
  mat.customProgramCacheKey = () => "cards:footGrass";
  const im = new THREE.InstancedMesh(bladeGeo, mat, max);
  im.geometry = bladeGeo.clone(); im.geometry.setAttribute("aBlade", aBlade);
  im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.name = "cardFootGrass";
  parent.add(im);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), col = new THREE.Color();
  /** place the blades round ground point p (world-fixed cells; the size fades to 0 at the radius) */
  const update = (p: V3, groundY = p[1]) => {
    const cx = Math.round(p[0] / pitch), cz = Math.round(p[2] / pitch);
    let n = 0;
    for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) {
      const gx = cx + i, gz = cz + j;
      for (let k = 0; k < per; k++) {
        const x = (gx + hash(gx, gz, k) - 0.5) * pitch, z = (gz + hash(gz, gx, k + 7) - 0.5) * pitch;
        const d = Math.hypot(x - p[0], z - p[2]);
        if (d > rad) continue;
        const fade = Math.min(1, (rad - d) / (rad * 0.45));
        const hr = h0 + (h1 - h0) * hash(gx, gz, k + 3);
        const hgt = hr * (0.35 + 0.65 * fade);
        const wdt = (0.005 + 0.004 * hash(gx, gz, k + 5)) * (0.5 + 0.5 * fade);
        q.setFromEuler(e.set((hash(gx, gz, k + 11) - 0.5) * 0.35, hash(gx, gz, k + 9) * TAU, 0, "YXZ"));
        m4.compose(pv.set(x, groundY - 0.004, z), q, sv.set(wdt, hgt, hgt));
        im.setMatrixAt(n, m4);
        col.copy(greens[Math.floor(hash(gx, gz, k + 13) * greens.length)]).multiplyScalar(0.85 + 0.3 * hash(gx, gz, k + 17));
        if (hash(gx, gz, k + 19) < 0.06) col.lerp(lin(0.55, 0.5, 0.28), 0.6);
        im.setColorAt(n, col);
        aBlade.setXY(n, hash(gx, gz, k + 23), 0.6 + 0.8 * hash(gx, gz, k + 29));
        n++;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; aBlade.needsUpdate = true;
  };
  return { object: im, update, dispose: () => { im.geometry.dispose(); mat.dispose(); parent.remove(im); } };
};

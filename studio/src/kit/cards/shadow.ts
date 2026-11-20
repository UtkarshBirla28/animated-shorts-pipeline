// KIT / CARDS: the character's shadows (owner CARDS). See NOTES.md.
//  - PROXIES: per shadow-casting light (the sun, every shadowed Spot / Point lamp), an invisible copy of the drawing turned
//    square to that light (a full-width silhouette on the ground and on walls). Each proxy draws ONLY into its own light's
//    shadow pass (onBeforeShadow empties its draw range for any other shadow camera, including the cards' private
//    visibility pass), so a card is never shadowed by its own silhouette and a lamp proxy never leaks into the sun map.
//    three r175 copies map / alphaTest / side from the object's own material into the depth (or distance) material, so
//    the proxy's (colourless, depthless) material carries the card texture + alpha test + DoubleSide.
//  - CONTACT: a soft multiply AO blob under each foot (from the pose's feet when known) and a wider faint body AO. In the
//    sun the blob darkens the proxy shadow right at the soles (contact), in shade it is the only cue (AO).
import * as THREE from "three";
import type { V3 } from "../core/ctx";
import type { CardLight } from "./cardlight";

export type FootPt = { fwd: number; lat: number; lift: number };

const BLOB_VERT = /* glsl */ `
attribute vec2 aBlob;   // strength, sharpness
varying vec2 vUv; varying vec2 vB;
void main() {
  vUv = uv * 2.0 - 1.0; vB = aBlob;
  vec4 p = vec4( position, 1.0 );
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
#endif
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`;
const BLOB_FRAG = /* glsl */ `
uniform float uK;
varying vec2 vUv; varying vec2 vB;
void main() {
  float r2 = dot( vUv, vUv );
  float a = vB.x * exp( - r2 * vB.y ) * ( 1.0 - smoothstep( 0.75, 1.0, r2 ) );
  if ( a < 0.002 ) discard;
  gl_FragColor = vec4( 0.0, 0.0, 0.0, clamp( a * uK, 0.0, 0.92 ) );
}`;
let blobMat: THREE.ShaderMaterial | null = null;
const blobMaterial = () => {
  if (!blobMat) blobMat = new THREE.ShaderMaterial({ vertexShader: BLOB_VERT, fragmentShader: BLOB_FRAG, uniforms: { uK: { value: 1 } }, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  return blobMat;
};
const BLOB_GEO = (() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; })();

export type CardShadowOpts = { proxies: boolean; contact: boolean; contactK?: number; maxLampDist?: number };
export type CardShadow = {
  objects: THREE.Object3D[];
  /** per sub-frame: place the proxies (one per shadow light) and the blobs */
  update: (p: V3, heading: THREE.Vector3, feet: FootPt[] | null, scaleX: number, scaleY: number, near: boolean) => void;
  proxyCount: () => number;
  dispose: () => void;
};

export const cardShadow = (cl: CardLight, parent: THREE.Object3D, geo: THREE.BufferGeometry, tex: THREE.Texture, o: CardShadowOpts): CardShadow => {
  const proxies = new Map<THREE.Light, THREE.Mesh>();
  const objects: THREE.Object3D[] = [];
  const pmat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  const mkProxy = (light: THREE.Light) => {
    const g = geo.clone();
    const m = new THREE.Mesh(g, pmat);
    m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; m.name = "cardProxy";
    const own = light.shadow!.camera;
    m.onBeforeShadow = (_r, _o, _c, sc) => { if (sc !== own) g.setDrawRange(0, 0); };
    m.onAfterShadow = () => { g.setDrawRange(0, Infinity); };
    // the colour pass draws nothing (no colour, no depth); keep it after the card so it never fights it
    m.renderOrder = 2;
    parent.add(m); objects.push(m);
    proxies.set(light, m);
    return m;
  };
  // blobs: [body, foot R, foot L]
  const blobs = new THREE.InstancedMesh(BLOB_GEO, blobMaterial(), 3);
  const aBlob = new THREE.InstancedBufferAttribute(new Float32Array(6), 2);
  blobs.geometry = BLOB_GEO.clone(); blobs.geometry.setAttribute("aBlob", aBlob);
  blobs.frustumCulled = false; blobs.renderOrder = 0.5; blobs.castShadow = false; blobs.receiveShadow = false; blobs.name = "cardContact";
  blobs.visible = o.contact;
  parent.add(blobs); objects.push(blobs);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), lp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const sunDir = new THREE.Vector3();
  const update: CardShadow["update"] = (p, heading, feet, sx, sy, near) => {
    // ---- proxies: one per shadow light that can reach this card
    const want = new Set<THREE.Light>();
    if (o.proxies && near) {
      for (const l of cl.lights()) {
        if (!l.visible || l.intensity <= 0) continue;
        let yaw: number;
        if ((l as THREE.DirectionalLight).isDirectionalLight) {
          const d = l as THREE.DirectionalLight;
          d.updateMatrixWorld(); d.target.updateMatrixWorld();
          sunDir.setFromMatrixPosition(d.matrixWorld).sub(lp.setFromMatrixPosition(d.target.matrixWorld));
          yaw = Math.atan2(sunDir.x, sunDir.z);
        } else {
          lp.setFromMatrixPosition(l.matrixWorld);
          const dx = lp.x - p[0], dz = lp.z - p[2], dist = Math.hypot(dx, lp.y - p[1], dz);
          const reach = (l as THREE.PointLight).distance > 0 ? (l as THREE.PointLight).distance : (o.maxLampDist ?? 18);
          if (dist > reach) continue;
          yaw = Math.atan2(dx, dz);
        }
        want.add(l);
        const m = proxies.get(l) ?? mkProxy(l);
        m.visible = true;
        m.position.set(p[0], p[1], p[2]);
        m.rotation.set(0, yaw, 0);
        m.scale.set(sx, sy, 1);
      }
    }
    for (const [l, m] of proxies) if (!want.has(l)) m.visible = false;
    // ---- contact + AO
    if (o.contact) {
      const k = o.contactK ?? 1;
      const right = pv.set(-heading.z, 0, heading.x);   // the figure's right (facing +Z, its right hand is at -X)
      const set = (i: number, x: number, z: number, w: number, d: number, yaw: number, str: number, sharp: number) => {
        q.setFromAxisAngle(up, yaw);
        m4.compose(sv.set(x, p[1] + 0.003, z), q, new THREE.Vector3(w, 1, d));
        blobs.setMatrixAt(i, m4); aBlob.setXY(i, str * k, sharp);
      };
      const hy = Math.atan2(heading.x, heading.z), s = Math.abs(sx);
      set(0, p[0], p[2], 0.78 * s, 0.52 * s, hy, 0.3, 2.2);
      if (feet && feet.length >= 2) {
        feet.slice(0, 2).forEach((f, i) => {
          const x = p[0] + heading.x * f.fwd * s + right.x * f.lat * s, z = p[2] + heading.z * f.fwd * s + right.z * f.lat * s;
          const str = 0.62 * Math.max(0, 1 - f.lift / 0.1);
          set(1 + i, x, z, 0.17 * s, 0.32 * s, hy, str, 3.0);
        });
      } else {
        set(1, p[0], p[2], 0.34 * s, 0.26 * s, hy, 0.55, 3.0);
        set(2, p[0], p[2], 0.01, 0.01, 0, 0, 1);
      }
      blobs.instanceMatrix.needsUpdate = true; aBlob.needsUpdate = true;
    }
  };
  return {
    objects, update, proxyCount: () => [...proxies.values()].filter((m) => m.visible).length,
    dispose: () => { for (const m of proxies.values()) { m.geometry.dispose(); parent.remove(m); } pmat.dispose(); blobs.geometry.dispose(); parent.remove(blobs); },
  };
};

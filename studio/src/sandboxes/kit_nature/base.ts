// kit_nature sandbox: the pilot's set BASE (sky + IBL, warm low sun + card sun with PCSS, the brick path, kerbs, lawn
// ground, the building + clock tower in the haze, the phone guy card), copied from sandboxes/lookpilot/world.ts (frozen
// there) so NATURE's modules can be judged in the very same light. Trees, grass, hedge, litter, props and FX come from kit/.
import * as THREE from "three";
import { Pen } from "../../videos/clown/toon";
import * as PPL from "../../videos/clown/cast_people";
import { sunDir, charPos, charMetres, CROSS_Z } from "../lookpilot/shot";
import type { KitCtx, V3 } from "../../kit/core/ctx";
import { wetHook } from "../../kit/fx/particles";

const TAU = Math.PI * 2;
export const lin = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export type Sky = { env: THREE.Texture; bg: THREE.Texture; sunAz: number; meanSky: number; horizon: THREE.Color };
export const loadSky = async (ctx: KitCtx): Promise<Sky> => {
  const [t2, t4] = await Promise.all([ctx.assets.hdri("je_gray_park", "2k"), ctx.assets.hdri("je_gray_park", "4k")]);
  const scan = (t: THREE.DataTexture, clampTo: number) => {
    const { width: W, height: H } = t.image as { width: number; height: number };
    const d = (t.image as unknown as { data: Float32Array }).data;
    let best = 0, bi = 0, sum = 0, n = 0; const hz = [0, 0, 0]; let hn = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (l > best) { best = l; bi = y * W + x; }
      const v = 1 - (y + 0.5) / H;
      if (l > clampTo) { const k = clampTo / l; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
      if (v > 0.5) { const w = Math.cos((v - 0.5) * Math.PI); sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * w; n += w; }
      if (v > 0.51 && v < 0.54) { hz[0] += d[i]; hz[1] += d[i + 1]; hz[2] += d[i + 2]; hn++; }
    }
    t.needsUpdate = true;
    return { sunAz: (((bi % W) + 0.5) / W - 0.5) * TAU, meanSky: sum / n, horizon: new THREE.Color(hz[0] / hn, hz[1] / hn, hz[2] / hn) };
  };
  const s2 = scan(t2, 12); scan(t4, 40);
  const pm = new THREE.PMREMGenerator(ctx.gl); const env = pm.fromEquirectangular(t2).texture; pm.dispose();
  return { env, bg: t4, ...s2 };
};

export const SUN_COL = lin(1.0, 0.86, 0.69);
export const mkSun = (scene: THREE.Scene, size: number, intensity: number, ext: number, center: V3, diamDeg = 0.62) => {
  const L = new THREE.Vector3(...sunDir());
  const s = new THREE.DirectionalLight(SUN_COL, intensity);
  s.castShadow = true; s.shadow.mapSize.set(size, size);
  const c = s.shadow.camera; c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 0.5; c.far = 110;
  const tex = size / (2 * ext), sunDiam = diamDeg * Math.PI / 180;
  s.shadow.radius = 50 + (c.far - c.near) * sunDiam * tex;
  s.shadow.bias = -0.00025; s.shadow.normalBias = 0.015;
  s.target.position.set(...center); s.position.copy(s.target.position).addScaledVector(L, 55);
  scene.add(s, s.target);
  return s;
};

/** sky + both suns + haze on ctx.scene; returns the sky (for the haze colour) */
export const lightScene = async (ctx: KitCtx, center: V3, ext = 25) => {
  const sky = await loadSky(ctx);
  const scene = ctx.scene, L = new THREE.Vector3(...sunDir());
  const rotY = Math.atan2(L.z, L.x) - sky.sunAz;
  scene.background = sky.bg; scene.environment = sky.env;
  scene.backgroundRotation.set(0, rotY, 0); scene.environmentRotation.set(0, rotY, 0);
  const envK = 0.33 / Math.max(sky.meanSky, 1e-3);
  scene.environmentIntensity = envK; scene.backgroundIntensity = envK * 1.05;
  const sun = mkSun(scene, 4096, 7.2, ext, center);
  const sunCard = mkSun(scene, 4096, 0.0, ext, center, 0.45);
  scene.fog = new THREE.FogExp2(sky.horizon.clone().multiplyScalar(envK), 0.0068);
  ctx.sun = sun; ctx.sunCard = sunCard;
  return { sky, sun, sunCard, envK };
};

/** the pilot's ground: lawn plane, brick path with moss in the joints, cross path, concrete kerbs; the building + tower */
export const pilotGround = async (ctx: KitCtx, root: THREE.Object3D, withBuilding = true) => {
  const P = (n: string, res: "1k" | "2k", rep: [number, number]) => Promise.all(["diff", "nor_gl", "arm"].map((k) =>
    ctx.assets.tex(`lookpilot/${n}/${n}_${k}_${res}.jpg`, { srgb: k === "diff", repeat: rep })));
  const [brick, lawn, plaster, wall, cross] = await Promise.all([P("brick_pavement", "2k", [1.2, 42]), P("leafy_grass", "2k", [120, 120]),
    P("plastered_stone_wall", "1k", [40, 0.1]), P("red_brick", "1k", [14, 6]), P("brick_pavement", "2k", [13, 1.1])]);
  const mat = (t: THREE.Texture[], o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map: t[0], normalMap: t[1], roughnessMap: t[2], aoMap: t[2], roughness: 1, metalness: 0, ...o });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), mat(lawn, { color: lin(0.86, 0.94, 0.78), normalScale: new THREE.Vector2(0.8, 0.8) }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.012, -60); ground.receiveShadow = true; root.add(ground);
  const brickM = mat(brick, { color: lin(0.96, 0.92, 0.9), normalScale: new THREE.Vector2(1.1, 1.1) });
  brickM.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", /* glsl */ `#include <map_fragment>
#ifdef USE_AOMAP
{ float jo = texture2D( aoMap, vAoMapUv ).r; vec2 q = vMapUv * vec2( 7.0, 7.0 );
  float nz = fract( sin( dot( floor( q ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
  float nz2 = fract( sin( dot( floor( q * 0.37 ), vec2( 39.3, 11.7 ) ) ) * 9631.17 );
  float moss = ( 1.0 - smoothstep( 0.62, 0.86, jo ) ) * smoothstep( 0.35, 0.8, nz2 ) * ( 0.55 + 0.45 * nz );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.09, 0.11, 0.045 ), moss * 0.5 ); }
#endif`);
  };
  brickM.customProgramCacheKey = () => "sandbox:kn-brick";
  wetHook(brickM, "kn-brick");   // fx WET.value darkens + glosses the pavers (rain shots)
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 84), brickM); path.rotation.x = -Math.PI / 2; path.position.set(0, 0, -33); path.receiveShadow = true; root.add(path);
  const cr = new THREE.Mesh(new THREE.PlaneGeometry(26, 2.2), mat(cross, { color: lin(0.96, 0.92, 0.9) }));
  cr.rotation.x = -Math.PI / 2; cr.position.set(0, -0.002, CROSS_Z); cr.receiveShadow = true; root.add(cr);
  const kerbM = mat(plaster, { color: lin(0.74, 0.72, 0.68) });
  for (const x of [-1.24, 1.24]) for (const [z0, z1] of [[9, CROSS_Z + 1.1], [CROSS_Z - 1.1, -75]] as [number, number][]) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, z0 - z1), kerbM); k.position.set(x, 0.012, (z0 + z1) / 2); k.receiveShadow = true; k.castShadow = true; root.add(k);
  }
  if (withBuilding) {
    const bw = mat(wall, { color: lin(0.92, 0.86, 0.82) }), trimM = new THREE.MeshStandardMaterial({ color: lin(0.86, 0.84, 0.8), roughness: 0.9 });
    const glass = new THREE.MeshStandardMaterial({ color: lin(0.05, 0.06, 0.07), roughness: 0.08, envMapIntensity: 1.4 });
    const B = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(34, 13, 12), bw); body.position.set(-6, 6.5, -82); B.add(body);
    const corn = new THREE.Mesh(new THREE.BoxGeometry(34.6, 0.7, 12.6), trimM); corn.position.set(-6, 13.2, -82); B.add(corn);
    const roofG = new THREE.CylinderGeometry(0.01, 7.6, 4.2, 4, 1); roofG.rotateY(Math.PI / 4); roofG.scale(34.6 / 10.7, 1, 12.6 / 10.7);
    const roof = new THREE.Mesh(roofG, new THREE.MeshStandardMaterial({ color: lin(0.22, 0.24, 0.27), roughness: 0.75 })); roof.position.set(-6, 15.6, -82); B.add(roof);
    for (let fl = 0; fl < 3; fl++) for (let i = 0; i < 11; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), glass); w.position.set(-21 + i * 3.0, 2.6 + fl * 3.6, -75.94); B.add(w); }
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(6, 26, 6), bw); shaft.position.set(9.5, 13, -86); B.add(shaft);
    const bel = new THREE.Mesh(new THREE.BoxGeometry(6.6, 5.2, 6.6), trimM); bel.position.set(9.5, 28.6, -86); B.add(bel);
    const tr = new THREE.CylinderGeometry(0.01, 5.0, 7.5, 4, 1); tr.rotateY(Math.PI / 4);
    const troof = new THREE.Mesh(tr, new THREE.MeshStandardMaterial({ color: lin(0.3, 0.42, 0.38), roughness: 0.55, metalness: 0.3 })); troof.position.set(9.5, 35.0, -86); B.add(troof);
    B.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true; });
    root.add(B);
  }
};

// ---------------- the phone guy card (pilot Card, trimmed) ----------------
const SU = 0.00216;
const CARD_GEO = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, 475 * SU, 0); return g; })();
export const heroCard = (ctx: KitCtx, root: THREE.Object3D) => {
  const cv = document.createElement("canvas"); cv.width = 900; cv.height = 1500;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const U = { uAmb: { value: new THREE.Color(0.25, 0.27, 0.31) }, uSun: { value: SUN_COL.clone() }, uSunK: { value: 0.95 } };
  const m = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uAmb; uniform vec3 uSun; uniform float uSunK;")
      .replace("#include <opaque_fragment>", /* glsl */ `{ float vis = 1.0;
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 1
  vis = getShadow( directionalShadowMap[ 1 ], directionalLightShadows[ 1 ].shadowMapSize, directionalLightShadows[ 1 ].shadowIntensity, directionalLightShadows[ 1 ].shadowBias, directionalLightShadows[ 1 ].shadowRadius, vDirectionalShadowCoord[ 1 ] );
#endif
  outgoingLight = diffuseColor.rgb * ( uAmb + uSun * uSunK * vis ); }
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => "sandbox:kn-card";
  const mesh = new THREE.Mesh(CARD_GEO, m); mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = 1;
  const pg = CARD_GEO.clone();
  const proxy = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
  proxy.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  proxy.castShadow = true; proxy.frustumCulled = false;
  proxy.onBeforeShadow = (_r, _o, _c, sc) => { if (ctx.sunCard && sc === ctx.sunCard.shadow.camera) pg.setDrawRange(0, 0); };
  proxy.onAfterShadow = () => { pg.setDrawRange(0, Infinity); };
  root.add(mesh, proxy);
  let key = "";
  const L = new THREE.Vector3(...sunDir()), sunYaw = Math.atan2(-L.x, -L.z);
  const update = (t: number, cam: THREE.Camera) => {
    const cp = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld), f = t * 30;
    const p = charPos(t), p2 = charPos(t + 0.05), hd = new THREE.Vector3(p2[0] - p[0], 0, p2[2] - p[2]).normalize();
    const d = new THREE.Vector3(cp.x - p[0], 0, cp.z - p[2]).normalize();
    const c = hd.dot(d), s = hd.x * d.z - hd.z * d.x, ch = PPL.phoneChat(f, 5);
    const P: PPL.Pose = { s: -s, c, walk: PPL.walkPhase(charMetres(t), "phone"), go: 1, gait: "phone", expr: ch.laughing ? "laughBig" : "bright", mouth: ch.mouth, nod: ch.nod,
      blink: PPL.blinkAt(f, 5), look: 0.15 * Math.sin(t * 0.8), lookY: 0.05, light: (-140 * Math.PI) / 180, seed: 1, handK: 1.05, armR: PPL.phoneArm(PPL.C.phoneRed), armL: PPL.talkHand(f, 5, ch.talking) };
    const k = JSON.stringify(P);
    if (k !== key) { key = k; const g = cv.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(1.5, 0, 0, 1.5, 0, 0); PPL.drawPhoneGuy(new Pen(g), P); tex.needsUpdate = true; }
    mesh.position.set(...p); mesh.rotation.set(0, Math.atan2(cp.x - p[0], cp.z - p[2]), 0);
    proxy.position.copy(mesh.position); proxy.rotation.set(0, sunYaw, 0);
  };
  return { mesh, update };
};

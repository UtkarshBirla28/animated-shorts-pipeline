// LOOK PILOT world: a sunny late-afternoon campus path built from CC0 PBR sets (Poly Haven / ambientCG, see
// lookpilot/threejs/NOTES.md), lit by a Poly Haven HDRI (PMREM) + one warm low sun with PCSS soft shadows. NO ink on the
// world: only the character card is drawn (with the clown film's cast kit, imported read-only).
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Pen } from "../../videos/clown/toon";
import * as PPL from "../../videos/clown/cast_people";
import * as CROWD from "../../videos/clown/cast_crowd";
import * as FX from "../../videos/clown/cast_fx";
import { seeded, leafMaterial, leafDepthMaterial, grassMaterial, cardMaterial, moteMaterial, WIND_T, type CardU } from "./shaders";
import { sunDir, charPos, charMetres, camAt, CROSS_Z, cyclistAt, PIGEONS, type V3 } from "./shot";

const TAU = Math.PI * 2;
/** fixed hash (no Math.random: every frame renders the same in any process) */
const rng = (seed: number) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const lin = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

// ---------------- loading ----------------
const tl = new THREE.TextureLoader();
const loadTex = async (path: string, srgb: boolean, rep: [number, number] = [1, 1]) => {
  const t = await tl.loadAsync(staticFile(path));
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
};
type PBR = { map: THREE.Texture; normalMap: THREE.Texture; arm: THREE.Texture };
const loadPBR = async (id: string, res: string, rep: [number, number]): Promise<PBR> => {
  const [map, normalMap, arm] = await Promise.all([
    loadTex(`lookpilot/${id}/${id}_diff_${res}.jpg`, true, rep), loadTex(`lookpilot/${id}/${id}_nor_gl_${res}.jpg`, false, rep), loadTex(`lookpilot/${id}/${id}_arm_${res}.jpg`, false, rep)]);
  return { map, normalMap, arm };
};
const pbrMat = (p: PBR, o: THREE.MeshStandardMaterialParameters = {}) => seeded(new THREE.MeshStandardMaterial({
  map: p.map, normalMap: p.normalMap, roughnessMap: p.arm, aoMap: p.arm, aoMapIntensity: 1, roughness: 1, metalness: 0, ...o }));
const cloneRep = (p: PBR, rep: [number, number]): PBR => {
  const c = (t: THREE.Texture) => { const n = t.clone(); n.repeat.set(rep[0], rep[1]); n.needsUpdate = true; return n; };
  return { map: c(p.map), normalMap: c(p.normalMap), arm: c(p.arm) };
};
const loadImg = (path: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = staticFile(path); });

/** the HDRI: find the sun (brightest texel), clamp it for the IBL (the real sun is the directional light), measure the
 *  sky's mean radiance (for the sun / sky balance) and the horizon colour (for the haze) */
type Sky = { env: THREE.Texture; bg: THREE.Texture; sunAz: number; meanSky: number; horizon: THREE.Color };
const loadSky = async (gl: THREE.WebGLRenderer): Promise<Sky> => {
  const ld = new RGBELoader().setDataType(THREE.FloatType);
  const [t2, t4] = await Promise.all([ld.loadAsync(staticFile("lookpilot/hdri/je_gray_park_2k.hdr")), ld.loadAsync(staticFile("lookpilot/hdri/je_gray_park_4k.hdr"))]);
  const scan = (t: THREE.DataTexture, clampTo: number) => {
    const { width: W, height: H } = t.image as { width: number; height: number };
    const d = (t.image as unknown as { data: Float32Array }).data;
    let best = 0, bi = 0, sum = 0, n = 0; const hz = [0, 0, 0]; let hn = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (l > best) { best = l; bi = y * W + x; }
      const v = 1 - (y + 0.5) / H;                       // flipY: data row 0 = top of the sky
      if (l > clampTo) { const k = clampTo / l; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
      if (v > 0.5) { const w = Math.cos((v - 0.5) * Math.PI); sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * w; n += w; }
      if (v > 0.51 && v < 0.54) { hz[0] += d[i]; hz[1] += d[i + 1]; hz[2] += d[i + 2]; hn++; }
    }
    t.needsUpdate = true;
    const u = ((bi % W) + 0.5) / W;
    return { sunAz: (u - 0.5) * TAU, meanSky: sum / n, horizon: new THREE.Color(hz[0] / hn, hz[1] / hn, hz[2] / hn) };
  };
  const s2 = scan(t2, 12);
  scan(t4, 40);
  t2.mapping = THREE.EquirectangularReflectionMapping; t4.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(gl);
  const env = pm.fromEquirectangular(t2).texture;
  pm.dispose();
  return { env, bg: t4, ...s2 };
};

// ---------------- the character card (canvas pool of one) ----------------
const SU = 0.00216;   // metres per design unit (cast kit): the 600 x 1000 card = 1.296 x 2.16 m, soles at y 975
// the plane's centre is design y 500, the soles design y 975 (canvas y runs down): lift by 475 units so the soles sit at 0
const CARD_GEO = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, 475 * SU, 0); return g; })();
class Card {
  static exclude: THREE.Camera | null = null;
  cv: HTMLCanvasElement; tex: THREE.CanvasTexture; mesh: THREE.Mesh; proxy: THREE.Mesh; U: CardU; key = "";
  constructor(public k: number, parent: THREE.Object3D, castProxy = true) {
    this.cv = document.createElement("canvas"); this.cv.width = Math.round(600 * k); this.cv.height = Math.round(1000 * k);
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const m = cardMaterial(this.tex); this.U = m.userData.cardU as CardU;
    this.mesh = new THREE.Mesh(CARD_GEO, m); this.mesh.receiveShadow = true; this.mesh.castShadow = false; this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    // the shadow caster: the same drawing turned square to the sun (a full-width silhouette on the bricks). three's shadow
    // pass tests object layers against the LENS camera, so the proxy stays on layer 0 but draws nothing in the colour pass
    // (no colour, no depth) and skips itself in the card-light shadow map (onBeforeShadow: empty draw range), so the card
    // is never shadowed by its own silhouette
    const pg = CARD_GEO.clone();
    this.proxy = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    this.proxy.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide });
    this.proxy.castShadow = castProxy; this.proxy.frustumCulled = false;
    this.proxy.onBeforeShadow = (_r, _o, _c, sc) => { if (sc === Card.exclude) pg.setDrawRange(0, 0); };
    this.proxy.onAfterShadow = () => { pg.setDrawRange(0, Infinity); };
    parent.add(this.mesh, this.proxy);
  }
  draw(key: string, fn: (p: Pen) => void) {
    if (key === this.key) return;
    this.key = key;
    const g = this.cv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.cv.width, this.cv.height); g.setTransform(this.k, 0, 0, this.k, 0, 0);
    fn(new Pen(g));
    this.tex.needsUpdate = true;
  }
  place(p: V3, cam: THREE.Vector3, sunYaw: number, scale = 1, mirror = false) {
    this.mesh.position.set(p[0], p[1], p[2]);
    this.mesh.rotation.set(0, Math.atan2(cam.x - p[0], cam.z - p[2]), 0);
    this.mesh.scale.set(mirror ? -scale : scale, scale, scale);
    this.proxy.position.copy(this.mesh.position);
    this.proxy.rotation.set(0, sunYaw, 0);
    this.proxy.scale.set(mirror ? -scale : scale, scale, scale);
  }
}

// ---------------- leaves ----------------
// occ = how deep inside its crown the leaf sits (1 = outer shell, lit by the sky; ~0.35 = deep inside), tint = a per-CLUMP
// hue / value shift (whole branches vary together, so the crown reads as masses, not confetti)
type LeafSpec = { pos: V3; nrm: V3; size: number; cell: number; ph: number; clumpPh: number; occ?: number; tint?: number };
const leafGeo = (() => { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0); return g; })();
const buildLeaves = (specs: LeafSpec[], mat: THREE.Material, depth: THREE.Material, cast = true) => {
  const n = specs.length, im = new THREE.InstancedMesh(leafGeo, mat, n);
  const aLeaf = new Float32Array(n * 4), aShade = new Float32Array(n * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const zA = new THREE.Vector3(0, 0, 1), nv = new THREE.Vector3(), q2 = new THREE.Quaternion();
  specs.forEach((L, i) => {
    nv.set(...L.nrm).normalize();
    q.setFromUnitVectors(zA, nv);
    q2.setFromAxisAngle(nv, L.ph * TAU); q.premultiply(q2);
    m4.compose(p.set(...L.pos), q, s.set(L.size, L.size, L.size));
    im.setMatrixAt(i, m4);
    aLeaf.set([L.cell % 3, Math.floor(L.cell / 3), L.ph, L.clumpPh], i * 4);
    aShade.set([L.occ ?? 1, L.tint ?? 0.5], i * 2);
  });
  im.geometry = leafGeo.clone();
  im.geometry.setAttribute("aLeaf", new THREE.InstancedBufferAttribute(aLeaf, 4));
  im.geometry.setAttribute("aShade", new THREE.InstancedBufferAttribute(aShade, 2));
  im.customDepthMaterial = depth; im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false;
  return im;
};
/** a broadleaf crown: clumps (branch tips) on an ellipsoid shell, TWIG cards (each ~15 leaves, twigAtlas) on each clump.
 *  Normals follow the crown's outward direction (+ a little scatter) so the sun and sky shade whole masses smoothly. */
const canopy = (out: LeafSpec[], R: () => number, c: V3, rad: V3, clumps: number, per: number, size: number, holes: { c: V3; r: number }[] = []) => {
  for (let k = 0; k < clumps; k++) {
    let d: V3 = [0, 0, 0];
    for (let tries = 0; tries < 12; tries++) {
      const u = R() * 2 - 1, a = R() * TAU, rr = 0.5 + 0.5 * Math.sqrt(R());
      const sq = Math.sqrt(1 - u * u);
      d = [Math.cos(a) * sq * rr, u * rr * 0.9 + 0.05, Math.sin(a) * sq * rr];
      const w: V3 = [c[0] + d[0] * rad[0], c[1] + d[1] * rad[1], c[2] + d[2] * rad[2]];
      if (!holes.some((h) => Math.hypot(w[0] - h.c[0], w[1] - h.c[1], w[2] - h.c[2]) < h.r)) break;
    }
    const cc: V3 = [c[0] + d[0] * rad[0], c[1] + d[1] * rad[1], c[2] + d[2] * rad[2]];
    const cr = 0.55 + 0.45 * R(), cph = R(), tint = R();
    for (let j = 0; j < per; j++) {
      const u = R() * 2 - 1, a = R() * TAU, sq = Math.sqrt(1 - u * u), rr = cr * (0.35 + 0.65 * Math.cbrt(R()));
      const o: V3 = [Math.cos(a) * sq, u, Math.sin(a) * sq];
      const pos: V3 = [cc[0] + o[0] * rr, cc[1] + o[1] * rr * 0.75, cc[2] + o[2] * rr];
      // crown-outward normal (smooth shading over the mass) with a modest scatter and an upward bias
      const e: V3 = [(pos[0] - c[0]) / rad[0], (pos[1] - c[1]) / rad[1], (pos[2] - c[2]) / rad[2]];
      const el = Math.hypot(...e) || 1;
      const nrm: V3 = [e[0] / el + (R() - 0.5) * 0.7, e[1] / el * 1.15 + 0.08 + (R() - 0.5) * 0.5, e[2] / el + (R() - 0.5) * 0.7];   // underside twigs face DOWN (we see leaves, not edges)
      const depthK = Math.min(1, el), lowK = Math.max(0, Math.min(1, (pos[1] - (c[1] - rad[1])) / (2 * rad[1])));
      const occ = (0.32 + 0.68 * Math.pow(depthK, 2.2)) * (0.72 + 0.28 * lowK);
      out.push({ pos, nrm, size: size * (0.75 + 0.5 * R()), cell: Math.floor(R() * 9), ph: R(), clumpPh: cph, occ, tint });
    }
  }
};
/** 9 twig cards (3 x 3 atlas, 512 px cells) built from the CC0 leaf scan: a thin stem with 13-17 alternate leaves */
const twigAtlas = (leafCv: HTMLCanvasElement) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1536;
  const g = cv.getContext("2d")!, R = rng(91), cell = 1024 / 3;
  for (let v = 0; v < 9; v++) {
    const ox = (v % 3) * 512, oy = Math.floor(v / 3) * 512;
    g.save(); g.beginPath(); g.rect(ox, oy, 512, 512); g.clip();
    const bend = (R() - 0.5) * 120, pts: [number, number][] = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([ox + 256 + bend * t * t, oy + 505 - 440 * t]); }
    g.strokeStyle = "#4a3a22"; g.lineWidth = 5; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    const n = 17 + Math.floor(R() * 6);
    for (let i = 0; i < n; i++) {
      const t = 0.08 + 0.92 * (i / (n - 1)), P = pts[Math.round(t * 20)], side = i % 2 ? 1 : -1;
      const L = (0.7 + 0.3 * R()) * (1 - 0.3 * t) * 225, ang = side * (0.45 + 0.95 * R()) - (0.1 * bend) / 60 + (R() - 0.5) * 0.3, c = Math.floor(R() * 9);
      g.save(); g.translate(P[0], P[1]); g.rotate(ang); g.filter = `brightness(${(0.82 + 0.3 * R()).toFixed(2)}) saturate(${(0.9 + 0.25 * R()).toFixed(2)})`;
      g.drawImage(leafCv, (c % 3) * cell, Math.floor(c / 3) * cell, cell, cell, -L * 0.5, -L, L, L);
      g.restore();
    }
    const T = pts[20], L = 120, c = Math.floor(R() * 9);
    g.save(); g.translate(T[0], T[1]); g.rotate(bend / 400);
    g.drawImage(leafCv, (c % 3) * cell, Math.floor(c / 3) * cell, cell, cell, -L * 0.5, -L * 0.95, L, L); g.restore();
    g.restore();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
};

// ---------------- grass ----------------
const bladeGeo = (() => {
  const seg = 4, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const h = i / seg, w = 0.5 * Math.pow(1 - h, 0.9) + 0.02, bend = 0.22 * h * h;
    pos.push(-w, h, bend, w, h, bend);
  }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // normals point mostly up (a turf reads lit from the sky, not as flat ribbons)
  const n = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) { n.setXYZ(i, n.getX(i) * 0.4, 0.85, n.getZ(i) * 0.4); }
  return g;
})();
type Rect = { x0: number; x1: number; z0: number; z1: number; dens: number; h: [number, number] };
const buildGrass = (rects: Rect[], seed: number) => {
  const R = rng(seed), list: { x: number; z: number; h: number; w: number; yaw: number; col: THREE.Color; ph: number; st: number }[] = [];
  const greens = [lin(0.33, 0.45, 0.16), lin(0.27, 0.40, 0.12), lin(0.40, 0.50, 0.20), lin(0.24, 0.35, 0.13), lin(0.46, 0.50, 0.24)];
  for (const r of rects) {
    const n = Math.round((r.x1 - r.x0) * (r.z1 - r.z0) * r.dens);
    for (let i = 0; i < n; i++) {
      const x = r.x0 + (r.x1 - r.x0) * R(), z = r.z0 + (r.z1 - r.z0) * R();
      const patch = 0.5 + 0.5 * Math.sin(x * 1.3 + Math.sin(z * 0.7) * 2) * Math.sin(z * 1.1 + 0.5);
      const c = greens[Math.floor(R() * greens.length)].clone().multiplyScalar(0.85 + 0.3 * R());
      if (R() < 0.06) c.lerp(lin(0.55, 0.5, 0.28), 0.6);   // a few dry blades
      list.push({ x, z, h: r.h[0] + (r.h[1] - r.h[0]) * R() * (0.75 + 0.5 * patch), w: 0.0045 + 0.004 * R(), yaw: R() * TAU, col: c, ph: R(), st: 0.6 + 0.8 * R() });
    }
  }
  const im = new THREE.InstancedMesh(bladeGeo, grassMaterial(), list.length);
  const aBlade = new Float32Array(list.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((b, i) => {
    q.setFromEuler(e.set(0, b.yaw, 0));
    m4.compose(new THREE.Vector3(b.x, -0.004, b.z), q, new THREE.Vector3(b.w, b.h, b.h));
    im.setMatrixAt(i, m4); im.setColorAt(i, b.col); aBlade[i * 2] = b.ph; aBlade[i * 2 + 1] = b.st;
  });
  im.geometry = bladeGeo.clone();
  im.geometry.setAttribute("aBlade", new THREE.InstancedBufferAttribute(aBlade, 2));
  im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false;
  return im;
};

// ---------------- small canvas textures ----------------
const daisyTex = () => {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  g.translate(64, 64);
  for (let i = 0; i < 16; i++) { g.rotate(TAU / 16); g.beginPath(); g.ellipse(0, -34, 7, 26, 0, 0, TAU); g.fillStyle = i % 2 ? "#f4f1ea" : "#ffffff"; g.fill(); }
  g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fillStyle = "#e8b81c"; g.fill();
  g.beginPath(); g.arc(-3, -3, 7, 0, TAU); g.fillStyle = "#f6cf3a"; g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const clockTex = () => {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d")!;
  g.fillStyle = "#e9e4d6"; g.beginPath(); g.arc(256, 256, 250, 0, TAU); g.fill();
  g.strokeStyle = "#2a2a2a"; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 236, 0, TAU); g.stroke();
  for (let i = 0; i < 12; i++) { g.save(); g.translate(256, 256); g.rotate((i / 12) * TAU); g.fillStyle = "#222"; g.fillRect(-7, -222, 14, 44); g.restore(); }
  const hand = (a: number, L: number, w: number) => { g.save(); g.translate(256, 256); g.rotate(a); g.fillStyle = "#151515"; g.fillRect(-w / 2, -L, w, L + 20); g.restore(); };
  hand(((5 + 22 / 60) / 12) * TAU, 130, 16); hand((22 / 60) * TAU, 195, 10);   // 5:22 pm, late afternoon
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

// ================================================================ THE WORLD
export type World = {
  scene: THREE.Scene; sun: THREE.DirectionalLight; sunCard: THREE.DirectionalLight; sunCol: THREE.Color; sky: Sky;
  update: (t: number, cam: THREE.PerspectiveCamera) => void; motes: { U: { pxScale: { value: number } } };
};
export const buildWorld = async (gl: THREE.WebGLRenderer, dbg = 0, leaf = "twig"): Promise<World> => {
  const TWIG = leaf === "twig";
  const [sky, brick, lawn, bark, wall, planks, plaster, leafC, leafO, lamp] = await Promise.all([
    loadSky(gl), loadPBR("brick_pavement", "2k", [1.2, 42]), loadPBR("leafy_grass", "2k", [120, 120]), loadPBR("bark_brown_02", "1k", [1, 2.5]),
    loadPBR("red_brick", "1k", [1, 1]), loadPBR("weathered_planks", "1k", [1, 1]), loadPBR("plastered_stone_wall", "1k", [1, 1]),
    loadImg("lookpilot/leafset024/LeafSet024_1K-JPG_Color.jpg"), loadImg("lookpilot/leafset024/LeafSet024_1K-JPG_Opacity.jpg"),
    new GLTFLoader().loadAsync(staticFile("lookpilot/street_lamp_01/street_lamp_01_1k.gltf")),
  ]);
  const scene = new THREE.Scene();
  const L = new THREE.Vector3(...sunDir());
  // ---- sky + IBL: rotate the HDRI so its sun sits at our sun's azimuth ----
  const myAz = Math.atan2(L.z, L.x);
  const rotY = myAz - sky.sunAz;
  scene.background = sky.bg; scene.environment = sky.env;
  scene.backgroundRotation.set(0, rotY, 0); scene.environmentRotation.set(0, rotY, 0);
  const envK = 0.33 / Math.max(sky.meanSky, 1e-3);
  scene.environmentIntensity = envK; scene.backgroundIntensity = envK * 1.05;
  // ---- the sun: warm, low; PCSS (radius > 50 = PCSS with K = radius - 50) ----
  const sunCol = lin(1.0, 0.86, 0.69);
  const SUN_I = 7.2;
  const mkSun = (size: number, intensity: number, ext: number, diamDeg = 0.62) => {
    const s = new THREE.DirectionalLight(sunCol, intensity);
    s.castShadow = true; s.shadow.mapSize.set(size, size);
    const c = s.shadow.camera; c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 0.5; c.far = 95;
    const tex = size / (2 * ext), sunDiam = diamDeg * Math.PI / 180;
    s.shadow.radius = 50 + (c.far - c.near) * sunDiam * tex;
    s.shadow.bias = -0.00025; s.shadow.normalBias = 0.015;
    s.target.position.set(-1.5, 0, -10); s.position.copy(s.target.position).addScaledVector(L, 48);
    scene.add(s, s.target);
    return s;
  };
  const sun = mkSun(4096, SUN_I, 25);
  const sunCard = mkSun(4096, 0.0, 25, 0.45);   // a slightly smaller sun for the card: crisper leaf flecks on him               // casts no light: only its shadow map (world without the character) lights the card
  Card.exclude = sunCard.shadow.camera;
  // ---- haze ----
  const hz = sky.horizon.clone().multiplyScalar(envK * 1.0);
  scene.fog = new THREE.FogExp2(hz, 0.0068);

  const root = new THREE.Group(); scene.add(root);
  const R = rng(7);

  // ---- the ground: lawn everywhere, the brick path, the cross path ----
  const lawnM = pbrMat(lawn, { color: lin(0.86, 0.94, 0.78), normalScale: new THREE.Vector2(0.8, 0.8) });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), lawnM); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.012, -60);
  ground.receiveShadow = true; root.add(ground);
  // the path: worn red pavers, moss / weeds in the joints (AO-darkened joints get a mossy green, broken up by noise)
  const brickM = pbrMat(brick, { color: lin(0.96, 0.92, 0.9), normalScale: new THREE.Vector2(1.1, 1.1) });
  brickM.onBeforeCompile = ((prev) => (sh: THREE.WebGLProgramParametersWithUniforms, r: THREE.WebGLRenderer) => {
    prev(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", /* glsl */ `#include <map_fragment>
#ifdef USE_AOMAP
{
  float jo = texture2D( aoMap, vAoMapUv ).r;
  vec2 q = vMapUv * vec2( 7.0, 7.0 );
  float nz = fract( sin( dot( floor( q ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
  float nz2 = fract( sin( dot( floor( q * 0.37 ), vec2( 39.3, 11.7 ) ) ) * 9631.17 );
  float moss = ( 1.0 - smoothstep( 0.62, 0.86, jo ) ) * smoothstep( 0.35, 0.8, nz2 ) * ( 0.55 + 0.45 * nz );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.09, 0.11, 0.045 ), moss * 0.5 );
}
#endif`);
  })(brickM.onBeforeCompile);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 84), brickM); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.0, -33); path.receiveShadow = true; root.add(path);
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(26, 2.2), pbrMat(cloneRep(brick, [13, 1.1]), { color: lin(0.96, 0.92, 0.9) }));
  cross.rotation.x = -Math.PI / 2; cross.position.set(0, -0.002, CROSS_Z); cross.receiveShadow = true; root.add(cross);
  // low concrete kerbs along both path edges (a real edge where the lawn meets the pavers)
  const kerbM = pbrMat(cloneRep(plaster, [40, 0.1]), { color: lin(0.74, 0.72, 0.68) });
  for (const x of [-1.24, 1.24]) {
    for (const [z0, z1] of [[9, CROSS_Z + 1.1], [CROSS_Z - 1.1, -75]] as [number, number][]) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, z0 - z1), kerbM); k.position.set(x, 0.012, (z0 + z1) / 2); k.receiveShadow = true; k.castShadow = true; root.add(k);
    }
  }

  // ---- grass: dense near the lens, thinner far; tufts on the kerb lines ----
  const grass = buildGrass([
    { x0: 1.3, x1: 4.6, z0: -16, z1: 7.5, dens: 950, h: [0.05, 0.13] },
    { x0: 4.6, x1: 9.5, z0: -16, z1: 7.5, dens: 380, h: [0.05, 0.12] },
    { x0: 1.3, x1: 9.5, z0: -48, z1: -16, dens: 230, h: [0.06, 0.13] },
    { x0: -1.42, x1: -1.29, z0: -48, z1: 7.5, dens: 700, h: [0.05, 0.14] },
    { x0: -12, x1: 12, z0: CROSS_Z + 1.12, z1: CROSS_Z + 1.5, dens: 400, h: [0.05, 0.12] },
    { x0: -1.2, x1: -1.0, z0: -30, z1: 6, dens: 26, h: [0.03, 0.08] },
    { x0: 1.0, x1: 1.2, z0: -30, z1: 6, dens: 26, h: [0.03, 0.08] },
  ], 11);
  root.add(grass);
  // daisies over the near lawn
  {
    const dt = daisyTex(), n = 1300, im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), seeded(new THREE.MeshStandardMaterial({ map: dt, alphaTest: 0.5, roughness: 0.7, side: THREE.DoubleSide })), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const x = 1.35 + 6 * Math.pow(R(), 1.4), z = -22 + 29 * R(), s = 0.022 + 0.014 * R();
      q.setFromEuler(e.set(-Math.PI / 2 + (R() - 0.5) * 0.9, R() * TAU, 0, "YXZ"));
      m4.compose(new THREE.Vector3(x, 0.05 + 0.06 * R(), z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4);
    }
    im.receiveShadow = true; im.frustumCulled = false; root.add(im);
  }

  // ---- the leaf atlas (colour + opacity -> RGBA) ----
  const lc = document.createElement("canvas"); lc.width = lc.height = 1024;
  {
    const g = lc.getContext("2d")!; g.drawImage(leafC, 0, 0, 1024, 1024);
    const od = document.createElement("canvas"); od.width = od.height = 1024; const og = od.getContext("2d")!; og.drawImage(leafO, 0, 0, 1024, 1024);
    const a = g.getImageData(0, 0, 1024, 1024), o = og.getImageData(0, 0, 1024, 1024);
    for (let i = 0; i < a.data.length; i += 4) a.data[i + 3] = o.data[i];
    g.putImageData(a, 0, 0);
  }
  const leafTex = new THREE.CanvasTexture(lc); leafTex.colorSpace = THREE.SRGBColorSpace; leafTex.anisotropy = 8; leafTex.flipY = true;
  const leafDepth = leafDepthMaterial(leafTex);
  const twigTex = twigAtlas(lc), twigDepth = leafDepthMaterial(twigTex);

  // ---- trees: left row (the sun side: their canopies throw the dapple over the path), right row (backlit framing) ----
  const barkM = pbrMat(bark, { color: lin(0.8, 0.78, 0.74) });
  const canopyLeaves: LeafSpec[] = [];
  type Tree = { x: number; z: number; h: number; c: V3; rad: V3; clumps: number; per: number; loose?: number; holes?: { c: V3; r: number }[] };
  // left row: trunks behind the hedge, wide canopies reaching over the path (overhead in the top of frame); their far-left
  // (sun-side) halves throw the dapple onto the path under this low sun. Right row: backlit, framing the right edge.
  const TREES: Tree[] = [
    { x: -6.2, z: -13.9, h: 4.4, c: [-4.4, 7.7, -13.6], rad: [4.8, 2.5, 4.0], clumps: 115, per: 140 },
    { x: -5.8, z: -3.0, h: 4.2, c: [-4.0, 7.6, -2.8], rad: [4.6, 2.4, 4.0], clumps: 110, per: 140 },
    { x: -6.4, z: -21.5, h: 4.6, c: [-4.6, 7.8, -21.2], rad: [4.8, 2.6, 4.2], clumps: 110, per: 130 },
    { x: -6.0, z: -30.5, h: 4.5, c: [-4.4, 7.0, -30.2], rad: [4.6, 2.9, 4.0], clumps: 95, per: 120 },
    { x: -6.3, z: -39.5, h: 4.6, c: [-4.6, 7.1, -39.2], rad: [4.6, 2.9, 4.0], clumps: 85, per: 110 },
    { x: -5.9, z: 6.5, h: 4.2, c: [-4.1, 7.5, 6.6], rad: [4.6, 2.4, 4.0], clumps: 95, per: 130 },
    { x: 5.6, z: -8.0, h: 4.2, c: [4.4, 6.6, -8.0], rad: [3.9, 2.6, 3.8], clumps: 85, per: 120 },
    { x: 6.2, z: -20.0, h: 4.5, c: [5.0, 6.9, -20.0], rad: [4.0, 2.7, 3.8], clumps: 80, per: 115 },
    { x: 5.9, z: -32.5, h: 4.4, c: [4.8, 6.7, -32.5], rad: [3.9, 2.6, 3.7], clumps: 70, per: 105 },
    { x: 5.4, z: 3.5, h: 4.0, c: [4.3, 6.4, 3.5], rad: [3.8, 2.5, 3.6], clumps: 75, per: 115 },
    // far-left row (mostly out of frame): under this low side sun THEIR leaves throw the dapple across the path; the
    // spacing between z -8 and -2.5 is the sun patch he walks into at ~2.3 s
    { x: -9.6, z: -16.4, h: 4.2, c: [-8.6, 6.9, -16.3], rad: [3.6, 3.0, 4.1], clumps: 190, per: 55, loose: 1 },
    { x: -9.5, z: 2.6, h: 4.0, c: [-8.5, 6.7, 2.4], rad: [3.5, 2.9, 3.8], clumps: 170, per: 55, loose: 1 },
    { x: -9.8, z: -25.0, h: 4.4, c: [-8.8, 7.0, -25.0], rad: [3.6, 3.0, 4.1], clumps: 150, per: 55, loose: 1 },
  ];

  // the GAP over the sun patch he walks into (ground z ~ -2.6 .. +1.2 under this sun): thin the left canopies there
  for (const T of TREES) {
    const curve = (y: number) => 0.06 * Math.sin(y * 0.9 + T.z);
    const trunkG = new THREE.CylinderGeometry(0.15, 0.27, T.h + 1.2, 14, 10, false);
    const tp = trunkG.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < tp.count; i++) { const y = tp.getY(i) + (T.h + 1.2) / 2; tp.setX(i, tp.getX(i) + curve(y) * y + (T.c[0] - T.x) * 0.12 * (y / T.h) ** 2); }
    trunkG.computeVertexNormals();
    const trunk = new THREE.Mesh(trunkG, barkM); trunk.position.set(T.x, (T.h + 1.2) / 2 - 0.1, T.z); trunk.castShadow = true; trunk.receiveShadow = true; root.add(trunk);
    // main limbs toward the canopy shell
    const nb = 5;
    for (let b = 0; b < nb; b++) {
      const a = (b / nb) * TAU + R() * 0.8, top = new THREE.Vector3(T.x + (T.c[0] - T.x) * 0.15, T.h + 0.7, T.z);
      const end = new THREE.Vector3(T.c[0] + Math.cos(a) * T.rad[0] * 0.62, T.c[1] + (R() - 0.2) * T.rad[1] * 0.5, T.c[2] + Math.sin(a) * T.rad[2] * 0.62);
      const len = top.distanceTo(end), g = new THREE.CylinderGeometry(0.035, 0.11, len, 8, 1); g.translate(0, len / 2, 0);
      const limb = new THREE.Mesh(g, barkM); limb.position.copy(top);
      limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(top).normalize());
      limb.castShadow = true; limb.receiveShadow = true; root.add(limb);
    }
    // the GAP that makes the sun patch he walks into (ground z ~ -2.6 .. +1 under this sun comes through x -10..-6, z -11..-4)
    const holes: { c: V3; r: number }[] = [];
    if (TWIG) canopy(canopyLeaves, R, T.c, T.rad, T.clumps, Math.max(6, Math.round(T.per * (T.loose ? 0.26 : 0.34))), T.loose ? 0.6 : 0.68, holes);
    else canopy(canopyLeaves, R, T.c, T.rad, T.clumps, Math.round(T.per * (T.loose ? 1.25 : 1.15)), T.loose ? 0.23 : 0.25, holes);
  }
  const leafM = leafMaterial(TWIG ? twigTex : leafTex, lin(0.86, 0.95, 0.78), 0.95);
  root.add(buildLeaves(canopyLeaves, leafM, TWIG ? twigDepth : leafDepth));

  // ---- the hedge (left of the path, broken by the cross path) ----
  {
    const hedgeLeaves: LeafSpec[] = [], inner = seeded(new THREE.MeshStandardMaterial({ color: lin(0.07, 0.11, 0.05), roughness: 1 }));
    for (const [z0, z1] of [[9, CROSS_Z + 1.3], [CROSS_Z - 1.3, -72]] as [number, number][]) {
      const len = z0 - z1, cz = (z0 + z1) / 2;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, len), inner); box.position.set(-1.78, 0.45, cz); box.castShadow = true; box.receiveShadow = true; root.add(box);
      const area = len * (0.95 + 0.75 + 0.3), n = Math.round(area * 430);
      for (let i = 0; i < n; i++) {
        const f = R(), z = z1 + len * R();
        let pos: V3, nrm: V3;
        if (f < 0.5) { const y = 0.02 + 0.92 * Math.pow(R(), 0.8); pos = [-1.43 + 0.05 * R() - 0.02 * Math.sin(y * 3), y, z]; nrm = [1, (R() - 0.3) * 1.2, (R() - 0.5) * 1.4]; }
        else if (f < 0.88) { const x = -2.13 + 0.7 * R(); pos = [x, 0.9 + 0.05 * R() - 0.06 * Math.pow((x + 1.78) / 0.35, 2), z]; nrm = [(x + 1.78) * 1.5 + (R() - 0.5), 1, (R() - 0.5) * 1.2]; }
        else { const y = 0.05 + 0.85 * R(); pos = [-2.13 - 0.05 * R(), y, z]; nrm = [-1, (R() - 0.3), (R() - 0.5) * 1.4]; }
        hedgeLeaves.push({ pos, nrm, size: 0.06 + 0.035 * R(), cell: Math.floor(R() * 9), ph: R(), clumpPh: R() * 0.2 });
      }
    }
    const hedgeM = leafMaterial(leafTex, lin(0.46, 0.62, 0.36), 0.45);
    const hl = buildLeaves(hedgeLeaves, hedgeM, leafDepth); root.add(hl);
  }

  // ---- the lamp post (Poly Haven street_lamp_01) on the lawn edge ----
  for (const z of [-7.4, -27.0]) {
    const l = lamp.scene.clone(true); l.position.set(1.62, 0, z); l.rotation.y = -Math.PI / 2;
    l.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; seeded(m.material as THREE.Material); } });
    root.add(l);
  }
  // ---- the bench (weathered planks on cast-iron sides) ----
  {
    const b = new THREE.Group(), wood = pbrMat(cloneRep(planks, [1.5, 0.25]), { color: lin(0.78, 0.7, 0.62) });
    const iron = seeded(new THREE.MeshStandardMaterial({ color: lin(0.05, 0.06, 0.05), roughness: 0.5, metalness: 0.75 }));
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.035, 0.085), wood); s.position.set(0, 0.45, -0.17 + i * 0.105); b.add(s); }
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.085, 0.03), wood); s.position.set(0, 0.6 + i * 0.12, -0.24 - i * 0.025); s.rotation.x = -0.18; b.add(s); }
    for (const x of [-0.72, 0.72]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.06), iron); leg.position.set(x, 0.225, 0.14); b.add(leg);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.06), iron); leg2.position.set(x, 0.47, -0.24); leg2.rotation.x = -0.16; b.add(leg2);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.5), iron); arm.position.set(x, 0.66, -0.02); b.add(arm);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.46), iron); rail.position.set(x, 0.42, -0.03); b.add(rail);
    }
    b.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    b.position.set(2.1, 0, -3.6); b.rotation.y = -Math.PI / 2; root.add(b);
  }

  // ---- the brick building and the clock tower, soft in the haze at the end of the path ----
  {
    const bw = pbrMat(cloneRep(wall, [14, 6]), { color: lin(0.92, 0.86, 0.82) });
    const trim = pbrMat(cloneRep(plaster, [8, 0.4]), { color: lin(0.86, 0.84, 0.8) });
    const glass = seeded(new THREE.MeshStandardMaterial({ color: lin(0.05, 0.06, 0.07), roughness: 0.08, metalness: 0.0, envMapIntensity: 1.4 }));
    const slate = seeded(new THREE.MeshStandardMaterial({ color: lin(0.22, 0.24, 0.27), roughness: 0.75 }));
    const B = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(34, 13, 12), bw); body.position.set(-6, 6.5, -82); B.add(body);
    const corn = new THREE.Mesh(new THREE.BoxGeometry(34.6, 0.7, 12.6), trim); corn.position.set(-6, 13.2, -82); B.add(corn);
    const base = new THREE.Mesh(new THREE.BoxGeometry(34.3, 1.0, 12.3), trim); base.position.set(-6, 0.5, -82); B.add(base);
    const roofG = new THREE.CylinderGeometry(0.01, 7.6, 4.2, 4, 1); roofG.rotateY(Math.PI / 4); roofG.scale(34.6 / 10.7, 1, 12.6 / 10.7);
    const roof = new THREE.Mesh(roofG, slate); roof.position.set(-6, 15.6, -82); B.add(roof);
    for (let fl = 0; fl < 3; fl++) for (let i = 0; i < 11; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), glass); w.position.set(-21 + i * 3.0, 2.6 + fl * 3.6, -75.94); B.add(w);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.2), trim); sill.position.set(w.position.x, w.position.y - 1.08, -75.9); B.add(sill);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 0.14), trim); head.position.set(w.position.x, w.position.y + 1.1, -75.93); B.add(head);
    }
    // the clock tower
    const tw = pbrMat(cloneRep(wall, [3, 12]), { color: lin(0.9, 0.84, 0.8) });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(6, 26, 6), tw); shaft.position.set(9.5, 13, -86); B.add(shaft);
    const bel = new THREE.Mesh(new THREE.BoxGeometry(6.6, 5.2, 6.6), trim); bel.position.set(9.5, 28.6, -86); B.add(bel);
    const face = new THREE.Mesh(new THREE.CircleGeometry(2.0, 48), seeded(new THREE.MeshStandardMaterial({ map: clockTex(), roughness: 0.5 }))); face.position.set(9.5, 28.6, -82.68); B.add(face);
    const tr = new THREE.CylinderGeometry(0.01, 5.0, 7.5, 4, 1); tr.rotateY(Math.PI / 4);
    const troof = new THREE.Mesh(tr, seeded(new THREE.MeshStandardMaterial({ color: lin(0.3, 0.42, 0.38), roughness: 0.55, metalness: 0.3 }))); troof.position.set(9.5, 35.0, -86); B.add(troof);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.5, 6.9), trim); cap.position.set(9.5, 31.3, -86); B.add(cap);
    B.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.receiveShadow = true; } });
    root.add(B);
    // far trees round the building (big leaves: they only need a soft leafy mass in the haze)
    const far: LeafSpec[] = [];
    for (const c of [[-28, 7, -78], [-36, 8, -90], [24, 7.5, -80], [32, 8, -92], [18, 6.5, -70], [-20, 6.5, -68]] as V3[]) canopy(far, R, c, [5, 4, 5], 60, 14, 1.2);
    const farM = leafMaterial(twigTex, lin(0.7, 0.8, 0.62), 0.6);
    root.add(buildLeaves(far, farM, twigDepth, false));
    for (const c of [[-28, 0, -78], [-36, 0, -90], [24, 0, -80], [32, 0, -92], [18, 0, -70], [-20, 0, -68]] as V3[]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 4.5, 8), barkM); t.position.set(c[0], 2.2, c[2]); root.add(t);
    }
  }

  // ---- the phone guy, the cyclist, the pigeons (cards) ----
  const hero = new Card(1.5, root);
  const cardLight = (U: CardU) => { U.uAmb.value.setRGB(0.25, 0.27, 0.31); U.uSun.value.copy(sunCol); U.uSunK.value = 0.95; U.uSide.value = -1; U.uDbg.value = dbg; };
  const cyc = new Card(1.0, root);
  const pigs = PIGEONS.map(() => new Card(0.5, root));
  [hero, cyc, ...pigs].forEach((k) => cardLight(k.U));
  // the contact shadow under his feet (soft multiply blob)
  const blobC = document.createElement("canvas"); blobC.width = 128; blobC.height = 64;
  { const g = blobC.getContext("2d")!, gr = g.createRadialGradient(64, 32, 0, 64, 32, 62); gr.addColorStop(0, "rgba(0,0,0,0.62)"); gr.addColorStop(0.55, "rgba(0,0,0,0.3)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.setTransform(1, 0, 0, 0.5, 0, 16); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const blobT = new THREE.CanvasTexture(blobC);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor, color: 0x000000 }));
  blob.rotation.x = -Math.PI / 2; blob.renderOrder = 0.5; root.add(blob);

  // ---- dust / pollen motes in the sun ----
  const NM = 2600, mp = new Float32Array(NM * 3), ma = new Float32Array(NM * 4);
  for (let i = 0; i < NM; i++) { mp.set([-3.2 + 6.4 * R(), 0.15 + 3.6 * Math.pow(R(), 1.3), -14 + 18 * R()], i * 3); ma.set([R(), R(), R(), R()], i * 4); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mp, 3)); mg.setAttribute("aMote", new THREE.BufferAttribute(ma, 4));
  const motes = moteMaterial(() => (sun.shadow.map ? sun.shadow.map.texture : null), sun.shadow.matrix);
  const pts = new THREE.Points(mg, motes.m); pts.frustumCulled = false; pts.renderOrder = 3; root.add(pts);

  const sunYaw = Math.atan2(-L.x, -L.z);
  const camV = new THREE.Vector3();
  const update = (t: number, cam: THREE.PerspectiveCamera) => {
    WIND_T.value = t + 3.0;
    camV.copy(cam.position);
    const f = t * 30;
    // ---- the phone guy: walking toward the lens, chatting, gesturing with the free hand ----
    const p = charPos(t), p2 = charPos(t + 0.05), hd = new THREE.Vector3(p2[0] - p[0], 0, p2[2] - p[2]).normalize();
    const d = new THREE.Vector3(camV.x - p[0], 0, camV.z - p[2]).normalize();
    const c = hd.dot(d), s = hd.x * d.z - hd.z * d.x;
    const ch = PPL.phoneChat(f, 5);
    const P: PPL.Pose = { s: -s, c, walk: PPL.walkPhase(charMetres(t), "phone"), go: 1, gait: "phone", expr: ch.laughing ? "laughBig" : "bright", mouth: ch.mouth, nod: ch.nod,
      blink: PPL.blinkAt(f, 5), look: 0.15 * Math.sin(t * 0.8), lookY: 0.05, light: (-140 * Math.PI) / 180, seed: 1, handK: 1.05,
      armR: PPL.phoneArm(PPL.C.phoneRed), armL: PPL.talkHand(f, 5, ch.talking) };
    hero.draw(JSON.stringify(P), (pen) => PPL.drawPhoneGuy(pen, P));
    hero.place(p, camV, sunYaw);
    blob.position.set(p[0], 0.004, p[2] + 0.03);
    // ---- the cyclist on the cross path ----
    const cy = cyclistAt(t);
    cyc.mesh.visible = cyc.proxy.visible = cy.on;
    if (cy.on) {
      const pos: V3 = [cy.x, 0, CROSS_Z - 0.2];
      const dd = new THREE.Vector3(camV.x - pos[0], 0, camV.z - pos[2]).normalize(), hh = new THREE.Vector3(-1, 0, 0);
      const CP = { ...CROWD.crowdPose("cyclist", f, { s: -(hh.x * dd.z - hh.z * dd.x), c: hh.dot(dd), metres: cy.metres }), light: (-140 * Math.PI) / 180 };
      cyc.draw(JSON.stringify(CP), (pen) => CROWD.drawCrowd(pen, "cyclist", CP));
      cyc.place(pos, camV, sunYaw);
    }
    // ---- pigeons: peck, then flutter up and away as he nears ----
    PIGEONS.forEach((g, i) => {
      const k = pigs[i], tu = t - g.tUp;
      const up = Math.max(0, tu);
      const pos: V3 = [g.x + g.dir[0] * up * (0.6 + up), Math.max(0, g.dir[1] * up * (1.2 + 0.8 * up) - 0.05 * Math.max(0, -tu)), g.z + g.dir[2] * up * (0.6 + up)];
      const st: FX.PigeonSt = tu < 0 ? { run: 0, flap: 0, wing: 0, peck: Math.max(0, Math.sin(t * 5 + g.seed * 2)) ** 3, lift: 0 }
        : { run: tu * 6, flap: Math.min(1, tu * 6), wing: tu * 7.5, peck: 0, lift: Math.min(1, tu * 4) };
      k.mesh.visible = k.proxy.visible = pos[1] < 6;
      k.draw(JSON.stringify(st) + i, (pen) => FX.drawPigeon(pen, st));
      k.place(pos, camV, sunYaw, 0.34, (g.face > 0) !== (tu > 0 && g.dir[0] > 0));
    });
  };
  return { scene, sun, sunCard, sunCol, sky, update, motes };
};
export { camAt };

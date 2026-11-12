// The whole film as one three.js scene: sky, sun, fog, clouds + every set (exterior badlands/trails in
// sets_ext.ts, the three interiors in sets_int.ts) + the cast (cast.ts). update(id, f, camera, scene) poses
// everything for shot `id` at frame f (a pure function of id + f).
//
// CROSSFADE LIGHT FIX (template bug): during a dissolve two canvases each own a World, but the two-tone (TONE) and
// card (CHAR) uniforms are module singletons shared by every material. The template wrote them in update(), so the
// layer that updated last lit BOTH canvases. Now update() only stores this World's light state and the scene's
// onBeforeRender writes it into the shared uniforms right before THIS scene is drawn (and the ink pass's normal
// render of the same scene triggers the same hook), so each layer renders with its own shot's light.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Kit, V } from "./build";
import { ctex, cloudSoft } from "./paint";
import { LightState } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { Exterior } from "./sets_ext";
import { Interiors } from "./sets_int";
import { FPS, SHOTS, TOTAL, camAt, lightAt, ShotDef } from "./story";

// ---------------- assets ----------------
const KENNEY = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree_cone", "tree-high-round", "tree", "plant_bushLarge", "plant_bushDetailed",
  "plant_bush", "hedge", "flower_redA", "flower_yellowA", "flower_purpleA", "grass_large", "grass", "lily_large", "lantern", "cart", "stall-red",
  "stall-green", "stall-bench", "banner-red", "banner-green", "windmill", "canoe"];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(`bridge/kenney/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

/** sun disc (solid, soft rim) and the flat golden halo */
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

/** the TONE / CHAR values one World wants on screen (copied into the shared uniforms in scene.onBeforeRender) */
type Snap = { lit: THREE.Vector3; shade: THREE.Vector3; lift: THREE.Vector3; lambert: number; sideK: number; term: number; bounce: THREE.Vector3; sat: number;
  charTint: THREE.Vector3; charShade: number; grad: number; bodyGrad: number; sideTint: THREE.Vector3 };
const newSnap = (): Snap => ({ lit: new THREE.Vector3(), shade: new THREE.Vector3(), lift: new THREE.Vector3(), lambert: 0, sideK: 0, term: 0, bounce: new THREE.Vector3(), sat: 1,
  charTint: new THREE.Vector3(), charShade: 0, grad: 0, bodyGrad: 0, sideTint: new THREE.Vector3() });

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 40, 520);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, [number, number]>();
  private clouds: THREE.Mesh[] = [];
  private cloudBase: THREE.Vector3[] = [];
  private cloudTex = new Map<string, THREE.Texture[]>();
  private ext: Exterior; private int: Interiors;
  private snap = newSnap();
  private hooked: THREE.Scene | null = null;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    // big puffy clouds ringing the desert (lavender undersides by day); textures follow the light state
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.3 - (i === 7 ? 0.12 : 0), d = 560 + (i % 3) * 70; // cloud 7 nudged fully outside the P0 frame (no edge cut on the loop frame)
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.1, 1.1, 1.1) }));
      const w = 150 + (i % 4) * 40;
      m.position.set(Math.cos(a) * d, i === 8 ? 40 : 95 + (i % 4) * 34, Math.sin(a) * d); /* cloud 8 hides behind the mesas (WORLD-EXT A5: the 'two suns') */ m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); this.cloudBase.push(m.position.clone()); R.add(m);
    }
    this.ext = new Exterior(R, kit);
    this.int = new Interiors(R);
  }

  private cloudMaps(c: { lit: string; mid: string; shade: string }) {
    const k = `${c.lit}|${c.mid}|${c.shade}`;
    let t = this.cloudTex.get(k);
    if (!t) { t = [0, 1, 2, 3].map((s) => cloudSoft(s, c)); /* no lavender halo ring (WORLD-EXT A3) */ this.cloudTex.set(k, t); }
    return t;
  }

  /** camera-relative sun: the shot's mean view direction (cached per shot) turned by az toward screen right, lifted by el */
  private sunDir(id: number, s: ShotDef, az: number, el: number): THREE.Vector3 {
    // loop seam (WORLD-EXT A4): the last shot lights EXACTLY like shot 1, so the shadow-map texels match at the seam
    if (id === 16) return this.sunDir(1, SHOTS[0], az, el);
    let fw = this.sunCache.get(id);
    if (!fw) {
      let fx = 0, fz = 0;
      for (let f = s.a; f < s.b; f += 3) {
        const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
        fx += x / n; fz += z / n;
      }
      const n = Math.hypot(fx, fz) || 1; fw = [fx / n, fz / n];
      this.sunCache.set(id, fw);
    }
    const [fx, fz] = fw, A = THREE.MathUtils.degToRad(s.sunAz ?? az), E = THREE.MathUtils.degToRad(s.sunEl ?? el);
    const hx = fx * Math.cos(A) - fz * Math.sin(A), hz = fz * Math.cos(A) + fx * Math.sin(A);
    return new THREE.Vector3(hx * Math.cos(E), Math.sin(E), hz * Math.cos(E)).normalize();
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private storeLight(L: LightState) {
    const S = this.snap;
    S.lit.set(...L.lit); S.shade.set(...L.shade); S.lift.set(...L.lift); S.lambert = L.lambert; S.sideK = L.sideK; S.term = L.term;
    S.bounce.set(...L.look.bounce); S.sat = L.look.sat;
    S.charTint.set(...L.charTint); S.charShade = L.charShade; S.grad = L.charGrad; S.bodyGrad = L.bodyGrad; S.sideTint.set(...L.sideTint);
  }
  private applyLight = () => {
    const S = this.snap;
    TONE.uLitCol.value.copy(S.lit); TONE.uShadeCol.value.copy(S.shade); TONE.uShadeLift.value.copy(S.lift);
    TONE.uLambert.value = S.lambert; TONE.uSideK.value = S.sideK; TONE.uTerm.value = S.term; TONE.uBounce.value.copy(S.bounce); TONE.uSat.value = S.sat;
    CHAR.uCharTint.value.copy(S.charTint); CHAR.uCharShade.value = S.charShade; CHAR.uGrad.value = S.grad;
    CHAR.uBodyGrad.value = S.bodyGrad; CHAR.uSideTint.value.copy(S.sideTint);
  };

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, vf: number = f) {
    const t = f / FPS, s = SHOTS[id - 1], L = lightAt(id, f);
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig: camera-relative sun, shadow fit, per-World uniforms (see the crossfade fix above) ----
    // interiors: a world-fixed window / desk-lamp key (lights.ts `key`); exteriors: the camera-relative sun
    const sunDir = L.key ? new THREE.Vector3(...L.key).normalize() : this.sunDir(id, s, L.az, L.el);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (L.el < 15) Rr = Math.max(Rr, 30); // low sun: long shadows
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.storeLight(L);
    if (this.hooked !== scene) { scene.onBeforeRender = this.applyLight; this.hooked = scene; }
    this.applyLight(); // also right now, for anything that reads the uniforms during update
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    L.look.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = L.look.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = this.sunHalo.visible = L.showSun;
    if (L.showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    const cm = this.cloudMaps(L.look.cloud);
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.visible = !(L.name === "dusk" && (i === 7 || i === 8)); /* no peach discs at dusk (WORLD-EXT A5) */
      // slow drift in whole cycles over the film, so the last frame flows into frame 0 (loop)
      const ph = (2 * Math.PI * f) / TOTAL + i * 1.7, b0 = this.cloudBase[i];
      m.position.set(b0.x + 14 * Math.sin(ph), b0.y + 2 * Math.sin(2 * ph), b0.z + 10 * Math.cos(ph));
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      if (mat.map !== cm[i % 4]) { mat.map = cm[i % 4]; mat.needsUpdate = true; }
    }
    // ---- sets ----
    const ctx = { id, f, vf, t, shot: s, cam, light: L, sunDir };
    this.ext.pose(ctx);
    this.int.pose(ctx);
    // ---- cast + effect cards ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir }, L, vf);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5 * sc2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const fxm = this.fx(fi++);
      fxm.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      fxm.use(!!p.soft);
      fxm.mesh.visible = true;
      fxm.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) fxm.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else if (p.yaw !== undefined) fxm.mesh.rotation.set(0, p.yaw, p.rot ?? 0);
      else { fxm.mesh.quaternion.copy(cam.quaternion); fxm.mesh.rotateZ(p.rot ?? 0); }
      fxm.mesh.scale.set(p.w, p.h, 1);
      fused.push(fxm);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const fe of fused) fe.bind();
    return focus;
  }
}

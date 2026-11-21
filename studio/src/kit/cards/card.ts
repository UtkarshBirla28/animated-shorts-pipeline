// KIT / CARDS: card() = any canvas-drawn character as a lit card inside the real light (owner CARDS). See NOTES.md.
//
//   const hero = await card(ctx, { draw: (c2d, t, w, h, info) => ..., px: 1500, heightM: 1.57, pos: (t) => [x, 0, z] });
//   set.add(hero.object); ... hero.update(t, cam) every sub-frame (the set's Built.update calls its children)
//
// The drawing is redrawn when `key(t, info)` changes (default: every call), the form field is re-derived from its alpha
// (two canvas blurs into small textures), the card turns to the lens (face "camera", default) or to yaw(t) (face "yaw").
// Shadows: proxies per shadow light + contact / AO blobs (shadow.ts). Grass at the feet (grass.ts) with onGrass.
// LOD: beyond lodM from the lens the card drops its proxies and reads the scene sun's own shadow map (no private pass).
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";
import { CardLight, makeCardMaterial, type CardLook, type CardMatU } from "./cardlight";
import { cardShadow, type FootPt } from "./shadow";
import { footGrass, type FootGrassOpts } from "./grass";

export type CardDrawInfo = {
  cam: THREE.Camera;
  /** heading vs the lens: s = sideways part (+ = toward screen right), c = toward-the-lens part (+ = approaching) */
  s: number; c: number;
  /** heading angle (world yaw, atan2(dx, dz)) and the ground point */
  heading: number; pos: V3;
  /** distance to the lens (m) */
  dist: number;
  /** canvas angle the key light comes from (cast Pose.light): atan2(screen down, screen right), snapped to 45 deg */
  lightAng: number;
  t: number;
};
export type CardOpts = {
  draw: (c2d: CanvasRenderingContext2D, t: number, w: number, h: number, info: CardDrawInfo) => void;
  /** canvas height in pixels */
  px: number;
  /** the figure's real height, sole to crown (m); with crownY / soleY it sets the card's size */
  heightM: number;
  /** canvas width / height (default 0.6, the cast's 600 x 1000 card) */
  aspect?: number;
  /** canvas fractions from the TOP where the crown and the soles are (defaults 0.025 / 0.975) */
  crownY?: number; soleY?: number;
  /** explicit canvas height in metres (overrides heightM / crownY: the clown's 1/CLOWN_K card, pigeons) */
  canvasM?: number;
  pos: (t: number) => V3;
  /** face "camera": the character's heading (for s / c; default: the path tangent); face "yaw": the card plane's facing */
  yaw?: (t: number) => number;
  face?: "camera" | "yaw";
  /** cast shadows (proxies) + contact blobs (default true) */
  shadow?: boolean;
  /** blades in front of the feet */
  onGrass?: boolean | FootGrassOpts;
  /** redraw only when this changes */
  key?: (t: number, info: CardDrawInfo) => string;
  /** LAZY REDRAW (pointing v5 speed work, CAST 2026-11-21): a key change on a card that cannot touch the picture (beyond
   *  lodM, i.e. no shadow proxies, AND its whole canvas plane outside the lens's view) is only REMEMBERED; the canvas
   *  redraw, its two blurs and the texture uploads happen when the card can be seen again, from the key it then has.
   *  Pixel-identical by construction (an unseen card's canvas is never sampled). Only for draw() functions that draw
   *  from what the key describes (CAST's member.ts draws the pose its key was made from), not from the live camera */
  lazy?: boolean;
  /** the feet in the body frame (contact blobs per foot): cast adapters pass PPL.feetOf */
  feet?: (t: number, info: CardDrawInfo) => FootPt[] | null;
  mirror?: (t: number) => boolean;
  /** beyond this distance from the lens: no proxies, the scene sun map for visibility (default 14 m) */
  lodM?: number;
  look?: Partial<CardLook>;
  /** debug view: 1 visibility, 2 form normals, 3 light only, 4 bulge height */
  dbg?: number;
  name?: string;
  /** log GPU / CPU costs (gl.finish based; slows the render) */
  measure?: boolean;
};
export type CardBuilt = Built & { mat: THREE.ShaderMaterial; U: CardMatU; canvas: HTMLCanvasElement; info: () => CardDrawInfo | null; stats: { drawMs: number; draws: number; proxies: number } };

const camRight = new THREE.Vector3(), camUp = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();

export const card = async (ctx: KitCtx, o: CardOpts): Promise<CardBuilt> => {
  const cl = CardLight.of(ctx);
  if (o.dbg) cl.dbg = o.dbg;
  const aspect = o.aspect ?? 0.6, H = Math.round(o.px), W = Math.round(H * aspect);
  const soleY = o.soleY ?? 0.975, crownY = o.crownY ?? 0.025;
  const canvasM = o.canvasM ?? o.heightM / Math.max(0.05, soleY - crownY), widthM = canvasM * aspect;
  // ---- canvases: the drawing + two small blurred-alpha fields (form)
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g2 = cv.getContext("2d")!;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const fw = Math.max(16, Math.round(W / 4)), fh = Math.max(16, Math.round(H / 4));
  const mkForm = () => { const c = document.createElement("canvas"); c.width = fw; c.height = fh; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return { c, g: c.getContext("2d")!, t }; };
  const FS = mkForm(), FL = mkForm();
  // sigmas relative to the figure: limb-scale and head / body-scale roundness
  const sigS = Math.max(1.2, fh * 0.0068), sigL = Math.max(3, fh * 0.03);
  const { m: mat, U } = makeCardMaterial(cl, { look: o.look });
  U.map.value = tex; U.tFormS.value = FS.t; U.tFormL.value = FL.t; U.uFormTexel.value.set(1 / fw, 1 / fh); U.uSigma.value.set(sigS, sigL);
  if (o.dbg) U.uDbg.value = o.dbg;
  // ---- the plane: soles at y = 0
  const geo = new THREE.PlaneGeometry(widthM, canvasM); geo.translate(0, canvasM * (soleY - 0.5), 0);
  const root = new THREE.Group(); root.name = o.name ?? "card";
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.name = (o.name ?? "card") + ".mesh";
  root.add(mesh);
  const sh = cardShadow(cl, root, geo, tex, { proxies: o.shadow !== false, contact: o.shadow !== false });
  const grass = o.onGrass ? footGrass(ctx, root, typeof o.onGrass === "object" ? o.onGrass : {}) : null;
  const lodM = o.lodM ?? 14;
  let near = true, lastInfo: CardDrawInfo | null = null, key = "\u0000";
  const stats = { drawMs: 0, draws: 0, proxies: 0 };
  cl.register({ pos: o.pos, heightM: canvasM, near: () => near, hide: [root] });

  const redraw = (t: number, info: CardDrawInfo) => {
    const t0 = performance.now();
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H);
    g2.save(); o.draw(g2, t, W, H, info); g2.restore();
    tex.needsUpdate = true;
    for (const [F, s] of [[FS, sigS], [FL, sigL]] as const) {
      F.g.setTransform(1, 0, 0, 1, 0, 0); F.g.clearRect(0, 0, fw, fh);
      F.g.filter = `blur(${s.toFixed(2)}px)`; F.g.drawImage(cv, 0, 0, fw, fh); F.g.filter = "none";
      F.t.needsUpdate = true;
    }
    stats.drawMs = performance.now() - t0; stats.draws++;
  };

  const heading = new THREE.Vector3();
  // lazy redraw: the key change waiting for the card to be seen, and a CONSERVATIVE view test: a sphere round the whole
  // canvas plane (any turn), 1.5x its half diagonal + 1 m of slack (shader bulge, sub-frame lens drift, a projection
  // matrix updated after this call), against the lens's frustum
  let pend: [number, CardDrawInfo] | null = null;
  const vFr = new THREE.Frustum(), vM = new THREE.Matrix4(), vS = new THREE.Sphere(), vC = new THREE.Vector3();
  const vR = 1.5 * 0.5 * Math.hypot(widthM, canvasM) + 1.0;
  const inView = (cam: THREE.Camera, p: V3) => {
    vM.copy(cam.matrixWorld).invert().premultiply((cam as THREE.PerspectiveCamera).projectionMatrix);
    vFr.setFromProjectionMatrix(vM);
    vC.set(p[0], p[1] + canvasM * (soleY - 0.5), p[2]);
    return vFr.intersectsSphere(vS.set(vC, vR));
  };
  // any OTHER camera that draws this card (the shot's GI bounce-probe cube capture: core/gi.ts bakeProbe renders the
  // whole set, cards included; a reflection capture) first gets the pending drawing: found by the A/B test (f105:
  // the booth's probe saw the 25 hall cards 40 m away, undrawn they changed the bounce light of the whole frame).
  // The lens itself skips it: inView() already said the card is outside its frustum
  let lastCam: THREE.Camera | null = null;
  if (o.lazy) mesh.onBeforeRender = (_r, _s, camera) => { if (pend && camera !== lastCam) { redraw(pend[0], pend[1]); pend = null; } };
  const update = (t: number, cam: THREE.Camera) => {
    lastCam = cam;
    const p = o.pos(t);
    cam.updateMatrixWorld();
    const cp = tmpV.setFromMatrixPosition(cam.matrixWorld);
    const dist = Math.hypot(cp.x - p[0], cp.y - p[1] - canvasM * 0.4, cp.z - p[2]);
    near = dist < lodM;
    // heading: given, or the path tangent, or square to the lens
    let hy: number;
    if (o.yaw) hy = o.yaw(t);
    else {
      const a = o.pos(t - 0.04), b = o.pos(t + 0.04), dx = b[0] - a[0], dz = b[2] - a[2];
      hy = Math.hypot(dx, dz) > 0.002 ? Math.atan2(dx, dz) : Math.atan2(cp.x - p[0], cp.z - p[2]);
    }
    heading.set(Math.sin(hy), 0, Math.cos(hy));
    camRight.setFromMatrixColumn(cam.matrixWorld, 0); camUp.setFromMatrixColumn(cam.matrixWorld, 1);
    const tx = cp.x - p[0], tz = cp.z - p[2], tn = Math.hypot(tx, tz) || 1;
    const s = heading.x * camRight.x + heading.z * camRight.z, c = (heading.x * tx + heading.z * tz) / tn;
    // the key light's canvas angle (cast Pose.light): the sun, else the strongest nearby lamp
    let lx = 0.7, ly = -0.7;
    const L = cl.sunDirW(tmpL);
    if (L) { lx = L.dot(camRight); ly = -L.y; }
    else {
      let best = 0;
      for (const l of cl.lights()) {
        if ((l as THREE.DirectionalLight).isDirectionalLight || !l.visible) continue;
        tmpL.setFromMatrixPosition(l.matrixWorld).sub(new THREE.Vector3(p[0], p[1] + 1.2, p[2]));
        const k = l.intensity / Math.max(0.5, tmpL.lengthSq());
        if (k > best) { best = k; tmpL.normalize(); lx = tmpL.dot(camRight); ly = -tmpL.y; }
      }
    }
    const lightAng = Math.round(Math.atan2(ly, lx) / (Math.PI / 4)) * (Math.PI / 4);
    const info: CardDrawInfo = { cam, s, c, heading: hy, pos: p, dist, lightAng, t };
    lastInfo = info;
    const k = o.key ? o.key(t, info) : `${t}`;
    if (!o.lazy) { if (k !== key) { key = k; redraw(t, info); } }
    else {
      if (k !== key) { key = k; pend = [t, info]; }
      if (pend && (near || inView(cam, p))) { redraw(pend[0], pend[1]); pend = null; }
    }
    // place: turned to the lens (yaw only) or to yaw(t)
    const fy = o.face === "yaw" && o.yaw ? o.yaw(t) : Math.atan2(cp.x - p[0], cp.z - p[2]);
    const mir = o.mirror?.(t) ? -1 : 1;
    mesh.position.set(p[0], p[1], p[2]); mesh.rotation.set(0, fy, 0); mesh.scale.set(mir, 1, 1);
    sh.update(p, heading, o.feet ? o.feet(t, info) : null, mir, 1, near);
    stats.proxies = sh.proxyCount();
    grass?.update(p);
    // light inputs: local probe, ground height, the visibility source for this LOD
    cl.probeAt(p, U.uSH.value);
    U.uGroundY.value = p[1];
    cl.applyVis(U, !near);
  };
  return {
    object: root, update, mat, U, canvas: cv, info: () => lastInfo, stats,
    dispose: () => { sh.dispose(); grass?.dispose(); geo.dispose(); mat.dispose(); tex.dispose(); FS.t.dispose(); FL.t.dispose(); },
  };
};

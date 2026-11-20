// KIT / CARDS: many background cards cheaply (owner CARDS). See NOTES.md, "Crowd".
// All members are drawn into ONE atlas canvas (one upload, one form blur pair, one instanced draw call). They are the far
// LOD: no proxies, so their visibility reads the scene sun's own shadow map (which holds the near cards' proxies: a hero's
// shadow can fall on the crowd), one shared local probe, instanced contact blobs. They redraw at most `fps` times a second
// (pure in t: the draw time is quantised) and only when their key changes.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";
import { CardLight, makeCardMaterial, type CardLook } from "./cardlight";
import type { CardDrawInfo } from "./card";

export type CrowdMember = {
  draw: (c2d: CanvasRenderingContext2D, t: number, w: number, h: number, info: CardDrawInfo) => void;
  pos: (t: number) => V3;
  yaw?: (t: number) => number;
  key?: (t: number, info: CardDrawInfo) => string;
  /** canvas height in metres (cast people: 2.16 m) */
  canvasM: number;
  mirror?: (t: number) => boolean;
};
export type CrowdOpts = { members: CrowdMember[]; cellPx?: number; fps?: number; blobs?: boolean; look?: Partial<CardLook>; measure?: boolean };

const BLOB_GEO = (() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; })();

export const crowd = async (ctx: KitCtx, o: CrowdOpts): Promise<Built & { stats: { drawMs: number; redrawn: number } }> => {
  const cl = CardLight.of(ctx);
  const n = o.members.length, ch = o.cellPx ?? 220, cw = Math.round(ch * 0.6), pad = Math.ceil(ch * 0.06);
  const cols = Math.max(1, Math.floor(2048 / (cw + pad))), rows = Math.ceil(n / cols);
  const AW = cols * (cw + pad), AH = rows * (ch + pad);
  const cv = document.createElement("canvas"); cv.width = AW; cv.height = AH;
  const g2 = cv.getContext("2d")!;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const fw = Math.round(AW / 4), fh = Math.round(AH / 4);
  const mkForm = () => { const c = document.createElement("canvas"); c.width = fw; c.height = fh; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return { c, g: c.getContext("2d")!, t }; };
  const FS = mkForm(), FL = mkForm();
  const cellFh = ch / 4, sigS = Math.max(1, cellFh * 0.0068), sigL = Math.max(2.5, cellFh * 0.03);
  const { m: mat, U } = makeCardMaterial(cl, { atlas: true, far: true, look: o.look });
  U.map.value = tex; U.tFormS.value = FS.t; U.tFormL.value = FL.t; U.uFormTexel.value.set(1 / fw, 1 / fh); U.uSigma.value.set(sigS, sigL);
  // geometry: a unit plane, soles at 0 (0.975 down the cell); instances scale it to each member's size
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.475, 0);
  const aCell = new Float32Array(n * 4);
  o.members.forEach((_, i) => {
    const cx = (i % cols) * (cw + pad), cy = Math.floor(i / cols) * (ch + pad);
    aCell.set([cx / AW, 1 - (cy + ch) / AH, cw / AW, ch / AH], i * 4);
  });
  const ig = geo.clone(); ig.setAttribute("aCell", new THREE.InstancedBufferAttribute(aCell, 4));
  const im = new THREE.InstancedMesh(ig, mat, n);
  im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.renderOrder = 1; im.name = "cardCrowd";
  const root = new THREE.Group(); root.name = "cardCrowd"; root.add(im);
  // contact blobs (one soft AO ellipse per member)
  const bmat = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( position, 1.0 ); }`,
    fragmentShader: `varying vec2 vUv; void main() { float r2 = dot( vUv, vUv ); float a = 0.42 * exp( - r2 * 2.6 ) * ( 1.0 - smoothstep( 0.7, 1.0, r2 ) ); if ( a < 0.003 ) discard; gl_FragColor = vec4( 0.0, 0.0, 0.0, a ); }`,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  const blobs = new THREE.InstancedMesh(BLOB_GEO, bmat, n);
  blobs.frustumCulled = false; blobs.renderOrder = 0.5; blobs.visible = o.blobs !== false; root.add(blobs);
  const keys: string[] = new Array(n).fill("\u0000");
  const fps = o.fps ?? 30;
  const stats = { drawMs: 0, redrawn: 0 };
  cl.register({ pos: (t) => o.members[0]?.pos(t) ?? [0, 0, 0], heightM: 2, near: () => false, hide: [root] });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sv = new THREE.Vector3(), pv = new THREE.Vector3(), cp = new THREE.Vector3();
  const camR = new THREE.Vector3(), tl = new THREE.Vector3();
  const update = (t: number, cam: THREE.Camera) => {
    cam.updateMatrixWorld(); cp.setFromMatrixPosition(cam.matrixWorld); camR.setFromMatrixColumn(cam.matrixWorld, 0);
    const tq = Math.round(t * fps) / fps; // round, not floor: the kit centres sub-frames on the frame time (floor double-exposed crowd cards at final; lead fix 2026-11-19, same as CAST member cards)
    const L = cl.sunDirW(tl), lightAng = L ? Math.round(Math.atan2(-L.y, L.dot(camR)) / (Math.PI / 4)) * (Math.PI / 4) : -Math.PI * 0.75;
    let dirty = false; const t0 = performance.now(); stats.redrawn = 0;
    let cxs = 0, czs = 0, cy = 0;
    o.members.forEach((M, i) => {
      const p = M.pos(t), pq = M.pos(tq);
      cxs += p[0]; czs += p[2]; cy += p[1];
      // heading from the path tangent (or yaw)
      let hy: number;
      if (M.yaw) hy = M.yaw(tq);
      else { const a = M.pos(tq - 0.05), b = M.pos(tq + 0.05), dx = b[0] - a[0], dz = b[2] - a[2]; hy = Math.hypot(dx, dz) > 0.002 ? Math.atan2(dx, dz) : Math.atan2(cp.x - pq[0], cp.z - pq[2]); }
      const hx = Math.sin(hy), hz = Math.cos(hy), tx = cp.x - pq[0], tz = cp.z - pq[2], tn = Math.hypot(tx, tz) || 1;
      const info: CardDrawInfo = { cam, s: hx * camR.x + hz * camR.z, c: (hx * tx + hz * tz) / tn, heading: hy, pos: pq, dist: tn, lightAng, t: tq };
      const k = M.key ? M.key(tq, info) : `${tq}`;
      if (k !== keys[i]) {
        keys[i] = k; dirty = true; stats.redrawn++;
        const x0 = (i % cols) * (cw + pad), y0 = Math.floor(i / cols) * (ch + pad);
        g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(x0, y0, cw, ch);
        g2.save(); g2.beginPath(); g2.rect(x0, y0, cw, ch); g2.clip(); g2.translate(x0, y0);
        M.draw(g2, tq, cw, ch, info);
        g2.restore();
      }
      // place (at the true sub-frame position: motion blur on the travel, the drawing at frame rate)
      const fy = Math.atan2(cp.x - p[0], cp.z - p[2]), mir = M.mirror?.(t) ? -1 : 1;
      q.setFromAxisAngle(up, fy);
      m4.compose(pv.set(p[0], p[1], p[2]), q, sv.set(M.canvasM * 0.6 * mir, M.canvasM, 1));
      im.setMatrixAt(i, m4);
      m4.compose(pv.set(p[0], p[1] + 0.003, p[2]), q, sv.set(M.canvasM * 0.26, 1, M.canvasM * 0.17));
      blobs.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true; blobs.instanceMatrix.needsUpdate = true;
    if (dirty) {
      tex.needsUpdate = true;
      for (const [F, s] of [[FS, sigS], [FL, sigL]] as const) {
        F.g.setTransform(1, 0, 0, 1, 0, 0); F.g.clearRect(0, 0, fw, fh); F.g.filter = `blur(${s.toFixed(2)}px)`; F.g.drawImage(cv, 0, 0, fw, fh); F.g.filter = "none"; F.t.needsUpdate = true;
      }
    }
    stats.drawMs = performance.now() - t0;
    if (n) { cl.probeAt([cxs / n, cy / n, czs / n], U.uSH.value); U.uGroundY.value = cy / n; }
    cl.applyVis(U, true);
  };
  return { object: root, update, stats, dispose: () => { ig.dispose(); geo.dispose(); mat.dispose(); tex.dispose(); bmat.dispose(); } };
};

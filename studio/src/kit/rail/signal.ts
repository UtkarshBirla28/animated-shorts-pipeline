// K-P4 Japanese colour-light block / starting signal (STATION owner). A 3-light vertical head: GREEN top, YELLOW middle,
// RED bottom (see NOTES.md: order not confirmed from a primary source; only green is lit in the film). Black backboard
// with rounded ends, hooded lamp housings, a white-painted back (ja.wikipedia 日本の鉄道信号: "信号機の裏面は白色に塗装され、
// 背面板や灯箱の内部は黒く塗装される"), a steel pipe mast on a concrete base, a cage ladder + a small working platform,
// a digit-only number plate. The lit lamp gets a screen-size-floored glow sprite so it still reads as a dot at 700 m.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { KitCtx, V3 } from "../core/ctx";
import { box, canvasTex, cyl, flush, mat, rod, type Parts } from "./util";
import { mastSteel } from "./ocs";

export type Aspect = "G" | "Y" | "R" | "YG" | "YY" | "off";
const LENS: Record<string, [number, number, number]> = { G: [0.1, 1.0, 0.62], Y: [1.0, 0.72, 0.12], R: [1.0, 0.12, 0.08] };

let glowTex: THREE.Texture | null = null;
const glowTexture = () => (glowTex ??= canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,255,255,0.85)"); gr.addColorStop(0.45, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
}));
const plateTex = new Map<string, THREE.Texture>();
const digitPlate = (txt: string) => {
  if (plateTex.has(txt)) return plateTex.get(txt)!;
  const t = canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = "#f1efe8"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#1b1b1d"; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#1b1b1d"; g.font = "bold 92px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, h / 2 + 4);
  });
  plateTex.set(txt, t); return t;
};

export type SignalOpts = {
  aspect?: Aspect;
  /** height of the head centre above the rail top (default 4.6 m) */
  headY?: number;
  /** the mast foot y (formation, default -0.59) */
  footY?: number;
  /** the number on the plate (digits only) */
  num?: string;
  /** lit lamp radiance (linear, default 14: blooms in golden light) */
  bright?: number;
  /** the lit lamp's glow never gets smaller than this share of the FRAME HEIGHT, at any distance (default 0.013 = a
   *  small clear dot). 0.052 = the film's hero lamp: a core of ~18 px and a halo of ~40 px on a 1920 px frame. */
  glow?: number;
  /** 0..1: a soft dark disc behind the glow (1.7 x its size), so the lamp reads on a bright hazy sky as if on a dark
   *  background (the real head's black backboard, enlarged with the glow). Default: 0.7 when glow >= 0.03, else 0. */
  backing?: number;
  /** the face looks toward +Z (toward an approaching train) */
  seed?: number;
};
/** one signal at the local origin (x = the mast, the head turned toward +Z). Returns its update (glow sprite sizing). */
export const signalJP = async (ctx: KitCtx, o: SignalOpts = {}) => {
  const P: Parts = new Map();
  const hy = o.headY ?? 4.6, fy = o.footY ?? -0.59, asp = o.aspect ?? "G";
  // concrete base + steel pipe mast
  box(P, "conc", [0, fy + 0.2, 0], [0.7, 0.5, 0.7], 0.03);
  cyl(P, "steel", [0, fy + 0.45, 0], 0.115, 0.1, hy + 0.9 - (fy + 0.45), 14);
  // a bracket arm carrying the head 0.55 m toward the track (+x)
  box(P, "steel", [0.4, hy + 0.85, 0], [0.86, 0.08, 0.1], 0.006);
  box(P, "steel", [0.4, hy - 0.85, 0], [0.86, 0.08, 0.1], 0.006);
  // ladder (two stiles + rungs) on the back + a small grated platform under the head
  for (const sx of [-0.18, 0.18]) rod(P, "steel", [sx, fy + 0.45, -0.22], [sx, hy - 0.9, -0.22], 0.014, 5);
  for (let y = fy + 0.75; y < hy - 0.9; y += 0.3) rod(P, "steel", [-0.18, y, -0.22], [0.18, y, -0.22], 0.01, 4);
  box(P, "steel", [0.45, hy - 0.98, 0.05], [0.9, 0.04, 0.6], 0.004);
  for (const px of [0.02, 0.88]) rod(P, "steel", [px, hy - 0.98, 0.33], [px, hy - 0.2, 0.33], 0.012, 4);
  rod(P, "steel", [0.02, hy - 0.2, 0.33], [0.88, hy - 0.2, 0.33], 0.012, 4);
  // the head: black backboard (rounded ends) + white back, 3 housings with hoods
  const hx = 0.78, bw = 0.6, bh = 1.5;
  box(P, "board", [hx, hy, 0.02], [bw, bh, 0.035], 0.12);
  box(P, "back", [hx, hy, -0.13], [0.34, bh - 0.12, 0.26], 0.05);
  const lamps: [number, string][] = [[hy + 0.44, "G"], [hy, "Y"], [hy - 0.44, "R"]];
  for (const [ly] of lamps) {
    cyl(P, "board", [hx, ly, 0.03], 0.16, 0.16, 0.06, 20, "z");                           // housing rim
    // hood: an open half tube over the top of the lens
    const hood = new THREE.CylinderGeometry(0.17, 0.17, 0.32, 18, 1, true, Math.PI * 0.425, Math.PI * 1.15);
    hood.rotateX(Math.PI / 2); hood.translate(hx, ly, 0.2);
    (P.get("hood") ?? P.set("hood", []).get("hood")!).push(hood.toNonIndexed());
  }
  const plate = digitPlate(o.num ?? "12");
  const M: Record<string, THREE.Material> = {
    steel: await mastSteel(ctx), conc: mat([0.62, 0.61, 0.58], 0.9), board: mat([0.03, 0.03, 0.035], 0.55, 0.2), back: mat([0.86, 0.86, 0.83], 0.5, 0.1),
    hood: mat([0.03, 0.03, 0.035], 0.6, 0.2, { side: THREE.DoubleSide }),
  };
  // hood geometry has no aWear / aSurf: give it its own mesh
  const hoodG = P.get("hood")!; P.delete("hood");
  const G = flush(P, M, { name: "signal", module: "rail-signal" });
  const hm = new THREE.Mesh(hoodG.length === 1 ? hoodG[0] : mergeGeometries(hoodG)!, M.hood);
  hm.castShadow = true; G.add(hm);
  // lenses: dark glass when off, emissive when lit
  const lit = (c: string) => asp.includes(c);
  const sprites: THREE.Sprite[] = [], backs: THREE.Sprite[] = [];
  const glowK = o.glow ?? 0.013, backK = o.backing ?? (glowK >= 0.03 ? 0.7 : 0);
  for (const [ly, c] of lamps) {
    const col = LENS[c], on = lit(c);
    const lm = on ? new THREE.MeshStandardMaterial({ color: new THREE.Color(...col).multiplyScalar(0.2), emissive: new THREE.Color(...col), emissiveIntensity: o.bright ?? 14, roughness: 0.2 })
      : new THREE.MeshStandardMaterial({ color: new THREE.Color(...col).multiplyScalar(0.045), roughness: 0.08, metalness: 0.0, envMapIntensity: 1.4 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.105, 24), lm); lens.position.set(hx, ly, 0.065); G.add(lens);
    if (on) {
      const sm = new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(...col).multiplyScalar(2.2), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true });
      const sp = new THREE.Sprite(sm); sp.position.set(hx, ly, 0.09); sp.scale.setScalar(0.5); sp.renderOrder = 5; sp.userData.noProbe = true; G.add(sp); sprites.push(sp);
      if (backK > 0) {
        const bk = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x000000, opacity: backK, blending: THREE.NormalBlending, depthWrite: false, fog: false, transparent: true }));
        bk.position.set(hx, ly, 0.08); bk.renderOrder = 4; bk.userData.noProbe = true; G.add(bk); backs.push(bk);
      }
    }
  }
  // number plate on the mast, facing the train
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.25), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.6 }));
  pm.position.set(0.0, hy - 1.45, 0.12); G.add(pm);
  const wp = new THREE.Vector3();
  /** keep the lit lamp's glow >= ~4 px on screen (a real long-lens signal reads as a bright dot) */
  const update = (_t: number, cam: THREE.Camera) => {
    if (!sprites.length) return;
    const pc = cam as THREE.PerspectiveCamera, H = ctx.size?.h ?? 960;
    for (const sp of sprites) {
      sp.getWorldPosition(wp);
      const d = wp.distanceTo(cam.position), ps = (2 * d * Math.tan(((pc.fov ?? 60) * Math.PI) / 360)) / H;
      sp.scale.setScalar(Math.max(0.6, glowK * ps * H));   // the glow never smaller than `glow` x the frame height (a clear dot at any quality)
      for (const bk of backs) bk.scale.setScalar(sp.scale.x * 1.7);
    }
  };
  return { object: G as THREE.Object3D, update };
};
/** the world position helper: a signal mast stands on the LEFT of its track (x = track - 3.0; the head hangs 0.78 m toward it) */
export const signalPos = (trackX: number, z: number, footY = -0.59): V3 => [trackX - 3.0, footY, z];

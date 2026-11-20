// set "lights" (CORE sandbox): the LIGHT-BUDGET test. A 14 x 6 x 3.2 m hall whose pieces each have their OWN shader
// program (the same PBR material + one unique constant, so no cache can share them), lit by N practicals of each kind.
// It measures what a light costs: shader compile time per program (three unrolls every light into every lit shader)
// and GPU time per sub-frame. Variants are chosen per shot in film.ts (LIGHTS).
import * as THREE from "three";
import type { Built, Practical, SetBuilder } from "../../../kit/core/ctx";
import { pbrRepeat } from "../../../kit/core/assets";

export type LightTest = {
  /** real scene lights of each kind */
  rect?: number; point?: number; spot?: number;
  /** how many of the spots cast shadows (the pipeline caps at 2) */
  shadowSpots?: number;
  /** GROUPED: this many glow-only ceiling panels ({ light: false }) lit by ONE long rect practical per row */
  glow?: number;
  /** distinct lit shader programs (default 12) */
  progs?: number;
  /** render the scene inside the first update (what a local reflection capture / a card probe does) */
  early?: boolean;
  /** a lamp that is switched fully off for the first half second (the practical() off-lamp fix) */
  blink?: boolean;
  /** the WRONG way, to test the warnings: a lamp's group hidden with .visible for the first half second */
  hide?: boolean;
  /** film time (s) of the blink / hide switch (default 0.5) */
  at?: number;
};

export const mkLights = (v: LightTest): SetBuilder => async (ctx): Promise<Built> => {
  const A = ctx.assets;
  const [planks, plaster] = await Promise.all([A.pbr("lookpilot/weathered_planks", "1k"), A.pbr("lookpilot/plastered_stone_wall", "1k")]);
  const P = v.progs ?? 12;
  let nMat = 0;
  /** a PBR material with its own program: one unique constant in the fragment shader + its own cache key */
  const mat = (p: typeof planks, rep: [number, number], col: [number, number, number], rough = 1) => {
    const r = pbrRepeat(p, rep), i = nMat++;
    const m = new THREE.MeshStandardMaterial({ map: r.map, normalMap: r.normalMap, roughnessMap: r.arm, aoMap: r.arm, roughness: rough, color: new THREE.Color().setRGB(...col, THREE.SRGBColorSpace) });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <dithering_fragment>", `gl_FragColor.rgb += vec3( ${(i * 1e-6).toFixed(8)} );\n#include <dithering_fragment>`); };
    m.customProgramCacheKey = () => `core:lightTest${i}`;
    return m;
  };
  const root = new THREE.Group(); root.name = "lights";
  const W = 14, D = 6, H = 3.2, T = 0.15;
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; root.add(b); return b;
  };
  box(W + 2 * T, T, D + 2 * T, mat(planks, [6, 2.6], [0.9, 0.82, 0.72], 0.7), 0, -T / 2, -D / 2);          // floor
  box(W + 2 * T, T, D + 2 * T, mat(plaster, [6, 2.4], [0.95, 0.93, 0.9]), 0, H + T / 2, -D / 2);            // ceiling
  box(W + 2 * T, H + 0.2, T, mat(plaster, [6, 1.4], [0.93, 0.9, 0.84]), 0, H / 2, -D - T / 2);              // back wall
  // the rest of the programs: columns and crates down the hall
  for (let i = 3; i < P; i++) {
    const k = (i - 3) / Math.max(1, P - 4), x = -W / 2 + 1 + k * (W - 2);
    if (i % 2) box(0.35, H, 0.35, mat(plaster, [0.4, 1.6], [0.8, 0.82, 0.86]), x, H / 2, -1.9 - (i % 3) * 0.9);
    else box(0.7, 0.6 + (i % 3) * 0.25, 0.7, mat(planks, [0.6, 0.6], [0.85, 0.62, 0.4], 0.6), x, (0.6 + (i % 3) * 0.25) / 2, -3.2 + (i % 4) * 0.5);
  }
  const lamps: Practical[] = [];
  const mk = ctx.practical!;
  const rowZ = [-1.6, -4.2];
  const along = (n: number, i: number) => -W / 2 + (W / n) * (i + 0.5);
  // rect ceiling panels in two rows
  const nR = v.rect ?? 0;
  for (let i = 0; i < nR; i++) {
    const per = Math.ceil(nR / 2), x = along(per, i % per), z = rowZ[Math.floor(i / per) % 2];
    const p = mk({ kind: "rect", pos: [x, H - 0.02, z], target: [x, 0, z], size: [1.2, 0.3], kelvin: 3800, lumens: 2000, seed: 40 + i }); root.add(p.object); lamps.push(p);
  }
  // GROUPED: the same panels as glow-only fixtures + one long rect per row with the row's lumens
  const nG = v.glow ?? 0;
  for (let i = 0; i < nG; i++) {
    const per = Math.ceil(nG / 2), x = along(per, i % per), z = rowZ[Math.floor(i / per) % 2];
    const p = mk({ kind: "rect", pos: [x, H - 0.02, z], target: [x, 0, z], size: [1.2, 0.3], kelvin: 3800, lumens: 2000, light: false, seed: 40 + i }); root.add(p.object); lamps.push(p);
  }
  if (nG) for (const z of rowZ) {
    const p = mk({ kind: "rect", pos: [0, H - 0.03, z], target: [0, 0, z], size: [W - 1, 0.3], kelvin: 3800, lumens: 2000 * Math.ceil(nG / 2), bulb: false, seed: 77 }); root.add(p.object); lamps.push(p);
  }
  // bare bulbs
  const nP = v.point ?? 0;
  for (let i = 0; i < nP; i++) {
    const per = Math.ceil(nP / 2), x = along(per, i % per), z = rowZ[Math.floor(i / per) % 2];
    const p = mk({ kind: "point", pos: [x, 2.55, z], kelvin: 2900, lumens: 900, seed: 60 + i }); root.add(p.object); lamps.push(p);
  }
  // downlights (the first `shadowSpots` cast)
  const nS = v.spot ?? 0;
  for (let i = 0; i < nS; i++) {
    const per = Math.ceil(nS / 2), x = along(per, i % per) + 0.4, z = rowZ[Math.floor(i / per) % 2] + 0.5;
    const p = mk({ kind: "spot", pos: [x, H - 0.05, z], target: [x + 0.2, 0, z - 0.3], kelvin: 3200, lumens: 1500, angle: 0.8, penumbra: 0.8, shadow: i < (v.shadowSpots ?? 0), shadowNear: 0.1, seed: 80 + i });
    root.add(p.object); lamps.push(p);
  }
  let early = !!v.early;
  const capRT = v.early ? new THREE.WebGLRenderTarget(32, 32, { type: THREE.HalfFloatType }) : null;
  const capCam = new THREE.PerspectiveCamera(90, 1, 0.05, 100); capCam.position.set(0, 1.5, -2.5); capCam.lookAt(3, 1.2, -3);
  return {
    object: root,
    update: (t) => {
      if (v.blink && lamps[0]) lamps[0].set(t < (v.at ?? 0.5) ? 0 : 1);
      if (v.hide && lamps[1]) lamps[1].object.visible = t >= (v.at ?? 0.5);
      if (early && capRT) {
        early = false;
        const gl = ctx.gl, keep = gl.getRenderTarget(), t0 = performance.now();
        capCam.updateMatrixWorld(); gl.setRenderTarget(capRT); gl.render(ctx.scene, capCam); gl.setRenderTarget(keep);
        gl.getContext().finish();
        console.warn(`lights test: the early render inside update() took ${(performance.now() - t0).toFixed(0)} ms`);
      }
    },
    dispose: () => capRT?.dispose(),
    hints: { shadowCenter: [0, 0, -D / 2], shadowExt: 10, probe: [0, 1.4, -2.6], groundAlbedo: [0.4, 0.34, 0.28] },
  };
};

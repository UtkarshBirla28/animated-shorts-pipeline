// SURFACES sandbox: per-module GPU cost probe. Inside a set's update (once, at the first sub-frame when inputProps
// surf.probe is set) it renders the set's scene into an offscreen half-float target the size of the frame with the sun
// shadow map updating, gl.finish-timed, then again with each module hidden, and with every kit surface material swapped
// for a plain MeshStandardMaterial (= the cost of the surface SHADER itself). Logs "surf-prof {...}".
import * as THREE from "three";
import { getInputProps } from "remotion";
import type { KitCtx } from "../../kit/core/ctx";

export const surfProps = () => ((getInputProps() as { surf?: { probe?: boolean; hide?: string[]; dbg?: string } }).surf ?? {});

export const probeModules = (ctx: KitCtx, cam: THREE.Camera, root: THREE.Object3D, label: string) => {
  const gl = ctx.gl, c = gl.getContext();
  const w = ctx.size?.w ?? 1080, h = ctx.size?.h ?? 1920;
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true });
  const time = (n = 4) => {
    gl.setRenderTarget(rt); gl.render(ctx.scene, cam); c.finish();
    const t0 = performance.now();
    for (let i = 0; i < n; i++) gl.render(ctx.scene, cam);
    c.finish(); gl.setRenderTarget(null);
    return (performance.now() - t0) / n;
  };
  const mods = new Map<string, THREE.Object3D[]>();
  root.traverse((o) => { const m = o.userData.kitModule as string | undefined; if (m && o.parent && !o.parent.userData.kitModule) { if (!mods.has(m)) mods.set(m, []); mods.get(m)!.push(o); } });
  const full = time();
  const res: Record<string, number | string> = { label, w, h, full_ms: +full.toFixed(2) };
  for (const [m, objs] of mods) {
    objs.forEach((o) => (o.visible = false));
    res[m + "_ms"] = +(full - time()).toFixed(2);
    objs.forEach((o) => (o.visible = true));
  }
  // the surface shader vs a plain PBR material on the same meshes
  const swapped: [THREE.Mesh, THREE.Material][] = [];
  const plain = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
  root.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh && (me.material as THREE.Material).name?.startsWith("surf:")) { swapped.push([me, me.material as THREE.Material]); me.material = plain; } });
  res.surfaceShader_ms = +(full - time()).toFixed(2);
  swapped.forEach(([me, m]) => (me.material = m));
  let tris = 0; root.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh && me.visible) { const g = me.geometry; tris += (g.index ? g.index.count : (g.getAttribute("position")?.count ?? 0)) / 3; } });
  res.tris = Math.round(tris);
  console.warn("surf-prof " + JSON.stringify(res));
  rt.dispose(); plain.dispose();
};

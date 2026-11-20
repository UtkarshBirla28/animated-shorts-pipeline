// KIT / HOME: the night outside a flat's window + small life for night interiors, all pure in t.
//  - nightCity: three layers of far blocks with lit windows (canvas emissive facades: warm / cool / dark rooms, a few
//    TV-blue flickers), a street lamp head glowing below the window, aircraft-warning red blinks on a far roof
//  - curtain: a pleated fabric panel that BREATHES (CPU-displaced grid, pure in t) in a draught
//  - headlightSweep: a car's headlights sliding across the ceiling through the window (spot practical, envelope per pass)
//  - moth: a moth circling a lamp (flapping wings, erratic loop), casts a flickering shadow from a shadowed lamp
import * as THREE from "three";
import type { Built, KitCtx, Practical } from "../core/ctx";
import { kelvin } from "../core/rigs";
import { canvas, glow, mesh, pbr, rng, hash1, type V3, type C3 } from "./util";

// ================================================================ the city at night
const facadeTex = (seed: number, cols: number, rows: number, lit: number) => {
  const R = rng(seed), cw = 32, ch = 40, { cv, g } = canvas(cols * cw, rows * ch);
  g.fillStyle = "#0d0f14"; g.fillRect(0, 0, cv.width, cv.height);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const on = R() < lit, x = c * cw + 6, y = r * ch + 8, w = cw - 12, h = ch - 16;
    if (on) {
      const k = R(); const col = k < 0.62 ? `rgb(${230 + R() * 25},${170 + R() * 40},${90 + R() * 40})` : k < 0.85 ? `rgb(${200 + R() * 30},${210 + R() * 30},${215 + R() * 30})` : `rgb(${120 + R() * 40},${150 + R() * 40},${230})`;
      g.fillStyle = col; g.fillRect(x, y, w, h);
      if (R() < 0.5) { g.fillStyle = "rgba(20,16,12,0.55)"; g.fillRect(x + (R() < 0.5 ? 0 : w * 0.55), y, w * 0.45, h); }      // a curtain half drawn
    } else { g.fillStyle = `rgba(40,46,58,${0.4 + R() * 0.4})`; g.fillRect(x, y, w, h); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
};
export type NightCityOpts = {
  /** the window centre (world) and the outward direction (unit, horizontal) */
  window: V3; out: V3;
  /** street lamp: offset outside along `out` (m) and below the window (m) */
  lamp?: { out?: number; down?: number; side?: number } | false;
  seed?: number;
};
export const nightCity = (_ctx: KitCtx, o: NightCityOpts): Built => {
  const g = new THREE.Group(); g.name = "nightCity";
  const out = new THREE.Vector3(...o.out).setY(0).normalize(), side = new THREE.Vector3(-out.z, 0, out.x), W = new THREE.Vector3(...o.window);
  const R = rng(o.seed ?? 51);
  const layers = [{ d: 22, n: 5, h: [9, 22], w: [7, 12], lit: 0.4 }, { d: 55, n: 8, h: [14, 40], w: [10, 18], lit: 0.32 }, { d: 140, n: 12, h: [20, 70], w: [16, 30], lit: 0.25 }];
  const bodyM = pbr({ color: [0.06, 0.065, 0.075], rough: 0.85, peel: 0 });
  const blinks: { m: THREE.MeshBasicMaterial; ph: number }[] = [];
  for (const L of layers) {
    let s = -L.n / 2 * (L.w[1] * 0.9);
    for (let i = 0; i < L.n; i++) {
      const w = L.w[0] + R() * (L.w[1] - L.w[0]), h = L.h[0] + R() * (L.h[1] - L.h[0]), d = L.d + R() * L.d * 0.25;
      const c = W.clone().addScaledVector(out, d).addScaledVector(side, s + w / 2); s += w * (0.95 + R() * 0.4);
      const floors = Math.round(h / 3), cols = Math.max(2, Math.round(w / 2.2));
      const fm = new THREE.MeshBasicMaterial({ map: facadeTex(Math.floor(R() * 1e6), cols, floors, L.lit), toneMapped: true, fog: true });
      fm.color.setScalar(L.d > 100 ? 0.7 : 1.0); fm.customProgramCacheKey = () => "home:cityfacade";
      const b = new THREE.Group();
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fm); face.position.set(0, h / 2 - 8, -0.01); face.rotation.y = Math.PI;   // faces the window (-out)
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), bodyM); box.position.set(0, h / 2 - 8, w * 0.4);
      b.add(box, face); b.position.copy(c); b.lookAt(c.clone().add(out)); g.add(b);
      if (L.d > 50 && R() < 0.35) {
        const bm = glow([1, 0.12, 0.08], 6); blinks.push({ m: bm, ph: R() * 2 });
        const bl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bm); bl.position.set(0, h - 8 + 0.4, 0); b.add(bl);
      }
    }
  }
  // the street below: a dark ground plane + a row of tiny sodium dots receding
  const gm = pbr({ color: [0.05, 0.05, 0.055], rough: 0.9, peel: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), gm); ground.rotation.x = -Math.PI / 2; ground.position.set(W.x, W.y - 9, W.z).addScaledVector(out, 150); g.add(ground);
  for (let i = 0; i < 14; i++) { const p = W.clone().addScaledVector(out, 12 + i * 9).addScaledVector(side, -6 + (i % 2) * 12); p.y = W.y - 4.5; const d = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), glow(kelvin(2100).toArray() as C3, 5)); d.position.copy(p); g.add(d); }
  // the street lamp right below the window: a glowing head on a dark pole
  let lampHead: THREE.Vector3 | null = null;
  if (o.lamp !== false) {
    const lo = o.lamp ?? {};
    lampHead = W.clone().addScaledVector(out, lo.out ?? 3.2).addScaledVector(side, lo.side ?? 1.4); lampHead.y = W.y - (lo.down ?? 0.9);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 9, 10), bodyM); pole.position.copy(lampHead).setY(lampHead.y - 4.6); g.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), glow(kelvin(2100).toArray() as C3, 9)); head.position.copy(lampHead); g.add(head);
  }
  return { object: g, update: (t) => { for (const b of blinks) b.m.color.setRGB(1, 0.12, 0.08).multiplyScalar(((t + b.ph) % 2) < 0.25 ? 6 : 0.15); } };
};

// ================================================================ a breathing curtain
export type CurtainOpts = {
  /** the top-centre of the panel (world), its width / drop, the wall's inward normal yaw (panel faces +z local) */
  top: V3; yaw: number; w?: number; h?: number;
  color?: C3; pleats?: number;
  /** breathing: amplitude (m) and rate (Hz); gust times add swells */
  amp?: number; hz?: number; gusts?: number[];
  sheer?: boolean; seed?: number;
};
export const curtain = (_ctx: KitCtx, o: CurtainOpts): Built => {
  const W = o.w ?? 0.6, H = o.h ?? 1.5, NX = 40, NY = 24, pleats = o.pleats ?? 7;
  const geo = new THREE.PlaneGeometry(W, H, NX, NY); geo.translate(0, -H / 2, 0);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute, base = Float32Array.from(pos.array as Float32Array);
  const m = o.sheer
    ? new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...(o.color ?? [0.95, 0.93, 0.88]), THREE.SRGBColorSpace), roughness: 0.95, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })
    : pbr({ color: o.color ?? [0.62, 0.5, 0.38], rough: 0.92, peel: 0.8, tile: 0.02, normalScale: 1.0, side: THREE.DoubleSide });
  if (o.sheer) m.customProgramCacheKey = () => "home:sheer";
  const c = mesh(geo, m, !o.sheer, "curtain"); c.position.set(...o.top); c.rotation.y = o.yaw;
  const amp = o.amp ?? 0.018, hz = o.hz ?? 0.22, gusts = o.gusts ?? [], seed = o.seed ?? 3;
  const set = (t: number) => {
    const g = gusts.reduce((a, t0) => a + (t > t0 ? Math.exp(-(t - t0) * 1.2) * Math.sin((t - t0) * 2.4) : 0), 0);
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], u = x / W + 0.5, v = -y / H;       // v: 0 at the rail .. 1 at the hem
      const pleat = 0.022 * Math.sin(u * Math.PI * 2 * pleats + seed) * (1 - 0.3 * v);
      const breathe = (amp * Math.sin(t * hz * 6.283 + u * 2.1 + seed) + 0.6 * amp * Math.sin(t * hz * 1.7 * 6.283 + v * 2.6 + u) + 0.05 * g) * v * v;
      pos.setXYZ(i, x + 0.01 * v * Math.sin(t * hz * 3.1 + seed), y, pleat + breathe);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  set(0);
  // a curtain rail with rings
  const railM = pbr({ color: [0.25, 0.22, 0.2], rough: 0.4, metal: 0.6, peel: 0 });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, W + 0.2, 10), railM); rail.rotation.z = Math.PI / 2; rail.position.set(0, 0.03, 0.0); c.add(rail);
  let last = -1;
  return { object: c, update: (t) => { if (t !== last) { last = t; set(t); } } };
};

// ================================================================ headlights through the window
export type SweepOpts = { from: V3; ceilingY: number; path: [V3, V3]; passes: { t: number; dur?: number }[]; kelvin?: number; lumens?: number };
export const headlightSweep = (ctx: KitCtx, o: SweepOpts): Built & { lamp: Practical | null } => {
  const g = new THREE.Group(); g.name = "headlightSweep";
  if (!ctx.practical) return { object: g, lamp: null };
  const p = ctx.practical({ kind: "spot", pos: o.from, target: o.path[0], kelvin: o.kelvin ?? 4300, lumens: o.lumens ?? 9000, angle: 0.22, penumbra: 0.9, shadow: false, bulb: false, range: 9 });
  g.add(p.object);
  const sp = p.light as THREE.SpotLight, a = new THREE.Vector3(...o.path[0]), b = new THREE.Vector3(...o.path[1]);
  return { object: g, lamp: p, update: (t) => {
    let on = 0, k = 0;
    for (const ps of o.passes) { const d = ps.dur ?? 1.3, u = (t - ps.t) / d; if (u > 0 && u < 1) { on = Math.sin(u * Math.PI) ** 1.5; k = u; } }
    sp.target.position.lerpVectors(a, b, k); sp.target.updateMatrixWorld();
    // never fully off: CORE hides a lamp at intensity ~0, which changes the light count = every material recompiles
    p.set(Math.max(on, 2e-4));
  } };
};

// ================================================================ a moth round a lamp
export const moth = (_ctx: KitCtx, o: { center: V3; r?: number; seed?: number }): Built => {
  const g = new THREE.Group(); g.name = "moth";
  const wingM = pbr({ color: [0.62, 0.55, 0.44], rough: 0.9, peel: 0, side: THREE.DoubleSide });
  const body = mesh(new THREE.CapsuleGeometry(0.0022, 0.012, 4, 8), pbr({ color: [0.35, 0.3, 0.24], rough: 0.9, peel: 0 }), true); body.rotation.x = Math.PI / 2;
  const wing = () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.006, 0.004, 0.016, 0.004, 0.017, -0.004); s.bezierCurveTo(0.012, -0.01, 0.004, -0.009, 0, -0.004); return new THREE.ShapeGeometry(s); };
  const wl = new THREE.Group(), wr = new THREE.Group();
  const ml = mesh(wing(), wingM, true); ml.rotation.x = -Math.PI / 2; wl.add(ml);
  const mr = mesh(wing(), wingM, true); mr.rotation.x = -Math.PI / 2; mr.scale.x = -1; wr.add(mr);
  g.add(body, wl, wr);
  const C = new THREE.Vector3(...o.center), r = o.r ?? 0.1, sd = o.seed ?? 7;
  const pathAt = (t: number, v: THREE.Vector3) => {
    const a = t * 3.1 + 0.9 * Math.sin(t * 1.7 + sd) + 0.4 * Math.sin(t * 5.3);
    const rr = r * (0.75 + 0.35 * Math.sin(t * 2.3 + sd * 2));
    return v.set(C.x + Math.cos(a) * rr, C.y + 0.04 * Math.sin(t * 4.1 + sd) + 0.02 * Math.sin(t * 9.7), C.z + Math.sin(a) * rr);
  };
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
  return { object: g, update: (t) => {
    pathAt(t, p0); pathAt(t + 0.02, p1); g.position.copy(p0); g.lookAt(p1);
    const f = Math.sin(t * 2 * Math.PI * 13 + hash1(sd)) * 0.9; wl.rotation.z = f; wr.rotation.z = -f;
  } };
};

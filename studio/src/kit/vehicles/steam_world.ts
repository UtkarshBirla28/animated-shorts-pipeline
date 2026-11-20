// kit/vehicles (TRAIN owner): the world a 1910 Japanese steam train runs through, as a TREADMILL (the train stands
// still at the origin, the world streams past toward +Z by `dist(t)` metres): a single line on a low embankment with
// wooden sleepers; green rice paddies (some flooded, mirroring the sky) cut by earth bunds; a line of wooden telegraph
// poles with sagging wires (the period's lineside); farmhouses with thatched hip roofs in groves of pine and cedar;
// blue-green hills; tall white clouds; a lower-quadrant SEMAPHORE signal (the generic British form Japanese railways
// used then: a red arm with a white band pointing LEFT of the post, lowered 45 deg = clear, a spectacle with red and
// green glasses and an oil lamp behind it) standing at the left of the line and coming closer; a flock of birds.
// Everything is a pure function of film time. Frame: y = 0 at the top of rail, our line at x = 0, the train runs -Z.
//   const w = await steamWorld(ctx, { dist: (t) => 11 * t, signalAt: 120, signalArm: (t) => 1 });  g.add(w.object)
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";
import { birds } from "../fx/birds";

export type SteamWorldOpts = {
  /** metres the train has run at film time t (the world moves +Z by this) */
  dist: (t: number) => number;
  /** the signal's distance ahead of the loco's front at t = 0 (m); null = no signal. It approaches by dist(t) */
  signalAt?: number | null;
  /** OR: the signal's distance ahead of the loco's front at film time t (wins over signalAt) */
  signalAhead?: (t: number) => number;
  /** the arm: 0 = horizontal (stop), 1 = lowered 45 deg (clear); default clear */
  signalArm?: (t: number) => number;
  /** treadmill period for the repeating dressing (m) */
  period?: number;
  seed?: number;
  birds?: boolean;
};
const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; return t;
};
const wrapZ = (z: number, P: number) => ((((z + P / 2) % P) + P) % P) - P / 2;
export const GROUND_Y = -1.15;

export const steamWorld = async (ctx: KitCtx, o: SteamWorldOpts): Promise<Built> => {
  void ctx;
  const g = new THREE.Group(); g.name = "steam-world";
  const R = rng(o.seed ?? 5), P = o.period ?? 480;
  const ups: ((t: number) => void)[] = [];

  // ---------------- the rice paddies (one canvas = 96 x 96 m, tiled; the UV scrolls with the run)
  const TILE = 96;
  const paddyCol = canvasTex(1024, 1024, (c) => {
    const r2 = rng(17);
    c.fillStyle = "#6c5a3a"; c.fillRect(0, 0, 1024, 1024);
    const greens = ["#4fae3c", "#5cba44", "#6fc24c", "#3f9c3a", "#7fca52", "#58b040", "#8ccf5a"];
    // plots in rows of varied width (bunds between them)
    let y = 0;
    while (y < 1024) { const h = 120 + Math.floor(r2() * 140); let x = 0;
      while (x < 1024) { const w = 150 + Math.floor(r2() * 230), flooded = r2() < 0.22;
        const col = greens[Math.floor(r2() * greens.length)];
        c.fillStyle = flooded ? "#7f9fb8" : col; c.fillRect(x + 6, y + 6, Math.min(w, 1024 - x) - 12, Math.min(h, 1024 - y) - 12);
        // rice rows: fine stripes (and on the flooded plots: young shoots in rows over the water)
        c.strokeStyle = flooded ? "rgba(90,170,70,0.85)" : "rgba(30,90,30,0.28)"; c.lineWidth = flooded ? 2 : 2.5;
        for (let k = x + 10; k < x + w - 8; k += 9) { c.beginPath(); c.moveTo(k, y + 8); c.lineTo(k, y + h - 8); c.stroke(); }
        if (!flooded) for (let k = 0; k < 60; k++) { c.fillStyle = `rgba(${150 + r2() * 60},${200 + r2() * 40},${60 + r2() * 40},0.25)`; c.fillRect(x + r2() * w, y + r2() * h, 6, 3); }
        x += w; }
      y += h; }
    // bunds: lighter green-brown edges
    c.globalCompositeOperation = "multiply"; c.fillStyle = "rgba(255,240,210,0.0)"; c.fillRect(0, 0, 1, 1); c.globalCompositeOperation = "source-over";
  });
  const paddyRough = canvasTex(1024, 1024, (c) => {
    // the same plot layout (same seed) as roughness: flooded = smooth (it mirrors the sky)
    const r2 = rng(17); c.fillStyle = "#e6e6e6"; c.fillRect(0, 0, 1024, 1024);
    let y = 0;
    while (y < 1024) { const h = 120 + Math.floor(r2() * 140); let x = 0;
      while (x < 1024) { const w = 150 + Math.floor(r2() * 230), flooded = r2() < 0.22; r2();
        c.fillStyle = flooded ? "#1c1c1c" : "#e0e0e0"; c.fillRect(x + 6, y + 6, Math.min(w, 1024 - x) - 12, Math.min(h, 1024 - y) - 12);
        if (!flooded) for (let k = 0; k < 60; k++) { r2(); r2(); r2(); r2(); r2(); }
        x += w; }
      y += h; }
  }, false);
  const GW = 1600;
  const groundMat = new THREE.MeshStandardMaterial({ map: paddyCol, roughnessMap: paddyRough, roughness: 1, metalness: 0, envMapIntensity: 1.0 });
  for (const t of [paddyCol, paddyRough]) t.repeat.set(GW / TILE, GW / TILE);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GW), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = GROUND_Y; ground.receiveShadow = true; g.add(ground);
  ups.push((t) => { const off = o.dist(t) / TILE; paddyCol.offset.y = off; paddyRough.offset.y = off; });

  // ---------------- the embankment + ballast (uniform along Z: only its texture scrolls) + rails
  const ballastTex = canvasTex(256, 256, (c) => { const r2 = rng(9); c.fillStyle = "#857a6c"; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = 90 + r2() * 90; c.fillStyle = `rgb(${v + 12},${v + 4},${v - 8})`; c.fillRect(r2() * 256, r2() * 256, 2 + r2() * 4, 2 + r2() * 3); } });
  const grassTex = canvasTex(256, 256, (c) => { const r2 = rng(13); c.fillStyle = "#4f9a34"; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(${60 + r2() * 80},${130 + r2() * 90},${30 + r2() * 40},0.7)`; c.fillRect(r2() * 256, r2() * 256, 1.5, 5 + r2() * 6); } });
  const L = 900;
  {
    // profile: ballast shoulder (x +-1.7 at y -0.2) -> grass slope down to the paddies (x +-4.2 at GROUND_Y)
    const mk = (pts: [number, number][], tex: THREE.Texture, rep: number) => {
      const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2);
      // planar UVs: x across, z along
      const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / 2 + pos.getY(i) / 2; uv[i * 2 + 1] = pos.getZ(i) / 2; }
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      tex.repeat.set(rep, rep);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })); m.receiveShadow = true; return m;
    };
    g.add(mk([[-1.75, -0.2], [1.75, -0.2], [2.05, -0.42], [-2.05, -0.42]], ballastTex, 1));
    g.add(mk([[-2.05, -0.42], [2.05, -0.42], [4.4, GROUND_Y - 0.02], [-4.4, GROUND_Y - 0.02]], grassTex, 1));
    ups.push((t) => { const off = -o.dist(t) / 2; ballastTex.offset.y = off; grassTex.offset.y = off; });
  }
  // rails (flat-bottom on wooden sleepers; 1,067 mm)
  const railMat = new THREE.MeshStandardMaterial({ color: "#8a8c90", roughness: 0.35, metalness: 1 });
  const rustMat = new THREE.MeshStandardMaterial({ color: "#6a4a32", roughness: 0.85, metalness: 0.2 });
  for (const sx of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, L), railMat); head.position.set(sx * 0.5335 + sx * 0.03, -0.02, 0); g.add(head);
    const web = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, L), rustMat); web.position.set(sx * 0.5635, -0.075, 0); g.add(web);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.015, L), rustMat); foot.position.set(sx * 0.5635, -0.118, 0); g.add(foot);
  }
  // wooden sleepers (instanced, wrapping)
  {
    const SP = 0.62, n = Math.floor(260 / SP), Ls = n * SP;
    const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2.1, 0.13, 0.2), new THREE.MeshStandardMaterial({ color: "#5a4632", roughness: 0.9 }), n);
    sl.castShadow = false; sl.receiveShadow = true; g.add(sl);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    for (let i = 0; i < n; i++) { col.setHSL(0.08, 0.3, 0.2 + 0.08 * R()); sl.setColorAt(i, col); }
    ups.push((t) => { const d = o.dist(t); for (let i = 0; i < n; i++) { m.makeTranslation(0, -0.19, wrapZ(i * SP + d, Ls) - 40); sl.setMatrixAt(i, m); } sl.instanceMatrix.needsUpdate = true; });
  }

  // ---------------- telegraph poles + wires (a repeating unit = one pole + its span forward)
  {
    const SPAN = 42, n = Math.ceil(420 / SPAN), Lp = n * SPAN;
    const wood = new THREE.MeshStandardMaterial({ color: "#6e5136", roughness: 0.85 }), china = new THREE.MeshStandardMaterial({ color: "#f4f2ee", roughness: 0.3 });
    const wireMat = new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.6, metalness: 0.4 });
    const unit = () => {
      const u = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 8.0, 10), wood); pole.position.y = GROUND_Y + 4.0; pole.castShadow = true; u.add(pole);
      for (const [y, w] of [[GROUND_Y + 7.6, 1.5], [GROUND_Y + 7.0, 1.2]] as [number, number][]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.1), wood); arm.position.y = y; arm.castShadow = true; u.add(arm);
        for (let k = 0; k < (w > 1.3 ? 4 : 3); k++) { const xi = -w / 2 + 0.12 + k * ((w - 0.24) / ((w > 1.3 ? 4 : 3) - 1));
          const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 8), china); ins.position.set(xi, y + 0.11, 0); u.add(ins);
          // the wire to the next pole (toward -Z), a sagging curve
          const pts: THREE.Vector3[] = []; for (let s = 0; s <= 12; s++) { const f = s / 12; pts.push(new THREE.Vector3(xi, y + 0.17 - 0.55 * 4 * f * (1 - f), -f * SPAN)); }
          const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.008, 4, false), wireMat); u.add(wire); }
      }
      return u;
    };
    const units = Array.from({ length: n }, () => { const u = unit(); u.position.x = 5.6; g.add(u); return u; });   // the RIGHT side: the left (the driver's side, the event lens) stays clear
    ups.push((t) => { const d = o.dist(t); units.forEach((u, i) => { u.position.z = wrapZ(i * SPAN + d, Lp) - 60; }); });
  }

  // ---------------- trees (pine, cedar, round broadleaf), farmhouses with thatched roofs: instanced, wrapping
  type Inst = { x: number; z: number; s: number; ry: number; c: THREE.Color };
  const spots = (count: number, xMin: number, xMax: number, clump = 0.6): Inst[] => {
    const out: Inst[] = []; let cx = 0, cz = 0;
    for (let i = 0; i < count; i++) {
      if (i === 0 || R() > clump) { const side = R() < 0.55 ? -1 : 1; cx = side * (xMin + R() * (xMax - xMin)); cz = (R() - 0.5) * P; }
      out.push({ x: cx + (R() - 0.5) * 14, z: cz + (R() - 0.5) * 14, s: 0.75 + R() * 0.6, ry: R() * 6.28, c: new THREE.Color() });
    }
    return out;
  };
  const instanced = (geo: THREE.BufferGeometry, mat: THREE.Material, list: Inst[], baseY: number, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length); im.castShadow = shadow; im.receiveShadow = true;
    list.forEach((s, i) => im.setColorAt(i, s.c)); g.add(im);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    ups.push((t) => { const d = o.dist(t); list.forEach((s, i) => { e.set(0, s.ry, 0); q.setFromEuler(e); m.compose(new THREE.Vector3(s.x, baseY, wrapZ(s.z + d, P) - 80), q, new THREE.Vector3(s.s, s.s, s.s)); im.setMatrixAt(i, m); }); im.instanceMatrix.needsUpdate = true; });
    return im;
  };
  {
    const leaf = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 }), bark = new THREE.MeshStandardMaterial({ color: "#5a4030", roughness: 0.9 });
    // a Japanese black pine: a leaning trunk + 4 flat dark-green pads
    const pine = (() => { const parts: THREE.BufferGeometry[] = []; const tr = new THREE.CylinderGeometry(0.18, 0.32, 7, 7); tr.translate(0, 3.5, 0); tr.rotateZ(0.12);
      const pads: THREE.BufferGeometry[] = []; for (const [x, y, z, s] of [[0.6, 7.2, 0, 2.6], [-1.4, 5.8, 0.6, 2.1], [1.6, 5.2, -0.8, 1.9], [0.2, 8.6, 0.2, 1.8]] as number[][]) { const p = new THREE.SphereGeometry(1, 10, 6); p.scale(s, s * 0.42, s); p.translate(x, y, z); pads.push(p); }
      parts.push(tr); return { trunk: tr, pads: mergeAll(pads) }; })();
    const cedar = (() => { const c = new THREE.ConeGeometry(2.2, 12, 9); c.translate(0, 8, 0); const t = new THREE.CylinderGeometry(0.2, 0.3, 3, 6); t.translate(0, 1.5, 0); return { trunk: t, crown: c }; })();
    const round = (() => { const s = new THREE.IcosahedronGeometry(3.4, 1); s.scale(1, 0.85, 1); s.translate(0, 5.2, 0); const t = new THREE.CylinderGeometry(0.22, 0.32, 3.5, 6); t.translate(0, 1.75, 0); return { trunk: t, crown: s }; })();
    const pines = spots(70, 14, 140, 0.55), cedars = spots(90, 20, 220, 0.75), rounds = spots(80, 16, 180, 0.6);
    for (const s of pines) s.c.setHSL(0.33 + 0.03 * R(), 0.45, 0.2 + 0.05 * R());
    for (const s of cedars) s.c.setHSL(0.3 + 0.04 * R(), 0.5, 0.17 + 0.05 * R());
    for (const s of rounds) s.c.setHSL(0.24 + 0.06 * R(), 0.6, 0.3 + 0.08 * R());
    instanced(pine.trunk, bark, pines, GROUND_Y); instanced(pine.pads, leaf, pines, GROUND_Y);
    instanced(cedar.trunk, bark, cedars, GROUND_Y); instanced(cedar.crown, leaf, cedars, GROUND_Y);
    instanced(round.trunk, bark, rounds, GROUND_Y); instanced(round.crown, leaf, rounds, GROUND_Y);
    // farmhouses (minka): plaster + dark timber walls, a steep thatched hip roof with a dark ridge
    const houses = spots(14, 30, 160, 0.3); for (const s of houses) { s.c.setRGB(1, 1, 1); s.s = 0.9 + 0.3 * R(); }
    const wall = new THREE.BoxGeometry(9, 3, 6); wall.translate(0, 1.5, 0);
    const roof = new THREE.ConeGeometry(6.6, 4.8, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1.25, 1, 0.85); roof.translate(0, 5.3, 0);
    const ridge = new THREE.BoxGeometry(5.6, 0.45, 0.7); ridge.translate(0, 7.55, 0);
    const plaster = new THREE.MeshStandardMaterial({ color: "#efe8dc", roughness: 0.9 }), thatch = new THREE.MeshStandardMaterial({ color: "#a98448", roughness: 1 }), dark = new THREE.MeshStandardMaterial({ color: "#3a2a20", roughness: 0.9 });
    instanced(wall, plaster, houses, GROUND_Y); instanced(roof, thatch, houses, GROUND_Y); instanced(ridge, dark, houses, GROUND_Y);
    // timber frame bands on the walls
    const beams = new THREE.BoxGeometry(9.08, 0.25, 6.08); beams.translate(0, 2.9, 0); instanced(beams, dark, houses, GROUND_Y, false);
  }

  // ---------------- far hills (static: no parallax at 1-2 km) + clouds
  {
    const seg = 220, geo = new THREE.BufferGeometry(), pos: number[] = [], idx: number[] = [];
    const rings = [[1100, 0], [1500, 1]] as const;
    for (const [rad, layer] of rings) { const base = pos.length / 3;
      for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; const h = 60 + 70 * Math.abs(Math.sin(a * 3 + layer)) + 45 * Math.sin(a * 11 + layer * 2) ** 2 + 25 * Math.sin(a * 29) ** 2 + (layer ? 80 : 0);
        pos.push(Math.cos(a) * rad, GROUND_Y - 5, Math.sin(a) * rad, Math.cos(a) * rad, GROUND_Y + h, Math.sin(a) * rad); }
      for (let i = 0; i < seg; i++) { const a0 = base + i * 2; idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); } }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const hills = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#3d7a4e", roughness: 1, side: THREE.DoubleSide })); g.add(hills);
    const cloudTex = canvasTex(512, 256, (c) => { const r2 = rng(29);
      for (let i = 0; i < 46; i++) { const x = 70 + r2() * 370, y = 120 + (r2() - 0.3) * 70 - Math.max(0, 1 - Math.abs(x - 256) / 200) * 60, r = 30 + r2() * 55;
        const gr = c.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.7, "rgba(246,247,252,0.9)"); gr.addColorStop(1, "rgba(230,236,248,0)");
        c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      // a soft blue-grey underside
      const sh = c.createLinearGradient(0, 120, 0, 256); sh.addColorStop(0, "rgba(140,155,185,0)"); sh.addColorStop(1, "rgba(140,155,185,0.55)"); c.globalCompositeOperation = "source-atop"; c.fillStyle = sh; c.fillRect(0, 0, 512, 256); });
    cloudTex.wrapS = cloudTex.wrapT = THREE.ClampToEdgeWrapping;
    const cm = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.15, 1.15, 1.18) });
    for (let i = 0; i < 16; i++) { const a = R() * Math.PI * 2, rad = 600 + R() * 500, w = 260 + R() * 260;
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), cm); cl.position.set(Math.cos(a) * rad, 140 + R() * 160, Math.sin(a) * rad); cl.lookAt(0, cl.position.y * 0.6, 0); cl.renderOrder = -1; g.add(cl); }
  }

  // ---------------- the SEMAPHORE signal (left of the line), approaching
  if (o.signalAt != null || o.signalAhead) {
    const sg = new THREE.Group(); sg.name = "semaphore";
    const white = new THREE.MeshStandardMaterial({ color: "#f2efe8", roughness: 0.6 }), black = new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.6 });
    const red = new THREE.MeshPhysicalMaterial({ color: "#c41f17", roughness: 0.4, clearcoat: 0.6 });
    const H = 8.2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, H, 0.26), white); post.position.y = GROUND_Y + H / 2; post.castShadow = true; sg.add(post);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 4), black); cap.rotation.y = Math.PI / 4; cap.position.y = GROUND_Y + H + 0.22; sg.add(cap);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), black); base.position.y = GROUND_Y + 0.25; sg.add(base);
    // ladder on the track side
    for (const dx of [-0.16, 0.16]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, H - 1.4, 0.03), black); r.position.set(0.32 + dx * 0, GROUND_Y + (H - 1.4) / 2 + 0.4, dx); sg.add(r); }
    for (let i = 0; i < 16; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.32), black); rung.position.set(0.32, GROUND_Y + 0.8 + i * 0.4, 0); sg.add(rung); }
    // the arm: pivots on the post's face toward the train (-Z side), points LEFT (-X) of the post
    const pivot = new THREE.Group(); pivot.position.set(0, GROUND_Y + H - 1.0, -0.17); sg.add(pivot);
    const arm = new THREE.Group(); pivot.add(arm);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.26, 0.04), red); blade.position.x = -0.82; blade.castShadow = true; arm.add(blade);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.262, 0.045), white); band.position.x = -1.2; arm.add(band);
    // spectacle (counterweight side, right of the pivot): two glasses, red above green
    const spec = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.05), black); spec.position.set(0.24, -0.28, 0); arm.add(spec);
    const glassR = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.12, 0.08), toneMapped: false })); glassR.position.set(0.28, -0.12, -0.03); glassR.rotation.y = Math.PI; arm.add(glassR);
    const glassG = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 1.2, 0.6), toneMapped: false })); glassG.position.set(0.28, -0.44, -0.03); glassG.rotation.y = Math.PI; arm.add(glassG);
    // the lamp case behind the spectacle (on the post)
    const lampCase = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.26), black); lampCase.position.set(0.28, GROUND_Y + H - 1.3, 0.08); sg.add(lampCase);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 8), black); chimney.position.set(0.28, GROUND_Y + H - 1.03, 0.08); sg.add(chimney);
    // a balance-weight lever + wire down the post
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), black); lever.position.set(0.1, GROUND_Y + 1.4, -0.2); sg.add(lever);
    sg.position.x = -3.1; g.add(sg);
    const armK = o.signalArm ?? (() => 1);
    ups.push((t) => { sg.position.z = o.signalAhead ? -o.signalAhead(t) : -(o.signalAt as number) + o.dist(t); arm.rotation.z = (Math.PI / 4) * Math.max(0, Math.min(1, armK(t))); sg.visible = sg.position.z < 60; });
  }

  // ---------------- THE NEAR LEFT SIDE (the event lens's foreground): rows of young rice in the paddy beside the line,
  // reeds + wild flowers at the embankment foot, a raised earth path with farmers in straw hats, a small red torii.
  // All scroll with the run (a 64 m loop): at final quality the shutter streaks them = speed
  {
    const LOOP = 64, wz = (z: number, d: number) => wrapZ(z + d, LOOP) - 18;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    // rice tufts: 7 thin blades fanning from a point
    const tuft = (() => { const P2: number[] = []; for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, lean = 0.18 + 0.1 * (k % 2), h = 0.32 + 0.08 * (k % 3);
        const tx = Math.cos(a) * lean * h, tz = Math.sin(a) * lean * h, w = 0.012;
        P2.push(-w * Math.sin(a), 0, w * Math.cos(a), w * Math.sin(a), 0, -w * Math.cos(a), tx, h, tz); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(P2, 3)); gg.computeVertexNormals(); return gg; })();
    const rows: { x: number; z: number; s: number; c: THREE.Color }[] = [];
    for (let x = -4.9; x > -15.5; x -= 0.34) for (let z = 0; z < LOOP; z += 0.3) rows.push({ x: x + (R() - 0.5) * 0.04, z: z + (R() - 0.5) * 0.05, s: 0.8 + 0.5 * R(), c: new THREE.Color().setHSL(0.25 + 0.05 * R(), 0.65, 0.33 + 0.1 * R()) });
    const rice = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7, side: THREE.DoubleSide }), rows.length);
    rows.forEach((r, i) => rice.setColorAt(i, r.c)); rice.receiveShadow = true; g.add(rice);
    // the water between the rows (a flooded strip mirroring the sky)
    const water = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 400), new THREE.MeshStandardMaterial({ color: "#5d7f6a", roughness: 0.06, metalness: 0.0 }));
    water.rotation.x = -Math.PI / 2; water.position.set(-10.25, GROUND_Y + 0.02, 0); water.receiveShadow = true; g.add(water);
    // the raised path between paddies (uniform along Z)
    const path = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 400), new THREE.MeshStandardMaterial({ color: "#8a6e48", roughness: 0.95 }));
    path.position.set(14.5, GROUND_Y + 0.17, 0); path.receiveShadow = true; g.add(path);
    const pathGrass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 400), new THREE.MeshStandardMaterial({ color: "#5aa03a", roughness: 0.95 }));
    pathGrass.position.set(14.5, GROUND_Y + 0.04, 0); g.add(pathGrass);
    // reeds + wild flowers at the embankment foot (left)
    const reedGeo = new THREE.CylinderGeometry(0.006, 0.012, 1, 4); reedGeo.translate(0, 0.5, 0);
    const reeds: { x: number; z: number; h: number; lean: number }[] = []; for (let i = 0; i < 500; i++) reeds.push({ x: -4.4 - R() * 0.9, z: R() * LOOP, h: 0.5 + R() * 0.7, lean: (R() - 0.5) * 0.4 });
    const reedIM = new THREE.InstancedMesh(reedGeo, new THREE.MeshStandardMaterial({ color: "#7ea53e", roughness: 0.8 }), reeds.length); g.add(reedIM);
    const flowerGeo = new THREE.IcosahedronGeometry(0.045, 0);
    const flowers: { x: number; z: number; y: number; c: THREE.Color }[] = []; const fc = ["#ffd23a", "#ffffff", "#ff8fb1", "#ff5a3c", "#c9a2ff"];
    for (let i = 0; i < 420; i++) flowers.push({ x: -4.3 - R() * 1.2, z: R() * LOOP, y: GROUND_Y + 0.15 + R() * 0.5, c: new THREE.Color(fc[Math.floor(R() * fc.length)]) });
    const flowerIM = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.06 }), flowers.length);
    flowers.forEach((f, i) => flowerIM.setColorAt(i, f.c)); g.add(flowerIM);
    // farmers on the path: an indigo jacket, white trousers, a wide conical straw hat (stand-ins; CAST may replace)
    const farmerG = new THREE.Group();
    const mkFarmer = (col: string) => { const f = new THREE.Group();
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.8, 8), new THREE.MeshStandardMaterial({ color: "#efe9dc", roughness: 0.9 })); legs.position.y = 0.4; f.add(legs);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.62, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 })); body.position.y = 1.1; f.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: "#e8c4a0", roughness: 0.8 })); head.position.y = 1.52; f.add(head);
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.24, 18), new THREE.MeshStandardMaterial({ color: "#e0bf6a", roughness: 0.9 })); hat.position.y = 1.7; f.add(hat);
      f.traverse((o2) => { (o2 as THREE.Mesh).castShadow = true; }); return f; };
    const farmers = [mkFarmer("#2c3f86"), mkFarmer("#3c5a9a"), mkFarmer("#8a3a2a")].map((f, i) => { f.position.set(14.5 + (i - 1) * 0.3, GROUND_Y + 0.35, 0); farmerG.add(f); return { f, z0: 6 + i * 3.1, yaw: [-1.2, -0.7, -1.6][i] }; });
    g.add(farmerG);
    // a small red torii on the far side of the path (a village shrine)
    const torii = new THREE.Group(); const red = new THREE.MeshStandardMaterial({ color: "#d1341f", roughness: 0.55 }), blk = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.6 });
    for (const sx of [-1, 1]) { const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 10), red); p2.position.set(sx * 1.2, 1.6, 0); torii.add(p2); }
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.3), blk); kasagi.position.y = 3.25; torii.add(kasagi);
    const shimaki = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.16, 0.26), red); shimaki.position.y = 3.05; torii.add(shimaki);
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 0.14), red); nuki.position.y = 2.55; torii.add(nuki);
    torii.traverse((o2) => { (o2 as THREE.Mesh).castShadow = true; }); torii.position.set(18.0, GROUND_Y, 0); torii.rotation.y = Math.PI / 2; g.add(torii);
    ups.push((t) => {
      const d = o.dist(t);
      rows.forEach((r, i) => { v.set(r.x, GROUND_Y, wz(r.z, d)); e.set(0, r.z * 7.3, 0); q.setFromEuler(e); sc.setScalar(r.s); m.compose(v, q, sc); rice.setMatrixAt(i, m); }); rice.instanceMatrix.needsUpdate = true;
      reeds.forEach((r, i) => { v.set(r.x, GROUND_Y, wz(r.z, d)); e.set(r.lean, 0, r.lean * 0.5 + 0.08 * Math.sin(t * 3 + r.z)); q.setFromEuler(e); sc.set(1, r.h, 1); m.compose(v, q, sc); reedIM.setMatrixAt(i, m); }); reedIM.instanceMatrix.needsUpdate = true;
      flowers.forEach((f, i) => { m.makeTranslation(f.x, f.y, wz(f.z, d)); flowerIM.setMatrixAt(i, m); }); flowerIM.instanceMatrix.needsUpdate = true;
      for (const F2 of farmers) { F2.f.position.z = wz(F2.z0, d) - 6; F2.f.rotation.y = F2.yaw; }
      torii.position.z = wz(14, d) - 10;
    });
  }
  // ---------------- birds over the paddies
  let fl: Built | null = null;
  if (o.birds ?? true) {
    fl = birds(ctx, { flock: { path: { center: [-40, 18, -60], radius: 35, period: 24 }, count: 14, spread: [10, 3, 10] }, size: 0.32, color: "#2a2a2e", seed: 7 });
    g.add(fl.object);
  }
  return { object: g, update: (t, cam) => { for (const u of ups) u(t); fl?.update?.(t, cam); } };
};
const mergeAll = (list: THREE.BufferGeometry[]) => {
  // small merge without the utils import (all non-indexed, same attributes)
  const geos = list.map((x) => (x.index ? x.toNonIndexed() : x));
  const n = geos.reduce((s, x) => s + x.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let k = 0;
  for (const x of geos) { pos.set(x.attributes.position.array as Float32Array, k * 3); nor.set(x.attributes.normal.array as Float32Array, k * 3); k += x.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); return out;
};
export type { V3 };

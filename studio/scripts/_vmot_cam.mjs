// Camera motion on the VIDEO clock for the CAM sandbox (run with cwd = studio).
// usage: node vmot.mjs frames a-b        per video frame: layers, picture f, speed %/f (max of dx%W, dy%H, zoom%)
//        node vmot.mjs beats             BEAT table picture -> video
//        node vmot.mjs shots             per-shot stats on the video clock (still / drift / move, longest still run)
//        node vmot.mjs proj '<expr>'     expr returns [{vf, id?, pts:{name:[x,y,z]}}] -> screen px at 1080x1920 (video frame)
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const tmp = path.resolve("out/_vmot_bundle_cam" + (process.env.STORY_DIR ? "_o" : "") + ".mjs");
const SD = (process.env.STORY_DIR || "./src/videos/antitheft_cam").split(String.fromCharCode(92)).join("/");
await build({ stdin: { contents: `export * from "${SD}/story"; export * from "${SD}/plan"; export { WARP, VOICE_TOTAL, toNew } from "${SD}/voicewarp"; export * as THREE from "three"; import { TT, SR, CL, BP } from "${SD}/plan"; const A = (b, d) => [b[0] + d[0], b[1] + d[1], b[2] + d[2]]; export const tt = (d) => A(TT.base, d), sr = (d) => A(SR.base, d), cl = (d) => A(CL.base, d), bp = (d) => A(BP.base, d);`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { SHOTS, XFADE, camAt, WARP, VOICE_TOTAL, toNew, shotAt, BEAT, THREE } = m;
const W = (v) => WARP[Math.max(0, Math.min(WARP.length - 1, Math.round(v)))];
const XFV = SHOTS.slice(1).filter((s) => XFADE[s.id]).map((s) => {
  const vc = toNew(s.a), half = (XFADE[s.id] + 1) / 2;
  return { id: s.id, lo: Math.max(vc - half, toNew(s.a - 3.95)), hi: Math.min(vc + half, toNew(s.a + 3.95)) };
});
const layersV = (vf) => { const f = W(vf); for (const x of XFV) if (vf > x.lo && vf < x.hi) return [{ id: x.id - 1, alpha: 1 }, { id: x.id, alpha: (vf - x.lo) / (x.hi - x.lo) }]; return [{ id: shotAt(f).id, alpha: 1 }]; };
const basis = (c) => {
  const fw = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], n = Math.hypot(...fw);
  const F = [fw[0] / n, fw[1] / n, fw[2] / n], rh = Math.hypot(F[2], F[0]) || 1, R0 = [-F[2] / rh, 0, F[0] / rh];
  const U0 = [R0[1] * F[2] - R0[2] * F[1], R0[2] * F[0] - R0[0] * F[2], R0[0] * F[1] - R0[1] * F[0]];
  const cs = Math.cos(c.roll), sn = Math.sin(c.roll);
  return { F, R: R0.map((v, i) => v * cs + U0[i] * sn), U: U0.map((v, i) => -R0[i] * sn + v * cs), t: Math.tan((c.fov * Math.PI) / 360), n };
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const px = (c, b, p) => { const d = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]], z = Math.max(1e-3, dot(d, b.F)); return [540 + (540 * dot(d, b.R)) / (z * b.t * 0.5625), 960 - (960 * dot(d, b.U)) / (z * b.t)]; };
const motion = (c0, c1) => {
  const b0 = basis(c0), b1 = basis(c1);
  let best = { dx: 0, dy: 0, zoom: 0, m: 0 }, bm = -1;
  for (const k of [1, 2.5]) {
    let sx = 0, sy = 0, r0 = 0, r1 = 0; const P = [], Q = [];
    for (const gx of [-0.5, 0, 0.5]) for (const gy of [-0.5, 0, 0.5]) {
      const z = b0.n * k, x = gx * z * b0.t * 0.5625 * 2, y = gy * z * b0.t * 2;
      const w = [0, 1, 2].map((i) => c0.pos[i] + b0.F[i] * z + b0.R[i] * x + b0.U[i] * y);
      const p = px(c0, b0, w), q = px(c1, b1, w); P.push(p); Q.push(q); sx += q[0] - p[0]; sy += q[1] - p[1];
    }
    const mx = sx / 9, my = sy / 9;
    for (let i = 0; i < 9; i++) { r0 += Math.hypot(P[i][0] - 540, P[i][1] - 960); r1 += Math.hypot(Q[i][0] - 540 - mx, Q[i][1] - 960 - my); }
    const zoom = r1 / r0 - 1, mm = Math.max(Math.abs(mx) / 1080, Math.abs(my) / 1920, Math.abs(zoom));
    if (mm > bm) { bm = mm; best = { dx: mx, dy: my, zoom, m: 100 * mm }; }
  }
  return best;
};
const vmot = (id, vf) => motion(camAt(id, W(vf)), camAt(id, W(vf + 1)));
const mode = process.argv[2];
if (mode === "frames") {
  const [a, b] = process.argv[3].split("-").map(Number);
  for (let vf = a; vf <= b; vf++) {
    const L = layersV(vf);
    const s = L.map((l) => { const v = vmot(l.id, vf); return `s${l.id}${L.length > 1 ? "@" + l.alpha.toFixed(2) : ""} ${v.m.toFixed(2).padStart(5)} (dx ${(100 * v.dx / 1080).toFixed(2)} dy ${(100 * v.dy / 1920).toFixed(2)} z ${(100 * v.zoom).toFixed(2)})`; }).join(" | ");
    const c = camAt(L[L.length - 1].id, W(vf));
    console.log(`v${vf} p${W(vf).toFixed(1)} ${s}  roll ${(c.roll * 57.3).toFixed(2)}`);
  }
} else if (mode === "beats") {
  for (const [k, v] of Object.entries(BEAT)) console.log(k.padEnd(12), String(v).padStart(6), "-> v", toNew(v).toFixed(1));
  for (const s of SHOTS) console.log(`shot ${s.id} pic ${s.a}-${s.b}  video ${toNew(s.a).toFixed(1)}-${toNew(s.b).toFixed(1)}`);
} else if (mode === "shots") {
  for (const s of SHOTS) {
    const va = Math.ceil(toNew(s.a)), vb = Math.floor(toNew(s.b));
    let c = [0, 0, 0], run = 0, best = 0, bestAt = 0, pk = 0, pkf = 0;
    for (let vf = va; vf < vb; vf++) {
      const v = vmot(s.id, vf); const k = v.m < 0.15 ? 0 : v.m < 0.5 ? 1 : 2; c[k]++;
      if (v.m < 0.15) { run++; if (run > best) { best = run; bestAt = vf - run + 1; } } else run = 0;
      if (v.m > pk) { pk = v.m; pkf = vf; }
    }
    const n = vb - va;
    console.log(`shot ${String(s.id).padStart(2)} v[${va}-${vb}) still ${(100 * c[0] / n).toFixed(0).padStart(3)}% drift ${(100 * c[1] / n).toFixed(0).padStart(3)}% move ${(100 * c[2] / n).toFixed(0).padStart(3)}%  peak ${pk.toFixed(2)} @v${pkf}  longest still ${best} f @v${bestAt}`);
  }
} else if (mode === "proj") {
  const qs = new Function(...Object.keys(m), `return (${process.argv[3]});`)(...Object.values(m));
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 2000);
  for (const q of qs) {
    const id = q.id ?? layersV(q.vf).slice(-1)[0].id, f = q.f ?? W(q.vf);
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const r = (a) => a.map((v) => +v.toFixed(2)).join(",");
    console.log(`shot ${id} v${q.vf} p${f.toFixed(1)} pos [${r(c.pos)}] look [${r(c.look)}] fov ${c.fov.toFixed(1)} roll ${(c.roll * 57.3).toFixed(1)}`);
    for (const [k, p] of Object.entries(q.pts ?? {})) {
      const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse);
      const s = new THREE.Vector3(...p).project(cam);
      const x = (s.x * 0.5 + 0.5) * 1080, y = (0.5 - s.y * 0.5) * 1920;
      const off = v.z > 0 || x < 0 || x > 1080 || y < 0 || y > 1920;
      console.log(`   ${k.padEnd(14)} x ${x.toFixed(0).padStart(5)}  y ${y.toFixed(0).padStart(5)}  d ${(-v.z).toFixed(2)}m${off ? "  OFF" : ""}`);
    }
  }
}

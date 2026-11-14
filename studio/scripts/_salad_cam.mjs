// CAM design helper for the saladoil CAM sandbox (cwd = studio).
// usage:
//   node scripts/_salad_cam.mjs peaks                      per-shot peak image flow (px/f at 1080x1920) + frame
//   node scripts/_salad_cam.mjs mot <id> <a-b> [step]      per-frame flow for one shot
//   node scripts/_salad_cam.mjs proj '<expr>'              expr -> [{id, f, pts:{name:[x,y,z]}}]  (camAt)
//   node scripts/_salad_cam.mjs cand '<expr>'              expr -> [{name, pos, look, fov, pts}]   (any camera)
//   node scripts/_salad_cam.mjs dof <id> <a-b> [step]      dofAt per frame (cInf + focus distance from camAt)
// flow = mean screen displacement of a 5x5 grid of world points at the look distance (and at 0.6x / 2.5x of it):
// the max of the three is printed (approximates the optical-flow peak the audit measures).
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const DIR = process.env.DIR || "src/videos/saladoil_cam";
const tmp = path.resolve("out/_salad_cam_bundle.mjs");
await build({ stdin: { contents: `export * from "./${DIR}/story"; export * from "./${DIR}/plan"; export * as THREE from "three";`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE, SHOTS, camAt, dofAt } = m;
const mode = process.argv[2] ?? "peaks";
const mk = (c) => { const cam = new THREE.PerspectiveCamera(c.fov, 1080 / 1920, 0.05, 3000); cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll ?? 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); return cam; };
const scr = (cam, p) => { const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse); const s = new THREE.Vector3(...p).project(cam); return { x: (s.x * 0.5 + 0.5) * 1080, y: (0.5 - s.y * 0.5) * 1920, d: -v.z }; };
const flow = (c0, c1) => {
  const A = mk(c0), B = mk(c1), L = Math.hypot(c0.look[0] - c0.pos[0], c0.look[1] - c0.pos[1], c0.look[2] - c0.pos[2]);
  let best = 0;
  for (const k of (process.env.KS ? process.env.KS.split(",").map(Number) : [1])) {
    let s = 0, n = 0;
    for (const gx of [-0.8, -0.4, 0, 0.4, 0.8]) for (const gy of [-0.8, -0.4, 0, 0.4, 0.8]) {
      const v = new THREE.Vector3(gx, gy, 0.5).unproject(A).sub(A.position).normalize();
      const fw = new THREE.Vector3(); A.getWorldDirection(fw);
      const t = (L * k) / v.dot(fw), w = A.position.clone().addScaledVector(v, t);
      const p = scr(A, w.toArray()), q = scr(B, w.toArray()); s += Math.hypot(q.x - p.x, q.y - p.y); n++;
    }
    best = Math.max(best, s / n);
  }
  return best;
};
const fl = (id, f) => flow(camAt(id, f), camAt(id, f + 1));
if (mode === "peaks") {
  for (const s of SHOTS) {
    let pk = 0, pf = 0, over = 0;
    for (let f = s.a - 6; f < s.b + 6; f++) { const v = fl(s.id, f); if (v > pk) { pk = v; pf = f; } if (v > 45) over++; }
    console.log(`shot ${String(s.id).padStart(2)} [${s.a}-${s.b})  peak ${pk.toFixed(1).padStart(6)} px/f @${pf}   frames>45: ${over}`);
  }
} else if (mode === "mot") {
  const id = +process.argv[3], [a, b] = process.argv[4].split("-").map(Number), st = +(process.argv[5] ?? 1);
  for (let f = a; f <= b; f += st) { const c = camAt(id, f); console.log(`f${f}  flow ${fl(id, f).toFixed(1).padStart(6)}  pos [${c.pos.map((v) => v.toFixed(2))}] look [${c.look.map((v) => v.toFixed(2))}] fov ${c.fov.toFixed(1)}`); }
} else if (mode === "dof") {
  const id = +process.argv[3], [a, b] = process.argv[4].split("-").map(Number), st = +(process.argv[5] ?? 1);
  for (let f = a; f <= b; f += st) { const c = camAt(id, f), d = dofAt(id, f), fp = d.focus ? d.focus(f) : null;
    const dist = fp ? Math.hypot(fp[0] - c.pos[0], fp[1] - c.pos[1], fp[2] - c.pos[2]) : NaN;
    console.log(`f${f}  cInf ${d.cInf.toFixed(2)}  focus ${fp ? fp.map((v) => v.toFixed(2)) : "-"}  dist ${dist.toFixed(2)}`); }
} else {
  // aim(pos, t, fov, xs, ys): the look point that puts world point t at screen fractions (xs, ys) (same as story.ts aimY)
  const aim = (pos, t, fov, xs, ys) => {
    const dx = t[0] - pos[0], dz = t[2] - pos[2], dh = Math.hypot(dx, dz), el = Math.atan2(t[1] - pos[1], dh), tv = Math.tan((fov * Math.PI) / 360);
    const pitch = el - Math.atan((0.5 - ys) * 2 * tv), b = Math.atan2(dx, -dz), bb = b - Math.atan((xs - 0.5) * 2 * tv * 0.5625);
    return [pos[0] + dh * Math.sin(bb), pos[1] + dh * Math.tan(pitch), pos[2] - dh * Math.cos(bb)];
  };
  const box8 = (c, w, h, yaw, pre) => { const ux = Math.cos(yaw), uz = -Math.sin(yaw), o = {};
    for (const [n, s, t] of [["TL", -1, 1], ["TR", 1, 1], ["BL", -1, -1], ["BR", 1, -1]]) o[pre + n] = [c[0] + ux * s * w / 2, c[1] + t * h / 2, c[2] + uz * s * w / 2]; return o; };
  const ctx = { ...m, aim, box8 };
  const qs = new Function(...Object.keys(ctx), `return (${process.argv[3]});`)(...Object.values(ctx));
  for (const q of qs) {
    const c = mode === "proj" ? camAt(q.id, q.f) : { roll: 0, ...q };
    const cam = mk(c), r = (a) => a.map((v) => +v.toFixed(2)).join(",");
    console.log(`${mode === "proj" ? `shot ${q.id} f${q.f}` : q.name}  pos [${r(c.pos)}] look [${r(c.look)}] fov ${(+c.fov).toFixed(1)}`);
    for (const [k, p] of Object.entries(q.pts ?? {})) {
      const s = scr(cam, p), off = s.d < 0 || s.x < 0 || s.x > 1080 || s.y < 0 || s.y > 1920;
      console.log(`   ${k.padEnd(14)} x ${s.x.toFixed(0).padStart(5)}  y ${s.y.toFixed(0).padStart(5)}  d ${s.d.toFixed(2)}m${off ? "  OFF" : ""}`);
    }
  }
}

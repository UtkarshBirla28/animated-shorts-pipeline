// usage (cwd = studio): node <scratch>/probe.mjs <snippet.js>
// snippet gets: m (story+plan exports), THREE, P(cam, pts) -> prints projections, cam(c) helper, aim, fr
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const DIR = process.env.DIR || "src/videos/saladoil_cam";
const tmp = path.resolve("out/_probe_cam_bundle_" + process.pid + ".mjs");
await build({ stdin: { contents: `export * from "./${DIR}/story"; export * from "./${DIR}/plan"; export * as THREE from "three";`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE } = m;
const mk = (c) => { const cam = new THREE.PerspectiveCamera(c.fov, 1080 / 1920, 0.05, 3000); cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll ?? 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); return cam; };
const scr = (cam, p) => { const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse); const s = new THREE.Vector3(...p).project(cam); return { x: (s.x * 0.5 + 0.5) * 1080, y: (0.5 - s.y * 0.5) * 1920, d: -v.z }; };
const aim = (pos, t, fov, xs, ys) => {
  const dx = t[0] - pos[0], dz = t[2] - pos[2], dh = Math.hypot(dx, dz), el = Math.atan2(t[1] - pos[1], dh), tv = Math.tan((fov * Math.PI) / 360);
  const pitch = el - Math.atan((0.5 - ys) * 2 * tv), b = Math.atan2(dx, -dz), bb = b - Math.atan((xs - 0.5) * 2 * tv * 0.5625);
  return [pos[0] + dh * Math.sin(bb), pos[1] + dh * Math.tan(pitch), pos[2] - dh * Math.cos(bb)];
};
const fr = (pos, t, fov, xs = 0.5, ys = 0.5) => ({ pos, look: aim(pos, t, fov, xs, ys), fov });
const P = (label, c, pts) => {
  const cam = mk(c), r = (a) => a.map((v) => (+v).toFixed(2)).join(",");
  console.log(`${label}  pos [${r(c.pos)}] look [${r(c.look)}] fov ${(+c.fov).toFixed(1)}`);
  const out = {};
  for (const [k, p] of Object.entries(pts ?? {})) {
    const s = scr(cam, p), off = s.d < 0 || s.x < 0 || s.x > 1080 || s.y < 0 || s.y > 1920; out[k] = s;
    console.log(`   ${k.padEnd(14)} x ${s.x.toFixed(0).padStart(5)}  y ${s.y.toFixed(0).padStart(5)}  d ${s.d.toFixed(2)}m${off ? "  OFF" : ""}`);
  }
  return out;
};
const Q = (c, pts) => { const cam = mk(c), o = {}; for (const [k, p] of Object.entries(pts)) o[k] = scr(cam, p); return o; };
const flow = (c0, c1, ks = [0.6, 1, 2.5]) => {
  const A = mk(c0), B = mk(c1), L = Math.hypot(c0.look[0] - c0.pos[0], c0.look[1] - c0.pos[1], c0.look[2] - c0.pos[2]);
  let best = 0;
  for (const k of ks) { let s = 0, n = 0;
    for (const gx of [-0.8, -0.4, 0, 0.4, 0.8]) for (const gy of [-0.8, -0.4, 0, 0.4, 0.8]) {
      const v = new THREE.Vector3(gx, gy, 0.5).unproject(A).sub(A.position).normalize();
      const fw = new THREE.Vector3(); A.getWorldDirection(fw);
      const t = (L * k) / v.dot(fw), w = A.position.clone().addScaledVector(v, t);
      const p = scr(A, w.toArray()), q = scr(B, w.toArray()); s += Math.hypot(q.x - p.x, q.y - p.y); n++; }
    best = Math.max(best, s / n); }
  return best;
};
const box8 = (c, w, h, yaw, pre) => { const ux = Math.cos(yaw), uz = -Math.sin(yaw), o = {};
  for (const [n, s, t] of [["TL", -1, 1], ["TR", 1, 1], ["BL", -1, -1], ["BR", 1, -1]]) o[pre + n] = [c[0] + ux * s * w / 2, c[1] + t * h / 2, c[2] + uz * s * w / 2]; return o; };
const src = fs.readFileSync(process.argv[2], "utf8");
await new Function("m", "THREE", "P", "Q", "aim", "fr", "flow", "box8", "mk", "scr", `return (async () => { const {${Object.keys(m).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k)).join(",")}} = m; ${src} })();`)(m, THREE, P, Q, aim, fr, flow, box8, mk, scr);

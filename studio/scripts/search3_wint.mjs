import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const tmp = path.resolve("out/_search3_bundle_wint.mjs");
await build({ stdin: { contents: 'export * from "./src/videos/antitheft_world_int/story"; export * from "./src/videos/antitheft_world_int/plan"; export * as THREE from "three";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE, camAt, BP } = m;
const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 2000);
const setCam = (f) => { const c = camAt(11, f); cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); };
const P = (p) => { const s = new THREE.Vector3(...p).project(cam); return [(s.x * 0.5 + 0.5) * 1080, (0.5 - s.y * 0.5) * 1920]; };
const rectZ = (c, w, h) => { const wc = [c[0] + BP.base[0], c[1], c[2] + BP.base[2]];
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P([wc[0] + a * w / 2, wc[1] + b * h / 2, wc[2]]));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const rectC = (c, w, h) => { const wc = [c[0] + BP.base[0], c[1], c[2] + BP.base[2]];
  const yaw = Math.atan2(cam.position.x - wc[0], cam.position.z - wc[2]), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P([wc[0] + rx * a * w / 2, wc[1] + b * h / 2, wc[2] + rz * a * w / 2]));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const ov = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
const inside = (r, b) => r[0] >= b[0] && r[1] >= b[1] && r[2] <= b[2] && r[3] <= b[3];
const AR = +(process.env.AR || 1536 / 448), res = [];
const EE = [1.6, 4.55, -3.5];
for (let z = -13.4; z <= -3; z += 0.4) for (let x = -4; x <= 1.5; x += 0.15) for (let y = 3.5; y <= 7.5; y += 0.1) for (let w = 1.4; w <= 6.0; w += 0.2) {
  let ok = true, minW = 1e9;
  for (const f of [1298, 1305, 1315, 1333, 1350, 1365, 1380, 1386]) {
    setCam(f); const r = rectZ([x, y, z], w, w / AR), pan = rectC([0.9, 2.6, -1.9], 2.45, 2.45), ee = rectC(EE, 1.6, 0.85);
    if (!inside(r, [+(process.env.X0||40), 50, +(process.env.X1||520), 1900]) || (ov(r, pan) > 0 && !process.env.NOPAN) || ov(r, ee) > 0) { ok = false; break; }
    minW = Math.min(minW, r[2] - r[0]);
  }
  if (ok) res.push({ x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), w, minW: +minW.toFixed(0) });
}
res.sort((a, b) => b.minW - a.minW);
console.log(res.length, JSON.stringify(res.slice(0, 12)));

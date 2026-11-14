import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const tmp = path.resolve("out/_search2_bundle_wint.mjs");
await build({ stdin: { contents: 'export * from "./src/videos/antitheft_world_int/story"; export * from "./src/videos/antitheft_world_int/plan"; export * as THREE from "three";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE, camAt, BP } = m;
const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 2000);
const cams = {};
const setCam = (f) => { const c = camAt(11, f); cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); };
const P = (p) => { const s = new THREE.Vector3(...p).project(cam); return [(s.x * 0.5 + 0.5) * 1080, (0.5 - s.y * 0.5) * 1920]; };
const rect = (c, w, h) => {
  const wc = [c[0] + BP.base[0], c[1], c[2] + BP.base[2]];
  const yaw = Math.atan2(cam.position.x - wc[0], cam.position.z - wc[2]), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P([wc[0] + rx * a * w / 2, wc[1] + b * h / 2, wc[2] + rz * a * w / 2]));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const ov = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
const inside = (r, b) => r[0] >= b[0] && r[1] >= b[1] && r[2] <= b[2] && r[3] <= b[3];
const manAt = (f) => { const s = Math.max(0, (Math.min(f, 1284) - 1256) / 30) * 1.9; return [0.75 * s, 0.85, 2.0 - 0.66 * s]; };
const W = +process.argv[2], H = +process.argv[3], CAP = +process.argv[4], SIDE = process.argv[5] || "R";
const res = [];
for (let x = (SIDE === "R" ? 0.4 : -4.5); x <= (SIDE === "R" ? 4.0 : 0.2); x += 0.15) for (let z = -6.5; z <= -0.5; z += 0.25) for (let yl = 1.0; yl <= 2.6; yl += 0.1) for (let yh = (SIDE === "R" ? 2.6 : 0.6); yh <= 6.0; yh += 0.15) {
  let ok = true, minCap = 99, score = 0;
  for (const f of (process.env.LOWF ? JSON.parse(process.env.LOWF) : [1268, 1272, 1276, 1280, 1284])) {
    setCam(f); const r = rect([x, yl, z], W, H), man = rect(manAt(f), 0.75, 1.7);
    if (!inside(r, [40, 120, 1040, 1250])) { ok = false; break; }
    if (SIDE === "L" && process.env.FIX && Math.abs(yh - yl) > 0.01) { ok = false; break; }
    if (ov(r, man) > 0.04 * (r[2] - r[0]) * (r[3] - r[1])) { ok = false; break; }
    const d = cam.position.distanceTo(new THREE.Vector3(x + BP.base[0], yl, z)); minCap = Math.min(minCap, CAP * 1920 / (2 * d * Math.tan(cam.fov * Math.PI / 360)));
  }
  if (!ok) continue;
  for (const f of [1300, 1312, 1333, 1350, 1365, 1380, 1392]) { const capF = f < 1390;
    setCam(f); const r = rect([x, yh, z], W, H), pan = rect([0.9, 2.6, -1.9], 2.4, 2.4);
    if (!inside(r, [40, 60, 1040, 1250])) { ok = false; break; }
    if (ov(r, pan) > 0) { ok = false; break; }
    if (r[0] < 560 && r[1] < 430) { ok = false; break; } // title strip
    const fig = rect([-2.2, 0.55, -4.5], 0.6, 1.1); if (SIDE === "L" && ov(r, fig) > 0) { ok = false; break; }
    const d = cam.position.distanceTo(new THREE.Vector3(x + BP.base[0], yh, z)); if (capF) minCap = Math.min(minCap, CAP * 1920 / (2 * d * Math.tan(cam.fov * Math.PI / 360)));
  }
  if (!ok) continue;
  res.push({ x: +x.toFixed(2), z: +z.toFixed(2), yl: +yl.toFixed(2), yh: +yh.toFixed(2), minCap: +minCap.toFixed(1) });
}
res.sort((a, b) => b.minCap - a.minCap);
console.log(res.length, JSON.stringify(res.slice(0, 25)));

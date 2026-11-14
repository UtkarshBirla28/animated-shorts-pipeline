// label search for shot 11 (WORLD-INT): screen rects of camera-facing labels at key frames
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const tmp = path.resolve("out/_search_bundle_wint.mjs");
await build({ stdin: { contents: 'export * from "./src/videos/antitheft_world_int/story"; export * from "./src/videos/antitheft_world_int/plan"; export * as THREE from "three";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE, camAt, BP } = m;
const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 2000);
const setCam = (f) => { const c = camAt(11, f); cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); return c; };
const P = (p) => { const s = new THREE.Vector3(...p).project(cam); return [(s.x * 0.5 + 0.5) * 1080, (0.5 - s.y * 0.5) * 1920]; };
const rect = (c, w, h, f) => { // camera-facing (yaw only) label centred at c (local bp)
  const wc = [c[0] + BP.base[0], c[1], c[2] + BP.base[2]];
  const yaw = Math.atan2(cam.position.x - wc[0], cam.position.z - wc[2]), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P([wc[0] + rx * a * w / 2, wc[1] + b * h / 2, wc[2] + rz * a * w / 2]));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const q = JSON.parse(process.argv[2]);
for (const L of q.labels) {
  console.log(`label ${L.name} c=[${L.c}] ${L.w}x${L.h}`);
  for (const f of q.frames) { setCam(f); const r = rect(L.c, L.w, L.h, f), d = cam.position.distanceTo(new THREE.Vector3(L.c[0] + BP.base[0], L.c[1], L.c[2] + BP.base[2]));
    console.log(`   f${f} x ${r[0].toFixed(0)}..${r[2].toFixed(0)}  y ${r[1].toFixed(0)}..${r[3].toFixed(0)}  d ${d.toFixed(2)}  capPx(at cap=${L.cap}) ${(L.cap * 1920 / (2 * d * Math.tan(cam.fov * Math.PI / 360))).toFixed(0)}`); }
}

// project world points through arbitrary candidate cameras (CAM A5 design helper; cwd = studio)
// usage: node scripts/_projcam_cam.mjs '<expr returning [{name, pos, look, fov, roll?, pts:{k:[x,y,z]}}]>'
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const tmp = path.resolve("out/_projcam_bundle_cam.mjs");
await build({ stdin: { contents: 'export * from "./src/videos/antitheft_cam/plan"; export * as THREE from "three"; import { TT, SR, CL, BP } from "./src/videos/antitheft_cam/plan"; const A = (b, d) => [b[0] + d[0], b[1] + d[1], b[2] + d[2]]; export const tt = (d) => A(TT.base, d), sr = (d) => A(SR.base, d), cl = (d) => A(CL.base, d), bp = (d) => A(BP.base, d); export const dirB = (b, p) => { const B = (b * Math.PI) / 180, P = (p * Math.PI) / 180; return [Math.sin(B) * Math.cos(P), Math.sin(P), -Math.cos(B) * Math.cos(P)]; }; export const along = (p, d, L) => [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L]; export const fr = (pos, yaw, pitch, fov) => ({ pos, look: along(pos, dirB(yaw, pitch), 4), fov }); export const dolly = (pos, look, k) => [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k];', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE } = m;
const qs = new Function(...Object.keys(m), `return (${process.argv[2]});`)(...Object.values(m));
const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 2000);
for (const q of qs) {
  cam.position.set(...q.pos); cam.up.set(0, 1, 0); cam.lookAt(...q.look); cam.rotateZ(q.roll ?? 0);
  cam.fov = q.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  console.log(`${q.name ?? ""} pos [${q.pos.map((v) => v.toFixed(2))}] look [${q.look.map((v) => v.toFixed(2))}] fov ${q.fov.toFixed(1)}`);
  for (const [k, p] of Object.entries(q.pts ?? {})) {
    const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse);
    const s = new THREE.Vector3(...p).project(cam);
    const x = (s.x * 0.5 + 0.5) * 1080, y = (0.5 - s.y * 0.5) * 1920;
    const off = v.z > 0 || x < 0 || x > 1080 || y < 0 || y > 1920;
    console.log(`   ${k.padEnd(14)} x ${x.toFixed(0).padStart(5)}  y ${y.toFixed(0).padStart(5)}  d ${(-v.z).toFixed(2)}m${off ? "  OFF" : ""}`);
  }
}

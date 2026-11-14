// Project world points through the film camera (story.ts camAt) -> screen px at 1080x1920 (no render needed).
// usage: node scripts/project.mjs '<js expr returning [{id, f, pts:{name:[x,y,z]}}]>'
//   the expression can use every export of story.ts and plan.ts (BEAT, SHOTS, TH, TT, SR, CL, BP, VISTA, tt, sr, cl, bp ...)
// prints per query: frame, camera, and for each point x,y px (+ "OFF" when outside the frame or behind the camera)
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const tmp = path.resolve("out/_project_char_bundle.mjs");
await build({ stdin: { contents: 'export * from "./src/videos/antitheft_char/story"; export * from "./src/videos/antitheft_char/plan"; export * as THREE from "three"; import { TT, SR, CL, BP } from "./src/videos/antitheft_char/plan"; const A = (b, d) => [b[0] + d[0], b[1] + d[1], b[2] + d[2]]; export const T = A; export const tt = (d) => A(TT.base, d), sr = (d) => A(SR.base, d), cl = (d) => A(CL.base, d), bp = (d) => A(BP.base, d);', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE } = m;
const qs = new Function(...Object.keys(m), `return (${process.argv[2]});`)(...Object.values(m));
const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 2000);
for (const q of qs) {
  const c = q.cam ? { fov: 40, roll: 0, ...q.cam } : m.camAt(q.id, q.f);
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
  cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const r = (a) => a.map((v) => +v.toFixed(2)).join(",");
  console.log(`shot ${q.id} f${q.f}  pos [${r(c.pos)}] look [${r(c.look)}] fov ${c.fov.toFixed(1)}`);
  for (const [k, p] of Object.entries(q.pts ?? {})) {
    const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse);
    const behind = v.z > 0;
    const s = new THREE.Vector3(...p).project(cam);
    const x = (s.x * 0.5 + 0.5) * 1080, y = (0.5 - s.y * 0.5) * 1920;
    const off = behind || x < 0 || x > 1080 || y < 0 || y > 1920;
    console.log(`   ${k.padEnd(14)} x ${x.toFixed(0).padStart(5)}  y ${y.toFixed(0).padStart(5)}  d ${(-v.z).toFixed(2)}m${off ? "  OFF" : ""}`);
  }
}

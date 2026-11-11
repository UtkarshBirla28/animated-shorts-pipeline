// CAM sandbox helper: project world points through ANY camera {pos, look, fov, roll} -> px at 1080x1920.
// usage: node scripts/project_any_cam.mjs '<js expr returning [{name, pos, look, fov, roll?, pts:{k:[x,y,z]}}]>'
// the expression can use plan.ts exports (TH, TT, VISTA, SR, CL, BP ...) and tt/sr/cl/bp/T helpers.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SHORT } from "./short.mjs";
// DIR = the short folder to read (default: the current short; a sandbox, e.g. DIR=src/videos/<short>_cam). The antitheft
// example adds its place helpers (tt/sr/cl/bp); a new short should export its own helpers from plan.ts instead.
const DIR = process.env.DIR || `src/videos/${SHORT}_cam`;
const EXTRA = SHORT === "antitheft" && true ? `import { TT, SR, CL, BP } from "./${DIR}/plan"; const A = (b, d) => [b[0] + d[0], b[1] + d[1], b[2] + d[2]]; export const T = A; export const tt = (d) => A(TT.base, d), sr = (d) => A(SR.base, d), cl = (d) => A(CL.base, d), bp = (d) => A(BP.base, d);` : "";
const tmp = path.resolve("out/_project_any_cam.mjs");
await build({ stdin: { contents: `export * from "./${DIR}/plan"; export * as THREE from "three"; ${EXTRA}`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE } = m;
const qs = new Function(...Object.keys(m), `return (${process.argv[2]});`)(...Object.values(m));
const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 2000);
for (const q of qs) {
  cam.position.set(...q.pos); cam.up.set(0, 1, 0); cam.lookAt(...q.look); cam.rotateZ(q.roll ?? 0);
  cam.fov = q.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  console.log(`${q.name ?? ""}  pos [${q.pos.map((v) => v.toFixed(2))}] look [${q.look.map((v) => v.toFixed(2))}] fov ${q.fov}`);
  for (const [k, p] of Object.entries(q.pts ?? {})) {
    const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse);
    const s = new THREE.Vector3(...p).project(cam);
    const x = (s.x * 0.5 + 0.5) * 1080, y = (0.5 - s.y * 0.5) * 1920;
    const off = v.z > 0 || x < 0 || x > 1080 || y < 0 || y > 1920;
    console.log(`   ${k.padEnd(16)} x ${x.toFixed(0).padStart(5)}  y ${y.toFixed(0).padStart(5)}  d ${(-v.z).toFixed(2)}m${off ? "  OFF" : ""}`);
  }
}

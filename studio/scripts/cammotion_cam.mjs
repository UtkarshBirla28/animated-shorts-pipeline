// Camera motion stats for the CAM sandbox story.ts (run with cwd = studio).
// usage: node <this> [shotId|all] [--frames a-b]
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SHORT } from "./short.mjs";
// DIR = the short folder to read (default: the current short; a sandbox, e.g. DIR=src/videos/<short>_cam). The antitheft
// example adds its place helpers (tt/sr/cl/bp); a new short should export its own helpers from plan.ts instead.
const DIR = process.env.DIR || `src/videos/${SHORT}_cam`;
const EXTRA = SHORT === "antitheft" && false ? `import { TT, SR, CL, BP } from "./${DIR}/plan"; const A = (b, d) => [b[0] + d[0], b[1] + d[1], b[2] + d[2]]; export const T = A; export const tt = (d) => A(TT.base, d), sr = (d) => A(SR.base, d), cl = (d) => A(CL.base, d), bp = (d) => A(BP.base, d);` : "";
const tmp = path.resolve("out/_cammotion_bundle.mjs");
await build({ stdin: { contents: `export * from "./${DIR}/story"; ${EXTRA}`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { SHOTS, camMotion, layersAt, TOTAL, XFADE } = m;
const arg = process.argv[2] ?? "all";
const fr = process.argv.indexOf("--frames");
const speed = (id, f) => { const c = camMotion(id, f); return { ...c, m: 100 * Math.max(Math.abs(c.dx) / 1080, Math.abs(c.dy) / 1920, Math.abs(c.zoom)) }; };
if (fr > 0) {
  const [a, b] = process.argv[fr + 1].split("-").map(Number);
  for (let f = a; f <= b; f++) {
    const L = layersAt(f);
    const s = L.map((l) => { const v = speed(l.id, f); return `s${l.id} ${v.m.toFixed(2).padStart(6)} (dx ${(100 * v.dx / 1080).toFixed(2)} dy ${(100 * v.dy / 1920).toFixed(2)} z ${(100 * v.zoom).toFixed(2)})`; }).join("  |  ");
    console.log(`f${f}  ${s}`);
  }
  process.exit(0);
}
let tot = [0, 0, 0], N = 0;
for (const s of SHOTS) {
  if (arg !== "all" && +arg !== s.id) continue;
  let c = [0, 0, 0], pk = 0, pkf = 0;
  for (let f = s.a; f < s.b; f++) {
    const v = speed(s.id, f);
    const k = v.m < 0.15 ? 0 : v.m < 0.5 ? 1 : 2; c[k]++; tot[k]++; N++;
    if (v.m > pk) { pk = v.m; pkf = f; }
  }
  const n = s.b - s.a;
  // dissolve check: motion of the incoming shot at s.a-4..s.a+6 and the outgoing previous shot
  const inc = [], prv = [];
  for (let f = s.a - 4; f <= s.a + 6; f++) inc.push(speed(s.id, f).m);
  if (s.id > 1) for (let f = s.a - 8; f <= s.a + 4; f++) prv.push(speed(s.id - 1, f).m);
  const mn = (a) => a.length ? Math.min(...a).toFixed(2) : "-";
  console.log(`shot ${String(s.id).padStart(2)} [${s.a}-${s.b}) still ${(100 * c[0] / n).toFixed(0).padStart(3)}% drift ${(100 * c[1] / n).toFixed(0).padStart(3)}% move ${(100 * c[2] / n).toFixed(0).padStart(3)}%  peak ${pk.toFixed(2)}%/f @${pkf}  dissolve-in min(in) ${mn(inc)} min(prev out) ${mn(prv)}`);
}
if (arg === "all") console.log(`FILM still ${(100 * tot[0] / N).toFixed(1)} drift ${(100 * tot[1] / N).toFixed(1)} move ${(100 * tot[2] / N).toFixed(1)}  (ref 22.8 / 32.8 / 43.3)`);

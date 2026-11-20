// DIRECTOR probe (pointing v4): bundles the v4 clock in Node (esbuild from studio/node_modules) and prints the shot table.
//   node briefs/v3/pointing/director/probe_v4.mjs [table | json <out>]
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../../../.."), STUDIO = path.join(ROOT, "studio");
const esbuild = createRequire(path.join(STUDIO, "package.json"))("esbuild");
const mode = process.argv[2] || "table", outArg = process.argv[3];
const r = await esbuild.build({ stdin: { contents: `import * as TL from "./src/videos3/pointing/v4/timeline"; import { SHOT_PLAN } from "./src/videos3/pointing/v4/shot_plan"; export { TL, SHOT_PLAN };`, resolveDir: STUDIO, loader: "ts" },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "error" });
const f = path.join(HERE, "_probe_v4.mjs"); fs.writeFileSync(f, r.outputFiles[0].text);
const { TL, SHOT_PLAN } = await import(pathToFileURL(f).href); fs.unlinkSync(f);
const f2 = (x) => x.toFixed(2);
if (mode === "json") {
  const shots = SHOT_PLAN.map((p) => ({ ...p, from: TL.FRAMES[p.id][0], to: TL.FRAMES[p.id][1], words: TL.TOKS.filter((t) => { const fs0 = Math.round(t.s * 30); return fs0 >= TL.FRAMES[p.id][0] && fs0 < TL.FRAMES[p.id][1]; }).map((t) => t.w).join(" ") }));
  fs.writeFileSync(outArg, JSON.stringify({ total: TL.TOTAL, source: TL.WORD_SOURCE, notes: TL.TIMELINE_NOTES, shots, toks: TL.TOKS }, null, 1));
  console.log("wrote " + outArg);
} else {
  console.log(`source: ${TL.WORD_SOURCE}\nTOTAL ${TL.TOTAL} f = ${f2(TL.TOTAL / 30)} s; notes: ${TL.TIMELINE_NOTES.join(" | ") || "none"}`);
  for (const p of SHOT_PLAN) {
    const [a, b] = TL.FRAMES[p.id];
    const ws = TL.TOKS.filter((t) => { const g = Math.round(t.s * 30); return g >= a && g < b; }).map((t) => t.w).join(" ");
    console.log(`${p.id.padEnd(4)} ${String(a).padStart(4)}-${String(b).padEnd(4)} ${f2(a / 30).padStart(5)}-${f2(b / 30).padEnd(6)} ${f2((b - a) / 30)} s  ${p.set.padEnd(11)} ${p.owner.padEnd(7)} ${ws.slice(0, 70)}`);
  }
}

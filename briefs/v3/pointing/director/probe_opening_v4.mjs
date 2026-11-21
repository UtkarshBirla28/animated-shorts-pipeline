// DIRECTOR probe: the opening events (EV), LAB's HOOK times, the opening cuts and the first 24 words. node briefs/v3/pointing/director/probe_opening_v4.mjs
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), STUDIO = path.resolve(HERE, "../../../../studio");
const esbuild = createRequire(path.join(STUDIO, "package.json"))("esbuild");
const r = await esbuild.build({ stdin: { contents: `export * as TL from "./src/videos3/pointing/v4/timeline"; export { HOOK } from "./src/videos3/pointing/v4/sets/lab_plan"; export { LINES } from "./src/videos3/pointing/v4/script";`, resolveDir: STUDIO, loader: "ts" }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "error" });
const f = path.join(HERE, "_evp.mjs"); fs.writeFileSync(f, r.outputFiles[0].text); const M = await import(pathToFileURL(f).href); fs.unlinkSync(f);
console.log("EV", JSON.stringify(M.TL.EV)); console.log("HOOK", JSON.stringify(M.HOOK));
for (const k of ["v01","v02","v03","v04","v05","v06"]) console.log(k, M.TL.FRAMES[k], (M.TL.FRAMES[k][0]/30).toFixed(2));
console.log(M.TL.TOKS.slice(0,24).map(t=>`${t.key}@${t.s.toFixed(2)}-${t.e.toFixed(2)}`).join(" "));
console.log(JSON.stringify(M.LINES.slice(0,3)));

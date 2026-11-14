// evaluate a JS expression against the WORLD-EXT sandbox story/plan exports (prints JSON)
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const tmp = path.resolve("out/_wext_eval_bundle.mjs");
await build({ stdin: { contents: 'export * from "./src/videos/antitheft_world_ext/story"; export * from "./src/videos/antitheft_world_ext/plan"; export * as THREE from "three"; import { TT } from "./src/videos/antitheft_world_ext/plan"; const A = (b, d) => [b[0] + d[0], b[1] + d[1], b[2] + d[2]]; export const tt = (d) => A(TT.base, d);', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const v = new Function(...Object.keys(m), `return (${process.argv[2]});`)(...Object.values(m));
console.log(typeof v === "string" ? v : JSON.stringify(v));

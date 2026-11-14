// usage: node scripts/render.mjs <out.mp4> [scale=0.5] [concurrency=3] [frames=a-b]
// env: COMP (default <COMPFILE>Short of the current short, see short.mjs), ENTRY (default src/index.ts), REMOTION_TMP (default ../_remotion-tmp), PROPS (JSON)
// Renders the silent picture with system Chrome + ANGLE (three.js needs a real GPU context); mux audio afterwards with
//   ffmpeg -i video.mp4 -i mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest final.mp4
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || path.resolve("../_remotion-tmp");
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition } = await import("@remotion/renderer");
const [out, scale = "0.5", conc = "3", range] = process.argv.slice(2);
const { COMP_ID } = await import("./short.mjs");
const id = process.env.COMP || COMP_ID;
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable, chromiumOptions });
const frameRange = range ? range.split("-").map(Number) : null;
let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out, inputProps, scale: Number(scale), crf: 18,
  concurrency: Number(conc), browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, muted: true,
  ...(frameRange ? { frameRange } : {}),
  onProgress: ({ progress, renderedFrames }) => { const p = Math.floor(progress * 20); if (p > last) { last = p; console.log(`${(progress * 100).toFixed(0)}% ${renderedFrames} frames ${((Date.now() - t0) / 1000).toFixed(0)}s`); } } });
console.log("done", out, ((Date.now() - t0) / 1000).toFixed(0) + "s");

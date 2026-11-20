// usage: node scripts/render.mjs <out.mp4> [scale=0.5] [concurrency=3] [frames=a-b]
// env: COMP (default <COMPFILE>Short of the current short, see short.mjs), ENTRY (default src/index.ts), REMOTION_TMP (default ../_remotion-tmp), PROPS (JSON)
// Renders the silent picture with system Chrome + ANGLE (three.js needs a real GPU context); mux audio afterwards with
//   ffmpeg -i video.mp4 -i mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest final.mp4
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || path.resolve("../_remotion-tmp");
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = tmp;
// disk guard (2026-11-19: 65 GB of leftover bundles filled C:): sweep bundles / browser profiles older than 12 h
try { const _now = Date.now(); for (const _n of fs.readdirSync(tmp)) { if (!/^(remotion-webpack-bundle-|puppeteer_dev_chrome_profile-|remotion-v\d)/.test(_n)) continue; const _p = path.join(tmp, _n); if (_now - fs.statSync(_p).mtimeMs > 12 * 3600e3) fs.rmSync(_p, { recursive: true, force: true }); } } catch {}
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
// disk guard: every bundle() copies all of public/ (> 1 GB with the kit); delete ours when this process ends
const _cleanBundle = () => { try { fs.rmSync(serveUrl, { recursive: true, force: true }); } catch {} };
process.on("exit", _cleanBundle); process.on("SIGINT", () => { _cleanBundle(); process.exit(130); }); process.on("SIGTERM", () => { _cleanBundle(); process.exit(143); });
const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable, chromiumOptions });
const frameRange = range ? range.split("-").map(Number) : null;
let last = 0;
// FINAL=1 (the master): lossless PNG frames into the encoder (the default sends every frame through JPEG q80), BT.709
// tags, crf 15, x264 "slow". Option names checked against @remotion/renderer 4.0.290's RenderMediaOptions. Previews
// (FINAL unset) are unchanged.
const FINAL = process.env.FINAL === "1";
const finalOpts = FINAL ? { imageFormat: "png", colorSpace: "bt709", crf: 15, x264Preset: "slow" } : { crf: 18 };
if (FINAL) console.log("FINAL render: png frames, bt709, crf 15, x264 slow");
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out, inputProps, scale: Number(scale), ...finalOpts,
  concurrency: Number(conc), browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, muted: true,
  ...(frameRange ? { frameRange } : {}),
  onProgress: ({ progress, renderedFrames }) => { const p = Math.floor(progress * 20); if (p > last) { last = p; console.log(`${(progress * 100).toFixed(0)}% ${renderedFrames} frames ${((Date.now() - t0) / 1000).toFixed(0)}s`); } } });
console.log("done", out, ((Date.now() - t0) / 1000).toFixed(0) + "s");

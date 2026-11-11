// usage: node scripts/stills.mjs <outPrefix> <frame,frame,...> [scale]   (bundles once, GPU via ANGLE, jpeg)
// env: COMP (composition id, default <COMPFILE>Short of the current short, see short.mjs), ENTRY (entry file, default src/index.ts; sandboxes use
// src/sandboxes/<name>/index.ts), REMOTION_TMP (bundle temp folder, default ../_remotion-tmp), PROPS (JSON inputProps).
// Renders are silent (stills have no audio).
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || path.resolve("../_remotion-tmp");
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const { COMP_ID } = await import("./short.mjs");
const id = process.env.COMP || COMP_ID;
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const browserExecutable = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";  // env CHROME = another Chrome path
const chromiumOptions = { gl: "angle" };
fs.mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
console.log("bundled", ((Date.now() - t0) / 1000).toFixed(1) + "s");
const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t1 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 240000, onBrowserLog });
  console.log("still", f, ((Date.now() - t1) / 1000).toFixed(1) + "s");
}

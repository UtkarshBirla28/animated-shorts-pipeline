// usage: node scripts/stills.mjs <outPrefix> <frame,frame,...> [scale]   (bundles once, GPU via ANGLE, jpeg)
// env: COMP (composition id, default <COMPFILE>Short of the current short, see short.mjs), ENTRY (entry file, default src/index.ts; sandboxes use
// src/sandboxes/<name>/index.ts), REMOTION_TMP (bundle temp folder, default ../_remotion-tmp), PROPS (JSON inputProps).
// KIT_BUNDLE_DIR (a ready bundle folder, e.g. from `kit_render.mjs --bundle-only`), KIT_BUNDLE=off (old private bundle).
// SPEED (pipeline, 2026-11-20): the bundle comes from the shared bundle cache (scripts/bundle_cache.mjs: reused while the
// sources are unchanged, public/ hard-linked not copied) and one Chrome serves all the stills of a call
// (KIT_STILLS_BROWSER=each: one per still, as before). Same pictures.
// Renders are silent (stills have no audio).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { getBundle } from "./bundle_cache.mjs";
const tmp = process.env.REMOTION_TMP || path.resolve("../_remotion-tmp");
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = tmp;
// disk guard (2026-11-19: 65 GB of leftover bundles filled C:): sweep bundles / browser profiles older than 12 h
try { const _now = Date.now(); for (const _n of fs.readdirSync(tmp)) { if (!/^(remotion-webpack-bundle-|puppeteer_dev_chrome_profile-|remotion-v\d)/.test(_n)) continue; const _p = path.join(tmp, _n); if (_now - fs.statSync(_p).mtimeMs > 12 * 3600e3) fs.rmSync(_p, { recursive: true, force: true }); } } catch {}
// KIT_STILLS_PAGE=reuse (with the shared Chrome): ONE page renders every still of the call (the set / shaders are built
// once): renderStill's per-call page setup (newPage, viewport, navigation, bundle mode) runs for the first still only and
// the later stills only seek + capture, exactly as a video render does from frame to frame. Needs the CommonJS build of
// the renderer (its steps are patchable there; same code as the ESM build).
const REUSE = process.env.KIT_STILLS_PAGE === "reuse" && process.env.KIT_STILLS_BROWSER !== "each";
const R = REUSE ? createRequire(import.meta.url)("@remotion/renderer") : await import("@remotion/renderer");
const { renderStill, selectComposition, openBrowser } = R;
let reusePage = null, pageReady = false, keptServer = null;
if (REUSE) {
  const req = createRequire(import.meta.url), dist = path.dirname(req.resolve("@remotion/renderer"));
  const spe = req(path.join(dist, "set-props-and-env.js")), pev = req(path.join(dist, "puppeteer-evaluate.js"));
  const spe0 = spe.setPropsAndEnv, pev0 = pev.puppeteerEvaluateWithCatch;
  // one static server for the whole call (renderStill would start and stop one per still; the kept page needs it alive)
  const ps = req(path.join(dist, "prepare-server.js")), mos0 = ps.makeOrReuseServer;
  ps.makeOrReuseServer = async (server, config, o) => {
    if (!keptServer) keptServer = await mos0(server, config, o);
    return { server: keptServer.server, cleanupServer: () => Promise.resolve() };
  };
  spe.setPropsAndEnv = async (a) => { if (pageReady && a.page === reusePage) return; return spe0(a); };
  pev.puppeteerEvaluateWithCatch = async (a) => {
    if (pageReady && a.page === reusePage && String(a.pageFunction).includes("remotion_setBundleMode")) return { type: "undefined", value: undefined };
    return pev0(a);
  };
}
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const { COMP_ID } = await import("./short.mjs");
const id = process.env.COMP || COMP_ID;
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
fs.mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });
const t0 = Date.now();
const { serveUrl } = await getBundle({ entry: path.resolve(process.env.ENTRY || "src/index.ts"), studio: process.cwd(), bundleDir: process.env.KIT_BUNDLE_DIR || null });
console.log("bundled", ((Date.now() - t0) / 1000).toFixed(1) + "s");
const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
// one Chrome for every still of this call (proven pixel-identical on 3 lab stills, 01:55); KIT_STILLS_BROWSER=each = a
// Chrome per still as before
const browser = process.env.KIT_STILLS_BROWSER === "each" ? null : await openBrowser("chrome", { browserExecutable, chromiumOptions, forceDeviceScaleFactor: Number(scale) });
const closeB = async () => {
  if (keptServer) try { await keptServer.cleanupServer(true); } catch {}
  if (browser) await Promise.race([browser.close({ silent: true }).catch(() => {}), new Promise((r) => setTimeout(r, 8000))]);
};
if (REUSE && browser) {
  // the first still's page is kept: later newPage() calls get it back, its close() and setViewport() become no-ops
  const np0 = browser.newPage.bind(browser);
  browser.newPage = async (a) => {
    if (reusePage) return reusePage;
    const p = await np0(a);
    const sv0 = p.setViewport.bind(p);
    p.setViewport = async (v) => { if (!pageReady) return sv0(v); };
    p.close = async () => {};
    reusePage = p; return p;
  };
}
try {
  for (const f of frames.split(",").map(Number)) {
    const t1 = Date.now();
    await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
      inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 240000, onBrowserLog, ...(browser ? { puppeteerInstance: browser } : {}) });
    if (reusePage) pageReady = true;
    console.log("still", f, ((Date.now() - t1) / 1000).toFixed(1) + "s");
  }
} finally { await closeB(); }

// REAL-WORLD KIT per-shot cached renderer (CORE). Run from studio/:
//   node scripts/kit_render.mjs --entry <entry.ts> --comp <id> --quality draft|preview|final4|final --shots all|<id,id> --out out/<slug>/
//   [--stills 0,45,120]   storyboard stills through scripts/stills_locked.sh (no RAM token: the stills limiter)
//   [--info]              print the composition's kitShots (ids, frames, sets, rigs, signatures, camera speed stats) as JSON
//   [--frames a-b]        a test clip of absolute frames a..b (not cached) -> out/<slug>/test/<quality>_<a>-<b>.mp4 (timing probe)
//   [--conc N] [--props '<json merged into inputProps.kit>'] [--force] [--film <film.ts>] [--keep-browser-logs]
//   [--bundle <dir>]      use this ready Remotion bundle (from --bundle-only) instead of the shared bundle cache
//   [--bundle-only]       build / reuse the shared bundle for --entry, print its folder on the last line, exit
//   [--dry-run]           list each asked shot's chunk file and whether it is cached; render nothing
//   [--verify-hash]       also compute the source hashes the old way (one esbuild run per set) and fail if they differ
// env: KIT_PROFILE=1 logs per-frame seek (page work: React + kit render) vs capture (screenshot) times
//      KIT_BUNDLE=off -> a private bundle with a full public/ copy (the old behaviour)
// SPEED (pipeline, 2026-11-20): the Remotion bundle is shared and reused while the sources are unchanged
// (scripts/bundle_cache.mjs; public/ is hard-linked, not copied), and the source graph is read from ONE esbuild run
// (cached by the sources' size + mtime) instead of one run per set. The shot hashes are byte-identical to before.
// Each shot renders as its own chunk: out/<slug>/shots/<quality>/<shotId>_<hash>.mp4. The hash covers the quality + extra
// props, the shot's kitShots signature (frames, set, resolved rig, every sampled camera frame), the source files the
// entry imports (except the film file: its effect on a shot is in the signature) and, when a set lives in
// `sets/<setId>.ts(x)` next to the film file, that set's own files (so a set fix re-renders only that set's shots).
// Assets under public/ are NOT hashed: use --force after replacing a texture. A changed shot gets a new hash and
// re-renders; unchanged shots are reused; stale files of the same shot are deleted. When every shot has a current file
// they are concatenated (stream copy) into out/<slug>/<slug>_<quality>.mp4. The RAM token (scripts/ram_token.sh) is
// taken before the first shot, refreshed before each shot, released at the end / on Ctrl-C. A killed run resumes: a
// shot is written to <name>.part.mp4 and renamed only when complete. s/frame per shot -> shots/<quality>/render_log.jsonl.
// Encoder: final / final4 = PNG frames, bt709, crf 15, x264 slow (render.mjs FINAL); draft / preview = JPEG q92, bt709,
// crf 18, x264 fast.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { getBundle, bundleKey } from "./bundle_cache.mjs";

const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(studio);
const tmp = process.env.REMOTION_TMP || path.resolve("../_remotion-tmp");
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = tmp;
// disk guard (2026-11-19: 65 GB of leftover bundles filled C:): sweep bundles / browser profiles older than 12 h
try { const _now = Date.now(); for (const _n of fs.readdirSync(tmp)) { if (!/^(remotion-webpack-bundle-|puppeteer_dev_chrome_profile-|remotion-v\d)/.test(_n)) continue; const _p = path.join(tmp, _n); if (_now - fs.statSync(_p).mtimeMs > 12 * 3600e3) fs.rmSync(_p, { recursive: true, force: true }); } } catch {}

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2), A = {};
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  if (!k.startsWith("--")) continue;
  const n = argv[i + 1];
  if (n === undefined || n.startsWith("--")) A[k.slice(2)] = true; else { A[k.slice(2)] = n; i++; }
}
const die = (m) => { console.error("kit_render: " + m); process.exit(2); };
if (!A.entry) die("--entry <entry.ts> is required");
const entry = path.resolve(A.entry);
const log = (...m) => console.log(`[kit_render ${new Date().toTimeString().slice(0, 8)}]`, ...m);
if (A["bundle-only"]) {
  const b = await getBundle({ entry, studio, log });
  console.log(b.serveUrl);
  process.exit(0);
}
if (!A.comp) die("--comp <composition id> is required");
const QUALITIES = { draft: { scale: 0.5, final: false }, preview: { scale: 0.5, final: false }, final4: { scale: 1, final: true }, final: { scale: 1, final: true } };
const quality = A.quality || "preview";
if (!QUALITIES[quality]) die(`--quality must be one of ${Object.keys(QUALITIES).join(", ")}`);
const Q = QUALITIES[quality];
const outDir = path.resolve(A.out || `out/${A.comp}`);
const slug = path.basename(outDir);
const extra = A.props ? JSON.parse(A.props) : {};
const inputProps = { kit: { ...extra, quality } };
const conc = Number(A.conc || 2);

// ---------------------------------------------------------------- stills (the stills limiter, no RAM token)
if (A.stills) {
  const dir = path.join(outDir, "stills", quality); fs.mkdirSync(dir, { recursive: true });
  const rel = path.relative(studio, path.join(dir, "f")).split(path.sep).join("/");
  log(`stills ${A.stills} -> ${rel}<frame>.jpg (scale ${Q.scale})`);
  const r = spawnSync("bash", ["scripts/stills_locked.sh", rel, String(A.stills), String(Q.scale)], {
    stdio: "inherit", env: { ...process.env, COMP: A.comp, ENTRY: path.relative(studio, entry).split(path.sep).join("/"), PROPS: JSON.stringify(inputProps), ...(A.bundle ? { KIT_BUNDLE_DIR: path.resolve(A.bundle) } : {}) } });
  process.exit(r.status ?? 1);
}

// ---------------------------------------------------------------- RAM token
const RAM_ME = process.env.RAM_ME || `kit_${slug}`;
let holding = false;
const ram = (cmd) => spawnSync("bash", ["-c", `source scripts/ram_token.sh; ${cmd}`], { stdio: "inherit", env: { ...process.env, RAM_ME } });
const take = (job) => { ram(`ram_take "${job.replace(/"/g, "")}"`); holding = true; };
const release = () => { if (holding) { ram("ram_release"); holding = false; } };
let partFile = null;
for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"]) process.on(sig, () => { log(`${sig}: releasing the RAM token`); if (partFile) try { fs.rmSync(partFile, { force: true }); } catch {} release(); process.exit(130); });

// ---------------------------------------------------------------- bundle + composition
// KIT_PROFILE=1 loads the CommonJS build of the renderer (same code; its per-frame steps can be timed), else the ESM one
const { renderMedia, selectComposition, openBrowser } = process.env.KIT_PROFILE === "1" ? createRequire(import.meta.url)("@remotion/renderer") : await import("@remotion/renderer");
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
const t0 = Date.now();
const { serveUrl, stale } = await getBundle({ entry, studio, log, bundleDir: A.bundle || null });
// a stale --bundle would render old code into chunks named by the CURRENT sources' hashes (a poisoned cache): refuse
if (A.bundle && stale !== false && !A.frames && !A.info && !A["dry-run"])
  die(`--bundle ${A.bundle} ${stale ? "is older than the current sources" : "is not a shared-cache bundle (cannot check it)"}; ` +
    `shot chunks would be mislabelled. Drop --bundle (the shared cache reuses the bundle anyway while nothing changes), or use it only for --frames / --info.`);
log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// ---------------------------------------------------------------- source hashing (esbuild metafile), started now, runs beside selectComposition
const esbuild = await import("esbuild");
const graphMeta = async (file, externalFiles = new Set()) => {
  const r = await esbuild.build({
    entryPoints: [file], bundle: true, write: false, metafile: true, logLevel: "silent", platform: "browser", format: "esm", jsx: "automatic",
    loader: { ".png": "empty", ".jpg": "empty", ".jpeg": "empty", ".css": "empty", ".svg": "empty", ".wav": "empty", ".mp3": "empty", ".glsl": "text" },
    plugins: [{ name: "kit-ext", setup(b) {
      b.onResolve({ filter: /^[^./]/ }, (a) => (/^[A-Za-z]:[\\/]/.test(a.path) ? undefined : { path: a.path, external: true }));
      b.onResolve({ filter: /^\./ }, (a) => {
        for (const ext of ["", ".ts", ".tsx", "/index.ts"]) {
          const p = path.resolve(a.resolveDir, a.path + ext);
          if (externalFiles.has(p)) return { path: p, external: true };
        }
        return undefined;
      });
    } }],
  });
  return r.metafile;
};
const inputsOf = (meta) => Object.keys(meta.inputs).filter((f) => !f.includes("node_modules") && !f.startsWith("(")).map((f) => path.resolve(f));
const graph = async (file, externalFiles = new Set()) => inputsOf(await graphMeta(file, externalFiles));
const hashFiles = (files) => {
  const h = crypto.createHash("sha1");
  for (const f of [...new Set(files)].sort()) { h.update(path.relative(studio, f)); h.update("\0"); try { h.update(fs.readFileSync(f)); } catch { h.update("missing"); } }
  return h.digest("hex");
};
/** the file lists the hashes are made of: { all, filmFile, setFiles, shared, sets: {id: [files]} } (same as the old per-set esbuild runs) */
const sourceLists = async (setIds) => {
  const tS = Date.now();
  const gkey = crypto.createHash("sha1").update(JSON.stringify({ v: 1, src: bundleKey({ entry, studio, withPublic: false }).key, film: A.film ? path.resolve(A.film) : null, setIds: [...setIds].sort() })).digest("hex").slice(0, 16);
  const cacheFile = path.join(tmp, "kitbundles", `srcgraph-${gkey}.json`);
  try { const c = JSON.parse(fs.readFileSync(cacheFile, "utf8")); log(`sources: graph reused (${((Date.now() - tS) / 1000).toFixed(1)} s)`); return c; } catch {}
  const meta = await graphMeta(entry);
  const all = inputsOf(meta);
  const filmFile = A.film ? path.resolve(A.film) : all.find((f) => /[\\/]film\.tsx?$/.test(f));
  const setFiles = {};
  if (filmFile) for (const id of setIds) {
    for (const ext of [".ts", ".tsx"]) { const p = path.join(path.dirname(filmFile), "sets", id + ext); if (fs.existsSync(p)) { setFiles[id] = p; break; } }
  }
  // the graph below each file, read from the one metafile (blocked = files treated as external, as the old runs did)
  const keyOf = new Map(Object.keys(meta.inputs).map((k) => [path.resolve(k), k]));
  const reach = (startAbs, blocked) => {
    const seen = new Set(), st = [keyOf.get(startAbs)];
    while (st.length) {
      const k = st.pop(); if (k === undefined || seen.has(k)) continue; seen.add(k);
      for (const im of meta.inputs[k].imports || []) { if (im.external) continue; if (blocked.has(path.resolve(im.path))) continue; st.push(im.path); }
    }
    return [...seen].filter((f) => !f.includes("node_modules") && !f.startsWith("(")).map((f) => path.resolve(f));
  };
  const shared = reach(entry, new Set(Object.values(setFiles))).filter((f) => f !== filmFile);
  const sharedSet = new Set(shared);
  const sets = {};
  for (const [id, f] of Object.entries(setFiles)) sets[id] = (keyOf.has(f) ? reach(f, new Set()) : await graph(f)).filter((x) => !sharedSet.has(x) && x !== filmFile);
  const res = { all, filmFile: filmFile || null, setFiles, shared, sets };
  try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); const t = `${cacheFile}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(res)); fs.renameSync(t, cacheFile); } catch {}
  log(`sources: one esbuild graph in ${((Date.now() - tS) / 1000).toFixed(1)} s`);
  return res;
};
/** the old way (one esbuild run for the entry, one with the sets external, one per set): for --verify-hash */
const sourceListsOld = async (setIds) => {
  const all = await graph(entry);
  const filmFile = A.film ? path.resolve(A.film) : all.find((f) => /[\\/]film\.tsx?$/.test(f));
  const setFiles = {};
  if (filmFile) for (const id of setIds) {
    for (const ext of [".ts", ".tsx"]) { const p = path.join(path.dirname(filmFile), "sets", id + ext); if (fs.existsSync(p)) { setFiles[id] = p; break; } }
  }
  const shared = (await graph(entry, new Set(Object.values(setFiles)))).filter((f) => f !== filmFile);
  const sharedSet = new Set(shared);
  const sets = {};
  for (const [id, f] of Object.entries(setFiles)) sets[id] = (await graph(f)).filter((x) => !sharedSet.has(x) && x !== filmFile);
  return { all, filmFile: filmFile || null, setFiles, shared, sets };
};

const tC = Date.now();
const composition = await selectComposition({ serveUrl, id: A.comp, inputProps, browserExecutable, chromiumOptions });
log(`composition selected in ${((Date.now() - tC) / 1000).toFixed(1)} s`);
const shots = composition.props.kitShots;
if (!Array.isArray(shots)) die(`composition ${A.comp} has no kitShots (register it with KitComposition from kit/core/pipeline)`);
if (A.info) { console.log(JSON.stringify({ comp: A.comp, total: composition.durationInFrames, shots }, null, 1)); process.exit(0); }

const setIds = [...new Set(shots.map((s) => s.set))];
const L = await sourceLists(setIds);
const filmFile = L.filmFile, setFiles = L.setFiles, sharedFiles = L.shared;
const setGraphs = {};
for (const id of Object.keys(setFiles)) setGraphs[id] = hashFiles(L.sets[id]);
const sharedHash = hashFiles(sharedFiles);
if (A["verify-hash"]) {
  const O = await sourceListsOld(setIds);
  const same = hashFiles(O.shared) === sharedHash && Object.keys(O.setFiles).length === Object.keys(setFiles).length && Object.keys(O.setFiles).every((id) => hashFiles(O.sets[id]) === setGraphs[id]);
  log(`verify-hash: new hashes ${same ? "IDENTICAL to" : "DIFFER from"} the old per-set esbuild runs`);
  if (!same) process.exit(3);
}
log(`sources: ${L.all.length} files (${sharedFiles.length} shared${filmFile ? `, film ${path.relative(studio, filmFile)}` : ""}${Object.keys(setFiles).length ? `, per-set: ${Object.keys(setFiles).join(", ")}` : ""})`);
const shotHash = (s) => crypto.createHash("sha1").update(JSON.stringify({ quality, extra, sig: s.sig, from: s.from, to: s.to, set: s.set, rig: s.rig, sharedHash, setHash: setGraphs[s.set] ?? "" })).digest("hex").slice(0, 12);

// ---------------------------------------------------------------- optional per-frame profile (KIT_PROFILE=1)
const prof = { seek: [], take: [] };
if (process.env.KIT_PROFILE === "1") {
  const req = createRequire(import.meta.url);
  const dist = path.dirname(req.resolve("@remotion/renderer"));
  const seekMod = req(path.join(dist, "seek-to-frame.js")), takeMod = req(path.join(dist, "take-frame.js"));
  const s0 = seekMod.seekToFrame, k0 = takeMod.takeFrame;
  seekMod.seekToFrame = async (a) => { const t = performance.now(); const r = await s0(a); prof.seek.push(performance.now() - t); return r; };
  takeMod.takeFrame = async (a) => { const t = performance.now(); const r = await k0(a); prof.take.push(performance.now() - t); return r; };
}
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.floor(s.length / 2)]); };

// ---------------------------------------------------------------- shared render of one frame range
let browser = null;
const encOpts = Q.final ? { imageFormat: "png", colorSpace: "bt709", crf: 15, x264Preset: "slow" } : { imageFormat: "jpeg", jpegQuality: 92, colorSpace: "bt709", crf: 18, x264Preset: "fast" };
const closeBrowser = async () => { if (!browser) return; const b = browser; browser = null; await Promise.race([b.close({ silent: true }).catch(() => {}), new Promise((r) => setTimeout(r, 8000))]); };
/** render frames [a, b] into `outFile` (via .part), returning timing */
const renderRange = async (label, a, b, outFile) => {
  const part = outFile.replace(/\.mp4$/, ".part.mp4");
  if (!browser) browser = await openBrowser("chrome", { browserExecutable, chromiumOptions, forceDeviceScaleFactor: Q.scale });
  const frames = b - a + 1, ts = Date.now(), pageMs = [], notes = [], stamps = [];
  partFile = part; prof.seek.length = 0; prof.take.length = 0;
  let last = -1;
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: part, inputProps, scale: Q.scale, ...encOpts, concurrency: conc,
    browserExecutable, chromiumOptions, puppeteerInstance: browser, timeoutInMilliseconds: 300000, muted: true, frameRange: [a, b],
    onBrowserLog: (l) => {
      const m = /^kit-ms (\d+) (\d+)/.exec(l.text); if (m) { pageMs.push(Number(m[2])); return; }
      if (/^kit[ -]/.test(l.text)) notes.push(l.text.slice(0, 400));
      if (l.type === "error" && !/Failed to load resource/.test(l.text)) console.log("  [page error]", l.text.slice(0, 300));
      if (A["keep-browser-logs"]) console.log("  [page]", l.text.slice(0, 300));
    },
    onProgress: ({ renderedFrames }) => {
      stamps.push([renderedFrames, Date.now()]);
      const p = Math.floor((renderedFrames / frames) * 4); if (p > last) { last = p; log(`  ${label}: ${renderedFrames}/${frames} frames, ${((Date.now() - ts) / 1000).toFixed(0)} s`); }
    } });
  fs.renameSync(part, outFile); partFile = null;
  const wall = (Date.now() - ts) / 1000;
  // steady state: from 25 % of the frames to the last (excludes page start, set build, shader compile, the GI bake)
  const f1 = stamps.find(([n]) => n >= Math.max(2, Math.floor(frames * 0.25))), fN = stamps[stamps.length - 1];
  const steady = f1 && fN && fN[0] > f1[0] ? (fN[1] - f1[1]) / 1000 / (fN[0] - f1[0]) : null;
  const sorted = [...pageMs].sort((x, y) => x - y);
  const profRec = prof.seek.length ? { seek_ms_median: med(prof.seek.slice(1)), seek_ms_first: Math.round(prof.seek[0]), take_ms_median: med(prof.take) } : {};
  return { frames, wall_s: +wall.toFixed(1), s_per_frame: +(wall / frames).toFixed(3), steady_s_per_frame: steady === null ? null : +steady.toFixed(3),
    page_ms_median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null, page_ms_max: sorted.length ? sorted[sorted.length - 1] : null, ...profRec, notes };
};
if (A.frames) {
  const [a, b] = String(A.frames).split("-").map(Number);
  const dir = path.join(outDir, "test"); fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${quality}_${a}-${b}.mp4`);
  take(`kit ${slug} ${quality} frames ${a}-${b}`);
  try {
    log(`test clip frames ${a}-${b} at ${quality} -> ${path.relative(studio, out)}`);
    const r = await renderRange(`${a}-${b}`, a, b, out);
    const rec = { time: new Date().toISOString(), slug, quality, frames_range: `${a}-${b}`, conc, scale: Q.scale, ...r };
    fs.appendFileSync(path.join(dir, "test_log.jsonl"), JSON.stringify(rec) + "\n");
    log(`frames ${a}-${b}: ${r.wall_s} s wall = ${r.s_per_frame} s/frame (steady ${r.steady_s_per_frame} s/frame, page render median ${r.page_ms_median} ms)`);
    if (r.seek_ms_median != null) log(`  profile: seek (React + kit prepare/render until ready) median ${r.seek_ms_median} ms (first ${r.seek_ms_first} ms), capture median ${r.take_ms_median} ms`);
    for (const n of r.notes) log("  " + n);
  } finally { await closeBrowser(); release(); }
  process.exit(0);
}

// ---------------------------------------------------------------- render the shots
const want = !A.shots || A.shots === "all" ? shots.map((s) => s.id) : String(A.shots).split(",").map((x) => x.trim());
for (const id of want) if (!shots.find((s) => s.id === id)) die(`no shot "${id}" (have ${shots.map((s) => s.id).join(", ")})`);
const shotDir = path.join(outDir, "shots", quality); fs.mkdirSync(shotDir, { recursive: true });
const logFile = path.join(shotDir, "render_log.jsonl");
const fileOf = (s) => path.join(shotDir, `${s.id}_${shotHash(s)}.mp4`);
const todo = shots.filter((s) => want.includes(s.id) && (A.force || !fs.existsSync(fileOf(s))));
log(`${quality}: ${want.length} shot(s) asked, ${todo.length} to render, ${want.length - todo.length} cached`);
if (A["dry-run"]) {
  for (const s of shots.filter((x) => want.includes(x.id))) log(`  ${path.basename(fileOf(s))} ${fs.existsSync(fileOf(s)) ? "cached" : "TO RENDER"}`);
  process.exit(0);
}
try {
  for (const s of todo) {
    const out = fileOf(s);
    take(`kit ${slug} ${quality} ${s.id}`);
    log(`shot ${s.id}: frames ${s.from}-${s.to - 1} (${s.to - s.from}), set ${s.set}, rig ${s.rig} -> ${path.relative(studio, out)}`);
    const r = await renderRange(s.id, s.from, s.to - 1, out);
    for (const f of fs.readdirSync(shotDir)) if (f.startsWith(s.id + "_") && f.endsWith(".mp4") && path.join(shotDir, f) !== out && !f.includes(".part.")) fs.rmSync(path.join(shotDir, f));
    const rec = { time: new Date().toISOString(), slug, quality, shot: s.id, conc, scale: Q.scale, ...r, notes: r.notes.slice(0, 12), file: path.basename(out) };
    fs.appendFileSync(logFile, JSON.stringify(rec) + "\n");
    log(`shot ${s.id}: ${r.wall_s} s = ${r.s_per_frame} s/frame wall, steady ${r.steady_s_per_frame} s/frame (page render median ${r.page_ms_median} ms)`);
  }
} finally {
  await closeBrowser();
  release();
}

// ---------------------------------------------------------------- concat
const missing = shots.filter((s) => !fs.existsSync(fileOf(s)));
if (missing.length) log(`not concatenating: ${missing.length} shot(s) not rendered at ${quality} yet (${missing.map((s) => s.id).join(", ")})`);
else {
  const list = path.join(shotDir, "concat.txt");
  fs.writeFileSync(list, shots.map((s) => `file '${path.basename(fileOf(s))}'`).join("\n") + "\n");
  const film = path.join(outDir, `${slug}_${quality}.mp4`);
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", film], { stdio: "inherit" });
  if (r.status === 0) log(`film -> ${path.relative(studio, film)} (${shots.length} shots, ${composition.durationInFrames} frames)`);
  else log("ffmpeg concat failed");
}
log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

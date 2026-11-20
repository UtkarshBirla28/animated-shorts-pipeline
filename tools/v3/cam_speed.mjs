// CAMERA SPEED BRIDGE (v3, WORKFLOW): measures on-screen camera speed with CORE's `camSpeedStats` (kit/core/camera.ts,
// the look_metrics.py formula: % of the frame per frame) so bible_validate.py / the gates never guess.
//
// INTERFACE (stable; bible_validate.py calls it):
//   node tools/v3/cam_speed.mjs --plan <request.json>   the bible's PLANNED cameras: each shot's CORE preset + params on a
//                                                      canonical layout (subject at the origin, camera on +Z), its duration
//        request.json = { "shots": [ { "id": "s01", "preset": "pushIn", "params": { "fov": 55, "height_m": 1.3,
//                         "dist_m": [2.6, 1.1], "ease": "inOut", ... }, "dur": 4.4 } ] }
//   node tools/v3/cam_speed.mjs --film <studio/src/videos3/<slug>/film.ts>   the BUILT film's real cameras (FILM.shots[].cam)
//   stdout (last line, JSON): { "ok": true, "source": "camSpeedStats(plan|film)", "shots": { "<id>": { "median", "p90",
//        "mean", "fastShare", "stillShare", "peak", "frames" } }, "film": { "median", "fastShare", "stillShare" } }
//   or { "ok": false, "reason": "..." } (camera.ts missing, film code does not bundle in Node, ...): the caller falls back
//   to the bible's planned speed_pct_f / targets.json preset priors.
// Bundling: esbuild from studio/node_modules (no install). Run from anywhere; paths are resolved against the repo.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const STUDIO = path.join(ROOT, "studio");
const out = (o) => { console.log(JSON.stringify(o)); process.exit(0); };
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const CAMERA_TS = path.join(STUDIO, "src/kit/core/camera.ts");
if (!fs.existsSync(CAMERA_TS)) out({ ok: false, reason: "kit/core/camera.ts not found (CORE not landed)" });

let esbuild;
try { esbuild = createRequire(path.join(STUDIO, "package.json"))("esbuild"); }
catch (e) { out({ ok: false, reason: "esbuild not in studio/node_modules: " + e.message }); }

const plan = arg("--plan"), film = arg("--film");
if (!plan && !film) out({ ok: false, reason: "usage: --plan <request.json> | --film <film.ts>" });
const rel = (p) => "./" + path.relative(STUDIO, p).split(path.sep).join("/");

// The probe runs INSIDE the bundle: it imports camera.ts (and the film) and prints the JSON.
const PROBE_COMMON = `
const summary = (st) => ({ median: st.median, p90: st.p90, mean: st.mean, fastShare: st.fastShare, stillShare: st.stillShare,
  peak: st.perFrame.filter(Number.isFinite).reduce((m, x) => Math.max(m, x), 0), frames: st.frames });
const filmStats = (all) => { const v = all.filter(Number.isFinite).sort((a, b) => a - b); const q = (p) => v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : 0;
  return { median: q(0.5), fastShare: v.filter((x) => x > 1).length / Math.max(1, v.length), stillShare: v.filter((x) => x < 0.15).length / Math.max(1, v.length), frames: v.length }; };
`;
const probePlan = (reqPath) => `
import * as C from ${JSON.stringify(rel(CAMERA_TS))};
${PROBE_COMMON}
const req = ${fs.readFileSync(reqPath, "utf8")};
// canonical layout: the subject's ground point at the origin, the camera on +Z at dist_m, height_m above the ground
const mk = (s) => {
  const p = s.params || {}, dur = Math.max(0.2, s.dur), [d0, d1] = p.dist_m || [3, 2.2], h = p.height_m ?? 1.2, lookH = p.lookH ?? 1.1;
  const common = { fov: p.fov, ease: p.ease, shake: p.shake ?? 0, seed: 7 };
  const walk = p.walk_mps ?? 0, tgt = [0, lookH, 0];
  switch (s.preset) {
    case "lowWideTrack": return C.lowWideTrack({ ...common, subject: walk ? (u) => [0, 0, -walk * u] : [0, 0, 0], dist: [d0, d1], height: h, side: p.side, lookH }, dur);
    case "pushIn": return C.pushIn({ ...common, from: [p.x ?? 0.3, h, d0], target: tgt, amount: p.amount ?? Math.max(0.02, (d0 - d1) / d0), rise: p.rise, fovTo: p.fovTo }, dur);
    case "pullBack": return C.pullBack({ ...common, from: [p.x ?? 0.3, h, d0], target: tgt, amount: p.amount ?? Math.max(0.02, (d1 - d0) / d0), rise: p.rise ?? 0.3, fovTo: p.fovTo }, dur);
    case "droneRise": return C.droneRise({ ...common, start: [0, h, d0], target: [0, 0.8, 0], rise: p.rise ?? 1.5, forward: p.forward ?? (d0 - d1) }, dur);
    case "craneDown": return C.craneDown({ ...common, start: [0, h, d0], target: [0, 1.0, 0], endH: p.endH ?? 1.2, travel: p.travel ?? (d0 - d1) }, dur);
    case "orbit": return C.orbit({ ...common, target: [0, lookH, 0], radius: d0, height: h, a0: p.a0, a1: p.a1, lookH: 0 }, dur);
    case "followSide": return C.followSide({ ...common, subject: (u) => [(walk || 1.2) * u, 0, 0], side: d0, height: h, lookH }, dur);
    case "povHandheld": return C.povHandheld({ ...common, from: [0, 1.6, d0], to: [0, 1.6, d1] }, dur);
    case "macroTopDown": return C.macroTopDown({ ...common, target: [0, 0.8, 0], height: Math.max(0.15, h - 0.8) }, dur);
    case "lockedWithDrift": return C.lockedWithDrift({ ...common, pos: [0.2, h, d0], look: tgt }, dur);
    case "whipPan": return C.whipPan({ ...common, pos: [0, h, d0], lookA: tgt, lookB: [3, lookH, 0] }, dur);
    default: return null;
  }
};
const shots = {}, all = [];
for (const s of req.shots) {
  const f = mk(s); if (!f) { shots[s.id] = { error: "unknown preset " + s.preset }; continue; }
  const n = Math.max(3, Math.round(s.dur * 30));
  // an orbit / follow keeps the subject centred: its points at 0.7x and 2x cancel in the fit, so weight the background
  // (what fills a real frame behind the subject); CAVEAT reported to CORE in PIPELINE_V3.md
  const depthK = (s.params && s.params.depthK) || (["orbit", "followSide"].includes(s.preset) ? [1, 2, 4] : undefined);
  const st = C.camSpeedStats((t) => f(t), 0, n, depthK ? { depthK } : {});
  shots[s.id] = summary(st); all.push(...st.perFrame);
}
console.log(JSON.stringify({ ok: true, source: "camSpeedStats(plan)", shots, film: filmStats(all) }));
`;
const probeFilm = (filmPath) => `
import * as C from ${JSON.stringify(rel(CAMERA_TS))};
import { FILM } from ${JSON.stringify(rel(filmPath))};
${PROBE_COMMON}
const shots = {}, all = [];
for (const s of FILM.shots) {
  const st = C.camSpeedStats(s.cam, s.from, s.to), bg = C.camSpeedStats(s.cam, s.from, s.to, { depthK: [1, 2, 4] });
  // median_bg / peak_bg: background-weighted (orbits / follows keep the subject centred: see the CAVEAT in tools/v3/NOTES.md)
  shots[s.id] = { ...summary(st), median_bg: bg.median, peak_bg: summary(bg).peak }; all.push(...st.perFrame);
}
console.log(JSON.stringify({ ok: true, source: "camSpeedStats(film)", shots, film: filmStats(all) }));
`;

const tmpDir = path.join(STUDIO, "out", ".v3");
fs.mkdirSync(tmpDir, { recursive: true });
const outFile = path.join(tmpDir, `cam_probe_${process.pid}.mjs`);
try {
  await esbuild.build({
    stdin: { contents: plan ? probePlan(path.resolve(plan)) : probeFilm(path.resolve(film)), resolveDir: STUDIO, loader: "ts" },
    bundle: true, platform: "node", format: "esm", outfile: outFile, logLevel: "silent",
    loader: { ".png": "empty", ".jpg": "empty", ".hdr": "empty", ".glb": "empty", ".css": "empty", ".wasm": "empty" },
    jsx: "automatic", external: ["remotion", "@remotion/*", "react", "react-dom", "@react-three/*"],
  });
} catch (e) { out({ ok: false, reason: "bundle failed: " + String(e.message || e).slice(0, 400) }); }
try { await import(pathToFileURL(outFile).href); }
catch (e) { out({ ok: false, reason: "probe failed: " + String(e.message || e).slice(0, 400) }); }
finally { try { fs.unlinkSync(outFile); } catch { /* ignore */ } }

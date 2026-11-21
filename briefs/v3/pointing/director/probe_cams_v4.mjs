// DIRECTOR probe (pointing v4): the CAMERA of every shot, no render. Per frame the on-screen camera speed (% of the
// frame per frame, kit/core/camera camSpeedStats on each frame pair), then per shot: mean travel while moving, the
// trailing REST (frames at the end with speed < STILL), still share, and an ESTIMATE of the film's camera-hold share
// (frames where the camera is still; the video gate's hold frames also need the picture itself still).
//   node briefs/v3/pointing/director/probe_cams_v4.mjs [json <out>]
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), STUDIO = path.resolve(HERE, "../../../../studio");
const esbuild = createRequire(path.join(STUDIO, "package.json"))("esbuild");
const r = await esbuild.build({ stdin: { contents: `export { SHOTS } from "./src/videos3/pointing/v4/film"; export { camSpeedStats } from "./src/kit/core/camera"; export { SHOT_PLAN } from "./src/videos3/pointing/v4/shot_plan";`, resolveDir: STUDIO, loader: "ts" },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "error", loader: { ".png": "empty", ".jpg": "empty", ".glsl": "text" }, define: { "process.env.NODE_ENV": '"production"' } });
const f = path.join(HERE, "_pcam.mjs"); fs.writeFileSync(f, r.outputFiles[0].text);
globalThis.window ??= undefined;
const M = await import(pathToFileURL(f).href); fs.unlinkSync(f);
const STILL = 0.05;     // %/frame: below this the camera counts as standing still
const out = []; let stillF = 0, N = 0;
for (const s of M.SHOTS) {
  const sp = [];
  for (let q = s.from; q < s.to - 1; q++) { const st = M.camSpeedStats(s.cam, q, q + 2); sp.push(Number.isFinite(st.median) ? st.median : 0); }
  let rest = 0; for (let k = sp.length - 1; k >= 0 && sp[k] < STILL; k--) rest++;
  const moving = sp.filter((x) => x >= STILL);
  const n = s.to - s.from; N += n; const st = sp.filter((x) => x < STILL).length + 1; stillF += Math.min(n, st);
  const p = M.SHOT_PLAN.find((x) => x.id === s.id);
  out.push({ id: s.id, n, travel: moving.length ? +(moving.reduce((a, b) => a + b, 0) / moving.length).toFixed(3) : 0, peak: +Math.max(0, ...sp).toFixed(3),
    movingF: moving.length, rest: rest + 1, still: +(Math.min(n, st) / n).toFixed(2), planRest: p?.rest ?? null });
}
if (process.argv[2] === "json") fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
for (const o of out) console.log(`${o.id.padEnd(5)} ${String(o.n).padStart(3)} f  travel ${o.travel.toFixed(3).padStart(6)} %/f (peak ${o.peak.toFixed(2)})  moving ${String(o.movingF).padStart(3)} f  rest ${String(o.rest).padStart(3)} f  still ${o.still}`);
// the director's drift in metres (cams.ts caps it at DRIFT_MAX_M = 0.6 m): look distance on the shot's first frame
const DRIFTS = M.SHOT_PLAN.filter((p) => p.drift).map((p) => { const s = M.SHOTS.find((x) => x.id === p.id); const c = s.cam(s.from / 30);
  const d = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]); return { id: p.id, drift: p.drift, lookM: +d.toFixed(2), wantM: +(Math.abs(p.drift) * d).toFixed(2), capped: Math.abs(p.drift) * d > (p.driftMaxM ?? 0.6), cap: p.driftMaxM ?? 0.6 }; });
console.log("DRIFT (m): " + DRIFTS.map((x) => `${x.id} ${x.drift > 0 ? "+" : "-"}${Math.min(x.wantM, x.cap).toFixed(2)}${x.capped ? ` (CAPPED, wanted ${x.wantM} of look ${x.lookM})` : ""}`).join("; "));
if (process.argv[2] === "json") fs.writeFileSync(process.argv[3].replace(/\.json$/, "_drift.json"), JSON.stringify(DRIFTS, null, 1));
console.log(`CAMERA-STILL frames: ${stillF} of ${N} = ${(stillF / N * 100).toFixed(1)} % (the gate's hold also needs a still picture: an upper bound for holds)`);

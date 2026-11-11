// Export the current short's timeline (story.ts: SHOTS, BEAT, TOTAL, XFADE) to JSON for the sound engine and QA.
// usage: node scripts/export_timeline.mjs [out.json]   (default ../sound/antitheft/audio/timeline.json)
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SHORT } from "./short.mjs";
const out = path.resolve(process.argv[2] || `../sound/${SHORT}/audio/timeline.json`);
const tmp = path.resolve("out/_timeline_bundle.mjs");
fs.mkdirSync(path.dirname(tmp), { recursive: true });
await build({ stdin: { contents: `export { SHOTS, BEAT, TOTAL, XFADE, FPS } from "./src/videos/${SHORT}/story";`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
const shots = m.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, set: s.set, light: s.light, relight: s.relight ?? [], xfade: m.XFADE[s.id] ?? 0,
  t0: +(s.a / m.FPS).toFixed(3), t1: +(s.b / m.FPS).toFixed(3) }));
const beat = Object.fromEntries(Object.entries(m.BEAT).map(([k, f]) => [k, { f, t: +(f / m.FPS).toFixed(3) }]));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ fps: m.FPS, total: m.TOTAL, duration_s: +(m.TOTAL / m.FPS).toFixed(3), shots, beat }, null, 1));
fs.rmSync(tmp);
console.log(`timeline -> ${out}: ${shots.length} shots, ${Object.keys(beat).length} beats, ${m.TOTAL} frames (${(m.TOTAL / m.FPS).toFixed(2)} s)`);

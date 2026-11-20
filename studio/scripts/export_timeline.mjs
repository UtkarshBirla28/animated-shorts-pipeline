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
await build({ stdin: { contents: `export * from "./src/videos/${SHORT}/story";`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
const shots = m.SHOTS.map((s) => ({ id: s.id, ...(s.key ? { key: s.key, line: s.line } : {}), a: s.a, b: s.b, set: s.set, light: s.light, relight: s.relight ?? [], xfade: m.XFADE[s.id] ?? 0,
  t0: +(s.a / m.FPS).toFixed(3), t1: +(s.b / m.FPS).toFixed(3) }));
/* (clown v2) picture-time remaps: for every remapped shot, per film frame a..b-1: [source shot id, its picture time]
   (S20 slow motion, E1 / E2 replays, E3 tape rewind; see src/videos/clown/remap.ts) */
const remap = {};
if (typeof m.remapAt === "function") for (const s of m.SHOTS) {
  const rows = []; let moved = false;
  for (let f = s.a; f < s.b; f++) { const r = m.remapAt(s.id, f); rows.push([r.src, +r.t.toFixed(2)]); if (r.src !== s.id || Math.abs(r.t - f) > 0.01) moved = true; }
  if (moved) remap[s.id] = { key: s.key, a: s.a, frames: rows, ...(s.key === "E3" && m.REW ? { rewind: m.REW } : {}) };
}
const beat = Object.fromEntries(Object.entries(m.BEAT).map(([k, f]) => [k, { f, t: +(f / m.FPS).toFixed(3) }]));
/* (clown p3) THE ENDING's real frames, for the sound (film frames, 30 fps):
   e1.holds[k] = { n, a, b (the hold [a, b)), pop (the first frame the number badge is visible: the pip goes ON it, never
   before), t (the Q1 picture frame held) }; e3 = { cut, rewind1 [a, b), hold [a, b) (the slow pass on the first duck: clean
   colour, the ring), ring_full (the ring is complete from here), punch_full (the 1.5x punch-in has landed), rewind2 [a, b),
   total, punch { k, x, y } } */
const ending = {};
if (m.E1T && m.REW) {
  const h0 = m.REW.a + m.REW.r1, h1 = h0 + m.REW.hold;
  ending.e1 = { a: m.E1T.a, b: m.E1T.b, hold_frames: m.E1T.hold, whip_frames: m.E1T.whip,
    holds: m.E1T.holds.map((h) => ({ ...h, t: +h.t.toFixed(2), pop_t: +(h.pop / m.FPS).toFixed(3) })) };
  ending.e3 = { cut: m.REW.a, rewind1: [m.REW.a, h0], hold: [h0, h1], ring_full: h0 + 8, punch_full: h0 + 8, rewind2: [h1, m.TOTAL], total: m.TOTAL,
    duck_picture_frame: m.REW.duck, pass_picture: [m.REW.tS, m.REW.tE], ...(m.E3Z ? { punch: { k: +m.E3Z.k.toFixed(3), x: +m.E3Z.x.toFixed(1), y: +m.E3Z.y.toFixed(1) } } : {}) };
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ fps: m.FPS, total: m.TOTAL, duration_s: +(m.TOTAL / m.FPS).toFixed(3), shots, beat, ...ending, ...(Object.keys(remap).length ? { remap } : {}) }, null, 1));
fs.rmSync(tmp);
console.log(`timeline -> ${out}: ${shots.length} shots, ${Object.keys(beat).length} beats, ${m.TOTAL} frames (${(m.TOTAL / m.FPS).toFixed(2)} s)`);

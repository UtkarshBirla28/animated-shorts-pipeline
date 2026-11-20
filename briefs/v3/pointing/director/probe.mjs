// DIRECTOR probe (pointing v3): bundles the film's clock + shot table in Node and prints / writes what the director needs.
//   node briefs/v3/pointing/director/probe.mjs table          the shot table (frames, seconds, set, look, line)
//   node briefs/v3/pointing/director/probe.mjs caps           the caption run (frames + text)
//   node briefs/v3/pointing/director/probe.mjs json <out>     { total, L, source, shots:[{id,from,to,set,rig,line,place,beat}], ev, caps, toks, notes } (for the bible / the sheet / sound)
//   node briefs/v3/pointing/director/probe.mjs cams           camSpeedStats of every shot's real camera (hook A and B)
// No rendering; esbuild from studio/node_modules.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const STUDIO = path.join(ROOT, "studio");
const esbuild = createRequire(path.join(STUDIO, "package.json"))("esbuild");
const mode = process.argv[2] || "table";
const outArg = process.argv[3];
const withCams = mode === "cams";
const src = `
import * as TL from "./src/videos3/pointing/timeline";
import { SHOT_TABLE, TOTAL } from "./src/videos3/pointing/shots";
${withCams ? 'import { FILM, DIR_LAYERED } from "./src/videos3/pointing/film"; import * as C from "./src/kit/core/camera";' : ""}
const mode = ${JSON.stringify(mode)};
const f2 = (x) => x.toFixed(2);
// captions without React: the same rule as Captions.tsx (kept in step by hand; the film's own CAPS is the truth)
const caps = (() => {
  const LEAD = 2, HIDE_GAP = 8, HOLD = 2, out = [];
  for (const L of TL.LINES) { const ts = TL.TOKS.filter((t) => t.line === L.id); let k = 0;
    for (const ch of L.caps) { const ws = ts.slice(k, k + ch.n); k += ch.n; if (!ws.length) continue;
      out.push({ text: ch.text, f0: Math.max(0, Math.round(ws[0].s * 30) - LEAD), f1: Math.round(ws[ws.length - 1].e * 30), style: L.style, line: L.id, build: !!ch.build }); } }
  out.sort((a, b) => a.f0 - b.f0);
  for (let q = 0; q < out.length; q++) { const c = out[q], nx = out[q + 1]; if (!nx) { c.f1 = TOTAL; break; } if (nx.style === "phone" && nx.f0 < c.f1) nx.f0 = c.f1; c.f1 = nx.f0 - c.f1 >= HIDE_GAP ? c.f1 + HOLD : nx.f0; }
  return out;
})();
if (mode === "table") {
  console.log("source: " + TL.WORD_SOURCE);
  console.log("TOTAL " + TOTAL + " f = " + f2(TOTAL / 30) + " s; notes: " + (TL.TIMELINE_NOTES.join(" | ") || "none"));
  for (const r of SHOT_TABLE) console.log(r.id.padEnd(5) + String(r.from).padStart(5) + "-" + String(r.to).padEnd(5) + f2(r.from / 30).padStart(6) + "-" + f2(r.to / 30).padEnd(6) + f2((r.to - r.from) / 30).padStart(5) + " s  " + r.set.padEnd(12) + (r.look ?? "").padEnd(7) + r.line);
} else if (mode === "caps") {
  for (const c of caps) console.log(String(c.f0).padStart(5) + "-" + String(c.f1).padEnd(5) + f2(c.f0 / 30).padStart(6) + "  " + c.style.padEnd(6) + c.text);
} else if (mode === "json") {
  console.log("@@JSON" + JSON.stringify({ total: TOTAL, L: TL.L, source: TL.WORD_SOURCE, notes: TL.TIMELINE_NOTES, shots: SHOT_TABLE, ev: TL.EV, caps, toks: TL.TOKS }));
} else if (mode === "cams") {
  const rows = {};
  for (const s of FILM.shots) {
    const st = C.camSpeedStats(s.cam, s.from, s.to), bg = C.camSpeedStats(s.cam, s.from, s.to, { depthK: [1, 2, 4] });
    const pk = (a) => a.perFrame.filter(Number.isFinite).reduce((m, x) => Math.max(m, x), 0);
    rows[s.id] = { median: +st.median.toFixed(3), p90: +st.p90.toFixed(3), peak: +pk(st).toFixed(3), still: +st.stillShare.toFixed(2), median_bg: +bg.median.toFixed(3), peak_bg: +pk(bg).toFixed(3), frames: st.frames };
  }
  console.log("director's layer on: " + (DIR_LAYERED.join(" ") || "no shot"));
  console.log("@@JSON" + JSON.stringify(rows));
}
`;
const tmp = path.join(STUDIO, "out", ".v3"); fs.mkdirSync(tmp, { recursive: true });
const outFile = path.join(tmp, `dir_probe_${process.pid}.mjs`);
await esbuild.build({ stdin: { contents: src, resolveDir: STUDIO, loader: "ts" }, bundle: true, platform: "node", format: "esm", outfile: outFile, logLevel: "silent",
  loader: { ".png": "empty", ".jpg": "empty", ".hdr": "empty", ".glb": "empty", ".css": "empty", ".wasm": "empty" }, jsx: "automatic",
  external: ["remotion", "@remotion/*", "react", "react-dom", "@react-three/*"] });
const log = console.log; let json = null;
console.log = (...a) => { const s = a.join(" "); if (s.startsWith("@@JSON")) json = s.slice(6); else log(s); };
console.warn = () => {};
try { await import(pathToFileURL(outFile).href); } finally { try { fs.unlinkSync(outFile); } catch { /* ignore */ } }
console.log = log;
if (json) {
  if (outArg) { fs.writeFileSync(path.resolve(outArg), JSON.stringify(JSON.parse(json), null, 1)); log("wrote " + outArg); }
  else if (mode === "cams") { const R = JSON.parse(json); for (const [id, r] of Object.entries(R)) log(id.padEnd(5) + ` median ${String(r.median).padEnd(6)} p90 ${String(r.p90).padEnd(6)} peak ${String(r.peak).padEnd(6)} still ${String(r.still).padEnd(5)} | bg median ${String(r.median_bg).padEnd(6)} peak ${r.peak_bg}  (${r.frames} f)`);
    // the validator's film number: the duration-weighted median of the shot medians (orbit / follow shots by their bg median)
    const BG = new Set(["s16a", "s16b", "s23"]);
    const xs = Object.entries(R).map(([id, r]) => [BG.has(id) ? r.median_bg : r.median, r.frames]).sort((a, b) => a[0] - b[0]);
    const tot = xs.reduce((a, x) => a + x[1], 0); let acc = 0, med = 0; for (const [m, d] of xs) { acc += d; if (acc >= tot / 2) { med = m; break; } }
    log(`FILM: duration-weighted median of shot medians ${med} %/f; share of time in shots >= 0.5: ${(xs.filter((x) => x[0] >= 0.5).reduce((a, x) => a + x[1], 0) / tot * 100).toFixed(0)} %, under 0.15: ${(xs.filter((x) => x[0] < 0.15).reduce((a, x) => a + x[1], 0) / tot * 100).toFixed(0)} %`); }
  else log(json);
}

// DIRECTOR probe (pointing v4): the captions against the cuts, no render. For every cut: the caption on the last frame
// before and the first frame after. FAILS (exit 1) when a chunk straddles a cut, a chunk shows words of a line whose
// shot has ended, a chunk comes up late (its first word starts but nothing shows), a chunk is on screen < MIN frames, or
// a caption shows during the Go run.   node briefs/v3/pointing/director/probe_captions_v4.mjs [--all (print every cut)]
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), STUDIO = path.resolve(HERE, "../../../../studio");
const esbuild = createRequire(path.join(STUDIO, "package.json"))("esbuild");
const r = await esbuild.build({ stdin: { contents: `export * as TL from "./src/videos3/pointing/v4/timeline"; export * as CP from "./src/videos3/pointing/v4/captions_plan";`, resolveDir: STUDIO, loader: "ts" }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "error" });
const f = path.join(HERE, "_pcap.mjs"); fs.writeFileSync(f, r.outputFiles[0].text); const { TL, CP } = await import(pathToFileURL(f).href); fs.unlinkSync(f);
const MIN = 8, ALL = process.argv.includes("--all");
const fails = [], rows = [];
const shotOf = TL.shotOfFrame, at = CP.capAt;
for (const c of CP.CUT_FRAMES) {
  const a = at(c - 1), b = at(c);
  rows.push(`${shotOf(c - 1).padEnd(4)}|${shotOf(c).padEnd(4)} f${String(c).padStart(4)}  before: ${a ? `"${a.text}"` : "-"}  ->  after: ${b ? `"${b.text}"` : "-"}`);
  if (a && b && a === b && a.style !== "c" && !CP.THROUGH_CUT.has(a.line)) fails.push(`straddle at f${c} (${shotOf(c - 1)}->${shotOf(c)}): "${a.text}"`);   // a shout may run through its J-cut
}
for (const cap of CP.CAPS) {
  const n = cap.f1 - cap.f0;
  if (n < MIN) fails.push(`short: "${cap.text}" ${n} f (f${cap.f0}-${cap.f1})`);
  // every frame of the chunk sits in a shot that plays one of the chunk's line's words (or is its line's shot)
  const toks = TL.TOKS.filter((t) => t.line === cap.line);
  const shotsOfLine = new Set(toks.map((t) => shotOf(Math.round(t.s * 30))));
  for (let q = cap.f0; q < cap.f1; q++) if (!shotsOfLine.has(shotOf(q))) { fails.push(`"${cap.text}" (${cap.line}) shows in ${shotOf(q)} at f${q}, a shot with none of its line's words`); break; }
}
// late: a word is being spoken, the word has a chunk, but no caption is up at its first frame
for (const t of TL.TOKS) {
  const L = TL.LINES.find((l) => l.id === t.line); if (!L || !L.caps.length) continue;
  const fs0 = Math.round(t.s * 30); if (!at(fs0)) fails.push(`late: nothing on screen when "${t.w}" (${t.line}) starts at f${fs0}`);
}
// the Go run: no normal chunk from the first Go to "Did" (only the GO pulses below)
const g0 = Math.round(TL.S("go#1") * 30), g1 = TL.FRAMES.v04[1] + 2;   // the Go run + the red beat: from the first Go to the end of v04
for (let q = g0; q < g1 - 2; q++) if (at(q)) { fails.push(`a caption during the Go run at f${q}: "${at(q).text}"`); break; }
// the GO pulses (lead 23:00): seven, one per Go word, each from its onset frame, gone before the next Go, never with a chunk
const gos = TL.TOKS.filter((t) => /^go#\d+$/.test(t.key));
if (CP.GO_PULSES.length !== 7 || gos.length !== 7) fails.push(`GO pulses: ${CP.GO_PULSES.length} pulses for ${gos.length} Go words (want 7 and 7)`);
CP.GO_PULSES.forEach((p, k) => {
  const on = Math.round(gos[k].s * 30), nx = gos[k + 1] ? Math.round(gos[k + 1].s * 30) : Infinity;
  if (p.f0 < on || p.f0 > on + 2) fails.push(`GO pulse ${p.k} starts f${p.f0}, its Go starts f${on}`);
  if (CP.CUT_FRAMES.some((c) => c > p.f0 && c < p.f1)) fails.push(`GO pulse ${p.k} straddles a cut`);
  if (p.f1 > nx - CP.GO_OFF) fails.push(`GO pulse ${p.k} is not dark ${CP.GO_OFF} f before the next Go (ends f${p.f1}, next f${nx})`);
  if (p.f1 - p.f0 > (p.k === CP.GO_PULSES.length ? CP.GO_LAST_MAX : CP.GO_MAX)) fails.push(`GO pulse ${p.k} longer than allowed`);
  if (p.f1 - p.f0 < 4) fails.push(`GO pulse ${p.k} only ${p.f1 - p.f0} f`);
  for (let q = p.f0; q < p.f1; q++) if (at(q)) { fails.push(`GO pulse ${p.k} overlaps the chunk "${at(q).text}" at f${q}`); break; }
});
console.log("GO pulses: " + CP.GO_PULSES.map((p) => `f${p.f0}-${p.f1}${p.shot ? " " + p.shot + (p.pos ? "@" + p.pos.join(",") : "") : ""}`).join(" "));
for (const p of CP.GO_PULSES) if (CP.GO_POS && p.shot && !CP.GO_POS[p.shot]) console.log(`WARN GO pulse ${p.k} in ${p.shot}: no GO_POS for that shot (fallback y 1560)`);
// the caption rectangles for gates_v4 --caps (fractions of the frame; width estimated at 0.62 em per character)
const jsonArg = process.argv.find((a) => a.startsWith("--json="));
if (jsonArg) {
  const boxes = [];
  for (const c of CP.CAPS) for (let q = c.f0; q < c.f1;) {
    const sh = shotOf(q); let e = q; while (e < c.f1 && shotOf(e) === sh) e++;
    const P = CP.capPos(q), px = 76, w = Math.min(960, c.text.length * 0.62 * px) / 1080, h = (px * 1.25) / 1920;
    boxes.push({ text: c.text, f0: q, f1: e, shot: sh, box: [P.x - w / 2, P.y - h / 2, P.x + w / 2, P.y + h / 2] }); q = e;
  }
  for (const g of CP.GO_PULSES) { const px = 130 * g.scale, w = 2.3 * px / 1080, h = px * 1.2 / 1920; boxes.push({ text: "GO!", f0: g.f0, f1: g.f1, shot: g.shot, box: [g.pos[0] - w / 2, g.pos[1] - h / 2, g.pos[0] + w / 2, g.pos[1] + h / 2] }); }
  if (CP.X_F0 >= 0) { const w = CP.X_W, h = CP.X_W * 1080 / 1920; boxes.push({ text: "X", f0: CP.X_F0, f1: CP.X_F1, shot: CP.X_SHOT, box: [CP.X_POS[0] - w / 2, CP.X_POS[1] - h / 2, CP.X_POS[0] + w / 2, CP.X_POS[1] + h / 2] }); }
  fs.writeFileSync(jsonArg.slice(7), JSON.stringify(boxes, null, 1)); console.log(`caption boxes -> ${jsonArg.slice(7)} (${boxes.length})`);
}
const lens = CP.CAPS.map((c) => c.f1 - c.f0);
if (ALL) console.log(rows.join("\n"));
console.log(`captions: ${CP.CAPS.length} chunks, ${CP.CUT_FRAMES.length} cuts; shortest chunk ${Math.min(...lens)} f; Go run f${g0}-f${g1}: ${fails.some((x) => x.includes("Go run")) ? "CAPTION SHOWN" : "no caption"}`);
for (const x of fails) console.log("FAIL", x);
console.log(fails.length ? `${fails.length} FAIL(S)` : "ALL CAPTION CHECKS PASS");
process.exit(fails.length ? 1 : 0);

// THE FILM'S CLOCK, read by the SOUND (2026-11-20). Evaluates the DIRECTOR's studio/src/videos3/pointing/timeline.ts (and the
// lab's own tink plan in sets/lab.cams.ts, and CAST's beat table through cast/acting.ts) and prints the cut frames, the
// shared events EV, the lab tinks and the cast's moves as JSON, so the sound sits on the cuts and the actions the film
// really makes, never on a second copy of the rules.
//   node film_clock.mjs                 -> the film exactly as it stands (words.ts, or plan_words.ts while words.ts is empty)
//   node film_clock.mjs --voice <dir>   -> the same code, with words.ts replaced by <dir>/words.json (what
//                                          tools/gen_words_ts.py writes into words.ts: timeline.ts reads only w, s, e)
//   --out <file>                        -> write the JSON there instead of stdout
// Uses the studio's own esbuild (studio/node_modules). Nothing in the studio is written.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(HERE, "..", "..", "..", "studio");
const FILM = path.join(STUDIO, "src", "videos3", "pointing");
const require = createRequire(path.join(STUDIO, "package.json"));
const esbuild = require("esbuild");

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const voiceDir = opt("--voice"), outFile = opt("--out");
const P = (...p) => JSON.stringify(path.join(FILM, ...p).replace(/\\/g, "/"));

let wordsSrc = null, wordsFrom = "words.ts";
if (voiceDir) {
  const wj = path.join(voiceDir, "words.json");
  const W = JSON.parse(fs.readFileSync(wj, "utf8"));
  const rows = W.map((w) => ({ w: w.w, s: +(+w.s).toFixed(3), e: +(+w.e).toFixed(3), f: Math.round(w.s * 30), fe: Math.round(w.e * 30), p: 0 }));
  wordsSrc = `export const WORDS = ${JSON.stringify(rows)};\nexport const PHRASES = [];\nexport const VOICE_END_F = ${rows.length ? rows[rows.length - 1].fe : 0};\n`;
  wordsFrom = wj;
}

const clockEntry = `
import * as T from ${P("timeline.ts")};
import { labPlan, LAB_CUES } from ${P("sets", "lab.cams.ts")};
const shots = T.SHOT_IDS.map((id) => ({ id: "v3_" + id, a: T.FRAMES[id][0], b: T.FRAMES[id][1] - 1 }));
let lab = null, labErr = null;
try { lab = labPlan(); } catch (e) { labErr = String(e); }
export const OUT = { fps: T.FPS, total: T.TOTAL, L: T.L, word_source: T.WORD_SOURCE, notes: T.TIMELINE_NOTES, shots,
  ev: T.EV, door_close_s: T.DOOR_CLOSE_S, p01_len_s: T.P01_LEN_S, lab, lab_pulse: LAB_CUES.pulse, lab_err: labErr,
  toks: T.TOKS.map((t) => ({ key: t.key, line: t.line, w: t.w, s: t.s, e: t.e, src: t.src })) };
`;
const beatsEntry = `
import { filmBeats } from ${P("cast", "acting.ts")};
import { callTimes } from ${P("cast", "gesture.ts")};
import { SHOT_TABLE } from ${P("shots.ts")};
export const OUT = { shot_table: SHOT_TABLE.map((s) => ({ id: s.id, from: s.from, to: s.to })),
  beats: filmBeats().map((t, i) => ({ i, who: t.b.who, m: t.b.m, at: t.b.at ?? null, name: t.b.name ?? null, status: t.b.status ?? null,
    f0: t.f0, f1: t.f1, gate: t.gate ?? null, stop: t.stop ?? null, ok: t.ok, why: t.why ?? null,
    late: t.b.m === "call" ? (t.b.late ?? (t.b.style === "kid" ? 6 : 0)) : 0, limp: !!t.b.limp, call: t.call ? callTimes(t.call) : null, b: t.b })) };
`;

const plugin = {
  name: "words-swap",
  setup(b) {
    if (!wordsSrc) return;
    b.onResolve({ filter: /words$/ }, (a) => (path.resolve(a.resolveDir, a.path) === path.resolve(FILM, "words") ? { path: "voice-words", namespace: "vw" } : undefined));
    b.onLoad({ filter: /.*/, namespace: "vw" }, () => ({ contents: wordsSrc, loader: "js" }));
  },
};

const build = async (contents, tag) => {
  const tmp = path.join(os.tmpdir(), `pt_film_clock_${process.pid}_${tag}.mjs`);
  try {
    await esbuild.build({
      stdin: { contents, resolveDir: FILM, loader: "ts", sourcefile: `film_clock_${tag}.ts` },
      bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error", plugins: [plugin],
      nodePaths: [path.join(STUDIO, "node_modules")], loader: { ".png": "empty", ".jpg": "empty", ".glsl": "text" },
    });
    return (await import(pathToFileURL(tmp).href)).OUT;
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
};

const OUT = await build(clockEntry, "clock");
OUT.words_from = wordsFrom;
OUT.timeline_ts = path.join(FILM, "timeline.ts");
// the cast (optional: a failure here never stops the shots; the sound then keeps its own action times)
const warn = console.warn, warned = [];
console.warn = (...a) => warned.push(a.join(" "));
try {
  const B = await build(beatsEntry, "beats");
  OUT.beats = B.beats; OUT.shot_table = B.shot_table;
} catch (e) {
  OUT.beats = null; OUT.beats_err = String((e && e.stack) || e);
}
console.warn = warn;
OUT.beats_warn = warned;
const js = JSON.stringify(OUT, null, 1);
if (outFile) fs.writeFileSync(outFile, js); else process.stdout.write(js + "\n");

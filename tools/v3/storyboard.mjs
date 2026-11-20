// STORYBOARD (v3 stage A4, WORKFLOW): one draft still per FRAMING of every shot in the DETAIL BIBLE, rendered by CORE's
// `studio/scripts/kit_render.mjs --stills` (draft quality: 540x960, 1 sub-frame, <= ~25 s per still incl. the page
// start), then a numbered contact sheet with the shot id + beat + line under each frame (tools/v3/sheet_v3.py) for
// OWNER GATE 1. It also writes the still paths into the bible (shots[].storyboard.still = the shot's first framing),
// which bible_validate --stage=gate1 checks.
//
// usage (from anywhere):
//   node tools/v3/storyboard.mjs --slug <slug> [--per framing|shot] [--quality draft] [--shots s01,s05] [--entry src/videos3/<slug>/index.ts]
//        [--comp <CompId>] [--from-dir <dir with f<frame>.jpg>] [--dry]
//   node tools/v3/storyboard.mjs --entry <entry.ts> --comp <id> --frames 0,75,149 --out <dir>    (no bible: plain stills)
// Frames: from sound/<slug>/audio/timeline.json shots (by id) once the voice is locked, else the bible's est_t0 + at_s.
// Render path: kit_render.mjs when it exists (it takes the stills slots itself), else the proven fallback
// `bash scripts/stills_locked.sh <prefix> <frames> 0.5` with COMP / ENTRY / PROPS={"kit":{"quality":"draft"}}.
// --from-dir skips rendering (re-sheet existing stills). --dry prints the frame plan only. Never plays audio.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const STUDIO = path.join(ROOT, "studio");
const PY = path.join(ROOT, "tools/.venv/Scripts/python.exe");
const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const has = (k) => argv.includes(k);
const slug = arg("--slug");
const quality = arg("--quality", "draft");
const per = arg("--per", "framing");
const fps = 30;
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";

const pascal = (s) => s.split(/[_\-]/).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const entry = arg("--entry", slug ? `src/videos3/${slug}/index.ts` : null);
const comp = arg("--comp", slug ? `${pascal(slug)}Kit` : null);
if (!entry || !comp) { console.error("need --slug, or --entry + --comp"); process.exit(2); }

// ---------------------------------------------------------------- the frame plan
let plan = [];                      // [{frame, shot, title, text, framing}]
let bible = null, biblePath = null;
if (slug && !arg("--frames")) {
  biblePath = arg("--bible", path.join(ROOT, `briefs/v3/${slug}/bible.json`));
  bible = JSON.parse(fs.readFileSync(biblePath, "utf8"));
  const tl = path.join(ROOT, `sound/${slug}/audio/timeline.json`);
  const T = fs.existsSync(tl) ? JSON.parse(fs.readFileSync(tl, "utf8")) : null;
  const byId = {};
  if (T && Array.isArray(T.shots)) for (const s of T.shots) byId[String(s.key ?? s.id)] = s;
  const shots = bible.shots;
  const only = arg("--shots") ? new Set(String(arg("--shots")).split(",")) : null;
  shots.forEach((s, i) => {
    if (only && !only.has(s.id)) return;
    const t0 = byId[s.id] ? byId[s.id].a / fps : Number(s.est_t0 || 0);
    const t1 = byId[s.id] ? byId[s.id].b / fps : (i + 1 < shots.length ? (byId[shots[i + 1].id] ? byId[shots[i + 1].id].a / fps : Number(shots[i + 1].est_t0)) : t0 + 2);
    const frs = (s.framings && s.framings.length ? s.framings : [{ at_s: s.storyboard?.frame_s ?? 0, desc: s.line }]);
    const use = per === "shot" ? [frs[0]] : frs;
    use.forEach((f, k) => {
      // the moment a framing READS: 0.5 s after it starts (or the middle of a short one), inside the shot
      const next = k + 1 < frs.length ? frs[k + 1].at_s : t1 - t0;
      const at = Math.min(Number(f.at_s || 0) + Math.min(0.5, (next - Number(f.at_s || 0)) / 2), Math.max(0, t1 - t0 - 0.05));
      const frame = Math.max(0, Math.round((t0 + at) * fps));
      plan.push({ frame, shot: s.id, framing: k, title: `${s.id}  ${s.beat || ""}  ${(t1 - t0).toFixed(1)} s`.trim(),
        text: `${f.desc || ""}  |  "${s.line || ""}"`, cam: s.camera?.preset, rig: s.light?.rig });
    });
  });
} else {
  plan = String(arg("--frames", "0")).split(",").map((x) => ({ frame: Number(x), shot: `f${x}`, framing: 0, title: `frame ${x}`, text: "" }));
}
// de-duplicate frames (two framings can round to the same frame)
const frames = [...new Set(plan.map((p) => p.frame))].sort((a, b) => a - b);
const outDir = path.resolve(STUDIO, arg("--out", `out/${slug || "storyboard"}/`));
const stillDir = arg("--from-dir") ? path.resolve(arg("--from-dir")) : path.join(outDir, "stills", quality);
console.log(`storyboard: ${plan.length} stills (${frames.length} unique frames) from ${entry} / ${comp} at ${quality} -> ${stillDir}`);
if (has("--dry")) { for (const p of plan) console.log(`  f${p.frame}  ${p.title}  ${p.cam || ""} ${p.rig || ""}`); process.exit(0); }

// ---------------------------------------------------------------- render (kit_render first, the proven fallback second)
const imgOf = (f) => {
  for (const name of [`f${f}.jpg`, `f${String(f).padStart(4, "0")}.jpg`, `${f}.jpg`]) { const p = path.join(stillDir, name); if (fs.existsSync(p)) return p; }
  return path.join(stillDir, `f${f}.jpg`);
};
if (!arg("--from-dir")) {
  const todo = frames.filter((f) => !fs.existsSync(imgOf(f)) || has("--force"));
  if (todo.length) {
    const kr = path.join(STUDIO, "scripts/kit_render.mjs");
    let r;
    if (fs.existsSync(kr)) {
      r = spawnSync("node", [kr, "--entry", entry, "--comp", comp, "--quality", quality, "--stills", todo.join(","), "--out", path.relative(STUDIO, outDir) + "/"],
        { cwd: STUDIO, stdio: "inherit" });
    } else {
      // TODO(CORE): remove this branch once every film renders through kit_render.mjs
      fs.mkdirSync(stillDir, { recursive: true });
      const env = { ...process.env, COMP: comp, ENTRY: entry, PROPS: JSON.stringify({ kit: { quality } }) };
      r = spawnSync(bash, ["scripts/stills_locked.sh", path.relative(STUDIO, path.join(stillDir, "f")).split(path.sep).join("/"), todo.join(","), "0.5"],
        { cwd: STUDIO, stdio: "inherit", env });
    }
    if (r.status !== 0) console.error(`render step exited ${r.status}: the sheet marks missing stills as "not rendered"`);
  }
}

// ---------------------------------------------------------------- the sheet + bible update
const items = plan.map((p) => ({ img: imgOf(p.frame), title: `${p.title}  f${p.frame}`, text: p.text }));
fs.mkdirSync(outDir, { recursive: true });
const itemsPath = path.join(outDir, `storyboard_${quality}.json`);
fs.writeFileSync(itemsPath, JSON.stringify(items, null, 1));
const sheet = path.join(outDir, `storyboard_${quality}.jpg`);
const r2 = spawnSync(PY, ["-s", path.join(HERE, "sheet_v3.py"), itemsPath, sheet, String(arg("--cols", "6"))],
  { env: { ...process.env, PYTHONNOUSERSITE: "1" }, encoding: "utf8" });
if (r2.status !== 0) { console.error(r2.stderr); process.exit(1); }
const have = items.filter((i) => fs.existsSync(i.img)).length;
if (bible && biblePath && !has("--no-bible")) {
  for (const s of bible.shots) {
    const p = plan.find((x) => x.shot === s.id);
    if (!p) continue;
    const img = imgOf(p.frame);
    s.storyboard = { ...(s.storyboard || {}), frame_s: s.storyboard?.frame_s ?? null, still: fs.existsSync(img) ? path.relative(ROOT, img).split(path.sep).join("/") : null };
  }
  // the storyboard is "draft" only when EVERY shot has its still (a --shots run updates only those shots)
  const allHave = bible.shots.every((s) => s.storyboard && s.storyboard.still && fs.existsSync(path.join(ROOT, s.storyboard.still)));
  bible.status = { ...(bible.status || {}), storyboard: allHave ? "draft" : "none" };
  fs.writeFileSync(biblePath, JSON.stringify(bible, null, 1));
}
console.log(`sheet: ${sheet}  (${have} of ${items.length} stills present)`);

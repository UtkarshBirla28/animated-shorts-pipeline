// AUDIO cast probe: run the CAST's own stage(id, f) (cast.ts) in node with a no-op canvas, frame by frame, and write
// the frames of the picture actions that make sound (bubble pops, walk foot contacts, hand moves, pocket entries,
// pats ...) to sound/antitheft/audio/picture_cast.json. sfx.py reads it (after its BEAT-keyed defaults, before the
// manual overrides in picture_events.json), so a CHAR re-time or a voice re-time follows on the next `python mix.py`.
// No render, no GPU: the drawings are never drawn (the Stage only carries their keys + world positions).
// usage: node scripts/audio_cast_probe.mjs [storyDir] [out.json] [--dump id:f0-f1[:actor]]
//   storyDir defaults to src/videos/antitheft (e.g. src/videos/antitheft_char to probe CHAR's sandbox)
import { build } from "esbuild";
import fs from "node:fs";
import { SHORT } from "./short.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ---------------- a no-op 2D canvas (enough for module-level texture painting) ----------------
const noop = () => {};
const grad = { addColorStop: noop };
const ctxProxy = () => {
  const store = { canvas: null };
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === "measureText") return (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (k === "getImageData") return (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(4, w * h * 4)) });
      if (k === "createImageData") return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(4, w * h * 4)) });
      if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createConicGradient") return () => grad;
      if (k === "createPattern") return () => ({ setTransform: noop });
      if (k === "getTransform") return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, invertSelf() { return this; } });
      if (k === "isPointInPath" || k === "isPointInStroke") return () => false;
      if (k === "getLineDash") return () => [];
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
};
const mkCanvas = () => {
  const c = { width: 300, height: 150, style: {}, getContext() { const g = ctxProxy(); g.canvas = c; return g; },
    toDataURL: () => "", addEventListener: noop, removeEventListener: noop };
  return c;
};
globalThis.document = { createElement: () => mkCanvas(), createElementNS: () => mkCanvas() };
globalThis.window = globalThis;
globalThis.HTMLCanvasElement = function () {};
globalThis.Image = function () { return mkCanvas(); };
globalThis.OffscreenCanvas = function (w, h) { const c = mkCanvas(); c.width = w; c.height = h; return c; };

const storyDir = (process.argv[2] && !process.argv[2].startsWith("--")) ? process.argv[2] : `src/videos/${SHORT}`;
const outArg = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : `../sound/${SHORT}/audio/picture_cast.json`;
const out = path.resolve(outArg);
const dumpI = process.argv.indexOf("--dump");
const tmp = path.resolve(`out/_audio_cast_probe_${process.pid}.mjs`);
// A5: idle life (breath / blinks / raven idle hops) runs on the VIDEO clock: stage() gets vf = toNew(f) when voicewarp.ts exists
const hasWarp = fs.existsSync(path.resolve(`${storyDir}/voicewarp.ts`));
await build({ stdin: { contents: `export * from "./${storyDir}/story"; export { stage } from "./${storyDir}/cast"; export { swapPath } from "./${storyDir}/toon"; export * from "./${storyDir}/plan"; export * as THREE from "three";`
  + (hasWarp ? ` export { toNew as __toNew } from "./${storyDir}/voicewarp";` : ""),
  resolveDir: process.cwd(), loader: "ts" }, bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error",
  loader: { ".png": "dataurl", ".jpg": "dataurl", ".woff2": "dataurl", ".ttf": "dataurl" } });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE, SHOTS, BEAT, TOTAL } = m;

// ---------------- the film camera -> CamInfo (pos, right) ----------------
const ASPECT = 1080 / 1920;
const pcam = new THREE.PerspectiveCamera(50, ASPECT, 0.05, 2000);
const camOf = (id, f) => {
  const c = m.camAt(id, f);
  pcam.position.set(...c.pos); pcam.up.set(0, 1, 0); pcam.lookAt(...c.look); pcam.rotateZ(c.roll);
  pcam.fov = c.fov; pcam.updateProjectionMatrix(); pcam.updateMatrixWorld();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(pcam.quaternion);
  return { info: { pos: pcam.position.clone(), right }, cam: pcam };
};
const proj = (cam, p) => {
  const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse), s = new THREE.Vector3(...p).project(cam);
  return { x: (s.x * 0.5 + 0.5) * 1080, y: (0.5 - s.y * 0.5) * 1920, d: -v.z };
};
const vfOf = (f) => (m.__toNew ? m.__toNew(f) : f);
const stageAt = (id, f) => {
  const { info, cam } = camOf(id, f);
  return { st: m.stage(id, f, info, m.lightAt(id, f), vfOf(f)), cam };
};
/** the opts JSON inside a person key: P|actor|{json}|LXnn */
const optsOf = (key) => { const i = key.indexOf("|", 2), j = key.lastIndexOf("|LX"); try { return JSON.parse(key.slice(i + 1, j)); } catch { return null; } };
const actorOf = (key) => key.split("|")[1];
const S = (id) => SHOTS.find((s) => s.id === id);
const runs = (fs_) => { const r = []; for (const f of fs_) { if (r.length && f === r[r.length - 1][1] + 1) r[r.length - 1][1] = f; else r.push([f, f]); } return r; };

// ---------------- dump mode (to read what an actor does around a frame) ----------------
if (dumpI > 0) {
  const [ids, rng_, who] = process.argv[dumpI + 1].split(":"), [f0, f1] = rng_.split("-").map(Number), id = Number(ids);
  for (let f = f0; f <= f1; f++) {
    const { st, cam } = stageAt(id, f);
    const ppl = st.places.filter((p) => p.key.startsWith("P|") && (!who || actorOf(p.key) === who));
    const fxs = st.fx.filter((x) => !x.key.startsWith("blob|")).map((x) => `${x.key.slice(0, 28)}@${proj(cam, [x.x, x.y, x.z]).x.toFixed(0)},${proj(cam, [x.x, x.y, x.z]).y.toFixed(0)}`);
    for (const p of ppl) {
      const o = optsOf(p.key), s = proj(cam, [p.x, p.y, p.z]);
      console.log(`f${f} ${actorOf(p.key)} xyz ${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)} scr ${s.x.toFixed(0)},${s.y.toFixed(0)} ` + JSON.stringify(o));
    }
    if (!who || who === "fx") console.log(`f${f} fx: ${fxs.join("  ")}`);
    if (who === "places") for (const p of st.places.filter((p) => !p.key.startsWith("P|"))) console.log(`f${f} place ${p.key.slice(0, 160)} scr ${proj(cam, [p.x, p.y, p.z]).x.toFixed(0)},${proj(cam, [p.x, p.y, p.z]).y.toFixed(0)}`);
  }
  process.exit(0);
}
// ---------------- hold census: every change of what a hand holds (pick / put / pocket) and every mode change ----------------
if (process.argv.includes("--holds")) {
  for (const s of SHOTS) {
    const prev = new Map();
    for (let f = s.a - 4; f < s.b + 4; f++) {
      const { st, cam } = stageAt(s.id, f);
      const occ = new Map();
      for (const p of st.places.filter((p) => p.key.startsWith("P|"))) {
        const o = optsOf(p.key); if (!o) continue;
        const a0 = actorOf(p.key), n0 = occ.get(a0) ?? 0; occ.set(a0, n0 + 1);
        const who = n0 ? `${a0}#${n0}` : a0, sc = proj(cam, [p.x, p.y + 1.0, p.z]);
        const hs = (o.hands || []).map((h) => (h ? `${h.hold ?? "-"}:${h.a}${h.b ? ">" + h.b : ""}` : "x"));
        const now = { hold: (o.hands || []).map((h) => (h && h.hold) || null), mode: o.mode || "stand", hs };
        const was = prev.get(who);
        if (was) {
          for (let j = 0; j < now.hold.length; j++) if (now.hold[j] !== was.hold[j]) console.log(`shot ${s.id} f${f} ${who} hand${j} hold ${was.hold[j]} -> ${now.hold[j]} [${hs[j]}] scr ${sc.x.toFixed(0)},${sc.y.toFixed(0)}`);
          if (now.mode !== was.mode) console.log(`shot ${s.id} f${f} ${who} mode ${was.mode} -> ${now.mode} scr ${sc.x.toFixed(0)},${sc.y.toFixed(0)}`);
        }
        prev.set(who, now);
      }
    }
  }
  process.exit(0);
}
// ---------------- census mode: every non-person card family (fx + non-P places) per shot, its runs + screen spot ----------------
if (process.argv.includes("--census")) {
  const fam = (k) => k.replace(/^\d+x\d+\|/, "").replace(/[-\d.]+$/g, "").split("|")[0].replace(/\d+$/, "");
  for (const s of SHOTS) {
    const seen = new Map();
    for (let f = s.a; f < s.b; f++) {
      const { st, cam } = stageAt(s.id, f);
      const items = [...st.fx.filter((x) => !x.key.startsWith("blob|")).map((x) => [fam(x.key), [x.x, x.y, x.z], x.w]),
        ...st.places.filter((p) => !p.key.startsWith("P|")).map((p) => ["place:" + fam(p.key), [p.x, p.y, p.z], 1])];
      for (const [k, p, w] of items) {
        const q = proj(cam, p), on = q.d > 0.05 && q.x > -50 && q.x < 1130 && q.y > -50 && q.y < 1970;
        if (!seen.has(k)) seen.set(k, []);
        seen.get(k).push([f, on, Math.round(q.x), Math.round(q.y)]);
      }
    }
    const lines = [];
    for (const [k, rows] of seen) {
      const fr = rows.map((r) => r[0]), uniq = [...new Set(fr)];
      const rr = runs(uniq).map(([a, b]) => { const r0 = rows.find((r) => r[0] === a); return `${a}-${b}${r0[1] ? "" : "(off)"}@${r0[2]},${r0[3]}`; });
      lines.push(`   ${k.padEnd(18)} ${rr.slice(0, 12).join(" ")}${rr.length > 12 ? ` ... (${rr.length} runs)` : ""}`);
    }
    console.log(`shot ${s.id} (${s.a}-${s.b})\n${lines.join("\n")}`);
  }
  process.exit(0);
}

// ---------------- FACTS: one pass over every shot (drawn frames s.a-4 .. s.b+3, i.e. through its dissolves) ----------------
// per shot: fx-card runs by family (first frame, last frame, screen x/y at the first frame, inside the frame?), note
// births, what each hand holds (pick / put / pocket transitions), body-mode changes (stand / squat / kneel / walk),
// walk foot contacts (toon.ts: a foot lands at every half cycle of opts.phase), the whisper hand, the tag swing
const fam = (k) => k.replace(/^\d+x\d+\|/, "").split("|")[0].replace(/[-\d.]+$/g, "").replace(/\d+$/, "");
const inside = (q) => q.d > 0.05 && q.x > -20 && q.x < 1100 && q.y > -20 && q.y < 1940;
const facts = {};
const KEYED = new Set(["tag", "chiptag", "bubbleClip", "bubbleCheat"]);   // families whose key changes are recorded (tag 1 -> 2)
for (const s of SHOTS) {
  const F = { fx: {}, keys: {}, notes: [], holds: [], modes: [], walks: {}, hands: [], pocketHands: {}, vis: {}, props: {} };
  const visRows = new Map();
  const famRows = new Map(), prev = new Map(), noteN = [], ravenRows = [];
  for (let f = s.a - 4; f < s.b + 4; f++) {
    if (f < 0 || f >= TOTAL) continue;
    const { st, cam } = stageAt(s.id, f);
    let nn = 0;
    for (const x of st.fx) {
      if (x.key.startsWith("blob|")) continue;
      const k = fam(x.key), q = proj(cam, [x.x, x.y, x.z]);
      if (k === "note") nn++;
      if (!famRows.has(k)) famRows.set(k, new Map());
      const fm = famRows.get(k);
      if (!fm.has(f)) fm.set(f, { f, x: Math.round(q.x), y: Math.round(q.y), on: inside(q), key: x.key.replace(/^\d+x\d+\|/, "").slice(0, 24), rot: x.rot ?? 0 });
      if (KEYED.has(k)) { const kc = (F.keys[k] ??= []), kk = x.key.replace(/^\d+x\d+\|/, "").slice(0, 24); if (!kc.length || kc[kc.length - 1][1] !== kk) kc.push([f, kk]); }
    }
    noteN.push([f, nn]);
    // the ravens (cast.ts raven(): place key R|{head, hop, ruffle, wing, ...}): per raven index, the control values per frame
    let ri = 0;
    for (const pl of st.places) {
      if (!pl.key.startsWith("R|")) continue;
      let o = null; try { o = JSON.parse(pl.key.slice(2)); } catch { continue; }
      const q = proj(cam, [pl.x, pl.y + 0.15, pl.z]), px = Math.round((0.35 / Math.max(q.d, 0.05)) * 1920 / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))));
      (ravenRows[ri] ??= []).push([f, o.hop ?? 0, o.ruffle ?? 0, o.wing ?? 0, o.head ?? 0, Math.round(q.x), Math.round(q.y), inside(q), px]);
      ri++;
    }
    const occ = new Map();
    for (const pl of st.places) {
      if (!pl.key.startsWith("P|")) continue;
      const o = optsOf(pl.key); if (!o) continue;
      const a0 = actorOf(pl.key), n0 = occ.get(a0) ?? 0; occ.set(a0, n0 + 1);
      const who = n0 ? `${a0}#${n0}` : a0, q = proj(cam, [pl.x, pl.y + 1.0, pl.z]), xy = [Math.round(q.x), Math.round(q.y)], on = inside(q);
      if (on) { if (!visRows.has(who)) visRows.set(who, []); visRows.get(who).push(f); }
      const hands = o.hands || [];
      const now = { hold: hands.map((h) => (h && h.hold) || null), tgt: hands.map((h) => (h ? (h.b ?? h.a) : null)), mode: o.mode || "stand", phase: o.phase ?? 0 };
      const was = prev.get(who);
      if (was) {
        for (let j = 0; j < now.hold.length; j++) if (now.hold[j] !== was.hold[j]) F.holds.push([f, who, j, was.hold[j], now.hold[j], typeof now.tgt[j] === "string" ? now.tgt[j] : "xy", ...xy, on]);
        if (now.mode !== was.mode) F.modes.push([f, who, was.mode, now.mode, ...xy, on]);
        if (now.mode === "walk" && was.mode === "walk") {
          const a = was.phase, b = now.phase, ka = Math.floor(a * 2), kb = Math.floor(b * 2);
          if (kb > ka && b > a) (F.walks[who] ??= []).push([+(f - 1 + (kb / 2 - a) / (b - a)).toFixed(2), ...xy, on]);
        }
      }
      for (let j = 0; j < hands.length; j++) { const h = hands[j]; if (h && (h.b === "whisper" || h.a === "whisper") && (h.k ?? 1) > 0.02) F.hands.push([f, who, j, "whisper", +(h.k ?? 1).toFixed(2)]); }
      // hands at / going to a pocket: their dy (design units, + = down) and the screen px one unit makes here (pats)
      const fpx = 1920 / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))), ppu = (0.00216 * (pl.scale ?? 1) * fpx) / Math.max(q.d, 0.05);
      for (let j = 0; j < hands.length; j++) {
        const h = hands[j]; if (!h) continue;
        const at = [h.a, h.b].filter((t) => typeof t === "string");
        if (at.some((t) => /ocket/.test(t))) (F.pocketHands[`${who}#${j}`] ??= []).push([f, +(h.dy ?? 0).toFixed(2), +ppu.toFixed(3), on, ...xy]);
      }
      prev.set(who, now);
    }
  }
  for (const [k, fm] of famRows) {
    const fr = [...fm.keys()].sort((a, b) => a - b);
    // A5: [first f, last f, x, y, in frame at the first f?, key, first IN-FRAME f, last in-frame f] (null when never in frame)
    F.fx[k] = runs(fr).map(([a, b]) => { const r = fm.get(a), on_ = fr.filter((f) => f >= a && f <= b && fm.get(f).on);
      return [a, b, r.x, r.y, r.on, r.key, on_.length ? on_[0] : null, on_.length ? on_[on_.length - 1] : null]; });
    if (k === "tag" && s.id === 15) F.tag_rot = fr.map((f) => [f, +fm.get(f).rot.toFixed(4)]);
  }
  // note births from the per-frame note count (cast.ts notes(): each note lives exactly 12 f)
  const births = new Map();
  for (let i = 0; i < noteN.length; i++) {
    const [f, n] = noteN[i], p = i ? noteN[i - 1][1] : 0, dead = births.get(f - 12) ?? 0;
    const b = n - p + dead; if (b > 0) { births.set(f, b); for (let j = 0; j < b; j++) F.notes.push(f); }
  }
  // raven moves: runs where hop / ruffle / wing > 0.05 (first frame, last frame, peak, x, y, in frame, size px), head snaps
  F.ravens = ravenRows.map((rows) => {
    const ev = { hop: [], ruffle: [], wing: [], snap: [] };
    for (const [ci, name] of [[1, "hop"], [2, "ruffle"], [3, "wing"]]) {
      let cur = null;
      for (const r of rows) {
        const v = r[ci];
        if (v > 0.05) { if (!cur || r[0] !== cur[1] + 1) { cur = [r[0], r[0], v, r[5], r[6], r[7], r[8]]; ev[name].push(cur); } else { cur[1] = r[0]; cur[2] = Math.max(cur[2], v); } }
      }
    }
    for (let i = 1; i < rows.length; i++) if (rows[i][0] === rows[i - 1][0] + 1 && rows[i][4] !== rows[i - 1][4]) ev.snap.push([rows[i][0], rows[i - 1][4], rows[i][4], rows[i][5], rows[i][6], rows[i][7], rows[i][8]]);
    return ev;
  });
  for (const [who, fr] of visRows) F.vis[who] = runs(fr);
  // shot 14: the BAIT bucket and the pile on screen (A5 P3: no clink for a pour the viewer cannot see)
  if (s.id === 14 && m.SR?.bucket && m.SR?.base) {
    const props = { bucket: [m.SR.base[0] + m.SR.bucket[0], m.SR.base[1] + 0.71, m.SR.base[2] + m.SR.bucket[2]],
      pile: m.SR.crate ? [m.SR.base[0] + m.SR.crate[0] + 0.25, m.SR.base[1] + 0.9, m.SR.base[2] + m.SR.crate[2] + 0.2] : null };
    for (const [k, p] of Object.entries(props)) {
      if (!p) continue;
      F.props[k] = [];
      for (let f = s.a - 4; f < s.b + 4; f++) { const { cam } = camOf(s.id, f), q = proj(cam, p); F.props[k].push([f, Math.round(q.x), Math.round(q.y), q.d > 0.05 && q.x > 0 && q.x < 1080 && q.y > 0 && q.y < 1920]); }
    }
  }
  // dedupe the whisper hand to its first frame per actor
  const seenH = new Set(); F.hands = F.hands.filter((h) => { const k = h[1]; if (seenH.has(k)) return false; seenH.add(k); return true; });
  facts[s.id] = F;
}
// ---- shot 8: the Sign A panel swap rides toon.ts swapPath (the same path sets_ext.ts and the assistant's hands use):
// world position per frame -> screen speed; unhook = the old panel's last still frame, lean = its first still frame
// after moving, hang = the frame the NEW panel's big move ends (speed < 30 % of its peak after the peak)
if (m.swapPath && m.TT?.signA) {
  const aX = m.TT.base[0] + m.TT.signA.dx, aY = m.TT.signA.cy, aZ = m.TT.base[2] + m.TT.signA.z, s = S(8);
  const rows = [];
  for (let f = s.a; f < s.b; f++) {
    const { cam } = camOf(8, f), { old, neu } = m.swapPath(8, f - BEAT.swapping);
    rows.push({ f, old: old ? proj(cam, [aX + old[0], aY + old[1], aZ + old[2]]) : null, neu: proj(cam, [aX + neu[0], aY + neu[1], aZ + neu[2]]),
      oldP: old ? old.slice() : null, neuP: neu.slice() });
  }
  // motion in the panel's own frame (world offsets, so the camera move does not count), metres per frame
  const sp = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) + Math.abs(a[3] - b[3]) * 0.3 : 0);
  const vo = rows.map((r, i) => (i ? sp(r.oldP, rows[i - 1].oldP) : 0)), vn = rows.map((r, i) => (i ? sp(r.neuP, rows[i - 1].neuP) : 0));
  const firstMove = (v) => v.findIndex((x) => x > 1e-4);
  const iu = firstMove(vo), pk = (v) => v.reduce((bi, x, i) => (x > v[bi] ? i : bi), 0);
  let il = -1; if (iu >= 0) { for (let i = iu; i < vo.length; i++) if (vo[i] > 1e-4) il = i; }
  const pn = pk(vn); let ih = -1;
  for (let i = pn; i < vn.length - 1; i++) if (vn[i + 1] < 0.3 * vn[pn]) { ih = i; break; }   // it ARRIVES on frame i (the next step is small)
  let iland = -1; for (let i = vn.length - 1; i > pn; i--) if (vn[i] > 1e-3) { iland = i; break; }
  facts[8].panel = { unhook: iu >= 0 ? rows[iu].f - 1 : null, lean: il >= 0 ? rows[il].f : null, hang: ih >= 0 ? rows[ih].f : null,
    settle: iland >= 0 ? rows[iland].f : null, peak: rows[pn].f, speed_new: vn.map((x) => +x.toFixed(4)), f0: rows[0].f };
}
const res = { _doc: `written by studio/scripts/audio_cast_probe.mjs from ${storyDir}/cast.ts stage(id, f) + toon.ts swapPath, run in node with a `
  + "no-op canvas (no render). Picture FACTS per shot: fx: family -> [first f, last f, x, y (px of 1080x1920 at the first f), in frame?, key]; "
  + "notes: whistle-note births; holds: [f, actor, hand, from, to, hand target, x, y, in frame?]; modes: [f, actor, from, to, x, y, in frame?]; "
  + "walks: actor -> foot contacts [f, x, y, in frame?]; hands: first whisper-hand frame; pocketHands: actor#hand -> [f, dy, px per unit, in frame?, x, y]; panel (shot 8); tag_rot (shot 15); "
  + "A5: fx rows end with [first in-frame f, last in-frame f]; vis: actor -> runs of frames with the head in frame; props (shot 14): bucket / pile -> [f, x, y, in frame?]; stage() gets vf = toNew(f). sfx.py "
  + "picture_events() matches its cues to these (picture_events.json still wins). Screen positions ignore occlusion.", story: storyDir,
  beat: BEAT, facts };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(res));
const nf = Object.values(facts).reduce((a, F) => a + Object.keys(F.fx).length, 0);
console.log(`cast probe -> ${out}: ${SHOTS.length} shots, ${nf} fx families, ${Object.values(facts).reduce((a, F) => a + F.holds.length, 0)} hold changes`);

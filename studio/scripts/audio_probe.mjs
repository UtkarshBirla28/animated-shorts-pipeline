// AUDIO probe: where the moving picture events that make sound are ON SCREEN (no render needed).
// Reads the tumbleweed routes (sets_ext.ts TUMBLE) and the film camera (story.ts camAt), projects every route frame by
// frame and writes the on-screen window, the hop landings (sets_ext poseTumble: contact every dist/hops, a dust puff
// on each landing), the screen x at entry / exit (-> stereo pan) and the nearest lens distance (-> level).
// usage: node scripts/audio_probe.mjs [storyDir] [extDir] [out.json]
//   storyDir / extDir default to src/videos/antitheft (e.g. src/videos/antitheft_cam, src/videos/antitheft_world_ext)
//   out.json defaults to ../sound/antitheft/audio/picture_probe.json
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SHORT } from "./short.mjs";
const storyDir = process.argv[2] || `src/videos/${SHORT}`;
const extDir = process.argv[3] || `src/videos/${SHORT}`;
const out = path.resolve(process.argv[4] || `../sound/${SHORT}/audio/picture_probe.json`);
const tmp = path.resolve(`out/_audio_probe_${process.pid}.mjs`);
const hasWarp = fs.existsSync(path.resolve(`${storyDir}/voicewarp.ts`));
await build({ stdin: { contents: `export * from "./${storyDir}/story"; export * from "./${storyDir}/plan"; export * from "./${storyDir}/words"; export * as THREE from "three";`
  + (hasWarp ? ` export { WARP as __WARP } from "./${storyDir}/voicewarp";` : ""), resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE, TT } = m;
const tt = (d) => [TT.base[0] + d[0], TT.base[1] + d[1], TT.base[2] + d[2]];
// ---- the tumbleweed table, read as text (sets_ext.ts does not export it)
const src = fs.readFileSync(path.join(extDir, "sets_ext.ts"), "utf8");
const i0 = src.indexOf("const TUMBLE"), a0 = src.indexOf("[", src.indexOf("=", i0)), a1 = src.indexOf("];", a0);
const body = src.slice(a0, a1 + 1).replace(/\/\/[^\n]*/g, "");
// sets_ext's local CUE table (word-keyed frames) is read as text too, then evaluated with words.ts PW
const c0 = src.indexOf("const CUE = {"), cb = src.indexOf("{", c0), ce = src.indexOf("};", cb);
const CUE = c0 >= 0 ? new Function("PW", `return (${src.slice(cb, ce + 1)});`)(m.PW) : {};
const TUMBLE = new Function("tt", "BEAT", "SHOTS", "CUE", `return (${body});`)(tt, m.BEAT, m.SHOTS, CUE); // the table may use BEAT / SHOTS expressions (A3)
const ASPECT = 1080 / 1920;
const groundAhead = (c, d, sx) => {
  const fx = c.look[0] - c.pos[0], fz = c.look[2] - c.pos[2], n = Math.hypot(fx, fz) || 1, ux = fx / n, uz = fz / n;
  const tx = Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) * ASPECT * sx * d;
  return [c.pos[0] + ux * d - uz * tx, c.pos[2] + uz * d + ux * tx];
};
const cam = new THREE.PerspectiveCamera(50, ASPECT, 0.05, 2000);
const proj = (id, f, p) => {
  const c = m.camAt(id, f);
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
  cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse), s = new THREE.Vector3(...p).project(cam);
  const d = -v.z, x = (s.x * 0.5 + 0.5) * 1080, y = (0.5 - s.y * 0.5) * 1920;
  const fpx = 1920 / (2 * Math.tan(THREE.MathUtils.degToRad(c.fov / 2)));        // focal length in px
  return { x, y, d, fpx };
};
const shotOf = (f) => m.SHOTS.find((s) => f >= s.a && f < s.b)?.id;
const res = { _doc: `written by studio/scripts/audio_probe.mjs (story ${storyDir}, sets_ext ${extDir}); frames at 30 fps, x in px of 1080`, tumbles: [] };
for (const R of TUMBLE) {
  let A = R.a, B = R.b;
  if (R.rel && !A[0] && !A[2]) { const c = m.camAt(R.id, R.relF ?? Math.round(R.f0 + R.dur / 2)), g1 = groundAhead(c, R.rel[0], R.rel[1]), g2 = groundAhead(c, R.rel[2], R.rel[3]); A = [g1[0], 0, g1[1]]; B = [g2[0], 0, g2[1]]; }
  const dist = Math.hypot(B[0] - A[0], B[2] - A[2]), hl = dist / R.hops;
  const S = m.SHOTS.find((s) => s.id === R.id), lo = S.a - 4, hi = S.b + 4;    // a shot is drawn during its dissolves too
  const vis = [];
  for (let f = Math.ceil(R.f0); f <= R.f0 + R.dur; f++) {
    if (f < lo || f > hi) continue;
    const a = (f - R.f0) / R.dur, d = a * dist;
    let hop = 0;
    if (R.hopDur) { for (let h = 0; h < R.hops; h++) { const hs = R.f0 + (R.dur * (h + 0.6)) / (R.hops + 0.4), k = (f - hs) / R.hopDur; if (k >= 0 && k <= 1) hop = (R.hopH ?? 0.2) * 4 * k * (1 - k); } }
    else hop = Math.abs(Math.sin((Math.PI * d) / hl)) * R.R * 0.45;
    const p = [A[0] + (B[0] - A[0]) * a, R.R * 0.92 + hop, A[2] + (B[2] - A[2]) * a];
    const q = proj(R.id, f, p), rpx = (R.R / Math.max(q.d, 0.05)) * q.fpx;
    const on = q.d > 0.1 && q.x > -rpx * 0.5 && q.x < 1080 + rpx * 0.5 && q.y > -rpx * 0.5 && q.y < 1920 + rpx * 0.5 && shotOf(f) !== undefined;
    if (on) vis.push({ f, x: Math.round(q.x), y: Math.round(q.y), d: +q.d.toFixed(2), r_px: Math.round(rpx), live: shotOf(f) === R.id });
  }
  // landings (sets_ext poseTumble): the hopDur model lands at hs + hopDur (hs = f0 + dur (h + 0.6) / (hops + 0.4));
  // the |sin| model touches down every dist / hops (from its first frame)
  const contacts = [];
  if (R.hopDur) for (let h = 0; h < R.hops; h++) contacts.push(+(R.f0 + (R.dur * (h + 0.6)) / (R.hops + 0.4) + R.hopDur).toFixed(2));
  else for (let h = 0; h <= R.hops; h++) contacts.push(+(R.f0 + (R.dur * h) / R.hops).toFixed(2));
  const row = { id: R.id, k: R.k, f0: R.f0, dur: R.dur, R: R.R, hops: R.hops, model: R.hopDur ? "hopDur" : "sin", contacts };
  if (vis.length) {
    const live = vis.filter((v) => v.live);
    const near = vis.reduce((b, v) => (v.r_px > b.r_px ? v : b), vis[0]);
    Object.assign(row, { on: [vis[0].f, vis[vis.length - 1].f], live_on: live.length ? [live[0].f, live[live.length - 1].f] : null,
      x: [vis[0].x, vis[vis.length - 1].x], nearest: { f: near.f, d: near.d, r_px: near.r_px }, n_vis: vis.length,
      contacts_on: contacts.filter((c) => vis.some((v) => Math.abs(v.f - c) <= 1)), path: vis.filter((_, k) => k % 4 === 0).map((v) => [v.f, v.x, v.y, v.r_px]) });
  } else row.on = null;
  res.tumbles.push(row);
}
// ---- round 7 (A6 P3): the CAMERA's own motion on the VIDEO clock (the picture renders at WARP[vf]): per video frame the
// view's angular speed (deg / video f: look-direction turn + translation over the look distance + half the fov change +
// roll) and its lateral sign (+ = the view travels screen-right). sfx.py finds the whips / trucks / arcs in it and lays a
// soft air swish on each, peaking on the fastest frames and gone 2 f after the landing (cuts are flagged, never swished)
{
  const WARP = m.__WARP || Array.from({ length: m.TOTAL }, (_, i) => i), up = new THREE.Vector3(0, 1, 0);
  const shotAt = (f) => (m.SHOTS.find((s) => f >= s.a && f < s.b) || m.SHOTS[m.SHOTS.length - 1]).id;
  const rows = [];
  let prev = null;
  for (let vf = 0; vf < WARP.length; vf++) {
    const f = WARP[vf], id = shotAt(f), c = m.camAt(id, f);
    const P = new THREE.Vector3(...c.pos), L = new THREE.Vector3(...c.look), d = L.clone().sub(P), dist = Math.max(0.3, d.length()); d.normalize();
    const right = d.clone().cross(up).normalize();
    let flow = 0, lat = 0, cut = 0;
    if (prev && prev.id === id) {
      const rot = THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.max(-1, d.dot(prev.d)))));
      const dp = P.clone().sub(prev.P), tr = THREE.MathUtils.radToDeg(dp.length() / dist);
      flow = rot + tr + 0.5 * Math.abs(c.fov - prev.fov) + THREE.MathUtils.radToDeg(Math.abs((c.roll || 0) - (prev.roll || 0)));
      lat = d.clone().sub(prev.d).dot(prev.right) * 57.3 + (dp.dot(prev.right) / dist) * 57.3;
      if (flow > 25) cut = 1;
    } else if (prev) cut = 1;
    rows.push([vf, +f.toFixed(2), id, +flow.toFixed(3), +lat.toFixed(3), cut]);
    prev = { id, d, P, fov: c.fov, roll: c.roll || 0, right };
  }
  res.cam = { _doc: "per VIDEO frame: [vf, picture f, shot, flow deg/vf, lateral deg/vf (+ = screen-right), cut?]", rows };
}
// ---- round 7: picture facts read from the set modules' source (they are not exported): the stamp's impact frame
// (sets_ext poseStamp `const F = ...`), the blueprint thieves (sets_int THIEF_N + the pop formula), the shot-4 heap
// (sets_ext: an exported/declared HEAP14_LAND, else BEAT.tons14 + 4) and where TH.flip / TH.heap14 are on screen in shot 4
{
  // expressions may use story.ts V / PV (aliased vidAt / picAt / toNew in the set modules) and module-level consts
  const V_ = m.V || ((f) => f), PV_ = m.PV || ((v) => v);
  const ev = (expr) => { try { return new Function("BEAT", "SHOTS", "PW", "Math", "V", "PV", "vidAt", "picAt", "toNew", `return (${expr});`)(m.BEAT, m.SHOTS, m.PW, Math, V_, PV_, V_, PV_, V_); } catch { return null; } };
  const constOf = (name) => { const r = new RegExp(`const ${name} = ([^;\\n]+);`).exec(src); return r ? ev(r[1].replace(/\/\/.*$/, "")) : null; };
  const facts = {};
  const st = src.indexOf("private poseStamp("), sm = st >= 0 ? /const F = ([^,;]+)[,;]/.exec(src.slice(st, st + 600)) : null;
  if (sm) { const e = sm[1].trim(); facts.stamp = { F: /^[A-Z_][A-Z0-9_]*$/.test(e) ? constOf(e) : ev(e), expr: e }; }
  // the heap: sets_ext poseHeap14 (VIDEO clock): `FALL = n, v0 = <expr>` -> it lands on video v0 + FALL with a squash
  const hp0 = src.indexOf("private poseHeap14("), hq = hp0 >= 0 ? /FALL = ([\d.]+), v0 = ([^,]+),/.exec(src.slice(hp0, hp0 + 500)) : null;
  const hm = /HEAP14_LAND\s*=\s*([^;\n]+)/.exec(src);
  facts.heap = { land: hm ? ev(hm[1].replace(/\/\/.*$/, "")) : null, expr: hm ? hm[1] : (hq ? `video ${hq[2]} + ${hq[1]}` : null),
    land_vf: hq && ev(hq[2]) != null ? +(ev(hq[2]) + +hq[1]).toFixed(2) : null, fall_vf: hq ? +hq[1] : null, present: /TH\.heap14|heap14/.test(src) };
  const intPath = path.join(extDir.replace(/antitheft_world_ext$/, "antitheft"), "sets_int.ts");
  try {
    const si = fs.readFileSync(fs.existsSync(path.join(storyDir, "sets_int.ts")) ? path.join(storyDir, "sets_int.ts") : intPath, "utf8");
    const tn = /const THIEF_N = (\d+)/.exec(si), tr = /f - \(fe \+ i \/ ([\d.]+) \+ (\d+)\)/.exec(si);
    // round 8 (A7 P2): the EMERGENCE clock - `const fe = BEAT.everyone - 3` (thief i is visible from fe + i / rate, scale
    // 0.35, flies `flight` f and lands); the old sound started at everyone + 2 (5 f late)
    const fm = /const fe = ([^,;\n]+)[,;]/.exec(si), fl_ = /const flight = (\d+(?:\.\d+)?)/.exec(si), vclk = fm ? /toNew|\bV\(|vidAt/.test(fm[1]) : false;
    facts.thieves = { n: tn ? +tn[1] : null, rate: tr ? +tr[1] : null, land: tr ? +tr[2] : null, fe: fm ? ev(fm[1].trim()) : null, fe_expr: fm ? fm[1].trim() : null,
      flight: fl_ ? +fl_[1] : null, fe_clock: vclk ? "video" : "picture" };
  } catch { facts.thieves = null; }
  // round 8 (A7 P2): the split-flap counter's own schedule (sets_ext poseFlip `const seqs = [FLAP_SEQ(1, a), FLAP_SEQ(4, b)]`)
  // and its clock (if WORLD-EXT moves it to the VIDEO clock - the 'It said... Warning!' window is squeezed 1.5x - the
  // start expressions use toNew / V( and the comparisons vf)
  try {
    const p0 = src.indexOf("private poseFlip("), body = p0 >= 0 ? src.slice(p0, p0 + 2600) : "";
    const q0 = body.indexOf("const seqs = [");
    const calls = [];
    if (q0 >= 0) {                                   // FLAP_SEQ(<target>, <expr>) calls, nested parentheses allowed
      let i = q0, depth = 0, cur = null;
      for (; i < body.length; i++) {
        if (body.startsWith("FLAP_SEQ(", i) && cur === null) { cur = ""; depth = 1; i += 8; continue; }
        if (cur === null) { if (body[i] === "]" ) break; continue; }
        const ch = body[i];
        if (ch === "(") depth++;
        if (ch === ")") { depth--; if (depth === 0) { calls.push(cur); cur = null; continue; } }
        cur += ch;
      }
    }
    if (calls.length === 2) {
      const sp = calls.map((c) => { const k = c.indexOf(","); return [c.slice(0, k).trim(), c.slice(k + 1).trim()]; });
      const vc = sp.some(([, e]) => /toNew|\bV\(|vidAt/.test(e)) || /\bvf\s*>=\s*f0/.test(body);
      facts.flip = { seqs: sp.map(([t, e]) => [+t, ev(e)]), expr: sp.map(([, e]) => e), clock: vc ? "video" : "picture" };
    }
  } catch { facts.flip = null; }
  // shot 4: TH.flip (the split-flap box) and TH.heap14 on screen per picture frame
  const S4 = m.SHOTS.find((s) => s.id === 4), vis = { flip: [], heap: [] };
  if (S4) for (let f = S4.a - 4; f < S4.b + 4; f++) {
    const fl = proj(4, f, [m.TH.flip.x, m.TH.flip.y, m.TH.flip.z]);
    vis.flip.push([f, Math.round(fl.x), Math.round(fl.y), fl.d > 0.1 && fl.x > 0 && fl.x < 1080 && fl.y > 0 && fl.y < 1920 ? 1 : 0]);
    if (m.TH.heap14) { const h = proj(4, f, [m.TH.heap14[0], 1.0, m.TH.heap14[2]]);
      vis.heap.push([f, Math.round(h.x), Math.round(h.y), h.d > 0.1 && h.x > -150 && h.x < 1230 && h.y > -150 && h.y < 2070 ? 1 : 0, +((2.0 / Math.max(h.d, 0.1)) * h.fpx).toFixed(0)]); }
  }
  facts.shot4 = vis;
  // round 8 (A7 P3): the canyon wren on the CRYSTAL marker post (sets_ext): where it is on screen in shot 7 and its hops
  try {
    const cr = /const CRY = \{ w: ([\d.]+), h: ([\d.]+), y: ([\d.]+)/.exec(src), mk = /const MARKER_DX = Math\.min\(TT\.marker\.dx, (-?[\d.]+)\)/.exec(src);
    const cy = cr ? +cr[3] + +cr[2] / 2 : 1.1, mdx = Math.min(m.TT.marker.dx, mk ? +mk[1] : -1.15);
    const hq = /h1 = ([^,]+), h2 = ([^;]+);/.exec(src.slice(src.indexOf("the wren bobs")));
    const h1 = hq ? ev(hq[1]) : null, h2 = hq ? ev(hq[2]) : null;
    const S7 = m.SHOTS.find((s) => s.id === 7), wv = [];
    if (S7) for (let f = S7.a - 4; f < S7.b + 4; f++) {
      const hopX = (h1 != null ? 0.08 * Math.min(1, Math.max(0, (f - h1) / 6)) : 0) - (h2 != null ? 0.08 * Math.min(1, Math.max(0, (f - h2) / 6)) : 0);
      const q = proj(7, f, [m.TT.base[0] + m.TT.heads.crystal + mdx - 0.24 + hopX, cy + 0.092, m.TT.base[2] + 0.35]);
      const r = (0.15 / Math.max(q.d, 0.05)) * q.fpx;              // ~15 cm bird (3x scale)
      wv.push([f, Math.round(q.x), Math.round(q.y), q.d > 0.1 && q.x > 20 && q.x < 1060 && q.y > 40 && q.y < 1880 ? 1 : 0, Math.round(r)]);
    }
    facts.wren = { h1, h2, vis: wv };
  } catch { facts.wren = null; }
  res.facts = facts;
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
for (const r of res.tumbles) console.log(`shot ${r.id} f0 ${r.f0} dur ${r.dur}: ${r.on ? `on ${r.on.join("-")} (live ${r.live_on?.join("-")}) x ${r.x.join("->")} nearest d ${r.nearest.d} m r ${r.nearest.r_px}px at ${r.nearest.f}, landings on screen ${r.contacts_on.join(", ")}` : "never on screen"}`);
console.log(`-> ${out}`);

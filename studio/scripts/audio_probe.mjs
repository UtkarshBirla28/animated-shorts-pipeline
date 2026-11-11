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
await build({ stdin: { contents: `export * from "./${storyDir}/story"; export * from "./${storyDir}/plan"; export * from "./${storyDir}/words"; export * as THREE from "three";`, resolveDir: process.cwd(), loader: "ts" },
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
fs.writeFileSync(out, JSON.stringify(res, null, 1));
for (const r of res.tumbles) console.log(`shot ${r.id} f0 ${r.f0} dur ${r.dur}: ${r.on ? `on ${r.on.join("-")} (live ${r.live_on?.join("-")}) x ${r.x.join("->")} nearest d ${r.nearest.d} m r ${r.nearest.r_px}px at ${r.nearest.f}, landings on screen ${r.contacts_on.join(", ")}` : "never on screen"}`);
console.log(`-> ${out}`);

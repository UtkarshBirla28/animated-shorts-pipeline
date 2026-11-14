// motion segments per shot on the video clock (cwd = studio). usage: node segs.mjs [shot|all] [thr=1.0]
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const tmp = path.resolve("out/_segs_bundle_cam.mjs");
const SD = "./src/videos/antitheft_cam";
await build({ stdin: { contents: `export * from "${SD}/story"; export { WARP, VOICE_TOTAL, toNew } from "${SD}/voicewarp";`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { SHOTS, XFADE, camAt, WARP, toNew } = m;
const W = (v) => { const lo = Math.floor(v), n = WARP.length - 1; if (lo >= n) return WARP[n]; if (lo < 0) return WARP[0]; return WARP[lo] + (v - lo) * (WARP[lo + 1] - WARP[lo]); };
const basis = (c) => { const fw = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], n = Math.hypot(...fw);
  const F = [fw[0] / n, fw[1] / n, fw[2] / n], rh = Math.hypot(F[2], F[0]) || 1, R0 = [-F[2] / rh, 0, F[0] / rh];
  const U0 = [R0[1] * F[2] - R0[2] * F[1], R0[2] * F[0] - R0[0] * F[2], R0[0] * F[1] - R0[1] * F[0]];
  const cs = Math.cos(c.roll), sn = Math.sin(c.roll);
  return { F, R: R0.map((v, i) => v * cs + U0[i] * sn), U: U0.map((v, i) => -R0[i] * sn + v * cs), t: Math.tan((c.fov * Math.PI) / 360), n }; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const px = (c, b, p) => { const d = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]], z = Math.max(1e-3, dot(d, b.F)); return [540 + (540 * dot(d, b.R)) / (z * b.t * 0.5625), 960 - (960 * dot(d, b.U)) / (z * b.t)]; };
const motion = (c0, c1) => { const b0 = basis(c0), b1 = basis(c1); let best = { dx: 0, dy: 0, zoom: 0, m: 0 }, bm = -1;
  for (const k of [1, 2.5]) { let sx = 0, sy = 0, r0 = 0, r1 = 0; const P = [], Q = [];
    for (const gx of [-0.5, 0, 0.5]) for (const gy of [-0.5, 0, 0.5]) { const z = b0.n * k, x = gx * z * b0.t * 0.5625 * 2, y = gy * z * b0.t * 2;
      const w = [0, 1, 2].map((i) => c0.pos[i] + b0.F[i] * z + b0.R[i] * x + b0.U[i] * y); const p = px(c0, b0, w), q = px(c1, b1, w); P.push(p); Q.push(q); sx += q[0] - p[0]; sy += q[1] - p[1]; }
    const mx = sx / 9, my = sy / 9; for (let i = 0; i < 9; i++) { r0 += Math.hypot(P[i][0] - 540, P[i][1] - 960); r1 += Math.hypot(Q[i][0] - 540 - mx, Q[i][1] - 960 - my); }
    const zoom = r1 / r0 - 1, mm = Math.max(Math.abs(mx) / 1080, Math.abs(my) / 1920, Math.abs(zoom)); if (mm > bm) { bm = mm; best = { dx: 100 * mx / 1080, dy: 100 * my / 1920, zoom: 100 * zoom, m: 100 * mm }; } }
  return best; };
const arg = process.argv[2] ?? "all", thr = +(process.argv[3] ?? 1.0);
for (const s of SHOTS) {
  if (arg !== "all" && +arg !== s.id) continue;
  const va = Math.ceil(toNew(s.a - 3.9)), vb = Math.floor(toNew(s.b + 3.9));
  const sa = toNew(s.a), sb = toNew(s.b);
  let seg = null; const out = [];
  let lowRun = 0, bestLow = 0;
  for (let vf = va; vf < vb; vf++) {
    const v = motion(camAt(s.id, W(vf)), camAt(s.id, W(vf + 1)));
    if (vf >= sa && vf < sb) { if (v.m < 0.12) { lowRun++; bestLow = Math.max(bestLow, lowRun); } else lowRun = 0; }
    if (v.m > thr) { if (!seg) seg = { a: vf, pk: 0 }; if (v.m > seg.pk) { seg.pk = v.m; seg.at = vf; seg.v = v; } seg.b = vf; }
    else if (seg) { out.push(seg); seg = null; }
  }
  if (seg) out.push(seg);
  console.log(`shot ${s.id} v${sa.toFixed(0)}-${sb.toFixed(0)} (lifetime ${va}-${vb})  longest <0.12 run ${bestLow}`);
  for (const g of out) console.log(`   v${g.a}-${g.b} (${g.b - g.a + 1}f) peak ${g.pk.toFixed(2)} @v${g.at}  dx ${g.v.dx.toFixed(2)} dy ${g.v.dy.toFixed(2)} z ${g.v.zoom.toFixed(2)}${g.a < sa ? "  [pre]" : g.b >= sb ? "  [post]" : ""}`);
}

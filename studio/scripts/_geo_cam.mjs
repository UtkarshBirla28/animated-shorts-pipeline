// CAM design helper: candidate framings with story.ts-style helpers (orb / aimY / fr / dolly) -> px at 1080x1920
// usage: node scripts/_geo_cam.mjs '<expr returning [{name, pos, look, fov, roll?, pts}]>'   (helpers: orb, aimY, around, fr, dolly, yawAbout, tiltBy, tt, sr, cl, bp, TH, TT, ...)
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const tmp = path.resolve("out/_geo_bundle_cam.mjs");
await build({ stdin: { contents: 'export * from "./src/videos/antitheft_cam/plan"; export * as THREE from "three"; import { TT, SR, CL, BP } from "./src/videos/antitheft_cam/plan"; const A = (b, d) => [b[0] + d[0], b[1] + d[1], b[2] + d[2]]; export const tt = (d) => A(TT.base, d), sr = (d) => A(SR.base, d), cl = (d) => A(CL.base, d), bp = (d) => A(BP.base, d);', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: tmp, logLevel: "error" });
const m = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
fs.rmSync(tmp);
const { THREE } = m;
const around = (c, az, R, h) => { const a = (az * Math.PI) / 180; return [c[0] + R * Math.sin(a), h, c[2] - R * Math.cos(a)]; };
const aimY = (pos, t, fov, xs, ys) => {
  const dx = t[0] - pos[0], dz = t[2] - pos[2], dh = Math.hypot(dx, dz), el = Math.atan2(t[1] - pos[1], dh), tv = Math.tan((fov * Math.PI) / 360);
  const pitch = el - Math.atan((0.5 - ys) * 2 * tv), b = Math.atan2(dx, -dz), bb = b - Math.atan((xs - 0.5) * 2 * tv * 0.5625);
  return [pos[0] + dh * Math.sin(bb), pos[1] + dh * Math.tan(pitch), pos[2] - dh * Math.cos(bb)];
};
const orb = (t, az, R, h, fov, xs, ys) => { const p = around(t, az, R, h); return { pos: p, look: aimY(p, t, fov, xs, ys), fov }; };
const dirB = (b, p) => { const B = (b * Math.PI) / 180, P = (p * Math.PI) / 180; return [Math.sin(B) * Math.cos(P), Math.sin(P), -Math.cos(B) * Math.cos(P)]; };
const along = (p, d, L) => [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L];
const fr = (pos, yaw, pitch, fov) => ({ pos, look: along(pos, dirB(yaw, pitch), 4), fov });
const dolly = (pos, look, k) => [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k];
const yawAbout = (c, deg) => { const a = (deg * Math.PI) / 180, d = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]]; return { ...c, look: [c.pos[0] + d[0] * Math.cos(a) - d[2] * Math.sin(a), c.look[1], c.pos[2] + d[0] * Math.sin(a) + d[2] * Math.cos(a)] }; };
const tiltBy = (c, deg) => { const d = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], h = Math.hypot(d[0], d[2]), p = Math.atan2(d[1], h) + (deg * Math.PI) / 180; return { ...c, look: [c.pos[0] + d[0], c.pos[1] + h * Math.tan(p), c.pos[2] + d[2]] }; };
const H = { around, aimY, orb, dirB, along, fr, dolly, yawAbout, tiltBy };
const all = { ...m, ...H };
const qs = new Function(...Object.keys(all), `return (${process.argv[2]});`)(...Object.values(all));
const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 2000);
for (const q of qs) {
  cam.position.set(...q.pos); cam.up.set(0, 1, 0); cam.lookAt(...q.look); cam.rotateZ(q.roll ?? 0);
  cam.fov = q.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  console.log(`${q.name ?? ""} pos [${q.pos.map((v) => v.toFixed(2))}] look [${q.look.map((v) => v.toFixed(2))}] fov ${q.fov.toFixed(1)}`);
  const line = [];
  for (const [k, p] of Object.entries(q.pts ?? {})) {
    const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse);
    const s = new THREE.Vector3(...p).project(cam);
    const x = (s.x * 0.5 + 0.5) * 1080, y = (0.5 - s.y * 0.5) * 1920;
    const off = v.z > 0 || x < 0 || x > 1080 || y < 0 || y > 1920;
    line.push(`${k} ${x.toFixed(0)},${y.toFixed(0)}${off ? "!" : ""} (${(-v.z).toFixed(1)})`);
  }
  for (let i = 0; i < line.length; i += 4) console.log("   " + line.slice(i, i + 4).join(" | "));
}

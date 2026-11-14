// CAM sandbox: brute-force search for the shot-12 opening (teacher + chalk text whole, pupils' backs below, no near blob)
const CLB = [0, 0, 2000];
const cl = (d) => [CLB[0] + d[0], CLB[1] + d[1], CLB[2] + d[2]];
const norm = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const proj = (pos, look, fov, p) => {
  const F = norm([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]]), R = norm(cross(F, [0, 1, 0])), U = cross(R, F);
  const d = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]], z = dot(d, F), t = Math.tan((fov * Math.PI) / 360);
  return [540 + (540 * dot(d, R)) / (z * t * 0.5625), 960 - (960 * dot(d, U)) / (z * t), z];
};
const inF = (q, m = 30) => q[2] > 0.5 && q[0] > m && q[0] < 1080 - m && q[1] > m && q[1] < 1920 - m;
const pupils = [[-2.4, -0.3], [2.8, -0.3], [-2.4, 1.5], [0.2, 1.5], [2.8, 1.5]]; // n0, n2, n3, n4, n5 (n1 = the student at [0.2,-0.3])
const desks = [[-2.4, -0.6], [0.2, -0.6], [2.8, -0.6], [-2.4, 1.2], [0.2, 1.2], [2.8, 1.2]];
let best = [];
for (let x = -4.0; x <= 4.0; x += 0.25) for (let z = 1.9; z <= 3.3; z += 0.2) for (const y of [1.5, 1.7, 1.9, 2.1]) for (let lx = -2.2; lx <= 0.4; lx += 0.2) for (const ly of [1.1, 1.3, 1.5]) for (const fov of [44, 48, 52]) {
  const pos = cl([x, y, z]), look = cl([lx, ly, -3.45]);
  // nothing within 1.2 m of the lens (pupils' heads + desk centres)
  if (pupils.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.2) || desks.some(([dx, dz]) => Math.hypot(dx - x, dz - z) < 1.0)) continue;
  const tT = proj(pos, look, fov, cl([-2.2, 1.5, -2.6])), tF = proj(pos, look, fov, cl([-2.2, 0.05, -2.6])), tL = proj(pos, look, fov, cl([-2.5, 1.0, -2.6])), tR = proj(pos, look, fov, cl([-1.9, 1.0, -2.6]));
  const xL = proj(pos, look, fov, cl([-1.55, 2.2, -3.44])), xR = proj(pos, look, fov, cl([0.2, 1.1, -3.44])), xR2 = proj(pos, look, fov, cl([0.2, 2.2, -3.44]));
  if (![tT, tL, tR, xL, xR, xR2].every((q) => inF(q))) continue;
  if (tF[1] > 1600) continue;
  if (xL[1] < 250 || xR[1] > 1250) continue; // the text in the upper-middle
  const ceil = proj(pos, look, fov, cl([lx, 3.2, -3.45]));
  const ceilPct = Math.max(0, ceil[1]) / 1920;
  let pupilsIn = 0, near = 0;
  for (const [px, pz] of pupils) { const q = proj(pos, look, fov, cl([px, 1.02, pz])); if (inF(q, 0) && q[1] > 1150) { pupilsIn++; const sz = 0.46 / (2 * q[2] * Math.tan((fov * Math.PI) / 360)) * 1920; near = Math.max(near, sz); } }
  const stu = proj(pos, look, fov, cl([0.2, 1.02, -0.3]));
  const tW = Math.abs(tR[0] - tL[0]);
  const score = tW + 60 * pupilsIn - (near > 420 ? 400 : 0) - 600 * Math.max(0, ceilPct - 0.12) + (inF(stu) ? 40 : 0);
  best.push({ score: +score.toFixed(0), tW: +tW.toFixed(0), pupilsIn, near: +near.toFixed(0), ceil: +(ceilPct * 100).toFixed(0), stu: inF(stu), pos: [x, y, +z.toFixed(1)], look: [+lx.toFixed(1), ly, -3.45], fov });
}
best = best.filter((b) => b.pos[0] >= 1.5); best.sort((a, b) => b.score - a.score);
for (const b of best.slice(0, 15)) console.log(JSON.stringify(b));

// CAM sandbox: brute-force search for a shot-8 "trails" framing: all three marker boards + Sign A inside the frame.
const TT = [60, 0, 30];
const tt = (d) => [TT[0] + d[0], TT[1] + d[1], TT[2] + d[2]];
const norm = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const proj = (pos, look, fov, p) => {
  const F = norm([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]]), R = norm(cross(F, [0, 1, 0])), U = cross(R, F);
  const d = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]], z = dot(d, F), t = Math.tan((fov * Math.PI) / 360);
  return [540 + (540 * dot(d, R)) / (z * t * 0.5625), 960 - (960 * dot(d, U)) / (z * t), z];
};
const boards = [["JAS", -4.35], ["LL", -1.15], ["CRY", 2.05]];
let best = [];
for (let x = -11; x <= 8; x += 0.5) for (let z = 4; z <= 14; z += 0.5) for (const y of [1.5, 1.9, 2.4]) for (let lx = -3; lx <= 1; lx += 0.25) for (const fov of [50, 54, 58, 62]) {
  const pos = tt([x, y, z]), look = tt([lx, 1.0, 0.3]);
  let ok = true, minH = 1e9, minW = 1e9;
  for (const [, bx] of boards) {
    const L = proj(pos, look, fov, tt([bx - 0.6, 0.88, 0.59])), Rr = proj(pos, look, fov, tt([bx + 0.6, 0.88, 0.59]));
    const T = proj(pos, look, fov, tt([bx, 1.04, 0.59])), B = proj(pos, look, fov, tt([bx, 0.72, 0.59]));
    if (L[2] < 1 || Math.min(L[0], Rr[0]) < 50 || Math.max(L[0], Rr[0]) > 1030 || T[1] < 300 || B[1] > 1290) { ok = false; break; }
    minH = Math.min(minH, B[1] - T[1]); minW = Math.min(minW, Math.abs(Rr[0] - L[0]));
  }
  if (!ok) continue;
  const sAL = proj(pos, look, fov, tt([-3.66, 1.55, 0.05])), sAR = proj(pos, look, fov, tt([-2.74, 1.55, 0.05])), sAT = proj(pos, look, fov, tt([-3.2, 2.5, 0.05]));
  if (Math.min(sAL[0], sAR[0]) < 30 || Math.max(sAL[0], sAR[0]) > 1050 || sAT[1] < 120) continue;
  const swapW = Math.abs(sAR[0] - sAL[0]);
  const score = minH * Math.min(1, minW / 160) + 0.15 * swapW;
  best.push({ score: +score.toFixed(1), minH: +minH.toFixed(0), minW: +minW.toFixed(0), swapW: +swapW.toFixed(0), pos: [x, y, z], look: [lx, 1.0, 0.3], fov });
}
best = best.filter((b) => b.pos[0] <= -5); best.sort((a, b) => (b.minH * Math.min(1, b.minW / 110) + 0.25 * b.swapW) - (a.minH * Math.min(1, a.minW / 110) + 0.25 * a.swapW));
for (const b of best.slice(0, 12)) console.log(JSON.stringify(b));

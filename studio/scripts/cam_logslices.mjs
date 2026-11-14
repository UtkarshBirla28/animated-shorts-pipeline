// CAM sandbox: replicate sets_ext logSlices() layout for one log (slice centres, which one is rolled / flat)
// usage: node scripts/cam_logslices.mjs <global index in [...VISTA.logs, ...EXTRA_LOGS]> <cx> <cz> <yaw> <len> <r>
// (A6: call order re-checked against sets_ext.ts logSlices: 3 phase calls, rollAt/flatAt, then per slice: length,
//  4 sliceGeo tilts, roll/flat/line calls, 27 chip calls when the slice is not skipped, the gap)
const [idx, cx, cz, yaw, len, R0] = process.argv.slice(2).map(Number);
const rng = (seed) => { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const r = rng(300 + idx * 17);
r(); r(); r();
const ax = Math.cos(yaw), az = -Math.sin(yaw);
const nSl = Math.max(2, Math.round(len / 1.1)), rollAt = Math.floor(r() * nSl), flatAt = (rollAt + 1 + Math.floor(r() * (nSl - 1))) % nSl;
let s = -len / 2, k = 0;
while (s < len / 2 - 0.3) {
  const sl = Math.min(0.5 + r() * 0.7, len / 2 - s), mid = s + sl / 2;
  let x = cx + ax * mid, z = cz + az * mid;
  const rr = R0 * (1 - 0.16 * ((mid + len / 2) / len));
  r(); r(); r(); r();
  let kind = "line", tilt = 0;
  if (k === rollAt || k === flatAt) {
    const side2 = r() < 0.5 ? 1 : -1, off = rr + 0.35 + r() * 0.3;
    x += -az * side2 * off; z += ax * side2 * off;
    if (k === rollAt) { tilt = 0.14 + r() * 0.1; kind = "ROLLED (on edge, face to nearest lens)"; } else { r(); r(); kind = "FLAT (face up)"; }
  } else { r(); r(); r(); r(); }
  for (let c = 0; c < 27; c++) r();
  console.log(`slice ${k}: s ${s.toFixed(2)}..${(s + sl).toFixed(2)} len ${sl.toFixed(2)} centre [${x.toFixed(2)}, ${z.toFixed(2)}]  r ${rr.toFixed(2)} y ${(rr * (kind.startsWith("ROLLED") ? 0.98 : 0.9)).toFixed(2)} ${kind}${tilt ? " tilt " + tilt.toFixed(3) : ""}`);
  s += sl + 0.2 + r() * 0.15; k++;
}
console.log("axis", ax.toFixed(3), az.toFixed(3), "nSl", nSl, "rollAt", rollAt, "flatAt", flatAt);

// CAM: picture <-> video frame table. usage: node scripts/_pv_cam.mjs p 65,75,88   |  v 100,199
import fs from "node:fs";
const W = JSON.parse(fs.readFileSync("../sound/antitheft/audio/warp.json", "utf8"));
const inv = (f) => { const lo = Math.floor(f); return W.inv[lo] + (f - lo) * ((W.inv[lo + 1] ?? W.inv[lo]) - W.inv[lo]); };
const wp = (v) => { const lo = Math.floor(v); return W.warp[lo] + (v - lo) * ((W.warp[lo + 1] ?? W.warp[lo]) - W.warp[lo]); };
const [m, list] = process.argv.slice(2);
for (const x of list.split(",").map(Number)) console.log(m === "p" ? `p${x} -> v${inv(x).toFixed(1)}` : `v${x} -> p${wp(x).toFixed(2)}`);

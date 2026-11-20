// CAST bench: s03b (Block 13, the driver's FACE cut-in) BEFORE the director adds it to the clock. The REAL cab set
// (TRAIN) under s03's rig, TRAIN's own `faceFront` lens (sets/cab.cams.ts, the s03b camera), timed on the film clock:
// the cut = one frame before "Signal..." to s04's first frame. Render single stills only:
//   node scripts/kit_render.mjs --entry src/videos3/pointing/cast/bench/s03b_index.ts --comp PointingCastS03b --quality draft --stills 166,182,194,205 --out out/pointing_cast/s03b/
// (imports the shot table: like beats_index.ts it is its own entry, never imported by the film or the sheet)
import React from "react";
import { registerRoot } from "remotion";
import type { Film } from "../../../../kit/core/ctx";
import { KitComposition } from "../../../../kit/core/pipeline";
import { SHOT_TABLE } from "../../shots";
import { S, FPS, FRAMES, TOTAL } from "../../timeline";
import { build_cab } from "../../sets/cab";
import { FRAMES_cab } from "../../sets/cab.cams";

const row = SHOT_TABLE.find((r) => r.id === "s03")!;
const from = Math.round((S("signal") - 0.04) * FPS), to = FRAMES.s04[0];
const S03B: Film = {
  slug: "pointing_cast_s03b", fps: 30, total: TOTAL,
  shots: [{ id: "s03b", from: 0, to: TOTAL, set: "cab", rig: row.rig, ...(row.rigOpts ? { rigOpts: row.rigOpts as never } : {}), cam: FRAMES_cab.faceFront(from, to) }],
  sets: { cab: build_cab },
};
registerRoot(() => React.createElement(KitComposition, { id: "PointingCastS03b", film: S03B }));

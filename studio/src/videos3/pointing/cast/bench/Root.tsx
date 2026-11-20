import React from "react";
import { Composition } from "remotion";
import { KitComposition } from "../../../../kit/core/pipeline";
import { Sheet, SW, SH } from "./Sheet";
import { BENCH } from "./film";
// CAST bench (not in the film): ENTRY=src/videos3/pointing/cast/bench/index.ts
//   COMP=PointingCastSheet PROPS='{"page":"main"}'  (pages: main others faces acting crowd)  2400 x 1600, 2D canvas
//   COMP=PointingCastBench (KitComposition: the trio / the driver's profile / tourist + kid, lit by the kit)
export const Root: React.FC = () => (
  <>
    <Composition id="PointingCastSheet" component={Sheet} durationInFrames={120} fps={30} width={SW} height={SH} defaultProps={{ page: "main" }} />
    <KitComposition id="PointingCastBench" film={BENCH} />
  </>
);

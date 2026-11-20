import React from "react";
import { Composition } from "remotion";
import { Bench } from "./Bench";
// CHAR v2 test bench (owner CHAR): the cast drawn on a plain 2D canvas at true 1080 x 1920 pixel sizes.
// COMP=ClownBench ENTRY=src/sandboxes/clownbench/index.ts PROPS='{"page":"act"}' node scripts/stills.mjs out/clown/char_v2/x_ 0,2,4 1
export const Root: React.FC = () => (
  <Composition id="ClownBench" component={Bench} durationInFrames={240} fps={30} width={1080} height={1920} defaultProps={{ page: "act" }} />
);

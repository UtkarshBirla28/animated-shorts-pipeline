import React from "react";
import { Composition } from "remotion";
import { LookPilot, LOOKPILOT_FRAMES } from "./LookPilot";
// LOOK PILOT sandbox (three.js route): ENTRY=src/sandboxes/lookpilot/index.ts COMP=LookPilot
export const Root: React.FC = () => (
  <Composition id="LookPilot" component={LookPilot} durationInFrames={LOOKPILOT_FRAMES} fps={30} width={1080} height={1920} />
);

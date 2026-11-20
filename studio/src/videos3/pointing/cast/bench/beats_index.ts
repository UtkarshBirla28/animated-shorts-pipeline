import React from "react";
import { registerRoot, Composition } from "remotion";
import { Beats } from "./Beats";
import { SW, SH } from "./Sheet";
// CAST beats storyboard (imports the film's shot table): COMP=PointingCastBeats ENTRY=src/videos3/pointing/cast/bench/beats_index.ts
registerRoot(() => React.createElement(Composition, { id: "PointingCastBeats", component: Beats, durationInFrames: 3, fps: 30, width: SW, height: SH }));

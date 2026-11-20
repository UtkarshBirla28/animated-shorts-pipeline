import React from "react";
import { Composition } from "remotion";
import { CharCard, CW, CH, CWC, CHC } from "./CharCard";
// LOOK PILOT character card (2026-11-19): ONLY the phone guy, walking toward the lens, on a TRANSPARENT card, for the
// Blender route (lookpilot/blender). A copy of the clownbench idea; the clown film's files are only imported, never edited.
// Card window = design units x -50..650, y -50..1000 at 2 px / unit (1400 x 2100 px); the soles (300, 975) land on px (700, 2050).
//   npx remotion render src/sandboxes/lookpilot_char/index.ts LookpilotChar <outdir> --sequence --image-format=png
export const Root: React.FC = () => (
  <>
    <Composition id="LookpilotChar" component={CharCard} durationInFrames={150} fps={30} width={CW} height={CH} defaultProps={{ page: "phone" }} />
    <Composition id="LookpilotCyclist" component={CharCard} durationInFrames={150} fps={30} width={CWC} height={CHC} defaultProps={{ page: "cyclist" }} />
    <Composition id="LookpilotPigeon" component={CharCard} durationInFrames={150} fps={30} width={CW} height={CH} defaultProps={{ page: "pigeon" }} />
  </>
);

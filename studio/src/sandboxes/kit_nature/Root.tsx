import React from "react";
import { Composition } from "remotion";
import { KnComp } from "./pipe";
import { buildA } from "./sceneA";
import { buildB } from "./sceneB";
// NATURE sandbox: ENTRY=src/sandboxes/kit_nature/index.ts COMP=KnA (pilot path view) | KnB (park / market wide)
const A: React.FC = () => <KnComp build={buildA} />;
const B: React.FC = () => <KnComp build={buildB} />;
export const Root: React.FC = () => (
  <>
    <Composition id="KnA" component={A} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="KnB" component={B} durationInFrames={150} fps={30} width={1080} height={1920} />
  </>
);

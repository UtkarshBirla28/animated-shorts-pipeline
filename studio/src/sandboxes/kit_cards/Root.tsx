import React from "react";
import { Composition } from "remotion";
import { KitCards, KITCARDS_FRAMES } from "./KitCards";
// KIT CARDS sandbox (owner CARDS): ENTRY=src/sandboxes/kit_cards/index.ts COMP=KitCards PROPS='{"kc":{"st":"a"}}'
export const Root: React.FC = () => (
  <Composition id="KitCards" component={KitCards} durationInFrames={KITCARDS_FRAMES} fps={30} width={1080} height={1920} />
);

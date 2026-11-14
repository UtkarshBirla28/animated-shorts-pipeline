import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { SaladOilShort, SALADOIL_FRAMES } from "./videos/saladoil/SaladOil";
import { AntiTheftShort, ANTITHEFT_FRAMES } from "./videos/antitheft/AntiTheft";

// Register each new short next to BridgeShort (copy src/videos/bridge -> src/videos/<name>, rename the component).
export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="AntiTheftShort" component={AntiTheftShort} durationInFrames={ANTITHEFT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SaladOilShort" component={SaladOilShort} durationInFrames={SALADOIL_FRAMES} fps={30} width={1080} height={1920} />
  </>
);

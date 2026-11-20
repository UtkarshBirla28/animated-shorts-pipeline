import React from "react";
import { Composition } from "remotion";
import { SaladOilShort, SALADOIL_FRAMES } from "../../videos/saladoil_char/SaladOil";
export const Root: React.FC = () => (
  <Composition id="SaladOilShort" component={SaladOilShort} durationInFrames={SALADOIL_FRAMES} fps={30} width={1080} height={1920} />
);

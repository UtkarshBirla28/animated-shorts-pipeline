import React from "react";
import { KitComposition } from "../../kit/core/pipeline";
import { FILM } from "./film";
import { FILM_V3 } from "./v3";
// STATION sandbox (ENTRY=src/sandboxes/kit_rail/index.ts), independent of the film's shot table:
//   KitRail   = the LOCATION SCOUT of the Tokyo platform set: 20 framings, 3 frames each (film.ts SCOUT) + a 24-frame run.
//   KitRailV3 = the STORYBOARD of script v3's 14 platform shots with the v3 cameras + plan (v3.ts), 2 samples per shot.
export const Root: React.FC = () => (
  <>
    <KitComposition id="KitRail" film={FILM} quality="draft" />
    <KitComposition id="KitRailV3" film={FILM_V3} quality="draft" />
  </>
);

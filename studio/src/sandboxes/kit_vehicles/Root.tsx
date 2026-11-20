import React from "react";
import { KitComposition } from "../../kit/core/pipeline";
import { FILM } from "./film";
import { FILM_V3 } from "./film_v3";
import { FILM_STEAM } from "./film_steam";
// TRAIN sandbox: ENTRY=src/sandboxes/kit_vehicles/index.ts
//   COMP=KitVehicles   one frame per framing of the kit parts (film.ts ROWS: 0 side, 1 door, 2 face34, ...)
//   COMP=KitVehiclesV3 the film's own cab + car sets on the script v3 outline timings (film_v3.ts)
//   COMP=KitSteam      the v4 steam set (sets/steam.ts), one 60-frame row per framing (film_steam.ts)
export const Root: React.FC = () => (<>
  <KitComposition id="KitVehicles" film={FILM} quality="draft" />
  <KitComposition id="KitVehiclesV3" film={FILM_V3} quality="draft" />
  <KitComposition id="KitSteam" film={FILM_STEAM} quality="draft" />
</>);

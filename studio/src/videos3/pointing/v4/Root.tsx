import React from "react";
import { KitComposition } from "../../../kit/core/pipeline";
import { FILM } from "./film";
import { overlay } from "./FilmView";
// v4 film 'pointing' (the true story): ENTRY=src/videos3/pointing/v4/index.ts COMP=PointingV4Kit (every quality: inputProps kit.quality)
export const Root: React.FC = () => <KitComposition id="PointingV4Kit" film={FILM} overlay={overlay} />;

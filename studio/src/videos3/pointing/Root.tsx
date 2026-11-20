import React from "react";
import { KitComposition } from "../../kit/core/pipeline";
import { FILM } from "./film";
import { overlay } from "./FilmView";
// v3 film 'pointing': ENTRY=src/videos3/pointing/index.ts COMP=PointingKit (one composition renders every quality: inputProps kit.quality)
export const Root: React.FC = () => <KitComposition id="PointingKit" film={FILM} overlay={overlay} />;

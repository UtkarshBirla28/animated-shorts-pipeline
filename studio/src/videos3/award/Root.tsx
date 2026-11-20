import React from "react";
import { KitComposition } from "../../kit/core/pipeline";
import { FILM } from "./film";
import { overlay } from "./FilmView";
// v3 film 'award': ENTRY=src/videos3/award/index.ts COMP=AwardKit (one composition renders every quality: inputProps kit.quality)
export const Root: React.FC = () => <KitComposition id="AwardKit" film={FILM} overlay={overlay} />;

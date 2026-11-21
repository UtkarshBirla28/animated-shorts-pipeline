import React from "react";
import { KitComposition } from "../../../../kit/core/pipeline";
import { overlay } from "../../v4/FilmView";
import { LOOK_V4 } from "./film";
// LOOKDEV v4 (LOOK): ENTRY=src/videos3/pointing/lookdev/v4/index.ts COMP=PointingV4Look
export const Root: React.FC = () => <KitComposition id="PointingV4Look" film={LOOK_V4} overlay={overlay} />;

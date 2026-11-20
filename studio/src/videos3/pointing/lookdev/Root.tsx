import React from "react";
import { KitComposition } from "../../../kit/core/pipeline";
import { LOOKDEV } from "./film";
// LOOKDEV (look director): ENTRY=src/videos3/pointing/lookdev/index.ts COMP=PointingLookdev
export const Root: React.FC = () => <KitComposition id="PointingLookdev" film={LOOKDEV} />;

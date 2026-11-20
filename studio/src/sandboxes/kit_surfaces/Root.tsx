import React from "react";
import { KitComposition } from "../../kit/core/pipeline";
import { FILM } from "./film";
// SURFACES sandbox: ENTRY=src/sandboxes/kit_surfaces/index.ts COMP=KitSurfaces
// frame 50 = (a) the pilot path view, 150 = (b) the street corner, 160 = (c) the interior room
export const Root: React.FC = () => <KitComposition id="KitSurfaces" film={FILM} quality="final" />;

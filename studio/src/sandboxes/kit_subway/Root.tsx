import React from "react";
import { KitComposition } from "../../kit/core/pipeline";
import { FILM_NYC } from "./film";
// ENTRY=src/sandboxes/kit_subway/index.ts COMP=KitSubway
export const Root: React.FC = () => <KitComposition id="KitSubway" film={FILM_NYC} quality="draft" />;

// <PointingFilm />: the whole film with captions (CORE's KitFilm + the house captions). Root.tsx registers it through
// KitComposition (which also hands kit_render.mjs its per-shot signatures).
import React from "react";
import { KitFilm, type KitFrameInfo } from "../../kit/core/pipeline";
import type { Quality } from "../../kit/core/ctx";
import { FILM } from "./film";
import { Captions } from "./Captions";

export const overlay = (f: KitFrameInfo) => <Captions frame={f.frame} />;
export const PointingFilm: React.FC<{ quality?: Quality }> = ({ quality = "preview" }) => <KitFilm film={FILM} quality={quality} overlay={overlay} />;

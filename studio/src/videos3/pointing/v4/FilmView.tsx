// v4: the film's overlay (the house captions) for CORE's KitFilm / KitComposition.
import React from "react";
import type { KitFrameInfo } from "../../../kit/core/pipeline";
import { Captions } from "./Captions";
export const overlay = (f: KitFrameInfo) => <Captions frame={f.frame} />;

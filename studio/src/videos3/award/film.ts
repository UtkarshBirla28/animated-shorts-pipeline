// FILM of 'award': what CORE's <KitFilm film={FILM} /> and scripts/kit_render.mjs render. Shot table: shots.ts
// (GENERATED from the bible), cameras: cams.ts, sets: sets/<id>.ts. Everything a pure function of t.
import type { Film } from "../../kit/core/ctx";
import { SHOTS, TOTAL } from "./shots";
import { SETS } from "./sets";

export const FILM: Film = { slug: "award", fps: 30, total: TOTAL, shots: SHOTS, sets: SETS };

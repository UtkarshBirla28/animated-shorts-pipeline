// NYC owner's test film: ONLY the New York sets of 'pointing' (ny_station, ny_car) at the film's own frame numbers
// (shots.ts 2026-11-19: s10 704-757, s11 757-843, s12 843-963, s13 963-1023), without importing shots.ts (so another
// set's import problem cannot stop these stills). Frames before 704 are a filler on the station (never rendered).
import type { Film, ShotDef } from "../../kit/core/ctx";
import { build_ny_station, CAMS_ny_station } from "../../videos3/pointing/sets/ny_station";
import { build_ny_car, CAMS_ny_car } from "../../videos3/pointing/sets/ny_car";
const C = { ...CAMS_ny_station, ...CAMS_ny_car };
const row = (id: string, from: number, to: number, set: string): ShotDef => ({ id, from, to, set, rig: "nightPractical", cam: C[id](from, to) });
const filler: ShotDef = { id: "fill", from: 0, to: 704, set: "ny_station", rig: "nightPractical", cam: C.s10(0, 704) };
export const FILM_NYC: Film = { slug: "pointing_nyc", fps: 30, total: 1023, sets: { ny_station: build_ny_station, ny_car: build_ny_car },
  shots: [filler, row("s10", 704, 757, "ny_station"), row("s11", 757, 843, "ny_car"), row("s12", 843, 963, "ny_station"), row("s13", 963, 1023, "ny_station")] };

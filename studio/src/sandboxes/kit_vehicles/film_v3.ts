// TRAIN sandbox film #2: the film's own 'cab' + 'car' sets (videos3/pointing/sets) at the DIRECTOR's shot frames
// (videos3/pointing/timeline.ts FRAMES), plus the extra framings that have no shot, in the gaps where these sets are
// not on screen. COMP KitVehiclesV3. Framings: FRAMES_cab / FRAMES_car of the sets' own camera files.
import type { Film, ShotDef } from "../../kit/core/ctx";
import { build_cab } from "../../videos3/pointing/sets/cab";
import { build_car } from "../../videos3/pointing/sets/car";
import { FRAMES_cab } from "../../videos3/pointing/sets/cab.cams";
import { FRAMES_car } from "../../videos3/pointing/sets/car.cams";
import { FRAMES, TOTAL } from "../../videos3/pointing/timeline";

type Row = [id: string, from: number, to: number, set: "cab" | "car", framing: string, az: number, el: number];
const F = FRAMES;
const ROWS: Row[] = [
  ["behindWide", 0, F.s02[0], "cab", "behindWide", -35, 20],
  ["s02", F.s02[0], F.s02[1], "car", "laugh", -80, 18],
  // s03 split (Block 13): the glove insert to the cut on "Signal..." (f164 until the DIRECTOR adds s03b to the clock),
  // then s03b, the driver's face, to s04
  ["s03", F.s03[0], (F as Record<string, [number, number]>).s03b?.[0] ?? 164, "cab", "face", -35, 20],
  ["s03b", (F as Record<string, [number, number]>).s03b?.[0] ?? 164, F.s03[1] > 164 && !(F as Record<string, [number, number]>).s03b ? F.s03[1] : ((F as Record<string, [number, number]>).s03b?.[1] ?? F.s04[0]), "cab", "faceFront", -35, 11],   // TEST: a lower sun for his face (the film's s03b uses the shots table: -35 / 20)
  ["s04", F.s04[0], F.s04[1], "car", "twoShot", -80, 18],
  ["s05", F.s05[0], F.s05[1], "car", "aisleGlide", -80, 18],
  ["s06", F.s06[0], F.s06[1], "cab", "partition", -35, 20],
  ["desk", F.s06[1], F.s10[0], "cab", "desk", -35, 20],
  ["s10", F.s10[0], F.s10[1], "car", "selfie", -80, 18],
  ["doorWide", F.s10[1], F.s15[0], "car", "doorWide", 70, 18],
  ["doorOut", F.s15[0], F.s15[1], "car", "doorOut", 70, 16],
  ["aisle", F.s15[1], F.s21[0], "car", "aisle", 70, 16],
  ["s21", F.s21[0], F.s21[1], "cab", "lampOver", -35, 16],
  ["lampClose", F.s21[1], F.s23[0], "cab", "lampClose", -35, 16],
  ["threeQ", F.s23[0], TOTAL, "cab", "threeQ", -35, 16],
];
const shots: ShotDef[] = ROWS.map(([id, from, to, set, fr, az, el]) => ({ id, from, to, set, rig: "golden", rigOpts: { sunAz: az, sunEl: el },
  cam: (set === "cab" ? (FRAMES_cab as Record<string, (a: number, b: number) => ShotDef["cam"]>)[fr] : (FRAMES_car as Record<string, (a: number, b: number) => ShotDef["cam"]>)[fr])(from, to) }));
export const FILM_V3: Film = { slug: "kit_vehicles_v3", fps: 30, total: TOTAL, sets: { cab: build_cab, car: build_car }, shots };
export const V3_ROWS = ROWS;

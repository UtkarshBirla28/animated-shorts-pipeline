// the film's sets: set id -> builder (one file per set: kit_render hashes sets/<id>.ts on its own, so a set change
// re-renders only the shots on that set). GENERATED list; the builders own the set files.
import type { SetBuilder } from "../../../kit/core/ctx";
import { build_cab } from "./cab";
import { build_car } from "./car";
import { build_jp_platform } from "./jp_platform";
import { build_ny_station } from "./ny_station";
import { build_ny_car } from "./ny_car";
import { build_kitchen } from "./kitchen";
import { build_lab } from "./lab";
export const SETS: Record<string, SetBuilder> = {
  "cab": build_cab,
  "car": build_car,
  "jp_platform": build_jp_platform,
  "ny_station": build_ny_station,
  "ny_car": build_ny_car,
  "kitchen": build_kitchen,
  "lab": build_lab,
};

// the film's sets: set id -> builder (one file per set: kit_render hashes sets/<id>.ts on its own, so a set change
// re-renders only the shots on that set). GENERATED list; the builders own the set files.
import type { SetBuilder } from "../../../kit/core/ctx";
import { build_kitchen } from "./kitchen";
import { build_home_hall } from "./home_hall";
import { build_autumn_street } from "./autumn_street";
import { build_mail_room } from "./mail_room";
import { build_staff_room } from "./staff_room";
import { build_school_gate } from "./school_gate";
import { build_classroom } from "./classroom";
import { build_bedroom } from "./bedroom";
export const SETS: Record<string, SetBuilder> = {
  "kitchen": build_kitchen,
  "home_hall": build_home_hall,
  "autumn_street": build_autumn_street,
  "mail_room": build_mail_room,
  "staff_room": build_staff_room,
  "school_gate": build_school_gate,
  "classroom": build_classroom,
  "bedroom": build_bedroom,
};

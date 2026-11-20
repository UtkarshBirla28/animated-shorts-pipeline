// all shot cameras (GENERATED merge of sets/<set>.cams.ts; never hand-edit)
import type { ShotCam } from "./camkit";
import { CAMS_kitchen } from "./sets/kitchen";
import { CAMS_classroom } from "./sets/classroom";
import { CAMS_autumn_street } from "./sets/autumn_street";
import { CAMS_home_hall } from "./sets/home_hall";
import { CAMS_mail_room } from "./sets/mail_room";
import { CAMS_staff_room } from "./sets/staff_room";
import { CAMS_school_gate } from "./sets/school_gate";
import { CAMS_bedroom } from "./sets/bedroom";
export const CAMS: Record<string, ShotCam> = { ...CAMS_kitchen, ...CAMS_classroom, ...CAMS_autumn_street, ...CAMS_home_hall, ...CAMS_mail_room, ...CAMS_staff_room, ...CAMS_school_gate, ...CAMS_bedroom };

// GENERATED from briefs/v3/award/bible.json by tools/v3/new_short_v3.py award --shots. Never hand-edit:
// change the bible (LEAD), validate it, re-generate. Cameras live in cams.ts (the builders own them).
import type { ShotDef } from "../../kit/core/ctx";
import { CAMS } from "./cams";

export const TOTAL = 2279;
export type ShotRow = { id: string; from: number; to: number; set: string; rig: string; rigOpts?: Record<string, number>; beat: string; line: string };
export const SHOT_TABLE: ShotRow[] = [
  { id: "s01", from: 0, to: 132, set: "kitchen", rig: "morning", beat: "Hook", line: "Schools mailed kids an award for a perfect month of school." },
  { id: "s02", from: 132, to: 207, set: "classroom", rig: "morning", beat: "Hook", line: "The next month, they missed more." },
  { id: "s03", from: 207, to: 270, set: "autumn_street", rig: "golden", beat: "Stakes", line: "Imagine you're one of them." },
  { id: "s04", from: 270, to: 402, set: "autumn_street", rig: "golden", beat: "Stakes", line: "Last autumn, you went a whole month without missing a day." },
  { id: "s05", from: 402, to: 531, set: "home_hall", rig: "interiorWarm", beat: "Stakes", line: "Then, in January, an envelope arrives with your name on it." },
  { id: "s06", from: 531, to: 603, set: "kitchen", rig: "morning", beat: "Plant", line: "Inside: a certificate. \"Perfect Attendance.\"" },
  { id: "s07", from: 603, to: 756, set: "kitchen", rig: "morning", beat: "Doubter", line: "Your mom sticks it on the fridge: \"Now you'll never miss a day!\" (MOM)" },
  { id: "s08", from: 756, to: 885, set: "mail_room", rig: "interiorWarm", beat: "Turn", line: "But it isn't just a nice surprise. It's a test." },
  { id: "s09", from: 885, to: 993, set: "mail_room", rig: "interiorWarm", beat: "Escalation", line: "More than 15,000 students were split into three groups." },
  { id: "s10", from: 993, to: 1044, set: "mail_room", rig: "interiorWarm", beat: "Gauge", line: "One group got nothing." },
  { id: "s11", from: 1044, to: 1209, set: "mail_room", rig: "interiorWarm", beat: "Gauge", line: "One got a promise: \"Be perfect in February, and you could win an award.\"" },
  { id: "s12", from: 1209, to: 1314, set: "mail_room", rig: "interiorWarm", beat: "Gauge", line: "And one got the surprise certificate. Like you." },
  { id: "s13", from: 1314, to: 1476, set: "staff_room", rig: "interiorWarm", beat: "Escalation", line: "Ask teachers what happens next. Only 2 in 100 say it will backfire." },
  { id: "s14", from: 1476, to: 1548, set: "school_gate", rig: "overcastWarm", beat: "Loop", line: "So, February. Who shows up?" },
  { id: "s15", from: 1548, to: 1617, set: "classroom", rig: "morning", beat: "Answer", line: "The promise? It changed nothing." },
  { id: "s16", from: 1617, to: 1791, set: "classroom", rig: "morning", beat: "Answer", line: "The certificate? Those kids had about 8% more absences than kids who got nothing." },
  { id: "s17", from: 1791, to: 1899, set: "kitchen", rig: "dusk", beat: "Why", line: "You see, the award didn't just say \"well done.\"" },
  { id: "s18", from: 1899, to: 2019, set: "classroom", rig: "morning", beat: "Why", line: "It probably also said: \"you're ahead of the other kids.\"" },
  { id: "s19", from: 2019, to: 2139, set: "bedroom", rig: "morning", rigOpts: {"sunEl": 8}, beat: "Why", line: "And when you're already ahead... one lazy morning feels earned." },
  { id: "s20", from: 2139, to: 2199, set: "kitchen", rig: "morning", beat: "Payoff", line: "The certificate stays on the fridge..." },
  { id: "s21", from: 2199, to: 2250, set: "bedroom", rig: "morning", rigOpts: {"sunEl": 10}, beat: "Payoff", line: "...while you hit snooze." },
  { id: "s22", from: 2250, to: 2279, set: "kitchen", rig: "morning", beat: "Payoff", line: "(tail: the loop)" },
];

export const SHOTS: ShotDef[] = SHOT_TABLE.map((r) => ({ id: r.id, from: r.from, to: r.to, set: r.set, rig: r.rig,
  ...(r.rigOpts ? { rigOpts: r.rigOpts as ShotDef["rigOpts"] } : {}), cam: CAMS[r.id](r.from, r.to) }));

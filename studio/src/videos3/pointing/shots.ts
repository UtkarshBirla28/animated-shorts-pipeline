// THE SHOT TABLE of 'pointing', script v3 (DIRECTOR; hand-written, NOT generated: tools/v3/new_short_v3.py --shots would
// overwrite it with fixed frames). The 25 shots of sound/pointing/script_v3/shot_outline_v3.json with EXACTLY its ids
// (s01 .. s24 with s03b, s16a / s16b; the outline's "v3_" prefix dropped, as CAST's BEATS_V3 anchors expect). Every shot's
// frames come from timeline.ts (rules on the voice's words), so the table re-times itself when words.ts lands.
// NO camera, set or cast import here (cameras: cams.ts + film.ts), so anything may import this file at top level.
import { FRAMES, SHOT_IDS, TOKS, TOTAL as TL_TOTAL, shotOfFrame, type ShotId, type Who } from "./timeline";

export const TOTAL = TL_TOTAL;
export type ShotRow = { id: string; from: number; to: number; set: string; rig: string; rigOpts?: Record<string, number | [number, number, number]>;
  /** platform shots: which of STATION's JP_RIG presets the shot takes (resolved in film.ts) */
  look?: "frame0" | "bag" | "wide" | "west";
  beat: string; line: string; place: string };

type Meta = { set: "jp_platform" | "car" | "cab" | "lab"; rigOpts?: Record<string, number | [number, number, number]>; look?: ShotRow["look"]; beat: string; place: string; rig?: string };
// cab exposure per shot (DIRECTOR 04:15, draft-still L*: s03 1.0 -> 1.3 = L* ~36 -> ~38 with the green lamp still glowing;
// s21 1.0 -> 2.1 = L* 26 -> ~38, the glove unclipped, the door icon readable)
// LOOK TEST 2026-11-20: CAB_FACE was { sunAz: -35, sunEl: 11 } (+ the cab set's warmth 1.2 = beige): crisp, less warm, more contrast
const VIVID_CAB = { warmth: 0.15, exposure: 0.8, haze: 0.0002, contrast: 0.36, sat: 1.8, shadowSat: 1.5, hiTint: [1.015, 1.0, 0.975] as [number, number, number], loTint: [0.95, 0.99, 1.07] as [number, number, number] };
// LOOK v2 2026-11-20: CAB, CAB_B and LAB take the same vivid grade (were { sunAz: -35, sunEl: 20 }, { sunAz: -35, sunEl: 16 }, { sunAz: 95, sunEl: 25 })
const { exposure: _ve, ...VIVID_GRADE } = VIVID_CAB; void _ve;
const CAB = { sunAz: -35, sunEl: 20, ...VIVID_GRADE }, CAB_FACE = { sunAz: -35, sunEl: 11, ...VIVID_CAB }, CAB_B = { sunAz: -35, sunEl: 16, ...VIVID_GRADE }, CAR = { sunAz: -80, sunEl: 18 }, LAB = { sunAz: 95, sunEl: 25, ...VIVID_GRADE, warmth: 0 };
/** place, light and beat per shot (the outline's "place"; SCRIPT_v3 section 8) */
const META: Record<ShotId, Meta> = {
  s01: { set: "jp_platform", look: "frame0", beat: "Hook", place: "platform B, low gold sun: FRAME 0" },
  s02: { set: "car", rigOpts: CAR, beat: "Hook", place: "packed front car, from the aisle toward the cab" },
  s03: { set: "cab", rigOpts: { ...CAB, exposure: 1.3 }, beat: "Hook", place: "cab: over his shoulder, the glove rises beside the green lamp" },
  s03b: { set: "cab", rigOpts: CAB_FACE, beat: "Hook", place: "cab: the driver's face, front three-quarter: Signal... green!" },
  s04: { set: "car", rigOpts: CAR, beat: "Doubter", place: "car, two-shot at the cab glass" },
  s05: { set: "car", rigOpts: CAR, beat: "Stakes", place: "car, mid-aisle glide to the suitcase" },
  s06: { set: "cab", rigOpts: CAB, beat: "Clue", place: "cab, looking back through the partition glass" },
  s07: { set: "jp_platform", look: "bag", beat: "Escalation", place: "platform A, car 1's front door, looking in" },
  s08: { set: "jp_platform", look: "bag", beat: "Escalation", place: "platform A, the same doorway, closer" },
  s09: { set: "jp_platform", look: "bag", beat: "Plant", place: "platform A, knee-high along the car: THE PLANT" },
  s10: { set: "car", rigOpts: CAR, beat: "Doubter", place: "car, moving" },
  s11: { set: "jp_platform", look: "bag", beat: "Plant", place: "platform B, the doorway framing" },
  s12: { set: "jp_platform", look: "bag", beat: "Plant", place: "platform B, the same doorway, closer" },
  s13: { set: "jp_platform", look: "bag", beat: "Joke", place: "platform B, the vending machine" },
  s14: { set: "jp_platform", look: "bag", beat: "Clue", place: "platform B, the doorway, tight" },
  s15: { set: "jp_platform", look: "west", beat: "Irony", place: "from inside the doorway, looking out" },
  s16a: { set: "jp_platform", look: "bag", beat: "Turn", place: "platform B, the slow orbit" },
  s16b: { set: "jp_platform", look: "bag", beat: "Turn", place: "platform B, the orbit, 1.3x closer" },
  s17: { set: "lab", rig: "interiorWarm", rigOpts: LAB, beat: "Answer", place: "lab: the two jars, the EYE side" },
  s18: { set: "jp_platform", look: "west", beat: "Answer", place: "from inside the doorway (shot 15's camera)" },
  s19: { set: "lab", rig: "interiorWarm", rigOpts: LAB, beat: "Answer", place: "lab: the two jars, the FINGER side" },
  s20: { set: "jp_platform", look: "west", beat: "Why", place: "from inside the doorway (shot 15's camera)" },
  s21: { set: "cab", rigOpts: { ...CAB_B, exposure: 2.1 }, beat: "Why", place: "cab at station B: the dark door lamp" },
  s22: { set: "jp_platform", look: "bag", beat: "Payoff", place: "platform B, knee-high along the car: THE PAYOFF" },
  s23: { set: "jp_platform", look: "bag", beat: "Payoff", place: "platform B, tracking the door window" },
  s24: { set: "jp_platform", look: "frame0", beat: "Payoff", place: "platform B: FRAME 0's camera, 1.9 s earlier" },
};

// each shot's `line` = the words that START inside it, in script order, with the speaker tags CAST's timing.ts reads
// ("(N)" "(D)" "(T)" "(KID)"). A word never goes to an earlier shot than the word before it.
const TAG: Record<Who, string> = { N: "(N)", D: "(D)", T: "(T)", KID: "(KID)" };
const lines: Record<string, string[]> = {};
{
  let minIdx = 0; const last: Record<string, Who | null> = {};
  for (const t of TOKS) {
    const idx = Math.max(minIdx, SHOT_IDS.indexOf(shotOfFrame(Math.round(t.s * 30 + 0.5)))); minIdx = idx;
    const id = SHOT_IDS[idx], out = (lines[id] ??= []);
    if (last[id] !== t.who) { out.push(TAG[t.who]); last[id] = t.who; }
    out.push(t.raw);
  }
}

export const SHOT_TABLE: ShotRow[] = SHOT_IDS.map((id) => {
  const m = META[id];
  return { id, from: FRAMES[id][0], to: FRAMES[id][1], set: m.set, rig: m.rig ?? "golden", ...(m.rigOpts ? { rigOpts: m.rigOpts } : {}), ...(m.look ? { look: m.look } : {}),
    beat: m.beat, line: (lines[id] ?? []).join(" "), place: m.place };
});

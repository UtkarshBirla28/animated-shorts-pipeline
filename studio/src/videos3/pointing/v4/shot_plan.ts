// THE v4 SHOT PLAN (DIRECTOR; pure data, imports nothing, so anything may import it). One clear picture per sentence.
// A shot STARTS on a rule on words, never on a typed second:
//   start: "line:L04"      -> the first word of line L04, minus `lead` (default 0.10 s): a cut just before the line
//   start: "word:go#7"     -> that word (the script's own word key: lower case, "#n" = its n-th time in the script), minus
//                             `lead` (default 0.03 s: one frame before the word)
//   at: +0.25              -> seconds added after the rule
//   lead: -0.017           -> the cut frame is never BEFORE the word (frame time >= the onset): v04's first frame is RED
//   v02 cuts 0.25 s BEFORE "green": the cut-in shows the dark lamp, then it lights GREEN ~7 f into the shot (seen, not hidden in a cut)
// `set` = the set id (v4/sets/<set>.ts + its camera table, owned by the set's owner: briefs/v3/pointing/V4_STRUCTURE.md).
// `closeUp` = a chosen close-up (the face-size gate allows a head over a quarter of the frame height only there).
// `rest` = frames the camera stands still at the end of the shot (camkit.restFrames: 15-20 f, 8-10 f under 1.2 s).
// `drift` = the director's slow push on a still owner lens; `freeze` = no camera motion at all (v04, v05: the red beat).
// REAL VOICE (68.47 s): v10b (cut on 'Five') and v36a ('Now try again.') added so no shot is over 3.5 s.
// LOCKED Ricks-style text (evening): rules re-set on its words (v08 a#2, v19 so#1, v23 the#5, v26 to#2, v32 subway#1).
// Ids v01..v36 (v11 cut at 15:20; v23b added: the blurry signal, so v23 stays under 3.5 s on the real voice). Plan on the LOCKED SCRIPT_v4.md (lines_v4.json, 22 lines, L01..L22): the trap is played on the viewer
// first (frame 0 = the lab lamp + the young woman at the button), the steam story in the middle, the loop = line 22 = frame
// 0 with her arm up. The full table: briefs/v3/pointing/SHOT_TABLE_v4.md (director/make_shot_table_v4.py).
export type ShotPlan = { id: string; start: string; lead?: number; at?: number; set: string; place: string; owner: string;
  closeUp?: boolean; rest?: number; rig?: string;
  /** the director's slow push (+) / pull (-) on top of a still owner camera: fraction of the lens-to-look distance */
  drift?: number;
  /** the drift's travel cap in metres (cams.ts DRIFT_MAX_M = 0.6 by default; the 40 m hall allows more) */
  driftMaxM?: number;
  /** the whole shot holds its first frame's camera (stillness IS the picture) */
  freeze?: boolean };

export const SHOT_PLAN: ShotPlan[] = [
  // ---- THE OPENING (lines 1-3, ~8 s): the trap played on the viewer
  { id: "v01", start: "line:L01", closeUp: true, set: "lab", owner: "LAB", place: "FRAME 0: the big signal lamp (dark) at the top, the young woman at the one big button below, finger ready, eyes wide" },
  { id: "v02", start: "word:green#1", lead: 0.25, drift: 0.1, closeUp: true, set: "lab", owner: "LAB", place: "cut in: the lamp lights GREEN, her face below it, looking up" },
  { id: "v03", start: "word:go#1", lead: 0.07, rest: 0, closeUp: true, set: "lab", owner: "LAB", place: "the Go run: the lamp flashes green on each Go, she presses each time, the camera pushes in (pressure)" },
  { id: "v04", start: "word:go#7", lead: -0.017, drift: 0.05, rest: 0, set: "lab", owner: "LAB", place: "HARD CUT TO RED: the lamp RED, red light floods the room, her hand comes down anyway; the held beat", closeUp: true },
  { id: "v05", start: "line:L03", drift: 0.1, rest: 0, set: "lab", owner: "LAB", place: "her frozen face, hand on the button, staring up at the red lamp; a big red X pops on 'She'", closeUp: true },
  // ---- the real trap (1994)
  { id: "v06", start: "line:L04", drift: 0.08, driftMaxM: 0.5, set: "lab", owner: "LAB", place: "WIDE: the lab, two rows of twelve at button boards; the board 1994 BIG on the wall (the only date in the film: on screen >= 1 s)" },
  { id: "v07", start: "word:set#1", drift: 0.12, set: "lab", owner: "LAB", place: "a grinning researcher's hand on a big switch: the trap" },
  { id: "v08", start: "word:a#2", drift: 0.1, driftMaxM: 0.5, rest: 0, set: "lab", owner: "LAB", place: "the counter runs 98, 99, 100" },
  { id: "v09", start: "word:red#1", drift: 0.08, driftMaxM: 0.5, set: "lab", owner: "LAB", place: "one big RED floods the whole room (hard cut)" },
  { id: "v10", start: "line:L05", drift: 0.1, driftMaxM: 0.5, set: "lab", owner: "LAB", place: "the first row of twelve watching their lamps, bored (held); the lamps go red" },
  { id: "v10b", start: "word:five#1", drift: 0.22, driftMaxM: 0.5, set: "lab", owner: "LAB", place: "CLOSER on the same row: five hands SLAM down, five red X's pop, five faces freeze; board 5 OF 12" },
  // (v11 is CUT with line 6 at the 15:20 length cut; the other ids are NOT renumbered)
  { id: "v12", start: "line:L07", drift: 0.15, driftMaxM: 1.0, set: "lab", owner: "LAB", place: "the second row: the researcher holds up a card with a pointing hand on it (the extra rule)" },
  { id: "v13", start: "word:point#1", drift: 0.14, driftMaxM: 0.5, set: "lab", owner: "LAB", place: "twelve point at their lamps and call, one after another, like a wave" },
  { id: "v14", start: "line:L08", set: "lab", owner: "LAB", place: "RED: all twelve point at it, mouths open; twelve untouched buttons. Board: 0 OF 12" },
  { id: "v15", start: "line:L09", set: "lab", owner: "LAB", place: "a bored volunteer stares straight at the red lamp" },
  { id: "v16", start: "word:your#2", drift: -0.14, set: "lab", owner: "LAB", place: "...his hand taps the button by itself" },
  { id: "v17", start: "line:L10", drift: 0.18, set: "kitchen", owner: "LAB", place: "kitchen, morning: someone in pyjamas at the open fridge, staring at the cereal box inside it" },
  { id: "v18", start: "line:L11", closeUp: true, set: "lab", owner: "LAB", place: "the young woman from the start points at the red lamp and says it; her other hand off the button; a green tick" },
  // ---- today's drivers
  { id: "v19", start: "word:so#1", set: "jp_platform", owner: "TRAIN", place: "TODAY: a bright train glides into a sunny platform" },
  { id: "v20", start: "word:point#2", set: "cab", owner: "TRAIN", place: "the cab: the driver (cap, white gloves) snaps a crisp side-on point at a green signal" },
  { id: "v21", start: "line:L12", lead: -0.3, drift: 0.18, set: "car", owner: "TRAIN", place: "SIGNAL CLEAR!: a kid at the front window copies him" },
  // ---- where it came from (the story goes)
  { id: "v22", start: "line:L13", set: "steam", owner: "TRAIN", place: "HARD CUT: a black steam engine thunders through bright green fields, blue sky, long white smoke" },
  { id: "v23", start: "word:the#5", set: "steam", owner: "TRAIN", place: "the cab: the driver leans to the little round window, peering hard" },
  { id: "v23b", start: "word:eyes#1", lead: 0.12, drift: 0.25, set: "steam", owner: "TRAIN", place: "HIS VIEW through the little round window: the signal ahead is a soft blur (eyes had gone bad)" },
  { id: "v24", start: "line:L14", drift: 0.2, driftMaxM: 0.3, set: "steam", owner: "TRAIN", place: "he turns and shouts across the cab: SIGNAL CLEAR!" },
  { id: "v25", start: "line:L15", set: "steam", owner: "TRAIN", place: "the coal man mid-shovel, fire glowing, hears it" },
  { id: "v26", start: "word:to#2", set: "steam", owner: "TRAIN", place: "the coal man leans out and LOOKS at the semaphore (arm lowered = clear) BEFORE he shouts" },
  { id: "v27", start: "line:L16", lead: 0.35, drift: 0.12, closeUp: true, set: "steam", owner: "TRAIN", place: "...and bellows CLEAR! back with a huge grin" },
  { id: "v28", start: "line:L17", lead: 0.05, set: "steam", owner: "TRAIN", place: "the boss (dark suit, bowler) squeezed into the corner of the cab, delighted" },
  { id: "v29", start: "word:and#4", closeUp: true, set: "steam", owner: "TRAIN", place: "the boss writes RULE in his notebook" },
  { id: "v30", start: "line:L18", drift: -0.28, set: "steam", owner: "TRAIN", place: "the driver nose to the glass, peering; behind him the boss beams and nods (held)" },
  // ---- New York, the last laugh
  { id: "v31", start: "line:L19", set: "ny_station", owner: "STATION", place: "New York subway station: the train in, the conductor leans from the middle window" },
  { id: "v32", start: "word:subway#1", set: "ny_station", owner: "STATION", place: "he points at the black-and-white striped board; only then the doors open" },
  { id: "v33", start: "line:L20", set: "ny_station", owner: "STATION", place: "a young man and a young woman hold up a big cardboard sign right under the board" },
  { id: "v34", start: "word:point#4", set: "ny_station", owner: "STATION", place: "the sign, big: POINT HERE IF YOU ARE DEAD SEXY", closeUp: true },
  { id: "v35", start: "line:L21", set: "ny_station", owner: "STATION", place: "the conductor points at it, deadpan, then grins" },
  // ---- the loop
  { id: "v36a", start: "line:L22", drift: -0.18, closeUp: true, rest: 0, set: "lab", owner: "LAB", place: "'Now try again.': v02's cut-in lens: the big lamp DARK again (re-armed), her face below looking up at it, finger ready" },
  { id: "v36", start: "word:this#2", closeUp: true, set: "lab", owner: "LAB", place: "from 'This time': frame 0's lens; her arm already up, pointing side-on at the lamp, mouth open (the loop match on the LAST frame)" },
];

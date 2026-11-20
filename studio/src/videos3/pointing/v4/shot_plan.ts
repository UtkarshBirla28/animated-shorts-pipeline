// THE v4 SHOT PLAN (DIRECTOR; pure data, imports nothing, so anything may import it). One clear picture per sentence.
// A shot STARTS on a rule on words, never on a typed second:
//   start: "line:L04"      -> the first word of line L04, minus `lead` (default 0.10 s): a cut just before the line
//   start: "word:go#7"     -> that word (the script's own word key: lower case, "#n" = its n-th time in the script), minus
//                             `lead` (default 0.03 s: one frame before the word)
//   at: +0.25              -> seconds added after the rule
// `set` = the set id (v4/sets/<set>.ts + its camera table, owned by the set's owner: briefs/v3/pointing/V4_STRUCTURE.md).
// `closeUp` = a chosen close-up (the face-size gate allows a head over a quarter of the frame height only there).
// `rest` = frames the camera stands still at the end of the shot (default 20; camkit.withRest).
// Ids v01..v36. Plan on the LOCKED SCRIPT_v4.md (lines_v4.json, 22 lines, L01..L22): the trap is played on the viewer
// first (frame 0 = the lab lamp + the young woman at the button), the steam story in the middle, the loop = line 22 = frame
// 0 with her arm up. The full table: briefs/v3/pointing/SHOT_TABLE_v4.md (director/make_shot_table_v4.py).
export type ShotPlan = { id: string; start: string; lead?: number; at?: number; set: string; place: string; owner: string;
  closeUp?: boolean; rest?: number; rig?: string };

export const SHOT_PLAN: ShotPlan[] = [
  // ---- THE OPENING (lines 1-3, ~8 s): the trap played on the viewer
  { id: "v01", start: "line:L01", set: "lab", owner: "LAB", place: "FRAME 0: the big signal lamp (dark) at the top, the young woman at the one big button below, finger ready, eyes wide" },
  { id: "v02", start: "word:green#1", lead: 0.05, set: "lab", owner: "LAB", place: "cut in: the lamp lights GREEN, her face below it, looking up" },
  { id: "v03", start: "word:go#1", lead: 0.07, set: "lab", owner: "LAB", place: "the Go run: the lamp flashes green on each Go, she presses each time, the camera pushes in (pressure)", rest: 6 },
  { id: "v04", start: "word:go#7", lead: 0.03, set: "lab", owner: "LAB", place: "HARD CUT TO RED: the lamp RED, red light floods the room, her hand comes down anyway; the held beat", closeUp: true, rest: 20 },
  { id: "v05", start: "line:L03", set: "lab", owner: "LAB", place: "her frozen face, hand on the button, staring up at the red lamp; a big red X pops on 'She'", closeUp: true },
  // ---- the real trap (1994)
  { id: "v06", start: "line:L04", set: "lab", owner: "LAB", place: "WIDE: the 1994 lab, two rows of twelve at button boards; board 1994" },
  { id: "v07", start: "word:set#1", set: "lab", owner: "LAB", place: "a grinning researcher's hand on a big switch: the trap" },
  { id: "v08", start: "word:a#3", set: "lab", owner: "LAB", place: "the counter runs 98, 99, 100" },
  { id: "v09", start: "word:red#1", set: "lab", owner: "LAB", place: "one big RED floods the whole room (hard cut)" },
  { id: "v10", start: "line:L05", set: "lab", owner: "LAB", place: "the first row watching their lamps; on 'Five' five hands slam down, five red X's pop, five faces freeze. Board: 5 OF 12" },
  { id: "v11", start: "line:L06", set: "lab", owner: "LAB", place: "closer on three of them: red again, three hands down again; the researcher's clipboard drops" },
  { id: "v12", start: "line:L07", set: "lab", owner: "LAB", place: "the second row: the researcher holds up a card with a pointing hand on it (the extra rule)" },
  { id: "v13", start: "word:point#1", set: "lab", owner: "LAB", place: "twelve point at their lamps and call, one after another, like a wave" },
  { id: "v14", start: "line:L08", set: "lab", owner: "LAB", place: "RED: all twelve point at it, mouths open; twelve untouched buttons. Board: 0 OF 12" },
  { id: "v15", start: "line:L09", set: "lab", owner: "LAB", place: "a bored volunteer stares straight at the red lamp" },
  { id: "v16", start: "word:hand#1", set: "lab", owner: "LAB", place: "...his hand taps the button by itself" },
  { id: "v17", start: "line:L10", set: "kitchen", owner: "LAB", place: "kitchen, morning: someone in pyjamas at the open fridge, staring at the cereal box inside it" },
  { id: "v18", start: "line:L11", set: "lab", owner: "LAB", place: "the young woman from the start points at the red lamp and says it; her other hand off the button; a green tick" },
  // ---- today's drivers
  { id: "v19", start: "word:which#1", set: "jp_platform", owner: "TRAIN", place: "TODAY: a bright train glides into a sunny platform" },
  { id: "v20", start: "word:point#2", set: "cab", owner: "TRAIN", place: "the cab: the driver (cap, white gloves) snaps a crisp side-on point at a green signal" },
  { id: "v21", start: "line:L12", set: "car", owner: "TRAIN", place: "SIGNAL CLEAR!: a kid at the front window copies him" },
  // ---- where it came from (the story goes)
  { id: "v22", start: "line:L13", set: "steam", owner: "TRAIN", place: "HARD CUT: a black steam engine thunders through bright green fields, blue sky, long white smoke" },
  { id: "v23", start: "word:the#5", set: "steam", owner: "TRAIN", place: "the cab: the driver leans to the little round window, peering hard; the signal ahead a soft blur" },
  { id: "v24", start: "line:L14", set: "steam", owner: "TRAIN", place: "he turns and shouts across the cab: SIGNAL CLEAR!" },
  { id: "v25", start: "line:L15", set: "steam", owner: "TRAIN", place: "the coal man mid-shovel, fire glowing, hears it" },
  { id: "v26", start: "word:who#1", set: "steam", owner: "TRAIN", place: "the coal man leans out and looks at the signal post (arm lowered = clear)" },
  { id: "v27", start: "line:L16", set: "steam", owner: "TRAIN", place: "...and bellows CLEAR! back with a huge grin" },
  { id: "v28", start: "line:L17", set: "steam", owner: "TRAIN", place: "the boss (dark suit, bowler) squeezed into the corner of the cab, delighted" },
  { id: "v29", start: "word:made#1", set: "steam", owner: "TRAIN", place: "the boss writes RULE in his notebook" },
  { id: "v30", start: "line:L18", set: "steam", owner: "TRAIN", place: "the driver nose to the glass, peering; behind him the boss beams and nods (held)" },
  // ---- New York, the last laugh
  { id: "v31", start: "line:L19", set: "ny_station", owner: "STATION", place: "New York subway station: the train in, the conductor leans from the middle window" },
  { id: "v32", start: "word:conductors#1", set: "ny_station", owner: "STATION", place: "he points at the black-and-white striped board; only then the doors open" },
  { id: "v33", start: "line:L20", set: "ny_station", owner: "STATION", place: "a young man and a young woman hold up a big cardboard sign right under the board" },
  { id: "v34", start: "word:point#4", set: "ny_station", owner: "STATION", place: "the sign, big: POINT HERE IF YOU ARE DEAD SEXY", closeUp: true },
  { id: "v35", start: "line:L21", set: "ny_station", owner: "STATION", place: "the conductor points at it, deadpan, then grins" },
  // ---- the loop
  { id: "v36", start: "line:L22", set: "lab", owner: "LAB", place: "the big lamp and the young woman at the button, exactly as frame 0; her arm already up, pointing, mouth open (the loop match)" },
];

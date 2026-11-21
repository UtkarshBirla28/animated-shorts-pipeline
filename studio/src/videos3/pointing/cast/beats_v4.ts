// THE v4 BEAT TABLE (owner CAST, 2026-11-20): the true story, script v4 (sound/pointing/SCRIPT_v4.md, 22 lines), cued on
// the v4 clock (v4/resolver.ts R_V4: word keys like "go#3", "clear#2"; shot anchors "@v05", "@v18.end"). HOLD, THEN SNAP:
// every pose holds, every change is a 2-3 f snap; mouths move only on a character's own shout (face rows with one open
// shape held, no lip flapping); nothing crosses a face; no point at the lens. What each SET gives per shot: `aim` (the
// button / the lamp / the signal / the board), `look` (what the eyes are on), `restR` / `restL` (a lever, the desk).
// Word keys of the script: "go#1".."go#7" (L02), "signal#1" + "clear#1" (D, L12), "signal#2" + "clear#2" (H, L14),
// "clear#3" (C, L16).
import { setEventCues, setLoopWrap, type Beat } from "./moves";
import { EV, FPS, TOTAL } from "../v4/timeline";   // (the v4 clock imports only data files: no import cycle)

/** an EV event name -> film frame (NaN when the clock has no such event): "go1".."go6" = EV.goFlashes, else EV[name] */
export const evF = (name: string): number => {
  const m = /^go(\d)$/.exec(name);
  const s = m ? EV.goFlashes[+m[1] - 1] : (EV as unknown as Record<string, number>)[name];
  return typeof s === "number" && Number.isFinite(s) ? Math.round(s * FPS) : NaN;
};
setEventCues(evF);
// the LOOP WRAP: from the loop tail on, the idle life runs on the film-start clock (moves.ts compose), over the 8-f ease
setLoopWrap({ from: evF("loopTail"), len: TOTAL, ease: 8 });

// EVENT CUES (cast/v4.ts RV4: the director's v4/timeline.ts EV, so the presses, the red and the X follow the lamp, the
// beeps and the voice by themselves): "ev:lampGreen", "ev:go1".."ev:go6" (the six green flashes), "ev:red" (the red Go),
// "ev:redBeatEnd", "ev:xPop", "ev:loopPoint"; any of them with "+n" / "-n" frames.
const W = "lab_woman" as const;
/** the Go run: one clean press per green flash (the finger lands on the flash: cue 1 f before it), the hand back up to the
 *  hover between; the last hover runs to the frame before the red */
// (v5, lead 22:55: the fingertip ON the dome 1-2 f after each Go's onset: tap cued ON ev:goN (the hand half-way down on
// goN, ON the dome goN+1 .. goN+3 = the frames LAB's dome dips, back at the hover by goN+6)
/** FIX R1 (audit: "12 pops in 2.3 s; the finger lands WITH the lamp, so her button seems to switch the lamp on"): the
 *  LAMP FIRST, then the finger: per Go [lag, travel, hold, up] in frames after the flash: still for lag, down over travel
 *  (eased), on the dome for hold, back up over up (eased); the lag shrinks as she gets surer. LAB's dome dip reads
 *  GO_PRESS: ON the dome from goN + lag + travel for hold frames (then up with the finger) */
// (round 2, lead: 3 frames down (eased in), 2 on the dome, 3 up; lag + travel unchanged (the dome dip, the clicks and
// EV.goFlashes keep their frames); the up is 2 f where the next Go comes too soon for 3)
export const GO_PRESS: [number, number, number, number][] = [[4, 3, 2, 3], [4, 3, 2, 2], [2, 3, 2, 3], [2, 3, 2, 2], [1, 3, 2, 3], [1, 3, 2, 3]];
/** the red: the hand starts down on v04's first frame (ev:red+1) and lands RED_LAND frames after ev:red, staying there */
export const RED_DOWN = { start: 1, travel: 5 };
const GO_RUN: Beat[] = [1, 2, 3, 4, 5, 6].flatMap((n): Beat[] => {
  const [lag, travel, hold, up] = GO_PRESS[n - 1], end = lag + travel + hold + up;
  return [
    { who: W, m: "tap", at: `ev:go${n}`, until: `ev:go${n}+${end}`, lag, travel, hold, up },
    // (the last hover before the red is HIGHER: the finger is seen coming down from well above the dome on v04)
    { who: W, m: "hover", at: `ev:go${n}+${end}`, until: n < 6 ? `ev:go${n + 1}` : `ev:red+${RED_DOWN.start}`, ...(n === 6 ? { lift: 0.3 } : {}) },
  ];
});

export const BEATS_V4: Beat[] = [
  // ================= THE YOUNG WOMAN (the face of the hook; seated at the big button; aim = the BUTTON in the opening, the
  // LAMP in v18 / v36: cast/v4.ts labWomanV4 switches it; look = the lamp always)
  // v01 FRAME 0: the finger ready over the button, eyes wide up on the lamp, ALREADY there on frame 0 (no settling move:
  // every row starts before the shot, the gate keeps the pre-roll out of the picture)
  { who: W, m: "hover", at: "@v01-6", until: "ev:go1-1" },
  { who: W, m: "look", at: "@v01-6", until: "@v05-1", to: "look", head: 5, noBlink: true },
  // (FIX R1, audit #25: her pupils flipped between v04 and v05: in v05 the eyes HOLD the v04 direction, up-left at the red
  // lamp, as a fixed screen gaze (the v05 lens put the lamp target on the other side of her head))
  { who: W, m: "look", at: "@v05-1", until: "tap#2-1", to: [-0.9, -0.8], head: 5, noBlink: true },
  { who: W, m: "look", at: "tap#2-1", until: "tap#2+9", to: [0.25, 1.2], head: 3, noBlink: true },
  { who: W, m: "look", at: "tap#2+9", until: "@v05.end", to: [-0.9, -0.8], head: 5, noBlink: true },
  { who: W, m: "face", at: "@v01-6", until: "ev:lampGreen", expr: "bright", browUp: 6, mouth: "tight", still: true },
  // v02 the lamp goes GREEN: the eyes widen (one clean swap), the finger lifts a hair, held
  { who: W, m: "hover", at: "ev:lampGreen", until: "ev:go1-1", lift: 0.18 },
  // (FIX R1: never a mouth on the narrator's word: the green is wide eyes + brows up, the mouth SHUT)
  { who: W, m: "face", at: "ev:lampGreen", until: "ev:go1-1", expr: "brightO", browUp: 11, mouth: "tight", still: true },
  // v03 the Go run: a press on each green flash, the hand back up between; the face SURER every two presses (unsure ->
  // steady -> sure; each face held >= 20 f)
  ...GO_RUN,
  // (FIX R1 clip 05:30: an idle blink fell on f176-178, the press itself: no idle blink through the Go run and the red
  // (freeze 0.29: a little life stays, the blinks stop))
  { who: W, m: "freeze", at: "ev:go1-1", until: "ev:red+8", amt: 0.29 },
  { who: W, m: "face", at: "ev:go1-1", until: "ev:go3-1", expr: "bright", browUp: 8, mouth: "tight", still: true },
  { who: W, m: "face", at: "ev:go3-1", until: "ev:go5-1", expr: "bright", browUp: 3, mouth: "dash", still: true },
  { who: W, m: "face", at: "ev:go5-1", until: "ev:red+8", expr: "bright", browUp: -3, mouth: "smirk", still: true },   // (smugB read sleepy / bored on the f139 draft)
  // v04 the RED: her hand comes down ANYWAY (already moving on the cut: a 2 f snap) and STAYS on the button; 4 f later she
  // FREEZES: a dead stop through the held beat, eyes wide, a small "o", staring up at the red lamp; v05 the same frozen
  // stare (a breath you can just see) while the X pops
  // (FIX R1: the finger is SEEN coming down on v04: from the hover on v04's first frame, down over 4 f, on the dome at
  // ev:red+5 (f178), staying; the face realises 2 f after the landing with one in-between frame)
  { who: W, m: "down", at: `ev:red+${RED_DOWN.start}`, until: "@v05.end", travel: RED_DOWN.travel },
  // (v5, lead 22:55: the hand lands first (full on ev:red+1), the face SNAPS to shock 2 f later: she realises after she has
  // pressed; the change must be unmissable: wide white eyes, brows jumped up, a big round "O")
  { who: W, m: "face", at: "ev:red+8", until: "ev:red+9", expr: "brightO", browUp: 4, mouth: "o", still: true },
  // (round 2, lead: the big "O" only through the SILENT stop; from "Did" on (the narrator) a small tight mouth, the shock in
  // the eyes and brows)
  { who: W, m: "face", at: "ev:red+9", until: "did#1-1", expr: "ohWide", browUp: 6, mouth: "O", still: true },
  { who: W, m: "face", at: "did#1-1", until: "@v05.end", expr: "ohWide", browUp: 7, mouth: "tight", still: true },
  // v05 LIFE (round 2): a HARD blink 6 f in, the eyes flick DOWN to her own finger on "tap?" and back up, a small tremble
  { who: W, m: "blink", at: "@v05+6" },
  { who: W, m: "tremble", at: "@v05", until: "@v05.end", amt: 0.8 },
  { who: W, m: "freeze", at: "ev:red+9", until: "@v05", amt: 0 },
  { who: W, m: "freeze", at: "@v05", until: "@v05.end", amt: 0.12 },
  // (19:05, LEAD: the point only on "Pointing and saying it" (~43 f), then the arm comes down in one snap, her other hand
  // off the button; the lamp is up-LEFT of her (LAB 18:50): the right arm (screen left) points up-left at the RED lens)
  // (v5 00:40, cold f880 / f2020: on LAB's newest lens the lamp HOUSING stands between her hand and the lens, so the hand
  // that lands on the lens is drawn BEHIND the housing (no hand seen). A gap does not help (aimArm keeps a gapped arm >= 0.95
  // of its reach). LAB owns the fix: the lamp off her shoulder line, or an aim just outside the housing (report 00:45))
  // (v5 02:30, LAB check: the point dropped ~f905, BEFORE the green tick on "wait": it holds to 12 f after the tick now)
  // (FIX R1 arm-out 20.8 % > 16 %: the point snaps up as "Pointing" ends and holds to 8 f after the tick on "wait")
  // (round 2, gates_v4 arm-out 20.1 %: the snap 4 f later, held 6 f past the tick: still past it, 6 f less arm out)
  { who: W, m: "point", at: "pointing#1.end+2", until: "wait#1+6", still: true },
  { who: W, m: "look", at: "@v18-4", until: "@v18.end", to: "look", head: 5 },
  // (FIX R1 rule: no open mouth under the narrator: she points with a firm, closed mouth)
  { who: W, m: "face", at: "@v18-4", until: "it#2.end", expr: "bright", browUp: 4, mouth: "tight", still: true },
  { who: W, m: "face", at: "it#2.end", until: "wait#1", expr: "bright", browUp: 2, mouth: "tight", still: true },
  { who: W, m: "face", at: "wait#1", until: "@v18.end", expr: "brightGrin", still: true },
  // v36a ("Now try again."): frame 0's READY pose held: the index finger down over the button (aim = the BUTTON in this
  // shot), eyes wide on the dark lamp, no point yet
  { who: W, m: "hover", at: "@v36a-6", until: "@v36a.end" },
  { who: W, m: "look", at: "@v36a-6", until: "@v36a.end", to: "look", head: 5 },
  // (v5 02:30, LAB check: her eyes read half-lidded here: WIDE bright eyes (stare = big white eyes), no idle blink (freeze
  // 0.29 keeps a little life, stops the blink): she is about to try again
  { who: W, m: "face", at: "@v36a-6", until: "@v36a.end", expr: "stare", browUp: 6, mouth: "tight", still: true },
  { who: W, m: "freeze", at: "@v36a-6", until: "@v36a.end", amt: 0.29 },
  // v36 (the loop): exactly frame 0's picture, her arm ALREADY up pointing at the lamp (from the shot's first frame), firm;
  // the mouth opens on "say" (saying it) and holds to the last frame (the cut back to frame 0 drops the arm to the hover)
  // (FIX R1, lead: arm-out 22 % > 16 %: v36 opens with her finger ready at the BUTTON (frame 0's pose: the loop) and the
  // point snaps up on "point," (point#6 in the clock: f2012); LAB's aim switches to the lamp 0.25 s before the word)
  { who: W, m: "point", at: "point#6-6", until: "ev:loopTail", still: true }   /* (18:40: LAB moved the lamp up-LEFT of her: her right arm (screen left) points up-left at the RED lens, side-on, nothing behind it) */,
  // (the hover row AFTER the point row wins while both play: the hand leaves the button only when the point is half up: one
  // clean snap from the button to the lamp, never a frame with the arm dropped to the side)
  { who: W, m: "hover", at: "@v36-4", until: "point#6-4" },
  { who: W, m: "look", at: "@v36-4", until: "@v36.end+30", to: "look", head: 5 },
  { who: W, m: "face", at: "@v36-4", until: "say#2-1", expr: "bright", browUp: 5, mouth: "tight", still: true },
  { who: W, m: "face", at: "say#2-1", until: "ev:loopTail+2", expr: "brightO", browUp: 7, mouth: "O", still: true },
  // THE LOOP TAIL (FIX R1, director): from the end of "it." (ev:loopTail) the pointing hand EASES down over 8 f into frame
  // 0's hover over the dome (mButton blendFrom), the mouth closes into frame 0's face 2 f in; settled by ev:loopTail+8, so
  // the last frames ARE frame 0 (LAB: aim back to the button, look back to the dark lamp, as on frame 0)
  { who: W, m: "hover", at: "ev:loopTail", until: "@v36.end+30", blendFrom: 8 },
  { who: W, m: "face", at: "ev:loopTail+2", until: "@v36.end+30", expr: "bright", browUp: 6, mouth: "tight", still: true },

  // ================= THE RESEARCHER (aim = the big switch in v07)
  { who: "researcher_v4", m: "point", at: "@v07", until: "@v07.end", reach: true, still: true },
  { who: "researcher_v4", m: "face", at: "@v07", until: "@v07.end", expr: "brightGrin", still: true },

  // ================= TODAY'S DRIVER (cab; aim = the green signal ahead, side-on): the crisp point on "point", held; the
  // call: hand to the chest fist on "Signal", SNAP on "clear!" (his own shout: one open mouth held)
  // (16:30: ONE call from "point" (v20) to "clear" (v21): the side-on point snaps out on "point" and HOLDS through
  // "signals"; ~0.5 s before "clear" the hand comes back to a fist at his chest, holds, and SNAPS out on "clear". Was a
  // call on "Signal" -> "clear" (10 f apart: a 2 f chest hold, a pop))
  // (19:05, LEAD: the point holds ~30 f, the fist goes to the chest ON "shout", the snap on "clear")
  // (FIX R1, lead 04:45: no hand-to-ear beat any more (the log said it had no time) and his mouth must open CLEARLY on
  // "Signal" side-on: two plain PROFILE points (fwd: the arm in front, straight ahead along his heading, a touch up): held
  // on "point" until "shout" (arm-out), the arm down, then snapped out again on "clear"; the big shout mouth y1 from "Signal")
  { who: "driver", m: "point", at: "point#2-2", until: "point#2+26", still: true, fwd: [1.5, -0.35], hs: 1.1 },
  { who: "driver", m: "point", at: "clear#1-3", until: "clear#1.end+8", still: true, fwd: [1.5, -0.35], hs: 1.1 },
  { who: "driver", m: "face", at: "point#2-4", until: "signal#1-1", expr: "bright", browUp: -2, mouth: "dash", still: true },
  { who: "driver", m: "face", at: "signal#1-1", until: "@v21.end", expr: "bright", browUp: 2, mouth: "y1", still: true },
  // v21: the kid copies him, 6 f late: his point on "shout" (off screen, in the car), the fist at his chest when the shot
  // opens, the snap 6 f after the driver's; tongue of concentration (style kid)
  // (17:40, TRAIN: "the copy-point never shows": from behind, his chest-fist hold is hidden by his own back for most of
  // the 1.1 s shot. Now: his arm is OUT at the signal from v21's first frame, held; a jab + a little hop on "clear",
  // mouth open from "Signal")
  // (17:55 still f1048: aimed at the signal far AHEAD of him, i.e. into the picture, the arm foreshortened to a stub: he
  // points along a SCREEN direction instead, up and forward toward the cab window, a full side-on arm)
  // (18:00 f1030 / f1048: seen from behind-left his RIGHT arm is the far one: hidden by his body, only a stub showed at
  // his mouth. The NEAR (left) arm points now)
  // (v5, 2026-11-20, lead: "the kid's copy-point bigger, his FACE visible": `fwd` = the same PROFILE point as the driver's,
  // a whole straight arm along his heading at shoulder height, a touch up, on the NEAR arm, whichever side TRAIN's lens
  // is on; the lens must see his face (side-on or 3/4 front from the aisle), not his back)
  { who: "kid", m: "point", at: "@v21-4", until: "@v21.end", still: false, fwd: [1.15, -0.3], hs: 1.1 },
  { who: "kid", m: "face", at: "@v21-4", until: "signal#1", expr: "bright", browUp: 4, still: true },
  // (v5 02:20, lead: we hear the DRIVER shout "Signal clear!" here, not the kid: his mouth stays SHUT in a big proud grin)
  { who: "kid", m: "face", at: "signal#1", until: "@v21.end", expr: "proudB", browUp: 3, still: true },
  // (FIX R1 audit #10: the hop on "clear" read as a 25 px pop down + a swapped arm at the end: one clean HELD copy-point)

  // ================= HORI (steam cab; aim = the signal ahead): v23 peering at the little round window; v24 he turns
  // (the set's yaw) and SHOUTS "Signal clear!" (one open mouth); v30 nose to the glass again
  // (v5 02:20, TRAIN sheet v24 f1262: the peer ended ON v24 and faded over its first frames: brows crushed over the eyes =
  // slit eyes (never). It ends at v23b now (Hori is off in v23b), so v24 opens with his eyes open)
  { who: "hori", m: "peer", at: "@v23-10", until: "@v23b+10" },   // (round 2: leaning BEFORE the cut, held past it: no lean pop, no pale step at f1209)
  // (v5 03:15, TRAIN sheet 0306 v24 f1262: still squinting on v24's first frame (no row held his face there: a default
  // face + an idle half-lid). v24 opens on an explicit face: eyes OPEN (bright, no blink), brows scrunched a little, the
  // head pushed forward (a half peer), until his shout takes over)
  { who: "hori", m: "peer", at: "@v24-3", until: "signal#2-2", amt: 0.5 },
  { who: "hori", m: "face", at: "@v24-3", until: "signal#2-2", expr: "bright", browUp: -3, mouth: "tight", still: true },
  // (v5 04:00, the director's full pass f1262 / f1263: his eyes were SHUT: his idle blink fell on v24's first frames (a
  // `still` face keeps idle blinks). A freeze < 0.3 stops the idle blink over the shot's opening and his shout)
  { who: "hori", m: "freeze", at: "@v24-3", until: "clear#2.end", amt: 0.29 },
  // (17:45, TRAIN: v24's mouth was not open: the tall JAW-DROP shout shape from "Signal" to after "clear", held)
  { who: "hori", m: "face", at: "signal#2-2", until: "@v24.end", expr: "bright", browUp: 3, mouth: "jaw", still: true }, { who: "hori", m: "nod", at: "clear#2", amt: 1.1 },
  { who: "hori", m: "alive", at: "@v24", until: "@v29.end", amp: 0.6 },
  { who: "hori", m: "peer", at: "@v30-10", until: "@v30.end+20" },   // (round 2: already leaning on the cut)

  // ================= THE COAL MAN (aim = the signal post in v26): mid-shovel (the set holds the shovel prop through
  // CastOpts.act), he leans out and looks, then BELLOWS "Clear!" with a huge grin
  { who: "fireman", m: "alive", at: "@v25", until: "@v27.end", amp: 0.7 },
  // v25: mid-shovel, he hears it: on "shouted" his eyes snap up to the driver (the set's `look`), brows up, held
  { who: "fireman", m: "look", at: "shouted#1", until: "@v25.end", to: "look", head: 6 },
  { who: "fireman", m: "face", at: "shouted#1", until: "@v25.end", expr: "bright", browUp: 6, still: true },
  { who: "fireman", m: "look", at: "@v26", until: "clear#3", to: "aim", head: 8 },
  // v26 (lead 19:30): his hand SHADING his eyes as he looks out at the semaphore, snapped up on the cut, held to the shout
  // (v5 f1380: TRAIN's lens has him at the frame's RIGHT edge from behind: his right arm's hand was cut by the frame. The
  // LEFT hand shades (screen left from behind: inside the frame, on the side of the semaphore he looks at))
  { who: "fireman", m: "shade", at: "@v26-3", until: "clear#3-2", left: true },
  { who: "fireman", m: "face", at: "clear#3-2", until: "@v27.end", expr: "brightGrin", mouth: "laugh", still: true }   /* (round 5 f1255: mouth y1 read as a scared gasp; a HUGE GRIN bellowing = the wide laugh mouth) */, { who: "fireman", m: "nod", at: "clear#3", amt: 1.3 },

  // ================= THE BOSS (dark suit, bowler, notebook): delighted, beaming, nodding behind Hori
  // (FIX R1: mouths only on a character's own shout: the boss beams with his mouth SHUT through the narration (smileWide);
  // Hori's and the coal man's shouts end at their shot's cut, never leaking into the narrated v25 / v28)
  { who: "official", m: "face", at: "@v28", until: "@v30.end+20", expr: "delightB", mouth: "smileWide", still: true },
  { who: "official", m: "alive", at: "@v28", until: "@v30.end+20", amp: 0.6 },
  // nods on the words: "loved" (v28), "made" + "rule" (v29: the pen strokes), "knew" (v30)
  { who: "official", m: "nod", at: "loved#1", amt: 1 }, { who: "official", m: "nod", at: "rule#2", amt: 1.1 },
  // v29: the notebook comes up open at his chest, he writes on "made", underlines the big RULE on "rule" (TRAIN's hold puts the
  // notebook in his left hand, the pen in his right)
  { who: "official", m: "write", at: "@v29-3", until: "@v29.end", under: "rule#2", text: "RULE" },
  { who: "official", m: "nod", at: "knew#1", amt: 0.9 },

  // ================= NEW YORK (v31-v35): the conductor's board point + grin and the two New Yorkers' sign are acted by
  // STATION's own word-cued beats in v4/sets/ny_station.ts (one source of truth, decided 17:30 with STATION's notes);
  // CAST owns their drawing (fits.ts / people.ts) and the moves. No NY rows here.

  // ================= THE PERSON IN PYJAMAS at the open fridge (aim / look = the cereal box inside it): a blank stare
  { who: "pyjamas", m: "look", at: "@v17", until: "@v17.end", to: "aim", head: 4 },
  { who: "pyjamas", m: "face", at: "@v17", until: "@v17.end", expr: "blank", still: true },
];

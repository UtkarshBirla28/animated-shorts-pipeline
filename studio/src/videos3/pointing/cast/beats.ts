// THE BEAT TABLE (owner CAST): the film's acting as DATA. This is the ONLY file to edit when the script changes.
//
// One row = one piece of acting: { who, m: "<move>", at: "<cue>", until?: "<cue>", ...options }.
//   CUES are word keys of the SCRIPT (the same convention as the bible's starts_on): "signal", "check#2" (the 2nd
//   "check" of the film), with ".end" (the word's end) and "+n" / "-n" frames: "green.end+6", "fan-4"; or shot anchors
//   "@s05" (its first frame), "@s05.end-8". Frames follow the VOICE automatically (timing.ts): re-timing = no edit here.
//   A row whose word is not in the script simply does not play, and shows up in beatReport() (acting.ts).
//   `until` left out = the move's own length, or the end of the shot it starts in (a beat never leaks across a cut).
// Rows of one character are merged in table order: later rows win on arms / face / eyes; nods, leans, hops add up.
// The moves and their options: moves.ts (call point look face nod take walk film laugh jab stun hook lunge wag guns
// pat deadpan thumbsUp overShoulder shrug hop urgent capDrop capPush press proud frown quiet tongue mute).
// The set gives each character its `aim` (what it points at) and `look` (who it looks at) per shot: castMember opts.
import type { Beat } from "./moves";

/** SCRIPT v2 (the film as scaffolded on 2026-11-19 16:00; shots s01-s22). Kept so the current sets still act; a rough
 *  port of the first owner's per-shot code, not polished against the v1 voice */
export const BEATS_V2: Beat[] = [
  // ================= THE DRIVER (seated; the set gives restL = the T-handle, aim = the signal / dial / lamp per shot)
  { who: "driver", m: "call", name: "signal", status: "green", out: "@s01" },
  { who: "driver", m: "point", at: "fan-4", until: "fan+36" },
  { who: "driver", m: "call", name: "speed#2", status: "check#1", rise: "points-2" },
  { who: "driver", m: "point", at: "doors#1-2", until: "@s06.end", reach: true, still: true, move: 10 },
  { who: "driver", m: "call", name: "doors#2", status: "closed#1" },
  { who: "driver", m: "point", at: "does-4", until: "does+40" },
  { who: "driver", m: "point", at: "finger#2-2", until: "@s19.end", reach: true, still: true, move: 16 },
  { who: "driver", m: "call", name: "doors#5", status: "closed#2" },
  // ================= THE KID (copies 6 f late; aim = what the driver points at / the bag)
  { who: "kid", m: "call", name: "signal", status: "green", out: "@s01", style: "kid" },
  { who: "kid", m: "point", at: "@s02-30", until: "@s02.end", hs: 1.3 }, { who: "kid", m: "tongue", at: "@s02", until: "@s02.end" },
  { who: "kid", m: "point", at: "tiny-4", until: "@s04.end", move: 5, hs: 1.3 }, { who: "kid", m: "tongue", at: "tiny", until: "fan" },
  { who: "kid", m: "nod", at: "fan", amt: 1.2 }, { who: "kid", m: "face", at: "fan", until: "@s04.end", expr: "proudB" },
  { who: "kid", m: "call", name: "speed#2", status: "check#1", rise: "points-2", style: "kid" },
  { who: "kid", m: "proud", at: "check#1+14", until: "@s05.end", hips: false },
  { who: "kid", m: "face", at: "back", until: "@s08.end", expr: "worriedB" },
  { who: "kid", m: "face", at: "@s09", until: "@s09.end", expr: "stern" },
  { who: "kid", m: "frown", at: "@s14", until: "@s14.end" },
  { who: "kid", m: "face", at: "@s18", until: "@s18.end", expr: "worriedB" }, { who: "kid", m: "point", at: "something-6", until: "something+34", hs: 1.3 },
  { who: "kid", m: "point", at: "closed#2-4", until: "@s20.end", hs: 1.3 },
  { who: "kid", m: "call", name: "bag#1", status: "check#4", style: "kid", late: 0 }, { who: "kid", m: "proud", at: "check#4+6", until: "@s21.end", hips: false },
  // ================= THE TOURIST (films with his left hand; aim = whoever / whatever he points at)
  { who: "tourist", m: "film", at: "@s01-30", until: "back+8" },
  { who: "tourist", m: "laugh", at: "@s01", until: "give+6", hand: false },
  { who: "tourist", m: "jab", at: "pointing#1-3", until: "pointing#1+30" },
  { who: "tourist", m: "face", at: "too-2", until: "@s02.end", expr: "smugB" },
  { who: "tourist", m: "point", at: "stay-2", until: "back", jabs: 1 }, { who: "tourist", m: "hop", at: "back+16" },
  { who: "tourist", m: "face", at: "@s09", until: "york#1", expr: "smugB" }, { who: "tourist", m: "overShoulder", at: "nobody-2", until: "york#1-2" },
  { who: "tourist", m: "laugh", at: "york#1", until: "york#1+22", amt: 0.8, hand: false }, { who: "tourist", m: "thumbsUp", at: "york#1+28", until: "@s09.end" },
  { who: "tourist", m: "film", at: "@s14-10", until: "what's-2", lift: 1, tilt: -8 },
  { who: "tourist", m: "call", name: "vending", status: "check#2", rise: "vending-6", until: "what's-2", style: "mock" },
  { who: "tourist", m: "shrug", at: "what's", until: "bro#2.end" },
  { who: "tourist", m: "film", at: "@s18-10", until: "@s18.end", tilt: -30, rec: false }, { who: "tourist", m: "look", at: "@s18", until: "@s18.end", to: "phone" },
  { who: "tourist", m: "laugh", at: "eyes", until: "mind", amt: 0.7, hand: false },
  { who: "tourist", m: "film", at: "@s20-10", until: "check#4+12", tilt: -30, rec: false }, { who: "tourist", m: "look", at: "@s20", until: "closed#2", to: "phone" },
  { who: "tourist", m: "stun", at: "check#4+4", until: "@s22.end" },
];

/** SCRIPT v3, FINAL (the ONE-THREAD film: the laughing tourist and his yellow suitcase, with the driver and the kid),
 *  written from sound/pointing/SCRIPT_v3.md + script_v3/shot_outline_v3.json + voice_lines_v3.json (2026-11-19 22:20).
 *  NOT ACTIVE YET and never run on a real v3 timeline: shots.ts still carries script v2. When the lead regenerates
 *  shots.ts from the v3 bible: set `BEATS = BEATS_V3` below, run voice_sync.py on the new take, render the beats
 *  storyboard and fix what beatReport() lists.
 *  - HARD CUTS: the runner never plays a row before the first frame of the shot its start cue belongs to, nor after the
 *    end of the shot named by an "@sNN.end" until (moves.ts Timed.gate / .stop): a pre-roll ("@s03-14") only shapes the
 *    move, a later shot's rows can never show in the shot before (C-3).
 *  - SHOT ANCHORS are the outline's ids without the "v3_" prefix: @s01 .. @s24 with @s16a / @s16b (the resolver also
 *    accepts "v3_s07"). If the generated shots.ts RENUMBERS the shots (s01-s25), every @ anchor from s16b on is one
 *    shot early: nothing reports that, so check the storyboard's shot labels. Word cues are safe either way.
 *  - WORD KEYS count through the whole film in order ("finger#3" = "...and the boy's finger saves it"). The phone's
 *    replay "What's a finger gonna do?" (v3_r01) is assumed to be IN the shot lines as a tourist line: if it is not,
 *    "what's#2" / "do#2" are reported missing (drop that row) and nothing else moves (later rows avoid counted words
 *    that the replay shifts).
 *  - What each SET gives per shot: `aim` = what is pointed at (s01 / s24: the suitcase behind the passing door glass,
 *    as it moves; s03: the far green lamp; s04: the cab glass; s06: the speedometer; s08: the suitcase / its handle;
 *    s10, s16b: his own phone; s11: the handle; s13: the vending machine; s15: the lens = the suitcase; s17 / s19: the
 *    button / the lamp; s21: the dark door lamp), `look` = who is looked at (the kid for the tourist, the tourist for
 *    the kid), and for s05 the hook's reach (footReach) + the suitcase on hookAt(t). */
/** frame 0 / s24: how far (head heights) the tourist's fingertip stops SHORT of the suitcase's handle (S-15) */
const F0_GAP = 0.3;
export const BEATS_V3: Beat[] = [
  // ================= THE DRIVER (seated; restL = the T-handle)
  // s03: the glove is ~40 % up on the cut, full stretch 22 f later, on the far green lamp; "Signal..." ear "...green!" hold
  { who: "driver", m: "call", name: "signal", status: "green", rise: "@s03-14", riseMove: 32, stretch: 4, lensFrom: "signal-1", lensAim: [-0.55, -0.3], lensHs: 1.12, earHand: "point" },   // (dirFrom/dirAim [-1.0, -1.15] = the profile point up-left: on the current s03b lens his pointing shoulder is at the left edge and that arm leaves the frame; switch to it when the lens is reframed)   // s03b: from the cut the point comes at the lens
  // s03b (Block 13, his FACE): after the snap a calm, quietly satisfied hold (bright eyes, the corners of the mouth up a
  // touch, brows level); the face change brings the one half-blink, AFTER the call; a tiny nod
  { who: "driver", m: "nod", at: "green+9", amt: 0.6 }, { who: "driver", m: "lap", at: "signal-1", until: "@s04" },   // s03b: the left hand off the T-handle (it crossed his chest under the pointing arm)   // (stretch: the fingertip lands beside the lamp for any lens drift)
  // s06: the SILENT call at the speedometer under "So he checks with a finger and a shout": point on "checks", snap on "shout"
  { who: "driver", m: "call", name: "checks", status: "shout#1" },
  // s21: a 1 s hold: the glove already straight at the dark door lamp, eyes on it, he says nothing ("Doors... closed!"
  // is heard over s22 with him off screen: no call is played on his card)
  { who: "driver", m: "point", at: "@s21-24", until: "@s21.end+12", still: true, stretch: 3 },

  // ================= THE KID (aim = what the driver points at in the cab shots, the SUITCASE everywhere else)
  { who: "kid", m: "point", at: "@s01-20", until: "@s01.end", hs: 1.3 },                           // frame 0: his hand in the passing door window
  { who: "kid", m: "point", at: "@s04+2", until: "@s04.end", still: true, hs: 1.2, hy: 1.3 },  // s04: ONE finger on the glass at his chest height, held (at his face it read as a finger at his nose / a rude finger)...
  { who: "kid", m: "look", at: "@s04+8", until: "@s04.end", to: "look", head: 6 },                 // ...looking up at the laughing tourist
  { who: "kid", m: "call", name: "checks", status: "shout#1", style: "kid" },                      // s06: his FIRST full copy, a beat late
  { who: "kid", m: "capDrop", at: "finger#2+3", hold: 10, left: true },                            // the brake jolt drops the cap; the other hand's finger pushes it up
  { who: "kid", m: "look", at: "finger#2+22", until: "finger#2+34", to: "down", head: 5 },         // a glance down at the suitcase, still pointing
  { who: "kid", m: "point", at: "@s08-3", until: "saves+12", move: 4, hs: 1.4, stretch: 1.3 },                   // s08: the full snap point at the suitcase
  { who: "kid", m: "face", at: "@s08-3", until: "saves", expr: "bright", browUp: 5 },
  { who: "kid", m: "nod", at: "suitcase#2.end+2", amt: 1.4 },                                      // "Bad suitcase." : one firm nod
  { who: "kid", m: "frown", at: "@s10+4", until: "@s10.end" }, { who: "kid", m: "look", at: "@s10", until: "@s10.end", to: "look" },
  { who: "kid", m: "look", at: "@s12", until: "it#2", to: "aim", head: 6 }, { who: "kid", m: "look", at: "stays", until: "@s12.end", to: "look", head: 6 },   // the bag, then his back
  { who: "kid", m: "face", at: "@s12", until: "@s12.end", expr: "worriedB" },
  { who: "kid", m: "urgent", at: "@s14+2", until: "@s15+30", shut: true }, { who: "kid", m: "point", at: "@s15+26", until: "@s15.end", still: true, hs: 1.3, stretch: 1.7 },                         // s14-s15: the URGENT point, eyebrows up, mouth SHUT
  { who: "kid", m: "look", at: "@s16b+50", until: "@s16b.end", to: "up", head: 5 },                // s16b: he looks up at the departure melody
  { who: "kid", m: "look", at: "@s18", until: "@s18+12", to: "aim", head: 6 }, { who: "kid", m: "look", at: "@s18+14", until: "@s18.end", to: "look", head: 6 },
  { who: "kid", m: "point", at: "@s20+5", until: "@s20.end", move: 9, hs: 2.0, stretch: 1.3 },   // (Block 15: the arm was CUT by his card's edge and stopped at the tourist's back: wider kid canvas (member.ts) + a long reach: the finger lands ON the suitcase)                   // s20: the arm comes up once more (14 f) and holds, mouth shut
  { who: "kid", m: "call", name: "bag#2", status: "check#2", style: "kid", late: 0, until: "check#2.end+3" },   // s23: "Bag... check!"
  { who: "kid", m: "capPush", at: "check#2.end+3" },                                               // then the pointing hand shoves his cap up (13 f), chin up...
  { who: "kid", m: "proud", at: "check#2.end+6", until: "@s23.end", hips: false },
  { who: "kid", m: "point", at: "check#2.end+18", until: "@s24.end", hs: 1.3 },                    // ...and he points again (still pointing in s24's window)

  // ================= THE BOY'S MUM (beside him in every shot he is in; her base state does most of it: eyes on her
  // boy = the set's `look`, a hand on him = the set's `restR`). The set's `aim` for her: the suitcase (s08, s12 until
  // "stays"), then the tourist's back (s12 from "stays")
  { who: "kid_mum", m: "face", at: "checks", until: "@s06.end", expr: "content" },                 // s06: she watches him copy the driver
  { who: "kid_mum", m: "look", at: "@s08+2", until: "saves+10", to: "aim", head: 6 }, { who: "kid_mum", m: "take", at: "finger#3+3", amt: 0.5 },   // s08: the bag at the gap
  { who: "kid_mum", m: "face", at: "finger#3+3", until: "saves+8", expr: "worriedB" }, { who: "kid_mum", m: "face", at: "saves+8", until: "@s08.end", expr: "content" },
  { who: "kid_mum", m: "look", at: "@s12+4", until: "@s12.end", to: "aim", head: 6 },              // s12: the bag, then the tourist's back (the set moves her aim)...
  { who: "kid_mum", m: "face", at: "stays+6", until: "@s12.end", expr: "content" },               // ...and she smiles: its owner is right there
  { who: "kid_mum", m: "face", at: "check#2", until: "@s23.end", expr: "brightGrin" }, { who: "kid_mum", m: "nod", at: "check#2.end+2", amt: 0.8 },   // s23: proud of him

  // ================= THE LAB VOLUNTEER (soft behind the jars; seated; aim = the button in s17, the lamp in s19)
  { who: "volunteer", m: "press", at: "@s17+4", until: "looking.end", per: 5 },                    // she only LOOKS and presses, a fast run
  { who: "volunteer", m: "call", name: "pointed", status: "loud", style: "plain", rest: "belly" }, // point, hand by the ear, snap (the bubble pops on the snap: beatWin)
  { who: "volunteer", m: "face", at: "pointed-6", until: "loud.end+6", expr: "brightO", mouth: "vA" },
  { who: "volunteer", m: "nod", at: "one", amt: 1.3 }, { who: "volunteer", m: "face", at: "one", until: "@s19.end", expr: "proudB" },

  // ================= THE TOURIST (films with his LEFT hand; the free hand acts)
  // s01 = FRAME 0: the stunned face; the straight arm (the end of a real snap) lands on frame 2 at the suitcase behind
  // the door glass and follows it (the set moves `aim`); on "He (is not)" the blank face turns to the lens; one slow blink
  // S-15 (2026-11-20): his LEFT arm points ACROSS HIS CHEST (it covers the NEW YORK print, SCRIPT 1.1; from this lens the
  // bag is on his right side, so the right arm could never cross), a straight ruler from the near shoulder, the tip
  // stopping just SHORT of the suitcase (gap) so it leads the eye to the yellow; the phone hangs forgotten in his RIGHT hand
  { who: "tourist", m: "film", at: "@s01", until: "@s01.end", low: true, on: true, hand: "R" },
  { who: "tourist", m: "face", at: "@s01-30", until: "@s01+22", expr: "stare", browUp: 9, mouth: "o", still: true }, { who: "tourist", m: "face", at: "@s01+22", until: "he#1", expr: "stare", browUp: 4, still: true },
  { who: "tourist", m: "look", at: "@s01-30", until: "he#1-2", to: "aim", head: 8 },
  { who: "tourist", m: "stun", at: "he#1-2", until: "@s01.end", blink: "he#1+8", hands: false, take: 0 },
  { who: "tourist", m: "point", at: "@s01-5", until: "@s01.end", move: 6, hs: 1.05, noGaze: true, stretch: 1.3, left: true, gap: F0_GAP },   // the fingertip just short of the suitcase behind the glass
  // s02: his BACK to the cab glass, roaring with laughter into his own phone at chest height; on "at a" the phone swings to the glass
  { who: "tourist", m: "film", at: "@s02", until: "@s06.end", on: true },     // (on: up from the first frame; nothing leaks into frame 0)
  { who: "tourist", m: "look", at: "@s02", until: "at#1", to: "phone", head: 9 },       // the selfie: his eyes on his own phone (C-6)
  { who: "tourist", m: "laugh", at: "@s02", until: "@s02.end", hand: false },
  // s04: "He's pointing at nothing!": the laugh, a jab toward the glass that stops short of it
  { who: "tourist", m: "laugh", at: "@s04", until: "nothing.end+6", hand: false }, { who: "tourist", m: "jab", at: "pointing#1-3", until: "nothing.end+4" },
  // s05: eyes on his phone; the sneaker hooks the creeping suitcase's wheel without a look (the set: footReach + hookAt)
  { who: "tourist", m: "look", at: "@s06", until: "@s06.end", to: "phone" }, { who: "tourist", m: "hook", at: "behind-4", leg: "R" },
  // s05 (lead 2026-11-20): the joke is that he NEVER looks: the phone LOW in front of his belly, his head bowed, eyes DOWN
  // on it for the whole shot while the foot finds the wheel (a raw gaze: down and a little to the phone's side)
  { who: "tourist", m: "film", at: "@s05", until: "@s05.end", on: true, lift: -0.75, out: -34, tilt: 8 },
  { who: "tourist", m: "look", at: "@s05", until: "@s05.end", to: "phoneLow", head: 12 }, { who: "tourist", m: "face", at: "@s05", until: "@s05.end", expr: "readDown", mouth: "smileWide" },   // eyes DOWN on the screen (a pupil shift alone read as "at the lens"), grinning at his clip
  // s07-s08: phone down, back to the bag; his eyes go to the boy, run down his arm and POP; the lunge and the catch on "saves"; the wag
  { who: "tourist", m: "look", at: "@s08+4", until: "finger#3", to: "look", head: 6 }, { who: "tourist", m: "take", at: "finger#3-1" },
  { who: "tourist", m: "lunge", at: "saves-8", until: "it#1.end+12" },
  { who: "tourist", m: "wag", at: "bad-5", until: "suitcase#2.end+10" },
  // s10: "What's a finger gonna do?" to his own phone camera: the phone at eye height, the index wiggling at it (aim = the phone)
  { who: "tourist", m: "film", at: "@s10", until: "@s10.end", lift: 0.2, out: 20, tilt: -6, on: true }, { who: "tourist", m: "look", at: "@s10", until: "@s10.end", to: "phone" },
  { who: "tourist", m: "wag", at: "what's#1-4", until: "do#1.end+6", hip: false }, { who: "tourist", m: "face", at: "@s10", until: "@s10.end", expr: "brightGrin" },
  // s11: wheels it to the doorway, "Stay." (two pats on the handle), "Be right back." (the skip out, phone up)
  { who: "tourist", m: "pat", at: "stay#1-4", n: 2 }, { who: "tourist", m: "film", at: "be", until: "@s12.end" }, { who: "tourist", m: "hop", at: "right#1" },
  { who: "tourist", m: "walk", at: "right#1+12", until: "@s11.end", gait: "skip" },
  // s13: ALREADY stiff as a guard facing his own phone (no thumbs-up): the mock call in the true rhythm; his grin breaks through
  { who: "tourist", m: "film", at: "@s13", until: "@s13.end", lift: 0.12, out: 26, tilt: -8, on: true },   // OUT in front at chest-to-chin height (C-7: beside the ear it read as a phone call)
  { who: "tourist", m: "call", name: "vending", status: "check#1", style: "mock", rise: "@s13+2", until: "@s13.end" },
  { who: "tourist", m: "face", at: "check#1.end+3", until: "@s13.end", expr: "brightGrin" },
  // s15: the whole head turns (12 f); his eyes land ON the suitcase (the lens) for 0.7 s and see nothing; the grin, a
  // double point at the boy (no recoil), "This kid gets it!", back to his phone
  { who: "tourist", m: "look", at: "@s15", until: "@s15+11", to: "lens", head: 4 }, { who: "tourist", m: "look", at: "@s15+12", until: "@s15+33", to: [-1.05, 1.0], head: 7 }, { who: "tourist", m: "face", at: "@s15", until: "@s15+33", expr: "stare", browUp: 2 },   // a calm, empty glance (no grin yet): he sees nothing
  { who: "tourist", m: "guns", at: "this-8", until: "it#3.end+4", recoil: false },
  // s16a: phone up, silent, absorbed in his own clip; s16b: the phone replays his line: he wiggles his finger along, delighted
  { who: "tourist", m: "film", at: "it#3.end+6", until: "@s23.end", tilt: -20, rec: false, out: 24 }, { who: "tourist", m: "look", at: "it#3.end+10", until: "check#2-2", to: "phone" },
  { who: "tourist", m: "face", at: "@s16a", until: "@s16a.end", expr: "content" },
  { who: "tourist", m: "wag", at: "what's#2-4", until: "do#2.end+8", hip: false },                           // (the replay is the PHONE's voice in timing.ts: it never moves his mouth)
  { who: "tourist", m: "face", at: "@s16b", until: "@s16b.end", expr: "brightGrin" },
  // s18, s20, s22: his back to the bag, shoulders shaking at his phone (the helpless giggle)
  { who: "tourist", m: "laugh", at: "@s18", until: "check#2-4", amt: 0.5, hand: false },
  // s23: his head starts to turn ON "check!"; the grin drains
  { who: "tourist", m: "look", at: "check#2", until: "@s23.end", to: "aim", head: 9 }, { who: "tourist", m: "stun", at: "check#2+13", until: "@s23.end", lens: false },
  // s24: his face follows the window; the phone hand sinks; "Bag..." the arm comes up (18 f), the hand back by his ear,
  // "gone." the arm sags to 60 % (12 f) then locks out (6 f): the film ends 2 f before it lands
  { who: "tourist", m: "deadpan", at: "@s24", until: "@s24.end+30" }, { who: "tourist", m: "face", at: "@s24.end-7", until: "@s24.end+30", expr: "stare", browUp: 9, mouth: "o", still: true }, { who: "tourist", m: "look", at: "@s24", until: "@s24.end+30", to: "aim", head: 8 },
  { who: "tourist", m: "film", at: "@s24", until: "@s24.end+30", low: true, on: true, hand: "R" },   // the phone hand sinks (the RIGHT hand: frame 0's)
  { who: "tourist", m: "call", name: "bag#3", status: "gone", style: "plain", limp: true, riseMove: 14, until: "@s24.end+30", stretch: 1.3, left: true, gap: F0_GAP, ear: [1.4, 1.7], earHand: "fist" },   // = frame 0's arm (the loop)

  // ================= LIFE (Block 14, the preview's life gate: s16a 0.010, s13 0.03, s12 0.05, s09 0.07): at least three
  // things moving at any moment, nobody frozen for more than ~12 frames. `alive` adds weight shifts / head drift / lean
  // on top of whatever plays; the rows below also give eyelines that change
  // s09 (the plant, behind the door glass): all three live; the boy looks from the bag to the man and back; mum glances
  { who: "tourist", m: "alive", at: "@s09", until: "@s09.end", amp: 1.1 }, { who: "kid", m: "alive", at: "@s09", until: "@s09.end", amp: 1 }, { who: "kid_mum", m: "alive", at: "@s09", until: "@s09.end", amp: 0.8 },
  { who: "kid", m: "look", at: "@s09+6", until: "@s09+30", to: "aim", head: 6 }, { who: "kid", m: "look", at: "@s09+36", until: "@s09+62", to: "look", head: 6 }, { who: "kid", m: "look", at: "@s09+68", until: "@s09.end", to: "aim", head: 6 },
  { who: "kid_mum", m: "look", at: "@s09+20", until: "@s09+44", to: "aim", head: 5 },
  { who: "tourist", m: "laugh", at: "@s09+30", until: "@s09+58", amt: 0.45, hand: false },
  // s12 (the bag alone in the doorway): the boy and mum live; he at the vending machines too
  { who: "kid", m: "alive", at: "@s12", until: "@s12.end", amp: 1 }, { who: "kid_mum", m: "alive", at: "@s12", until: "@s12.end", amp: 0.8 }, { who: "tourist", m: "alive", at: "@s12", until: "@s12.end", amp: 1.2 },
  { who: "kid", m: "hop", at: "@s12+40", h: 0.05 }, { who: "kid_mum", m: "nod", at: "stays+10", amt: 0.7 },
  // s13: everyone behind him lives while he mocks (the mock call itself now swings: moves.ts mCall "mock")
  { who: "tourist", m: "alive", at: "@s13", until: "@s13.end", amp: 1.2 }, { who: "kid", m: "alive", at: "@s13", until: "@s13.end", amp: 1 }, { who: "kid_mum", m: "alive", at: "@s13", until: "@s13.end", amp: 0.8 },
  { who: "kid", m: "look", at: "@s13+4", until: "@s13+40", to: "look", head: 6 }, { who: "kid", m: "look", at: "@s13+44", until: "@s13.end", to: "aim", head: 6 },
  // s16a "You see, his eyes looked right at it. His mind was on his phone.": HIM, glued to the phone: giggles that move his
  // whole body, the thumb scrolling, a head shake, weight shifts; the boy looks from the bag to him and back; mum glances
  { who: "tourist", m: "alive", at: "@s16a", until: "@s16b.end", amp: 1.3 },
  { who: "tourist", m: "film", at: "@s16a", until: "@s16b.end", on: true, out: -58, lift: -0.65, tilt: -4, rec: false }, { who: "tourist", m: "look", at: "@s16a", until: "@s16b.end", to: [0.3, 1.1], head: 7 },   // the phone at CHEST height in front of him (at face height it hid his face), his eyes down on its screen
  { who: "tourist", m: "laugh", at: "@s16a+6", until: "@s16a+36", amt: 0.65, hand: false, open: true }, { who: "tourist", m: "shake", at: "@s16a+40" },
  { who: "tourist", m: "scroll", at: "@s16a+50", until: "@s16a+92" }, { who: "tourist", m: "laugh", at: "@s16a+92", until: "@s16a.end", amt: 0.6, hand: false, open: true },
  { who: "kid", m: "alive", at: "@s16a", until: "@s16b.end", amp: 1 }, { who: "kid_mum", m: "alive", at: "@s16a", until: "@s16b.end", amp: 0.8 },
  { who: "kid", m: "look", at: "@s16a", until: "@s16a+28", to: "aim", head: 6 }, { who: "kid", m: "look", at: "@s16a+32", until: "@s16a+62", to: "look", head: 6 },
  { who: "kid", m: "look", at: "@s16a+66", until: "@s16a+92", to: "aim", head: 6 }, { who: "kid", m: "look", at: "@s16a+96", until: "@s16a.end", to: "look", head: 6 },
  { who: "kid", m: "hop", at: "@s16a+64", h: 0.05 },
  { who: "kid_mum", m: "look", at: "@s16a+40", until: "@s16a+64", to: "aim", head: 5 },
];

/** the table the film uses */
export const BEATS: Beat[] = BEATS_V3;   // flipped by the DIRECTOR 2026-11-19 23:15: shots.ts carries script v3 (ids s01 .. s24 with s16a / s16b)

// THE v4 BEAT TABLE (owner CAST, 2026-11-20): the true story, script v4 (sound/pointing/SCRIPT_v4.md, 22 lines), cued on
// the v4 clock (v4/resolver.ts R_V4: word keys like "go#3", "clear#2"; shot anchors "@v05", "@v18.end"). HOLD, THEN SNAP:
// every pose holds, every change is a 2-3 f snap; mouths move only on a character's own shout (face rows with one open
// shape held, no lip flapping); nothing crosses a face; no point at the lens. What each SET gives per shot: `aim` (the
// button / the lamp / the signal / the board), `look` (what the eyes are on), `restR` / `restL` (a lever, the desk).
// Word keys of the script: "go#1".."go#7" (L02), "signal#1" + "clear#1" (D, L12), "signal#2" + "clear#2" (H, L14),
// "clear#3" (C, L16).
import type { Beat } from "./moves";

export const BEATS_V4: Beat[] = [
  // ================= THE YOUNG WOMAN (the face of the hook; seated at the big button; aim = the BUTTON, then the LAMP in v18 /
  // v36; look = the lamp)
  // v01 FRAME 0: the finger ready over the button, eyes wide up on the lamp
  { who: "lab_woman", m: "hover", at: "@v01", until: "go#1" },
  { who: "lab_woman", m: "look", at: "@v01", until: "@v05.end", to: "look", head: 4 },
  { who: "lab_woman", m: "face", at: "@v01", until: "go#1", expr: "stare", browUp: 6, still: true },
  // v03: the seven Go's: a crisp press on each of the first six (the seventh is the red, v04)
  { who: "lab_woman", m: "tap", at: "go#1" }, { who: "lab_woman", m: "hover", at: "go#1+5", until: "go#2" },
  { who: "lab_woman", m: "tap", at: "go#2" }, { who: "lab_woman", m: "hover", at: "go#2+5", until: "go#3" },
  { who: "lab_woman", m: "tap", at: "go#3" }, { who: "lab_woman", m: "hover", at: "go#3+5", until: "go#4" },
  { who: "lab_woman", m: "tap", at: "go#4" }, { who: "lab_woman", m: "hover", at: "go#4+5", until: "go#5" },
  { who: "lab_woman", m: "tap", at: "go#5" }, { who: "lab_woman", m: "hover", at: "go#5+5", until: "go#6" },
  { who: "lab_woman", m: "tap", at: "go#6" }, { who: "lab_woman", m: "hover", at: "go#6+5", until: "go#7" },
  { who: "lab_woman", m: "face", at: "go#1", until: "go#7", expr: "focusB", still: true },
  // v04 RED: the hand comes DOWN anyway and stays; v05: frozen, shocked, staring up at the red lamp
  { who: "lab_woman", m: "down", at: "go#7", until: "@v05.end" },
  { who: "lab_woman", m: "face", at: "go#7+3", until: "@v05.end", expr: "stare", browUp: 9, mouth: "O", still: true },
  // v18 (L11): she points side-on at the red lamp and SAYS it (one open mouth held), the other hand off the button; pleased
  { who: "lab_woman", m: "point", at: "@v18", until: "@v18.end", still: true },
  { who: "lab_woman", m: "face", at: "@v18", until: "@v18+22", expr: "brightO", mouth: "y2", still: true },
  { who: "lab_woman", m: "face", at: "@v18+22", until: "@v18.end", expr: "brightGrin", still: true },
  // v36 (L22, the loop): exactly frame 0's picture, but her arm already UP pointing at the lamp and her mouth open
  { who: "lab_woman", m: "point", at: "@v36-4", until: "@v36.end+30", still: true },
  { who: "lab_woman", m: "face", at: "@v36", until: "@v36.end+30", expr: "stare", browUp: 6, mouth: "O", still: true },

  // ================= THE RESEARCHER (aim = the big switch in v07)
  { who: "researcher_v4", m: "point", at: "@v07", until: "@v07.end", reach: true, still: true },
  { who: "researcher_v4", m: "face", at: "@v07", until: "@v07.end", expr: "brightGrin", still: true },
  { who: "researcher_v4", m: "face", at: "@v11+10", until: "@v11.end", expr: "jawDrop", still: true },

  // ================= TODAY'S DRIVER (cab; aim = the green signal ahead, side-on): the crisp point on "point", held; the
  // call: hand to the chest fist on "Signal", SNAP on "clear!" (his own shout: one open mouth held)
  { who: "driver", m: "point", at: "@v20+2", until: "signal#1-2", still: true },
  { who: "driver", m: "call", name: "signal#1", status: "clear#1", out: "@v20+2", until: "clear#1.end+20" },
  { who: "driver", m: "face", at: "signal#1", until: "clear#1.end+4", expr: "bright", mouth: "y0", still: true },
  { who: "kid", m: "call", name: "signal#1", status: "clear#1", style: "kid", until: "@v21.end" },   // v21: the kid copies, 6 f late

  // ================= HORI (steam cab; aim = the signal ahead): v23 peering at the little round window; v24 he turns
  // (the set's yaw) and SHOUTS "Signal clear!" (one open mouth); v30 nose to the glass again
  { who: "hori", m: "peer", at: "@v23", until: "@v24" },
  { who: "hori", m: "face", at: "signal#2", until: "clear#2.end+4", expr: "bright", mouth: "y1", still: true }, { who: "hori", m: "nod", at: "clear#2", amt: 1.1 },
  { who: "hori", m: "alive", at: "@v24", until: "@v29.end", amp: 0.6 },
  { who: "hori", m: "peer", at: "@v30", until: "@v30.end+20" },

  // ================= THE COAL MAN (aim = the signal post in v26): mid-shovel (the set holds the shovel prop through
  // CastOpts.act), he leans out and looks, then BELLOWS "Clear!" with a huge grin
  { who: "fireman", m: "alive", at: "@v25", until: "@v27.end", amp: 0.7 },
  { who: "fireman", m: "look", at: "@v26", until: "clear#3", to: "aim", head: 8 },
  { who: "fireman", m: "face", at: "clear#3-2", until: "clear#3.end+14", expr: "brightGrin", mouth: "y1", still: true }, { who: "fireman", m: "nod", at: "clear#3", amt: 1.3 },

  // ================= THE BOSS (dark suit, bowler, notebook): delighted, beaming, nodding behind Hori
  { who: "official", m: "face", at: "@v28", until: "@v30.end+20", expr: "delightB", still: true },
  { who: "official", m: "alive", at: "@v28", until: "@v30.end+20", amp: 0.6 },
  { who: "official", m: "nod", at: "@v29+4", amt: 1 }, { who: "official", m: "nod", at: "@v30+10", amt: 0.9 }, { who: "official", m: "nod", at: "@v30+40", amt: 0.9 },

  // ================= THE NEW YORK CONDUCTOR (cab window; aim = the striped board): side-on point, deadpan; v35 the one
  // swap to a grin
  { who: "ny_conductor", m: "point", at: "@v32+4", until: "@v32.end", still: true },
  { who: "ny_conductor", m: "face", at: "@v31", until: "@v35+20", expr: "deadpan", still: true },
  { who: "ny_conductor", m: "point", at: "@v35", until: "@v35.end", still: true },
  { who: "ny_conductor", m: "face", at: "@v35+20", until: "@v35.end", expr: "brightGrin", still: true },

  // ================= THE TWO NEW YORKERS: the sign held up (both arms raised to the sign's edges: the set's restL / restR)
  { who: "prankA", m: "face", at: "@v33", until: "@v35.end", expr: "brightGrin", still: true },
  { who: "prankB", m: "face", at: "@v33", until: "@v35.end", expr: "polite", still: true },

  // ================= THE PERSON IN PYJAMAS at the open fridge (aim / look = the cereal box inside it): a blank stare
  { who: "pyjamas", m: "look", at: "@v17", until: "@v17.end", to: "aim", head: 4 },
  { who: "pyjamas", m: "face", at: "@v17", until: "@v17.end", expr: "blank", still: true },
];

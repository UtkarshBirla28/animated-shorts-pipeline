# DIRECTOR tool (pointing v4): writes briefs/v3/pointing/SHOT_TABLE_v4.md from the v4 clock (probe_v4.mjs json) + the
# staging below (people and sizes, the action as held poses, three movers, the camera glide and its rest). Re-run after
# every script / voice change: the times, words and captions follow the clock; the staging stays.
#   node briefs/v3/pointing/director/probe_v4.mjs json briefs/v3/pointing/director/timeline_v4.json
#   python briefs/v3/pointing/director/make_shot_table_v4.py
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
TL = json.load(open(os.path.join(HERE, "timeline_v4.json"), encoding="utf-8"))
SCRIPT = os.path.join(ROOT, "studio", "src", "videos3", "pointing", "v4", "script.ts")
LINES = [json.loads(l.strip().rstrip(",")) for l in open(SCRIPT, encoding="utf-8") if l.startswith("  {")]

# people: S = small (head <= 1/8 of the frame height), M = medium (head 1/8-1/4), C = a chosen close-up
# poses: "a | b | c" (printed "a -> b -> c") = held poses, each SNAPS (3-6 f) on the cue in brackets and HOLDS; no tweened reaches
# movers: at least three things that move that are not the main figure
# camera: one glide (what, where to), then the REST (frames) with no camera motion
ST = {
 # ---- THE OPENING: the trap played on the viewer (LAB + CAST)
 "v01": ("the young woman M (head ~1/5), 3/4 front, seated at ONE big button; the big signal lamp (dark) fills the top third; her face, the lamp and the button all above 64 %", "finger ready over the button, eyes wide on the lamp, still (held from frame 0: no settling move)", "a researcher S behind her glass writing; a wall clock ticking; a row of small lamps on the far wall blinking idly", "a slow push (0.3 m) toward her and the lamp; rest 15 f. FRAME 0 must read in 0.25 s: lamp, face, button"),
 "v02": ("the lamp big (top half), her face M below it looking up", "the lamp snaps GREEN [green#1] | her eyes widen, finger lifts a hair | holds", "the green light spilling over her face and the room; the far lamps; the researcher looking up", "NO move (a cut-in); the whole shot rests. The first picture change at ~1.5 s"),
 "v03": ("her face + hand + button M, the lamp at the top edge", "press on every Go [go#1..go#6], each a 3-f snap, the hand back up between; her face surer each time (the flashes are rules on the Go words)", "the lamp flashing green on each Go; the beep light on the board; the researcher's pen ticking", "a PUSH-IN over the whole run (medium to her face + the button, ~0.6 %/f, building pressure); rest 6 f before the cut"),
 "v04": ("her face + hand C, the lamp RED", "the lamp RED on the cut [go#7] | her hand comes down anyway (already moving: 2-f snap) | frozen through the held beat (0.5 s silence)", "red light flooding the whole room (a pulse); the far lamps going red; the researcher's head snapping up", "HARD CUT, NO move; the whole shot rests (the beat)"),
 "v05": ("her frozen face C, hand on the button, the red lamp above", "frozen, staring up at the red lamp [did#1] | a big red X pops beside her [she#1] | holds", "the X popping (a 4-f scale snap); the red lamp pulsing; the researcher's pen stopping", "NO move; rest = the whole shot. Captions: 'Did you tap?' then 'She did.' as its own beat"),
 # ---- the real trap
 "v06": ("24 volunteers S in two rows at button boards; the board '1994' BIG and readable on the wall, in frame from the first frame (the only date in the film: on screen >= 1 s; NOT spoken)", "everyone ready at their buttons (held)", "lamps blinking along the rows; a clock; a second researcher walking the aisle", "lab wide, a slow crane down to eye level; rest 20 f"),
 "v07": ("the researcher M, grinning, his hand on a big switch; the '1994' board readable behind him", "hand on the switch | flips it [trap#1] | grins (held)", "the big switch lamp lighting; the rows behind him; a fan turning", "a short push toward the switch; rest 15 f"),
 "v08": ("the counter M on the wall, the first row S below", "the counter flips 98, 99, 100 [hundred#1] (each flip a snap)", "the counter; the lamps blinking in rhythm; the volunteers pressing", "NO move until 100, then rest (the counter is the motion)"),
 "v09": ("the whole room S, all red", "everyone freezes in red [red#1] (one held pose)", "the red light pulsing once; the counter frozen at 101; a researcher turning his head", "HARD CUT, NO move; the whole shot rests"),
 "v10": ("the first row S-M (twelve) at their button boards, side-on", "twelve watching their lamps, bored (held) | the lamps go red [red#1 carries over] (held)", "the lamps blinking along the row; the researcher S walking behind; the wall clock", "a slow slide along the row; rest 20 f"),
 "v10b": ("CLOSER on the same row: five or six volunteers M at their buttons, the board '5 OF 12' S-M on the wall", "five hands SLAM down [five#1] (2-f snaps, one after another, 2 f apart) | five red X's pop | five faces freeze (held). Board flips to 5 OF 12 [anyway#1]", "the X's popping; the board flipping; the other volunteers not moving; the red lamps pulsing", "the v10 row from 1 m closer (a cut-in), NO glide; rest = the whole shot"),
 # (v11 was cut with line 6 at the 15:20 length cut; ids are not renumbered)
 "v12": ("the second row S-M, the researcher M holding up a card with a pointing hand", "researcher raises the card [others#1] | the row looks at it (held)", "the card; the lamps; the clock", "a slow slide along the second row; rest 15 f"),
 "v13": ("the second row S-M", "a WAVE: one after another they point side-on at their lamps and call [point#1] (each a 3-f snap, then held)", "twelve arms snapping in sequence; the lamps; the researcher's pen", "along the row, a slow truck with the wave; rest 15 f"),
 "v14": ("twelve hands S at the buttons + the red lamps", "RED [not#1]: all point at it, mouths open | twelve untouched buttons (held). Board 0 OF 12", "the board flipping; the red lamps pulsing; the researcher's eyebrows up", "top-down on the board row, NO move; rest = the whole shot"),
 "v15": ("a bored volunteer M, front 3/4, the red lamp in frame", "stares straight at the red lamp, eyes open, blank (held)", "the lamp glowing; people behind him; a wall clock", "a slow push toward his face; rest 20 f"),
 "v16": ("his hand M on the button, the red lamp", "the hand taps the button by itself [hand#1] | taps again | his face at the frame edge notices too late [brain#1]", "the lamp; the button light; his other hand drumming", "close on the hand, a small slide; rest 15 f"),
 "v17": ("the person in pyjamas M at the open fridge", "staring at the cereal box inside the fridge [cereal#1] | slow blink | holds", "the fridge light; steam from a kettle; a cat walking past; a cupboard door swinging", "kitchen wide, a slow push; rest 20 f"),
 "v18": ("the young woman M from the start, the red lamp, the button", "points side-on at the red lamp and says it [pointing#1] | her other hand off the button (held) | a green tick pops [wait#1]", "the lamp; the tick popping; the researcher nodding behind the glass", "the frame-0 lens moved 0.4 m to the side (same place, new angle), a short glide; rest 20 f"),
 # ---- today (TRAIN)
 "v19": ("the modern train S-M at a sunny platform; commuters S", "the train glides in and stops (no people acting)", "commuters walking; a pigeon; a departure board ticking; the train", "STATION's platform wide, a slow pan with the train; rest 20 f once it stops"),
 "v20": ("today's driver M (cap, white gloves), side-on, the green signal S ahead", "hands on the controls | the point snaps side-on at the signal [point#2] | fist by the chin [shout#1] (held)", "the track and landscape rushing ahead; the speedo needle; a passing mast shadow", "inside the cab beside him, a short push; rest 20 f"),
 "v21": ("the kid M at the front window of the car, commuters S behind; the driver S through the glass", "the kid copies the point, mouth open [signal#1] | holds", "standing commuters swaying; straps swinging; the landscape in the side windows", "from the aisle, NO move (the shout is short); rest = the whole shot"),
 # ---- the steam story (TRAIN)
 "v22": ("the steam engine S-M, the driver S at the cab", "HARD CUT on 'But' [but#1]; none (the engine is the action)", "the rods and wheels; the smoke trail; birds lifting off the paddies; a farmer straightening up", "low beside the line, a tracking drift as it passes (TRAIN `event`); rest 18 f"),
 "v23": ("the driver M at the little round window, the signal far ahead", "leans forward, head out, brows scrunched, eyes open, searching (peer) [story#1] | holds", "steam rushing past; the paddies streaming; the semaphore swaying far ahead", "TRAIN `cabSide` (behind his shoulder, looking with him), a breath of push; rest 20 f"),
 "v23b": ("no people: HIS VIEW out of the little round (spectacle) window, the round frame M around it; the semaphore ahead a soft blur", "the blur breathes (soft -> a touch less soft -> soft again) [eyes#1]; the post stays a blur (held)", "the track sleepers streaming toward us; steam wisps across the glass; the paddies at the sides; the cab shaking", "NO glide (a held POV); a slight cab shake only (no push); rest = the whole shot. Never slit eyes, no disease look: only the blur"),
 "v24": ("the driver M, profile", "turns and shouts across the cab, mouth wide, hands on the controls (NOBODY in the steam cab points) [signal#2] | snaps CLEAR [clear#2] (held)", "the firebox glow; the gauge needle shaking; the country past the side opening", "inside the cab from the back, NO move (short); rest = the whole shot"),
 "v25": ("the driver M left, the coal man M right (two-shot)", "the driver shouts across [so#2] | the coal man mid-shovel freezes, looks up at him [signal#3] | holds", "the coal on the shovel; the fire glowing; the country past the openings", "TRAIN `twoShot`, a small push; rest 20 f"),
 "v26": ("the coal man M leaning out on the right, the semaphore S far ahead (arm lowered = clear)", "leans out [to#2] | LOOKS at the semaphore ahead (arm lowered = clear) BEFORE he shouts, both hands on the hand-rail (no hand near his face) [coal#1] | holds", "the smoke streaming back; the paddies; the signal post passing", "TRAIN `firemanOut`, a slow slide; rest 15 f"),
 "v27": ("the coal man M", "turns in, huge grin, CLEAR! [clear#3] (held through 'His')", "smoke; the fire glow; the driver's shoulder nodding at the frame edge", "the v26 lens 0.4 m closer (a cut-in), NO move; rest = the whole shot (about 1 s)"),
 "v28": ("the boss M (dark suit, bowler) in the back corner, the coal man S beside him, the driver's shoulder at the left edge", "squeezed in, delighted [boss#1] | nods [loved#1] (held)", "the fire glow; the coal shifting on the tender; the country past the opening", "TRAIN `boss` (from the front corner looking back), a small push; rest 20 f"),
 "v29": ("the boss M, notebook at his chest", "writes [made#1] | underlines RULE with a flourish [rule#2] | holds, smug", "the cab shaking; the page fluttering; steam wisps past the opening", "a slow push toward the notebook; rest 15 f"),
 "v30": ("the driver M front, nose near the glass; the boss S behind him", "the driver peers (held) | the boss beams and nods [knew#1] | both hold", "the blurry track ahead; the steam; the fire flicker on the boss", "from outside the round window looking in, NO move (a held picture); rest = the whole shot"),
 # ---- New York (STATION)
 "v31": ("the NY train S-M at the platform, the conductor S in the middle window", "the conductor leans out (held)", "commuters waiting; a pigeon; the tile wall lights; the train doors", "STATION's NY platform wide, a slow push; rest 20 f"),
 "v32": ("the conductor M leaning from the window, the striped board S-M on the wall", "looks [subway#1] | points at the board, held [point#3] | the doors open about 0.7 s after the point (a time offset: 'open' is no longer spoken)", "the doors sliding open; people stepping in; the tile wall", "from the platform, a slide to get the board and him in one frame; rest 20 f"),
 "v33": ("ONE young man M and ONE young woman M under the board, holding the sign edge-on; the conductor S", "step in under the board [two#1] | turn the sign up (held), grinning", "commuters walking past; the train; the board", "from the platform, a slow push; rest 20 f"),
 "v34": ("the sign C, their hands at its edges", "the sign faces us, big and steady (held) [point#4]", "the people behind out of focus walking; the train", "NO move; the sign is the picture; rest = the whole shot. The sign text is ON the sign, big, and also captioned"),
 "v35": ("the conductor M at his window, the sign M below the board", "points at it, deadpan [point#5] | then grins (held)", "the two holding the sign, giggling; people walking; the doors", "from the platform, NO move; rest = the whole shot"),
 # ---- the loop (LAB + CAST)
 "v36a": ("the big lamp (top half) DARK again, her face M below it looking up, finger ready over the button (= v02's lens)", "she sits up, eyes on the dark lamp [now#1] | finger ready over the button (held)", "the far lamps blinking; the researcher looking up behind the glass; the wall clock", "v02's cut-in lens, NO move; rest = the whole shot"),
 "v36": ("the young woman M at the button, the big lamp, exactly frame 0's lens", "her arm already up, pointing side-on at the lamp [this#2] | mouth open on 'say it' [point#6] (held to the last frame)", "the far lamps blinking; the researcher writing; the wall clock", "frame 0's lens and push, ending on frame 0's framing: the cut to frame 0 is a MATCH (same lens; the arm drops to 'finger ready'); rest 20 f"),
}

def fmt(f): return "%.2f" % (f / 30)
rows = ["# SHOT TABLE v4 (DIRECTOR): \"the trap\" (pointing v4), on the script after the 15:20 length cut",
        "",
        "GENERATED by `briefs/v3/pointing/director/make_shot_table_v4.py` from the v4 clock (" + TL["source"] + ") and the staging in that file.",
        "TOTAL %d f = %.2f s on %s. Clock notes: %s." % (TL["total"], TL["total"] / 30, TL["source"].split(" (")[0], "; ".join(TL["notes"]) or "none"),
        "Times are the PLAN until VOICE installs `v4/words.ts`; then every cut moves by itself (rules on words). The shot list itself",
        "is `studio/src/videos3/pointing/v4/shot_plan.ts`. Template rules and ownership: `briefs/v3/pointing/V4_STRUCTURE.md`.",
        "People: S = small (head <= 1/8 of the height), M = medium (1/8-1/4), C = the chosen close-up. Poses snap (3-6 f) on the cue",
        "in brackets and HOLD. Every shot: >= 3 movers, one camera glide, then a REST with no camera motion (film.ts enforces the rest:",
        "15-20 f, 8-10 f under 1.2 s; the movers keep living during the rest so it is not a dead hold). DRIFT = the director's push / pull on a still lens.",
        "Captions: the house band (y 1280-1440); keep all action above 64 % of the height.",
        "REAL VOICE: v10b (closer, on Five) and v36a (Now try again) are new. LOCKED Ricks-style text (evening): v08 on a#2, v19 on so#1, v22 hard cut on But, v23 on the#5, v26 on to#2, v32 on subway#1. 15:20 LENGTH CUT: line 6 is gone, so shot v11 is gone (ids NOT renumbered); v23b (the blurry signal, his view) is new, so",
        "v23 stays under 3.5 s on the real voice; v26 cuts on 'coal', v28 on 'boss'; v32's doors open on a time offset after the point.",
        "",
        "| shot | frames (s) | len | cut on | lines | set / owner | picture | people + sizes | held poses [cue] | movers (3+) | camera: glide, then rest | caption words |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|"]
for s in TL["shots"]:
    a, b = s["from"], s["to"]
    toks = [t for t in TL["toks"] if a <= round(t["s"] * 30) < b]
    lines = sorted({t["line"] for t in toks}, key=lambda x: int(re.sub(r"\D", "", x) or 0))
    st = tuple(x.replace(" | ", " -> ").replace("|", "/") for x in ST.get(s["id"], ("?", "?", "?", "?")))
    if s.get("freeze"): st = st[:3] + ("FREEZE: no camera motion at all (stillness is the picture). " + st[3],)
    elif s.get("drift"): st = st[:3] + (("DIRECTOR DRIFT %+.2f (%s %d %% of the lens distance, eased) on top, then the rest. " % (s["drift"], "push in" if s["drift"] > 0 else "pull out", abs(s["drift"]) * 100)) + st[3],)
    rows.append("| %s | %d-%d (%s-%s) | %.2f | %s | %s | %s / %s | %s | %s | %s | %s | %s | %s |" % (
        s["id"], a, b, fmt(a), fmt(b), (b - a) / 30, s["start"], ",".join(lines), s["set"], s["owner"], s["place"], st[0], st[1], st[2], st[3],
        " ".join(t["w"] for t in toks)))
rows += ["", "Owners: LAB v01-v18 + v10b + v36a + v36 (the lab, the kitchen v17; the opening v01-v05 FIRST; the loop match v36 -> v01 with CAST); "
         "TRAIN v19-v30 + v23b (platform arrival, cab, packed car, the steam engine + cab); STATION v31-v35 (New York); CAST every pose above; "
         "LOOK the vivid look in each set; SOUND the score + effects on every [cue] (the Go beeps on go#1..go#6, the red on go#7, then 0.5 s of silence).",
         "EVERYWHERE (fact check): no Japanese text, no logos, no brands on any sign, board, train, box or screen; the '1994' board is the only date; nobody in the steam cab points; the coal man looks at the semaphore before he shouts; one man and one woman hold the sign.",
         "Captions: the Go run has NO caption words (the lamp is the caption); 'She did.' is its own caption; the line-20 sign text is on the sign, big, and captioned."]
open(os.path.join(ROOT, "briefs", "v3", "pointing", "SHOT_TABLE_v4.md"), "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
print("SHOT_TABLE_v4.md: %d shots, %d f = %.2f s" % (len(TL["shots"]), TL["total"], TL["total"] / 30))

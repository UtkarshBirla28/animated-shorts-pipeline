# DIRECTOR tool (pointing): RE-CUT briefs/v3/pointing/bible.json to SCRIPT v3 (25 shots, 4 sets).
#   python briefs/v3/pointing/director/make_bible.py
# Inputs: the v2 bible (kept as bible_v2.json: its set / cast / look blocks are reused for the 4 places that stay),
#   briefs/v3/pointing/director/timeline_v3.json  (probe.mjs json: frames, lines, events from the film's own clock),
#   briefs/v3/pointing/director/cams_v3.json      (probe.mjs cams: CORE camSpeedStats of the film's real cameras),
#   briefs/v3/pointing/lint.json                  (script_lint on SCRIPT_v3_lint.md).
# Then: tools/v3/bible_validate.py briefs/v3/pointing/bible.json   (must say VERDICT: PASS)
import json, os, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.abspath(os.path.join(HERE, ".."))
V2 = os.path.join(B, "bible_v2.json")
if not os.path.exists(V2):
    shutil.copyfile(os.path.join(B, "bible.json"), V2)
old = json.load(open(V2, encoding="utf-8"))
TL = json.load(open(os.path.join(HERE, "timeline_v3.json"), encoding="utf-8"))
CAMS = json.load(open(os.path.join(HERE, "cams_v3.json"), encoding="utf-8"))
LINT = json.load(open(os.path.join(B, "lint.json"), encoding="utf-8"))
ROWS = {r["id"]: r for r in TL["shots"]}
TOTAL = TL["total"]

# ---------------------------------------------------------------- small builders
def fr(at, desc, subject, pct=None, wide=False, insert=False):
    d = {"at_s": at, "desc": desc, "subject": subject}
    if pct is not None: d["subject_height_pct"] = pct
    if wide: d["wide"] = True
    if insert: d["insert"] = True
    return d

def act(who, on, action, expr, sound=None, frames=14, src="foley"):
    return {"who": who, "on": on, "action": action, "expression": expr, "frames_min": frames, "silent": sound is None, "_sound": sound, "_src": src}

def life(what, kit, sound=None):
    return {"what": what, "kit": kit, "audible": sound is not None, "_sound": sound}

def fx(kit, what, on="shot", sound=None):
    return {"kit": kit, "what": what, "on": on, "silent": sound is None, "_sound": sound}

def near(surface, where, meso, wear):
    return {"surface": surface, "where": where, "meso": meso, "wear": wear}

AMB = {
    "jp_platform": "open-air platform at evening: distant city hum, a crow now and then, footsteps, the vending machine's hum near it; NO PA voice",
    "car": "car interior: low rail rumble, muffled rail joints, air-con hiss, strap creaks, a polite murmur (no phone calls)",
    "cab": "cab: the motor whine (its pitch steps on each notch), wind at the windscreen seals, rail joints, a faint rattle; at the station only the fan and the outside air",
    "lab": "a quiet lab: room tone, air-con hiss, birds outside the window",
}
NEAR = {
    "slabs": near("concrete_sidewalk", "the platform slabs at the frame bottom", "60 cm precast slabs with 6 mm joints, the pale edge coping, the door mark painted on them", ["chewing-gum spots", "scuffs where people queue", "grit in the joints"]),
    "tactile": near("tactile_paving_jp", "the tactile warning row at the edge", "5 x 5 dot domes per block, a raised inner-line bar, block joints", ["worn dome tops", "dirt between the domes"]),
    "carside": near("brushed_stainless", "the car side and the door leaves", "door-pocket seams, rubber door edges, the window gaskets, rivet lines, the sill step", ["hand smudges at the door edge", "brake dust low on the skirt"]),
    "doorglass": near("local/partition_glass", "the tall clean door glass", "the rubber gasket, the centre seal, a finger-height push plate", ["a few fingerprints at child height"]),
    "floor": near("concrete_floor", "the car's speckled vinyl floor", "the doorway floor strip, the aluminium threshold, floor seams over the bogies", ["aisle scuffs", "grit on the threshold"]),
    "bench": near("fabric", "the bench cushions", "dished cushions, a stainless divider, the seat skirt", ["worn nap on the front edge"]),
    "partition": near("local/partition_glass", "the cab partition glass", "the aluminium frame, the cab-door gasket, a small notice plate (pictograms only)", ["nose and finger marks at a boy's height"]),
    "desk": near("painted_wall", "the driver's desk", "bezel rings, switch guards, panel seams, the pocket-watch well", ["shiny worn edges", "a thumb-worn lever top"]),
    "windscreen": near("local/windscreen_glass", "the windscreen", "the wiper arc, the rubber gasket, the sun-visor rail", ["insect specks", "a wiper arc of dust"]),
    "table": near("marble", "the lab table top", "a rounded front edge, a faint seam, the plinth feet", ["ring marks", "a pencil line"]),
    "jars": near("local/glass", "the two glass jars", "thick rolled rims, a base ring, the pictogram plates on their stands", ["fingerprints near the rims"]),
}
PROPS = {
    "train": {"kit": "props/train_jp_commuter", "where": "car 1 at the platform (stainless, emerald stripe, doors with red car-side lamps)", "near_lens": True},
    "bag": {"kit": "props/suitcase_spinner", "where": "the glossy sunflower-yellow suitcase, handle up, a red tag on the handle", "near_lens": True},
    "vend": {"kit": "props/vending_machine_jp", "where": "the two drinks machines under the kiosk awning (pictograms + digits only)", "near_lens": False},
    "canopy": {"kit": "props/platform_canopy_jp", "where": "the canopy beyond z 9.5 (the cab end is open to the sky)", "near_lens": False},
    "signal": {"kit": "props/rail_signal_jp", "where": "ONE glowing green lamp far down the straight track (no readable head)", "near_lens": False},
    "interior": {"kit": "props/train_jp_interior", "where": "straps, poles, benches, blank ad frames, the door LCD", "near_lens": True},
    "cabkit": {"kit": "props/train_jp_cab", "where": "desk, speedometer, the small door lamp with its door pictogram, the T-handle, the pocket watch", "near_lens": True},
    "mast": {"kit": "props/ocs_mast_jp", "where": "overhead-line masts streaming past", "near_lens": False},
    "jar": {"kit": "props/glass_jar_big", "where": "two jars square to the lens: an EYE plate, a FINGER + SPEECH-BUBBLE plate", "near_lens": True},
    "balls": {"kit": "local/red_balls", "where": "red 'mistake' balls (a baked rigid-body sim)", "near_lens": True, "local": True},
    "bars": {"kit": "local/tries_bars", "where": "one plain TRIES bar under each jar (>= 4 % of the frame height, a round-button pictogram at the left end, the same end mark, no digits)", "near_lens": True, "local": True},
    "panel": {"kit": "local/lab_button_panel", "where": "her box with one lamp and three buttons, soft behind the jars", "near_lens": False, "local": True},
}
LIFE = {
    "pass": life("the train streams past behind him: door after door, window after window", "props/train_jp_commuter", "the motor whine at level + rail joints under the leaving cars"),
    "mast_shadow": life("a mast shadow crosses his cap and the car side", "local/mast_shadows"),
    "crow": life("a crow leaves the canopy edge", "fx/birds", "one far crow"),
    "motes": life("dust motes drift in the low sun", "fx/motes"),
    "leaves": life("two dry leaves skitter along the slabs", "fx/debris"),
    "walkers": life("commuters walk the far side of the island", "cards/crowd"),
    "vendled": life("the vending machines' button LEDs chase", "local/vending_lights"),
    "ledboard": life("the LED departure board's chevron row runs", "local/itv_image"),
    "sway": life("the whole car sways together, heads and straps a few frames apart", "cards/crowd"),
    "straps": life("every strap ring swings with the same rock", "local/strap_swing", "strap creaks in rhythm"),
    "stripes": life("sun stripes and mast shadows slide along the car", "local/mast_shadows"),
    "lcd": life("the door LCD's route dot steps on", "local/door_lcd"),
    "world": life("the lineside world streams past the windows", "local/treadmill_world"),
    "track": life("the track, masts and wires stream toward the lens", "local/treadmill_world", "rail joints, wind at the seals"),
    "speedo": life("the speedometer needle trembles", "local/speedometer"),
    "watch": life("the pocket watch's second hand ticks", "local/pocket_watch"),
    "fog": life("the boy's breath fogs the glass and clears", "local/breath_fog"),
    "plant_leaf": life("the plant on the sill stirs", "local/leaf_stir"),
    "lamp": life("the task lamp on her box blinks through its colours", "local/lab_button_panel"),
    "lab_motes": life("dust motes in the window light", "fx/motes"),
    "mum": life("his mum shifts her tote and keeps a hand on him", "cards/castCard"),
    "doorleaves": life("the door leaves slide (one speed: 1.3 s open to shut)", "props/train_jp_commuter", "the door chime, the leaves' rubber thump"),
    "sidelamps": life("the small red car-side lamps glow while a door is open and go out after the leaves meet", "props/train_jp_commuter", "a small relay click as they go out"),
}

# ---------------------------------------------------------------- the 25 shots (SCRIPT_v3.md sections 1, 2, 8)
G_F0 = {"sunAz": 68, "sunEl": 15, "warmth": 0.8}
G_BAG = {"sunAz": 66, "sunEl": 16, "warmth": 0.8}
G_WEST = {"warmth": 0.6, "exposure": 0.93}
G_CAB, G_CABB, G_CAR, G_LAB = {"sunAz": -35, "sunEl": 20}, {"sunAz": -35, "sunEl": 16}, {"sunAz": -80, "sunEl": 18}, {"sunAz": 95, "sunEl": 25}
P_CAR, P_CAB, P_LAB, P_PLAT = ["ceiling LED strips", "LCD screens"], ["console instrument backlights"], ["ceiling light panels", "panel task lamp"], ["canopy LED strips", "vending machine front"]

S = {}
S["s01"] = dict(
    starts_on="His", transition_in="cut", location="platform B, the open cab end, low gold sun: FRAME 0",
    _transition="the loop: the film's last frame is the frame before this one (one continuous set-up with s24)",
    framings=[fr(0.0, "FRAME 0. Right half: the tourist from the hips up, stunned, his straight arm thrust to screen LEFT, index finger out, landing on frame 2. Left half: car 1's door window sliding left; behind its clean glass the yellow suitcase (handle up, red tag) right at his fingertip, above the caption band. The boy's cap brim and one small hand at the window's far edge", "tourist", 62),
              fr(1.9, "the suitcase has left the frame (1.4 s); cars stream past; he turns his blank face to the lens, one slow blink (2.5 s); the push-in ends on his face (28 % of the frame height)", "tourist", 70)],
    camera=dict(preset="pushIn", params={"fov": 34, "height_m": 1.0, "dist_m": [3.35, 2.3], "ease": "linear", "lookH": 1.3},
                intent="STATION's frame-0 set-up: a waist-high lens dollies in at 0.34 m/s (face 19 % -> 21 % at 1.0 s -> 28 %), the aim drifts 0.14 m with the door window in 0-1.2 s and eases back onto his face. DIRECTOR: the look point is tilted down (0.26 m at frame 0, easing to 0.12 m) so the fingertip and the suitcase top sit above the caption band. HOOK B: the same camera with one same-axis 1.25x punch-in on 'He' (frame-switched)"),
    rig="golden", rig_opts=G_F0, practicals_on=[],
    near=["carside", "doorglass", "slabs"], props=["train", "bag"],
    life=[LIFE["pass"], LIFE["mast_shadow"], LIFE["crow"], LIFE["motes"]],
    fx=[fx("fx/debris", "two dry leaves lifted by the leaving train", "train.", None)],
    acting=[act("tourist", "His", "the straight-arm point (the end of the snap begun in s24) lands on frame 2 with a 4 % overshoot, steady by frame 6; his eyes and finger follow the suitcase as it slides away; mouth a closed line", "stare", "one crisp rail click on frame 2 with the arm"),
            act("tourist", "He", "he turns his whole face to the lens, blank; the arm stays out; one slow blink on 'not.'", "blank", None, 16),
            act("kid", "His", "in the door window: his small hand already points at the suitcase (rewatch detail), carried off with it", "serious", None)],
    captions={"mode": "script", "overrides": [{"word": "His", "text": "His bag"}, {"word": "is", "text": "on that train."}, {"word": "He", "text": "He is not."}]},
    sound=[("N: 'His bag is on that train. He is not.' (the first word at 0.07 s, on the rail click)", "voice", "His", "voice", "voice"),
           ("NO music until the first cut", "music", "shot", "music", "synth")],
    notes="The hook. One focal point: the fingertip in front of the one yellow thing. No phone screen, no title, no logo. He stands behind the yellow row, never touches the train, never walks beside it. On this platform the train leaves to screen LEFT (the outline's frame mirrored: digits on signs forbid flipping).")
S["s02"] = dict(
    starts_on="All", transition_in="cut", location="the packed front car, from the aisle looking toward the cab, one minute earlier",
    framings=[fr(0.0, "the SAME face at the same size (28 %) and screen place, now roaring with laughter into his own phone at chest height, his back to the cab glass; held 10 frames", "tourist", 70),
              fr(0.33, "the camera eases back down the aisle and sinks (30 f): the whole yellow suitcase at his knee is in frame by ~0.7 s; the boy at the glass and the driver's back beyond; still for the last 15 f while his phone swings toward the cab glass", "tourist", 55)],
    camera=dict(preset="pullBack", params={"fov": 50, "height_m": 1.42, "dist_m": [1.98, 2.9], "ease": "out", "rise": -0.57, "lookH": 1.4},
                intent="TRAIN: the matched face for 10 f (a breath of drift, never dead), ease back + sink for 30 f (fastest in its first 10 f, inside the 4.2 %/f cap), then a slow settle to the cut. HOOK B: the same 1.25x on his face for the 10-frame hold, given back during the move"),
    rig="golden", rig_opts=G_CAR, practicals_on=P_CAR,
    near=["floor", "bench", "partition"], props=["interior", "bag"],
    life=[LIFE["sway"], LIFE["straps"], LIFE["stripes"], LIFE["world"], LIFE["mum"]],
    fx=[fx("fx/motes", "dust in the window sun stripes")],
    acting=[act("tourist", "All", "roaring with laughter into his own phone (a selfie with the driver behind him): eyes shut, shoulders bouncing, head back", "laughBig", "his real belly laugh (v3_x01), 12 dB under the narrator", 30, "voice"),
            act("tourist", "at", "in the pause after 'laugh' he swings the phone round toward the cab glass (12 f, to the cut)", "brightGrin", None, 12),
            act("kid", "All", "at the cab glass, nose on it, watching the driver", "serious", None)],
    captions={"mode": "script", "overrides": [{"word": "All", "text": "All he did"}, {"word": "was", "text": "was laugh"}, {"word": "at", "text": "at a finger."}]},
    sound=[("N: 'All he did was laugh... at a'", "voice", "All", "voice", "voice"), ("the pizzicato motif enters ON the cut", "music", "All", "music", "synth")],
    notes="The jump back in time must read from the matched face + the suitcase at his knee. If the suitcase is late, move it nearer the lens; do not speed the camera.")
S["s03"] = dict(
    starts_on="finger.", transition_in="cut", location="the driver's cab at speed: the glove and the green lamp",
    framings=[fr(0.0, "from behind the driver's right shoulder: his WHITE glove already 40 % raised, index out; far down a dead-straight empty track ONE glowing green lamp (core >= 18 px, halo >= 40 px, dark behind it)", "driver", 45),
              fr(0.75, "the arm straight on 'Signal...', the fingertip right beside the lamp; the hand back by his right ear on the 0.38 s beat; the snap on 'green!' and hold; the lens drifts toward his right side", "driver", 45)],
    camera=dict(preset="orbit", params={"fov": 56, "height_m": 1.5, "dist_m": [2.0, 2.0], "a0": 168, "a1": 180, "lookH": 1.45},
                intent="TRAIN's drift from behind his right shoulder toward his right side, the lens on the far lamp. DIRECTOR: +12 deg arc pivoted 2 m ahead (inside the cab), so the cab frame slides against the far track"),
    rig="golden", rig_opts=G_CAB, practicals_on=P_CAB,
    near=["desk", "windscreen"], props=["cabkit", "signal", "mast"],
    life=[LIFE["track"], LIFE["mast_shadow"], LIFE["speedo"], LIFE["watch"]],
    fx=[fx("fx/motes", "dust in the windscreen sun")],
    acting=[act("driver", "Signal", "THE CALL: the glove (40 % up at the cut) reaches full stretch at the lamp, eyes locked far ahead; hand back beside his right ear for the beat; snaps out on 'green!' and holds; left hand on the T-handle", "focus", "cotton 'fwip' on the snap + a two-note marimba hit", 18)],
    captions={"mode": "script", "overrides": [{"word": "Signal", "text": "SIGNAL... GREEN!"}]},
    sound=[("N: 'finger.' then D: '[firmly] Signal... green!'", "voice", "finger.", "voice", "voice"), ("a cotton rustle as the glove rises", "music", "finger.", "foley", "lib")],
    notes="Fact guard 2 + 6: the lamp is ON SCREEN beside the fingertip before the tourist says 'nothing'; one lamp, no readable signal head.")
S["s03b"] = dict(
    starts_on="Signal...", transition_in="cut", location="the driver's cab at speed: HIS FACE, front three-quarter (LEAD 02:35)",
    framings=[fr(0.0, "front three-quarter of the driver from inside the cab, ahead-right of him: face 25-30 % of the frame height, eyes at 33-38 % from the top; the glove at full stretch on the cut, back beside his ear on 'Signal...', the SNAP past the lens on 'green!', the calm proud hold; golden windscreen key + rim on his cheek, badge and glove; the world scrolling in the side window", "driver", 28)],
    camera=dict(preset="pushIn", params={"fov": 40, "height_m": 1.45, "dist_m": [1.3, 1.15], "lookH": 1.45},
                intent="TRAIN: a slow push-in 0.5-0.7 %/f, no orbit (peak <= 1.5); until TRAIN's v3_s03b exists film.ts runs s03's lens over the old whole span"),
    rig="golden", rig_opts=G_CAB, practicals_on=P_CAB,
    near=["desk", "windscreen"], props=["cabkit", "mast"],
    life=[LIFE["track"], LIFE["mast_shadow"], LIFE["speedo"], LIFE["watch"]],
    fx=[fx("fx/motes", "dust in the windscreen sun")],
    acting=[act("driver", "Signal", "THE CALL, face to us: hand beside his right ear on 'Signal...' (eyes locked far ahead past the lens), the snap out on 'green!' (4-6 f, 3-4 % overshoot), calm proud hold, a tiny nod", "focus", "cotton 'fwip' on the snap + a two-note marimba hit", 18)],
    captions={"mode": "script", "overrides": [{"word": "Signal", "text": "SIGNAL... GREEN!"}]},
    sound=[("D: '[firmly] Signal... green!'", "voice", "Signal...", "voice", "voice")],
    notes="T-13: the title's subject gets his face. Calm and exact, not comic. Glove and face above 64 % (the caption band).")
S["s04"] = dict(
    starts_on="He's", transition_in="cut", location="the car, a two-shot at the cab glass",
    framings=[fr(0.0, "the tourist's gap-toothed laugh, a finger jab toward the glass that stops short of it, phone up; beside him the boy raises ONE finger to the glass and holds it, looking up at him; mum beside the boy; the yellow suitcase at his knee; through the glass, small: the glove and the green lamp", "tourist", 52)],
    camera=dict(preset="lowWideTrack", params={"fov": 52, "height_m": 1.4, "dist_m": [2.0, 1.8], "ease": "linear", "lookH": 1.1},
                intent="TRAIN's three-quarter two-shot from the aisle with a slow slide. DIRECTOR: +11 deg arc and a 6 % push"),
    rig="golden", rig_opts=G_CAR, practicals_on=P_CAR,
    near=["partition", "floor"], props=["interior", "bag"],
    life=[LIFE["sway"], LIFE["straps"], LIFE["world"], LIFE["fog"]],
    fx=[fx("fx/motes", "dust in the sun stripes")],
    acting=[act("tourist", "He's", "laughs (it starts under the tail of 'green!'), jabs his finger toward the glass and stops short of it: no tap", "laughBig", "T: '[laughing] He's pointing at nothing!'", 18, "voice"),
            act("kid", "pointing", "one finger on the glass, held; he looks up at the laughing tourist (no ear, no snap yet)", "serious", None, 14),
            act("kid_mum", "He's", "a hand on the boy's shoulder, an amused glance at the tourist", "amused", None)],
    captions={"mode": "script", "overrides": [{"word": "He's", "text": "HE'S POINTING"}, {"word": "at", "text": "AT NOTHING!"}]},
    sound=[], notes="The doubter; the title said by the one who is wrong. He never taps the glass, never blocks the driver.")
S["s05"] = dict(
    starts_on="But", transition_in="cut", location="the car, mid-aisle: the glide to the suitcase",
    framings=[fr(0.0, "over the packed car toward the cab end: a salaryman asleep at a strap (jerks up, nods off), two students, a grandma with a cloth bundle, a stroller with a small waving hand; everyone sways together", "jp_commuters", None, True),
              fr(1.5, "the glide sinks and lands at the tourist's knees: the yellow suitcase creeps backward away from him; without a look his sneaker hooks a wheel and drags it back", "suitcase", 45)],
    camera=dict(preset="craneDown", params={"fov": 60, "height_m": 1.78, "dist_m": [7.5, 1.4], "endH": 0.55, "ease": "inOut"},
                intent="TRAIN's forward glide under the hanging ads that sinks to knee height at the suitcase"),
    rig="golden", rig_opts=G_CAR, practicals_on=P_CAR,
    near=["floor", "bench"], props=["interior", "bag"],
    life=[LIFE["sway"], LIFE["straps"], LIFE["stripes"], LIFE["lcd"], LIFE["world"]],
    fx=[fx("fx/motes", "dust in the sun stripes")],
    acting=[act("jp_commuters", "thousand", "the sleeping salaryman's head jerks up and nods off again; the stroller's small hand waves", "sleepy", None, 16),
            act("tourist", "behind", "eyes on his phone: his sneaker feels out, hooks a wheel of the creeping suitcase and drags it home without a look", "brightGrin", "a caster squeak, a rubber 'tok' as the wheel is hooked", 18)],
    captions={"mode": "script", "overrides": [{"word": "But", "text": "But that driver"}, {"word": "has", "text": "has 1,000 people"}, {"word": "behind", "text": "behind him."}]},
    sound=[("N: 'But that driver has a thousand people behind him.'", "voice", "But", "voice", "voice"), ("the motor's pitch steps up (the train picks up speed)", "music", "But", "foley", "lib")],
    notes="Stakes for the driver + the plant: the suitcase wants to leave and he handles it without looking. No music sting on the sleeping salaryman.")
S["s06"] = dict(
    starts_on="So", transition_in="cut", location="the cab, looking back through the partition glass",
    framings=[fr(0.0, "soft in the near corner: the white glove points at the speedometer, goes to the ear, snaps (no spoken call). Sharp behind the glass: the boy copies it all a beat late, very serious: his FIRST full copy; the tourist grins at his own clip; mum's hand on the boy's shoulder", "kid", 40),
              fr(1.5, "the train brakes: the yellow top of the suitcase rolls into the bottom edge of the window and bumps the wall under the boy; the jolt drops his too-big cap over his eyes; one finger pushes it up, he glances down at the suitcase and keeps pointing", "kid", 42)],
    camera=dict(preset="pushIn", params={"fov": 50, "height_m": 1.26, "dist_m": [2.6, 2.4], "ease": "linear", "lookH": 1.0},
                intent="TRAIN's lens from the cab side through the right partition window, a slow push, focus on the boy. DIRECTOR: +9 deg arc"),
    rig="golden", rig_opts=G_CAB, practicals_on=P_CAB,
    near=["partition", "desk"], props=["cabkit", "bag", "interior"],
    life=[LIFE["fog"], LIFE["speedo"], LIFE["world"], LIFE["sway"]],
    fx=[fx("fx/motes", "dust in the cab sun")],
    acting=[act("driver", "checks", "the SILENT call at the speedometer: point on 'checks', hand to the ear, snap on 'shout'", "focus", "a soft cotton 'fwip' (no spoken call)", 18),
            act("kid", "checks", "copies the whole point-ear-snap a beat late, tongue out with concentration", "serious", None, 18),
            act("kid", "finger", "the brake jolt drops his cap over his eyes; he freezes blind; one finger shoves it up; a glance down at the suitcase; still pointing", "serious", "a soft 'tok' as the suitcase bumps the wall under him", 16),
            act("tourist", "So", "grins at his own clip on his phone, sees none of it", "brightGrin", None)],
    captions={"mode": "script", "overrides": [{"word": "So", "text": "So he checks"}, {"word": "with", "text": "with a finger"}, {"word": "and", "text": "and a shout."}]},
    sound=[("N: 'So he checks with a finger and a shout.'", "voice", "So", "voice", "voice"), ("the brakes bite: the motor whine falls", "music", "finger", "foley", "lib")],
    notes="What the pointing is for; the boy is the one who pays attention; the suitcase's second move. Crowded: six things in 2.8 s (production risk 10).")
S["s07"] = dict(
    starts_on="First", transition_in="cut", location="platform A, at car 1's front door, looking in (framed below the door header)",
    framings=[fr(0.0, "the train stops with a small jerk; the door chime; the doors slide open; commuters step off round the lens", "jp_commuters", None, True),
              fr(1.35, "a passing briefcase nudges the yellow suitcase: it trundles on its spinner wheels straight for the open door, a clear lane (people step round it politely); its front wheels reach the yellow floor strip. The tourist has his back to it, phone DOWN, watching the driver through the cab glass", "suitcase", 38)],
    camera=dict(preset="pushIn", params={"fov": 42, "height_m": 1.0, "dist_m": [3.25, 2.95], "ease": "inOut", "lookH": 0.65},
                intent="STATION's doorway lens (1.0 m high, aiming low so the header stays out), a slow ease in. DIRECTOR: +16 deg arc round the door centre"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["slabs", "tactile", "carside"], props=["train", "bag"],
    life=[LIFE["doorleaves"], LIFE["sidelamps"], LIFE["walkers"], LIFE["motes"], LIFE["mum"]],
    fx=[fx("fx/debris", "a leaf skitters on the slabs")],
    acting=[act("jp_commuters", "First", "three commuters step off and walk out of frame, one with a briefcase that nudges the suitcase", "polite", "footsteps, a briefcase knock", 16),
            act("tourist", "suitcase", "his back to the bag, phone down at his side, watching the driver through the cab glass", "content", None),
            act("kid", "tries", "watches the suitcase roll, mouth open", "worriedB", None)],
    captions={"mode": "script", "overrides": [{"word": "First", "text": "First stop."}, {"word": "His", "text": "His suitcase"}, {"word": "tries", "text": "tries to"}, {"word": "get", "text": "get off..."}]},
    sound=[("N: 'First stop. His suitcase tries to get off...'", "voice", "First", "voice", "voice"), ("spinner wheels trundling toward the door", "music", "tries", "foley", "lib")],
    notes="The near miss begins. The lamp above the door is never in frame (its behaviour while the doors stand open is unverified).")
S["s08"] = dict(
    starts_on="and", transition_in="cut", location="platform A, the same doorway, closer",
    framings=[fr(0.0, "the boy snaps the full driver's point at the suitcase (0.45 s); the tourist's eyes go to the boy, run down his arm, and POP", "kid", 45),
              fr(1.2, "two quick steps, a lunge: he catches the handle with two wheels over the gap (on 'saves') and hauls it in; wags a finger at it like at a puppy; the boy nods once, firm; on the nod the chime starts and both door leaves begin to slide in from the frame edges", "tourist", 60)],
    camera=dict(preset="pushIn", params={"fov": 42, "height_m": 1.0, "dist_m": [2.1, 2.04], "ease": "linear", "lookH": 0.92},
                intent="STATION's cut-in of s07. DIRECTOR: -12 deg arc + a 6 % push"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["tactile", "carside", "floor"], props=["train", "bag"],
    life=[LIFE["mum"], LIFE["sidelamps"], LIFE["motes"], LIFE["doorleaves"]],
    fx=[fx("fx/debris", "grit jumps as the wheels drop back on the sill")],
    acting=[act("kid", "and", "the full snap point at the suitcase, eyebrows up", "bright", "his small, higher 'fwip'", 13),
            act("tourist", "finger", "his eyes go to the boy, down the arm to the bag: a take; two steps, a lunge, the catch on 'saves', the haul", "puzzled", "two fast sneaker steps, the handle caught, wheels banging back over the sill", 20),
            act("tourist", "Bad", "wags a finger at the suitcase like at a puppy, the other hand on his hip", "smugB", "T: '[scolding] Bad suitcase.'", 16, "voice"),
            act("kid", "suitcase.", "one firm nod", "proud", None, 12),
            act("kid_mum", "and", "her hand on the boy's backpack the whole time", "warm", None)],
    captions={"mode": "script", "overrides": [{"word": "and", "text": "and the"}, {"word": "boy's", "text": "boy's finger"}, {"word": "saves", "text": "saves it."}, {"word": "Bad", "text": "BAD SUITCASE."}]},
    sound=[("N: '...and the boy's finger saves it.'", "voice", "and", "voice", "voice"), ("the door chime starts on the boy's nod, never under 'Bad suitcase.'", "music", "suitcase.", "foley", "lib")],
    notes="The fair clue: a finger made him LOOK, and with his phone down he SAW. The rescue pays inside 6 s.")
S["s09"] = dict(
    starts_on="Doors", transition_in="cut", location="platform A, knee-high along the car side: THE PLANT",
    framings=[fr(0.0, "the doors are already sliding, about a third shut; they meet (rubber thump); the small red car-side lamps go out; THEN the driver's call, heard from the cab; behind car 1's door glass: the tourist, the yellow suitcase, the boy", "train", None, True),
              fr(2.0, "the train starts to glide; a late salaryman stops short and gives up", "train", None, True)],
    camera=dict(preset="lowWideTrack", params={"fov": 58, "height_m": 0.55, "dist_m": [3.2, 2.7], "side": [-0.45, 0.05], "ease": "inOut", "lookH": 1.3},
                intent="STATION's plant lens: knee height, a slow slide + creep toward the cab end; the SAME lens as s22. DIRECTOR: a longer slide (see film.ts DIR_MOVE)"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["slabs", "tactile", "carside"], props=["train", "bag"],
    life=[LIFE["doorleaves"], LIFE["sidelamps"], LIFE["walkers"], LIFE["leaves"]],
    fx=[fx("fx/debris", "dust lifts along the platform edge as the train moves")],
    acting=[act("jp_commuters", "Doors", "the late salaryman half-jogs in, stops short of the closed doors and gives up (a small sigh, his tie, his watch); nobody rushes the doors", "resigned", "leather soles slowing, a sigh", 18),
            act("driver", "Doors", "unseen: his call is HEARD from the cab after the doors have met and the lamps are out", "firm", "D: '[firmly] Doors... closed!' (from the cab)", 14, "voice"),
            act("tourist", "closed!", "behind the door glass, a hand on the suitcase handle, grinning at the boy", "brightGrin", None)],
    captions={"mode": "script", "overrides": [{"word": "Doors", "text": "DOORS... CLOSED!"}]},
    sound=[("the train starts to glide: the motor whine from zero", "music", "closed!", "foley", "lib")],
    notes="THE PLANT: the exact picture, sound, door speed (1.3 s) and order the payoff reuses: doors meet -> side lamps out -> the call -> the glide. The driver never closes the doors.")
S["s10"] = dict(
    starts_on="What's", transition_in="cut", location="the car, moving again",
    framings=[fr(0.0, "the tourist to his own phone camera, wiggling his index finger, his other hand on the suitcase handle; the boy, arms crossed, frowns up at him; mum beside the boy; the crowd sways", "tourist", 58)],
    camera=dict(preset="pushIn", params={"fov": 50, "height_m": 1.38, "dist_m": [1.9, 1.6], "ease": "linear", "lookH": 1.2},
                intent="TRAIN's selfie framing from the aisle, a slight push. DIRECTOR: +11 deg arc"),
    rig="golden", rig_opts=G_CAR, practicals_on=P_CAR,
    near=["floor", "bench"], props=["interior", "bag"],
    life=[LIFE["sway"], LIFE["straps"], LIFE["stripes"], LIFE["world"]],
    fx=[fx("fx/motes", "dust in the sun stripes")],
    acting=[act("tourist", "What's", "to his own phone at eye height: the index finger wiggling at it, a cocky grin", "brightGrin", "T: '[laughing] What's a finger gonna do?'", 18, "voice"),
            act("kid", "finger", "arms crossed, a frown up at him", "frownB", None, 14),
            act("kid_mum", "What's", "an eyebrow, a small smile", "amused", None)],
    captions={"mode": "script", "overrides": [{"word": "What's", "text": "WHAT'S A FINGER"}, {"word": "gonna", "text": "GONNA DO?"}]},
    sound=[], notes="The film's question, asked by the doubter 5 s after a finger saved his bag (comment trigger 1).")
S["s11"] = dict(
    starts_on="Second", transition_in="cut", location="platform B, the doorway framing (station A is now station B)",
    framings=[fr(0.0, "the doors open; he wheels the yellow suitcase to the doorway, already looking toward the cab end, phone up", "tourist", 55),
              fr(1.55, "he parks it just inside the doorway on the yellow strip ('Stay.'), pats its handle twice like a dog, and skips out onto the platform ('Be right back.'); the lens eases back", "suitcase", 40)],
    camera=dict(preset="pullBack", params={"fov": 42, "height_m": 1.0, "dist_m": [2.9, 3.25], "ease": "inOut", "lookH": 0.65},
                intent="STATION's doorway lens easing back. DIRECTOR: -19 deg arc the other way from s07"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["slabs", "tactile", "carside"], props=["train", "bag"],
    life=[LIFE["doorleaves"], LIFE["sidelamps"], LIFE["mum"], LIFE["motes"], LIFE["walkers"]],
    fx=[fx("fx/debris", "a leaf skitters past the door mark")],
    acting=[act("tourist", "Second", "wheels the bag to the doorway, eyes already on the cab end, phone up", "brightGrin", "spinner wheels on the vinyl, the door chime", 16),
            act("tourist", "Stay.", "parks it on the yellow strip, two pats on the handle like a dog, a small bow; then the skip out, phone up", "smugB", "T: '[playful] Stay. Be right back.' + two soft pats", 18, "voice"),
            act("kid", "Stay.", "looks from the bag to the tourist", "worriedB", None)],
    captions={"mode": "script", "overrides": [{"word": "Second", "text": "Second stop."}, {"word": "Stay.", "text": "STAY."}, {"word": "Be", "text": "BE RIGHT BACK."}]},
    sound=[("N: 'Second stop.'", "voice", "Second", "voice", "voice")],
    notes="THE bag plant. He stays behind the yellow line once out; a cheeky pizzicato tip-toe under the pats.")
S["s12"] = dict(
    starts_on="It", transition_in="cut", location="platform B, the same doorway, closer",
    framings=[fr(0.0, "the yellow suitcase alone in the low sun for 2.2 s; the boy, inside beside it, looks at the bag, then at the tourist's back; his mum, a hand on his shoulder, looks at the bag, then at the tourist's back, and smiles: its owner is right there", "suitcase", 42)],
    camera=dict(preset="pushIn", params={"fov": 42, "height_m": 1.0, "dist_m": [2.1, 2.0], "ease": "linear", "lookH": 0.92},
                intent="STATION's cut-in, almost still. DIRECTOR: a 4 deg arc + a 6 % push (0.2 %/f: calm, never dead)"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["tactile", "carside", "floor"], props=["train", "bag"],
    life=[LIFE["mum"], LIFE["sidelamps"], LIFE["motes"], LIFE["walkers"]],
    fx=[fx("fx/debris", "one leaf turns over at the door mark")],
    acting=[act("kid", "It", "his eyes go to the bag, then to the tourist's back", "worriedB", None, 14),
            act("kid_mum", "stays.", "looks at the bag, then at the tourist's back, a small smile: its owner is right there", "warm", None, 14)],
    captions={"mode": "script", "overrides": [{"word": "It", "text": "It stays."}]},
    sound=[("N: 'It stays.' (the quietest, flattest narrator line)", "voice", "It", "voice", "voice"), ("one held pizzicato note under the bag", "music", "It", "music", "synth")],
    notes="The mid-film re-hook: we know what this doorway will do. The bag plant has 4.2 s of picture in all.")
S["s13"] = dict(
    starts_on="Vending", transition_in="cut", location="platform B, by the drinks vending machines near the cab end",
    framings=[fr(0.0, "he is ALREADY facing his own phone, stiff as a guard: the driver's point at the machine (arm on 'Vending machine...', hand to the ear, snap on 'check!'); his grin breaks through; behind him, easy to read: the open doorway, the yellow suitcase, the boy and his mum; hold 0.33 s", "tourist", 60)],
    camera=dict(preset="pushIn", params={"fov": 60, "height_m": 1.4, "dist_m": [1.8, 1.7], "ease": "linear", "lookH": 1.15},
                intent="STATION's lens at the red machine's west corner looking back over him at the doorway (the machine fronts, his face and the far doorway do not fit one 9:16 frame: the bag wins). DIRECTOR: -9 deg arc + a 5 % push"),
    rig="golden", rig_opts=G_BAG, practicals_on=P_PLAT,
    near=["slabs", "carside"], props=["vend", "train", "bag"],
    life=[LIFE["vendled"], LIFE["mum"], LIFE["walkers"], LIFE["crow"]],
    fx=[fx("fx/debris", "a leaf skitters past his sneakers")],
    acting=[act("tourist", "Vending", "the stiff mock call in the true rhythm, too loud, fake-deep (never a put-on accent): arm out, ear, a wobbling snap; then the grin breaks through", "mockStiff", "T: '[mocking] Vending machine... check!' + a comic cotton 'fwip'", 18, "voice"),
            act("kid", "check!", "in the doorway behind him: stares at the bag, then at him", "worriedB", None)],
    captions={"mode": "script", "overrides": [{"word": "Vending", "text": "VENDING MACHINE..."}, {"word": "check!", "text": "CHECK!"}]},
    sound=[("the machine's hum, one can dropping in a far machine", "music", "Vending", "foley", "lib")],
    notes="His first call-out, at the wrong thing, with his bag behind him; the only plant of the word 'check!'. No thumbs-up, no phone turn. Behind the yellow line.")
S["s14"] = dict(
    starts_on="@v3_p01 (no words)", transition_in="cut", location="platform B, the doorway, tight, from the platform",
    framings=[fr(0.0, "what he would see if he looked: the yellow suitcase big in the sun; the boy steps up beside it, his mum's hand on his backpack, and snaps the full point at it, eyebrows up, urgent, MOUTH SHUT", "kid", 50, False, True)],
    camera=dict(preset="pushIn", params={"fov": 42, "height_m": 1.0, "dist_m": [1.62, 1.5], "ease": "linear", "lookH": 0.9},
                intent="STATION's tight insert. DIRECTOR: a 6 deg arc + a 12 % push (a quick, clear insert)"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["tactile", "carside", "floor"], props=["train", "bag"],
    life=[LIFE["mum"], LIFE["motes"], LIFE["sidelamps"]],
    fx=[fx("fx/debris", "dust in the sun at the sill")],
    acting=[act("kid", "@s14", "steps up and snaps the full point at the suitcase, re-stabbing, eyebrows UP (the cap jumps), MOUTH SHUT, eyes flicking between the bag and the tourist", "worriedB", "his own small, higher 'fwip'", 14),
            act("kid_mum", "@s14", "her hand stays on his backpack", "warm", None)],
    captions={"mode": "none"},
    sound=[("one held plucked note; platform air; NO voice (2.78 s without a voice, designed)", "music", "shot", "music", "synth")],
    notes="The second warning: a finger with no shout. 1.10 s on the plan; the script allows 1.40 s if it does not read (timeline.ts P01_LEN_S).")
S["s15"] = dict(
    starts_on="This", transition_in="cut", location="from INSIDE the doorway, the lens right beside the suitcase, looking out at platform B",
    framings=[fr(0.0, "the suitcase's yellow edge in the near corner, the boy's arm in the other; on the platform the tourist turns his whole head: his eyes land straight on the lens (= the suitcase) and hold 0.7 s, dead air; his face >= 15 % of the frame height", "tourist", 45),
              fr(1.3, "then the grin: he points back at the boy with both index fingers, 'This kid gets it!', and turns back to his phone", "tourist", 45)],
    camera=dict(preset="pushIn", params={"fov": 52, "height_m": 1.15, "dist_m": [2.6, 2.3], "ease": "linear", "lookH": 1.2},
                intent="STATION's lens inside the doorway, framed below the header. DIRECTOR: a slow 12 % push toward his face with a 4 deg arc"),
    rig="golden", rig_opts=G_WEST, practicals_on=[],
    near=["floor", "doorglass", "tactile"], props=["bag", "train", "vend"],
    life=[LIFE["walkers"], LIFE["vendled"], LIFE["motes"], LIFE["crow"]],
    fx=[fx("fx/debris", "a leaf crosses the doorway")],
    acting=[act("tourist", "@s15", "the whole head turns (12 f); his eyes land ON the lens and hold 0.7 s: he looks right at the bag and does not see it", "blank", None, 21),
            act("tourist", "This", "the grin; both index fingers point back at the boy (no recoil); 'This kid gets it!'; he turns back to his phone", "brightGrin", "T: '[warmly] This kid gets it!' after a warm chuckle", 18, "voice"),
            act("kid", "@s15", "his arm stays out at the bag in the near corner, mouth shut", "worriedB", None)],
    captions={"mode": "script", "overrides": [{"word": "This", "text": "THIS KID"}, {"word": "gets", "text": "GETS IT!"}]},
    sound=[("dead air on the 0.7 s look (no music, the platform only)", "music", "shot", "music", "synth")],
    notes="Dramatic irony: the lens IS the suitcase. He stays behind the yellow line. Comment trigger 2.")
S["s16a"] = dict(
    starts_on="You", transition_in="cut", location="platform B: a slow orbit round him",
    framings=[fr(0.0, "phone up, silent, absorbed in his own clip, phone-lit; the phone plays only a thin wordless giggle", "tourist", 60),
              fr(1.6, "on 'looked right at it' the focus pulls to what is behind him: the open doorway, the yellow bag, the boy and his mum; on 'his phone' it comes back to his face", "tourist", 60)],
    camera=dict(preset="orbit", params={"fov": 50, "height_m": 1.5, "dist_m": [1.5, 1.6], "a0": 150, "a1": 205, "lookH": 1.45},
                intent="STATION's slow orbit (150 -> 205 deg). The doorway must be BEHIND him in frame by 'looked right at it' (request S-6)"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["slabs", "carside"], props=["train", "bag"],
    life=[LIFE["mum"], LIFE["walkers"], LIFE["crow"], LIFE["motes"], LIFE["sidelamps"]],
    fx=[fx("fx/debris", "leaves along the slabs")],
    acting=[act("tourist", "You", "phone up, absorbed, a content half-smile; he never looks back", "content", "his own thin wordless giggle from the phone's tiny speaker (v3_x01)", 20, "voice"),
            act("kid", "looked", "in the doorway behind him: still pointing at the bag, looking at his back", "worriedB", None)],
    captions={"mode": "script", "overrides": [{"word": "You", "text": "You see,"}, {"word": "his", "text": "his eyes"}, {"word": "looked", "text": "looked right"}, {"word": "at", "text": "at it."}, {"word": "His", "text": "His mind"}, {"word": "was", "text": "was on"}, {"word": "his", "text": "his phone."}]},
    sound=[("N: 'You see, his eyes looked right at it. His mind was on his phone.' (no other words under it)", "voice", "You", "voice", "voice"), ("the score thins to a pad", "music", "You", "music", "synth")],
    notes="The turn: the answer, told through him. No phone-screen picture (no render-to-texture).")
S["s16b"] = dict(
    starts_on="What's#2", transition_in="cut", location="platform B: the same orbit, a same-axis cut-in (1.3x closer)",
    framings=[fr(0.0, "the phone answers the narrator: his own 'What's a finger gonna do?', thin; he wiggles his finger along with it, delighted with himself; the yellow bag stays over his shoulder", "tourist", 68),
              fr(1.75, "the departure melody starts (the music-note pictogram appears, top left); the boy looks up at the sound; 'Japan's railway lab' is heard over him and the bag", "tourist", 68)],
    camera=dict(preset="orbit", params={"fov": 50, "height_m": 1.5, "dist_m": [1.25, 1.3], "a0": 205, "a1": 250, "lookH": 1.45},
                intent="STATION's orbit continued, 1.3x closer"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["slabs", "carside"], props=["train", "bag"],
    life=[LIFE["mum"], LIFE["walkers"], LIFE["motes"], LIFE["sidelamps"]],
    fx=[fx("fx/debris", "leaves along the slabs")],
    acting=[act("tourist", "What's#2", "his mouth does NOT say the words (his phone does): he wiggles his index finger along, a delighted grin", "brightGrin", "the phone's replay of v3_t03, thin, ~8 dB under the narrator, in the clear", 18, "voice"),
            act("kid", "Japan's", "looks up at the departure melody", "worriedB", None, 14)],
    captions={"mode": "script", "overrides": [{"word": "What's#2", "text": "WHAT'S A FINGER"}, {"word": "gonna#2", "text": "GONNA DO?"}, {"word": "Japan's", "text": "Japan's railway lab"}]},
    sound=[("the DEPARTURE MELODY starts on 'Japan's' (an original 5.5 s phrase, played twice; never a real one)", "music", "Japan's", "music", "synth"),
           ("N: 'Japan's railway lab'", "voice", "Japan's", "voice", "voice")],
    notes="The dare comes back at the moment the narrator can answer it. Captions: the replay in CAPS at 80 % with a phone pictogram.")
S["s17"] = dict(
    starts_on="tested", transition_in="cut", location="the test lab, bright: the two jars, the EYE side",
    framings=[fr(0.0, "CUT on 'tested'. Two big glass jars fill the frame, square to the lens: an EYE plate, a FINGER + SPEECH-BUBBLE plate; under each one a plain TRIES bar, both empty; the volunteer soft behind them at a box with one lamp and three buttons", "jars", 34, False, True),
              fr(1.0, "she only looks and presses, a fast run (about three presses for each ball): the EYE bar fills to its end mark and six red balls drop into the EYE jar, each on a pulse of the melody; the sixth lands on 'looking...'", "jars", 34, False, True)],
    camera=dict(preset="orbit", params={"fov": 48, "height_m": 1.1, "dist_m": [1.3, 1.22], "a0": -14, "a1": 2, "lookH": 0.89},
                intent="LAB's one slow move over both halves (a small arc onto the square view, a slow push). DIRECTOR: +18 deg of arc across this half, so the room slides behind the jars"),
    rig="interiorWarm", rig_opts=G_LAB, practicals_on=P_LAB,
    near=["table", "jars"], props=["jar", "balls", "bars", "panel"],
    life=[LIFE["lamp"], LIFE["plant_leaf"], LIFE["lab_motes"], life("six red balls fall, bounce and settle", "local/red_balls", "a glass 'tink' per ball, on the melody's pulses")],
    fx=[fx("fx/motes", "dust in the window light")],
    acting=[act("volunteer", "every", "she only LOOKS at the lamp and presses, a fast run of presses, eyes on it", "focusB", "soft button clicks, fast", 18)],
    captions={"mode": "script", "overrides": [{"word": "tested", "text": "tested it."}, {"word": "For", "text": "For every 6"}, {"word": "mistakes", "text": "mistakes people made"}, {"word": "just", "text": "just looking..."}]},
    sound=[("N: 'tested it. For every six mistakes people made just looking...'", "voice", "tested", "voice", "voice"), ("the melody faint under the jars; the EYE bar's soft fill tick", "music", "For", "music", "synth")],
    notes="Fact guard 1: a ratio; the two TRIES bars show the same number of tries; no digits on the bars; no '-85 %' chip; nothing teeters, nothing leaves a jar.")
S["s18"] = dict(
    starts_on="@v3_p02 (no words)", transition_in="cut", location="from inside the doorway (s15's camera, a little wider)",
    framings=[fr(0.0, "the yellow suitcase large in the near corner; the brim of the boy's cap beside it, the boy looking from the bag to the tourist; beyond, on the platform, the tourist with his back to it, shoulders shaking at his phone", "suitcase", 40, False, True)],
    camera=dict(preset="lockedWithDrift", params={"fov": 56, "height_m": 1.15, "dist_m": [2.6, 2.6], "lookH": 1.2},
                intent="STATION's inside lens, a little wider. DIRECTOR: a small 3 deg arc + a 4 % push so the one second is alive"),
    rig="golden", rig_opts=G_WEST, practicals_on=[],
    near=["floor", "doorglass", "tactile"], props=["bag", "train"],
    life=[LIFE["walkers"], LIFE["motes"], LIFE["crow"]],
    fx=[fx("fx/debris", "a leaf crosses the doorway")],
    acting=[act("tourist", "@s18", "his back to the bag, shoulders shaking at his phone", "laughBig", "his soft helpless giggle (v3_x02)", 20, "voice"),
            act("kid", "@s18", "looks from the bag to the tourist", "worriedB", None, 14)],
    captions={"mode": "none"},
    sound=[("the melody LOUDER, in the platform's own sound (its second pass starts here)", "music", "shot", "music", "synth")],
    notes="'just looking' lands on a man just looking at his phone; the lab is tied to the platform with the sound off.")
S["s19"] = dict(
    starts_on="when", transition_in="cut", location="the test lab: the same jar framing, the FINGER side",
    framings=[fr(0.0, "she points at the lamp and calls in the true rhythm (point, hand by the ear, snap; a speech bubble with a finger icon pops on the snap) and presses; the FINGER bar fills to the SAME end mark", "jars", 34, False, True),
              fr(2.3, "on 'about one' a single red ball drops into the FINGER jar (a brighter tink); hold 6 against 1, both bars equally full, 0.41 s; the move ends square on the jars", "jars", 34, False, True)],
    camera=dict(preset="orbit", params={"fov": 48, "height_m": 1.08, "dist_m": [1.22, 1.16], "a0": -16, "a1": 0, "lookH": 0.89},
                intent="LAB's move, second half, ending SQUARE on the jars. DIRECTOR: the arc runs into the owner's end framing (at = 1)"),
    rig="interiorWarm", rig_opts=G_LAB, practicals_on=P_LAB,
    near=["table", "jars"], props=["jar", "balls", "bars", "panel"],
    life=[LIFE["lamp"], LIFE["plant_leaf"], LIFE["lab_motes"], life("one red ball falls into the FINGER jar and settles", "local/red_balls", "one brighter glass 'tink'")],
    fx=[fx("local/speech_bubble", "a speech bubble with a finger icon pops on her snap", "loud", "a soft pop")],
    acting=[act("volunteer", "pointed", "one point-and-call in the true rhythm: arm straight on 'pointed', hand by the ear, snap on 'loud', then she presses; a small proud nod on 'one'", "calling", "her small 'fwip' and one firm click", 18)],
    captions={"mode": "script", "overrides": [{"word": "when", "text": "when they pointed"}, {"word": "and", "text": "and said it"}, {"word": "out", "text": "out loud:"}, {"word": "about", "text": "about 1."}]},
    sound=[("N: 'when they pointed and said it out loud: about one.'", "voice", "when", "voice", "voice"), ("the melody under the jars", "music", "when", "music", "synth")],
    notes="6 against 1 at phone size, both bars equally full. No digits, no percent chip.")
S["s20"] = dict(
    starts_on="A", transition_in="cut", location="from inside the doorway again (s15's camera)",
    framings=[fr(0.0, "near corner: the yellow suitcase; the boy's arm comes up and points at it once more (14 f), mouth shut, and holds; beyond: the tourist's BACK, shoulders shaking at his phone; the melody plays its last notes and stops, the music note goes out; the doors do not move in this shot", "suitcase", 40)],
    camera=dict(preset="pushIn", params={"fov": 52, "height_m": 1.15, "dist_m": [2.6, 2.2], "ease": "linear", "lookH": 1.2},
                intent="STATION's inside lens with a slow push. DIRECTOR: a 14 % push + a 5 deg arc"),
    rig="golden", rig_opts=G_WEST, practicals_on=[],
    near=["floor", "doorglass", "tactile"], props=["bag", "train"],
    life=[LIFE["walkers"], LIFE["motes"], LIFE["crow"], LIFE["vendled"]],
    fx=[fx("fx/debris", "a leaf crosses the doorway")],
    acting=[act("kid", "A", "his arm comes up and points at the bag once more (14 f) and holds, mouth shut", "worriedB", "his small 'fwip'", 14),
            act("tourist", "finger", "his back to it, shoulders shaking at his phone", "laughBig", None, 20)],
    captions={"mode": "script", "overrides": [{"word": "A", "text": "A finger"}, {"word": "and", "text": "and a shout"}, {"word": "drag", "text": "drag your mind"}]},
    sound=[("N: 'A finger and a shout drag your mind' (the melody stops before 'drag')", "voice", "A", "voice", "voice"), ("the melody's last notes; then it stops", "music", "A", "music", "synth")],
    notes="The why, said once, over the man whose mind needs dragging back; it echoes 'a finger and a shout' (v3_n05).")
S["s21"] = dict(
    starts_on="back.", transition_in="cut", location="the cab at station B, right side",
    framings=[fr(0.0, "CUT on 'back.'. A hold: the white glove already straight at the small DARK door lamp (its door pictogram >= 6 % of the frame width, at his fingertip); his eyes on it; his left hand on the handle; he says nothing; quiet for 0.40 s, then the door chime starts outside", "driver", 55, False, True)],
    camera=dict(preset="lockedWithDrift", params={"fov": 52, "height_m": 1.3, "dist_m": [1.8, 1.75], "lookH": 1.1},
                freeze=True, freeze_reason="script: 'a hold' of 1.0 s, the held breath before the payoff (SCRIPT_v3 row v3_n14 / outline v3_s21); a breath of push only",
                intent="TRAIN's lens from across the cab: a HOLD with a breath of push (the script's held breath before the payoff: slow on purpose)"),
    rig="golden", rig_opts=G_CABB, practicals_on=P_CAB,
    near=["desk", "windscreen"], props=["cabkit"],
    life=[LIFE["watch"], life("platform people pass the side window", "cards/crowd"), life("dust motes in the windscreen sun", "fx/motes")],
    fx=[fx("fx/motes", "dust in the cab sun")],
    acting=[act("driver", "back.", "the glove already straight at the dark door lamp, eyes on it, perfectly still; he says nothing; his left hand on the handle", "focus", None, 24)],
    captions={"mode": "script", "overrides": [{"word": "back.", "text": "back."}]},
    sound=[("N: 'back.'; then the cab is QUIET for 0.40 s; the door chime starts outside", "voice", "back.", "voice", "voice")],
    notes="Fact guards 4 + 5: he closes nothing and his hand is never on screen during the wait inside the payoff call; the lamp is only ever seen dark.")
S["s22"] = dict(
    starts_on="Doors#2", transition_in="cut", location="platform B, knee-high along the car side: THE PAYOFF (s09's framing exactly)",
    framings=[fr(0.0, "the doors are already sliding; in front, the tourist, his back to the train, giggling at his phone; 'Doors...' is heard from the cab over this picture; the doors meet with the yellow suitcase behind car 1's door glass", "train", None, True),
              fr(1.5, "the red car-side lamps go out; '...closed!'; the train starts to glide; the boy and the suitcase behind the glass", "train", None, True)],
    camera=dict(preset="lowWideTrack", params={"fov": 58, "height_m": 0.55, "dist_m": [3.2, 2.7], "side": [-0.45, 0.05], "ease": "inOut", "lookH": 1.3},
                intent="the SAME lens and move as s09 (the plant)"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["slabs", "tactile", "carside"], props=["train", "bag"],
    life=[LIFE["doorleaves"], LIFE["sidelamps"], LIFE["walkers"], LIFE["leaves"]],
    fx=[fx("fx/debris", "dust lifts along the platform edge as the train moves")],
    acting=[act("tourist", "Doors#2", "his back to the train, giggling helplessly at his phone, behind the yellow line", "laughBig", "his helpless giggle (v3_x02)", 20, "voice"),
            act("driver", "Doors#2", "unseen: 'Doors...' is heard over the platform after the doors are SEEN sliding; '...closed!' only after the leaves have met and the lamps are out", "calm", "D: '[calmly] Doors... closed!' (from the cab)", 14, "voice"),
            act("kid", "closed!#2", "behind the door glass beside the suitcase, his finger on it, looking at the tourist", "worriedB", None)],
    captions={"mode": "script", "overrides": [{"word": "Doors#2", "text": "DOORS..."}, {"word": "closed!#2", "text": "...CLOSED!"}]},
    sound=[("the rubber thump lands on the bag's doors; the motor whine from zero as it glides", "music", "closed!#2", "foley", "lib")],
    notes="Payoff 1: the door plant and the bag plant; 'It stays.' comes true. The driver is not on screen at any point of the call. Muted test: nobody may answer 'the driver closed the doors'.")
S["s23"] = dict(
    starts_on="Bag#2", transition_in="cut", location="platform B, tracking car 1's door window as it glides toward the tourist",
    framings=[fr(0.0, "the boy, one hand on the suitcase handle, his mum's hand on his shoulder, does the full point at the suitcase beside him: arm on 'Bag', hand to the ear, snap on 'check!'", "kid", 50),
              fr(0.9, "the tourist's whole head at the frame edge: it starts to turn ON 'check!' and his grin drains; the boy pushes his cap up with the pointing hand (13 f), chin up", "tourist", 45)],
    camera=dict(preset="followSide", params={"fov": 55, "height_m": 1.25, "dist_m": [2.5, 2.5], "walk_mps": 1.0, "lookH": 1.3},
                intent="STATION's truck with the door window (it left 0.62 s before the cut); it must hold the tourist's whole head from ~0.9 s"),
    rig="golden", rig_opts=G_BAG, practicals_on=[],
    near=["carside", "doorglass", "slabs"], props=["train", "bag"],
    life=[LIFE["pass"], LIFE["mum"], LIFE["motes"], LIFE["leaves"]],
    fx=[fx("fx/debris", "dust along the edge")],
    acting=[act("kid", "Bag#2", "the full point at the suitcase in the driver's exact rhythm: arm on 'Bag', ear, snap on 'check!'; then the pointing hand shoves his cap up (13 f), chin up", "proud", "KID: '[proudly] Bag... check!' (mixed clean though he is behind glass)", 18, "voice"),
            act("tourist", "check!#2", "his head starts to turn ON the word; the grin drains to a blank", "blankDrop", None, 14),
            act("kid_mum", "Bag#2", "her hand on his shoulder, a proud smile", "warm", None)],
    captions={"mode": "script", "overrides": [{"word": "Bag#2", "text": "BAG... CHECK!"}]},
    sound=[("the leaving train: the whine climbing, rail joints speeding up", "music", "Bag#2", "foley", "lib")],
    notes="Payoff 2: the boy adds the shout to the finger and the shout turns his head, one train too late. The tourist never walks beside the moving train.")
S["s24"] = dict(
    starts_on="Bag#3", transition_in="cut", location="platform B: FRAME 0's camera, 1.9 s earlier",
    framings=[fr(0.0, "the door window with the yellow suitcase is already in the frame behind him and slides left; his face follows it; his phone hand sinks; 'Bag...': the arm comes up and points (18 f); the beat: his hand draws back beside his ear", "tourist", 58),
              fr(1.35, "'gone.': the arm sags forward for 12 f, elbow soft, to ~60 % of full stretch, then locks out straight over the last 6 f; the film ends 2 f before it lands; the next frame is FRAME 0", "tourist", 62)],
    camera=dict(preset="pushIn", params={"fov": 34, "height_m": 1.0, "dist_m": [4.0, 3.35], "ease": "linear", "lookH": 1.3},
                intent="STATION's frame-0 set-up, started one shot length earlier (face 16 % -> 19 %). DIRECTOR: the same tilt as frame 0 and a 3 deg pan with the door window that ends exactly on frame 0's aim"),
    rig="golden", rig_opts=G_F0, practicals_on=[],
    near=["carside", "doorglass", "slabs"], props=["train", "bag"],
    life=[LIFE["pass"], LIFE["mast_shadow"], LIFE["motes"], LIFE["crow"]],
    fx=[fx("fx/debris", "two dry leaves lifted by the leaving train")],
    acting=[act("tourist", "Bag#3", "his face follows the window; the phone hand sinks; the arm comes up on 'Bag...' (18 f); hand by the ear on the beat; on 'gone.' a 12 f sag to 60 %, then the 6 f lock-out (it lands on frame 2 of the next pass)", "blankDrop", "T: '[flatly] Bag... gone.' (no more than 6 dB under the narrator)", 18, "voice"),
            act("kid", "Bag#3", "in the door window: pointing at the suitcase again, carried off with it", "serious", None)],
    captions={"mode": "script", "overrides": [{"word": "Bag#3", "text": "bag... gone."}]},
    sound=[("the MUSIC STOPS DEAD on 'gone.'; the motor whine runs straight through the seam with no fade", "music", "gone.", "music", "synth")],
    notes="Payoff 3 + the loop: now HE points and calls, properly, one train too late. Nothing after the last word (0.10 s).")

ORDER = ["s01", "s02", "s03", "s03b", "s04", "s05", "s06", "s07", "s08", "s09", "s10", "s11", "s12", "s13", "s14", "s15", "s16a", "s16b", "s17", "s18", "s19", "s20", "s21", "s22", "s23", "s24"]
BG_PRESETS = ("orbit", "followSide")

def build_shot(sid):
    d, row, cm = S[sid], ROWS[sid], CAMS.get(sid, {})
    dur = (row["to"] - row["from"]) / 30.0
    cam = dict(d["camera"])
    med = cm.get("median_bg" if cam["preset"] in BG_PRESETS else "median")
    cam.setdefault("freeze", False); cam.setdefault("snap", False)
    cam["speed_pct_f"] = med
    cam["measured"] = dict(cm, src="camSpeedStats on the film's REAL camera (owner camera + film.ts director layer); briefs/v3/pointing/director/probe.mjs cams")
    acting, sound = [], []
    for k, a in enumerate(d["acting"]):
        a = dict(a); snd, src = a.pop("_sound"), a.pop("_src")
        acting.append(a)
        if snd: sound.append({"event": snd, "for": "acting:%d" % k, "on": a["on"], "kind": "voice" if src == "voice" else "foley", "source": "voice" if src == "voice" else "lib"})
    lifes = []
    for k, l in enumerate(d["life"]):
        l = dict(l); snd = l.pop("_sound"); lifes.append(l)
        if snd: sound.append({"event": snd, "for": "life:%d" % k, "on": "shot", "kind": "foley", "source": "lib"})
    fxs = []
    for k, f in enumerate(d["fx"]):
        f = dict(f); snd = f.pop("_sound"); fxs.append(f)
        if snd: sound.append({"event": snd, "for": "fx:%d" % k, "on": f["on"], "kind": "foley", "source": "lib"})
    for ev, for_, on, kind, source in d["sound"]:
        sound.append({"event": ev, "for": for_, "on": on, "kind": kind, "source": source})
    sound.append({"event": AMB[row["set"]], "for": "amb", "on": "shot", "kind": "amb", "source": "lib"})
    return {
        "id": sid, "outline_id": "v3_" + sid, "beat": row["beat"], "line": row["line"], "starts_on": d["starts_on"],
        "est_t0": round(row["from"] / 30.0, 3), "frames": [row["from"], row["to"]], "est_dur_s": round(dur, 2),
        "cut_rule": CUT_RULES[sid], "set": row["set"], "location": d["location"], "transition_in": d["transition_in"],
        **({"_transition": d["_transition"]} if "_transition" in d else {}),
        "framings": d["framings"], "camera": cam,
        "light": {"rig": d["rig"], "rig_opts": d["rig_opts"], "practicals_on": d["practicals_on"], "look": row.get("look")},
        "surfaces_near": [NEAR[n] for n in d["near"]], "props": [PROPS[p] for p in d["props"]], "vegetation": [],
        "life": lifes, "fx": fxs, "acting": acting, "boards": [], "captions": d["captions"], "sound": sound,
        "storyboard": {"frame_s": None, "still": None}, "notes": d["notes"],
    }

CUT_RULES = {
    "s01": "frame 0", "s02": "cut 1: the middle of the silence after 'not.'", "s03": "cut 2: one frame before 'finger'", "s03b": "0.04 s before 'Signal...' (the driver's face)", "s04": "0.10 s before 'He's'",
    "s05": "0.07 s before 'But'", "s06": "0.08 s before 'So'", "s07": "0.15 s after 'shout.'", "s08": "the end of 'off...'", "s09": "0.40 s after 'Bad suitcase.' (the doors a third shut)",
    "s10": "0.245 s before 'What's'", "s11": "0.145 s before 'Second'", "s12": "0.50 s before 'It stays.'", "s13": "0.25 s before 'Vending'", "s14": "0.33 s after 'check!' (the pose hold)",
    "s15": "s14 + 1.10 s (timeline.ts P01_LEN_S)", "s16a": "0.20 s before 'You'", "s16b": "0.30 s before the end of 'phone.' (the replay starts)", "s17": "one frame before 'tested'",
    "s18": "the end of 'looking...'", "s19": "the start of 'when'", "s20": "0.41 s after 'one.' (the 6-against-1 hold)", "s21": "one frame before 'back.'",
    "s22": "0.15 s before 'Doors...' (the doors seen sliding first)", "s23": "0.08 s before 'Bag... check!'", "s24": "0.445 s after 'check!'",
}

# ---------------------------------------------------------------- the bible
keep_sets = ["cab", "car", "jp_platform", "lab"]
sets = [s for s in old["sets"] if s["id"] in keep_sets]
for s in sets:
    if s["id"] == "jp_platform":
        s["place"] = "the Tokyo island platform at evening-rush golden hour, used as station A (shots 7-9) and station B (11-16b, 18, 20, 22-24 and 1). BUILT (STATION, kit/rail tokyoPlatform): seen from the platform the train leaves to SCREEN LEFT; the cab end (z < 9.5) is open to the sky; the vending corner under the kiosk awning; one green starting signal 48 m beyond the nose"
    if s["id"] == "lab":
        s["place"] = "the bright railway test lab as ONE picture, used twice: two glass jars square to the lens on a stage turned 52 deg to the window sun, a TRIES bar under each, the volunteer soft behind them at a box with one lamp and three buttons. No wide, no researcher (script v3)"
keep_cast = ["driver", "tourist", "kid", "kid_mum", "volunteer", "jp_commuters"]
cast = [c for c in old["cast"] if c["id"] in keep_cast]
shots = [build_shot(i) for i in ORDER]
est = LINT.get("est_s", 57.9)
E = TL["ev"]
bible = {
    "_doc": "DETAIL BIBLE for 'pointing', RE-CUT TO SCRIPT v3 by the DIRECTOR (2026-11-19 night). Source of truth for words, facts and guards: sound/pointing/SCRIPT_v3.md (LOCKED) + script_v3/shot_outline_v3.json; this file follows them shot by shot (25 shots, ids s01..s24 with s16a / s16b = the outline's ids without 'v3_'). GENERATED by briefs/v3/pointing/director/make_bible.py from the film's own clock (studio/src/videos3/pointing/timeline.ts): est_t0 / frames are the plan until words.ts lands, then re-run probe.mjs json + this script. Camera speeds are CORE camSpeedStats of the film's REAL cameras (the owners' cameras + the director's layer in film.ts). The v2 bible is kept as bible_v2.json. Plain-words companion: BIBLE_NOTES.md ('v3 changes' at the top).",
    "schema": "v3-bible/1", "slug": "pointing", "title": old["title"],
    "status": {"script": "locked (SCRIPT_v3, lead gate 22:35)", "voice": "recording (VOICE writes words.ts)", "storyboard": "none", "gate1": True, "gate2": False,
               "_note": "gates are LEAD gates (LEAD_DECISIONS 16:45). Timing = %s" % TL["source"]},
    "script": {"path": "sound/pointing/SCRIPT_v3.md", "lint_table": "briefs/v3/pointing/SCRIPT_v3_lint.md", "target_s": 65, "lint": LINT.get("verdict", "PASS") if "verdict" in LINT else "PASS",
               "_note": "script_lint.py on the v3 lines: PASS, 2 warnings (its pace model says %.1f s: the film adds 18 s of designed pauses; the answer lands at 77 %%, the lead's gate accepted it). Audits + verify_final.md: LOCKED, 17 of 17 blockers handled" % est},
    "voice": {
        "_doc": "locked = VOICE has written studio/src/videos3/pointing/words.ts; the film re-times itself from it (timeline.ts). Until then the plan (plan_words.ts).",
        "narrator": old["voice"].get("narrator"), "words_json": "sound/pointing/voice/words.json",
        # locked by itself as soon as the film's clock runs on VOICE's words.ts (timeline.ts WORD_SOURCE)
        "locked": TL["source"].startswith("words.ts"), "total_frames": TOTAL if TL["source"].startswith("words.ts") else None,
        "planned_total_frames": TOTAL, "tail_frames": int(round((TOTAL / 30.0 - est) * 30)),
        "_tail": "NOT a tail: the difference between the film's planned length (%d f = %.2f s, timeline.ts) and the linter's pace estimate (%.1f s), so the validator's shot durations are the plan's. The film ends 0.10 s after 'gone.'" % (TOTAL, TOTAL / 30.0, est),
        "model": "eleven_v4 with the v1 settings (lead decision 22:35); 8 v1 takes reused if the tone-colour test passes",
        "characters": [{"speaker": "N", "voice": "James"}, {"speaker": "D", "voice": "Masaki", "lines": 3}, {"speaker": "T", "voice": "Flackoo", "lines": 7}, {"speaker": "KID", "voice": "Kavya", "lines": 1}],
        "pause_plan": "SCRIPT_v3.md 4.2 (E = essential, N = nice); never time-stretch; over 66.0 s apply the cut order 4.3, over 70.0 s refuse",
    },
    "look": old["look"],
    "locations_reason": "Script v3 is ONE thread by the lead's decision (LEAD_DECISIONS 20:45): the tourist and his suitcase. Four built places (the island platform, the packed car, the cab, the lab jars) in 8 place + light states: platform frame-0 light, station A doorway, the plant / payoff side, station B doorway, the vending corner, from inside the doorway into the sun, the car, the cab running, the cab at the station, the lab. New York and the kitchen are OUT of the film (pinned comment).",
    "cast": cast, "sets": sets, "shots": shots,
    "hooks": {"A": "shot 1 is one shot to the first cut (~%.2f s)" % (ROWS["s02"]["from"] / 30.0), "B": "the same set-up with one same-axis 1.25x punch-in on 'He' (%.2f s), his eyes at the same screen place" % E["punchIn"],
              "how": "film.ts reads inputProps.kit.hook: kit_render --props '{\"hook\":\"B\"}' --shots s01 --out out/pointing_hookB/", "pick": "the LEAD picks after auditing both rendered openings"},
    "music": {
        "mood": "curious, crisp and playful: clockwork pizzicato + marimba; the 'call' motif is two notes, low-high, like a point and a snap; never a Japanese pastiche; NO New York section",
        "changes": [
            {"on": "His", "what": "NO music 0 - first cut: the motor whine at level from frame 1, one rail click on frame 2 with the arm, the narrator"},
            {"on": "All", "what": "the pizzicato motif enters ON cut 1; his laugh 12 dB under the narrator"},
            {"on": "green!", "what": "a two-note marimba hit exactly on every call-out snap ('green!', 'closed!', 'check!')"},
            {"on": "Stay.", "what": "a cheeky pizzicato tip-toe for the bag plant; one held note under 'It stays.'"},
            {"on": "check!#1", "what": "2.78 s without a voice, designed: the boy's small higher 'fwip', one held plucked note, dead air on the 0.7 s look, his warm chuckle into the line"},
            {"on": "You", "what": "the score thins to a pad; the phone plays only a wordless giggle under the narrator"},
            {"on": "Japan's", "what": "THE DEPARTURE MELODY: an original 5.5 s phrase played twice (11.0 s; never a real one, never a pastiche), faint under the jars, louder with platform sound in the cutaway; six ball tinks on its pulses; it stops before 'drag your mind back.'"},
            {"on": "back.", "what": "the cab is quiet for 0.40 s; then the door chime outside"},
            {"on": "gone.", "what": "STOP dead on 'gone.'"},
        ],
        "end": "the music stops dead on 'gone.'; the motor whine runs straight through the loop seam with no fade; 'gone.' ends 0.10 s before the seam; the rail click and 'His' land 0.07 s after it",
    },
    "loop": {
        "frame0": "s01 frame 0: platform B, low gold sun; the tourist (right half), stunned, his straight arm landing on frame 2, the fingertip at the yellow suitcase behind car 1's sliding door window (left half); the motor whine at level",
        "last": "s24: THE SAME camera set-up %.2f s earlier (one continuous shot across the seam): the door window slides from behind him to his fingertip; 'Bag...' arm up, the ear, 'gone.' a 12 f sag then the 6 f lock-out; the film ends 2 f before it lands: frame 0 is simply the next frame" % ((ROWS["s24"]["to"] - ROWS["s24"]["from"]) / 30.0),
        "L_s": round(TOTAL / 30.0, 3),
        "for_the_builders": "STATION, TRAIN and CAST run shot 1 as the continuation of the last shot (film time + L; L = timeline.ts `L`), so the train's run, the cast beats, the dust and the birds are the same on both sides of the seam",
    },
    "events": {k: round(v, 3) for k, v in E.items()},
    "kit_requests": [k for k in old.get("kit_requests", []) if not any(x in json.dumps(k) for x in ("ny_", "New York", "kitchen", "stove", "NYC"))],
    "fact_guards": [
        "1. The number is always a ratio ('for every six ... about one'); the two TRIES bars show the same number of tries; no digits on the bars; no '-85 %'. Source: Japan's Ministry of Health, Labour and Welfare safety glossary (the 1994 Railway Technical Research Institute test: 2.38 % with neither, 1.0 % calling only, 0.75 % pointing only, 0.38 % both, 'about one-sixth') https://anzeninfo.mhlw.go.jp/yougo/yougo72_1.html",
        "2. The narrator never says the driver points at nothing. Only the tourist says it, and the green lamp is on screen, readable (core >= 18 px, halo >= 40 px at 1080 x 1920), beside the fingertip, from the cut to the cab.",
        "3. No lamp blinks unless the doors are moving, and the lamp above the door is never in frame (every doorway shot is framed below the door header). The departure melody (and its pictogram) is the clock.",
        "4. The driver never closes the doors. The chime and the door movement always start before his word and are SEEN before it; in the payoff 'Doors...' is heard over the platform picture, never on his; his left hand stays on the handle. Status words come only after the doors have met and the side lamps are out. ONE door speed: 1.3 s open to shut, in the plant and in the payoff. Sources: ja.wikipedia 車側灯 (the red car-side lamp stays lit while a door is not closed), ja.wikipedia 鉄道合図 section 知らせ灯式 (the driver confirms the cab lamp that shows all doors closed); JTSB RI2015-3-1e only for 'the CONDUCTOR works the doors'. The spoken English call is dramatized.",
        "5. Every call keeps the true rhythm: the name with the point, the hand by the ear 0.35-0.45 s, the snap on the status word. No gesture under 12 frames. No call under 1.3 s. The driver's hand is never on screen during the 1.0 s wait inside the payoff call. The vending take's beat (0.24 s) and the kid's (0.31 s) get silence added inside, never a squeeze.",
        "6. The signal is ONE glowing green lamp with no readable head, on a dark background, until the lamp order is checked on a photograph (STATION checked ja.wikipedia's diagram: green on top of the 3-lamp head).",
        "7. 1,067 mm gauge, trains on the left track, the driver and the signals on the left, no bullet train.",
        "8. 'a thousand people': a 10-car commuter set is rated for 1,582 (ja.wikipedia E233 series); ours is a generic 10-car train, drawn packed.",
        "9. v3_n11 / v3_n14 are a story event and a figure of speech: not claimed as the railway test's finding (Wikipedia 'Pointing and calling': 'helps with focus'; nippon.com g02575).",
        "NOT claimed anywhere: how old the habit is, how often a driver does it, that it prevents crashes, that the driver works the doors, that a driver says 'Doors... closed!' out loud, any New York number or year, any count of tries.",
    ],
    "culture_guards": [
        "No Japanese text, no logos, no brands; pictograms and digits only; 'NEW YORK' on the shirt is the only word in the world.",
        "No eating, makeup or phone calls on the train. The late salaryman gives up; nobody rushes the doors; no music sting on the sleeping or the late salaryman.",
        "The tourist is cheerful and never rude to staff: he never taps the glass and never blocks the driver; he stays behind the yellow line (check shots 13, 16a/16b and 22 on the storyboard), never touches the train, never walks beside it while it moves. His mock call is stiff and too loud, never a put-on accent.",
        "The boy is with his mum in every shot he is in as a whole figure (2, 4, 6-14, 16a, 16b, 22, 23); her hand is on him whenever he is near the open doorway (7, 8, 11, 12, 14).",
        "Commuters step politely round the suitcase. An original departure melody, never a real one, never a pastiche. The joke is on the tourist every time.",
    ],
    "sources": [
        "https://anzeninfo.mhlw.go.jp/yougo/yougo72_1.html", "https://en.wikipedia.org/wiki/Pointing_and_calling", "https://www.nippon.com/en/japan-topics/g02575/",
        "https://ja.wikipedia.org/wiki/JR東日本E233系電車", "https://ja.wikipedia.org/wiki/車側灯", "https://ja.wikipedia.org/wiki/鉄道合図", "https://jtsb.mlit.go.jp/eng-rail_report/English/RI2015-3-1e.pdf",
        "https://www.mentalfloss.com/article/79767/what-are-subway-conductors-always-pointing (pinned comment only)",
    ],
    "seven_beats_that_must_read": ["frame 0 (0.25 s flash test: a man pointing at a suitcase on a train; the yellow suitcase the one focal colour)", "shot 2's jump back in time (the matched face + the suitcase at his knee)",
                                   "the no-look foot hook (s05)", "the catch at the door (s08)", "the boy's second point (s14, 1.10 s)", "the tourist's 0.7 s look that does not see (s15)", "the two TRIES bars at the 6-against-1 hold (s19)"],
    "owner_questions": [],
    "CHANGES": old.get("CHANGES", []) + [{"when": "2026-11-19 23:45", "who": "DIRECTOR", "what": "RE-CUT to SCRIPT v3 (LOCKED 22:35): 25 shots / 4 sets (cab, car, jp_platform, lab); New York, the kitchen, the lab wide, the thumbs-up, the phone UI and the '-85 %' chip are out; frame 0 = the outcome (the tourist and the suitcase leaving), the last shot = frame 0's camera one shot length earlier; cameras measured on the film's real cameras; fact + culture guards and sources from SCRIPT_v3 section 6; both hook exports as a film prop"}],
}
json.dump(bible, open(os.path.join(B, "bible.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("bible.json: %d shots, %d sets, %d cast, %d framings, %d f = %.2f s" % (len(shots), len(sets), len(cast), sum(len(s["framings"]) for s in shots), TOTAL, TOTAL / 30.0))

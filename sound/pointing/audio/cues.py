# THE CUE SHEET of "Why Japanese Train Drivers Point at Nothing" (script v3).
# One row per sound EVENT: when (an anchor on a voice line, a word or a shot: tl.py), what is heard (a sound of foley.py),
# how loud (LU under the voice), where (pan), which picture action it belongs to, and the feeling it carries.
# No row holds an absolute time: a new voice take or a re-cut moves every sound with its picture.
#   t     anchor expression (seconds). A value inside kw that starts with "=" is an anchor expression too.
#   lv    the event's loudest 0.4 s, in LU under the voice's own loudness (so -12 is a foreground effect, -26 a detail)
#   cut   it must be gone by this moment (a picture cut it cannot cross)
#   gate  it is only HEARD from this moment (a sound that began before the cut we enter on)
#   like  use the same gain as that other cue (the plant's departure is the first half second of the payoff's)
#   bus   sfx (default) or amb
# To move a cue after the animation lands: picture_events.json {"cue id": seconds | "anchor expression" | null (mute)}.
import json
import os
import numpy as np
import tl
from dsp import SR, ns, st, dbg, pan as _pan, fades, momentary_max, lp
import foley

HERE = os.path.dirname(os.path.abspath(__file__))
PE_JSON = os.path.join(HERE, "picture_events.json")
CREST = 14.0


def C(id, t, snd, lv, what, feel="", **o):
    kw = o.pop("kw", {})
    return dict(id=id, shot=id.split(".")[0], t=t, snd=snd, lv=lv, what=what, feel=feel, kw=kw, pan=o.pop("pan", 0.0), cut=o.pop("cut", None),
                gate=o.pop("gate", None), like=o.pop("like", None), bus=o.pop("bus", "sfx"), soft_lp=o.pop("lp", None))


# PICTURE ANCHORS (2026-11-20): the film's own events and the cast's own moves, read from the director's timeline.ts and
# CAST's beat table by tl.py (film_clock.mjs). EVT('name', fallback) = EV.name; CAST(who, move, cue, part, fallback) = when
# that move lands (part: lock / f0 / out / ear / snap / push). The fallback (the old anchor) is used only when the film's
# clock cannot be read; tl.summary() says so loudly.
GLIDE_A = "EVT('glideA', v3_d02.e + 0.075)"          # the plant: the train starts to glide
GLIDE_B = "EVT('glideB', v3_d03.e + 0.085)"          # the payoff: the train starts to glide
DOORS_A = "EVT('chimeA', v3_t02.e)"                  # the plant: the nod; chime and doors start together
DOORS_B = "EVT('chimeB', v3_n14.e + 0.40)"           # the payoff: after the cab's 0.40 s of quiet
DOOR_T = 1.30                           # one door speed for the plant and the payoff (fact guard 4; timeline.ts DOOR_CLOSE_S)
OPEN_T = 1.50                           # the doors OPEN in 1.5 s (sets/jp_platform.ts doorCycle dur, sets/train_plan.ts openDur)
STOP_A = "EVT('stopA', s07.a + 0.14)"                # station A: the stop (the platform set's arriveAt); doors open 0.5 s later
OPEN_B = "EVT('doorsOpenB', s11.a + 0.10)"           # station B: the doors start to open
# the snaps (the music's CALL lands on the same moments: score.py imports these)
SNAP_D01 = "CAST('driver', 'call', 'signal', 'snap', v3_d01:green.s + 0.03)"
SNAP_S06 = "CAST('driver', 'call', 'checks', 'snap', s06.a + 1.10)"
SNAP_S06K = "CAST('kid', 'call', 'checks', 'snap', s06.a + 1.55)"
SNAP_S08 = "CAST('kid', 'point', '@s08-3', 'lock', s08.a + 0.38)"
SNAP_T05 = "CAST('tourist', 'call', 'vending', 'snap', v3_t05:check.s + 0.03)"
SNAP_S14 = "CAST('kid', 'urgent', '@s14+2', 'lock', s14.a + 0.33)"
SNAP_S19 = "CAST('volunteer', 'call', 'pointed', 'snap', v3_n13:out.s + 0.03)"
SNAP_K01 = "CAST('kid', 'call', 'bag#2', 'snap', v3_k01:check.s + 0.03)"
CREEP = "EVT('bagCreep', v3_n04.s + 1.45)"           # the suitcase creeps (to EV.footHook)
HOOK = "CAST('tourist', 'hook', 'behind-4', 'lock', v3_n04.s + 2.35)"   # the sneaker reaches the wheel
HOOK0 = "CAST('tourist', 'hook', 'behind-4', 'f0', v3_n04.s + 2.05)"    # the hook's first frame (the drag is 14-24 f after it)
BRAKE = "EVT('brake', v3_n05.s + 1.40)"
BUMP = "EVT('bagBump', v3_n05.s + 1.95)"
PATS = "CAST('tourist', 'pat', 'stay#1-4', 'lock', v3_t04:stay.e + 0.02)"

CUES = [
    # ---------------------------------------------------------------- s01  PLATFORM B: frame 0, the train pulling away (the loop lands here)
    C("s01.arm", "s01.a + 0.067", "fwip", -15, "his straight-arm point locks out (frame 2); the snap's air starts in the film's last frames", "shock", kw=dict(who="tourist", seed=3), pan=-0.25),
    C("s01.click0", "s01.a + 0.067", "rail_click", -11, "ONE crisp rail joint under the leaving car, with the arm and the word 'His'", "shock", kw=dict(seed=1, hard=1.2), pan=0.35),
    C("s01.click1", "s01.a + 0.60", "rail_click", -15, "the next bogie on the joint (the clicks speed up)", "", kw=dict(seed=2, pair=0.17), pan=0.4),
    C("s01.click2", "s01.a + 1.12", "rail_click", -15, "rail joint, faster", "", kw=dict(seed=3, pair=0.15), pan=0.45),
    C("s01.click3", "s01.a + 1.58", "rail_click", -16, "rail joint, the suitcase has left the frame; car after car streams past", "", kw=dict(seed=4, pair=0.13), pan=0.5),
    C("s01.click4", "s01.a + 1.98", "rail_click", -17, "rail joint", "", kw=dict(seed=5, pair=0.12), pan=0.5),
    C("s01.click5", "s01.a + 2.34", "rail_click", -18, "rail joint (he looks at us, blank)", "dry laugh", kw=dict(seed=6, pair=0.11), pan=0.5),
    C("s01.click6", "s01.a + 2.66", "rail_click", -19, "rail joint, the train's tail going", "", kw=dict(seed=7, pair=0.10), pan=0.55),
    C("s01.crow", "s01.a + 1.30", "crow", -23, "a far crow over the evening platform", "loss", kw=dict(seed=1, far=1.0, n_caws=2)),
    # ---------------------------------------------------------------- s02  PACKED CAR, one minute earlier
    C("s02.swing", "EVT('phoneSwing', v3_n03:at.s - 0.02)", "phone_swing", -18, "he swings his phone round toward the cab glass (on 'at a')", "glee", pan=-0.3),
    # ---------------------------------------------------------------- s03  CAB: the glove, 'Signal... green!'
    C("s03.rise", "s03.a + 0.02", "cloth", -25, "the white glove rising (40 % up at the cut): a cotton rustle", "puzzlement", kw=dict(kind="b", seed=1, dur=0.5, bright=0.5), pan=0.2),
    C("s03.reach", "CAST('driver', 'call', 'signal', 'out', v3_d01.s - 0.05)", "fwip", -22, "the arm reaches full stretch, the fingertip beside the green lamp", "", kw=dict(who="driver", seed=1, soft=0.6), pan=0.25),
    # ---------------------------------------------------------------- s03b  the driver's face, close (2026-11-20): the hand by his ear, THE SNAP toward the lens on "green!"
    C("s03b.hum", "s03b.a", "cab_hum", -31, "the instrument panel's hum, close to his face (the cab bed runs on through the cut)", "", kw=dict(dur="=s03b.b - s03b.a + 0.06"), bus="amb", cut="s03b.b + 0.03", gate="s03b.a"),
    C("s03b.ear", "CAST('driver', 'call', 'signal', 'ear', v3_d01:signal.e + 0.04)", "cloth", -27, "the hand draws back beside his right ear on the held beat", "", kw=dict(kind="a", seed=2, dur=0.26), pan=0.15),
    C("s03b.snap", SNAP_D01, "fwip", -9.0, "the white glove SNAPS out toward the lens on 'green!' (the signature sound: the sharpest sound of the opening after the voice)", "crisp order", kw=dict(who="driver", seed=2, crisp=1.0), pan=0.05),
    # ---------------------------------------------------------------- s04  CAR at the cab glass: 'He's pointing at nothing!'
    C("s04.jab", "CAST('tourist', 'jab', 'pointing#1-3', 'f0', v3_t01:pointing.s - 0.05) + 0.03", "cloth", -25, "his finger jabs toward the glass and stops short (no tap)", "mockery", kw=dict(kind="c", seed=3, dur=0.28), pan=-0.2),
    # ---------------------------------------------------------------- s05  CAR, the aisle: the suitcase wants to leave
    C("s05.creep", CREEP, "suit_roll", -19, "the train picks up speed: the yellow suitcase creeps backward on its spinner wheels", "a tease", kw=dict(dur="=max(0.35, EVT('footHook', v3_n04.s + 2.33) - " + CREEP + ")", kind="creep", env=(0.15, 0.6, 0.95), seed=1, ticks=14.0), pan=0.15),
    C("s05.hook", HOOK, "sneaker_hook", -14, "without looking, his sneaker hooks a wheel", "", kw=dict(seed=1), pan=0.1),
    C("s05.drag", HOOK0 + " + 14 / 30", "suit_roll", -20, "he drags it back with his foot", "", kw=dict(dur="=0.36", kind="floor", env=(0.9, 0.7, 0.0), seed=2, ticks=20.0), pan=0.05),
    C("s05.settle", HOOK0 + " + 25 / 30", "suit_stop", -23, "it settles at his knee", "", pan=0.0),
    # ---------------------------------------------------------------- s06  CAB looking back: the boy's first copy; the brake
    C("s06.point", "CAST('driver', 'call', 'checks', 'out', s06.a + 0.30)", "fwip", -22, "the glove points at the speedometer (soft, foreground, no call)", "charm", kw=dict(who="driver", seed=3, soft=0.6), pan=-0.3),
    C("s06.ear", "CAST('driver', 'call', 'checks', 'ear', s06.a + 0.72)", "cloth", -28, "the glove goes to the ear", "", kw=dict(kind="a", seed=4, dur=0.24), pan=-0.3),
    C("s06.snap", SNAP_S06, "fwip", -19, "the glove snaps", "", kw=dict(who="driver", seed=4, soft=0.3), pan=-0.3),
    C("s06.copy", SNAP_S06K, "fwip", -23, "behind the glass the boy copies it all a beat late: his first full copy", "charm", kw=dict(who="kid", seed=1, soft=0.6), pan=0.2),
    C("s06.brake", BRAKE, "brake_onset", -17, "the train brakes", "", kw=dict(seed=1, dur=1.3)),
    C("s06.roll", BRAKE + " + 0.05", "suit_roll", -21, "the suitcase rolls forward into the bottom of the window", "", kw=dict(dur="=max(0.25, " + BUMP + " - " + BRAKE + " - 0.03)", kind="floor2", env=(0.3, 1.0, 0.9), seed=3), pan=0.15, lp=3200),
    C("s06.tok", BUMP, "suit_bump", -17, "it bumps the wall under the boy: a soft 'tok'", "charm", kw=dict(seed=1, hard=0.5), pan=0.15),
    C("s06.cap", "CAST('kid', 'capDrop', 'finger#2+3', 'lock', v3_n05.s + 2.03)", "cap_drop", -21, "the jolt drops his too-big cap over his eyes", "charm", pan=0.2),
    C("s06.capup", "CAST('kid', 'capDrop', 'finger#2+3', 'push', v3_n05.s + 2.42)", "cloth", -29, "one finger pushes the cap up", "", kw=dict(kind="d", seed=5, dur=0.2), pan=0.2),
    # ---------------------------------------------------------------- s07  PLATFORM A: first stop; the suitcase tries to get off
    C("s07.stop", STOP_A, "arrive_stop", -13, "the train stops with a small jerk; the air lets go", "a held breath"),
    C("s07.chime", STOP_A + " + 0.50", "door_chime", -16, "the door chime (ours: two soft tones, twice)", "", kw=dict(seed=1)),
    C("s07.open", STOP_A + f" + 0.50 + {OPEN_T}", "door_slide", -14, "the doors slide open (1.5 s, 0.5 s after the stop: the platform set's door cycle)", "", kw=dict(dur=OPEN_T, closing=False, seed=1)),
    C("s07.pa", "s07.a + 0.25", "pa_murmur", -28, "a soft wordless announcement far down the platform", "", kw=dict(dur=2.3, seed=1), bus="amb"),
    C("s07.steps", "s07.a + 1.30", "steps_off", -19, "commuters step off", "", kw=dict(dur="=s08.a - s07.a - 1.30 + 0.9", seed=1), pan=-0.2),
    C("s07.roller", "s07.a + 1.55", "suit_roll", -25, "a commuter's own roller bag on the platform tiles (a suitcase recorded in a Tokyo station)", "", kw=dict(dur=1.7, kind="tile", env=(0.5, 1.0, 0.4), seed=6, ticks=0.0), pan=-0.6),
    C("s07.nudge", "v3_n07.s", "suit_nudge", -17, "a passing briefcase nudges the yellow suitcase", "alarm", pan=0.1),
    C("s07.trundle", "v3_n07.s + 0.12", "suit_roll", -15, "it trundles after the people on its spinner wheels, straight for the open door", "alarm", kw=dict(dur="=s08.a - v3_n07.s - 0.30", kind="floor2", env=(0.35, 0.8, 1.0), seed=4, ticks=22.0), pan=0.1),
    C("s07.strip", "s08.a - 0.20", "threshold", -15, "its front wheels reach the yellow floor strip", "alarm", kw=dict(dur=0.24), pan=0.1),
    # ---------------------------------------------------------------- s08  the doorway, closer: the boy's finger saves it
    C("s08.snap", SNAP_S08, "fwip", -12, "the boy snaps the full driver's point at the suitcase", "relief", kw=dict(who="kid", seed=2), pan=-0.3),
    C("s08.plate", "s08.a + 0.48", "threshold", -15, "the wheels creep onto the metal threshold", "alarm", kw=dict(dur="=max(0.3, v3_n08:saves.s - s08.a - 0.50)"), pan=0.15, cut="v3_n08:saves.s + 0.02"),
    C("s08.step1", "v3_n08:saves.s - 0.50", "step", -16, "two quick steps (1)", "", kw=dict(kind="sneaker", seed=1), pan=-0.35),
    C("s08.step2", "v3_n08:saves.s - 0.27", "step", -15, "two quick steps (2), the lunge", "", kw=dict(kind="sneaker", seed=2, hard=1.2), pan=-0.15),
    C("s08.catch", "v3_n08:saves.s", "suit_catch", -12, "he catches the handle, two wheels over the gap (on 'saves')", "relief", pan=0.1),
    C("s08.haul", "v3_n08:saves.s + 0.26", "threshold", -18, "he hauls it in over the plate", "", kw=dict(dur=0.42, back=True), pan=0.05),
    C("s08.down", "v3_n08.e - 0.03", "suit_bump", -19, "the suitcase back on the car floor", "", kw=dict(hard=0.3), pan=0.0),
    C("s08.wag", "CAST('tourist', 'wag', 'bad-5', 'f0', v3_t02:bad.s - 0.15) + 0.03", "cloth", -28, "he wags a finger at the suitcase like at a puppy", "a fond laugh", kw=dict(kind="a", seed=6, dur=0.5), pan=-0.1),
    C("s08.chime", DOORS_A, "door_chime", -14, "THE PLANT: the chime starts on the boy's nod, with the doors", "a neat click", kw=dict(seed=1)),
    C("s08.doors", DOORS_A + f" + {DOOR_T}", "door_slide", -12, "THE PLANT: both door leaves slide in and MEET (rubber thump)", "a neat click", kw=dict(dur=DOOR_T, closing=True, seed=2)),
    # ---------------------------------------------------------------- s09  PLATFORM A, the plant framing
    C("s09.run", DOORS_A + " + 1.18", "run_stop", -18, "the late salaryman stops short and gives up", "", kw=dict(seed=1), pan=-0.5),
    C("s09.walk1", "s09.a + 0.55 + 0.00", "step", -31.0, "a passer-by on the platform tiles, far (STATION's walkers)", "", kw=dict(kind="shoe", seed=21, hard=0.5), pan=0.60, lp=4500),
    C("s09.walk2", "s09.a + 0.55 + 0.52", "step", -32.0, "a passer-by on the platform tiles, far (STATION's walkers)", "", kw=dict(kind="shoe", seed=22, hard=0.5), pan=0.50, lp=4500),
    C("s09.walk3", "s09.a + 0.55 + 1.04", "step", -31.0, "a passer-by on the platform tiles, far (STATION's walkers)", "", kw=dict(kind="shoe", seed=23, hard=0.5), pan=0.40, lp=4500),
    C("s09.walk4", "s09.a + 0.55 + 1.56", "step", -32.0, "a passer-by on the platform tiles, far (STATION's walkers)", "", kw=dict(kind="shoe", seed=24, hard=0.5), pan=0.30, lp=4500),
    C("s09.walk5", "s09.a + 0.55 + 2.08", "step", -31.0, "a passer-by on the platform tiles, far (STATION's walkers)", "", kw=dict(kind="shoe", seed=25, hard=0.5), pan=0.20, lp=4500),
    C("s09.lamps", "EVT('lampsOutA', " + DOORS_A + " + 1.55)", "relay_click", -19, "the red car-side lamps go out: a small relay click", "a neat click", pan=0.3),
    C("s09.depart", GLIDE_A, "depart", 0, "the brake lets go and the train starts to glide (the motor's first notes)", "", kw=dict(total="=s10.a - (" + GLIDE_A + ") + 0.12", seed=1), like="s22.depart", cut="s10.a"),
    # ---------------------------------------------------------------- s10  CAR, moving: 'What's a finger gonna do?'
    C("s10.handle", "v3_t03.s - 0.12", "suit_stop", -27, "his other hand on the suitcase handle", "cocky", pan=0.2),
    # ---------------------------------------------------------------- s11  PLATFORM B: second stop; 'Stay.'
    C("s11.chime", OPEN_B, "door_chime", -16, "the door chime", "bounce", kw=dict(seed=2, n_rep=1)),
    C("s11.open", OPEN_B + f" + {OPEN_T}", "door_slide", -15, "the doors open (1.5 s, from EV.doorsOpenB, just after the cut)", "", kw=dict(dur=OPEN_T, closing=False, seed=3)),
    C("s11.pa", "s11.a + 0.2", "pa_murmur", -29, "a wordless announcement, far", "", kw=dict(dur=1.9, seed=2), bus="amb"),
    C("s11.wheel", "s11.a + 0.62", "suit_roll", -16, "he wheels the suitcase to the doorway", "bounce", kw=dict(dur="=max(0.4, v3_t04.s - s11.a - 0.72)", kind="floor", env=(0.7, 1.0, 0.45), seed=5, ticks=20.0), pan=0.1),
    C("s11.park", "v3_t04.s - 0.07", "suit_stop", -19, "he parks it on the yellow strip, just inside the doorway ('Stay.')", "mischief", pan=0.1),
    C("s11.pats", PATS, "pats", -15, "two pats on its handle, like a dog", "mischief", pan=0.1),
    C("s11.hop1", "v3_t04:right.s - 0.02", "step", -17, "he skips out (take-off)", "", kw=dict(kind="sneaker", seed=3), pan=-0.1),
    C("s11.hop2", "CAST('tourist', 'hop', 'right#1', 'lock', v3_t04.e + 0.06)", "step", -15, "he lands on the platform", "", kw=dict(kind="sneaker", seed=4, hard=1.2), pan=-0.4),
    C("s11.hop3", "CAST('tourist', 'hop', 'right#1', 'lock', v3_t04.e + 0.06) + 0.30", "step", -19, "one more step away", "", kw=dict(kind="sneaker", seed=1, hard=0.7), pan=-0.6),
    # ---------------------------------------------------------------- s12  the suitcase alone in the sun: 'It stays.'
    C("s12.tag", "s12.a + 0.22", "tag_flutter", -27, "the red tag on the handle ticks in the air", "dread", pan=0.1),
    C("s12.crow", "v3_n10.e + 0.18", "crow", -24, "a crow, far (the bag alone)", "dread", kw=dict(seed=2, far=1.0, n_caws=1)),
    C("s12.walk1", "s12.a + 0.25 + 0.00", "step", -32.0, "a passer-by far down the platform (the bag alone)", "", kw=dict(kind="shoe", seed=31, hard=0.5), pan=-0.60, lp=4500),
    C("s12.walk2", "s12.a + 0.25 + 0.55", "step", -33.0, "a passer-by far down the platform (the bag alone)", "", kw=dict(kind="shoe", seed=32, hard=0.5), pan=-0.47, lp=4500),
    C("s12.walk3", "s12.a + 0.25 + 1.10", "step", -32.0, "a passer-by far down the platform (the bag alone)", "", kw=dict(kind="shoe", seed=33, hard=0.5), pan=-0.33, lp=4500),
    C("s12.walk4", "s12.a + 0.25 + 1.65", "step", -33.0, "a passer-by far down the platform (the bag alone)", "", kw=dict(kind="shoe", seed=34, hard=0.5), pan=-0.20, lp=4500),
    C("s12.tag2", "v3_n10.e + 0.55", "tag_flutter", -28, "the tag again", "", kw=dict(seed=2), pan=0.1),
    # ---------------------------------------------------------------- s13  the vending machine: his mock call
    C("s13.hum", "s13.a", "vending", -21, "the drinks machine's compressor hum, close", "silly pride", kw=dict(dur="=s14.a - s13.a", seed=1, near=1.0), bus="amb", cut="s14.a", pan=0.35),
    C("s13.arm", "CAST('tourist', 'call', 'vending', 'out', v3_t05:vending.s + 0.20) - 0.17", "cloth", -22, "his arm goes out stiffly at the machine", "", kw=dict(kind="b", seed=7, dur=0.36), pan=0.1),
    C("s13.ear", "CAST('tourist', 'call', 'vending', 'ear', v3_t05:machine.e + 0.04)", "cloth", -25, "the hand to the ear on the beat", "", kw=dict(kind="a", seed=8, dur=0.24), pan=0.1),
    C("s13.hip", "s13.a + 0.40", "cloth", -28, "his hip swing as he plays the guard (CAST's LIFE block)", "silly pride", kw=dict(kind="c", seed=13, dur=0.34), pan=0.15),
    C("s13.bob", "CAST('tourist', 'call', 'vending', 'ear', v3_t05:machine.e + 0.04) + 0.30", "cloth", -29, "a head bob on the held beat", "", kw=dict(kind="d", seed=14, dur=0.22), pan=0.15),
    C("s13.roll", SNAP_T05 + " - 0.24", "cloth", -26, "he rolls his whole body into the snap", "silly pride", kw=dict(kind="b", seed=15, dur=0.26), pan=0.15),
    C("s13.walk1", "s13.a + 0.30 + 0.00", "step", -32.0, "a passer-by behind the machines, far", "", kw=dict(kind="shoe", seed=41, hard=0.5), pan=-0.50, lp=4500),
    C("s13.walk2", "s13.a + 0.30 + 0.55", "step", -33.0, "a passer-by behind the machines, far", "", kw=dict(kind="shoe", seed=42, hard=0.5), pan=-0.37, lp=4500),
    C("s13.walk3", "s13.a + 0.30 + 1.10", "step", -32.0, "a passer-by behind the machines, far", "", kw=dict(kind="shoe", seed=43, hard=0.5), pan=-0.23, lp=4500),
    C("s13.walk4", "s13.a + 0.30 + 1.65", "step", -33.0, "a passer-by behind the machines, far", "", kw=dict(kind="shoe", seed=44, hard=0.5), pan=-0.10, lp=4500),
    C("s13.snap", SNAP_T05, "fwip", -10, "the snap on 'check!' (his floppy sleeve: bigger and sillier than the driver's)", "silly pride", kw=dict(who="tourist", seed=1), pan=0.15),
    # ---------------------------------------------------------------- s14  the boy's second warning (no words)
    C("s14.hum", "s14.a", "vending", -31, "the machine, a few steps away now", "", kw=dict(dur="=s15.a - s14.a", seed=2, near=0.25), bus="amb", cut="s15.a", pan=-0.5),
    C("s14.step", "s14.a + 0.10", "step", -22, "the boy steps up beside the suitcase", "hope", kw=dict(kind="kid", seed=1), pan=-0.15),
    C("s14.snap", SNAP_S14, "fwip", -9, "the boy's own small, higher 'fwip': the full point, mouth shut", "hope", kw=dict(who="kid", seed=3), pan=-0.1),
    # ---------------------------------------------------------------- s15  from inside the doorway: he looks right at it
    C("s15.turn", "s15.a + 0.08", "cloth", -25, "the tourist turns his whole head", "", kw=dict(kind="c", seed=9, dur=0.32), pan=-0.2, lp=3500),
    C("s15.guns", "CAST('tourist', 'guns', 'this-8', 'lock', v3_t06.s - 0.10)", "fwip", -19, "he points back at the boy with both index fingers", "a groan and a laugh", kw=dict(who="tourist", seed=2, soft=0.7), pan=-0.2),
    C("s15.back", "v3_t06.e + 0.12", "step", -22, "he turns back to his phone", "", kw=dict(kind="sneaker", seed=2, hard=0.6), pan=-0.3, lp=3500),
    # ---------------------------------------------------------------- s16a / s16b  the orbit: eyes and mind
    C("s16a.hum", "s16a.a", "vending", -32, "the machine behind him", "", kw=dict(dur="=s17.a - s16a.a", seed=3, near=0.2), bus="amb", cut="s17.a", pan=0.5),
    C("s16a.roller", "s16a.a + 0.7", "suit_roll", -26, "a roller bag passes on the platform tiles behind him (recorded in a Tokyo station)", "", kw=dict(dur=2.6, kind="tile", env=(0.3, 1.0, 0.3), seed=7, ticks=0.0), pan=0.55),
    C("s16a.chirp", "s16a.a + 0.05", "guide_chirp", -30, "the platform's guide signal far away (our own electronic chirp)", "insight", kw=dict(seed=1)),
    C("s16a.step1", "v3_n11:it.e + 0.0", "step", -27, "a commuter passing behind him", "", kw=dict(kind="shoe", seed=1, hard=0.6), pan=0.6),
    C("s16a.step2", "v3_n11:it.e + 0.48", "step", -27, "a commuter passing", "", kw=dict(kind="shoe", seed=2, hard=0.6), pan=0.4),
    C("s16a.step3", "v3_n11:it.e + 0.97", "step", -28, "a commuter passing", "", kw=dict(kind="shoe", seed=3, hard=0.5), pan=0.2),
    C("s16a.giggle1", "CAST('tourist', 'laugh', '@s16a+6', 'f0', s16a.a + 0.20)", "giggle", -15, "he GIGGLES at his clip across the platform (CAST: laugh @s16a+6..36): his own unused take, far and dull, under the narrator", "a groan and a laugh", kw=dict(piece="a"), cut="s16a.a + 40 / 30"),
    C("s16a.giggle2", "CAST('tourist', 'laugh', '@s16a+92', 'f0', s16a.a + 3.07)", "giggle", -16, "he giggles again to the cut (CAST: laugh @s16a+92)", "", kw=dict(piece="b"), cut="s16b.a"),
    C("s16a.shake", "s16a.a + 40 / 30", "cloth", -29, "he shakes his head at his own clip, grinning (CAST: shake @s16a+40)", "", kw=dict(kind="c", seed=16, dur=0.3), pan=-0.1),
    C("s16a.blip", "s16a.a + 50 / 30", "lamp_bip", -34, "a tiny phone notification blip as he starts scrolling (thin, from his phone)", "", pan=-0.15, lp=3500),
    C("s16a.tap1", "s16a.a + 56 / 30", "button", -33, "his thumb taps the phone glass (scrolling, @s16a+50..92)", "", kw=dict(seed=1, soft=True), pan=-0.15, lp=5000),
    C("s16a.tap2", "s16a.a + 67 / 30", "button", -34, "thumb tap", "", kw=dict(seed=2, soft=True), pan=-0.15, lp=5000),
    C("s16a.tap3", "s16a.a + 77 / 30", "button", -33, "thumb tap", "", kw=dict(seed=3, soft=True), pan=-0.15, lp=5000),
    C("s16a.tap4", "s16a.a + 88 / 30", "button", -34, "thumb tap", "", kw=dict(seed=5, soft=True), pan=-0.15, lp=5000),
    C("s16a.walk1", "s16a.a + 1.60 + 0.00", "step", -32.0, "a second passer-by on the tiles, the other side", "", kw=dict(kind="shoe", seed=51, hard=0.5), pan=-0.60, lp=4500),
    C("s16a.walk2", "s16a.a + 1.60 + 0.50", "step", -33.0, "a second passer-by on the tiles, the other side", "", kw=dict(kind="shoe", seed=52, hard=0.5), pan=-0.50, lp=4500),
    C("s16a.walk3", "s16a.a + 1.60 + 1.00", "step", -32.0, "a second passer-by on the tiles, the other side", "", kw=dict(kind="shoe", seed=53, hard=0.5), pan=-0.40, lp=4500),
    C("s16a.walk4", "s16a.a + 1.60 + 1.50", "step", -33.0, "a second passer-by on the tiles, the other side", "", kw=dict(kind="shoe", seed=54, hard=0.5), pan=-0.30, lp=4500),

    C("s16b.wiggle", "CAST('tourist', 'wag', \"what's#2-4\", 'f0', v3_r01.s + 0.12) + 0.03", "cloth", -27, "he wiggles his finger along with his own voice from the phone", "a cheeky dare", kw=dict(kind="a", seed=12, dur=0.5), pan=-0.15),
    C("s16b.pa_on", "v3_n12.s - 0.09", "relay_click", -22, "the platform's speakers click on, a breath before the melody", "the comeback", pan=-0.3),
    C("s16b.crow", "v3_r01.e - 0.55", "crow", -27, "a crow, very far", "", kw=dict(seed=3, far=1.0, n_caws=1)),
    # ---------------------------------------------------------------- s17  THE LAB: six mistakes (balls and presses are added below, on the melody's pulses)
    # ---------------------------------------------------------------- s19  THE LAB: pointing and calling, about one
    C("s19.point", "CAST('volunteer', 'call', 'pointed', 'out', v3_n13:pointed.s + 0.02)", "fwip", -20, "the volunteer points at the lamp", "bright proof", kw=dict(who="lab", seed=1, soft=0.4), pan=0.1),
    C("s19.snap", SNAP_S19, "fwip", -16, "her snap on the call (true rhythm: point, ear, snap)", "", kw=dict(who="lab", seed=2), pan=0.1),
    C("s19.bubble", SNAP_S19 + " + 0.02", "bubble_pop", -18, "a speech bubble with a finger icon pops on the snap", "", pan=0.15),
    C("s19.press", "v3_n13:loud.e + 0.06", "button", -20, "she presses the button once", "", kw=dict(seed=1, soft=False), pan=0.1),
    C("s19.bip", "v3_n13:loud.e + 0.12", "lamp_bip", -24, "the lamp answers", "", pan=0.1),
    C("s19.bar", "v3_n13:when.s + 0.25", "bar_fill", -27, "the FINGER bar fills to the same end mark", "", kw=dict(dur="=max(0.8, v3_n13:loud.e - v3_n13:when.s - 0.25)", seed=2), pan=0.25),
    # ---------------------------------------------------------------- s20  the doorway: the boy points once more
    C("s20.arm", "CAST('kid', 'point', '@s20+5', 'lock', s20.a + 0.30)", "fwip", -18, "the boy's arm comes up and points at it once more, mouth shut", "a firm warning", kw=dict(who="kid", seed=4, soft=0.3), pan=0.3),
    C("s20.tag", "s20.a + 1.30", "tag_flutter", -29, "the red tag", "", kw=dict(seed=3), pan=0.35),
    # ---------------------------------------------------------------- s21  the cab at station B: the held breath
    C("s21.hum", "s21.a", "cab_hum", -30, "the held breath: the cab's instrument hum, close (the motor is still; the doors are outside)", "a held breath", kw=dict(dur="=s21.b - s21.a + 0.05", seed=2), bus="amb", cut="s21.b + 0.02"),
    C("s21.point", "s21.a + 0.06", "cloth", -29, "his white glove settles, pointing at the DARK door pilot lamp", "a held breath", kw=dict(kind="a", seed=17, dur=0.3), pan=0.2),
    C("s21.chime", DOORS_B, "door_chime", -24, "the door chime starts OUTSIDE (heard through the cab)", "a held breath", kw=dict(seed=1, muffled=True), cut="s22.a"),
    C("s21.doors", DOORS_B + f" + {DOOR_T}", "door_slide", -27, "the doors start with it, unseen", "", kw=dict(dur=DOOR_T, closing=True, seed=2), cut="s22.a", lp=700),
    # ---------------------------------------------------------------- s22  THE PAYOFF: the plant framing, the bag inside
    C("s22.chime", DOORS_B, "door_chime", -14, "the chime, as in the plant", "the blow", kw=dict(seed=1), gate="s22.a"),
    C("s22.doors", DOORS_B + f" + {DOOR_T}", "door_slide", -12, "the doors (already sliding) MEET with the yellow suitcase behind the glass", "the blow", kw=dict(dur=DOOR_T, closing=True, seed=2), gate="s22.a"),
    C("s22.pilot", "EVT('lampsOutB', " + DOORS_B + " + 1.60) + 5 / 30", "relay_click", -31, "the cab's door-closed pilot lamp lights (unseen here, about f1753): a soft relay tick through the car", "", pan=-0.2, lp=1800),
    C("s22.lamps", "EVT('lampsOutB', " + DOORS_B + " + 1.60)", "relay_click", -19, "the red car-side lamps go out", "", pan=0.3),
    C("s22.depart", GLIDE_B, "depart", -6.0, "the brake lets go; the train glides, the motor whine RISING, straight through the loop seam into frame 0 and on to the first cut", "the blow -> shock",
      kw=dict(total="=L + CUT1 - (" + GLIDE_B + ")", seed=1, roar_at="=L + 0.25 - (" + GLIDE_B + ")", roar_full="=L + 1.9 - (" + GLIDE_B + ")", fall_at="=L + 1.9 - (" + GLIDE_B + ")", fall_end="=L + 3.0 - (" + GLIDE_B + ")"), cut="L + CUT1"),
    # ---------------------------------------------------------------- s23  tracking the door window: 'Bag... check!'
    C("s23.click1", "v3_k01.s - 0.30", "rail_click", -20, "the first slow rail joint under the gliding car", "", kw=dict(seed=11, pair=0.30, hard=0.8), pan=0.2),
    C("s23.arm", "CAST('kid', 'call', 'bag#2', 'out', v3_k01:bag.s + 0.04)", "fwip", -23, "the boy's arm on 'Bag' (behind the door glass)", "delight", kw=dict(who="kid", seed=5, soft=0.7), pan=0.0),
    C("s23.snap", SNAP_K01, "fwip", -18, "his snap on 'check!': the tourist's head starts to turn on the word", "delight", kw=dict(who="kid", seed=6, soft=0.4), pan=0.0),
    C("s23.click2", "v3_k01.e + 0.16", "rail_click", -19, "rail joint, a little sooner", "", kw=dict(seed=12, pair=0.25, hard=0.9), pan=0.3),
    # ---------------------------------------------------------------- s24  frame 0's camera, 1.9 s earlier: 'Bag... gone.'
    C("s24.arm", "CAST('tourist', 'call', 'bag#3', 'out', v3_t07:bag.s + 0.30) - 0.40", "cloth", -23, "his arm comes up and points (18 frames)", "flat defeat", kw=dict(kind="b", seed=10, dur=0.42), pan=-0.25),
    C("s24.ear", "CAST('tourist', 'call', 'bag#3', 'ear', v3_t07:bag.e + 0.04)", "cloth", -27, "his hand draws back beside his ear", "", kw=dict(kind="a", seed=11, dur=0.24), pan=-0.25),
    C("s24.click", "v3_t07:bag.e + 0.20", "rail_click", -18, "rail joint, in the beat between 'Bag...' and 'gone.'", "", kw=dict(seed=13, pair=0.21), pan=0.35),
]


def melody_grid():
    """the departure melody's clock: it starts on EV.melody0 ('Japan's') and plays its phrase twice to EV.melody1, 12 pulses
    per phrase: THE SAME PULSE as the film's music-note pictogram (Captions.tsx MELODY_PULSE_S) and the lab's tinks
    (sets/lab.cams.ts LAB_CUES.pulse). Without the film's clock: fitted to stop just before 'drag'"""
    a = tl.EVT("melody0", tl.s("v3_n12"))
    if tl.FILM:
        pulse = float(tl.FILM.get("lab_pulse") or 5.5 / 12)
        return a, 12 * pulse, pulse
    end = tl.W("v3_n14", "drag")[0] - 0.08
    phrase = float(np.clip((end - a) / 2.0, 5.0, 6.2))
    return a, phrase, phrase / 12.0


def lab_cues():
    """the six red balls of the EYE jar, each ON a pulse of the melody, the sixth on 'looking...'; three button presses
    before each; the single ball of the FINGER jar on the pulse nearest 'one'"""
    a, phrase, pulse = melody_grid()
    lab = (tl.FILM or {}).get("lab")
    if lab:
        return film_lab_cues(lab, a, phrase, pulse)
    lk0, lk1 = tl.W("v3_n13", "looking")
    k6 = int(np.floor((min(lk1 - 0.12, tl.SHOT["s17"][1] - 0.2) - a) / pulse))              # the last pulse inside 'looking...'
    while a + (k6 - 5) * pulse < tl.SHOT["s17"][0] + 0.45 and k6 < 30:               # the first ball needs the jars on screen
        k6 += 1
    out = []
    balls = [a + (k6 - 5 + i) * pulse for i in range(6)]
    for i, tb in enumerate(balls):
        out.append(C(f"s17.ball{i + 1}", tb, "jar_ball", -13 - 0.3 * i, f"red ball {i + 1} of 6 drops into the EYE jar, on the melody's pulse" + (" (it lands on 'looking...')" if i == 5 else ""),
                     "bright proof", kw=dict(i=i, seed=1, fill=i), pan=-0.25))
        for j, off in enumerate((0.34, 0.22, 0.10)):
            if tb - off > tl.SHOT["s17"][0] + 0.08:
                out.append(C(f"s17.press{i + 1}{'abc'[j]}", tb - off, "button", -25, "she only looks and presses, in a fast run (three presses for each ball)", "", kw=dict(seed=3 * i + j), pan=0.1))
    out.append(C("s17.bar", tl.SHOT["s17"][0] + 0.35, "bar_fill", -27, "the EYE bar fills to its end mark", "", kw=dict(dur=max(0.8, balls[-1] - tl.SHOT["s17"][0] - 0.35), seed=1), pan=-0.25))
    one = tl.W("v3_n13", "one")[0] + 0.08
    k1 = int(round((one - a) / pulse))
    out.append(C("s19.one", a + k1 * pulse, "jar_ball", -11, "ONE red ball drops into the FINGER jar: a brighter tink (on 'about one', on the pulse)", "surprise", kw=dict(i=0, seed=9, bright=True), pan=0.25))
    return out, dict(start=a, phrase=phrase, pulse=pulse, end=a + 2 * phrase, balls=balls, one=a + k1 * pulse)


def film_lab_cues(lab, a, phrase, pulse):
    """the lab exactly as the picture plays it (sets/lab.cams.ts labPlan(), via the film's clock): the six tinks of the EYE
    jar, her run of presses (18 over the EYE bar's fill), the FINGER jar's single tink and its bar"""
    out = []
    balls = [float(x) for x in lab["eyeImpacts"]]
    for i, tb in enumerate(balls):
        out.append(C(f"s17.ball{i + 1}", tb, "jar_ball", -13 - 0.3 * i, f"red ball {i + 1} of 6 drops into the EYE jar, on the melody's pulse" + (" (it lands on 'looking...')" if i == 5 else ""),
                     "bright proof", kw=dict(i=i, seed=1, fill=i), pan=-0.25))
    for j, tp in enumerate(lab["presses"]):
        out.append(C(f"s17.press{j + 1:02d}", float(tp), "button", -25, "she only looks and presses, a fast run (the picture's 18 presses)", "", kw=dict(seed=j), pan=0.1))
    tA = float(lab["tA"])
    out.append(C("s17.bar", tA + 0.12, "bar_fill", -27, "the EYE bar fills to its end mark (from her first press to the sixth tink)", "", kw=dict(dur=max(0.8, balls[-1] - tA - 0.12), seed=1), pan=-0.25))
    one = float(lab["fingerImpact"])
    out.append(C("s19.one", one, "jar_ball", -11, "ONE red ball drops into the FINGER jar: a brighter tink (on 'about one', on the pulse)", "surprise", kw=dict(i=0, seed=9, bright=True), pan=0.25))
    return out, dict(start=a, phrase=phrase, pulse=pulse, end=a + 2 * phrase, balls=balls, one=one, fill_b=[float(x) for x in lab["fillB"]])


def all_cues():
    lab, grid = lab_cues()
    cues = [dict(c) for c in CUES] + lab
    if grid.get("fill_b"):                         # the FINGER bar as the lab set fills it (labPlan().fillB)
        for c in cues:
            if c["id"] == "s19.bar":
                c["t"] = grid["fill_b"][0]
                c["kw"] = dict(c["kw"], dur=max(0.8, grid["fill_b"][1] - grid["fill_b"][0]))
    tl.ENV.update(PULSE=grid["pulse"], MEL=grid["start"])
    over = json.load(open(PE_JSON, encoding="utf-8")) if os.path.exists(PE_JSON) else {}
    out = []
    for c in cues:
        if c["id"] in over:
            if over[c["id"]] is None:
                continue
            c["t"] = over[c["id"]]
            c["moved"] = True
        c["time"] = tl.ev(c["t"])
        c["kw"] = {k: (tl.ev(v[1:]) if isinstance(v, str) and v.startswith("=") else v) for k, v in c["kw"].items()}
        for k in ("cut", "gate"):
            c[k + "_t"] = tl.ev(c[k]) if c[k] is not None else None
        out.append(c)
    return sorted(out, key=lambda c: c["time"]), grid


def X(t):
    """film time -> the mix's own EXTENDED time: everything before the first cut lives AFTER the end of the film, so the
    last shot runs into shot 1 as one continuous piece of sound; mix.py folds it back onto 0..CUT1 at the end"""
    return t + tl.L if t < tl.CUT1 - 1e-9 else t


def render(cues, n_ext, vref):
    """render every cue into its bus (extended time); vref = the voice's loudness (LUFS). Returns {bus: (2, n_ext)}, rows."""
    bus = {"sfx": np.zeros((2, n_ext)), "amb": np.zeros((2, n_ext))}
    gains, rows = {}, []
    order = sorted(cues, key=lambda c: (c["like"] is not None, c["time"]))
    for c in order:
        res = foley.FN[c["snd"]](**c["kw"])
        x, lead = res if isinstance(res, tuple) else (res, 0.0)
        x = st(x)
        if c["soft_lp"]:
            x = lp(x, c["soft_lp"], 1)
        if c["like"]:
            g = gains[c["like"]]
        else:
            mm = momentary_max(np.concatenate([np.zeros((2, ns(0.4))), x, np.zeros((2, ns(0.4)))], axis=1))
            g = dbg(vref + c["lv"] - mm)
            pk = 20 * np.log10(np.abs(x).max() * g + 1e-12)          # a click is short: its 0.4 s loudness says little, so its PEAK is held
            if pk > vref + c["lv"] + CREST:                          # to CREST dB over the level asked for (the voice's own peaks sit ~10 dB over it)
                g *= dbg(vref + c["lv"] + CREST - pk)
        gains[c["id"]] = g
        x = x * g
        if c["pan"]:
            p = float(c["pan"])
            x = np.stack([x[0] * min(1.0, 1 - p), x[1] * min(1.0, 1 + p)])
        t0 = c["time"] - lead                                       # the sound's own first sample, film time
        # the home shot decides which side of the seam the cue lives on (a sound of shot 1 that starts just before 0 is the film's end)
        home = c["time"] if c["time"] >= 0 else 0.0
        te = (t0 + tl.L) if (home < tl.CUT1 - 1e-9) else t0
        if c["gate_t"] is not None:
            ga = X(c["gate_t"]) if c["gate_t"] >= tl.CUT1 or home < tl.CUT1 else c["gate_t"]
            k = ns(ga - te)
            if k > 0:
                x = x[:, k:]
                te = ga
                x = fades(x, 0.008, 0.0)
        if c["cut_t"] is not None:
            ce = c["cut_t"] if c["cut_t"] > tl.L else (X(c["cut_t"]) if home < tl.CUT1 else c["cut_t"])
            k = ns(ce - te)
            if k < x.shape[1]:
                x = fades(x[:, :max(0, k)], 0.0, 0.02) if k > ns(0.03) else x[:, :0]
        i = ns(te)
        a, b = max(0, i), min(n_ext, i + x.shape[1])
        if b > a:
            bus[c["bus"]][:, a:b] += x[:, a - i:b - i]
        rows.append(dict(id=c["id"], shot=c["shot"], t=round(c["time"], 3), frame=int(round(c["time"] * tl.FPS)), anchor=str(c["t"]), snd=c["snd"],
                         kw={k: (round(v, 3) if isinstance(v, float) else v) for k, v in c["kw"].items()}, lv=c["lv"], bus=c["bus"], pan=c["pan"],
                         starts=round(t0, 3), len=round(x.shape[1] / SR, 3), what=c["what"], feel=c["feel"], moved=bool(c.get("moved"))))
    rows.sort(key=lambda r: r["t"])
    return bus, rows


if __name__ == "__main__":
    cs, grid = all_cues()
    print(tl.summary())
    print(f"{len(cs)} event cues; melody {grid['start']:.2f} s, phrase {grid['phrase']:.3f} s, pulse {grid['pulse']:.4f} s; balls {[round(b, 2) for b in grid['balls']]}, the one {grid['one']:.2f}")
    for c in cs:
        print(f"  {c['time']:7.3f}  {c['id']:14s} {c['snd']:12s} {c['lv']:6.1f}  {c['what'][:90]}")

# p4 patch of sfx.py: the 24 new cue names of the final acting round, the Q1 chime ban for tings, the whip-pan peak
# frames, the breath before "Their bodies" (nothing starts in it), hop / land by their text, Hyman's S5 jaw drop softer.
import os

P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sfx.py")
s = open(P, encoding="utf-8").read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)


# 1. Q1: a sparkle / ting / ping is a chime: banned in Q1 by the quiz rule (the p4 hook wink at f 30)
rep('HARD_FORBIDDEN = {"rustle", "whoosh", "chime", "cloth", "leaf", "bill", "peg", "duck", "shimmer", "glint", "swish", "ding"}',
    'HARD_FORBIDDEN = {"rustle", "whoosh", "chime", "cloth", "leaf", "bill", "peg", "duck", "shimmer", "glint", "swish", "ding",\n'
    '                  "ting", "sparkle", "ping"}   # p4: the hook wink\'s sparkle ting (f 30) is a chime too: not in Q1')

# 2. whip pans: the animator lists the whoosh's PEAK frame in its text ("peaks on f 944"): the cue sits there
rep('''            c = dict(c)
            c["src"], c["n"], c["frame"] = src, k, float(c["frame"])
            c.setdefault("what", "")''',
    '''            c = dict(c)
            c["src"], c["n"], c["frame"] = src, k, float(c["frame"])
            c.setdefault("what", "")
            pk = re.search(r"peaks on f\\s*(\\d+)", c["what"]) if c["name"] == "whip_pan" else None
            if pk:                                  # p4: a whip-pan's whoosh is synced on its PEAK, on the cut frame
                c["frame"] = float(pk.group(1))''')

# 3. the breath before "Their bodies dodged it.": nothing starts in it (or just before it, where it would be cut)
rep('''        if c.get("merged_open"):
            row["status"], row["why"] = "merged", "the second squeeze of the frame-0 honk-honk (one event in the lead-in, over before 'Quick')"
            continue''',
    '''        if c.get("merged_open"):
            row["status"], row["why"] = "merged", "the second squeeze of the frame-0 honk-honk (one event in the lead-in, over before 'Quick')"
            continue
        if MIND_HUSH and rule["kind"] not in ("silent", "merged") and MIND_HUSH[0] - 0.15 <= T.fr(f) < MIND_HUSH[1]:
            row["status"], row["why"] = "rule", "the breath before 'Their bodies dodged it.' stays silent (it would start in it or be cut by it)"
            continue''')
rep('''STEP_DB = -27.0                    # a footstep at near = 0.8''',
    '''MIND_HUSH = mind_hush()            # p4: (start s, end s) of the breath before the mind-blow line
STEP_DB = -27.0                    # a footstep at near = 0.8''')

# 4. hop / land read the text: the clown's unicycle hop is a small springy boing, its landing a tyre thump + a squeak
rep('''    "hop": R(cls="swish", prio=2, level=-26.0, build=S("duck_cloth", 1, sync="peak", max_len=0.35), sound="a small jump swish"),''',
    '''    "hop": R(cls="swish", prio=2, level=-26.0, sound="a small jump swish (the unicycle's hop: a small springy boing)",
             build=lambda c, k: (E.smp("boing", 1 + k, semis=3.0, max_len=0.3), take_label("boing", 1 + k) + " (small, +3 st)") if "unicycle" in c["what"].lower()
             else (E.smp("duck_cloth", 1, sync="peak", max_len=0.35), take_label("duck_cloth", 1))),''')
rep('''    "land": R(cls="step", prio=3, level=-24.0, build=B_land, sound="she lands: two soft shoes"),''',
    '''    "land": R(cls="step", prio=3, level=-24.0, sound="a landing: two soft shoes (the unicycle: a tyre thump + a squeak)",
              build=lambda c, k: (E.mix_parts((E.smp("page_land", 0, semis=-6.0, lpf=2500.0), 0.0, 0.0), (E.smp("squeak", 3 + k, vary=0.5), 0.05, -6.0)),
                                  "fs745291 (-6 st) + a squeak") if "unicycle" in c["what"].lower() else B_land(c, k)),''')

# 5. the p4 names
rep('''    "petal_land": R(cls="tick", prio=2, level=-31.0, build=S("tick", 4, semis=2.0), sound="a tiny soft tick of the petal"),''',
    '''    "petal_land": R(cls="tick", prio=2, level=-31.0, build=S("tick", 4, semis=2.0), sound="a tiny soft tick of the petal"),
    # ---- p4: the final acting round (quiet, tasteful; no new generations)
    "cheek_puff": R(kind="silent", why="a look (his puffed cheeks): the 'phew' 5 frames later carries it"),
    "phew_blow": R(cls="vocal", prio=3, level=-28.0, build=S("man_sigh", 1, max_len=0.45, fade=(0.02, 0.15)), sound="his relieved 'phew' (a short breath out)"),
    "sly_hmm": R(kind="silent", why="'a tiny heh or nothing': nothing (it sits 8 frames before duck 2's window)"),
    "take_gasp": R(cls="tick", prio=3, level=-26.0, build=S("tick", 0, semis=4.0), sound="a tiny tick of his glasses jumping (no male gasp take; a female one would be wrong on Hyman)"),
    "take_boing": R(cls="boing", prio=4, level=-25.0, build=S("boing", 2, semis=2.0, max_len=0.3), sound="a small comic boing (his take)"),
    "cloth_grab": R(cls="cloth", prio=3, level=-25.0, build=S("bag_rustle", 0, max_len=0.3, fade=(0.005, 0.1)), sound="his hand grabs the bag's flap (a short crinkle)"),
    "timelapse_whoosh": R(cls="whoosh", prio=3, level=-28.0, build=S("cam_whoosh_m", 1, lpf=6000.0), sound="a soft whoosh of the time-lapse trails"),
    "phone_laugh": R(cls="vocal", prio=5, stack=True, level=-25.0, build=S("laugh_f", 0), post=lambda x: bp(x, 400.0, 2400.0, 2),
                     sound="a short laugh into her phone (muffled, phone band)"),
    "pen_tap": R(cls="tap", prio=3, gap=4, level=-27.0, build=S("tick", 2, semis=-2.0), sound="a pen tap on the clipboard"),
    "whip_pan": R(cls="swish", prio=3, level=-28.0, build=S("whoosh_body", 5, max_len=0.3, sync="peak", lpf=7000.0),
                  sound="a short soft air-swish on the whip-pan (its peak on the cut)"),
    "snap_zoom": R(kind="silent", why="the 4 f punch-in lands ON a character's word ('amazing!', 'guy!'): no sound over it"),
    "squint": R(kind="merged", why="carried by the '?' pop one frame later"),
    "glance": R(kind="silent", why="'a tiny chair creak / nothing': nothing"),
    "eye_pop": R(cls="boing", prio=5, level=-23.0, build=S("boing", 0, semis=4.0, max_len=0.25), sound="a cartoon eye-pop boing (small, high)"),
    "cheer": R(kind="silent", why="his silent cheer, 'under the voice': the hop's boing and the two honks carry his joy"),
    "phone_chatter": R(kind="loop", cls="murmur", min_near=0.3, level=-32.0, loop=("murmur", dict(band=(250.0, 1500.0))),
                       sound="muffled, wordless phone chatter"),
    "unicycle_off": R(cls="squeak", prio=4, level=-26.0, build=S("squeak", 1, semis=-2.0, vary=0.4), sound="a slow, dejected wheel creak"),
    "pigeon_strut": R(kind="silent", why="tiny claw taps under 'So Hyman tried something sneakier.': too small to hear; his own tiptoes carry the rhythm"),
    "reach": R(cls="swish", prio=3, level=-26.0, build=S("duck_cloth", 2, sync="peak", max_len=0.3), sound="a cloth swish as she reaches up"),
    "bill_pinch": R(cls="bill", prio=6, level=-18.0, sound="her fingers pinch the bill: a crisp paper snap + a small glint",
                    build=LAY(("bill_flick", 0.0, 0.0, 0, {}), ("glint", 0.01, -10.0, 0, {}))),
    "bill_tug": R(cls="bill", prio=5, level=-21.0, sound="a tug: a paper flap + the peg's creak",
                  build=LAY(("bill_flick", 0.0, 0.0, 1, {}), ("squeak", 0.03, -9.0, 5, dict(semis=-5.0, lpf=3500.0)))),
    "giggle": R(cls="vocal", prio=4, level=-24.0, build=S("laugh_f", 1, max_len=0.5), sound="a tiny delighted giggle"),
    "bubble_swell": R(cls="whoosh", prio=3, level=-29.0, build=S("whoosh_mind", max_len=1.0, fade=(0.1, 0.3)), send=0.12,
                      sound="a soft warm swell of the call bubble (slowed)"),
    "bill_flutter_slow": R(cls="bill", prio=4, level=-25.0, build=S("bill_flick", 2, vary=0.4), sound="a slowed paper flap in the gust"),''')

# 6. S5: Hyman's jaw drop lands on "suit." (6 f after the score's hit): softer there
rep('SHOT_DB = {("honk", "S1"): 6.5, ("bell_ring", "S1"): 2.7, ("unicycle_brake", "S1"): 4.0}',
    'SHOT_DB = {("honk", "S1"): 6.5, ("bell_ring", "S1"): 2.7, ("unicycle_brake", "S1"): 4.0,\n'
    '           ("jaw_drop", "S5"): -5.0}     # p4: Hyman\'s jaw drop in S5 sits on the word "suit.", 6 f after the score\'s hit')
open(P, "w", encoding="utf-8").write(s)
print("sfx.py patched")

"""v6b retakes (sound audit p2: M2, M3, m8). Same voice / model / settings as v6 (James, eleven_v4, similarity 0.75,
stability 0.5 or 0.35, neighbours as previous_text / next_text).
  r18   "You counted five phones. You saw the clown." as ONE chunk, n17 as context: low-mid start, builds, quick, playful
  r18c  the same, with n17 SPOKEN in the take (only n18 is used): the register connects by construction
  r19   "Did you see the money?", n18 as context: slow, sly, stress + highest pitch on MONEY, rising
  r05   "And the clown? You saw him, right?", context "How many? Five." / n06: a clear rising "right?"
  python make_jobs_v6b.py  -> jobs/v6b.json"""
import json

import v6_lib as L

T = L.TEXT
J = L.JAMES
N18, N19, N05 = T["n18"], T["n19"], T["n05"]
SPEC = [
    # folder, lines, prev, next, [(take, text, stability)]
    ("r18", ["n18"], T["n17"], T["n19"], [
        ("t1", "[playful] " + N18, 0.5),
        ("t2", "[playful] " + N18, 0.35),
        ("t3", "[teasing] " + N18, 0.5),
        ("t4", "[mischievously] " + N18, 0.5),
        ("t5", N18, 0.5),
        ("t6", "[amused] " + N18, 0.5)]),
    ("r18c", ["n17", "n18"], T["n15"] + " " + T["n16"], T["n19"], [
        ("t1", "[slowly] " + T["n17"] + " [playful] " + N18, 0.5),
        ("t2", "[slowly] " + T["n17"] + " [playful] " + N18, 0.35)]),
    ("r19", ["n19"], N18, None, [
        ("t1", "[slyly] Did you see the MONEY?", 0.5),
        ("t2", "[slyly] Did you see the MONEY?", 0.35),
        ("t3", "[mischievously] Did you see the MONEY?", 0.5),
        ("t4", "[teasing] Did you see the MONEY?", 0.5),
        ("t5", "Did you see the MONEY?", 0.5),
        ("t6", "[slyly] Did you see the... MONEY?", 0.5),
        ("t7", "[slowly] Did you see the MONEY?", 0.5)]),
    ("r05", ["n05"], T["n03"] + " " + T["n04"], T["n06"], [
        ("t1", "[teasing] " + N05, 0.5),
        ("t2", "[amused] And the clown? You saw him, RIGHT?", 0.5),
        ("t3", "[playful] And the clown? You saw him... right?", 0.5),
        ("t4", "And the clown? You saw him, right?!", 0.35)]),
]
jobs = []
for fi, (folder, lines, prev, nxt, takes) in enumerate(SPEC):
    for t, text, stab in takes:
        assert L.word_diff(" ".join(T[i] for i in lines), text) == [], (folder, t)
        jobs.append({"folder": folder, "take": t, "voice": J, "model": L.MODEL, "text": text, "stability": stab, "speed": 1.0,
                     "seed": 9000 + 20 * fi + int(t[1:]), "prev": prev, "next": nxt, "lines": lines, "round": "v6b"})
(L.HERE / "jobs" / "v6b.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(jobs), "jobs,", sum(len(j["text"]) for j in jobs), "characters")

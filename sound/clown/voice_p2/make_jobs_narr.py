"""Narrator take plan (James / eleven_v4): 14 chunks x 4 takes. Context (previous_text / next_text, not spoken) is the
neighbouring script lines, so every chunk is read as part of one story. Tags are one short word per beat (LESSONS 3).
Speed is not sent as a variable: eleven_v4 ignores it (same seed at 1.0 and 1.2 gave the same 2.23 s take).
  python make_jobs_narr.py   -> jobs/narr.json"""
import json

import v6_lib as L

T = L.TEXT
J = L.JAMES


def ctx(ids):
    return " ".join(T[i] for i in ids)


# chunk -> (lines, prev line ids, next line ids, [(take, text, stability)])
C = {
    "c01": (["n01"], [], ["n02"], [
        ("t2", "[excited] Quick test. Count the people on a phone.", 0.35),
        ("t3", "[playful] Quick test. Count the people on a phone.", 0.5),
        ("t4", "[excited] Quick test! Count the people on a phone!", 0.5)]),
    "c02": (["n02"], ["n01"], ["n03", "n04"], [
        ("t2", "[playful] Don't lose count.", 0.35),
        ("t3", "[whispers] Don't lose count.", 0.5),
        ("t4", "[teasing] Don't lose count.", 0.5)]),
    "c03": (["n03", "n04", "n05"], ["n01", "n02"], ["n06"], [
        ("t1", "[teasing] How many? [confident] Five. [amused] And the clown? You saw him, right?", 0.5),
        ("t2", "[teasing] How many? [confident] Five. [amused] And the clown? You saw him, right?", 0.35),
        ("t3", "[playful] How many? Five. And the clown? [amused] You saw him, right?", 0.5),
        ("t4", "How many? Five! And the clown? You saw him, right?", 0.5)]),
    "c04": (["n06"], ["n05"], ["n07"], [
        ("t1", "[intrigued] In a real experiment, most people on a phone call never saw him.", 0.5),
        ("t2", "[intrigued] In a real experiment, most people on a phone call never saw him.", 0.35),
        ("t3", "[incredulous] In a real experiment, most people on a phone call never saw him.", 0.5),
        ("t4", "[mysteriously] In a real experiment, most people on a phone call never saw him.", 0.5)]),
    "c05": (["n07"], ["n06"], ["s01"], [
        ("t1", "[playful] Psychologist Ira Hyman needed a distraction nobody could miss. Then a student told him:", 0.5),
        ("t2", "[playful] Psychologist Ira Hyman needed a distraction nobody could miss. Then a student told him:", 0.35),
        ("t3", "[amused] Psychologist Ira Hyman needed a distraction nobody could miss. Then a student told him:", 0.5),
        ("t4", "Psychologist Ira Hyman needed a distraction nobody could miss. Then a student told him:", 0.5)]),
    "c06": (["n08", "n09"], ["s01", "s02"], ["i01"], [
        ("t1", "[delighted] So for one hour, the clown rode circles in the middle of campus. Then his team asked people leaving:", 0.5),
        ("t2", "[delighted] So for one hour, the clown rode circles in the middle of campus. Then his team asked people leaving:", 0.35),
        ("t3", "[amused] So for one hour, the clown rode circles in the middle of campus. Then his team asked people leaving:", 0.5),
        ("t4", "[cheerful] So for one hour, the clown rode circles in the middle of campus! Then his team asked people leaving:", 0.5)]),
    "c07": (["n10", "n11"], ["h01", "p01"], ["n12"], [
        ("t1", "[incredulous] Even asked straight out, only one in four people on a call had seen him. [amused] Many spun around to look.", 0.5),
        ("t2", "[incredulous] Even asked straight out, only one in four people on a call had seen him. [amused] Many spun around to look.", 0.35),
        ("t3", "[surprised] Even asked straight out, only one in four people on a call had seen him. [laughing] Many spun around to look.", 0.5),
        ("t4", "Even asked straight out, only one in four people on a call had seen him! Many spun around to look.", 0.5)]),
    "c08": (["n12"], ["n10", "n11"], ["n13"], [
        ("t1", "[mysteriously] Here's the weird part: people listening to music noticed him.", 0.5),
        ("t2", "[mysteriously] Here's the weird part: people listening to music noticed him.", 0.35),
        ("t3", "[whispers] Here's the weird part: people listening to music noticed him.", 0.5),
        ("t4", "[intrigued] Here's the weird part... people listening to music noticed him.", 0.5)]),
    "c09": (["n13"], ["n12"], ["n14"], [
        ("t1", "[warmly] You see, a call pulls your mind toward someone who isn't there.", 0.5),
        ("t2", "[warmly] You see, a call pulls your mind toward someone who isn't there.", 0.35),
        ("t3", "[thoughtful] You see, a call pulls your mind toward someone who isn't there.", 0.5),
        ("t4", "You see, a call pulls your mind toward someone who isn't there.", 0.5)]),
    "c10": (["n14"], ["n13"], ["n15"], [
        ("t1", "[mischievously] So Hyman tried something sneakier. He hung dollar bills on a branch, right at head height.", 0.5),
        ("t2", "[mischievously] So Hyman tried something sneakier. He hung dollar bills on a branch, right at head height.", 0.35),
        ("t3", "[playful] So Hyman tried something sneakier. He hung dollar bills on a branch, right at head height.", 0.5),
        ("t4", "So Hyman tried something sneakier! He hung dollar bills on a branch, right at head height.", 0.5)]),
    "c11": (["n15", "n16"], ["n14"], ["n17"], [
        ("t1", "[amused] Nearly everyone ducked under it. On a phone? Only six in a hundred stopped for the money.", 0.5),
        ("t2", "[amused] Nearly everyone ducked under it. On a phone? Only six in a hundred stopped for the money.", 0.35),
        ("t3", "[playful] Nearly everyone ducked under it. [teasing] On a phone? Only six in a hundred stopped for the money.", 0.5),
        ("t4", "Nearly everyone ducked under it. On a phone? Only six in a hundred stopped for the money!", 0.5)]),
    "c12": (["n17"], ["n15", "n16"], ["n18"], [
        ("t1", "[slowly] Their bodies dodged it. Their minds never saw it.", 0.5),
        ("t2", "[slowly] Their bodies dodged it. Their minds never saw it.", 0.35),
        ("t3", "[seriously] Their bodies dodged it... Their minds never saw it.", 0.5),
        ("t4", "[whispers] Their bodies dodged it. Their minds never saw it.", 0.5)]),
    "c13": (["n18", "n19"], ["n17"], [], [
        ("t1", "[excited] You counted five phones. You saw the clown. [slyly] Did you see the money?", 0.5),
        ("t2", "[excited] You counted five phones. You saw the clown. [slyly] Did you see the money?", 0.35),
        ("t3", "[playful] You counted five phones. You saw the clown. [mischievously] Did you see the money?", 0.5),
        ("t4", "You counted five phones. You saw the clown. Did you see the money?", 0.5)]),
    "c14": (["n19"], ["n17", "n18"], [], [
        ("t1", "[slyly] Did you see the money?", 0.5),
        ("t2", "[slyly] Did you see the money?", 0.35),
        ("t3", "[mischievously] Did you see the... money?", 0.5),
        ("t4", "[whispers] Did you see the money?", 0.5)]),
}
jobs = []
for ci, (c, (lines, prev, nxt, takes)) in enumerate(C.items()):
    for t, text, stab in takes:
        assert L.word_diff(" ".join(T[i] for i in lines), text) == [], (c, t, L.word_diff(" ".join(T[i] for i in lines), text))
        jobs.append({"folder": c, "take": t, "voice": J, "model": L.MODEL, "text": text, "stability": stab, "speed": 1.0,
                     "seed": 7000 + 10 * ci + int(t[1:]), "prev": ctx(prev) or None, "next": ctx(nxt) or None, "lines": lines})
(L.HERE / "jobs").mkdir(exist_ok=True)
(L.HERE / "jobs" / "narr.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(jobs), "jobs,", sum(len(j["text"]) for j in jobs), "characters")

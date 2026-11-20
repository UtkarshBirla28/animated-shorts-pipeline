"""The picked take of every sentence, with the measured reason -> takes/picks.json   (python clown_picks.py)"""
import json

import clown_lib as L

PICKS = [
    ([4], "p1/t2", "cut out alone, p1/t1's read is heard as \"own to unicycle\"; this take is heard right alone (owned 0.95, a 0.99), same register (133 Hz)"),
    (list(range(0, 4)) + list(range(5, 8)), "p1/t1", "the only P1 take with every word right in the whole-take whisper pass (t2 and t4 read \"clown's suit\"; t3 jumps to 290-330 Hz in the quick run); "
                           "calm register (f0 134 Hz); the job line \"Count the people on a phone.\" is the second slowest of 4 (4.21 w/s, whisper p >= 0.98)"),
    ([8], "c03/t2", "\"How many phones?\" rises +5.5 st at 187 Hz; p1/t1's own read falls -5.2 st at 208 Hz and every other rising take sits at 226-311 Hz"),
    (range(9, 13), "p1/t1", "same take as the story before it: \"And the clown?\" rises +9.4 st in register (146 Hz); \"Five.\" / \"You saw him.\" / \"Easy.\" fall, 123-166 Hz"),
    ([13], "r1/t3", "no take of 28 rises inside the narrator's register; this one falls least in register (-2.5 st, ends on the sentence median, 179 Hz, p >= 0.88). "
                    "The takes that end level or up are at 210-276 Hz"),
    ([14], "p1/t1", "the quoted question \"did you see the clown?\" rises +11 st; colon pause 0.42 s cut to 0.18 s"),
    (range(15, 19), "p2/t1", "smallest loudness spread between its sentences (0.8 LU), every word p >= 0.80, 3.53 w/s; colon pause 0.28 s cut to 0.18 s"),
    ([19], "k1a/t5", "key line, slow setting (speed 0.78): 2.7 w/s (window 2.6-3.2), f0 124 Hz with an 11 st range (t2 is flatter: 7.6 st; t3 starts clipped; t6 is under 2.6; "
                     "k1/t1 runs 3.5 w/s); every word right, 'one' p 0.67"),
    ([20], "p3/t2", "p3/t3 (used for the rest of the chunk) starts at sample 0 of its file (clipped start), so its first sentence comes from t2: 141 Hz, 11.9 st, p >= 0.76"),
    (range(21, 30), "p3/t3", "liveliest P3 take (f0 141 Hz, per-sentence ranges 8-16 st against 6-12 st in t1), every word right, \"On a phone?\" rises +9.3 st, 3.68 w/s"),
    ([30], "p4/t8", "livelier read of the reveal line in register (133 Hz, 9.9 st; t1 is 7.8 st, t2/t4/t7 are 5.5-5.8 st; t3/t5/t6 sit at 160-176 Hz), p >= 0.74"),
    ([31, 32], "p4/t2", "in the 3.3-3.9 window (3.66 and 3.81 w/s; t1/t4/t8 run 4.1-4.5), f0 124-128 Hz, \"You saw the clown.\" falls -6 st, p >= 0.93"),
    ([33], "k2d/t2", "last question: the slowest take of 42 that stays in the narrator's register and rises (1.37 s = 3.65 w/s, 132 Hz, +6.6 st over the last 300 ms, p >= 0.89). "
                     "Made alone at speed 0.70 / stability 0.90 with the lines before as context and MONEY in capitals in the prompt. Every slower take (3.36-3.64 w/s) is at 210-280 Hz; inside a long calm chunk the line runs 4.2-5.0 w/s"),
]
sent, why = {}, {}
for rng, take, reason in PICKS:
    for i in rng:
        sent[str(i)] = take
    r = list(rng)
    why["S" + ",".join(str(v) for v in r) if len(r) > 1 and r[-1] - r[0] + 1 != len(r) else (f"S{r[0]}-S{r[-1]}" if len(r) > 1 else f"S{r[0]}")] = {"take": take, "why": reason}
assert len(sent) == len(L.S)
(L.TAKES / "picks.json").write_text(json.dumps({"sent": sent, "why": why}, ensure_ascii=False, indent=1), encoding="utf-8")
print("picks.json written:", len(sent), "sentences from", len(set(sent.values())), "takes")

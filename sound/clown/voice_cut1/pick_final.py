"""Copy the chosen take of every beat into takes/james_final/bNN.mp3 (+ picks.json with the reason).
Usage: python -s pick_final.py"""
import json
import shutil
from pathlib import Path

T = Path(__file__).resolve().parent / "takes"
# beat -> (set, take, why)
PICKS = {
    1: ("james_v1", "t1", "beat_select2 best (8.88); clean, every word p >= 0.81; v2 dash/sentence variants were not better"),
    2: ("james_v1", "t4", "beat_select2 best (6.79): highest accuracy ('JCOM'), clean '2005'"),
    3: ("james_v1", "t1", "beat_select2 best (6.65); shortest unvoiced tail, statement falls"),
    4: ("james_v1", "t3", "beat_select2 best (8.44, tie t4); short tail"),
    5: ("james_v1", "t1", "beat_select2 best of 8 (6.00); the ellipses have real silences (0.35/0.30 s, Whisper edges hide them); "
                          "the 'sentence' re-takes (t5-t7) sounded clipped and scored lower"),
    6: ("james_v1", "t4", "LEAD override of t2 (6.94 vs 6.82, within noise): the lowest, most falling read "
                          "(141 Hz, end -8.1 st) = the dry deadpan; the metric's narrator term punishes low pitch"),
    7: ("james_v1", "t1", "beat_select2 best (8.86, all four equal); the question does not rise in any take (LESSONS 36)"),
    8: ("james_v1", "t1", "beat_select2 best (8.51): a real shout, F0 289 Hz (+8 st over the narration), +2.5 dB"),
    9: ("james_v2", "t4", "beat_select2 best (8.29): 'They press cancel.' cut from v1 take t4 (tense, 161 Hz)"),
    15: ("james_v2", "t6", "beat_select2 best (7.52): standalone voiced 'Nothing.', flat 0.9 st, 135 Hz "
                           "(every v1 in-context 'Nothing.' came out whispered, unvoiced)"),
    16: ("james_v2", "t1", "LEAD pick over the standalone t6 (7.65 vs 7.62): the in-context 'Again.' cut from v1 t1 is "
                           "the tense 'press harder' read (202 Hz) and Whisper hears it better (p 0.60 vs 0.39)"),
    17: ("james_v2", "t5", "beat_select2 best (7.43): a second, different standalone 'Nothing.' (138 Hz, flat 1.7 st)"),
    10: ("james_v1", "t1", "beat_select2 best (7.92): no low-p words; 'two billion yen' clean"),
    11: ("james_v1", "t3", "beat_select2 best (9.30): only take where every word p >= 0.7 ('SELLING' clear)"),
    12: ("james_v1", "t2", "beat_select2 best (7.48): shortest tail; 'button?' does not rise in any take"),
    13: ("james_v1", "t1", "LEAD override of t2 (7.37 vs 7.09): in t2 'most shares' is heard as 'most CHAIRS' when the phrase is checked alone (t1: 'shares' p 0.99); t1 is also 0.16 s shorter"),
    14: ("james_v1", "t3", "beat_select2 best (9.03)"),
}
dst = T / "james_final"
dst.mkdir(exist_ok=True)
for bn, (s, t, why) in PICKS.items():
    src = (T / s if t == "t1" else T / s / t) / f"b{bn:02d}.mp3"
    shutil.copy(src, dst / f"b{bn:02d}.mp3")
json.dump({f"b{bn:02d}": {"set": s, "take": t, "why": w} for bn, (s, t, w) in PICKS.items()},
          open(dst / "picks.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("picked", len(PICKS), "beats ->", dst)

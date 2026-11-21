# SOUND v2 check of the clown mix (read-only, nothing is played). mix.py measures the arrays it writes and saves every
# number in mix_report.json (the tables are in SOUND_EVENTS_V2.md); this script re-reads the WRITTEN files' lengths on its
# own and prints the pass / miss list, with exit code 1 on any miss. (Cut 1's checker is check_audio_cut1.py.)
# Usage: PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/award/audio/check_audio.py
import json
import os
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, "mix_report.json"), encoding="utf-8"))
TL = json.load(open(os.path.join(HERE, "timeline.json"), encoding="utf-8"))
want = int(TL["total"]) * 48000 // int(TL["fps"])
rows = []


def row(name, ok, text):
    rows.append((name, bool(ok), text))


for f in ("mix.wav", "stem_voice.wav", "stem_music.wav", "stem_sfx.wav", "stem_amb.wav", "music_v2.wav"):
    try:
        with wave.open(os.path.join(HERE, f), "rb") as w:
            n, sr, ch = w.getnframes(), w.getframerate(), w.getnchannels()
        row(f"length of {f}", n == want and sr == 48000 and ch == 2, f"{n} samples at {sr} Hz, {ch} ch (the film: {TL['total']} f = {want} samples)")
    except Exception as e:  # noqa
        row(f"length of {f}", False, str(e))
row("the report belongs to this timeline", R["frames"] == int(TL["total"]), f"report {R['frames']} f, timeline {TL['total']} f")
row("integrated loudness -14 LUFS +-0.5", abs(R["I"] + 14.0) <= 0.5, f"{R['I']:.2f} LUFS")
row("true peak <= -2 dBTP", R["TP"] <= -2.0, f"{R['TP']:.2f} dBTP")
row("speech margin >= 7 dB on every word", R["margin_min"] >= 7.0, f"lowest {R['margin_min']:.1f} dB of {len(R['words'])} words")
row("character lines as clear as the narrator", R["margin_char"]["min"] >= 7.0 and R["margin_char"]["median"] >= R["margin_narr"]["median"] - 3.0,
    f"characters median {R['margin_char']['median']:.1f} / lowest {R['margin_char']['min']:.1f} dB; narrator median {R['margin_narr']['median']:.1f} dB")
ss = R["sync_summary"]
row("sync direction: every cue -1 .. +2 f", ss["bad"] == 0, f"{ss['n']} cues, {ss['min']:+.2f} .. {ss['max']:+.2f} f, {ss['bad']} outside")
row("mono fold-down loss <= 1 LU", R["mono_loss"] <= 1.0, f"{R['mono_loss']:.2f} LU")
for q in R["quiz"]:
    row(f"quiz rule, duck f {q['duck']}: everything but the clown / pigeons / dog is silent in the window", q["rest_peak"] is not None and q["rest_peak"] < 1e-7,
        f"peak {q['rest_peak']:.7f}")
    okc = q.get("ok_cues", [])
    row(f"quiz rule, duck f {q['duck']}: what sounds there is the clown's / pigeons' / dog's, at pan +0.10 or further right",
        all(c["pan"] >= 0.10 - 1e-6 for c in okc) and (q["ok_balance"] is None or q["ok_balance"] < 0.0),
        (", ".join(f"{c['name']} f {c['frame']:.0f} pan {c['pan']:+.2f}" for c in okc) or "nothing") + ("" if q["ok_balance"] is None else f"; L-R {q['ok_balance']:+.1f} dB"))
    b = q["ranks"]["bed"]
    row(f"quiz rule, duck f {q['duck']}: the bed is an ordinary moment", b["pct"] <= 90.0 and b["rise_pct"] <= 90.0 and q["bed_balance"] - q["bed_balance_q1"] <= 1.0,
        f"louder than {b['pct']:.0f} % of Q1's windows, rise above {b['rise_pct']:.0f} %, L-R {q['bed_balance']:+.2f} dB (Q1 {q['bed_balance_q1']:+.2f})")
    m = q["ranks"]["music"]
    nb = [m.get(k) for k in ("two_beats_before", "two_beats_after") if m.get(k) is not None]
    row(f"quiz rule, duck f {q['duck']}: the score's pulse runs through unchanged", (not nb or max(abs(m["k_level"] - x) for x in nb) <= 2.5)
        and q["music_balance"] - q["music_balance_q1"] <= 1.0,
        f"level {m['k_level']:.1f} dB; the same slice two beats before / after {' / '.join(f'{x:.1f}' for x in nb) or 'n/a'} dB; L-R {q['music_balance']:+.2f} dB (Q1 {q['music_balance_q1']:+.2f})")
sm = {s["stem"]: s for s in R["seam"]}["mix"]
row("loop seam: no click", sm["jump"] <= 3 * max(sm["step_p99_tail"], sm["step_p99_head"], 1e-4), f"jump {sm['jump']:.5f}; typical steps {sm['step_p99_tail']:.5f} / {sm['step_p99_head']:.5f}")
bad = [r for r in rows if not r[1]]
for name, ok, text in rows:
    print(f"{'pass' if ok else 'MISS'}  {name}: {text}")
print(f"\n{len(rows) - len(bad)} of {len(rows)} checks pass" + ("" if not bad else f"; MISSES: {', '.join(r[0] for r in bad)}"))
sys.exit(1 if bad else 0)

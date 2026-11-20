"""Voice, settings, picks and credits -> voice_info.json (merged with what clown_verify.py wrote).
  python clown_info.py <account counter before> <account counter after>"""
import json
import sys

import clown_lib as L

sys.stdout.reconfigure(encoding="utf-8")
before, after = int(sys.argv[1]), int(sys.argv[2])
vi = L.HERE / "voice_info.json"
info = json.loads(vi.read_text(encoding="utf-8")) if vi.exists() else {}
picks = json.loads((L.TAKES / "picks.json").read_text(encoding="utf-8"))
log = [json.loads(ln) for ln in (L.TAKES / "gen_log.jsonl").read_text(encoding="utf-8").splitlines()]
by = {r["file"][:-4]: r for r in log}
used = sorted(set(picks["sent"].values()))
build = json.loads((L.HERE / "_build.json").read_text(encoding="utf-8"))
base = {
    "take": "eleven_multilingual_v2:james:speed1.12",
    "voice": {"name": "AT James", "voice_id": L.VOICE, "model": L.MODEL, "output": "mp3_44100_128 -> 48 kHz stereo pcm_s24le"},
    "settings": {
        "narration": {"stability": 0.65, "similarity_boost": 0.75, "style": 0.0, "speed": 1.12},
        "key_line_1_S19": {"stability": 0.65, "similarity_boost": 0.75, "style": 0.0, "speed": 0.78, "context": "previous_text / next_text (not spoken)"},
        "key_line_2_S33": {"stability": 0.90, "similarity_boost": 0.75, "style": 0.0, "speed": 0.70, "context": "previous_text (not spoken)",
                           "prompt_text": "Did you see the MONEY?"},
        "S8_how_many_phones": {"stability": 0.65, "similarity_boost": 0.75, "style": 0.0, "speed": 1.2},
        "per_take": {t: {k: by[t].get(k) for k in ("seed", "stability", "style", "speed", "text", "previous_text", "next_text")} for t in used if t in by},
    },
    "why_settings": {
        "style": "settings test (sentences 1-6, one seed, speed 1.2): style 0.3 against 0 gave the SAME character timings and f0 / loudness within 0.02: no measurable effect, so 0",
        "stability": {
            "test_first_6_sentences": {
                "0.35": {"words_per_s_speaking": 3.81, "f0_range_st": 13.7, "wrong_words": 1, "loudness_spread_lu": 1.58},
                "0.50": {"words_per_s_speaking": 4.04, "f0_range_st": 13.5, "wrong_words": 1, "loudness_spread_lu": 2.53},
                "0.65": {"words_per_s_speaking": 4.02, "f0_range_st": 20.2, "wrong_words": 0, "loudness_spread_lu": 2.70}},
            "question_chunks_2x2_takes": "0.65: loudness spread 1.35-4.24 LU (mean 2.68), no clipped start; 0.35: 2.75-5.83 LU (mean 3.86), one clipped start, "
                                         "one 0.70 s gap, an 'Easy.' at -23.9 LUFS. Rising questions: equal or better at 0.65",
            "chosen": 0.65},
        "speed": "the brief's 1.2 measured 4.0-4.3 words/s while speaking on this script (the job line 'Count the people on a phone.' 5.1-5.6): with 0.12-0.20 s gaps "
                 "that is about 57 s and above the 3.3-3.9 window. 1.12 measured 3.5-3.8 (chunks: 3.68 / 3.53 / 3.68 / 3.83) and lands the file in 60-64 s",
        "chunks": "short chunks of short sentences came out excited and high (f0 190-300 Hz against 125-150 Hz for the story), so the script was generated in 4 long chunks "
                  "(S0-S14, S15-S18, S20-S29, S30-S32) and the weak lines were re-taken with context; every cut is inside silence",
        "fallback_voice_or_model": "not needed: no wrong word, clipped start or loudness jump is left in the picked takes",
    },
    "picks": picks["why"],
    "gap_rule": "normal: clip(0.42 x the take's own gap, 0.15, 0.185), 0.16 across two takes; rapid-fire: clip(0.42 x own gap, 0.12, 0.15), 0.13 across two takes; "
                "beats 0.365 s before S19 and 0.335 s before S33 (they read 0.36 / 0.33 as RMS silence and 0.33 / 0.31 in ffmpeg silencedetect); the answer beat after 'How many phones?' is 0.450 s (edit audit; 0.445 as RMS silence, 0.427 in ffmpeg silencedetect); pauses inside a sentence over 0.22 s cut to 0.18 s; all cuts in silence, 8-10 ms fades, no stretch",
    "edits": [{"date": "2026-11-17", "what": "edit audit: the answer beat was rushed. The silence between 'How many phones?' and 'Five.' was lengthened "
                                              "by rebuilding with the same takes, gains and gaps and only this gap changed (clown_lib.GAP_OVERRIDE)",
               **next(({"gap_was_s": g["was_s"], "gap_now_s": g["target_s"], "shift_s": g["added_s"], "shift_samples_48k": int(round(g["added_s"] * 48000)),
                        "old_times_at_or_after_s_moved": round(next(s["on"] for s in build["sentences"] if s["i"] == g["before"]) - g["added_s"], 3)}
                       for g in build["gaps"] if g["kind"] == "answer"), {}),
               "proof": "clown_gapdiff.py: every sample before the gap is identical to _prev_gap/voice.wav, every sample after it is identical and 15360 samples later, "
                        "the inserted stretch is digital silence like every other gap; all later word / phrase times are the old ones + the shift",
               "backup": "_prev_gap/"}],
    "words_json": "words.json = caption tokens (digits shown: 1, 4, 6, 100.; '100.' covers the spoken 'a hundred.'), the form Captions.tsx / gen_words_ts.py read; "
                  "words_spoken.json = one entry per spoken word",
    "build": build,
    "credits": {"account_counter_before": before, "account_counter_after": after, "used": after - before, "left_of_40000": 40000 - after,
                "budget": 7000, "characters_sent": sum(r["chars"] for r in log), "takes_generated": len(log),
                "note": "this account is billed about 0.4 credit per character on eleven_multilingual_v2"},
}
info.update(base)
vi.write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
print("voice_info.json:", list(info.keys()))

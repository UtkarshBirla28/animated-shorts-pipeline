"""Voices, models, settings, picks, takes and credits -> voice_info.json (merged with what v6_verify.py wrote).
  python v6_info.py <account counter before> <account counter after> [--dir <voice dir>]"""
import json
import sys
from pathlib import Path

import v6_lib as L

sys.stdout.reconfigure(encoding="utf-8")
before, after = int(sys.argv[1]), int(sys.argv[2])
V = Path(sys.argv[sys.argv.index("--dir") + 1]) if "--dir" in sys.argv else L.HERE
vi = V / "voice_info.json"
info = json.loads(vi.read_text(encoding="utf-8")) if vi.exists() else {}
picks = json.loads((L.TAKES / "picks.json").read_text(encoding="utf-8"))
log = [json.loads(ln) for ln in (L.TAKES / "gen_log.jsonl").read_text(encoding="utf-8").splitlines()]
by = {r["file"][:-4]: r for r in log}
build = json.loads((V / "_build.json").read_text(encoding="utf-8"))
used_lines = [p["id"] for p in json.loads((V / "phrases.json").read_text(encoding="utf-8"))]
VOICES = {
    "N": {"name": "AT James (James - Conversational, Energetic, Punchy)", "voice_id": L.JAMES, "source": "account (professional)"},
    "STUDENT": {"name": "Erby - Nerdy Regular Dude", "voice_id": "n27L8GNoVt7SPUboEQb7", "source": "shared library, added as 'CL Student Erby'"},
    "INTERVIEWER": {"name": "Nikki - Friendly and Conversational", "voice_id": "yhFUAoS32gPDJFQHbH68", "source": "shared library, added as 'CL Interviewer Nikki'"},
    "FRIEND": {"name": "Laura - Enthusiast, Quirky Attitude", "voice_id": "FGY2WhTYpPnrIDTdsKH5", "source": "premade"},
    "HEADPHONES": {"name": "Jerry B - California Surfer Dude", "voice_id": "rHWSYoq8UlV0YIBKMryp", "source": "shared library, added as 'CL Headphones JerryB'"},
    "PHONE_GUY": {"name": "Jeremy - Casual Guy Next Door", "voice_id": "5gaEGrWSk4v20HMfIhgC", "source": "shared library, added as 'CL Phone Jeremy'"},
}
cast_tbl = {}
for role in ("student", "interviewer", "friend", "headphones", "phone_guy"):
    for pj in sorted((L.TAKES / f"cast_{role}").glob("*.probe.json")):
        r = json.loads(pj.read_text(encoding="utf-8"))
        cast_tbl.setdefault(role.upper(), {})[pj.stem.split(".")[0]] = {
            "f0_median_hz": r.get("express", {}).get("med"), "f0_range_st": r.get("express", {}).get("range_st"),
            "level_range_db": r.get("express", {}).get("level_range_db"), "centroid_hz": r.get("timbre", {}).get("centroid_hz"),
            "whisper_min_p": min((o.get("min_p", 0) for o in r["sent"]), default=None), "wrong_words": sum(len(o.get("diff", [])) for o in r["sent"]),
            "clipped_start": r.get("clipped_start"), "clipped_end": r.get("clipped_end")}
base = {
    "take": "eleven_v4:james+5 character voices:v6 story script",
    "script": "sound/clown/SCRIPT_v6.md (binding)",
    "voices": VOICES,
    "model": L.MODEL,
    "output": "ElevenLabs mp3_44100_128 (with-timestamps) -> 48 kHz stereo pcm_s24le",
    "settings": {
        "all": {"model_id": L.MODEL, "similarity_boost": 0.75, "speed": 1.0,
                "note": "eleven_v4 ignores speed: the same seed at 1.0 and 1.2 gave the identical 2.23 s take (takes/test/sp10, sp12); style is not supported by v4"},
        "context": "every take sent the neighbouring script lines as previous_text / next_text (context only, not spoken; v4 accepts them)",
        "tags": "one short v4 audio tag per beat ([excited], [playful], [teasing], [intrigued], [mysteriously], [delighted], [incredulous], [warmly], "
                "[mischievously], [amused], [slowly], [slyly]; characters [proudly], [friendly], [laughing], [relaxed], [confused]); stability 0.5 or 0.35",
        "per_take_used": {t: {k: by[t].get(k) for k in ("voice", "seed", "stability", "text", "prev", "next")}
                          for t in sorted({picks["sent"][l] for l in used_lines}) if t in by},
    },
    "casting": {
        "method": "3 candidates per role, one take each on the role's own line with the narrator's lead-in as context; measured whisper words / p, "
                  "f0 median + range, loudness contour range, mean-MFCC timbre distance to James and to the other roles, spectral roll-off "
                  "(band-limited voices out), noise floor, clipped edges (v6_cast.py, takes/cast_r1.txt)",
        "candidates": cast_tbl,
        "decisions": {
            "STUDENT": "Erby over Sheldon (288 Hz, cartoon-quirky) and Nathan (204 Hz = James's median 0.2 st away): natural everyday cadence, bright nasal timbre (centroid 1.4 kHz), 2.6 st and MFCC 7.2 from James",
            "INTERVIEWER": "Nikki over Irene (clipped start, 0.2 st from Jessica) and Sarah (falling question, 0.1 st from Erby): the friendly rising question, clean floor",
            "FRIEND": "Laura over Kymmiee (band-limited: 99 % of the energy under 2.6 kHz, lo-fi) and Jessica (0.5 st from Nikki): bright, bubbly, 293 Hz, 2.3 st above Nikki",
            "HEADPHONES": "Jerry B over Brandon (noise floor -47.7 dB under -18 LUFS speech) and Will (127 Hz, 2.1 st from Jeremy on the very next line): laid-back surfer drawl, clean floor, 8 st above the phone guy",
            "PHONE_GUY": "Jeremy over Trevor (band-limited, 4.8 kHz) and Chris (closest timbre to James of all candidates, MFCC 3.6): deep (113-126 Hz), puzzled rise; 7 takes because 'clown' was heard as 'clone' in 2 of the first 4",
        },
        "takes_per_line": ">= 4 with the winner on every character line (student 4 covering both lines, interviewer 4, friend 4, headphones 4, phone guy 7)",
    },
    "narrator_takes": "14 chunks x 4 takes (c01-c14, 1-3 sentences each, context-linked) + retakes c06b (n08 'RODE' capitalised, 4) and c09b (n13 punctuation, 4); "
                      "chosen per line by whisper (every word right, word p), clipped edges / extra sound, the end contour (questions rise), pace and f0 against the delivery intent",
    "picks": picks["sent"], "why": picks["why"], "drops": picks.get("drops"),
    "cut_order_applied": {
        "uncut_duration_s": None,
        "rule": "SCRIPT_v6 cut order when over 68 s: 'Many spun around to look.' (cut), 'Don't lose count.' (KEPT: it sits inside the fixed 7.0 s count window, so cutting it saves 0 s), "
                "'Then his team asked people leaving:' (cut -> the interviewer line alone)",
        "still_over": "the cut voice runs past 68 s: eleven_v4 James reads 2.5-3.4 words/s whatever the tag (LESSONS 2/36); no stretch was applied (owner rule); further cuts are a script decision",
    },
    "processing": "gains only, plus clip-gain dips on single plosive bursts (5 ms window, 4 ms raised-cosine ramps, <= 1.8 dB; listed in _build.json units[].plosive_dips) "
                  "and small unit trims (<= 0.9 dB) so the peak stays under -1 dBFS without a limiter; every cut is inside true silence with 8 ms fades; no stretch, no pitch shift, no EQ, no compression",
    "words_json": "words.json = caption tokens ('1 in 4', '6 in 100' as digits: {1|one} {4|four} {6|six} {100|a hundred}; 'Five.' stays a word); "
                  "words_spoken.json = one entry per spoken word; phrases.json = one entry per line with speaker (N / STUDENT / INTERVIEWER / FRIEND / HEADPHONES / PHONE_GUY); "
                  "word times are the ElevenLabs v4 character times (40 ms grid) snapped to true silence, first / last word of every sentence pinned to the acoustic on / off",
    "build": build,
    "credits": {"account_counter_before": before, "account_counter_after": after, "used": after - before, "budget": 7000,
                "characters_sent": sum(r["chars"] for r in log), "takes_generated": len(log),
                "credits_per_character": round((after - before) / max(1, sum(r["chars"] for r in log)), 3)},
}
fl = L.HERE / "_full_uncut" / "_build.json"
if fl.exists():
    base["cut_order_applied"]["uncut_duration_s"] = json.loads(fl.read_text(encoding="utf-8"))["duration_s"]
info.update(base)
vi.write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
print("voice_info.json:", list(info.keys()))

"""Voices, models, settings, casting, picks, takes and credits -> voice_info.json (merged with what pt_verify.py wrote),
in the clown voice_info.json format (sound/clown/voice/voice_info.json).
  python pt_info.py <account counter before> <account counter after> [--dir <voice dir>]"""
import json
import sys
from pathlib import Path

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
before, after = int(sys.argv[1]), int(sys.argv[2])
V = Path(sys.argv[sys.argv.index("--dir") + 1]) if "--dir" in sys.argv else L.HERE
vi = V / "voice_info.json"
info = json.loads(vi.read_text(encoding="utf-8")) if vi.exists() else {}
picks = json.loads((L.TAKES / "picks.json").read_text(encoding="utf-8"))
log = [json.loads(ln) for ln in (L.TAKES / "gen_log.jsonl").read_text(encoding="utf-8").splitlines() if ln.strip()]
by = {r["file"][:-4]: r for r in log}
build = json.loads((V / "_build.json").read_text(encoding="utf-8"))
used = [p["id"] for p in json.loads((V / "phrases.json").read_text(encoding="utf-8"))]
VOICES = {
    "N": {"name": "James - Conversational, Energetic, Punchy", "voice_id": L.JAMES, "source": "shared library, added as 'PT Narrator James'"},
    "D": {"name": "Masaki - Calm Japanese Narrator", "voice_id": "2Jg786yPJ6zSdiI0EAAH", "source": "shared library, added as 'PT Driver Masaki'"},
    "T": {"name": "Flackoo", "voice_id": "3lqN2QjRfNc5KxYJLLOR", "source": "shared library (young / New York), added as 'PT Tourist Flackoo'"},
    "KID": {"name": "Kavya - Cute & Engaging Character", "voice_id": "bA58y3FqVI6b6gTNh0oT", "source": "shared library, added as 'PT Kid Kavya'"},
}
cand = {}
for folder in ("cast_d", "cast_t", "cast_t6", "cast_k"):
    q = L.TAKES / f"quick_{folder}.json"
    quick = {r["take"]: r for r in json.loads(q.read_text(encoding="utf-8"))} if q.exists() else {}
    for pj in sorted((L.TAKES / folder).glob("*.probe.json")):
        r = json.loads(pj.read_text(encoding="utf-8"))
        k = f"{folder}/{pj.name.split('.')[0]}"
        qq = quick.get(k, {})
        cand.setdefault(folder, {})[k] = {
            "candidate": qq.get("candidate"), "text": r.get("tag_text"), "stability": r.get("stability"),
            "heard": [o.get("heard") for o in r["sent"]], "whisper_min_p": [o.get("min_p") for o in r["sent"]],
            "wrong_words": sum(len(o.get("diff", [])) for o in r["sent"]), "f0_median_hz": qq.get("f0_med"), "f0_range_st": qq.get("f0_range_st"),
            "level_range_db": qq.get("level_range_db"), "vocal_tract_cm": qq.get("vtl_cm"), "mfcc_to_james": qq.get("mfcc_to_james"),
            "clipped_start": r.get("clipped_start"), "clipped_end": r.get("clipped_end")}
base = {
    "take": "eleven_v4:james+masaki+flackoo+kavya:pointing script v2 (cut order 1-3 applied)",
    "script": "sound/pointing/SCRIPT_v2.md (LOCKED for voice); spoken text = pt_lib.LINES after the cut order (pt_lib.CUT)",
    "voices": VOICES,
    "model": L.MODEL,
    "output": "ElevenLabs mp3_44100_128 (with-timestamps) -> 48 kHz stereo pcm_s24le",
    "settings": {
        "all": {"model_id": L.MODEL, "similarity_boost": 0.75, "speed": 1.0, "stability": "0.5 or 0.35 (per take, see per_take_used)",
                "note": "the clown v6 / v6b settings; eleven_v4 ignores speed (LESSONS 36)"},
        "context": "every take sent the neighbouring script lines as previous_text / next_text (context only)",
        "tags": "at most one short v4 tag per sentence; untagged reads where they measured clearer (driver)",
        "per_take_used": {t: {k: by[t].get(k) for k in ("voice", "seed", "stability", "text", "prev", "next")}
                          for t in sorted({picks["sent"][l] for l in used}) if t in by},
    },
    "casting": {
        "method": "per role 4-7 library candidates, 2-3 audition takes each on the role's own lines; measured: faster-whisper medium per line "
                  "(lowest word p, wrong words), f0 median / range, loudness contour range, mean-MFCC timbre distance to James and to the other roles, "
                  "vocal-tract length from LPC formants (pt_vtl.py; separates a child from an adult doing a high voice), laugh length before the "
                  "first word, clipped edges (pt_probe.py, pt_quick.py; takes/probe_r1.txt, takes/quick_r1.txt)",
        "candidates": cand,
        "decisions": {
            "D": "Masaki over Kei (closest timbre to James: MFCC 3.0 untagged), Taro (most distinct but a 'distinct Japanese accent', upbeat) and Hideo "
                 "(tagged takes unclear, p 0.23-0.31 on 'Signal green'): clear on every call (0.80-0.86), calm, MFCC 6.3-6.8 from James",
            "T": "Flackoo over Peter ('Bag gone' p 0.40-0.48, not flat), Gus (timbre closest to James, MFCC 3.4), Jerry B (compressed, 'Bag gone' 0.32-0.39) "
                 "and Hal ('Nobody does that' 0.48): the liveliest laugh line (13 st range), the flattest 'Bag... gone.' (2.7 st, p 0.60), MFCC 6.9 from James",
            "KID": "Kavya over Chutki (close second), Munni, Piku, Kiran, Teddy and Valf (adult men pitching up: vocal tract 18.6 / 19.0 cm): the most "
                   "child-like pitch of the clear takes (282-296 Hz), p 0.66-0.76. No library voice measures as a real child (ElevenLabs keeps the "
                   "library adult; Voice Design refused a child voice: 403 blocked_generation), so this is an adult performing a child",
        },
        "auditions_mp3": {r: f"studio/out/pointing/voicetest/auditions_{r}.mp3" for r in ("driver", "tourist", "kid")},
    },
    "narrator_takes": "9 chunks x 4 takes (c01-c09), + c09b (n13 pace, 4), c02c / c08c (cut order 2 / 3, 4 each); chosen per line by whisper, edge "
                      "flags, the end contour (questions rise), the '...' pause, pace (<= 3.4 w/s preferred)",
    "picks": picks["sent"], "why": picks["why"],
    "cut_order_applied": picks.get("cut_order_applied"),
    "opening_segment": "the hook lab may replace d01 / t01 / n01 / n02: segments/opening + segments/body (pt_split.py) let the opening be swapped "
                       "without touching the body audio",
    "processing": "gains only (units to one loudness target; t06 -1.5 dB on purpose), clip-gain dips on single plosive bursts and small unit trims "
                  "(_build.json units[]) so the peak stays under -1 dBFS without a limiter; every cut inside true silence with 8 ms fades; "
                  "no stretch, no pitch shift, no EQ, no compression",
    "timing_plan": "pt_timing.json: the true silence between every two lines, from the picture column (reasons in its _why)",
    "words_json": "words.json = caption tokens (digits for numbers: {1,000|a thousand} {6|six} {1|one}; shouted call-outs in CAPS); "
                  "words_spoken.json = one entry per spoken word; phrases.json = one entry per line with speaker (N / D / T / KID); "
                  "word times = whisper on the finished file snapped to the energy onsets, first / last word of each sentence on the acoustic edges",
    "build": build,
    "credits": {"account_counter_before": before, "account_counter_after": after, "used": after - before,
                "characters_sent": sum(r["chars"] for r in log), "takes_generated": len(log),
                "credits_per_character": round((after - before) / max(1, sum(r["chars"] for r in log)), 3)},
}
info.update(base)
vi.write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
print("voice_info.json:", list(info.keys()))

"""SCRIPT v3: voices, model, settings, picks, takes and credits -> <dir>/voice_info.json (merged with pt3_verify.py's part).
  python pt3_info.py <counter before> <counter after> [--dir _v3]"""
import json
import sys

import pt_lib as L
import pt3_lib as V

sys.stdout.reconfigure(encoding="utf-8")
before, after = int(sys.argv[1]), int(sys.argv[2])
D = L.HERE / (sys.argv[sys.argv.index("--dir") + 1] if "--dir" in sys.argv else "_v3")
vi = D / "voice_info.json"
info = json.loads(vi.read_text(encoding="utf-8")) if vi.exists() else {}
picks = json.loads((L.TAKES / "picks_v3.json").read_text(encoding="utf-8"))
log = [json.loads(ln) for ln in (L.TAKES / "gen_log.jsonl").read_text(encoding="utf-8").splitlines() if ln.strip()]
by = {r["file"][:-4]: r for r in log}
v3log = [r for r in log if r.get("script") == "v3"]
build = json.loads((D / "_build.json").read_text(encoding="utf-8"))
used = sorted({u["take"] for u in build["units"]})
info.update({
    "take": "eleven_v4:james+masaki+flackoo+kavya:pointing SCRIPT v3 (final script)",
    "script": "sound/pointing/SCRIPT_v3.md (LOCKED 2026-11-19); lines = sound/pointing/script_v3/voice_lines_v3.json (ids v3_*)",
    "voices": {"N": {"name": "James - Conversational, Energetic, Punchy", "voice_id": V.VOICE["N"]},
               "D": {"name": "Masaki - Calm Japanese Narrator", "voice_id": V.VOICE["D"]},
               "T": {"name": "Flackoo (young, New York)", "voice_id": V.VOICE["T"]},
               "KID": {"name": "Kavya - Cute & Engaging Character", "voice_id": V.VOICE["KID"]}},
    "model": L.MODEL,
    "output": "ElevenLabs mp3_44100_128 (with-timestamps) -> 48 kHz stereo pcm_s24le",
    "settings": {"all": {"model_id": L.MODEL, "similarity_boost": 0.75, "speed": 1.0, "stability": "0.5 or 0.35 (per take)"},
                 "context": "every spoken take sent the neighbouring script lines as previous_text / next_text (the laugh-only takes sent none)",
                 "tags": "at most one short v4 tag per sentence; James untagged first, a tag only where it measured better",
                 "per_take_used": {t: {k: by[t].get(k) for k in ("voice", "seed", "stability", "text", "prev", "next")} for t in used if t in by}},
    "picks": picks["lines"], "laugh_takes": {"x01": picks.get("x01"), "x02": picks.get("x02")}, "why": picks.get("why", {}),
    "reused_v1_takes": [{"line": u["line"], "take": u["take"], "span_s": [u["take_on"], u["take_off"]]} for u in build["units"] if u["reused_v1_take"]],
    "processing": "gains only (every sentence unit to one loudness target; the lifted lines of pt_timing_v3.json a little under on purpose), clip-gain dips "
                  "on single plosive bursts / small unit trims so the peak stays under -1 dBFS without a limiter; every cut inside true silence with 8 ms "
                  "fades; pauses set by cutting or by adding true silence; no stretch, no pitch shift, no EQ, no compression. The phone's replay and its "
                  "laugh bed are band-passed copies (550-3600 Hz) on their own stem.",
    "timing_plan": "pt_timing_v3.json (SCRIPT_v3 4.2), with reasons per pause",
    "files": "words.json = caption tokens (one per spoken word; CAPS for character lines, digits for numbers: {1,000|a thousand} {6|six} {1.|one.}); "
             "words_spoken.json = one entry per spoken word with its line id (the phone replay marked from_phone, at its true audio time); phrases.json = "
             "one entry per voiced row (v3 ids, speaker N / D / T / KID); captions.json = the script's own caption chunks with times; "
             "stems/ = dialogue + laughs + phone (their sum is voice.wav); segments/ = the swappable openings + the body",
    "build": build,
    "credits": {"account_counter_before": before, "account_counter_after": after, "used_on_the_account_in_this_job": after - before,
                "characters_sent_v3": sum(r["chars"] for r in v3log), "takes_generated_v3": len(v3log),
                "note": "the counter is the whole account's; eleven_v4 billed about 0.4 credits per character sent in this job"},
})
vi.write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
print("voice_info.json:", list(info.keys()), "| v3 takes", len(v3log), "chars", sum(r["chars"] for r in v3log))

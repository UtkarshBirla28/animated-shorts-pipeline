"""v6b -> voice_info.json (on top of the preview-2 voice_info.json + what v6b_verify.py measured) and the re-time
table for the lead (old line start -> new line start).
  python v6b_info.py <account counter before> <account counter after>"""
import json
import sys

import v6_lib as L
import v6b_lib as B

sys.stdout.reconfigure(encoding="utf-8")
before, after = int(sys.argv[1]), int(sys.argv[2])
vi = L.HERE / "voice_info.json"
info = json.loads(vi.read_text(encoding="utf-8"))
build = json.loads((L.HERE / "_build.json").read_text(encoding="utf-8"))
picks = json.loads((L.TAKES / "picks_v6b.json").read_text(encoding="utf-8"))
log = [json.loads(ln) for ln in (L.TAKES / "gen_log.jsonl").read_text(encoding="utf-8").splitlines()]
oph = {p["id"]: p for p in json.loads((B.PREV / "phrases.json").read_text(encoding="utf-8"))}
nph = json.loads((L.HERE / "phrases.json").read_text(encoding="utf-8"))
retime = []
for p in nph:
    o = oph.get(p["id"])
    retime.append({"id": p["id"], "i": p["i"], "speaker": p["speaker"], "text": L.TEXT[p["id"]],
                   "old_s": o["s"] if o else None, "old_e": o["e"] if o else None, "new_s": p["s"], "new_e": p["e"],
                   "shift_start_s": round(p["s"] - o["s"], 3) if o else None, "shift_end_s": round(p["e"] - o["e"], 3) if o else None,
                   "new_frame_30": round(p["s"] * 30), "old_frame_30": round(o["s"] * 30) if o else None,
                   "audio": "new line (restored)" if not o else ("re-take" if p["id"] in ("n18", "n19") else
                                                               ("same samples, tag 'right?' +3 dB" if p["id"] == "n05" else "same samples"))})
meas = {}
for lid in ("n18", "n19", "n05", "n11"):
    f = L.TAKES / f"measure_{lid}.json"
    if f.exists():
        meas[lid] = json.loads(f.read_text(encoding="utf-8"))
by = {r["file"][:-4]: r for r in log}
info.update({
    "take": "eleven_v4:james+5 character voices:v6 story script:v6b (sound audit of preview 2)",
    "build": build,
    "v6b": {
        "date": "2026-11-18",
        "source": "studio/out/clown/audit_p2/AUDIT_sound.md (M1, M2, M3, m8) + the lead's decisions (lead-in, the beat after 'Five.', n11 restored)",
        "method": "splice edit of the preview-2 voice (kept as sound/clown/voice_p2): every old run is copied sample for sample and only shifted; "
                  "new units are cut / gained with the v6 method at the same unit target (-20.18 LUFS mono, +1.5 dB on the last question)",
        "changes": [
            "0.27 s of silence added before 'Quick test.' (first word 0.07 -> 0.34 s)",
            "silence after 'Five.' 0.125 -> 0.45 s",
            "'right?' in 'You saw him, right?' +3.0 dB (gain only, 20 ms ramp); the 4 retakes did not beat the installed tag",
            "n11 'Many spun around to look.' restored after n10 (0.15 s before, 0.16 s after); n09 stays dropped",
            "0.50 s of silence before 'Their bodies dodged it.' (was 0.295) and 0.50 s after '...never saw it.' (was 0.155)",
            "n18 'You counted five phones. You saw the clown.' re-taken as one chunk (r18/t4)",
            "n19 'Did you see the money?' re-taken (r19b/t2); the 0.35 s beat before it and the 0.15 s tail are kept",
        ],
        "picks": {k: picks[k] for k in ("n18", "n19", "n11", "n05")}, "why": picks["why"],
        "retime_table": retime,
        "old_runs": build["old_runs"], "sample_identity_proof": build["sample_identity_proof"],
        "candidates_measured": meas,
        "per_take_used": {t: {k: by[t].get(k) for k in ("voice", "seed", "stability", "text", "prev", "next")}
                          for t in (picks["n18"], picks["n19"]) if t in by},
        "credits": {"account_counter_before": before, "account_counter_after": after, "used": after - before, "budget": 900,
                    "characters_sent": sum(r["chars"] for r in log), "takes_generated": len(log),
                    "note": "the counter is shared with other work on the account; characters x 0.40 credit is this round's own cost"},
    },
    "cut_order_applied": {"dropped": ["n09 'Then his team asked people leaving:'"], "restored_in_v6b": ["n11 'Many spun around to look.'"],
                          "kept": "n02 'Don't lose count.' (inside the fixed 7.0 s count window)"},
    "length_decision": {"date": "2026-11-18", "by": "lead", "decision": "about 73-74 s accepted with n11 restored and the added silences"},
    "promotion": {"date": "2026-11-18", "from": "sound/clown/voice_v6b", "to": "sound/clown/voice", "previous_voice_kept_as": "sound/clown/voice_p2",
                  "cut_1_voice": "sound/clown/voice_cut1"},
})
info.setdefault("drops", {})
info["drops"] = {"n09": "cut order 3 ('Then his team asked people leaving:' -> the interviewer line alone)",
                 "n11_restored": "v6b: the lead restored 'Many spun around to look.' (its shot is in the film)",
                 "n02_kept": "inside the fixed 7.0 s count window"}
info["picks"] = {**info.get("picks", {}), "n18": picks["n18"], "n19": picks["n19"], "n11": picks["n11"]}
vi.write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
print("voice_info.json written;", len(retime), "lines in the re-time table")
print(f"{'id':4s} {'old s':>7s} {'new s':>7s} {'shift':>7s}  {'old e':>7s} {'new e':>7s}  audio / text")
for r in retime:
    print(f"{r['id']:4s} {r['old_s'] if r['old_s'] is not None else '-':>7} {r['new_s']:7.3f} {r['shift_start_s'] if r['shift_start_s'] is not None else '-':>7}  "
          f"{r['old_e'] if r['old_e'] is not None else '-':>7} {r['new_e']:7.3f}  {r['audio']:34s} {r['text'][:44]}")

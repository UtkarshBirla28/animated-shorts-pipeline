"""THE HOOK GATE (SCRIPT_v3 1.2, the lead's decision 4) on an ASSEMBLED opening (pauses already set to 0.15 s):
  accept only if "not" starts by 2.70 s, "laugh" starts by 4.50 s and no gap is over 0.20 s; prefer "finger" by 5.00 s.
  "He is not." = low and flat at the same speed as the first sentence (1.05-1.20 s): the drop in pitch is the joke.
  python pt3_gate.py <dir> [<dir> ...]       each dir = a pt3_build.py output (--lines opening or all) -> <dir>/hook_gate.json
For the alternate hook (v3_a01 / v3_a02): no gap over 0.20 s and "suitcase." must END by 5.00 s."""
import json
import sys
from pathlib import Path

import numpy as np

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
TOL = 0.005          # the 5 ms hop of the silence measure


def gate(D):
    D = Path(D)
    sp = json.loads((D / "words_spoken.json").read_text(encoding="utf-8"))
    dlg = D / "stems" / "dialogue.wav"
    m = L.read(dlg if dlg.exists() else D / "voice.wav", ch=2).mean(axis=1)
    d = L.db_frames(m)
    alt = sp[0]["id"].startswith("v3_a")
    hook_ids = (sp[0]["id"], "v3_a02") if alt else ("v3_n01", "v3_n02", "v3_n03")
    hw = [w for w in sp if w["id"] in hook_ids]
    t0, t1 = hw[0]["s"], hw[-1]["e"]
    runs = [(a * L.H + 0.005, (b - a) * L.H) for a, b in L.runs_below(d, int(t0 / L.H) + 2, int(t1 / L.H) - 2)]
    longest = max(runs, key=lambda r: r[1]) if runs else (0, 0.0)
    wgap = max(((b["s"] - a["e"], a["w"], b["w"]) for a, b in zip(hw, hw[1:])), key=lambda g: g[0])
    W = lambda lid, w: next((x for x in sp if x["id"] == lid and x["w"] == w), None)
    by3, by5 = sum(1 for w in sp if w["s"] <= 3.0), sum(1 for w in sp if w["s"] <= 5.0)
    T, F = L.f0_track(m)
    lines = {}
    for lid in hook_ids:
        ws = [w for w in sp if w["id"] == lid]
        a, b = ws[0]["s"], ws[-1]["e"]
        st = L.f0_stats(T, F, a, b)
        seg = m[int(a * L.SR):int(b * L.SR)]
        v = F[(T >= a) & (T <= b)]
        lines[lid] = {"s": a, "e": b, "dur": round(b - a, 3), "wps": round(len(ws) / (b - a), 2), "f0_med": st.get("med"), "f0_range_st": st.get("range_st"),
                      "f0_sd_st": st.get("sd_st"), "end": L.end_contour(T, F, a, b), "voiced_share": round(float((~np.isnan(v)).mean()), 2) if len(v) else None,
                      "bands": L.bands(seg)}
    res = {"dir": str(D), "word_starts": [[w["w"], w["s"]] for w in hw], "first_word_s": hw[0]["s"], "words_started_by_3s": by3, "words_started_by_5s": by5,
           "longest_true_silence_s": round(longest[1], 3), "longest_true_silence_at_s": round(longest[0], 3),
           "longest_word_edge_gap_s": round(wgap[0], 3), "longest_word_edge_gap_between": f"{wgap[1]} | {wgap[2]}", "lines": lines}
    if alt:
        suit = W("v3_a02", "suitcase.")
        res.update({"suitcase_ends_s": suit["e"], "gate": {"no_gap_over_0.20": longest[1] <= 0.20 + TOL, "suitcase_ends_by_5.00": suit["e"] <= 5.0}})
    else:
        n_, l_, f_ = W("v3_n02", "not."), W("v3_n03", "laugh..."), W("v3_n03", "finger.")
        s1, s2, s3 = lines["v3_n01"], lines["v3_n02"], lines["v3_n03"]
        drop = round(12 * np.log2(s2["f0_med"] / s1["f0_med"]), 2) if s1["f0_med"] and s2["f0_med"] else None
        back = round(12 * np.log2(s3["f0_med"] / s2["f0_med"]), 2) if s3["f0_med"] and s2["f0_med"] else None
        res.update({"not_starts_s": n_["s"], "laugh_starts_s": l_["s"], "finger_starts_s": f_["s"], "finger_ends_s": f_["e"],
                    "he_is_not": {"dur_s": s2["dur"], "wps": s2["wps"], "first_sentence_wps": s1["wps"], "pitch_drop_from_first_st": drop,
                                  "third_sentence_back_up_st": back, "f0_med": s2["f0_med"], "f0_sd_st": s2["f0_sd_st"], "f0_range_st": s2["f0_range_st"],
                                  "voiced_share": s2["voiced_share"], "in_1.05_1.20_s": bool(1.05 <= s2["dur"] <= 1.20)},
                    "gate": {"not_starts_by_2.70": n_["s"] <= 2.70, "laugh_starts_by_4.50": l_["s"] <= 4.50, "no_gap_over_0.20": longest[1] <= 0.20 + TOL},
                    "prefer": {"finger_starts_by_5.00": f_["s"] <= 5.00}})
    res["passed"] = all(res["gate"].values())
    (D / "hook_gate.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    return res


if __name__ == "__main__":
    for D in sys.argv[1:]:
        r = gate(D)
        print(f"== {D}: {'PASS' if r['passed'] else 'FAIL'}  {r['gate']}  {r.get('prefer', '')}")
        print("   " + "  ".join(f"{w} {s:.2f}" for w, s in r["word_starts"]))
        print(f"   words started by 3.0 s: {r['words_started_by_3s']}, by 5.0 s: {r['words_started_by_5s']}; longest true silence {r['longest_true_silence_s']} s "
              f"at {r['longest_true_silence_at_s']} s; longest word-edge gap {r['longest_word_edge_gap_s']} s ({r['longest_word_edge_gap_between']})")
        if "he_is_not" in r:
            h = r["he_is_not"]
            print(f"   not {r['not_starts_s']:.3f}  laugh {r['laugh_starts_s']:.3f}  finger {r['finger_starts_s']:.3f}-{r['finger_ends_s']:.3f}   'He is not.' {h['dur_s']} s "
                  f"({h['wps']} w/s; first sentence {h['first_sentence_wps']} w/s), pitch {h['f0_med']} Hz = {h['pitch_drop_from_first_st']} st from the first sentence, "
                  f"sd {h['f0_sd_st']} st, range {h['f0_range_st']} st, voiced {h['voiced_share']}; third sentence {h['third_sentence_back_up_st']:+} st back up")
        else:
            print(f"   'suitcase.' ends {r['suitcase_ends_s']:.3f}")
        for lid, q in r["lines"].items():
            e = q["end"] or {}
            print(f"     {lid} {q['s']:.2f}-{q['e']:.2f} {q['dur']} s {q['wps']} w/s f0 {q['f0_med']} Hz r{q['f0_range_st']} sd{q['f0_sd_st']} end {e.get('rise_st')} voiced {q['voiced_share']} {q['bands']}")

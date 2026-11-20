# Writes ASSETS.md: the film's real-effects library as one table per logical sound (samples.REG): every file, its length,
# what it is, where it comes from (author / licence or the ElevenLabs prompt), what it cost, its measurements and
# whether samples.py may play it. Read-only on the audio; run after el_measure.py.
# usage: python -s assets_list.py
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import samples as S  # noqa: E402

RATE = 10.0   # ElevenLabs sound-effect credits per second of generation (measured: 8 takes x 0.5 s moved the counter by 40)


def main():
    M = json.load(open(os.path.join(HERE, "samples_measured.json"), encoding="utf-8"))
    R = json.load(open(S.REJECT_PATH, encoding="utf-8")) if os.path.exists(S.REJECT_PATH) else {"why": {}}
    lib = {r["file"]: r for r in json.load(open(os.path.join(S.LIB, "_sources.json"), encoding="utf-8"))}
    el = {}
    for logf in ("credits.json", "credits_fix1.json", "credits_v2.json"):
        p = os.path.join(S.EL, logf)
        if not os.path.exists(p):
            continue
        d = json.load(open(p, encoding="utf-8"))
        for name, x in (d.items() if isinstance(d, dict) else [(q.get("name"), q) for q in d]):
            if isinstance(x, dict) and x.get("prompt"):
                el[name] = x
    L = ["# The real-effects library of \"The Clown Nobody Saw\"", "",
         "Written by `assets_list.py` from `samples_measured.json` (`el_measure.py`), the generation logs and the CC0 source list. "
         "Nothing here was listened to: every number is a measurement. `samples.py` plays these through `sfx.smp()`, `sfx.honk_gen()`, "
         "`sfx.mix_parts()` and `samples.step_track()`; a take marked NOT USED is skipped automatically (`samples_reject.json`; add your own "
         "after listening under `manual`).", "",
         "Sources: **CC0** = a Creative Commons 0 recording copied from the sound-effects reference library into `_lib/` (author and link "
         "in the table and in `CREDITS.txt`; no credit required). **EL** = an ElevenLabs sound-effect generation made for this film (`_el/`; "
         f"SFX only, never voice; {RATE:.0f} credits per second). The files are 48 kHz mono 24-bit wav (decoded with 3 / 6 dB of headroom); "
         "the engine normalises each to its own peak, so 'file peak' only tells how quiet the source came back.", "",
         "Columns: length of the file; pieces = how many single events `samples.py` cuts out of it (steps, strokes, squeezes); onset = where the "
         "sound starts in the file (the engine lands the ONSET, or the peak of a whoosh, on the picture frame, not the start of the file); "
         "centroid = spectral centre; top3 = share of the energy in the three strongest partials (a bare oscillator is ~0.95+, a recorded "
         "noise-like sound under 0.3).", ""]
    seen = set()
    tot_s = tot_n = 0
    for sound, cfg in S.REG.items():
        files = list(cfg.get("files", [])) + list(cfg.get("cut", []))
        usable = S.takes(sound)
        L.append(f"## `{sound}`: {cfg.get('what', '')}")
        L.append(f"Usable takes right now: **{len(usable)}**" + (" (cut into single events by onset)" if cfg.get("cut") else "") + ".")
        L.append("")
        L.append("| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |")
        L.append("|---|---|---|---|---|---|---|---|---|---|")
        for f in files:
            m = M.get(f)
            if m is None:
                L.append(f"| `{f}` | - | - | missing | - | - | - | - | - | MISSING |")
                continue
            if f in lib:
                src = f"CC0, {lib[f]['author'].split(' via ')[0].split(' (')[0]} ([source]({lib[f]['source']}))"
                cr = "0"
            else:
                e = el.get(f, {})
                src = "EL: \"" + (e.get("prompt", "?")[:110] + ("..." if len(e.get("prompt", "")) > 110 else "")) + "\""
                cr = f"{float(e.get('seconds', m['dur'])) * RATE:.0f}" if f not in seen else "(counted above)"
                if f not in seen and e:
                    tot_s += float(e.get("seconds", 0))
                    tot_n += 1
            seen.add(f)
            n_p = sum(1 for lab, _ in usable if lab.split("#")[0] == f)
            why = R.get("why", {}).get(f)
            extra = ""
            if m.get("squeezes"):
                extra = "; squeezes " + ", ".join(f"{q['f0']:.0f} Hz" for q in m["squeezes"])
            if m.get("event_contrast_db") is not None:
                extra += f"; events {m['event_contrast_db']:.0f} dB clear of each other"
            if m.get("words_raw") is not None:
                w = " ".join(x[0] for x in m["words_raw"][:6])
                if w.lower().strip(" .!?,") in ("thanks for watching", "thank you for watching", "thank you", "you"):
                    w = "nothing (only its stock phrase for non-speech audio)"
                extra += f"; recogniser hears: {w or 'nothing'}"
            status = ("NOT USED: " + "; ".join(why)) if why else ("ok" + extra)
            L.append(f"| `{f}` | {m['dur']:.2f} | {n_p if cfg.get('cut') else ('1' if n_p else '0')} | {src} | {cr} | {m['file_peak_dbfs']:.1f} | {m['onset_ms']:.0f} | "
                     f"{m['centroid']} | {m['top3']:.2f} | {status} |")
        L.append("")
    other = sorted(set(el) - seen)
    if other:
        L.append("## Generated but not in the registry (measurement references only)")
        for f in other:
            m = M.get(f, {})
            L.append(f"- `{f}` ({m.get('dur', '?')} s): \"{el[f].get('prompt', '')[:120]}\"")
            if f in M and f.split("_")[0] != "horn" and f != "squeak_a":
                tot_s += float(el[f].get("seconds", 0))
        L.append("")
    L.append("## Credits")
    try:
        d = json.load(open(os.path.join(S.EL, "credits_fix1.json"), encoding="utf-8"))
        gens = {k: v for k, v in d.items() if isinstance(v, dict) and v.get("ok")}
        secs = sum(float(v["seconds"]) for v in gens.values())
        L.append(f"- Fix round 1: {len(gens)} generations, {secs:.1f} s of sound = **{secs * RATE:.0f} credits** at the measured {RATE:.0f} credits per second "
                 f"(cap 2,500). The account's own counter moved {d.get('_last', 0) - d.get('_start', 0)} in the same window; the account is shared, "
                 "so that figure can include other work.")
    except (OSError, ValueError):
        pass
    L.append("- First cut: 4 generations (horn_a, horn_b, horn_c, squeak_a), 2.9 s, 29 credits by the counter.")
    L.append("- CC0 recordings: no cost, no credit required; re-check each source page before publishing (`CREDITS.txt`).")
    open(os.path.join(HERE, "ASSETS.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
    n_ok = sum(len(S.takes(k)) for k in S.REG)
    print(f"ASSETS.md written: {len(S.REG)} logical sounds, {len(seen)} files in the registry, {n_ok} usable takes / pieces")


if __name__ == "__main__":
    main()

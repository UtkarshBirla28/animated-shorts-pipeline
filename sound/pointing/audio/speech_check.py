# Is there SPEECH in the field recordings we use? (The film may carry no announcement, no Japanese words, no real
# station melody.) Runs faster-whisper (small, CPU) over each named cut of lib.py that comes from a public place and
# prints what it hears: text, the model's own no-speech probability and its confidence. Nothing is played.
# A cut PASSES when no segment is confident speech (no_speech_prob < 0.5 and avg_logprob > -0.8 and it has letters).
# usage: python -s speech_check.py [cut ...]        writes speech_check.json
import json
import os
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib
from dsp import SR
from scipy.signal import resample_poly

DEFAULT = ["ride_cruise", "ride_accel", "emu_depart", "emu_pass", "suit_tokyo", "steps_group", "train_idle", "walla", "murmur", "vending_hum",
           "sparrows", "crows_far", "clack_bed", "door_hiss", "air_hiss", "suit_roll_a", "comb_plate", "crow_1", "crow_2", "crow_3"]


# what this recogniser writes when it is given noise and no speech (its well-known stock phrases): never counted as speech
HALLU = ["ご視聴ありがとうございました", "ありがとうございました", "Thank you for watching", "Thanks for watching", "Music", "Subtitles by", "字幕"]


def main():
    from faster_whisper import WhisperModel
    names = [a for a in sys.argv[1:] if not a.startswith("--")] or DEFAULT
    model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=2)
    pj = os.path.join(HERE, "speech_check.json")
    out = json.load(open(pj, encoding="utf-8")) if os.path.exists(pj) and "--fresh" not in sys.argv else {}
    for nm in names:
        if nm in out and "--fresh" not in sys.argv and out[nm].get("cut") == [lib.CUTS[nm][1], lib.CUTS[nm][2]]:
            continue                                               # already checked (the same cut)
        x = lib.cut(nm, 0.0, 0.0).mean(0)
        y = resample_poly(x, 1, 3).astype(np.float32)             # 16 kHz
        y = y / (np.abs(y).max() + 1e-9) * 0.7
        y = y[: 16000 * 30]                                         # the first 30 s of a long bed (the mix loops it from there)
        rows = []
        for lang in ("ja", "en"):
            segs, info = model.transcribe(y, language=lang, beam_size=1, vad_filter=False, condition_on_previous_text=False, word_timestamps=False,
                                          temperature=0.0, compression_ratio_threshold=None, log_prob_threshold=None)      # one pass, no retries
            for s in segs:
                txt = s.text.strip()
                conf = bool(s.no_speech_prob < 0.5 and s.avg_logprob > -0.8 and any(ch.isalpha() for ch in txt) and not any(h in txt for h in HALLU))
                rows.append(dict(lang=lang, a=round(s.start, 2), b=round(s.end, 2), text=txt, no_speech=round(s.no_speech_prob, 3), logprob=round(s.avg_logprob, 3), speech=conf))
        bad = [r for r in rows if r["speech"]]
        out[nm] = dict(file=lib.CUTS[nm][0], cut=[lib.CUTS[nm][1], lib.CUTS[nm][2]], seconds=round(len(x) / SR, 1), verdict="SPEECH?" if bad else "no confident speech", segments=rows)
        print(f"{nm:12s} {lib.CUTS[nm][0]:18s} {len(x) / SR:5.1f} s  ->  {out[nm]['verdict']}")
        for r in rows:
            print(f"      [{r['lang']}] {r['a']:6.2f}-{r['b']:6.2f}  no_speech {r['no_speech']:.2f}  logprob {r['logprob']:.2f}  {'SPEECH ' if r['speech'] else '       '}{r['text'][:90]}")
        json.dump(out, open(os.path.join(HERE, "speech_check.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()

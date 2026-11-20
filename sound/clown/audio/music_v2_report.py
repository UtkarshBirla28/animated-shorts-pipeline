# Writes the MEASUREMENT part of MUSIC_V2.md (read-only on the audio; nothing is played): music_v2.wav against the voice it
# was levelled to (per-section LU under the voice), against the two reference scores (octave-band shares, side / mid, mono
# loss, phone high-pass loss, bass harmonics), the loop seam, and the ElevenLabs Music test take for comparison.
# usage: python -s music_v2_report.py   -> _music/music_v2_measure.md (pasted into MUSIC_V2.md)
import json
import os
import sys
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, read_wav, integrated, true_peak  # noqa: E402
import music_measure as MM  # noqa: E402
import music as MU  # noqa: E402

db = lambda p: 10 * np.log10(np.maximum(p, 1e-20))


def main():
    M = json.load(open(os.path.join(HERE, "music_v2_map.json"), encoding="utf-8"))
    secs = M["sections"]
    y = MM.load(os.path.join(HERE, "music_v2.wav"))
    v = MU._voice()
    L = []
    w = L.append
    r = MM.report(os.path.join(HERE, "music_v2.wav"), secs, use_w=False, label="score v2 (music_v2.wav)")
    refs = [MM.report(p, None, False, lab) for lab, p in MM.REFS.items() if os.path.exists(p)]
    el = os.path.join(HERE, "_music", "test_2.wav")
    elr = MM.report(el, [["the count", 0, 9.1], ["the answer", 9.1, 13.0], ["the turn", 13.0, 17.0]], use_w=True, label="ElevenLabs Music test (17 s)") if os.path.exists(el) else None
    w(f"Measured by `music_v2_report.py` on `music_v2.wav` ({r['dur']} s = {M['frames']} frames, {M['samples']} samples, 48 kHz stereo 24-bit), levelled "
      f"against `{os.path.relpath(M['voice_dir'], os.path.dirname(HERE))}/voice.wav` as delivered ({integrated(v):.1f} LUFS). Nothing was listened to.")
    w("")
    w("### Whole file against the references")
    w("| | integrated LUFS | LRA | true peak | side re mid dB | L/R corr | mono fold-down loss LU | 400 Hz high-pass loss LU | bass harmonics (250-700 Hz re 40-160 Hz) dB |")
    w("|---|---|---|---|---|---|---|---|---|")
    for q in [r] + refs + ([elr] if elr else []):
        w(f"| {q['label']} | {q['lufs']} | {q['lra']} | {q['tp']} | {q['side_db']} | {q['lr_corr']} | {q['mono_loss']} | {q['phone_loss']} | {q['bass_harm_db']} |")
    w("")
    w("Octave-band shares (dB re each file's own 31 Hz-16 kHz total, so files at different levels compare):")
    w("")
    w("| | 31 | 63 | 125 | 250 | 500 | 1k | 2k | 4k (2.8-5.6k: 4-8k octave) | 8k (8-16k) |")
    w("|---|---|---|---|---|---|---|---|---|---|")
    for q in [r] + refs + ([elr] if elr else []):
        w(f"| {q['label']} | " + " | ".join(f"{b_:.1f}" for b_ in q["bands"]) + " |")
    w("")
    w("### Per section: level under the voice, air, width")
    w("music and voice = integrated LUFS over the section's span (the voice as delivered); 'under' = voice - music (target in brackets).")
    w("")
    w("| section | span s | music LUFS | voice LUFS | under the voice LU | 4-8 kHz share dB | 8-16 kHz share dB | side re mid dB |")
    w("|---|---|---|---|---|---|---|---|")
    for s in r["sections"]:
        i0, i1 = int(s["a"] * SR), int(s["b"] * SR)
        Lv = integrated(v[:, i0:i1])
        under = Lv - s["lufs"] if np.isfinite(Lv) and np.isfinite(s["lufs"]) else float("nan")
        tgt = MU.SECTION_TARGET.get(s["name"])
        w(f"| {s['name']} | {s['a']:.2f}-{s['b']:.2f} | {s['lufs']} | {Lv:.1f} | {under:.1f}" + (f" ({-tgt:.1f})" if tgt is not None else "")
          + f" | {s['air_db']} | {s['top_db']} | {s['side_db']} |")
    w("")
    # the seam and the edges
    n50 = int(0.05 * SR)
    jump = float(np.abs(y[:, 0] - y[:, -1]).max())
    step = float(np.percentile(np.abs(np.diff(y[:, -int(0.3 * SR):], axis=1)).max(0), 99))
    hush = [x for x in secs if x[0] == "hush"][0]
    hz = y[:, int(hush[1] * SR) + 10: int(hush[2] * SR) - 10]
    w("### The seam, the hush, the cuts")
    w(f"- Loop seam: the last 50 ms are {db(np.mean(y[:, -n50:] ** 2)):.1f} dBFS (the swell at full), the first 50 ms {db(np.mean(y[:, :n50] ** 2)):.1f} dBFS (the "
      f"quiz downbeat: first note at {r['first_note_ms']} ms); the music stops on the last sample (a 3 ms de-click only); sample jump across the seam "
      f"{jump:.5f} against a 99th-percentile sample step of {step:.5f} in the last 0.3 s.")
    w(f"- The hush ({hush[1]:.2f}-{hush[2]:.2f} s): {'digital silence' if not np.any(hz) else f'{db(np.mean(hz ** 2)):.1f} dBFS'}.")
    for e in r.get("novelty_at_edges", []):
        pass
    w("- Where the music actually changes (spectral novelty peak within +-1 s of each planned section edge): "
      + "; ".join(f"{e['edge']} {e['planned']:.1f} -> {e['peak_at']:.1f} s" for e in r.get("novelty_at_edges", [])) + ".")
    w(f"- Tempo read from onsets: {r['bpm']} BPM overall (the regions run 104-122 BPM, see the section map).")
    if elr:
        w("")
        w("### The ElevenLabs Music test, measured the same way")
        w(f"- 17.0 s planned in three sections (count / answer / turn): {elr['dur']} s delivered, {elr['lufs']} LUFS, true peak {elr['tp']} dBTP, side {elr['side_db']} dB.")
        for s in elr["sections"]:
            w(f"  - {s['name']} ({s['a']}-{s['b']} s): {s['lufs']} LUFS, 4-8 kHz share {s['air_db']} dB, 8-16 kHz {s['top_db']} dB")
        w(f"  - recogniser hears: {' '.join(x[0] for x in elr.get('words', [])) or 'nothing'} (no vocals)")
    out = os.path.join(HERE, "_music", "music_v2_measure.md")
    open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("\n".join(L))


if __name__ == "__main__":
    main()

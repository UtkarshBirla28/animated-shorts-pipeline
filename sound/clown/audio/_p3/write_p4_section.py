# p4: writes _p3/p4_section.md (the "p4" note at the top of SOUND_EVENTS_V2.md; the p3 section below it stays as it was)
# from _p3/verify_p4.json, mix_report.json and cue_report.json, then re-writes SOUND_EVENTS_V2.md from the last mix.
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.dirname(HERE)
sys.path.insert(0, AUD)
V = json.load(open(os.path.join(HERE, "verify_p4.json"), encoding="utf-8"))
R = json.load(open(os.path.join(AUD, "mix_report.json"), encoding="utf-8"))
CR = json.load(open(os.path.join(AUD, "cue_report.json"), encoding="utf-8"))
chk = open(os.path.join(HERE, "check_p4.txt"), encoding="utf-8").read().strip().split("\n")[-1]
m = V["master"]
by = {}
for r in CR["rows"]:
    by.setdefault(r["src"], [0, 0])
    by[r["src"]][0] += 1
    by[r["src"]][1] += r["status"] in ("play", "step", "loop", "roll")
L = []
w = L.append
w("## p4: the final acting round (2026-11-18, the picture only; the sound of p3 is kept)")
w("")
w("The owner approved p3's sound and narration; this round follows the picture. The three animators regenerated their cue files after a final "
  "acting round (" + ", ".join(f"{k} {v[0]} cues, {v[1]} sounded" for k, v in by.items()) + f"); `timeline.json` was re-exported (still {m['frames']} f).")
w("")
w("- **24 new cue names mapped** (unmapped: " + str(len(CR["unmapped"])) + "), quiet, no new ElevenLabs credits: `phew_blow` (a short breath), `take_boing`, "
  "`eye_pop` (small high boings), `take_gasp` (a tiny tick of Hyman's glasses: no male gasp take), `cloth_grab`, `timelapse_whoosh`, `phone_laugh` (a laugh in the "
  "phone band, S6 and S14), `pen_tap`, `whip_pan` (a short soft air-swish whose PEAK sits on the cut frame the animator names), `phone_chatter` (muffled loops, S14 and "
  "S18), `unicycle_off` (a wheel creak), `reach`, `bill_pinch` (paper snap + a small glint), `bill_tug` (paper flap + the peg's creak), `giggle`, `bubble_swell`, "
  "`bill_flutter_slow`. Silent by choice: `cheek_puff`, `sly_hmm`, `snap_zoom` (it lands on a character's word), `squint` (the '?' carries it), `glance`, "
  "`cheer` (his hop and honks carry it), `pigeon_strut`.")
w("- `hop` / `land` read their text: the clown's unicycle hop is a small boing, its landing a tyre thump + a squeak (S13); a person's landing stays two soft steps.")
w("- **Quiz rule:** the new hook wink's sparkle ting (Q1 f 30) is a chime, so it is silent (`ting`, `sparkle`, `ping` added to the classes banned in Q1); Q3's "
  "wink ting (f 390) sounds. The plaza honks moved with the picture (f 94, f 121). Both duck windows: everything but the clown / pigeons / dog is digital silence.")
w("- **The breath before \"Their bodies dodged it.\"**: S19's second tug and the giggle would start in it, so they are held back (rule); the first tug and the pinch play.")
w("- Budget 110 -> 150 events (keeps everything p3 sounded plus the new acting); honk gap 8 -> 6 f (S13's and S14's honk pairs are 7 f apart: each squeeze sounds). "
  "S5: the score's comic hit stays on 25.000 s: with the flash gone it now keys on the suit's spring, the picture's 'reveal hit' (f 750); Hyman's jaw drop on \"suit.\" "
  "is 5 dB softer; the S8 twinkle on \"The clown?\" 3 dB softer.")
w(f"- **Measured:** {m['I']:.2f} LUFS, {m['TP']:.2f} dBTP, LRA {m['LRA']:.1f} LU, {m['frames']} f = {m['samples']} samples, mono loss {m['mono_loss']:+.2f} LU, lowest word "
  f"margin {m['margin_min']:.1f} dB, sync {m['sync']['n']} cues {m['sync']['min']:+.2f} .. {m['sync']['max']:+.2f} f ({m['sync']['bad']} outside); `check_audio.py`: {chk}")
w(f"- The score (`music_v2.wav`) is unchanged: its inputs (voice, length, duck windows, the E3 cut / hold, the suit hit at 25.000 s) are the same as in p3.")
w("")
open(os.path.join(HERE, "p4_section.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
print("wrote _p3/p4_section.md")
import events_doc  # noqa: E402
J = json.load(open(sorted(glob.glob(os.path.join(AUD, "_cache", "v2_cues_*.json")), key=os.path.getmtime)[-1], encoding="utf-8"))
print("wrote", events_doc.write(J, R))

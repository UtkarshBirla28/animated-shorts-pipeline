# p3: writes _p3/p3_section.md (section 0 of SOUND_EVENTS_V2.md, inserted by events_doc.py) from _p3/verify_p3.json, the
# mix report, the cue report and the credits log, then re-writes SOUND_EVENTS_V2.md from the last mix (no re-mix).
# p2 numbers are the audit's (studio/out/clown/audit_p2/AUDIT_sound.md).  usage (repo root):
#   PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/clown/audio/_p3/write_p3_section.py
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.dirname(HERE)
sys.path.insert(0, AUD)
V = json.load(open(os.path.join(HERE, "verify_p3.json"), encoding="utf-8"))
R = json.load(open(os.path.join(AUD, "mix_report.json"), encoding="utf-8"))
CR = json.load(open(os.path.join(AUD, "cue_report.json"), encoding="utf-8"))
EL = json.load(open(os.path.join(AUD, "_el", "credits_p3.json"), encoding="utf-8"))
f1 = lambda x: f"{x:.1f}"
L = []
w = L.append
m, c, oh = V["master"], V["count"], V["open_honk"]
w("## 0. p3: the polish round (2026-11-18, voice v6b, picture re-timed to 2246 f)")
w("")
w("What changed since preview 2, item by item against the p2 sound audit (`studio/out/clown/audit_p2/AUDIT_sound.md`) and the lead's "
  "D11 (`studio/out/clown/FIX2_PLAN.md`). Every number is measured in the written stems by `_p3/verify_p3.py` (`_p3/verify_p3.json`); nothing was played.")
w("")
w("**Inputs.** The three cue files were regenerated from the current picture code (`anim_quiz/cues.mjs`, `anim_story1/tools/cues.mjs`, "
  "`anim_story2/cues.mjs`; no generator failed, no warp was needed); the stale ones are kept as `sound_cues_p2.json`. "
  f"{len(CR['rows'])} cue lines; 47 new cue names (the polish kit and the new gags) were added to `sfx.py MAP`; unmapped now: {len(CR['unmapped'])}. "
  "`music.py` was re-run on the new voice (sections keyed to the line times, as designed).")
w("")
w("| audit item | p2 (audit) | p3 (measured) | what was done |")
w("|---|---|---|---|")
w(f"| B1 the frame-0 honk | -17.6 LU, its first squeeze 60 ms, then the voice | {f1(oh['measured_LU'])} LU; sfx peak {f1(oh['sfx_peak_0_to_quick_dBFS'])} dBFS in 0-{oh['quick_s']:.2f} s, "
  f"{f1(oh['sfx_peak_after_quick_30ms_dBFS'])} dBFS in the 30 ms after \"Quick\" starts; first 10 ms {f1(oh['sfx_first_10ms_peak'])} dBFS | `B_open_honk`: the picture pumps the horn twice "
  "in the 0.34 s lead-in (frame 0 and f 6, honk rings on both), so two squeezes: the first on sample 0, the second on the second pump, both over before \"Quick\", no word carve |")
w(f"| B1 the count | -29.3 / -28.4 LUFS in the two narration-free stretches; short-term min -29.4 | mix {' / '.join(f1(x) for x in c['mix_LUFS'])} LUFS "
  f"(score {' / '.join(f1(x) for x in c['score_LUFS'])}, effects {' / '.join(f1(x) for x in c['sfx_LUFS'])}); short-term min {f1(c['short_term_min_whole'])} LUFS for the whole film | "
  f"`mix.py COUNT_LIFT`: score +6 dB, effects +4 dB, ONE flat stretch {c['spans'][0][0]:.2f}-{c['spans'][-1][1]:.2f} s (from \"phone.\" to \"How many?\"; 150 ms ramps at its two ends only). "
  "In the count an effect that starts on a narrator word sits 4 dB lower (`Q1_WORD_DB`) |")
s1 = {f"{x['name']} {x['frame']:.0f}": x for x in V["s1"]}
w("| M4 S1's racket | honks at 445 / 481 (p2 f) not sounded; bell -27.7 LU (buried); sad honk -24.7 | " + "; ".join(
  f"{k}: {f1(x['measured_LU'])} LU, best band {f1(x['best_band_dB'])} dB" for k, x in s1.items()) + " | single squeezes on every visible squeeze (`HONK_SINGLE_F`), the 490 squeeze "
  "stays under the bell; `SHOT_DB` compensates the word carve (the audit's targets are measured levels); the bell's carve is lighter (1.2-3.5 kHz) |")
w(f"| M5 rumble | 30 % of the effects stem under 90 Hz | {f1(V['sfx_energy_share_under_90Hz_pct'])} % | an 80 Hz 12 dB/oct high-pass on the effects bus, except the freeze hit, "
  "the jaw-drop and the slow whoosh (`SFX_HP`, `LOW_OK`) |")
pg = V["pigeons"]
w("| M5 pigeons | sub-bass thumps (95 % of energy under 82-352 Hz) | " + "; ".join(f"{p['name']} f {p['frame']:.0f}: best band {f1(p['best_band_dB'])} dB at {p['at_Hz']:.0f} Hz" for p in pg)
  + " | three new bright wing-clap generations (`pigeon_b`), 0.5-6 kHz share -1.5 to -8 dB (`_p3/measure_new.txt`) |")
st = V["steps_best_band_median_dB"]
w("| M5 featured footsteps | best band: S1 -7.6, S14 -3.7, S15 -3.1, S16 -14.3 dB | " + "; ".join(f"{k} {v:+.1f}" for k, v in st.items() if k.split()[0] in ("S1", "S14", "S15", "S16", "S18"))
  + " dB | the soft / slow shoes measured as thumps under 90 Hz: crisp sneaker takes (new generation) and the hard takes instead, every step high-passed at 120 Hz, "
  "a heel-scuff layer (new generation, 2-5 kHz) under each, the featured walkers +9 dB |")
d = {x["shot"]: x for x in V["density"]}
w(f"| M6 density | 11.4 s with no event (S8-S10 digital silence); S18 9.5 cues/s | S9 {d['S9']['events']} events (claps); S18 {d['S18']['events']} events + {d['S18']['steps']} steps in "
  f"{d['S18']['seconds']} s = {(d['S18']['events'] + d['S18']['steps']) / d['S18']['seconds']:.1f} cues/s; no stretch over 5 s without a cue | the claps are back (the budget is 110 events), "
  "the S18 animator already lists two steps per walker; the shoes follow its text (leather / sneaker / soft) |")
pp = V["e1_pips"]
w(f"| m1 the five pips | 1 f early each | on {', '.join(str(p['pop']) for p in pp)} (timeline e1.holds[k].pop), sync error {', '.join(f'{e:+.2f}' for p in pp for e in p['err'])} f | "
  "read from `timeline.json e1` instead of the remap; carved deeper under \"five phones.\" |")
fd = V["sync_five_ding"][0]
w(f"| m2 the ding before the 5 | ding 1-3 f before the 5 reads | ding on f {fd['frame']:.0f} (FLIP + 6, the 5 at 71 % of its height), error {fd['err']:+.2f} f; chip flip on f "
  f"{V['sync_chip_flip'][0]['frame']:.0f} (FLIP + 1), chip-in f {V['sync_chip_in'][0]['frame']:.0f} | keyed to the overlay's own formulas |")
sh = V.get("suit_hit", {})
if sh:
    w(f"| m3 the comic hit | 7 f after the suit is seen | the hit's attack (raw score) at {sh['attack_s']:.3f} s = f {sh['attack_f']:.1f} (+{sh['attack_jump_dB']:.1f} dB in 5 ms, to "
      f"{sh['level_after_attack_dBFS']:.1f} dBFS); the bag opens on f {sh['bag_open_f']:.0f}; the harp glissando leading into it starts rising at {sh['first_rise_s']:.2f} s; "
      f"the word \"suit.\" follows at {sh['word_suit_s']:.2f} s | `music.py bag_open_t()` reads STORY-1's flash_snap cue |")
mb = V["mindblow"]
w(f"| M1 the mind-blow line's air | 0.27 s before, 0.12 s after; score 4 LU under the money section | {mb['air_before_line_s']:.2f} s before, {mb['air_after_line_s']:.2f} s after (the new voice); "
  f"in the breath before it: score RMS {f1(mb['score_rms_in_hush_dBFS'])} dBFS, effects peak {f1(mb['sfx_peak_in_hush_dBFS'])} dBFS (digital silence), mix RMS {f1(mb['mix_rms_in_hush_dBFS'])} dBFS; "
  f"score under the line {f1(mb['score_LUFS_under_line'])} LUFS = {f1(mb['score_under_line_re_money_LU'])} LU under the money section | the score stops dead after \"money.\"; "
  "the effects are gated and the bed dips 8 dB in that breath (`sfx.mind_hush`); `mindblow` target -27.5 LU under the voice (was -23.5) |")
e3 = V["e3"]
w(f"| D2 / D11 E3 | rewind, freeze, rewind | cut {e3['cut_s']:.3f} s (in the hush: voice peak {f1(e3['voice_peak_cut_to_did_dBFS'])} dBFS before \"Did\"); tape whirr + the score's reversed quiz music "
  f"from the cut (score {f1(e3['score_rms_rewind1_dBFS'])} dBFS RMS); the hold {e3['hold'][0]:.2f}-{e3['hold'][1]:.2f} s: soft freeze hit peak {f1(e3['freeze_peak_dBFS'])} dBFS, glint on the ring's "
  f"completion ({e3['ring_full_s']:.3f} s) peak {f1(e3['glint_peak_dBFS'])} dBFS; over \"money?\" effects {f1(e3['sfx_peak_over_money_dBFS'])} dBFS, bed {f1(e3['bed_peak_over_money_dBFS'])} dBFS, "
  f"the score's swell {f1(e3['score_LUFS_over_money'])} LUFS; the rewind to the seam effects {f1(e3['sfx_rms_rewind2_dBFS'])} dBFS RMS; seam jump {e3['seam_jump']:.5f} | "
  "freeze hit -17 LU (was -13.5) and cut before \"money?\"; the swell's own growth compressed so it is a soft swell under the word (it measured -57.7 LUFS there in the first p3 run) |")
w("| m6 honk copies | f 1129 / 1352 correlated 1.00 | every honk +-0.2 semitones and up to 8 % shorter, seeded per cue (`varied`) | |")
w("| m7 faint events | spin whoosh / jaw drop bodies at 125 Hz | a bright chop layer on the spin (-6 dB), a comic boing on the jaw drop | |")
w("")
w("**New effects (the animators' polish kit and gags, D9):** confetti (generated), the light-bulb 'idea' ping, sparkles / twinkles / the wink 'ting' (glockenspiel + "
  "celesta in the score's key), '?' and '!' pops, the juggling pats (Q1, S6, S14), dust puffs under the brakes, the note crumpled and its tock on the board, sheets "
  "fluttering off the pin board, the suit's boing, Hyman's whistle (F6 -> D6), the jogger, the freeze, the stopper's gasp and swat, the unseen clown's wheel in S15 and his "
  "'?' + sad half honk, a far bark. Silent by design: the '!' pings in Q1 (THE QUIZ RULE bans chimes there), the camera flash (carried by the score's hit), the nose pop "
  "(the fifth effect in 6 frames), looks and waves.")
w("")
w(f"**ElevenLabs:** {EL['_last'] - EL['_start']} credits (account counter {EL['_start']} -> {EL['_last']}), 11 takes of 8 sounds (`el_batch_p3.py`, log "
  "`_el/credits_p3.json`); 3 failed their measurement and are in `samples_reject.json` (`pigeon_settle_1` and `juggle_1`: sub-bass thumps; `idea_ping_1`: near-silent). "
  "The key is read at run time by `tools/el_api.py` and was never printed or stored.")
w("")
w(f"**Master:** {m['I']:.2f} LUFS, {m['TP']:.2f} dBTP, LRA {m['LRA']:.1f} LU, {m['frames']} f = {m['samples']} samples, mono loss {m['mono_loss']:+.2f} LU, lowest word margin "
  f"{m['margin_min']:.1f} dB (narrator median {m['margin_narr']['median']:.1f}, characters median {m['margin_char']['median']:.1f}), sync {m['sync']['n']} cues "
  f"{m['sync']['min']:+.2f} .. {m['sync']['max']:+.2f} f, {m['sync']['bad']} outside.")
w("")
open(os.path.join(HERE, "p3_section.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
print("wrote _p3/p3_section.md")
# the doc itself, from the last mix (the cache's cue json + mix_report.json)
import events_doc  # noqa: E402
J = json.load(open(sorted(glob.glob(os.path.join(AUD, "_cache", "v2_cues_*.json")), key=os.path.getmtime)[-1], encoding="utf-8"))
print("wrote", events_doc.write(J, R))
